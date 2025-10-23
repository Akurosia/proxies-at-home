// src/lib/uuid.ts
export function uuidv4(): string {
  const g: any = globalThis;

  // Browser / Web Crypto (preferred)
  if (g.crypto?.randomUUID) return g.crypto.randomUUID();

  // Node fallback (SSR/build-time only)
  try {
    // Using 'node:crypto' avoids bundlers polyfilling it for the browser
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { randomUUID } = require('node:crypto');
    if (typeof randomUUID === 'function') return randomUUID();
  } catch {}

  // Last-resort RFC4122 v4 with (crypto.)getRandomValues or Math.random
  const bytes = new Uint8Array(16);
  if (g.crypto?.getRandomValues) g.crypto.getRandomValues(bytes);
  else for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);

  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant

  const h = (b: number) => b.toString(16).padStart(2, '0');
  const hex = Array.from(bytes, h).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}
