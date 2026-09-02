import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    {
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'dream-academy-api',
        version: '1.0.0',
      },
    },
    { status: 200 }
  );
}
