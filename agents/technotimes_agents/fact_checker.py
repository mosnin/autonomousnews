"""Adversarial fact-checker — phase 9.

An independent LLM that reads the writer's finished article and verifies
every factual claim against the source bundle that fed the writer.

Why this exists
---------------
The writer (`pipeline.write_article`) is prompted heavily to cite, attribute,
and stay inside its source set. The prompt is necessary but not sufficient:
under load, models will quietly invent a date, a number, or a name. That
kind of failure is correlated *within* a single model family — asking the
same model to grade its own output will not catch it.

The fix is a second LLM, from a different model family (different training
cut, different pretraining mix, different inductive biases), framed
adversarially: "you are NOT the writer; find claims the sources do not
support." If the checker flags zero unsupported claims (or only stylistic
glue), the article is published. If it flags 1–2 substantive claims, we
soft-fail and ask the writer to rewrite with those claims removed; one
retry, then discard. 3+ unsupported claims is a hard fail.

The report (verdict + summary stats + model used + cost) is persisted on
the article row so editors can see, after the fact, why a piece shipped.
The full claim list is kept in memory only — it can be hundreds of lines,
and we don't want to balloon the articles row with it.
"""
from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Literal

from openai import AsyncOpenAI

from .api_client import LogBuffer
from .config import Config
from .sources import Cluster, Trend


# --- data classes ----------------------------------------------------------
@dataclass
class Claim:
    """One factual claim extracted from the article."""

    text: str
    supported: bool
    supporting_quote_from_source: str | None
    source_index: int | None  # 1..N, or None if unsupported


@dataclass
class FactCheckReport:
    """Outcome of one fact-check pass."""

    verdict: Literal["pass", "soft_fail", "fail"]
    failure_reason: str | None
    claims: list[Claim]
    unsupported: list[Claim] = field(default_factory=list)
    model_used: str = ""
    prompt_tokens: int = 0
    completion_tokens: int = 0
    cost_usd: float = 0.0


# --- prompts ---------------------------------------------------------------
# The framing is the whole point of this module: the checker must not defer
# to the article, and must not write apology-prose about why an article is
# well-written. Its only job is to enumerate claims and mark each one as
# supported / unsupported.
FACT_CHECKER_SYSTEM = """You are an adversarial fact-checker for Techno Times. You are NOT the writer and you do NOT defer to the article. Your job is to find every claim that is not supported by the sources.

For each factual claim in the article — every named person, organization, place, date, number, quote, causal statement, or definitive assertion — identify whether it is supported by a specific sentence in the sources.

A claim is "supported" only if a source contains the SAME fact in plain text or a clear paraphrase. Reasonable inferences and natural-language compression are allowed. Speculation, extrapolation, or invented detail are NOT supported.

Output JSON only:

{
  "claims": [
    {
      "text": "<exact sentence or substring from the article>",
      "supported": true | false,
      "supporting_quote_from_source": "<quote from the source or null>",
      "source_index": <1-N or null>
    }
  ],
  "verdict": "pass" | "fail",
  "failure_reason": "<short string when verdict=fail, null otherwise>"
}

Verdict rules:
- "pass" if 0 unsupported claims OR all unsupported claims are stylistic glue (e.g. transitions, opinions explicitly framed as analysis).
- "fail" otherwise.

Do NOT be sycophantic. Do NOT explain why the article is well-written. Your job is to find what isn't supported."""


def _format_sources_block(sources: list[Trend]) -> str:
    """Render the cluster sources as a numbered block the checker can index into."""
    lines: list[str] = []
    for i, src in enumerate(sources, start=1):
        lines.append(f"[{i}] {src.source}")
        lines.append(f"Title: {src.title}")
        lines.append(f"URL: {src.url or '(none)'}")
        lines.append(
            f"Body: {src.description or '(no description provided by source)'}"
        )
        lines.append("")
    return "\n".join(lines).rstrip()


def _build_user_message(article_body: str, sources: list[Trend]) -> str:
    return (
        "ARTICLE TO CHECK:\n"
        f"{article_body}\n\n"
        "SOURCES:\n"
        f"{_format_sources_block(sources)}\n\n"
        "Return the JSON report."
    )


def _parse_claims(raw_claims: object) -> list[Claim]:
    """Defensive parse — the model can drift; never crash on a bad shape."""
    if not isinstance(raw_claims, list):
        return []
    out: list[Claim] = []
    for item in raw_claims:
        if not isinstance(item, dict):
            continue
        text = item.get("text")
        if not isinstance(text, str) or not text.strip():
            continue
        supported = bool(item.get("supported"))
        quote = item.get("supporting_quote_from_source")
        if quote is not None and not isinstance(quote, str):
            quote = None
        idx = item.get("source_index")
        if not isinstance(idx, int):
            idx = None
        out.append(
            Claim(
                text=text.strip(),
                supported=supported,
                supporting_quote_from_source=(
                    quote if isinstance(quote, str) and quote.strip() else None
                ),
                source_index=idx,
            )
        )
    return out


def _classify_verdict(
    raw_verdict: str | None,
    raw_reason: str | None,
    unsupported: list[Claim],
) -> tuple[Literal["pass", "soft_fail", "fail"], str | None]:
    """Map the model's binary pass/fail onto our three-state verdict.

    The model returns pass | fail. We upgrade a fail with 1–2 unsupported
    claims to soft_fail so the writer can take one retry. Hard fail at 3+.
    """
    n = len(unsupported)
    model_verdict = (raw_verdict or "").lower().strip()
    if model_verdict == "pass" and n == 0:
        return "pass", None
    if n == 0:
        # Model said fail but produced no unsupported claims — treat as pass
        # rather than blocking on a checker that contradicts itself.
        return "pass", None
    reason = raw_reason or f"{n} unsupported claim(s)"
    if n <= 2:
        return "soft_fail", reason
    return "fail", reason


def _estimate_cost(model: str, prompt_tokens: int, completion_tokens: int) -> float:
    """Local pricing copy — kept here to avoid a circular import with pipeline."""
    from .pipeline import MODEL_PRICING_USD_PER_M

    p = MODEL_PRICING_USD_PER_M.get(model, {"input": 1.0, "output": 3.0})
    return (
        prompt_tokens * p["input"] + completion_tokens * p["output"]
    ) / 1_000_000


# --- main entry point ------------------------------------------------------
async def fact_check_article(
    cfg: Config,
    client: AsyncOpenAI,
    article_body: str,
    cluster: Cluster,
    log: LogBuffer,
) -> FactCheckReport:
    """Run one fact-check pass.

    Returns a `FactCheckReport`. Verdict is one of:
      - "pass":      ship it
      - "soft_fail": 1–2 unsupported claims; caller may rewrite once
      - "fail":      3+ unsupported claims, or no response from the checker
    """
    sources: list[Trend] = list(cluster.sources) if cluster.sources else []
    if not sources:
        # Defensive: a cluster with no sources should never reach here, but
        # if it does we cannot verify anything — treat as fail rather than
        # silently passing.
        return FactCheckReport(
            verdict="fail",
            failure_reason="fact-checker received empty source set",
            claims=[],
            unsupported=[],
            model_used=cfg.checker_model,
        )

    # Runtime guard: if someone wires the checker to the same model as the
    # writer, log a loud warning. The whole point of the checker is a
    # different failure surface.
    if cfg.checker_model == cfg.writer_model:
        await log.warn(
            "fact-checker uses same model as writer — correlated-error risk",
            checker_model=cfg.checker_model,
            writer_model=cfg.writer_model,
        )

    user_msg = _build_user_message(article_body, sources)
    try:
        resp = await client.chat.completions.create(
            model=cfg.checker_model,
            messages=[
                {"role": "system", "content": FACT_CHECKER_SYSTEM},
                {"role": "user", "content": user_msg},
            ],
            response_format={"type": "json_object"},
            temperature=0.0,
        )
    except Exception as e:
        await log.warn("fact-checker call failed", error=str(e))
        return FactCheckReport(
            verdict="fail",
            failure_reason=f"checker call failed: {type(e).__name__}",
            claims=[],
            unsupported=[],
            model_used=cfg.checker_model,
        )

    usage = resp.usage
    pt = usage.prompt_tokens if usage else 0
    ct = usage.completion_tokens if usage else 0
    cost = _estimate_cost(cfg.checker_model, pt, ct)

    raw_content = resp.choices[0].message.content or "{}"
    try:
        data = json.loads(raw_content)
    except json.JSONDecodeError:
        await log.warn(
            "fact-checker returned invalid json — failing closed",
            raw=raw_content[:300],
        )
        return FactCheckReport(
            verdict="fail",
            failure_reason="checker returned invalid JSON",
            claims=[],
            unsupported=[],
            model_used=cfg.checker_model,
            prompt_tokens=pt,
            completion_tokens=ct,
            cost_usd=cost,
        )

    claims = _parse_claims(data.get("claims"))
    # Constrain source_index to the cluster size so a model hallucinating
    # "[7]" for a 3-source cluster doesn't propagate downstream.
    n_sources = len(sources)
    for c in claims:
        if c.source_index is not None and (
            c.source_index < 1 or c.source_index > n_sources
        ):
            c.source_index = None
            c.supported = False
    unsupported = [c for c in claims if not c.supported]

    verdict, reason = _classify_verdict(
        data.get("verdict") if isinstance(data.get("verdict"), str) else None,
        data.get("failure_reason") if isinstance(data.get("failure_reason"), str) else None,
        unsupported,
    )

    return FactCheckReport(
        verdict=verdict,
        failure_reason=reason,
        claims=claims,
        unsupported=unsupported,
        model_used=cfg.checker_model,
        prompt_tokens=pt,
        completion_tokens=ct,
        cost_usd=cost,
    )


def summarize_report(report: FactCheckReport) -> dict[str, object]:
    """Compact summary persisted on the article row.

    The full claim list can be hundreds of lines; we keep it in memory for
    the run log but only the summary goes to Postgres.
    """
    return {
        "verdict": report.verdict,
        "failure_reason": report.failure_reason,
        "claims_total": len(report.claims),
        "claims_unsupported": len(report.unsupported),
        "model_used": report.model_used,
        "cost_usd": round(report.cost_usd, 6),
    }
