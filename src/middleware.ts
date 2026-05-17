import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === '/login' || pathname.startsWith('/api/auth/')) {
    return NextResponse.next();
  }

  const cookieValue = request.cookies.get('__session')?.value ?? '';
  const valid = await verifySession(cookieValue);

  if (valid) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('from', pathname + request.nextUrl.search);
  return NextResponse.redirect(loginUrl);
}
