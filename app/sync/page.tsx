'use client';

import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import QRCode from 'qrcode';
import {
  Check,
  Download,
  FileUp,
  LoaderCircle,
  QrCode,
  RotateCcw,
  ScanLine,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TopBar } from '@/components/TopBar';
import {
  WatchBackButton,
  WatchDetailsPanel,
  WatchMetricCell,
  WatchMetricGrid,
  WatchPanel,
  WatchSegmentedControl,
  WatchStatusPill,
} from '@/components/WatchSurface';
import {
  createSyncSnapshot,
  getLocalSyncSummary,
  importPhoneSnapshot,
  parseSyncSnapshot,
  SyncSnapshot,
} from '@/lib/sync';

type SyncMode = 'laptop' | 'phone';
type TransferState = 'idle' | 'waiting' | 'sending' | 'done' | 'error';

interface BarcodeDetectorShape {
  detect(source: CanvasImageSource): Promise<Array<{ rawValue: string }>>;
}

interface BarcodeDetectorConstructor {
  new (options?: { formats?: string[] }): BarcodeDetectorShape;
}

export default function SyncPage() {
  const [pairToken] = useState(() => {
    if (typeof window === 'undefined') return null;
    return new URLSearchParams(window.location.search).get('pair');
  });
  const [mode, setMode] = useState<SyncMode>(() => pairToken ? 'phone' : getInitialSyncMode());

  return (
    <div className="flex h-full flex-col overflow-hidden bg-black text-white">
      <TopBar
        leftAction={<WatchBackButton fallbackHref="/settings" />}
        center={<span className="text-fluid-ui font-black uppercase tracking-tight">Sync</span>}
      />

      <main className="flex-1 overflow-y-auto px-4 pb-8 pt-1 no-scrollbar">
        <section className="px-1 pb-4 text-center">
          <p className="text-fluid-ui font-black leading-none tracking-tight text-white">
            {mode === 'laptop' ? 'Receive from phone' : 'Send to laptop'}
          </p>
          <p className="mt-2 text-fluid-label leading-snug text-white/40">
            {mode === 'laptop' ? 'Scan with the phone.' : 'Scan the laptop QR.'}
          </p>
        </section>

        {!pairToken && (
          <WatchDetailsPanel summary="Direction" className="mb-4">
            <SyncModeSelector mode={mode} onModeChange={setMode} />
          </WatchDetailsPanel>
        )}

        {mode === 'laptop' ? (
          <LaptopSyncPanel />
        ) : (
          <PhoneSyncPanel pairToken={pairToken} />
        )}
      </main>
    </div>
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
  const [token, setToken] = useState(() => crypto.randomUUID());
  const [pairOrigin, setPairOrigin] = useState(() => {
    if (typeof window === 'undefined') return '';
    return window.location.origin;
  });
  const [qrSrc, setQrSrc] = useState('');
  const [state, setState] = useState<TransferState>('idle');
  const [message, setMessage] = useState('Ready to pair with your phone.');
  const [summary, setSummary] = useState(() => getLocalSyncSummary());

  const pairUrl = useMemo(() => {
    if (!pairOrigin) return '';
    return `${pairOrigin}/sync?pair=${token}`;
  }, [pairOrigin, token]);

  useEffect(() => {
    if (typeof window === 'undefined' || !isLocalHost(window.location.hostname)) return;

    let alive = true;
    async function loadNetworkOrigin() {
      try {
        const response = await fetch('/api/sync/network-origin');
        const payload = await response.json() as { origin: string | null };
        if (alive && payload.origin) setPairOrigin(payload.origin);
      } catch {
        if (alive) setMessage('Use your Mac network address if the phone cannot connect.');
      }
    }

    loadNetworkOrigin();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!pairUrl) return;
    let alive = true;

    async function setupRoom() {
      try {
        setState('waiting');
        setMessage('Waiting for phone.');
        await fetch(`/api/sync/rooms/${token}`, { method: 'PUT' });
        const qr = await QRCode.toDataURL(pairUrl, {
          margin: 1,
          width: 320,
          color: {
            dark: '#000000',
            light: '#ffffff',
          },
        });
        if (alive) setQrSrc(qr);
      } catch {
        if (!alive) return;
        setState('error');
        setMessage('Could not create a sync session. Try again.');
      }
    }

    setupRoom();
    return () => {
      alive = false;
    };
  }, [pairUrl, token]);

  useEffect(() => {
    if (state !== 'waiting') return;

    const interval = window.setInterval(async () => {
      try {
        const response = await fetch(`/api/sync/rooms/${token}`);
        if (!response.ok) return;

        const payload = await response.json() as {
          status: 'waiting' | 'received';
          snapshot?: SyncSnapshot;
        };

        if (payload.status !== 'received' || !payload.snapshot) return;

        const result = importPhoneSnapshot(payload.snapshot);
        await fetch(`/api/sync/rooms/${token}`, { method: 'DELETE' });
        setSummary(getLocalSyncSummary());
        setState('done');
        setMessage(`Restored ${result.importedSessions} sessions. Phone unchanged.`);
      } catch {
        setState('error');
        setMessage('Transfer failed. Create a new QR and try again.');
      }
    }, 1200);

    return () => window.clearInterval(interval);
  }, [state, token]);

  function resetRoom() {
    setToken(crypto.randomUUID());
    setQrSrc('');
    setState('idle');
    setMessage('Ready to pair with your phone.');
  }

  return (
    <section>
      <WatchPanel className="rounded-[28px] p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-black uppercase tracking-widest text-white/35">Receive</p>
            <p className="mt-1 text-xl font-black tracking-tight text-white">Phone scan</p>
          </div>
          <StatusPill state={state} />
        </div>

        <div className="mt-4 flex justify-center">
          <div className="grid aspect-square w-full max-w-64 place-items-center rounded-[24px] bg-white p-4 shadow-[0_18px_60px_rgba(255,255,255,0.08)]">
            {qrSrc ? (
              <Image
                src={qrSrc}
                alt="LiftDay sync QR code"
                width={288}
                height={288}
                unoptimized
                className="size-full rounded-xl"
              />
            ) : (
              <LoaderCircle className="size-8 animate-spin text-black/40" />
            )}
          </div>
        </div>

        <p className="mx-auto mt-5 max-w-xs text-center text-sm leading-relaxed text-white/55">{message}</p>

        <Button
          type="button"
          onClick={resetRoom}
          variant="secondary"
          className="mt-5 h-12 w-full rounded-2xl border border-white/10 bg-white/10 text-white hover:bg-white/15 active:scale-[0.98]"
        >
          <RotateCcw />
          New QR
        </Button>
      </WatchPanel>

      <WatchDetailsPanel summary="Details" className="mt-4">
        <SyncMetricGrid summary={summary} />
        {isLocalPairUrl(pairUrl) && (
          <p className="mt-3 text-xs leading-relaxed text-amber-200/80">
            This QR uses localhost, which phones cannot reach. Open the Mac on its network address.
          </p>
        )}
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

function PhoneSyncPanel({ pairToken }: { pairToken: string | null }) {
  if (pairToken) {
    return <AutoSendPanel pairToken={pairToken} />;
  }

  return <ScannerPanel />;
}

function AutoSendPanel({ pairToken }: { pairToken: string }) {
  const [state, setState] = useState<TransferState>('sending');
  const [message, setMessage] = useState('Sending backup to laptop.');

  useEffect(() => {
    let alive = true;

    async function sendSnapshot() {
      try {
        const response = await fetch(`/api/sync/rooms/${pairToken}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(createSyncSnapshot('phone')),
        });

        if (!response.ok) {
          throw new Error('Sync session expired.');
        }

        if (!alive) return;
        setState('done');
        setMessage('Sent. Your phone data stayed exactly where it is.');
      } catch {
        if (!alive) return;
        setState('error');
        setMessage('Could not reach the laptop. Create a new QR and scan again.');
      }
    }

    sendSnapshot();
    return () => {
      alive = false;
    };
  }, [pairToken]);

  return (
    <WatchPanel className="rounded-[28px] px-5 py-8 text-center">
      <div className="mx-auto grid size-20 place-items-center rounded-full bg-white text-black">
        {state === 'done' ? (
          <Check className="size-9" />
        ) : state === 'error' ? (
          <X className="size-9" />
        ) : (
          <LoaderCircle className="size-9 animate-spin" />
        )}
      </div>
      <p className="mt-5 text-2xl font-black tracking-tight text-white">
        {state === 'done' ? 'Backup sent' : state === 'error' ? 'Could not sync' : 'Sending'}
      </p>
      <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-white/55">{message}</p>
    </WatchPanel>
  );
}

function ScannerPanel() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState(() => {
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      return 'Use your phone Camera app to scan the QR, or open LiftDay over HTTPS.';
    }
    return 'Point your phone at the QR on the laptop.';
  });

  useEffect(() => {
    if (!scanning) return;

    let stopped = false;
    let frame = 0;

    async function startScanner() {
      if (!window.isSecureContext) {
        setMessage('Browser camera needs HTTPS. Use your phone Camera app to scan the QR.');
        setScanning(false);
        return;
      }

      const Detector = getBarcodeDetector();
      if (!Detector) {
        setMessage('Camera scanning is not available here. Use your phone camera to open the QR.');
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
              window.location.href = rawValue;
              return;
            }
          } catch {
            setMessage('Still looking for the QR.');
          }
          frame = window.requestAnimationFrame(scan);
        };

        scan();
      } catch {
        setMessage('Camera permission was blocked. Use your phone camera app to scan the QR.');
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
  }, [scanning]);

  return (
    <section>
      <WatchPanel className="rounded-[28px] p-4">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-full bg-white text-black">
            <ScanLine className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-black uppercase tracking-widest text-white/35">Send</p>
            <p className="text-xl font-black tracking-tight text-white">Laptop QR</p>
          </div>
        </div>

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
      </WatchPanel>

      <WatchDetailsPanel summary="Details" className="mt-4">
        <PhoneExportFallback compact />
      </WatchDetailsPanel>
    </section>
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
        <p className="mt-2 rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-xs font-black uppercase leading-snug text-red-100">
          {importError}
        </p>
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
  function downloadExport() {
    const blob = new Blob([JSON.stringify(createSyncSnapshot(source), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `liftday-${source}-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
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
    </div>
  );
}

function SyncMetricGrid({ summary }: { summary: ReturnType<typeof getLocalSyncSummary> }) {
  return (
    <WatchMetricGrid columns={3}>
      <WatchMetricCell label="Sessions" value={summary.sessionCount.toString()} />
      <WatchMetricCell label="First" value={summary.firstSessionDate ?? '-'} />
      <WatchMetricCell label="Latest" value={summary.latestSessionDate ?? '-'} />
    </WatchMetricGrid>
  );
}

function StatusPill({ state }: { state: TransferState }) {
  const isDone = state === 'done';
  const isError = state === 'error';
  const label = isDone ? 'Done' : isError ? 'Retry' : 'Live';
  const tone = isDone ? 'success' : isError ? 'danger' : 'neutral';

  return <WatchStatusPill tone={tone}>{label}</WatchStatusPill>;
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

function isLocalHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

function isLocalPairUrl(url: string): boolean {
  try {
    return isLocalHost(new URL(url).hostname);
  } catch {
    return false;
  }
}
