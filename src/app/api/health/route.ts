import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'ps26034-web',
    version: '0.1.0',
    phase: 'phase-0-foundation',
    timestamp: new Date().toISOString(),
  });
}
