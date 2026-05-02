import { NextRequest, NextResponse } from 'next/server';
import {
  clearSyncRoom,
  createSyncRoom,
  getSyncRoomPayload,
  saveSyncRoomPayload,
} from '@/lib/sync-room-store';
import { validateSyncSnapshot } from '@/lib/sync';

interface RouteContext {
  params: Promise<{ token: string }>;
}

export async function PUT(_request: NextRequest, context: RouteContext) {
  const { token } = await context.params;
  createSyncRoom(token);
  return NextResponse.json({ status: 'waiting' });
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { token } = await context.params;
  const payload = getSyncRoomPayload(token);

  if (payload === undefined) {
    return NextResponse.json({ status: 'missing' }, { status: 404 });
  }

  if (!payload) {
    return NextResponse.json({ status: 'waiting' });
  }

  return NextResponse.json({
    status: 'received',
    receivedAt: payload.receivedAt,
    snapshot: payload.snapshot,
  });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { token } = await context.params;
  const snapshot = validateSyncSnapshot(await request.json());

  if (!snapshot) {
    return NextResponse.json({ error: 'Invalid LiftDay sync data' }, { status: 400 });
  }

  if (!saveSyncRoomPayload(token, snapshot)) {
    return NextResponse.json({ error: 'Sync session expired' }, { status: 404 });
  }

  return NextResponse.json({ status: 'received' });
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { token } = await context.params;
  clearSyncRoom(token);
  return NextResponse.json({ status: 'cleared' });
}
