import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();
const secret = process.env.API_SECRET;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "GET") {
    try {
      const list = await redis.smembers<string>("banned").catch(() => []);
      return res.status(200).json(list ?? []);
    } catch (err: any) {
      return res.status(500).send(err?.message ?? "error");
    }
  }

  if (req.method === "POST") {
    if (secret && req.headers.authorization !== `Bearer ${secret}`) {
      return res.status(401).send("unauthorized");
    }
    try {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      const action = body?.action ?? "add"; // add|remove
      const entry = body?.entry as string;
      if (!entry) return res.status(400).send("entry required (ip:port)");

      if (action === "remove") {
        await redis.srem("banned", entry);
      } else {
        await redis.sadd("banned", entry);
      }
      const list = await redis.smembers<string>("banned").catch(() => []);
      return res.status(200).json(list ?? []);
    } catch (err: any) {
      return res.status(500).send(err?.message ?? "error");
    }
  }

  return res.status(405).send("method not allowed");
}
