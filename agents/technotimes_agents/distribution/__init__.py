"""Distribution channels for published articles.

After an article is published, the pipeline fans it out to every social
channel that has credentials configured (X, Slack, Discord). A separate
daily Modal cron emails a digest of the top stories. Every channel is a
best-effort no-op when its env var is unset — distribution must never
crash a pipeline run.
"""
from __future__ import annotations

from .digest import send_daily_digest
from .webhooks import post_to_discord, post_to_slack
from .x_poster import post_to_x

__all__ = [
    "post_to_x",
    "post_to_slack",
    "post_to_discord",
    "send_daily_digest",
]
