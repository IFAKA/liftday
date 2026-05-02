'use client';

import { ChangeEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, Copy, Download, FileUp, ShieldCheck } from 'lucide-react';
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

export default function SyncPage() {
  const router = useRouter();
  const [source, setSource] = useState<'phone' | 'laptop'>('phone');
  const [rawImport, setRawImport] = useState('');
  const [status, setStatus] = useState<SyncStatus>({
    kind: 'idle',
    message: 'Phone data is copied outward. Importing on the laptop never changes the phone.',
  });
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [summary, setSummary] = useState(() => getLocalSyncSummary());

  const exportText = useMemo(
    () => serializeSyncSnapshot(createSyncSnapshot(source)),
    [source]
  );

  async function copyExport() {
    try {
      await navigator.clipboard.writeText(exportText);
      setStatus({ kind: 'success', message: 'Sync data copied. Paste it into LiftDay on the laptop.' });
    } catch {
      setStatus({ kind: 'error', message: 'Clipboard access failed. Use Download instead.' });
    }
  }

  function downloadExport() {
    const blob = new Blob([exportText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `liftday-sync-${source}-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setStatus({ kind: 'success', message: 'Sync file created. Move it to the laptop and import it there.' });
  }

  async function readImportFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setRawImport(await file.text());
    setStatus({ kind: 'idle', message: `${file.name} loaded. Review the import action before applying it.` });
  }

  function importData() {
    try {
      const snapshot = parseSyncSnapshot(rawImport);
      const result = importPhoneSnapshot(snapshot);
      setImportResult(result);
      setSummary(getLocalSyncSummary());
      setStatus({
        kind: 'success',
        message: 'Import complete. Laptop data was backed up first, then merged with the incoming phone data.',
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
        <section className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-5 py-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-emerald-300" />
            <div className="min-w-0">
              <p className="text-sm font-black uppercase tracking-tight text-emerald-100">Phone-safe sync</p>
              <p className="mt-1 text-sm leading-relaxed text-emerald-50/70">
                Exporting does not modify this device. Importing only changes the device you are holding and saves a local backup first.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-4 grid grid-cols-3 gap-2">
          <Metric label="Sessions" value={summary.sessionCount.toString()} />
          <Metric label="First" value={summary.firstSessionDate ?? '-'} />
          <Metric label="Latest" value={summary.latestSessionDate ?? '-'} />
        </section>

        <section className="mt-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm font-black uppercase tracking-widest text-white/45">Export from phone</h2>
            <div className="flex rounded-full border border-white/10 bg-white/5 p-1">
              {(['phone', 'laptop'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setSource(option)}
                  className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-widest transition ${
                    source === option ? 'bg-white text-black' : 'text-white/45'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              onClick={copyExport}
              className="h-12 rounded-xl bg-white text-black hover:bg-white/90"
            >
              <Copy />
              Copy
            </Button>
            <Button
              type="button"
              onClick={downloadExport}
              variant="secondary"
              className="h-12 rounded-xl border border-white/10 bg-white/10 text-white hover:bg-white/15"
            >
              <Download />
              Download
            </Button>
          </div>

          <textarea
            readOnly
            value={exportText}
            className="mt-3 h-32 w-full resize-none rounded-xl border border-white/10 bg-white/[0.03] p-3 font-mono text-xs leading-relaxed text-white/45 outline-none"
            aria-label="Generated LiftDay sync data"
          />
        </section>

        <section className="mt-6">
          <h2 className="mb-3 text-sm font-black uppercase tracking-widest text-white/45">Import on laptop</h2>
          <label className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 text-sm font-black uppercase tracking-tight text-white active:bg-white/15">
            <FileUp className="size-4" />
            Choose sync file
            <input
              type="file"
              accept="application/json,.json"
              onChange={readImportFile}
              className="sr-only"
            />
          </label>

          <textarea
            value={rawImport}
            onChange={(event) => setRawImport(event.target.value)}
            placeholder="Paste phone sync data here"
            className="mt-3 h-36 w-full resize-none rounded-xl border border-white/10 bg-white/[0.03] p-3 font-mono text-xs leading-relaxed text-white outline-none placeholder:text-white/25 focus:border-white/30"
            aria-label="LiftDay sync import data"
          />

          <Button
            type="button"
            onClick={importData}
            disabled={!rawImport.trim()}
            className="mt-3 h-12 w-full rounded-xl bg-emerald-300 text-black hover:bg-emerald-200"
          >
            <Check />
            Import phone data
          </Button>
        </section>

        <StatusBlock status={status} result={importResult} />
      </main>
    </div>
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
