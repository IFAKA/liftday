import { SyncSnapshot, validateSyncSnapshot } from './sync';

export const WEBRTC_OFFER_TYPE = 'liftday-webrtc-offer-v1';
export const WEBRTC_ANSWER_TYPE = 'liftday-webrtc-answer-v1';

const WEBRTC_PAYLOAD_MAX_AGE_MS = 10 * 60 * 1000;
const ICE_GATHERING_TIMEOUT_MS = 8000;
const STUN_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:global.stun.twilio.com:3478' },
];

type PairingType = typeof WEBRTC_OFFER_TYPE | typeof WEBRTC_ANSWER_TYPE;

export interface WebRtcPairingPayload {
  app: 'liftday';
  type: PairingType;
  sessionId: string;
  createdAt: string;
  sdp: string;
  compressed: boolean;
}

export interface LaptopOfferSession {
  peer: RTCPeerConnection;
  channel: RTCDataChannel;
  sessionId: string;
  offerPayload: WebRtcPairingPayload;
}

export interface PhoneAnswerSession {
  peer: RTCPeerConnection;
  channelReady: Promise<RTCDataChannel>;
  sessionId: string;
  answerPayload: WebRtcPairingPayload;
}

export type SyncChannelMessage =
  | { type: 'snapshot'; sessionId: string; snapshot: SyncSnapshot }
  | { type: 'imported'; sessionId: string; importedSessions: number }
  | { type: 'error'; sessionId?: string; message: string };

export function createSessionId(): string {
  return crypto.randomUUID();
}

export async function encodePairingPayload(
  type: PairingType,
  sessionId: string,
  description: RTCSessionDescriptionInit,
  now = new Date()
): Promise<string> {
  if (!description.sdp || description.type !== getDescriptionType(type)) {
    throw new Error('Invalid WebRTC session description.');
  }

  const compressed = await encodeSdp(description.sdp);
  const payload: WebRtcPairingPayload = {
    app: 'liftday',
    type,
    sessionId,
    createdAt: now.toISOString(),
    sdp: compressed.value,
    compressed: compressed.compressed,
  };

  return JSON.stringify(payload);
}

export async function decodePairingPayload(
  raw: string,
  expectedType: PairingType,
  options: { expectedSessionId?: string; now?: Date } = {}
): Promise<RTCSessionDescriptionInit & { sessionId: string; createdAt: string }> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Pairing code is not valid JSON.');
  }

  if (!isPairingPayload(parsed)) {
    throw new Error('Pairing code is not a LiftDay WebRTC payload.');
  }
  if (parsed.type !== expectedType) {
    throw new Error('Pairing code is for the wrong sync step.');
  }
  if (options.expectedSessionId && parsed.sessionId !== options.expectedSessionId) {
    throw new Error('Pairing code is for a different sync session.');
  }

  const createdAtMs = Date.parse(parsed.createdAt);
  if (Number.isNaN(createdAtMs)) {
    throw new Error('Pairing code has an invalid timestamp.');
  }

  const ageMs = (options.now ?? new Date()).getTime() - createdAtMs;
  if (ageMs < -60_000 || ageMs > WEBRTC_PAYLOAD_MAX_AGE_MS) {
    throw new Error('Pairing code expired. Create a new QR.');
  }

  const sdp = await decodeSdp(parsed.sdp, parsed.compressed);
  if (!looksLikeSdp(sdp)) {
    throw new Error('Pairing code has malformed WebRTC data.');
  }

  return {
    type: getDescriptionType(expectedType),
    sdp,
    sessionId: parsed.sessionId,
    createdAt: parsed.createdAt,
  };
}

export async function createLaptopOffer(): Promise<LaptopOfferSession> {
  const peer = createPeerConnection();
  const channel = peer.createDataChannel('liftday-sync', { ordered: true });
  const sessionId = createSessionId();

  peer.createDataChannel('ice-keepalive').close();
  await peer.setLocalDescription(await peer.createOffer());
  await waitForIceGathering(peer);

  if (!peer.localDescription) {
    throw new Error('Could not create a WebRTC offer.');
  }

  return {
    peer,
    channel,
    sessionId,
    offerPayload: JSON.parse(await encodePairingPayload(WEBRTC_OFFER_TYPE, sessionId, peer.localDescription)) as WebRtcPairingPayload,
  };
}

export async function acceptPhoneAnswer(
  peer: RTCPeerConnection,
  sessionId: string,
  rawAnswerPayload: string
): Promise<void> {
  const answer = await decodePairingPayload(rawAnswerPayload, WEBRTC_ANSWER_TYPE, { expectedSessionId: sessionId });
  if (peer.signalingState === 'stable' && peer.remoteDescription?.type === 'answer') {
    return;
  }
  if (peer.signalingState !== 'have-local-offer') {
    throw new Error('This answer is no longer active. Create a new laptop QR and scan it again.');
  }
  await peer.setRemoteDescription(answer);
}

export async function acceptLaptopOffer(rawOfferPayload: string): Promise<PhoneAnswerSession> {
  const offer = await decodePairingPayload(rawOfferPayload, WEBRTC_OFFER_TYPE);
  const peer = createPeerConnection();
  const channelReady = new Promise<RTCDataChannel>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error('Timed out waiting for the sync channel.')), WEBRTC_PAYLOAD_MAX_AGE_MS);
    peer.ondatachannel = (event) => {
      window.clearTimeout(timer);
      resolve(event.channel);
    };
  });

  await peer.setRemoteDescription(offer);
  await peer.setLocalDescription(await peer.createAnswer());
  await waitForIceGathering(peer);

  if (!peer.localDescription) {
    throw new Error('Could not create a WebRTC answer.');
  }

  return {
    peer,
    channelReady,
    sessionId: offer.sessionId,
    answerPayload: JSON.parse(await encodePairingPayload(WEBRTC_ANSWER_TYPE, offer.sessionId, peer.localDescription)) as WebRtcPairingPayload,
  };
}

export async function sendSnapshotWhenOpen(
  channel: RTCDataChannel,
  sessionId: string,
  snapshot: SyncSnapshot
): Promise<void> {
  await waitForChannelOpen(channel);
  channel.send(JSON.stringify({ type: 'snapshot', sessionId, snapshot } satisfies SyncChannelMessage));
}

export function parseSyncChannelMessage(raw: string, expectedSessionId: string): SyncChannelMessage {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Sync message is not valid JSON.');
  }

  if (!isRecord(parsed) || typeof parsed.type !== 'string') {
    throw new Error('Sync message is malformed.');
  }

  if (parsed.type === 'snapshot') {
    if (parsed.sessionId !== expectedSessionId) throw new Error('Sync message is for a different session.');
    const snapshot = validateSyncSnapshot(parsed.snapshot);
    if (!snapshot) throw new Error('Sync message does not include a valid LiftDay backup.');
    return { type: 'snapshot', sessionId: expectedSessionId, snapshot };
  }

  if (parsed.type === 'imported') {
    if (parsed.sessionId !== expectedSessionId) throw new Error('Sync message is for a different session.');
    if (typeof parsed.importedSessions !== 'number') throw new Error('Sync import acknowledgement is malformed.');
    return { type: 'imported', sessionId: expectedSessionId, importedSessions: parsed.importedSessions };
  }

  if (parsed.type === 'error') {
    return {
      type: 'error',
      sessionId: typeof parsed.sessionId === 'string' ? parsed.sessionId : undefined,
      message: typeof parsed.message === 'string' ? parsed.message : 'Sync failed.',
    };
  }

  throw new Error('Unknown sync message.');
}

export function sendImportAcknowledgement(channel: RTCDataChannel, sessionId: string, importedSessions: number): void {
  channel.send(JSON.stringify({ type: 'imported', sessionId, importedSessions } satisfies SyncChannelMessage));
}

export function sendSyncError(channel: RTCDataChannel, message: string, sessionId?: string): void {
  channel.send(JSON.stringify({ type: 'error', sessionId, message } satisfies SyncChannelMessage));
}

function createPeerConnection(): RTCPeerConnection {
  return new RTCPeerConnection({ iceServers: STUN_SERVERS });
}

function waitForIceGathering(peer: RTCPeerConnection): Promise<void> {
  if (peer.iceGatheringState === 'complete') return Promise.resolve();

  return new Promise((resolve) => {
    const timer = window.setTimeout(done, ICE_GATHERING_TIMEOUT_MS);
    function done() {
      window.clearTimeout(timer);
      peer.removeEventListener('icegatheringstatechange', onChange);
      resolve();
    }
    function onChange() {
      if (peer.iceGatheringState === 'complete') done();
    }
    peer.addEventListener('icegatheringstatechange', onChange);
  });
}

function waitForChannelOpen(channel: RTCDataChannel): Promise<void> {
  if (channel.readyState === 'open') return Promise.resolve();
  if (channel.readyState === 'closing' || channel.readyState === 'closed') {
    return Promise.reject(new Error('Sync channel closed before transfer.'));
  }

  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error('Timed out waiting for direct connection.')), 20_000);
    channel.addEventListener('open', () => {
      window.clearTimeout(timer);
      resolve();
    }, { once: true });
    channel.addEventListener('close', () => {
      window.clearTimeout(timer);
      reject(new Error('Sync channel closed before transfer.'));
    }, { once: true });
    channel.addEventListener('error', () => {
      window.clearTimeout(timer);
      reject(new Error('Sync channel failed.'));
    }, { once: true });
  });
}

async function encodeSdp(sdp: string): Promise<{ value: string; compressed: boolean }> {
  if ('CompressionStream' in globalThis) {
    try {
      const stream = new Blob([sdp])
        .stream()
        .pipeThrough(new CompressionStream('gzip'));
      return { value: base64UrlEncode(await new Response(stream).arrayBuffer()), compressed: true };
    } catch {
      return { value: base64UrlEncode(new TextEncoder().encode(sdp)), compressed: false };
    }
  }

  return { value: base64UrlEncode(new TextEncoder().encode(sdp)), compressed: false };
}

async function decodeSdp(encoded: string, compressed: boolean): Promise<string> {
  const bytes = base64UrlDecode(encoded);
  if (!compressed) return new TextDecoder().decode(bytes);

  if (!('DecompressionStream' in globalThis)) {
    throw new Error('This browser cannot read compressed pairing codes.');
  }

  const stream = new Blob([bytes.buffer as ArrayBuffer])
    .stream()
    .pipeThrough(new DecompressionStream('gzip'));
  return new Response(stream).text();
}

function base64UrlEncode(value: ArrayBuffer | Uint8Array): string {
  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new Error('Pairing code has invalid WebRTC data.');
  }
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function getDescriptionType(type: PairingType): RTCSdpType {
  return type === WEBRTC_OFFER_TYPE ? 'offer' : 'answer';
}

function looksLikeSdp(sdp: string): boolean {
  return sdp.startsWith('v=0') && /\r?\na=/.test(sdp);
}

function isPairingPayload(value: unknown): value is WebRtcPairingPayload {
  return (
    isRecord(value) &&
    value.app === 'liftday' &&
    (value.type === WEBRTC_OFFER_TYPE || value.type === WEBRTC_ANSWER_TYPE) &&
    typeof value.sessionId === 'string' &&
    value.sessionId.length > 0 &&
    typeof value.createdAt === 'string' &&
    typeof value.sdp === 'string' &&
    typeof value.compressed === 'boolean'
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
