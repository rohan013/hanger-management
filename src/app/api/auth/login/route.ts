import { NextRequest, NextResponse } from 'next/server';
import { hashPassword, getStoredPasswordHash, signSession, COOKIE_NAME } from '@/lib/auth';

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!body || typeof body !== 'object' || !('password' in body)) {
    return NextResponse.json({ error: 'Password is required' }, { status: 400 });
  }

  const { password } = body as { password: unknown };
  if (typeof password !== 'string' || !password) {
    return NextResponse.json({ error: 'Password is required' }, { status: 400 });
  }

  let storedHash: string;
  try {
    storedHash = await getStoredPasswordHash();
  } catch {
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  const submittedHash = await hashPassword(password);
  if (submittedHash !== storedHash) {
    return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
  }

  let sessionValue: string;
  try {
    sessionValue = await signSession();
  } catch {
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE_NAME, sessionValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  });
  return response;
}
