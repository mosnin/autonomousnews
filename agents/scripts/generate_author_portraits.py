"""One-off: generate hyper-realistic editorial portraits for the author roster.

DALL-E 3 standard quality at 1024x1024 is $0.04/image. 15 authors = $0.60.

Usage:
    cd agents
    python -m scripts.generate_author_portraits

Requires the same env as the main worker (OPENAI_API_KEY, SITE_URL,
ADMIN_API_KEY). For each author it:

1. Asks DALL-E 3 to generate a portrait in a consistent house style.
2. POSTs the resulting (ephemeral) DALL-E URL to /api/agent/images,
   which downloads + re-hosts it in Supabase Storage.
3. Upserts the persisted URL into author_profiles via /api/agent/authors.
"""
from __future__ import annotations

import asyncio
import os

import httpx
from openai import AsyncOpenAI

from technotimes_agents.api_client import ApiClient
from technotimes_agents.taxonomy import AUTHORS


STYLE = (
    "studio editorial portrait, head and shoulders, soft natural lighting, "
    "neutral gray background, sharp focus, hyper-realistic, modern, classy, "
    "muted color palette, magazine-quality, no text, no logos, no watermark, "
    "professional newsroom attire, looking directly at camera with calm "
    "confident expression"
)


def prompt_for(name: str, title: str) -> str:
    return (
        f"A portrait of {name}, {title}. {STYLE}. "
        "The subject is a real-looking person, age 30-50, ethnicity inferred "
        "from the name; treat as a fictional character. Not a celebrity."
    )


async def main() -> None:
    site_url = os.environ["SITE_URL"].rstrip("/")
    admin_key = os.environ["ADMIN_API_KEY"]
    client = AsyncOpenAI(api_key=os.environ["OPENAI_API_KEY"])
    api = ApiClient(site_url, admin_key)

    async with httpx.AsyncClient(timeout=60, headers={
        "Authorization": f"Bearer {admin_key}",
        "Content-Type": "application/json",
    }) as http:
        for a in AUTHORS:
            print(f"-> {a.name}", flush=True)
            try:
                resp = await client.images.generate(
                    model="dall-e-3",
                    prompt=prompt_for(a.name, a.title),
                    size="1024x1024",
                    quality="standard",
                    n=1,
                )
                dalle_url = resp.data[0].url if resp.data else None
                if not dalle_url:
                    print("   no url returned, skipping")
                    continue

                persisted = await api.persist_image(dalle_url, slug=f"author-{a.slug}")
                if not persisted:
                    print("   persist failed, skipping")
                    continue
                print(f"   stored: {persisted}")

                r = await http.post(
                    f"{site_url}/api/agent/authors",
                    json={"slug": a.slug, "portrait_url": persisted},
                )
                r.raise_for_status()
            except Exception as e:
                print(f"   error: {e}")

    await api.aclose()


if __name__ == "__main__":
    asyncio.run(main())
