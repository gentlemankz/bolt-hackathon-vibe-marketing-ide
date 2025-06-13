// Type declarations for Next.js server
declare module 'next/server' {
  export interface NextURL {
    pathname: string;
    search: string;
    searchParams: URLSearchParams;
    clone(): NextURL;
  }

  export interface NextRequest extends Request {
    nextUrl: NextURL;
    geo?: {
      country?: string;
      region?: string;
      city?: string;
    };
    ip?: string;
    cookies: {
      get(name: string): { name: string; value: string } | undefined;
      getAll(): Array<{ name: string; value: string }>;
      set(name: string, value: string, options?: any): void;
      delete(name: string): void;
    };
  }

  export class NextResponse extends Response {
    static json(body: any, init?: ResponseInit): NextResponse;
    static redirect(url: string | URL, status?: number): NextResponse;
    static rewrite(destination: string | URL): NextResponse;
    static next(options?: { request?: NextRequest }): NextResponse;
    cookies: {
      get(name: string): { name: string; value: string } | undefined;
      getAll(): Array<{ name: string; value: string }>;
      set(name: string, value: string, options?: any): void;
      delete(name: string): void;
    };
  }

  export function userAgent(request: NextRequest): {
    isBot: boolean;
    ua: string;
    browser: {
      name?: string;
      version?: string;
    };
    device: {
      model?: string;
      type?: string;
      vendor?: string;
    };
    engine: {
      name?: string;
      version?: string;
    };
    os: {
      name?: string;
      version?: string;
    };
    cpu: {
      architecture?: string;
    };
  };
} 