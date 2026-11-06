"""Org assistant: knowledge index, threads, RAG chat, org isolation."""

from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import AsyncMock, patch
from uuid import uuid4

import pytest
from httpx import AsyncClient

from app.ai.prompts.assistant_v1 import AssistantAnswerOutput, AssistantPlanOutput
from app.core.security import hash_password
from app.models.assistant import KnowledgeSourceType, OrgKnowledgeChunk
from app.models.organization import Organization
from app.models.survey import Survey, SurveyStatus
from app.models.user import User, UserRole
from app.services.knowledge_index import KnowledgeIndexService, cosine_similarity


async def _org_user(
    session, *, email: str, org_name: str = "Assist Org"
) -> User:
    org = Organization(name=org_name)
    session.add(org)
    await session.flush()
    user = User(
        email=email,
        full_name="Assist User",
        hashed_password=hash_password("SecurePass1!"),
        role=UserRole.organization,
        is_superuser=False,
        is_active=True,
        email_verified=True,
        organization_id=org.id,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


async def _login(client: AsyncClient, email: str) -> dict[str, str]:
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "SecurePass1!"},
    )
    assert login.status_code == 200, login.text
    return {"Authorization": f"Bearer {login.json()['access_token']}"}


def test_cosine_similarity_ranks_aligned_vectors() -> None:
    a = [1.0, 0.0, 0.0]
    b = [0.9, 0.1, 0.0]
    c = [0.0, 1.0, 0.0]
    assert cosine_similarity(a, b) > cosine_similarity(a, c)
    assert cosine_similarity(a, a) == pytest.approx(1.0)


@pytest.mark.asyncio
async def test_upsert_and_retrieve_ranking(session, monkeypatch) -> None:
    user = await _org_user(session, email="rag@example.com")
    assert user.organization_id is not None

    survey = Survey(
        created_by=user.id,
        organization_id=user.organization_id,
        title="Water access baseline",
        description="Household water survey",
        status=SurveyStatus.draft.value,
        anonymous_collection=False,
    )
    session.add(survey)
    await session.commit()
    await session.refresh(survey)

    async def fake_embed(
        texts: list[str], *, task_type: str = "RETRIEVAL_DOCUMENT"
    ) -> list[list[float]]:
        del task_type
        out: list[list[float]] = []
        for t in texts:
            lower = t.lower()
            if "water" in lower:
                out.append([1.0, 0.0, 0.0])
            elif "education" in lower:
                out.append([0.0, 1.0, 0.0])
            else:
                out.append([0.5, 0.5, 0.0])
        return out

    monkeypatch.setattr(
        "app.services.knowledge_index.embed_texts", fake_embed
    )

    svc = KnowledgeIndexService(session)
    await svc.upsert_chunk(
        organization_id=user.organization_id,
        source_type=KnowledgeSourceType.survey,
        source_id=survey.id,
        survey_id=survey.id,
        title="Water access baseline",
        body="Status: draft Description: Household water survey",
    )
    other_id = uuid4()
    await svc.upsert_chunk(
        organization_id=user.organization_id,
        source_type=KnowledgeSourceType.survey,
        source_id=other_id,
        survey_id=None,
        title="Education outcomes",
        body="Status: draft Description: School enrollment",
    )
    await session.commit()

    hits = await svc.retrieve(
        organization_id=user.organization_id,
        query="Tell me about water access",
        top_k=2,
    )
    assert len(hits) >= 1
    assert hits[0][0].source_id == survey.id
    assert hits[0][1] >= hits[-1][1]


@pytest.mark.asyncio
async def test_thread_crud_and_org_isolation(
    client: AsyncClient, session
) -> None:
    user_a = await _org_user(session, email="a@example.com", org_name="Org A")
    user_b = await _org_user(session, email="b@example.com", org_name="Org B")
    headers_a = await _login(client, "a@example.com")
    headers_b = await _login(client, "b@example.com")

    created = await client.post(
        "/api/v1/assistant/threads",
        headers=headers_a,
        json={"title": "Org A chat"},
    )
    assert created.status_code == 201, created.text
    thread_id = created.json()["id"]

    listed_a = await client.get("/api/v1/assistant/threads", headers=headers_a)
    assert listed_a.status_code == 200
    assert listed_a.json()["total"] == 1

    listed_b = await client.get("/api/v1/assistant/threads", headers=headers_b)
    assert listed_b.status_code == 200
    assert listed_b.json()["total"] == 0

    forbidden = await client.get(
        f"/api/v1/assistant/threads/{thread_id}", headers=headers_b
    )
    assert forbidden.status_code == 404

    patched = await client.patch(
        f"/api/v1/assistant/threads/{thread_id}",
        headers=headers_a,
        json={"title": "Renamed"},
    )
    assert patched.status_code == 200
    assert patched.json()["title"] == "Renamed"

    deleted = await client.delete(
        f"/api/v1/assistant/threads/{thread_id}", headers=headers_a
    )
    assert deleted.status_code == 204

    # Isolation of knowledge chunks
    session.add(
        OrgKnowledgeChunk(
            organization_id=user_a.organization_id,
            source_type=KnowledgeSourceType.survey.value,
            source_id=uuid4(),
            title="Secret A",
            body="Confidential org A chunk",
            embedding=[1.0, 0.0],
            content_hash="abc",
        )
    )
    await session.commit()

    async def fake_embed(
        texts: list[str], *, task_type: str = "RETRIEVAL_DOCUMENT"
    ) -> list[list[float]]:
        del task_type
        return [[1.0, 0.0] for _ in texts]

    with patch(
        "app.services.knowledge_index.embed_texts",
        new=AsyncMock(side_effect=fake_embed),
    ):
        svc_b = KnowledgeIndexService(session)
        assert user_b.organization_id is not None
        hits = await svc_b.retrieve(
            organization_id=user_b.organization_id,
            query="Secret",
            top_k=5,
        )
    assert hits == []


@pytest.mark.asyncio
async def test_send_message_happy_path(
    client: AsyncClient, session, monkeypatch
) -> None:
    user = await _org_user(session, email="chat@example.com")
    headers = await _login(client, "chat@example.com")

    survey = Survey(
        created_by=user.id,
        organization_id=user.organization_id,
        title="Health pulse",
        description="Clinic wait times",
        status=SurveyStatus.published.value,
        anonymous_collection=False,
    )
    session.add(survey)
    await session.flush()
    session.add(
        OrgKnowledgeChunk(
            organization_id=user.organization_id,
            source_type=KnowledgeSourceType.survey.value,
            source_id=survey.id,
            survey_id=survey.id,
            title="Health pulse",
            body="Status: published Description: Clinic wait times",
            embedding=[1.0, 0.0, 0.0],
            content_hash="hash1",
        )
    )
    await session.commit()

    async def fake_embed(
        texts: list[str], *, task_type: str = "RETRIEVAL_DOCUMENT"
    ) -> list[list[float]]:
        del task_type
        return [[1.0, 0.0, 0.0] for _ in texts]

    monkeypatch.setattr(
        "app.services.knowledge_index.embed_texts", fake_embed
    )

    plan = AssistantPlanOutput(
        survey_ids_for_analytics=[],
        report_ids_to_open=[],
        rationale="qualitative",
    )
    answer = AssistantAnswerOutput(
        answer="Health pulse covers clinic wait times.",
        confidence="partial",
        citation_chunk_ids=[],
        metric_refs=[],
    )

    calls = {"n": 0}

    async def fake_structured(**kwargs):
        calls["n"] += 1
        feature = kwargs.get("feature")
        value = plan if feature == "assistant_plan" else answer
        return SimpleNamespace(value=value)

    monkeypatch.setattr(
        "app.services.assistant.call_structured", fake_structured
    )

    thread = await client.post(
        "/api/v1/assistant/threads",
        headers=headers,
        json={},
    )
    assert thread.status_code == 201, thread.text
    thread_id = thread.json()["id"]

    sent = await client.post(
        f"/api/v1/assistant/threads/{thread_id}/messages",
        headers=headers,
        json={"content": "What is Health pulse about?"},
    )
    assert sent.status_code == 200, sent.text
    body = sent.json()
    assert body["thread"]["id"] == thread_id
    assert len(body["messages"]) == 2
    assert body["messages"][0]["role"] == "user"
    assert body["messages"][1]["role"] == "assistant"
    assert "clinic" in body["messages"][1]["content"].lower()
    assert calls["n"] == 2

    msgs = await client.get(
        f"/api/v1/assistant/threads/{thread_id}/messages",
        headers=headers,
    )
    assert msgs.status_code == 200
    assert len(msgs.json()["messages"]) == 2


@pytest.mark.asyncio
async def test_send_message_stream_sse(
    client: AsyncClient, session, monkeypatch
) -> None:
    await _org_user(session, email="stream@example.com")
    headers = await _login(client, "stream@example.com")

    async def fake_embed(
        texts: list[str], *, task_type: str = "RETRIEVAL_DOCUMENT"
    ) -> list[list[float]]:
        del task_type
        return [[1.0, 0.0, 0.0] for _ in texts]

    monkeypatch.setattr(
        "app.services.knowledge_index.embed_texts", fake_embed
    )

    plan = AssistantPlanOutput(
        survey_ids_for_analytics=[],
        report_ids_to_open=[],
        rationale="none",
    )
    answer = AssistantAnswerOutput(
        answer="Streaming reply about surveys.",
        confidence="partial",
        citation_chunk_ids=[],
        metric_refs=[],
    )

    async def fake_structured(**kwargs):
        feature = kwargs.get("feature")
        value = plan if feature == "assistant_plan" else answer
        return SimpleNamespace(value=value)

    monkeypatch.setattr(
        "app.services.assistant.call_structured", fake_structured
    )

    thread = await client.post(
        "/api/v1/assistant/threads", headers=headers, json={}
    )
    assert thread.status_code == 201
    thread_id = thread.json()["id"]

    res = await client.post(
        f"/api/v1/assistant/threads/{thread_id}/messages/stream",
        headers=headers,
        json={"content": "Stream please"},
    )
    assert res.status_code == 200, res.text
    assert "text/event-stream" in res.headers.get("content-type", "")
    body = res.text
    assert "event: status" in body
    assert "event: delta" in body or "event: done" in body
    assert "event: done" in body
    assert "Streaming reply" in body


@pytest.mark.asyncio
async def test_reindex_endpoint(client: AsyncClient, session, monkeypatch) -> None:
    user = await _org_user(session, email="reindex@example.com")
    headers = await _login(client, "reindex@example.com")

    survey = Survey(
        created_by=user.id,
        organization_id=user.organization_id,
        title="Reindex me",
        description="For backfill",
        status=SurveyStatus.draft.value,
        anonymous_collection=False,
    )
    session.add(survey)
    await session.commit()

    async def fake_embed(
        texts: list[str], *, task_type: str = "RETRIEVAL_DOCUMENT"
    ) -> list[list[float]]:
        del task_type
        return [[0.2, 0.8, 0.0] for _ in texts]

    monkeypatch.setattr(
        "app.services.knowledge_index.embed_texts", fake_embed
    )

    res = await client.post(
        "/api/v1/assistant/knowledge/reindex", headers=headers
    )
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["surveys"] >= 1
    assert "reports" in data
    assert "reviews" in data
