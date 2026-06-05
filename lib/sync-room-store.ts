import type { SyncSnapshot } from './sync';

export interface SyncRoomPayload {
  snapshot: SyncSnapshot;
  receivedAt: string;
}

const ROOM_TTL_MS = 5 * 60 * 1000;
const ROOM_TTL_SECONDS = ROOM_TTL_MS / 1000;
const ROOM_KEY_PREFIX = 'liftday:sync-room:';

type RoomEntry = {
  createdAt: number;
  payload: SyncRoomPayload | null;
};

const globalRooms = globalThis as typeof globalThis & {
  __liftdaySyncRooms?: Map<string, RoomEntry>;
};

const rooms = globalRooms.__liftdaySyncRooms ?? new Map<string, RoomEntry>();
globalRooms.__liftdaySyncRooms = rooms;

export async function createSyncRoom(token: string): Promise<void> {
  const redis = getRedisConfig();
  if (redis) {
    await redisCommand(redis, ['SET', getRoomKey(token), JSON.stringify({
      createdAt: Date.now(),
      payload: null,
    } satisfies RoomEntry), 'EX', String(ROOM_TTL_SECONDS)]);
    return;
  }

  cleanupExpiredRooms();
  rooms.set(token, {
    createdAt: Date.now(),
    payload: null,
  });
}

export async function saveSyncRoomPayload(token: string, snapshot: SyncSnapshot): Promise<boolean> {
  const redis = getRedisConfig();
  if (redis) {
    const existing = await readRedisRoom(redis, token);
    if (!existing) return false;

    await redisCommand(redis, ['SET', getRoomKey(token), JSON.stringify({
      createdAt: existing.createdAt,
      payload: {
        snapshot,
        receivedAt: new Date().toISOString(),
      },
    } satisfies RoomEntry), 'EX', String(ROOM_TTL_SECONDS)]);
    return true;
  }

  cleanupExpiredRooms();
  const room = rooms.get(token);
  if (!room) return false;
  room.payload = {
    snapshot,
    receivedAt: new Date().toISOString(),
  };
  return true;
}

export async function getSyncRoomPayload(token: string): Promise<SyncRoomPayload | null | undefined> {
  const redis = getRedisConfig();
  if (redis) {
    return (await readRedisRoom(redis, token))?.payload;
  }

  cleanupExpiredRooms();
  return rooms.get(token)?.payload;
}

export async function clearSyncRoom(token: string): Promise<void> {
  const redis = getRedisConfig();
  if (redis) {
    await redisCommand(redis, ['DEL', getRoomKey(token)]);
    return;
  }

  rooms.delete(token);
}

function cleanupExpiredRooms(): void {
  const now = Date.now();
  for (const [token, room] of rooms.entries()) {
    if (now - room.createdAt > ROOM_TTL_MS) {
      rooms.delete(token);
    }
  }
}

interface RedisConfig {
  token: string;
  url: string;
}

interface RedisResponse {
  result?: unknown;
  error?: string;
}

function getRedisConfig(): RedisConfig | null {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;

  return url && token ? { url, token } : null;
}

function getRoomKey(token: string): string {
  return `${ROOM_KEY_PREFIX}${token}`;
}

async function readRedisRoom(redis: RedisConfig, token: string): Promise<RoomEntry | null> {
  const result = await redisCommand(redis, ['GET', getRoomKey(token)]);
  if (typeof result !== 'string') return null;

  try {
    const parsed = JSON.parse(result) as unknown;
    return isRoomEntry(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function redisCommand(redis: RedisConfig, command: string[]): Promise<unknown> {
  const response = await fetch(redis.url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${redis.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Sync room store failed with status ${response.status}.`);
  }

  const payload = await response.json() as RedisResponse;
  if (payload.error) {
    throw new Error(payload.error);
  }
  return payload.result;
}

function isRoomEntry(value: unknown): value is RoomEntry {
  if (!isRecord(value)) return false;
  return (
    typeof value.createdAt === 'number' &&
    (value.payload === null || isSyncRoomPayload(value.payload))
  );
}

function isSyncRoomPayload(value: unknown): value is SyncRoomPayload {
  if (!isRecord(value)) return false;
  return isRecord(value.snapshot) && typeof value.receivedAt === 'string';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
