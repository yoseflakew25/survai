"""Email delivery — SMTP when enabled, otherwise logs to stdout (dev-friendly)."""

from __future__ import annotations

import logging
from email.message import EmailMessage

import aiosmtplib

from app.core.config import settings

logger = logging.getLogger(__name__)


async def send_email(*, to_email: str, subject: str, html_body: str, text_body: str) -> None:
    message = EmailMessage()
    message["From"] = f"{settings.emails_from_name} <{settings.emails_from_email}>"
    message["To"] = to_email
    message["Subject"] = subject
    message.set_content(text_body)
    message.add_alternative(html_body, subtype="html")

    if not settings.smtp_enabled:
        logger.info(
            "SMTP disabled — password recovery email for %s\nSubject: %s\n%s",
            to_email,
            subject,
            text_body,
        )
        return

    await aiosmtplib.send(
        message,
        hostname=settings.smtp_host,
        port=settings.smtp_port,
        username=settings.smtp_user or None,
        password=settings.smtp_password or None,
        start_tls=settings.smtp_tls,
    )


async def send_password_reset_email(*, to_email: str, reset_token: str) -> None:
    reset_url = f"{settings.password_reset_url_base}?token={reset_token}"
    subject = "Reset your SurvAI password"
    text_body = (
        f"Reset your password by opening this link (expires in "
        f"{settings.password_reset_token_expire_minutes} minutes):\n\n{reset_url}\n"
    )
    html_body = f"""
    <p>You requested a password reset for SurvAI.</p>
    <p><a href="{reset_url}">Reset your password</a></p>
    <p>This link expires in {settings.password_reset_token_expire_minutes} minutes.</p>
    <p>If you did not request this, you can ignore this email.</p>
    """
    await send_email(to_email=to_email, subject=subject, html_body=html_body, text_body=text_body)
