"""Modal app: hourly autonomous news pipeline for Techno Times.

Deploy with:

    modal deploy modal_app.py

Locally test (without Modal) with:

    python -m technotimes_agents.pipeline
"""
from __future__ import annotations

import asyncio

import modal

image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install_from_pyproject("pyproject.toml")
    .add_local_python_source("technotimes_agents")
)

app = modal.App(name="technotimes-news", image=image)

# All secrets the worker needs. Create with:
#   modal secret create technotimes-secrets \
#       OPENAI_API_KEY=... NEWSAPI_KEY=... THENEWSAPI_TOKEN=... \
#       ADMIN_API_KEY=... SITE_URL=https://technotimes.com
secrets = [modal.Secret.from_name("technotimes-secrets")]


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
    """Invoked by `modal run modal_app.py::manual_run` for ad-hoc testing."""
    from technotimes_agents.config import Config
    from technotimes_agents.pipeline import run_pipeline

    cfg = Config.from_env()
    return asyncio.run(run_pipeline(cfg, trigger="manual"))


@app.local_entrypoint()
def main() -> None:
    """`modal run modal_app.py` triggers one manual pipeline run."""
    result = manual_run.remote()
    print(result)
