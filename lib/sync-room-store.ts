import { SyncSnapshot } from './sync';

export interface SyncRoomPayload {
  snapshot: SyncSnapshot;
  receivedAt: string;
}

const ROOM_TTL_MS = 5 * 60 * 1000;

type RoomEntry = {
  createdAt: number;
  payload: SyncRoomPayload | null;
};

const globalRooms = globalThis as typeof globalThis & {
  __liftdaySyncRooms?: Map<string, RoomEntry>;
};

const rooms = globalRooms.__liftdaySyncRooms ?? new Map<string, RoomEntry>();
globalRooms.__liftdaySyncRooms = rooms;

export function createSyncRoom(token: string): void {
  cleanupExpiredRooms();
  rooms.set(token, {
    createdAt: Date.now(),
    payload: null,
  });
}

export function saveSyncRoomPayload(token: string, snapshot: SyncSnapshot): boolean {
  cleanupExpiredRooms();
  const room = rooms.get(token);
  if (!room) return false;
  room.payload = {
    snapshot,
    receivedAt: new Date().toISOString(),
  };
  return true;
}

export function getSyncRoomPayload(token: string): SyncRoomPayload | null | undefined {
  cleanupExpiredRooms();
  return rooms.get(token)?.payload;
}

export function clearSyncRoom(token: string): void {
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
