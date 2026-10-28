import { NextResponse } from "next/server";

export type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
};

const WINDOW_SECONDS = 60;

const LIMITS: Record<string, number> = {
  login: 10,
  register: 5,
  forgot: 5,
  reset: 5,
  order: 10,
  search: 120,
  track: 30,
  form: 10,
  adminMutation: 120,
  // Read-only shopping operations (quote revalidation, pincode serviceability) need
  // higher limits than write-form operations (address save, order placement) because
  // shoppers legitimately trigger them rapidly via steppers, delivery-mode toggles,
  // and payment-method flips. 60/min is 1 request/second sustained, which handles
  // normal human speed with headroom for coalesced bursts.
  quote: 60,
  delivery: 60,
};

type MemoryEntry = {
  count: number;
  reset: number;
};

const memory = new Map<string, MemoryEntry>();

let redis: unknown | null | undefined;

async function getRedis() {
  if (redis !== undefined) return redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    redis = null;
    return null;
  }

  try {
    const mod = (await import("@upstash/redis")) as {
      Redis: new (config: { url: string; token: string }) => unknown;
    };

    redis = new mod.Redis({ url, token });
    return redis;
  } catch {
    redis = null;
    return null;
  }
}

export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "unknown";

  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();

  return "unknown";
}

export async function rateLimit(
  name: string,
  identifier: string,
): Promise<RateLimitResult> {
  const limit = LIMITS[name] ?? 30;
  const key = `voltkart:rl:${name}:${identifier}`;
  const r = await getRedis() as {
    incr?: (key: string) => Promise<number>;
    expire?: (key: string, seconds: number) => Promise<unknown>;
    ttl?: (key: string) => Promise<number>;
  } | null;

  if (r?.incr) {
    const count = await r.incr(key);

    if (count === 1 && r.expire) {
      await r.expire(key, WINDOW_SECONDS);
    }

    const ttl = r.ttl ? await r.ttl(key) : WINDOW_SECONDS;
    const reset = Math.ceil((Date.now() + Math.max(0, ttl) * 1000) / 1000);

    return {
      success: count <= limit,
      limit,
      remaining: Math.max(0, limit - count),
      reset,
    };
  }

  const now = Date.now();
  const existing = memory.get(key);

  if (!existing || existing.reset <= now) {
    const reset = now + WINDOW_SECONDS * 1000;
    memory.set(key, { count: 1, reset });

    return {
      success: true,
      limit,
      remaining: limit - 1,
      reset: Math.ceil(reset / 1000),
    };
  }

  existing.count += 1;

  return {
    success: existing.count <= limit,
    limit,
    remaining: Math.max(0, limit - existing.count),
    reset: Math.ceil(existing.reset / 1000),
  };
}

export function tooMany(result: RateLimitResult) {
  return NextResponse.json(
    {
      ok: false,
      error: "Too many requests. Please slow down and try again.",
      code: "RATE_LIMITED",
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(Math.max(1, result.reset - Math.floor(Date.now() / 1000))),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": String(result.remaining),
        "X-RateLimit-Reset": String(result.reset),
      },
    },
  );
}