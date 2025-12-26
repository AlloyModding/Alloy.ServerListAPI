import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const keys = await redis.keys("srv:*");
    if (!keys || keys.length === 0) return res.status(200).json([]);

    // Fetch banned/official sets
    const [bannedList, officialList] = await Promise.all([
      redis.smembers<string>("banned").catch(() => []),
      redis.smembers<string>("official").catch(() => []),
    ]);
    const bannedSet = new Set(bannedList ?? []);
    const officialSet = new Set(officialList ?? []);

    const values = await redis.mget<string[]>(...keys);
    const servers = values
      .filter(Boolean)
      .map((s) => {
        try {
          return JSON.parse(s as string);
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .map((s: any) => {
        const key = `${s.ip}:${s.port}`;
        if (bannedSet.has(key)) return null;
        return { ...s, isOfficial: officialSet.has(key) };
      })
      .filter(Boolean);

    return res.status(200).json(servers);
  } catch (err: any) {
    return res.status(500).send(err?.message ?? "error");
  }
}
