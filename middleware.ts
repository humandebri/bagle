import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  await supabase.auth.getUser(); // これがJWTクッキーを読み込む
  return res;
}

export const config = {
  matcher: ['/account/:path*', '/online-shop/:path*'],
};