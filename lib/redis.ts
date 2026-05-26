import { Redis } from "@upstash/redis";

export function redisEnvStatus() {
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  const kvUrl = process.env.KV_REST_API_URL;
  const kvToken = process.env.KV_REST_API_TOKEN;
  const url = upstashUrl || kvUrl;
  const token = upstashToken || kvToken;

  return {
    hasUrl: Boolean(url),
    hasToken: Boolean(token),
    provider: upstashUrl || upstashToken ? "upstash" : kvUrl || kvToken ? "vercel-kv" : "missing",
    acceptedUrlEnv: upstashUrl ? "UPSTASH_REDIS_REST_URL" : kvUrl ? "KV_REST_API_URL" : "",
    acceptedTokenEnv: upstashToken ? "UPSTASH_REDIS_REST_TOKEN" : kvToken ? "KV_REST_API_TOKEN" : "",
  };
}

export function getRedis() {
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  const kvUrl = process.env.KV_REST_API_URL;
  const kvToken = process.env.KV_REST_API_TOKEN;
  const url = upstashUrl || kvUrl;
  const token = upstashToken || kvToken;

  if (!url || !token) {
    throw new Error("Redis env missing: set UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN or KV_REST_API_URL/KV_REST_API_TOKEN");
  }

  return new Redis({ url, token });
}
