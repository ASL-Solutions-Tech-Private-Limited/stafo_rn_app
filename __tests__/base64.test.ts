/// <reference types="node" />
import {base64ToArrayBuffer} from '../src/lib/base64';

const bytes = (b64: string) => Array.from(new Uint8Array(base64ToArrayBuffer(b64)));

describe('base64ToArrayBuffer', () => {
  it('matches Node for every padding length', () => {
    for (const text of ['', 'f', 'fo', 'foo', 'foob', 'fooba', 'foobar', 'STAFO ✓ QR']) {
      const b64 = Buffer.from(text).toString('base64');
      expect(bytes(b64)).toEqual(Array.from(Buffer.from(text)));
    }
  });
  it('strips a data: prefix and line breaks', () => {
    const b64 = Buffer.from('png bytes').toString('base64');
    expect(bytes(`data:image/png;base64,${b64.slice(0, 4)}\n${b64.slice(4)}`)).toEqual(
      Array.from(Buffer.from('png bytes')),
    );
  });
  it('decodes the QR payload production prints', () => {
    const text = Buffer.from(
      base64ToArrayBuffer('eyJjb21wYW55X2lkIjoxLCJicmFuY2hfaWQiOjgyLCJkZXBhcnRtZW50X2lkIjoyfQ=='),
    ).toString();
    expect(JSON.parse(text)).toEqual({company_id: 1, branch_id: 82, department_id: 2});
  });
});
