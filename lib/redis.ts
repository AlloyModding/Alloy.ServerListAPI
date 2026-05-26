import { Redis } from "@upstash/redis";

function env(name: string) {
  return process.env[name]?.trim() ?? "";
}

export function redisConfig() {
  const upstashUrl = env("UPSTASH_REDIS_REST_URL");
  const upstashToken = env("UPSTASH_REDIS_REST_TOKEN");
  const kvUrl = env("KV_REST_API_URL");
  const kvToken = env("KV_REST_API_TOKEN");
  const url = upstashUrl || kvUrl;
  const token = upstashToken || kvToken;

  return {
    url,
    token,
    provider: upstashUrl || upstashToken ? "upstash" : kvUrl || kvToken ? "vercel-kv" : "missing",
    acceptedUrlEnv: upstashUrl ? "UPSTASH_REDIS_REST_URL" : kvUrl ? "KV_REST_API_URL" : "",
    acceptedTokenEnv: upstashToken ? "UPSTASH_REDIS_REST_TOKEN" : kvToken ? "KV_REST_API_TOKEN" : "",
  };
}

export function redisEnvStatus() {
  const config = redisConfig();

  return {
    hasUrl: Boolean(config.url),
    hasToken: Boolean(config.token),
    provider: config.provider,
    acceptedUrlEnv: config.acceptedUrlEnv,
    acceptedTokenEnv: config.acceptedTokenEnv,
    urlOrigin: config.url ? safeOrigin(config.url) : "",
    tokenLength: config.token.length,
  };
}

export function getRedis() {
  const { url, token } = redisConfig();

  if (!url || !token) {
    throw new Error("Redis env missing: set UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN or KV_REST_API_URL/KV_REST_API_TOKEN");
  }

  return new Redis({ url, token });
}

function safeOrigin(url: string) {
  try {
    return new URL(url).origin;
  } catch {
    return "invalid-url";
  }
}
