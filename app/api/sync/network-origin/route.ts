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
  for (const entries of Object.values(networkInterfaces())) {
    for (const entry of entries ?? []) {
      if (entry.family !== 'IPv4' || entry.internal) continue;
      if (isPrivateIpv4(entry.address)) return entry.address;
    }
  }

  return null;
}

function isPrivateIpv4(address: string): boolean {
  return (
    address.startsWith('10.') ||
    address.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(address)
  );
}
