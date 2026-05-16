import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Single shared client. When env vars are absent, every helper short-circuits
// to "allowed" — the app keeps working in dev / CI without hard-requiring
// Upstash credentials.
let redis: Redis | null = null;
function getRedis(): Redis | null {
  if (redis) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  redis = new Redis({ url, token });
  return redis;
}

const limiters = new Map<string, Ratelimit>();

function getLimiter(
  bucket: string,
  limit: number,
  windowSec: number
): Ratelimit | null {
  const r = getRedis();
  if (!r) return null;
  const cached = limiters.get(bucket);
  if (cached) return cached;
  const limiter = new Ratelimit({
    redis: r,
    limiter: Ratelimit.slidingWindow(limit, `${windowSec} s`),
    analytics: false,
    prefix: `tt:rl:${bucket}`,
  });
  limiters.set(bucket, limiter);
  return limiter;
}

export type LimitResult = {
  allowed: boolean;
  remaining: number;
  reset: number;
  limit: number;
};

// Returns { allowed: true, ... } when Upstash isn't configured.
export async function limitByIp(
  req: Request,
  bucket: string,
  limit: number,
  windowSec: number
): Promise<LimitResult> {
  const limiter = getLimiter(bucket, limit, windowSec);
  if (!limiter) {
    return { allowed: true, remaining: limit, reset: 0, limit };
  }
  const ip = clientIp(req);
  const r = await limiter.limit(`${bucket}:${ip}`);
  return {
    allowed: r.success,
    remaining: r.remaining,
    reset: r.reset,
    limit: r.limit,
  };
}

function clientIp(req: Request): string {
  // Vercel sets x-forwarded-for; in dev / tests we may have nothing.
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export function rateLimitHeaders(r: LimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(r.limit),
    "X-RateLimit-Remaining": String(r.remaining),
    "X-RateLimit-Reset": String(r.reset),
  };
}

export function isRateLimitConfigured(): boolean {
  return !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;
}
