// @ts-nocheck
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    res.setHeader("Cache-Control", "no-store");
    const debug = _req.query?.debug === "1";

    const keys = await redis.smembers<string>("srv:index").catch(() => []);
    if (!keys || keys.length === 0) {
      return res.status(200).json(debug ? { servers: [], keys } : []);
    }

    // Fetch banned/official sets
    const [bannedList, officialList] = await Promise.all([
      redis.smembers<string>("banned").catch(() => []),
      redis.smembers<string>("official").catch(() => []),
    ]);
    const bannedSet = new Set(bannedList ?? []);
    const officialSet = new Set(officialList ?? []);

    const values = await redis.mget<string[]>(...keys);
    const servers = [];
    for (let i = 0; i < keys.length; i++) {
      const raw = values[i];
      if (!raw) {
        // key expired; prune from index
        await redis.srem("srv:index", keys[i]);
        continue;
      }
      try {
        const s = JSON.parse(raw as string);
        const key = `${s.ip}:${s.port}`;
        if (bannedSet.has(key)) continue;
        servers.push({ ...s, isOfficial: officialSet.has(key) });
      } catch {
        continue;
      }
    }

    if (debug) {
      return res.status(200).json({ servers, keys });
    }

    return res.status(200).json(servers);
  } catch (err: any) {
    return res.status(500).send(err?.message ?? "error");
  }
}
