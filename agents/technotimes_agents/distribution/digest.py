"""Daily email digest.

Once a day a Modal cron emails a digest of the top stories from the last
24h to every confirmed newsletter subscriber. Sent via Resend's HTTP API
(raw httpx — no SDK). When `RESEND_API_KEY` is unset the digest is a
silent no-op so the cron can be deployed before credentials exist.
"""
from __future__ import annotations

import time
from html import escape
from typing import Any

import httpx

from ..config import Config

RESEND_EMAILS_URL = "https://api.resend.com/emails"
DIGEST_FROM = "Techno Times <brief@technotimes.com>"
# Resend caps `bcc` recipients per request — batch sends to stay under it.
BCC_BATCH_SIZE = 100


def _article_url(site_url: str, article: dict[str, Any]) -> str:
    category = (article.get("category_slug") or "").strip("/")
    slug = (article.get("slug") or "").strip("/")
    return f"{site_url.rstrip('/')}/{category}/{slug}"


def render_digest_html(site_url: str, articles: list[dict[str, Any]]) -> str:
    """Render a plain <table>-based HTML email body.

    Table layout (not flexbox/grid) is deliberate — it is the only layout
    primitive that renders consistently across Gmail, Outlook, and Apple
    Mail.
    """
    rows: list[str] = []
    for a in articles:
        url = _article_url(site_url, a)
        title = escape((a.get("title") or "").strip())
        dek = escape((a.get("dek") or "").strip())
        rows.append(
            "<tr>"
            '<td style="padding:12px 0;border-bottom:1px solid #e5e5e5;">'
            f'<a href="{url}" style="font-size:17px;font-weight:700;'
            'color:#111111;text-decoration:none;">'
            f"{title}</a>"
            f'<div style="font-size:14px;color:#555555;margin-top:4px;">{dek}</div>'
            "</td></tr>"
        )
    body = "".join(rows) or (
        '<tr><td style="padding:12px 0;color:#555555;">'
        "No new stories in the last 24 hours.</td></tr>"
    )
    return (
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" '
        'style="max-width:600px;margin:0 auto;font-family:Georgia,serif;">'
        '<tr><td style="padding:16px 0;">'
        '<div style="font-size:22px;font-weight:700;color:#111111;">'
        "Techno Times</div>"
        '<div style="font-size:13px;color:#888888;text-transform:uppercase;'
        'letter-spacing:1px;">Your daily brief</div>'
        "</td></tr>"
        f"{body}"
        '<tr><td style="padding:20px 0;font-size:12px;color:#999999;">'
        f'<a href="{site_url.rstrip("/")}" style="color:#999999;">'
        "technotimes.com</a></td></tr>"
        "</table>"
    )


def _batch(items: list[Any], size: int) -> list[list[Any]]:
    return [items[i : i + size] for i in range(0, len(items), size)]


async def _fetch_recent_articles(cfg: Config) -> list[dict[str, Any]]:
    headers = {"Authorization": f"Bearer {cfg.admin_api_key}"}
    async with httpx.AsyncClient(timeout=30, headers=headers) as client:
        r = await client.get(
            f"{cfg.site_url}/api/admin/recent-articles",
            params={"since": "24h", "limit": 10},
        )
        r.raise_for_status()
        return r.json().get("articles", []) or []


async def _fetch_subscribers(cfg: Config) -> list[str]:
    headers = {"Authorization": f"Bearer {cfg.admin_api_key}"}
    async with httpx.AsyncClient(timeout=30, headers=headers) as client:
        r = await client.get(f"{cfg.site_url}/api/admin/subscribers")
        r.raise_for_status()
        emails = r.json().get("subscribers", []) or []
        return [str(e) for e in emails if e]


async def send_daily_digest(cfg: Config) -> dict:
    """Compose and send the daily digest email.

    Returns a small status dict. Never raises on a missing API key — when
    `RESEND_API_KEY` is unset the digest is skipped with status 'skipped'.
    """
    import os

    api_key = os.environ.get("RESEND_API_KEY")
    weekday = time.strftime("%A", time.gmtime())
    subject = f"Techno Times — {weekday} brief"

    articles = await _fetch_recent_articles(cfg)
    subscribers = await _fetch_subscribers(cfg)
    html = render_digest_html(cfg.site_url, articles)

    if not api_key:
        return {
            "status": "skipped",
            "reason": "RESEND_API_KEY unset",
            "articles": len(articles),
            "subscribers": len(subscribers),
        }

    if not subscribers:
        return {
            "status": "no_recipients",
            "articles": len(articles),
            "subscribers": 0,
            "batches": 0,
        }

    sent = 0
    batches = _batch(subscribers, BCC_BATCH_SIZE)
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    async with httpx.AsyncClient(timeout=30, headers=headers) as client:
        for batch in batches:
            payload = {
                "from": DIGEST_FROM,
                # `to` is the From address so the message has a valid primary
                # recipient; the real audience is bcc'd for privacy.
                "to": [DIGEST_FROM],
                "bcc": batch,
                "subject": subject,
                "html": html,
            }
            r = await client.post(RESEND_EMAILS_URL, json=payload)
            if r.status_code < 400:
                sent += len(batch)

    return {
        "status": "sent",
        "articles": len(articles),
        "subscribers": len(subscribers),
        "batches": len(batches),
        "recipients_sent": sent,
        "subject": subject,
    }
