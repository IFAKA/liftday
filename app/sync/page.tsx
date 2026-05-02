'use client';

import { ChangeEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, Copy, Download, FileUp, Laptop, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TopBar } from '@/components/TopBar';
import {
  createSyncSnapshot,
  getLocalSyncSummary,
  importPhoneSnapshot,
  parseSyncSnapshot,
  serializeSyncSnapshot,
  ImportResult,
} from '@/lib/sync';

type SyncStatus =
  | { kind: 'idle'; message: string }
  | { kind: 'success'; message: string }
  | { kind: 'error'; message: string };

type SyncMode = 'phone' | 'laptop';

export default function SyncPage() {
  const router = useRouter();
  const [mode, setMode] = useState<SyncMode>('phone');
  const [rawImport, setRawImport] = useState('');
  const [status, setStatus] = useState<SyncStatus>({
    kind: 'idle',
    message: 'Start on the phone that has your progress.',
  });
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [summary, setSummary] = useState(() => getLocalSyncSummary());

  const exportText = useMemo(
    () => serializeSyncSnapshot(createSyncSnapshot('phone')),
    []
  );

  async function copyExport() {
    try {
      await navigator.clipboard.writeText(exportText);
      setStatus({ kind: 'success', message: 'Copied. Open LiftDay on the laptop, choose Laptop, then paste it.' });
    } catch {
      setStatus({ kind: 'error', message: 'Clipboard access failed. Use Download instead.' });
    }
  }

  function downloadExport() {
    const blob = new Blob([exportText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `liftday-phone-progress-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setStatus({ kind: 'success', message: 'File saved. Move it to the laptop and import it there.' });
  }

  async function readImportFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setRawImport(await file.text());
    setStatus({ kind: 'idle', message: `${file.name} loaded. Import when ready.` });
  }

  function importData() {
    try {
      const snapshot = parseSyncSnapshot(rawImport);
      const result = importPhoneSnapshot(snapshot);
      setImportResult(result);
      setSummary(getLocalSyncSummary());
      setStatus({
        kind: 'success',
        message: 'Done. Laptop data was backed up first. Your phone was not changed.',
      });
    } catch (error) {
      setStatus({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Import failed.',
      });
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-black text-white">
      <TopBar
        leftAction={
          <Button
            variant="ghost"
            size="icon-lg"
            aria-label="Back"
            onClick={() => router.push('/settings')}
            className="rounded-full text-white/60 hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft />
          </Button>
        }
        center={<span className="text-fluid-ui font-black uppercase tracking-tight">Sync</span>}
      />

      <main className="flex-1 overflow-y-auto px-4 pb-8 pt-2 no-scrollbar">
        <section className="px-1 pb-5">
          <p className="text-3xl font-black leading-none tracking-tight text-white">Move progress to laptop</p>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/50">
            One-way copy. The phone keeps its data. The laptop gets a backup and better viewing.
          </p>
        </section>

        <section className="grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-1.5">
          <ModeButton
            active={mode === 'phone'}
            icon={<Smartphone />}
            label="Phone"
            sublabel="Send data"
            onClick={() => {
              setMode('phone');
              setStatus({ kind: 'idle', message: 'Copy or download your phone progress.' });
            }}
          />
          <ModeButton
            active={mode === 'laptop'}
            icon={<Laptop />}
            label="Laptop"
            sublabel="Receive data"
            onClick={() => {
              setMode('laptop');
              setStatus({ kind: 'idle', message: 'Paste or choose the file from your phone.' });
            }}
          />
        </section>

        <section className="mt-4 grid grid-cols-3 gap-2">
          <Metric label="Sessions" value={summary.sessionCount.toString()} />
          <Metric label="First" value={summary.firstSessionDate ?? '-'} />
          <Metric label="Latest" value={summary.latestSessionDate ?? '-'} />
        </section>

        {mode === 'phone' ? (
          <PhonePanel exportText={exportText} onCopy={copyExport} onDownload={downloadExport} />
        ) : (
          <LaptopPanel
            rawImport={rawImport}
            onRawImportChange={setRawImport}
            onFileChange={readImportFile}
            onImport={importData}
          />
        )}

        <StatusBlock status={status} result={importResult} />
      </main>
    </div>
  );
}

function ModeButton({
  active,
  icon,
  label,
  sublabel,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  sublabel: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 rounded-xl px-4 py-3 text-left transition active:scale-[0.98] ${
        active ? 'bg-white text-black' : 'text-white/45'
      }`}
    >
      <span className="[&_svg]:size-5">{icon}</span>
      <span className="min-w-0">
        <span className="block text-sm font-black uppercase tracking-tight">{label}</span>
        <span className={`block truncate text-xs ${active ? 'text-black/55' : 'text-white/30'}`}>{sublabel}</span>
      </span>
    </button>
  );
}

function PhonePanel({
  exportText,
  onCopy,
  onDownload,
}: {
  exportText: string;
  onCopy: () => void;
  onDownload: () => void;
}) {
  return (
    <section className="mt-6">
      <p className="mb-3 text-sm font-black uppercase tracking-widest text-white/45">On your phone</p>
      <Button
        type="button"
        onClick={onCopy}
        className="h-14 w-full rounded-2xl bg-white text-base font-black text-black hover:bg-white/90 active:scale-[0.98]"
      >
        <Copy />
        Copy progress
      </Button>
      <Button
        type="button"
        onClick={onDownload}
        variant="secondary"
        className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-white/10 text-white hover:bg-white/15 active:scale-[0.98]"
      >
        <Download />
        Save file instead
      </Button>

      <details className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
        <summary className="cursor-pointer text-xs font-black uppercase tracking-widest text-white/35">
          Show raw data
        </summary>
        <textarea
          readOnly
          value={exportText}
          className="mt-3 h-28 w-full resize-none rounded-lg border border-white/10 bg-black/40 p-3 font-mono text-xs leading-relaxed text-white/45 outline-none"
          aria-label="Generated LiftDay sync data"
        />
      </details>
    </section>
  );
}

function LaptopPanel({
  rawImport,
  onRawImportChange,
  onFileChange,
  onImport,
}: {
  rawImport: string;
  onRawImportChange: (value: string) => void;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onImport: () => void;
}) {
  return (
    <section className="mt-6">
      <p className="mb-3 text-sm font-black uppercase tracking-widest text-white/45">On your laptop</p>
      <label className="flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-white px-4 text-base font-black text-black active:scale-[0.98]">
        <FileUp className="size-5" />
        Choose phone file
        <input
          type="file"
          accept="application/json,.json"
          onChange={onFileChange}
          className="sr-only"
        />
      </label>

      <details className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
        <summary className="cursor-pointer text-xs font-black uppercase tracking-widest text-white/35">
          Paste copied data
        </summary>
        <textarea
          value={rawImport}
          onChange={(event) => onRawImportChange(event.target.value)}
          placeholder="Paste phone progress here"
          className="mt-3 h-28 w-full resize-none rounded-lg border border-white/10 bg-black/40 p-3 font-mono text-xs leading-relaxed text-white outline-none placeholder:text-white/25 focus:border-white/30"
          aria-label="LiftDay sync import data"
        />
      </details>

      <Button
        type="button"
        onClick={onImport}
        disabled={!rawImport.trim()}
        className="mt-3 h-12 w-full rounded-2xl bg-emerald-300 text-black hover:bg-emerald-200 active:scale-[0.98]"
      >
        <Check />
        Import to laptop
      </Button>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3">
      <p className="text-[10px] font-black uppercase tracking-widest text-white/35">{label}</p>
      <p className="mt-1 truncate text-sm font-black uppercase tracking-tight text-white">{value}</p>
    </div>
  );
}

function StatusBlock({ status, result }: { status: SyncStatus; result: ImportResult | null }) {
  const tone = status.kind === 'error'
    ? 'border-red-400/25 bg-red-400/10 text-red-100'
    : status.kind === 'success'
      ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-100'
      : 'border-white/10 bg-white/[0.04] text-white/55';

  return (
    <section className={`mt-4 rounded-xl border px-4 py-3 ${tone}`}>
      <p className="text-sm leading-relaxed">{status.message}</p>
      {result && (
        <p className="mt-2 text-xs leading-relaxed opacity-75">
          Imported {result.importedSessions} sessions: {result.addedSessions} added, {result.updatedSessions} updated, {result.keptSessions} unchanged.
        </p>
      )}
    </section>
  );
}
