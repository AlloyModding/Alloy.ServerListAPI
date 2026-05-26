// @ts-nocheck
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getRedis, redisEnvStatus } from "../lib/redis";


export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const redis = getRedis();
    res.setHeader("Cache-Control", "no-store");
    const debug = _req.query?.debug === "1";

    const keys = await redis.smembers<string>("srv:index");
    if (!keys || keys.length === 0) {
      return res.status(200).json(debug ? { servers: [], keys } : []);
    }

    // Fetch banned/official sets
    const [bannedList, officialList] = await Promise.all([
      redis.smembers<string>("banned"),
      redis.smembers<string>("official"),
    ]);
    const bannedSet = new Set(bannedList ?? []);
    const officialSet = new Set(officialList ?? []);

    const servers: any[] = [];
    const raws: Record<string, any> = {};
    for (const key of keys) {
      const raw = await redis.get(key);
      if (!raw) {
        await redis.srem("srv:index", key);
        continue;
      }
      raws[key] = raw;
      try {
        const s = typeof raw === "string" ? JSON.parse(raw) : raw;
        const pk = `${s.ip}:${s.port}`;
        if (bannedSet.has(pk)) continue;
        servers.push({ ...s, isOfficial: officialSet.has(pk) });
      } catch {
        continue;
      }
    }

    if (debug) {
      return res.status(200).json({ servers, keys, raws });
    }

    return res.status(200).json(servers);
  } catch (err: any) {
    if (_req.query?.debug === "1") {
      return res.status(500).json({ error: err?.message ?? "error", redis: redisEnvStatus() });
    }
    return res.status(500).send(err?.message ?? "error");
  }
}
