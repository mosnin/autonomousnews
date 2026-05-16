"""HTTP client for the Techno Times Next.js admin/agent endpoints."""
from __future__ import annotations

import asyncio
from typing import Any

import httpx


class ApiClient:
    def __init__(self, base_url: str, admin_api_key: str) -> None:
        self.base_url = base_url.rstrip("/")
        self._headers = {
            "Authorization": f"Bearer {admin_api_key}",
            "Content-Type": "application/json",
        }
        self._client = httpx.AsyncClient(timeout=30, headers=self._headers)

    async def aclose(self) -> None:
        await self._client.aclose()

    # --- runs ---------------------------------------------------------------
    async def upsert_run(self, payload: dict[str, Any]) -> str:
        r = await self._client.post(f"{self.base_url}/api/agent/runs", json=payload)
        r.raise_for_status()
        return r.json()["id"]

    # --- logs ---------------------------------------------------------------
    async def append_logs(self, logs: list[dict[str, Any]]) -> None:
        if not logs:
            return
        r = await self._client.post(f"{self.base_url}/api/agent/logs", json=logs)
        r.raise_for_status()

    # --- articles -----------------------------------------------------------
    async def insert_article(self, payload: dict[str, Any]) -> str:
        r = await self._client.post(f"{self.base_url}/api/agent/articles", json=payload)
        r.raise_for_status()
        return r.json()["id"]


class LogBuffer:
    """Buffered log emitter that flushes periodically to the API."""

    def __init__(self, api: ApiClient, run_id: str | None) -> None:
        self.api = api
        self.run_id = run_id
        self.buf: list[dict[str, Any]] = []
        self._lock = asyncio.Lock()

    def set_run_id(self, run_id: str) -> None:
        self.run_id = run_id
        for entry in self.buf:
            entry.setdefault("run_id", run_id)

    async def log(
        self,
        level: str,
        message: str,
        **metadata: Any,
    ) -> None:
        entry: dict[str, Any] = {
            "level": level,
            "message": message,
            "metadata": metadata,
        }
        if self.run_id:
            entry["run_id"] = self.run_id
        async with self._lock:
            self.buf.append(entry)
            print(f"[{level}] {message} {metadata if metadata else ''}")
            if len(self.buf) >= 20:
                await self._flush_locked()

    async def info(self, message: str, **metadata: Any) -> None:
        await self.log("info", message, **metadata)

    async def warn(self, message: str, **metadata: Any) -> None:
        await self.log("warn", message, **metadata)

    async def error(self, message: str, **metadata: Any) -> None:
        await self.log("error", message, **metadata)

    async def flush(self) -> None:
        async with self._lock:
            await self._flush_locked()

    async def _flush_locked(self) -> None:
        if not self.buf:
            return
        try:
            await self.api.append_logs(self.buf)
        except Exception as e:  # pragma: no cover — never let logging crash a run
            print(f"log flush failed: {e}")
        self.buf.clear()
