"""Modal app: hourly news + weekly pillar pipelines for Techno Times.

Deploy with:

    modal deploy modal_app.py

Locally test (without Modal):

    python -m technotimes_agents.pipeline           # one news run
    python -m technotimes_agents.pillar_pipeline    # one pillar refresh
"""
from __future__ import annotations

import asyncio

import modal

image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install_from_requirements("requirements.txt")
    .add_local_python_source("technotimes_agents")
)

app = modal.App(name="technotimes-news", image=image)

# All secrets the worker needs. Create with:
#   modal secret create technotimes-secrets \
#       OPENAI_API_KEY=... NEWSAPI_KEY=... THENEWSAPI_TOKEN=... \
#       ADMIN_API_KEY=... SITE_URL=https://technotimes.com
secrets = [modal.Secret.from_name("technotimes-secrets")]


# ----------------------------------------------------------------------
# News pipeline — hourly
# ----------------------------------------------------------------------
@app.function(
    secrets=secrets,
    timeout=600,
    schedule=modal.Period(hours=1),
)
def hourly_run() -> dict:
    """Spawned once per hour by Modal's scheduler."""
    from technotimes_agents.config import Config
    from technotimes_agents.pipeline import run_pipeline

    cfg = Config.from_env()
    return asyncio.run(run_pipeline(cfg, trigger="cron"))


@app.function(secrets=secrets, timeout=600)
def manual_run() -> dict:
    """`modal run modal_app.py::manual_run` for ad-hoc testing."""
    from technotimes_agents.config import Config
    from technotimes_agents.pipeline import run_pipeline

    cfg = Config.from_env()
    return asyncio.run(run_pipeline(cfg, trigger="manual"))


# ----------------------------------------------------------------------
# Pillar pipeline — weekly. Refreshes the evergreen 'topic guides' that
# sit above the article grid on every subcategory page.
# ----------------------------------------------------------------------
@app.function(
    secrets=secrets,
    timeout=3600,                     # 80 pillars × ~30s each
    schedule=modal.Cron("0 8 * * 1"), # 08:00 UTC every Monday
)
def weekly_pillar_refresh() -> dict:
    """Spawned once a week by Modal's scheduler."""
    from technotimes_agents.config import Config
    from technotimes_agents.pillar_pipeline import run_pillar_refresh

    cfg = Config.from_env()
    return asyncio.run(run_pillar_refresh(cfg, trigger="cron-weekly"))


@app.function(secrets=secrets, timeout=3600)
def manual_pillar_refresh() -> dict:
    """`modal run modal_app.py::manual_pillar_refresh` for ad-hoc rebuilds."""
    from technotimes_agents.config import Config
    from technotimes_agents.pillar_pipeline import run_pillar_refresh

    cfg = Config.from_env()
    return asyncio.run(run_pillar_refresh(cfg, trigger="manual"))


@app.local_entrypoint()
def main() -> None:
    """`modal run modal_app.py` triggers one manual news pipeline run."""
    result = manual_run.remote()
    print(result)
