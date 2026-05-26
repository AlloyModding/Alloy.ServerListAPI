// @ts-nocheck
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getRedis, redisEnvStatus } from "../lib/redis";

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
      error: err?.message ?? "error",
    });
  }
}
