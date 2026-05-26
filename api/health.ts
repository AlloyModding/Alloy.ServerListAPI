// @ts-nocheck
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getRedis, redisConfig, redisEnvStatus } from "../lib/redis";

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store");

  try {
    const redis = getRedis();
    const pong = await redis.ping();
    return res.status(200).json({
      ok: true,
      redis: redisEnvStatus(),
      ping: pong,
      time: Math.floor(Date.now() / 1000),
    });
  } catch (err: any) {
    return res.status(500).json({
      ok: false,
      redis: redisEnvStatus(),
      error: normalizeError(err),
      directFetch: await directUpstashPing(),
    });
  }
}

async function directUpstashPing() {
  try {
    const { url, token } = redisConfig();
    if (!url || !token) return { ok: false, skipped: "missing Redis URL or token" };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(["PING"]),
    });

    const body = await response.text();
    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      body: body.slice(0, 500),
    };
  } catch (err: any) {
    return {
      ok: false,
      error: normalizeError(err),
    };
  }
}

function normalizeError(err: any) {
  return {
    name: err?.name ?? "Error",
    message: err?.message ?? String(err),
    cause: err?.cause?.message ?? err?.cause?.code ?? "",
  };
}
