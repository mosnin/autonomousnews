"""Configuration loaded from environment variables.

The Modal app injects these as secrets at runtime; locally they come from a
.env file or the shell.
"""
from __future__ import annotations

import os
from dataclasses import dataclass


def _env(name: str, default: str | None = None) -> str:
    val = os.environ.get(name, default)
    if val is None:
        raise RuntimeError(f"Missing required env var: {name}")
    return val


@dataclass(frozen=True)
class Config:
    site_url: str
    admin_api_key: str
    openai_api_key: str
    newsapi_key: str | None
    thenewsapi_token: str | None
    daily_budget_usd: float

    # Writer / editor models
    editor_model: str
    writer_model: str
    image_model: str
    # Pillar refresh runs weekly across ~80 subcategories — uses a cheaper
    # model than the breaking-news writer because pillars are evergreen and
    # don't need the same time-pressure judgment.
    pillar_model: str
    # The adversarial fact-checker that audits writer output before publish.
    # MUST default to a different model family than `writer_model` —
    # correlated errors (same model grading its own work) are the failure
    # mode the checker exists to catch. `pipeline.run_pipeline` emits a
    # warning at runtime if these end up equal.
    checker_model: str

    # Output settings
    articles_per_run_min: int
    articles_per_run_max: int
    evergreen_ratio: float  # 0..1

    # When true: fetch trends + ask the editor for picks, but skip the
    # writer + image + publish steps. Logs what the run *would* do so you
    # can validate the pipeline without burning OpenAI / DALL-E tokens.
    dry_run: bool = False

    @classmethod
    def from_env(cls) -> "Config":
        return cls(
            site_url=_env("SITE_URL", "https://technotimes.com").rstrip("/"),
            admin_api_key=_env("ADMIN_API_KEY"),
            openai_api_key=_env("OPENAI_API_KEY"),
            newsapi_key=os.environ.get("NEWSAPI_KEY") or None,
            thenewsapi_token=os.environ.get("THENEWSAPI_TOKEN") or None,
            daily_budget_usd=float(os.environ.get("DAILY_BUDGET_USD", "10")),
            editor_model=os.environ.get("EDITOR_MODEL", "gpt-4o-mini"),
            writer_model=os.environ.get("WRITER_MODEL", "gpt-4o-mini"),
            image_model=os.environ.get("IMAGE_MODEL", "dall-e-3"),
            pillar_model=os.environ.get("PILLAR_MODEL", "gpt-5-mini"),
            checker_model=os.environ.get("CHECKER_MODEL", "gpt-5-mini"),
            articles_per_run_min=int(os.environ.get("ARTICLES_MIN", "3")),
            articles_per_run_max=int(os.environ.get("ARTICLES_MAX", "5")),
            evergreen_ratio=float(os.environ.get("EVERGREEN_RATIO", "0.3")),
            dry_run=os.environ.get("DRY_RUN", "").lower() in ("1", "true", "yes"),
        )
