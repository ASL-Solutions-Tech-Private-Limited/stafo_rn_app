/* eslint-disable no-bitwise */

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Decodes base64 (with or without a data: prefix) into bytes. */
export function base64ToArrayBuffer(input: string) {
  const s = input.replace(/^data:[^,]*,/, '').replace(/[^A-Za-z0-9+/]/g, '');
  const out = new Uint8Array(Math.floor((s.length * 3) / 4));
  let n = 0;
  for (let i = 0; i < s.length; i += 4) {
    const a = B64.indexOf(s[i]);
    const b = B64.indexOf(s[i + 1]);
    const c = i + 2 < s.length ? B64.indexOf(s[i + 2]) : 0;
    const d = i + 3 < s.length ? B64.indexOf(s[i + 3]) : 0;
    const v = (a << 18) | (b << 12) | (c << 6) | d;
    out[n++] = (v >> 16) & 255;
    if (i + 2 < s.length) {
      out[n++] = (v >> 8) & 255;
    }
    if (i + 3 < s.length) {
      out[n++] = v & 255;
    }
  }
  return out.buffer.slice(0, n);
}
