export const COOKIE_NAME = '__session';

function bufToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBuf(hex: string): Uint8Array<ArrayBuffer> {
  const matches = hex.match(/.{2}/g) ?? [];
  const buf = new ArrayBuffer(matches.length);
  const view = new Uint8Array(buf);
  matches.forEach((b, i) => { view[i] = parseInt(b, 16); });
  return view;
}

async function sha256(input: string): Promise<ArrayBuffer> {
  return globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
}

export async function hashPassword(password: string): Promise<string> {
  return bufToHex(await sha256(password));
}

export async function getStoredPasswordHash(): Promise<string> {
  const appPassword = process.env.APP_PASSWORD;
  if (!appPassword) throw new Error('APP_PASSWORD is not configured');
  return hashPassword(appPassword);
}

async function getSigningKey(usage: KeyUsage[]): Promise<CryptoKey> {
  const appPassword = process.env.APP_PASSWORD;
  if (!appPassword) throw new Error('APP_PASSWORD is not configured');
  const keyMaterial = await sha256(appPassword);
  return globalThis.crypto.subtle.importKey(
    'raw',
    keyMaterial,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    usage
  );
}

export async function signSession(): Promise<string> {
  const key = await getSigningKey(['sign']);
  const ts = Date.now().toString();
  const sig = await globalThis.crypto.subtle.sign('HMAC', key, new TextEncoder().encode(ts));
  return `${ts}.${bufToHex(sig)}`;
}

export async function verifySession(cookieValue: string): Promise<boolean> {
  if (!cookieValue) return false;
  const dotIndex = cookieValue.lastIndexOf('.');
  if (dotIndex === -1) return false;
  const ts = cookieValue.slice(0, dotIndex);
  const hexSig = cookieValue.slice(dotIndex + 1);
  if (!ts || !hexSig) return false;
  try {
    const key = await getSigningKey(['verify']);
    return await globalThis.crypto.subtle.verify(
      'HMAC',
      key,
      hexToBuf(hexSig),
      new TextEncoder().encode(ts)
    );
  } catch {
    return false;
  }
}
