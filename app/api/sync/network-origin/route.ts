import { networkInterfaces } from 'node:os';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const host = request.headers.get('host') ?? '';
  const port = host.includes(':') ? host.split(':').at(-1) : '';
  const address = getPrivateIpv4Address();

  return NextResponse.json({
    origin: address ? `http://${address}${port ? `:${port}` : ''}` : null,
  });
}

function getPrivateIpv4Address(): string | null {
  const candidates: Array<{ address: string; interfaceName: string; score: number }> = [];

  for (const [interfaceName, entries] of Object.entries(networkInterfaces())) {
    for (const entry of entries ?? []) {
      if (entry.family !== 'IPv4' || entry.internal) continue;
      if (!isPrivateIpv4(entry.address)) continue;

      candidates.push({
        address: entry.address,
        interfaceName,
        score: getAddressScore(entry.address, interfaceName),
      });
    }
  }

  return candidates.sort((a, b) => b.score - a.score)[0]?.address ?? null;
}

function isPrivateIpv4(address: string): boolean {
  return (
    address.startsWith('10.') ||
    address.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(address)
  );
}

function getAddressScore(address: string, interfaceName: string): number {
  const lowerName = interfaceName.toLowerCase();
  const virtualPenalty = /^(awdl|bridge|docker|llw|utun|vbox|vmnet)/.test(lowerName) ? 100 : 0;
  const privateRangeScore = address.startsWith('192.168.')
    ? 30
    : /^172\.(1[6-9]|2\d|3[01])\./.test(address)
      ? 20
      : 10;

  return privateRangeScore - virtualPenalty;
}
