from app.core.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    hash_token,
    verify_password,
)


def test_password_hash_roundtrip() -> None:
    hashed = hash_password("Secret123!")
    assert hashed != "Secret123!"
    assert verify_password("Secret123!", hashed)
    assert not verify_password("wrong", hashed)


def test_access_token_roundtrip() -> None:
    token = create_access_token(subject="00000000-0000-0000-0000-000000000001", role="admin")
    payload = decode_access_token(token)
    assert payload["sub"] == "00000000-0000-0000-0000-000000000001"
    assert payload["role"] == "admin"
    assert payload["type"] == "access"


def test_token_hash_stable() -> None:
    assert hash_token("abc") == hash_token("abc")
    assert hash_token("abc") != hash_token("abd")
