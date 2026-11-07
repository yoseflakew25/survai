"""Email delivery — Resend API, SMTP, or console log in development."""

from __future__ import annotations

import base64
import html
import logging
from email.message import EmailMessage
from functools import lru_cache
from pathlib import Path

import aiosmtplib
import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)

# SurvAI brand tokens (match frontend theme — inline for email clients).
_BG = "#f7f7f2"
_FG = "#111210"
_MUTED = "#62655e"
_CARD = "#ffffff"
_BORDER = "#e6e6de"
_BRAND = "#d97757"
_BRAND_SOFT = "#fceedf"
_BRAND_STRONG = "#9a4b2e"
_BRAND_FG = "#fffaf7"

# Real SurvAI mark (lime tile + survey bars + check) — embedded via CID.
_LOGO_CID = "survai-mark"
_LOGO_PATH = Path(__file__).resolve().parent.parent / "static" / "email" / "survai-mark.png"


@lru_cache
def _logo_png_bytes() -> bytes:
    return _LOGO_PATH.read_bytes()


class EmailDeliveryError(RuntimeError):
    """Raised when a configured email provider fails to send."""


def _smtp_password(settings) -> str:
    # Gmail app passwords are often pasted with spaces — strip them.
    return (settings.smtp_password or "").replace(" ", "").strip()


def email_delivery_configured() -> bool:
    """True when SMTP (with password) or Resend will deliver outbound mail."""
    settings = get_settings()
    if (settings.smtp_user or "").strip() and _smtp_password(settings):
        return True
    if (settings.resend_api_key or "").strip():
        return True
    return False


def _attach_logo(message: EmailMessage) -> None:
    """Embed the SurvAI mark so HTML can reference cid:survai-mark."""
    try:
        logo = _logo_png_bytes()
    except OSError:
        logger.warning("SurvAI email logo missing at %s", _LOGO_PATH)
        return
    # add_related must target the HTML part (last payload after add_alternative).
    html_part = message.get_payload()[-1]
    html_part.add_related(
        logo,
        maintype="image",
        subtype="png",
        cid=f"<{_LOGO_CID}>",
        filename="survai-mark.png",
        disposition="inline",
    )


def _format_from_header(settings) -> str:
    """Resend/SMTP require `email@domain` or `Name <email@domain>` — never empty."""
    address = (settings.emails_from_email or "").strip()
    if not address or "<" in address or ">" in address:
        # Empty .env override / bad paste → Resend test sender (works without a domain).
        address = "onboarding@resend.dev"
    name = (settings.emails_from_name or "SurvAI").strip() or "SurvAI"
    # Strip characters that break `Name <email>` parsing.
    name = name.replace("<", "").replace(">", "").replace("\n", " ").strip()
    return f"{name} <{address}>"


async def send_email(*, to_email: str, subject: str, html_body: str, text_body: str) -> None:
    # Always re-read settings so .env toggles apply after reload.
    get_settings.cache_clear()
    settings = get_settings()
    from_email = _format_from_header(settings)
    message = EmailMessage()
    message["From"] = from_email
    message["To"] = to_email
    message["Subject"] = subject
    message.set_content(text_body)
    message.add_alternative(html_body, subtype="html")
    _attach_logo(message)

    smtp_password = _smtp_password(settings)
    smtp_ready = bool(
        (settings.smtp_user or "").strip() and smtp_password and settings.smtp_host
    )
    # Honor SMTP whenever Gmail/SMTP creds exist — even if a stale shell
    # RESEND_API_KEY / SMTP_ENABLED=false would otherwise force Resend.
    use_smtp = bool(settings.smtp_enabled or smtp_ready) and smtp_ready
    resend_key = (settings.resend_api_key or "").strip()

    if use_smtp:
        logger.info(
            "Sending email via SMTP (%s:%s) to %s",
            settings.smtp_host,
            settings.smtp_port,
            to_email,
        )
        await _send_via_smtp(message, settings=settings)
        return

    if resend_key:
        logger.info("Sending email via Resend to %s (from %s)", to_email, from_email)
        await _send_via_resend(
            api_key=resend_key,
            to_email=to_email,
            subject=subject,
            html_body=html_body,
            text_body=text_body,
            from_email=from_email,
        )
        return

    logger.info(
        "Email NOT sent (no SMTP password / Resend key) — to=%s\nSubject: %s\n%s",
        to_email,
        subject,
        text_body,
    )


async def _send_via_resend(
    *,
    api_key: str,
    to_email: str,
    subject: str,
    html_body: str,
    text_body: str,
    from_email: str,
) -> None:
    payload: dict = {
        "from": from_email,
        "to": [to_email],
        "subject": subject,
        "html": html_body,
        "text": text_body,
    }
    try:
        logo = _logo_png_bytes()
        payload["attachments"] = [
            {
                "filename": "survai-mark.png",
                "content": base64.b64encode(logo).decode("ascii"),
                "content_id": _LOGO_CID,
            }
        ]
    except OSError:
        pass
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
        if response.status_code >= 400:
            logger.error("Resend failed (%s): %s", response.status_code, response.text)
            detail = response.text
            try:
                detail = response.json().get("message") or detail
            except Exception:
                pass
            raise EmailDeliveryError(str(detail))
        logger.info("Email sent via Resend to %s", to_email)
    except EmailDeliveryError:
        raise
    except Exception as exc:
        logger.exception("Resend request failed")
        raise EmailDeliveryError(f"Could not send email via Resend: {exc}") from exc


async def _send_via_smtp(message: EmailMessage, *, settings) -> None:
    try:
        # Port 465 = implicit TLS; 587 = STARTTLS (typical for Gmail).
        use_tls = settings.smtp_port == 465
        start_tls = settings.smtp_tls and not use_tls
        await aiosmtplib.send(
            message,
            hostname=settings.smtp_host,
            port=settings.smtp_port,
            username=settings.smtp_user or None,
            password=_smtp_password(settings) or None,
            use_tls=use_tls,
            start_tls=start_tls,
            timeout=20,
        )
        logger.info("Email sent via SMTP to %s", message["To"])
    except Exception as exc:
        logger.exception("SMTP send failed")
        raise EmailDeliveryError(f"Could not send email via SMTP: {exc}") from exc


def _email_shell(*, preheader: str, title: str, body_html: str, footnote: str) -> str:
    """Branded transactional email layout (table + inline CSS for clients)."""
    safe_pre = html.escape(preheader)
    safe_title = html.escape(title)
    safe_note = html.escape(footnote)
    return f"""\
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <title>{safe_title}</title>
</head>
<body style="margin:0;padding:0;background:{_BG};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
    {safe_pre}
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
    style="background:{_BG};margin:0;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
          style="max-width:520px;width:100%;">
          <tr>
            <td style="padding:0 4px 20px 4px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="vertical-align:middle;line-height:0;">
                    <img src="cid:{_LOGO_CID}" width="28" height="28" alt=""
                      style="display:block;width:28px;height:28px;border:0;outline:none;" />
                  </td>
                  <td style="padding-left:8px;vertical-align:middle;font-family:Geist,ui-sans-serif,
                    system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:18px;
                    font-weight:800;letter-spacing:-0.045em;color:{_FG};">survai</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background:{_CARD};border:1px solid {_BORDER};border-radius:16px;
              padding:32px 28px;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
              <h1 style="margin:0 0 12px 0;font-family:Geist,ui-sans-serif,system-ui,-apple-system,
                BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:22px;font-weight:800;
                letter-spacing:-0.03em;line-height:1.25;color:{_FG};">{safe_title}</h1>
              {body_html}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 8px 0 8px;font-family:Geist,ui-sans-serif,system-ui,-apple-system,
              BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:12px;line-height:1.5;color:{_MUTED};
              text-align:center;">{safe_note}</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""


def _cta_button(*, href: str, label: str) -> str:
    safe_href = html.escape(href, quote=True)
    safe_label = html.escape(label)
    return f"""\
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
  <tr>
    <td style="border-radius:12px;background:{_BRAND};">
      <a href="{safe_href}"
        style="display:inline-block;padding:14px 22px;font-family:Geist,ui-sans-serif,system-ui,
        -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;font-weight:700;
        letter-spacing:-0.01em;color:{_BRAND_FG};text-decoration:none;border-radius:12px;">
        {safe_label}
      </a>
    </td>
  </tr>
</table>
"""


async def send_org_invite_email(
    *,
    to_email: str,
    org_name: str,
    role: str,
    invite_url: str,
    invited_by_name: str,
) -> None:
    role_label = "Researcher" if role == "researcher" else "Viewer"
    subject = f"You're invited to {org_name} on SurvAI"
    text_body = (
        f"{invited_by_name} invited you to join {org_name} on SurvAI as a {role_label}.\n\n"
        f"Accept the invite (expires in 7 days):\n{invite_url}\n"
    )
    body = f"""\
<p style="margin:0 0 8px 0;font-family:Geist,ui-sans-serif,system-ui,-apple-system,
  BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;line-height:1.55;color:{_MUTED};">
  <strong style="color:{_FG};">{html.escape(invited_by_name)}</strong> invited you to join
  <strong style="color:{_FG};">{html.escape(org_name)}</strong> as a
  <strong style="color:{_FG};">{role_label}</strong>.
</p>
{_cta_button(href=invite_url, label="Accept invite")}
<p style="margin:0;font-family:Geist,ui-sans-serif,system-ui,-apple-system,
  BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:12px;line-height:1.5;color:{_MUTED};
  word-break:break-all;">
  Or paste this URL into your browser:<br />
  <a href="{html.escape(invite_url, quote=True)}" style="color:{_BRAND_STRONG};">{html.escape(invite_url)}</a>
</p>
"""
    html_body = _email_shell(
        preheader=f"Join {org_name} on SurvAI as a {role_label}.",
        title="You're invited to SurvAI",
        body_html=body,
        footnote="This invite expires in 7 days. If you weren't expecting it, ignore this email.",
    )
    await send_email(to_email=to_email, subject=subject, html_body=html_body, text_body=text_body)


async def send_password_reset_otp(*, to_email: str, code: str) -> None:
    """6-digit OTP to reset password (same delivery path as signup verification)."""
    settings = get_settings()
    minutes = settings.email_verification_otp_expire_minutes
    safe_code = html.escape(code)
    subject = "Your SurvAI password reset code"
    text_body = (
        f"Your SurvAI password reset code is: {code}\n\n"
        f"It expires in {minutes} minutes. If you did not request a reset, ignore this email.\n"
    )
    body = f"""\
<p style="margin:0 0 20px 0;font-family:Geist,ui-sans-serif,system-ui,-apple-system,
  BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;line-height:1.55;color:{_MUTED};">
  Enter this code with your new password to reset your SurvAI account.
</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
  style="margin:0 0 20px 0;">
  <tr>
    <td align="center" style="background:{_BRAND_SOFT};border:1px solid {_BRAND};
      border-radius:14px;padding:22px 16px;">
      <div style="font-family:ui-monospace,'SF Mono',Menlo,Consolas,monospace;
        font-size:32px;font-weight:700;letter-spacing:0.28em;color:{_FG};line-height:1;">
        {safe_code}
      </div>
    </td>
  </tr>
</table>
<p style="margin:0;font-family:Geist,ui-sans-serif,system-ui,-apple-system,
  BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;line-height:1.5;color:{_MUTED};">
  This code expires in <strong style="color:{_FG};">{minutes} minutes</strong>.
  Don’t share it with anyone.
</p>
"""
    html_body = _email_shell(
        preheader=f"Your SurvAI reset code is {code} — expires in {minutes} minutes.",
        title="Reset your password",
        body_html=body,
        footnote="If you did not request a password reset, you can safely ignore this email.",
    )
    await send_email(to_email=to_email, subject=subject, html_body=html_body, text_body=text_body)


async def send_email_verification_otp(*, to_email: str, code: str) -> None:
    settings = get_settings()
    minutes = settings.email_verification_otp_expire_minutes
    safe_code = html.escape(code)
    subject = "Your SurvAI verification code"
    text_body = (
        f"Your SurvAI verification code is: {code}\n\n"
        f"It expires in {minutes} minutes. If you did not create an account, ignore this email.\n"
    )
    body = f"""\
<p style="margin:0 0 20px 0;font-family:Geist,ui-sans-serif,system-ui,-apple-system,
  BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;line-height:1.55;color:{_MUTED};">
  Enter this code to verify your email and finish creating your SurvAI workspace.
</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
  style="margin:0 0 20px 0;">
  <tr>
    <td align="center" style="background:{_BRAND_SOFT};border:1px solid {_BRAND};
      border-radius:14px;padding:22px 16px;">
      <div style="font-family:ui-monospace,'SF Mono',Menlo,Consolas,monospace;
        font-size:32px;font-weight:700;letter-spacing:0.28em;color:{_FG};line-height:1;">
        {safe_code}
      </div>
    </td>
  </tr>
</table>
<p style="margin:0;font-family:Geist,ui-sans-serif,system-ui,-apple-system,
  BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;line-height:1.5;color:{_MUTED};">
  This code expires in <strong style="color:{_FG};">{minutes} minutes</strong>.
  Don’t share it with anyone.
</p>
"""
    html_body = _email_shell(
        preheader=f"Your SurvAI code is {code} — expires in {minutes} minutes.",
        title="Verify your email",
        body_html=body,
        footnote="If you did not create a SurvAI account, you can safely ignore this email.",
    )
    await send_email(to_email=to_email, subject=subject, html_body=html_body, text_body=text_body)


async def send_lifecycle_notification_email(
    *,
    to_email: str,
    title: str,
    body: str,
    action_url: str | None = None,
) -> None:
    """Product notification email (survey lifecycle). Uses same SMTP/Resend path."""
    subject = f"SurvAI: {title}"
    text_parts = [title, "", body]
    if action_url:
        text_parts.extend(["", f"Open: {action_url}"])
    text_body = "\n".join(text_parts) + "\n"
    safe_title = html.escape(title)
    safe_body = html.escape(body).replace("\n", "<br />")
    body_html = f"""\
<p style="margin:0 0 8px 0;font-family:Geist,ui-sans-serif,system-ui,-apple-system,
  BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;line-height:1.55;color:{_MUTED};">
  {safe_body}
</p>
"""
    if action_url:
        body_html += _cta_button(href=action_url, label="Open in SurvAI")
    html_body = _email_shell(
        preheader=title[:120],
        title=safe_title,
        body_html=body_html,
        footnote="You received this because you have a SurvAI organization account.",
    )
    await send_email(
        to_email=to_email, subject=subject, html_body=html_body, text_body=text_body
    )
