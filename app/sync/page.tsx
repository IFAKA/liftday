'use client';

import { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import QRCode from 'qrcode';
import {
  Check,
  Copy,
  Download,
  FileUp,
  LoaderCircle,
  QrCode,
  RotateCcw,
  ScanLine,
  Send,
  Share,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TopBar } from '@/components/TopBar';
import {
  WatchBackButton,
  WatchAlertPanel,
  WatchDetailsPanel,
  WatchPanel,
  WatchScreen,
  WatchSegmentedControl,
} from '@/components/WatchSurface';
import { StatusPill, SyncMetricGrid } from '@/components/sync/SyncMetrics';
import { copyText } from '@/lib/clipboard';
import {
  createSyncSnapshot,
  getLocalSyncSummary,
  importPhoneSnapshot,
  parseSyncSnapshot,
  SyncSnapshot,
} from '@/lib/sync';
import {
  acceptLaptopOffer,
  acceptPhoneAnswer,
  createLaptopOffer,
  parseSyncChannelMessage,
  sendImportAcknowledgement,
  sendSnapshotWhenOpen,
  sendSyncError,
} from '@/lib/sync-webrtc';

type SyncMode = 'laptop' | 'phone';
type TransferState = 'idle' | 'waiting' | 'sending' | 'done' | 'error';

interface BarcodeDetectorShape {
  detect(source: CanvasImageSource): Promise<Array<{ rawValue: string }>>;
}

interface BarcodeDetectorConstructor {
  new (options?: { formats?: string[] }): BarcodeDetectorShape;
}

export default function SyncPage() {
  const [mode, setMode] = useState<SyncMode>(() => getInitialSyncMode());

  return (
    <WatchScreen
      top={(
        <TopBar
          leftAction={<WatchBackButton fallbackHref="/settings" />}
          center={<span className="text-fluid-ui font-black uppercase tracking-tight">Sync</span>}
        />
      )}
    >
      <section className="px-1 pb-4 text-center">
        <p className="text-fluid-ui font-black leading-none tracking-tight text-white">
          {mode === 'laptop' ? 'Receive from phone' : 'Send to laptop'}
        </p>
        <p className="mt-2 text-fluid-label leading-snug text-white/40">
          {mode === 'laptop' ? 'Show this QR, then scan the phone answer.' : 'Scan the laptop QR, then show your answer QR.'}
        </p>
      </section>

      <WatchDetailsPanel summary="Direction" className="mb-4">
        <SyncModeSelector mode={mode} onModeChange={setMode} />
      </WatchDetailsPanel>

      {mode === 'laptop' ? <LaptopSyncPanel /> : <PhoneSyncPanel />}
    </WatchScreen>
  );
}

function SyncModeSelector({ mode, onModeChange }: { mode: SyncMode; onModeChange: (mode: SyncMode) => void }) {
  return (
    <WatchSegmentedControl
      value={mode}
      options={[
        { value: 'laptop', label: 'Receive' },
        { value: 'phone', label: 'Send' },
      ]}
      onChange={onModeChange}
      ariaLabel="Sync direction"
    />
  );
}

function LaptopSyncPanel() {
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RTCDataChannel | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const [offerText, setOfferText] = useState('');
  const [answerText, setAnswerText] = useState('');
  const [qrSrc, setQrSrc] = useState('');
  const [qrError, setQrError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [state, setState] = useState<TransferState>('idle');
  const [message, setMessage] = useState('Creating a direct pairing code.');
  const [summary, setSummary] = useState(() => getLocalSyncSummary());
  const [copiedOffer, setCopiedOffer] = useState(false);

  const closeSession = useCallback(() => {
    channelRef.current?.close();
    peerRef.current?.close();
    channelRef.current = null;
    peerRef.current = null;
    sessionIdRef.current = null;
  }, []);

  const handleLaptopChannelMessage = useCallback((raw: string) => {
    const channel = channelRef.current;
    const sessionId = sessionIdRef.current;
    if (!channel || !sessionId) return;

    try {
      const payload = parseSyncChannelMessage(raw, sessionId);
      if (payload.type === 'snapshot') {
        const result = importPhoneSnapshot(payload.snapshot);
        sendImportAcknowledgement(channel, sessionId, result.importedSessions);
        setSummary(getLocalSyncSummary());
        setState('done');
        setMessage(`Restored ${result.importedSessions} sessions. Phone unchanged.`);
      } else if (payload.type === 'error') {
        setState('error');
        setMessage(payload.message);
      }
    } catch (error) {
      const nextMessage = error instanceof Error ? error.message : 'Import failed.';
      sendSyncError(channel, nextMessage, sessionId);
      setState('error');
      setMessage(nextMessage);
    }
  }, []);

  const startOffer = useCallback(async () => {
    closeSession();
    setState('waiting');
    setMessage('Creating direct WebRTC offer.');
    setQrSrc('');
    setQrError(null);
    setAnswerText('');

    try {
      const session = await createLaptopOffer();
      const encodedOffer = JSON.stringify(session.offerPayload);
      peerRef.current = session.peer;
      channelRef.current = session.channel;
      sessionIdRef.current = session.sessionId;
      setOfferText(encodedOffer);
      setMessage('Phone scans this QR. Then scan or paste the phone answer below.');

      session.channel.onmessage = (event) => {
        handleLaptopChannelMessage(String(event.data));
      };
      session.channel.onerror = () => {
        setState('error');
        setMessage('Direct connection failed. Try a new QR or use file import.');
      };

      await renderQr(encodedOffer, setQrSrc, setQrError);
    } catch {
      setState('error');
      setMessage('This browser could not create a direct sync session. Use file import instead.');
    }
  }, [closeSession, handleLaptopChannelMessage]);

  useEffect(() => {
    queueMicrotask(() => {
      void startOffer();
    });
    return closeSession;
  }, [closeSession, startOffer]);

  async function acceptAnswer(rawAnswer = answerText) {
    const peer = peerRef.current;
    const sessionId = sessionIdRef.current;
    if (!peer || !sessionId || !rawAnswer.trim()) return;

    try {
      setState('waiting');
      setMessage('Completing direct connection.');
      await acceptPhoneAnswer(peer, sessionId, rawAnswer.trim());
      setMessage('Connected. Waiting for phone backup.');
    } catch (error) {
      setState('error');
      setMessage(error instanceof Error ? error.message : 'Could not read the phone answer.');
    }
  }

  async function copyOffer() {
    if (!offerText) return;
    await copyText(offerText);
    setCopiedOffer(true);
    window.setTimeout(() => setCopiedOffer(false), 1600);
  }

  return (
    <section>
      <WatchPanel className="rounded-[28px] p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-black uppercase tracking-widest text-white/35">Receive</p>
            <p className="mt-1 text-xl font-black tracking-tight text-white">Direct pair</p>
          </div>
          <StatusPill state={state} />
        </div>

        <PairingQr qrSrc={qrSrc} qrError={qrError} alt="LiftDay WebRTC offer QR code" />
        <p className="mx-auto mt-5 max-w-xs text-center text-sm leading-relaxed text-white/55">{message}</p>

        <Button
          type="button"
          onClick={startOffer}
          variant="secondary"
          className="mt-5 h-12 w-full rounded-2xl border border-white/10 bg-white/10 text-white hover:bg-white/15 active:scale-[0.98]"
        >
          <RotateCcw />
          New QR
        </Button>
      </WatchPanel>

      <WatchDetailsPanel summary="Phone answer" className="mt-4">
        <ScannerBox
          scanning={scanning}
          setScanning={setScanning}
          idleMessage="Scan the QR shown on the phone."
          onDetected={(raw) => {
            setScanning(false);
            setAnswerText(raw);
            void acceptAnswer(raw);
          }}
        />
        <ManualPairingText
          label="Paste phone answer"
          value={answerText}
          onChange={setAnswerText}
          onSubmit={() => void acceptAnswer()}
          submitLabel="Use answer"
        />
        <ManualPairingText
          label="Laptop offer"
          value={offerText}
          readOnly
          onCopy={copyOffer}
          copied={copiedOffer}
        />
      </WatchDetailsPanel>

      <WatchDetailsPanel summary="Files" className="mt-4">
        <SyncMetricGrid summary={summary} />
        <p className="mt-3 text-xs leading-relaxed text-white/45">
          Direct sync uses WebRTC with public STUN discovery and no LiftDay backend. If QR, camera, or network pairing fails, use backup files.
        </p>
        <DesktopExportFallback compact />
        <ManualImportFallback onImported={() => {
          setSummary(getLocalSyncSummary());
          setState('done');
          setMessage('Manual import complete. Phone unchanged.');
        }} compact />
      </WatchDetailsPanel>
    </section>
  );
}

function PhoneSyncPanel() {
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RTCDataChannel | null>(null);
  const [offerText, setOfferText] = useState('');
  const [answerText, setAnswerText] = useState('');
  const [answerQrSrc, setAnswerQrSrc] = useState('');
  const [qrError, setQrError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [state, setState] = useState<TransferState>('idle');
  const [message, setMessage] = useState(() => hasWebRtcSupport()
    ? 'Scan the laptop QR.'
    : 'This browser cannot use direct WebRTC sync. Save a backup file instead.'
  );
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      channelRef.current?.close();
      peerRef.current?.close();
    };
  }, []);

  async function acceptOffer(rawOffer = offerText) {
    if (!rawOffer.trim()) return;

    try {
      const snapshot = createSyncSnapshot('phone');
      if (!hasSnapshotData(snapshot)) {
        setState('error');
        setMessage('No phone data was found here. Open Sync from the phone app that has your data, then use Save backup file.');
        return;
      }

      setState('waiting');
      setMessage('Creating phone answer QR.');
      const session = await acceptLaptopOffer(rawOffer.trim());
      const encodedAnswer = JSON.stringify(session.answerPayload);
      peerRef.current?.close();
      peerRef.current = session.peer;
      setSessionId(session.sessionId);
      setAnswerText(encodedAnswer);
      await renderQr(encodedAnswer, setAnswerQrSrc, setQrError);
      setMessage('Show this QR to the laptop. Sending starts after the laptop scans it.');

      const channel = await session.channelReady;
      channelRef.current = channel;
      channel.onmessage = (event) => handlePhoneChannelMessage(String(event.data), session.sessionId);
      channel.onerror = () => {
        setState('error');
        setMessage('Direct connection failed. Use Save backup file instead.');
      };

      setState('sending');
      setMessage('Connected. Sending backup to laptop.');
      await sendSnapshotWhenOpen(channel, session.sessionId, snapshot);
    } catch (error) {
      setState('error');
      setMessage(error instanceof Error ? error.message : 'Could not read the laptop QR.');
    }
  }

  function handlePhoneChannelMessage(raw: string, expectedSessionId: string) {
    try {
      const payload = parseSyncChannelMessage(raw, expectedSessionId);
      if (payload.type === 'imported') {
        setState('done');
        setMessage(`Sent. Laptop restored ${payload.importedSessions} sessions.`);
      } else if (payload.type === 'error') {
        setState('error');
        setMessage(payload.message);
      }
    } catch (error) {
      setState('error');
      setMessage(error instanceof Error ? error.message : 'Laptop acknowledgement was invalid.');
    }
  }

  return (
    <section>
      <WatchPanel className="rounded-[28px] p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-black uppercase tracking-widest text-white/35">Send</p>
            <p className="mt-1 text-xl font-black tracking-tight text-white">Laptop QR</p>
          </div>
          <StatusPill state={state} />
        </div>

        {answerQrSrc ? (
          <PairingQr qrSrc={answerQrSrc} qrError={qrError} alt="LiftDay WebRTC answer QR code" />
        ) : (
          <ScannerBox
            scanning={scanning}
            setScanning={setScanning}
            idleMessage="Point your phone at the laptop QR."
            onDetected={(raw) => {
              setScanning(false);
              setOfferText(raw);
              void acceptOffer(raw);
            }}
          />
        )}

        <p className="mx-auto mt-5 max-w-xs text-center text-sm leading-relaxed text-white/55">{message}</p>

        {answerQrSrc && (
          <Button
            type="button"
            onClick={() => {
              setAnswerQrSrc('');
              setAnswerText('');
              setSessionId(null);
              setState('idle');
              setMessage('Scan the laptop QR.');
            }}
            variant="secondary"
            className="mt-5 h-12 w-full rounded-2xl border border-white/10 bg-white/10 text-white hover:bg-white/15 active:scale-[0.98]"
          >
            <RotateCcw />
            Scan again
          </Button>
        )}
      </WatchPanel>

      <WatchDetailsPanel summary="Manual pairing" className="mt-4">
        <ManualPairingText
          label="Paste laptop offer"
          value={offerText}
          onChange={setOfferText}
          onSubmit={() => void acceptOffer()}
          submitLabel="Create answer"
        />
        <ManualPairingText
          label="Phone answer"
          value={answerText}
          readOnly
          sessionId={sessionId}
        />
      </WatchDetailsPanel>

      <WatchDetailsPanel summary="Files" className="mt-4">
        <PhoneExportFallback compact />
      </WatchDetailsPanel>
    </section>
  );
}

function ScannerBox({
  scanning,
  setScanning,
  idleMessage,
  onDetected,
}: {
  scanning: boolean;
  setScanning: (scanning: boolean) => void;
  idleMessage: string;
  onDetected: (raw: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [message, setMessage] = useState(() => {
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      return 'Camera needs HTTPS. Paste the pairing text instead.';
    }
    return idleMessage;
  });

  useEffect(() => {
    if (!scanning) return;

    let stopped = false;
    let frame = 0;

    async function startScanner() {
      if (!window.isSecureContext) {
        setMessage('Camera needs HTTPS. Paste the pairing text instead.');
        setScanning(false);
        return;
      }

      const Detector = getBarcodeDetector();
      if (!Detector) {
        setMessage('Camera scanning is not available here. Paste the pairing text instead.');
        setScanning(false);
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        const detector = new Detector({ formats: ['qr_code'] });

        const scan = async () => {
          if (stopped || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            const rawValue = codes[0]?.rawValue;
            if (rawValue) {
              onDetected(rawValue);
              return;
            }
          } catch {
            setMessage('Still looking for the QR.');
          }
          frame = window.requestAnimationFrame(scan);
        };

        scan();
      } catch {
        setMessage('Camera permission was blocked. Paste the pairing text instead.');
        setScanning(false);
      }
    }

    startScanner();

    return () => {
      stopped = true;
      window.cancelAnimationFrame(frame);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [onDetected, scanning, setScanning]);

  return (
    <>
      <div className="mt-5 overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.03]">
        {scanning ? (
          <video ref={videoRef} muted playsInline className="aspect-square w-full object-cover" />
        ) : (
          <div className="grid aspect-square place-items-center">
            <QrCode className="size-16 text-white/20" />
          </div>
        )}
      </div>

      <p className="mt-4 text-center text-sm leading-relaxed text-white/55">{message}</p>

      <Button
        type="button"
        onClick={() => setScanning(true)}
        disabled={typeof window !== 'undefined' && !window.isSecureContext}
        className="mt-5 h-14 w-full rounded-2xl bg-white text-base font-black text-black hover:bg-white/90 active:scale-[0.98]"
      >
        <ScanLine />
        Scan QR
      </Button>
    </>
  );
}

function PairingQr({ qrSrc, qrError, alt }: { qrSrc: string; qrError: string | null; alt: string }) {
  return (
    <div className="mt-4 flex justify-center">
      <div className="grid aspect-square w-full max-w-64 place-items-center rounded-[24px] bg-white p-4 shadow-[0_18px_60px_rgba(255,255,255,0.08)]">
        {qrSrc ? (
          <Image
            src={qrSrc}
            alt={alt}
            width={288}
            height={288}
            unoptimized
            className="size-full rounded-xl"
          />
        ) : qrError ? (
          <X className="size-8 text-black/40" />
        ) : (
          <LoaderCircle className="size-8 animate-spin text-black/40" />
        )}
      </div>
    </div>
  );
}

function ManualPairingText({
  label,
  value,
  onChange,
  onSubmit,
  submitLabel,
  readOnly = false,
  onCopy,
  copied = false,
  sessionId,
}: {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  onSubmit?: () => void;
  submitLabel?: string;
  readOnly?: boolean;
  onCopy?: () => void;
  copied?: boolean;
  sessionId?: string | null;
}) {
  return (
    <div className="mt-3 rounded-2xl border border-white/10 bg-black/25 p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-black uppercase tracking-widest text-white/35">{label}</p>
        {sessionId && <p className="text-[10px] font-bold uppercase text-white/30">{sessionId.slice(0, 8)}</p>}
      </div>
      <textarea
        value={value}
        readOnly={readOnly}
        onChange={(event) => onChange?.(event.target.value)}
        rows={4}
        className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-black/40 p-3 text-xs leading-relaxed text-white/75 outline-none focus:border-white/30"
        placeholder={readOnly ? 'Waiting for pairing code.' : 'Paste pairing text.'}
      />
      {onSubmit && (
        <Button
          type="button"
          onClick={onSubmit}
          disabled={!value.trim()}
          className="mt-2 h-11 w-full rounded-xl bg-white text-black hover:bg-white/90 active:scale-[0.98]"
        >
          <Send />
          {submitLabel ?? 'Continue'}
        </Button>
      )}
      {(onCopy || readOnly) && value.trim() && (
        <Button
          type="button"
          onClick={onCopy ?? (() => void copyText(value))}
          variant="secondary"
          className="mt-2 h-10 w-full rounded-xl border border-white/10 bg-white/10 text-white hover:bg-white/15 active:scale-[0.98]"
        >
          {copied ? <Check /> : <Copy />}
          {copied ? 'Copied' : 'Copy'}
        </Button>
      )}
    </div>
  );
}

function ManualImportFallback({ onImported, compact = false }: { onImported: () => void; compact?: boolean }) {
  const [rawImport, setRawImport] = useState('');
  const [importError, setImportError] = useState<string | null>(null);

  async function readImportFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setRawImport(await file.text());
    setImportError(null);
  }

  function importData() {
    try {
      const snapshot = parseSyncSnapshot(rawImport);
      importPhoneSnapshot(snapshot);
      onImported();
      setRawImport('');
      setImportError(null);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Import failed.');
    }
  }

  return (
    <details className={compact ? 'mt-3' : 'mt-4 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3'}>
      <summary className="cursor-pointer text-xs font-black uppercase tracking-widest text-white/35">
        Import from file
      </summary>
      <label className="mt-3 flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-black text-black active:scale-[0.98]">
        <FileUp className="size-4" />
        Choose phone file
        <input type="file" accept="application/json,.json" onChange={readImportFile} className="sr-only" />
      </label>
      <Button
        type="button"
        onClick={importData}
        disabled={!rawImport.trim()}
        className="mt-2 h-11 w-full rounded-xl bg-emerald-300 text-black hover:bg-emerald-200 active:scale-[0.98]"
      >
        <Check />
        Import
      </Button>
      {importError && (
        <WatchAlertPanel tone="danger" className="mt-2">
          {importError}
        </WatchAlertPanel>
      )}
    </details>
  );
}

function PhoneExportFallback({ compact = false }: { compact?: boolean }) {
  return <BackupExportFallback source="phone" compact={compact} />;
}

function DesktopExportFallback({ compact = false }: { compact?: boolean }) {
  return <BackupExportFallback source="laptop" compact={compact} />;
}

function BackupExportFallback({ source, compact = false }: { source: 'phone' | 'laptop'; compact?: boolean }) {
  const [shareSupported] = useState(() => {
    if (typeof navigator === 'undefined') return false;
    const file = createBackupFile(source);
    return Boolean(navigator.canShare?.({ files: [file] }));
  });

  function downloadExport() {
    const blob = createBackupBlob(source);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = getBackupFileName(source);
    link.click();
    URL.revokeObjectURL(url);
  }

  async function shareExport() {
    const file = createBackupFile(source);
    await navigator.share({
      title: 'LiftDay backup',
      text: 'LiftDay transfer file',
      files: [file],
    });
  }

  return (
    <div className={compact ? 'mt-3' : 'mt-4 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3'}>
      {!compact && (
        <p className="text-xs font-black uppercase tracking-widest text-white/35">
          Backup file
        </p>
      )}
      <Button
        type="button"
        onClick={downloadExport}
        variant="secondary"
        className="mt-3 h-11 w-full rounded-xl border border-white/10 bg-white/10 text-white hover:bg-white/15 active:scale-[0.98]"
      >
        <Download />
        Save backup file
      </Button>
      {shareSupported && (
        <Button
          type="button"
          onClick={shareExport}
          variant="secondary"
          className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-white/10 text-white hover:bg-white/15 active:scale-[0.98]"
        >
          <Share />
          Share backup file
        </Button>
      )}
    </div>
  );
}

async function renderQr(
  payload: string,
  setQrSrc: (src: string) => void,
  setQrError: (error: string | null) => void
) {
  try {
    const qr = await QRCode.toDataURL(payload, {
      margin: 1,
      width: 320,
      errorCorrectionLevel: 'L',
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });
    setQrSrc(qr);
    setQrError(null);
  } catch {
    setQrSrc('');
    setQrError('QR is too large. Copy and paste the pairing text.');
  }
}

function createBackupBlob(source: 'phone' | 'laptop'): Blob {
  return new Blob([JSON.stringify(createSyncSnapshot(source), null, 2)], { type: 'application/json' });
}

function createBackupFile(source: 'phone' | 'laptop'): File {
  return new File([createBackupBlob(source)], getBackupFileName(source), { type: 'application/json' });
}

function getBackupFileName(source: 'phone' | 'laptop'): string {
  return `liftday-${source}-backup-${new Date().toISOString().slice(0, 10)}.json`;
}

function getBarcodeDetector(): BarcodeDetectorConstructor | null {
  const candidate = (window as typeof window & {
    BarcodeDetector?: BarcodeDetectorConstructor;
  }).BarcodeDetector;

  return candidate ?? null;
}

function getInitialSyncMode(): SyncMode {
  if (typeof window === 'undefined') return 'laptop';
  const ua = navigator.userAgent.toLowerCase();
  const mobileUa = /android|iphone|ipad|ipod|mobile/.test(ua);
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  return mobileUa || coarsePointer ? 'phone' : 'laptop';
}

function hasWebRtcSupport(): boolean {
  return typeof window !== 'undefined' && 'RTCPeerConnection' in window;
}

function hasSnapshotData(snapshot: SyncSnapshot): boolean {
  const sessionCount = Object.keys(snapshot.schemaVersion === 1 ? snapshot.data : snapshot.sessions).length;
  const dailyLogCount = snapshot.schemaVersion === 1 ? 0 : Object.keys(snapshot.dailyLogs).length;
  const progressPhotoCount = snapshot.schemaVersion === 3 ? snapshot.progressPhotos.length : 0;

  return Boolean(
    sessionCount > 0 ||
    dailyLogCount > 0 ||
    progressPhotoCount > 0 ||
    snapshot.profile ||
    (snapshot.schemaVersion !== 1 && snapshot.activeWorkoutDraft) ||
    snapshot.firstSessionDate ||
    snapshot.mobilityDoneDate ||
    (snapshot.schemaVersion !== 1 && snapshot.onboardingCompleted)
  );
}
