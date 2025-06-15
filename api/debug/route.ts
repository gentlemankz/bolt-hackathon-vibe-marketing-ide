import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const timestamp = new Date().toISOString();
    const url = request.url;
    const method = request.method;
    const headers = Object.fromEntries(request.headers.entries());
    
    console.log(`Debug endpoint hit at ${timestamp} - ${method} ${url}`);
    
    return NextResponse.json({
      success: true,
      timestamp,
      url,
      method,
      headers: {
        'user-agent': headers['user-agent'],
        'referer': headers['referer'],
        'host': headers['host'],
      },
      message: 'API routes are working in production',
      environment: process.env.NODE_ENV,
    });
  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json(
      { 
        error: 'Debug endpoint failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
} 