import { NextRequest, NextResponse } from "next/server";

interface RateLimitOptions {
  windowMs?: number;
  maxRequests?: number;
}

interface RateLimitStore {
  count: number;
  resetTime: number;
}

const store = new Map<string, RateLimitStore>();

// Cleanup expired entries periodically every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of store.entries()) {
    if (now > record.resetTime) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000);

export function checkRateLimit(
  req: NextRequest,
  keyPrefix: string,
  userId?: string,
  options: RateLimitOptions = {}
): { isAllowed: boolean; limit: number; remaining: number; reset: number } {
  const windowMs = options.windowMs || 60 * 1000; // Default 1 minute
  const maxRequests = options.maxRequests || 30; // Default 30 req/min

  // Client IP resolution
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "127.0.0.1";
  
  const identifier = userId ? `user:${userId}` : `ip:${ip}`;
  const key = `${keyPrefix}:${identifier}`;
  const now = Date.now();

  const record = store.get(key);

  if (!record || now > record.resetTime) {
    store.set(key, {
      count: 1,
      resetTime: now + windowMs,
    });
    return {
      isAllowed: true,
      limit: maxRequests,
      remaining: maxRequests - 1,
      reset: Math.ceil((now + windowMs) / 1000),
    };
  }

  if (record.count >= maxRequests) {
    return {
      isAllowed: false,
      limit: maxRequests,
      remaining: 0,
      reset: Math.ceil(record.resetTime / 1000),
    };
  }

  record.count += 1;
  return {
    isAllowed: true,
    limit: maxRequests,
    remaining: maxRequests - record.count,
    reset: Math.ceil(record.resetTime / 1000),
  };
}

export function rateLimitResponse(
  limit: number,
  remaining: number,
  reset: number
): NextResponse {
  return NextResponse.json(
    { error: "Too many requests. Please try again later." },
    {
      status: 429,
      headers: {
        "X-RateLimit-Limit": limit.toString(),
        "X-RateLimit-Remaining": remaining.toString(),
        "X-RateLimit-Reset": reset.toString(),
        "Retry-After": Math.max(1, reset - Math.ceil(Date.now() / 1000)).toString(),
      },
    }
  );
}
