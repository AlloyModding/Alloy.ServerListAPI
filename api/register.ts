// @ts-nocheck
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Redis } from "@upstash/redis";

// Expects UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN env vars (set in Vercel)
const redis = Redis.fromEnv();
const TTL_SECONDS = 120;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).send("Method not allowed");

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    if (!body?.ip || !body?.port) return res.status(400).send("ip/port required");

    const key = `srv:${body.ip}:${body.port}`;
    body.lastHeartbeat = Math.floor(Date.now() / 1000);

    await redis.set(key, JSON.stringify(body), { ex: TTL_SECONDS });
    return res.status(200).send("ok");
  } catch (err: any) {
    return res.status(500).send(err?.message ?? "error");
  }
}
