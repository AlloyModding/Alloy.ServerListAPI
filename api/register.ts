// @ts-nocheck
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getRedis } from "../lib/redis";

// Expects UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN env vars (set in Vercel)
const TTL_SECONDS = 120;
const SCHEMA_VERSION = 1;
const PROTOCOL_VERSION = 1;
const MAX_MODS_PER_SERVER = 200;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).send("Method not allowed");

  try {
    const redis = getRedis();
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    if (!body?.ip || !body?.port) return res.status(400).send("ip/port required");
    // Reject invalid/unspecified/loopback IPs
    const ip = (body.ip as string).trim();
    if (
      !ip ||
      ip === "0.0.0.0" ||
      ip.startsWith("127.") ||
      ip === "::1" ||
      ip.toLowerCase().includes("unspecified")
    ) {
      return res.status(400).send("invalid ip");
    }

    const port = toPort(body.port, 28015);
    if (!port) return res.status(400).send("invalid port");

    const server = normalizeServer(body, ip, port);
    const key = `srv:${server.ip}:${server.port}`;

    // store payload with TTL and keep an index set of active keys
    await Promise.all([
      redis.set(key, server, { ex: TTL_SECONDS }),
      redis.sadd("srv:index", key),
    ]);
    return res.status(200).send("ok");
  } catch (err: any) {
    return res.status(500).send(err?.message ?? "error");
  }
}

function normalizeServer(body: any, ip: string, port: number) {
  const alloyVersion = cleanString(body.alloyVersion) || "1.0.0";
  const alloyTag = cleanString(body.alloyTag) || `alloy_v${alloyVersion}`.toLowerCase();
  const tags = uniqueStrings([...(Array.isArray(body.tags) ? body.tags : splitTags(body.tags)), alloyTag]);

  return {
    schemaVersion: toPositiveInt(body.schemaVersion, SCHEMA_VERSION),
    protocolVersion: toPositiveInt(body.protocolVersion, PROTOCOL_VERSION),
    alloyVersion,
    alloyTag,
    name: cleanString(body.name) || cleanString(body.hostname) || "Alloy Server",
    ip,
    port,
    queryPort: toPort(body.queryPort ?? body.queryport, port) || port,
    players: toNonNegativeInt(body.players, 0),
    maxPlayers: toNonNegativeInt(body.maxPlayers ?? body.maxplayers, 0),
    map: cleanString(body.map),
    tags,
    secure: Boolean(body.secure),
    encryption: toNonNegativeInt(body.encryption, 1),
    verification: normalizeVerification(body.verification),
    requiredMods: normalizeMods(body.requiredMods, true),
    optionalMods: normalizeMods(body.optionalMods, false),
    lastHeartbeat: Math.floor(Date.now() / 1000),
  };
}

function normalizeVerification(value: any) {
  return {
    mode: cleanString(value?.mode) || "connection_info",
    port: toPort(value?.port, 28017) || 28017,
    required: value?.required !== false,
  };
}

function normalizeMods(value: any, required: boolean) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, MAX_MODS_PER_SERVER).map((mod) => ({
    id: cleanString(mod?.id),
    name: cleanString(mod?.name) || cleanString(mod?.id),
    version: cleanString(mod?.version),
    hash: cleanString(mod?.hash),
    required,
    packageId: cleanString(mod?.packageId),
    sourceUrl: cleanUrl(mod?.sourceUrl),
    downloadUrl: cleanUrl(mod?.downloadUrl),
    license: cleanString(mod?.license),
  })).filter((mod) => mod.id);
}

function cleanString(value: any) {
  return typeof value === "string" ? value.trim().slice(0, 512) : "";
}

function cleanUrl(value: any) {
  const url = cleanString(value);
  if (!url) return "";
  return /^https?:\/\//i.test(url) ? url : "";
}

function uniqueStrings(values: any[]) {
  return Array.from(new Set(values.map(cleanString).filter(Boolean))).slice(0, 32);
}

function splitTags(value: any) {
  return typeof value === "string" ? value.split(/[,\s]+/) : [];
}

function toPort(value: any, fallback: number) {
  const n = Number(value ?? fallback);
  if (!Number.isInteger(n) || n <= 0 || n > 65535) return 0;
  return n;
}

function toPositiveInt(value: any, fallback: number) {
  const n = Number(value ?? fallback);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

function toNonNegativeInt(value: any, fallback: number) {
  const n = Number(value ?? fallback);
  return Number.isInteger(n) && n >= 0 ? n : fallback;
}
