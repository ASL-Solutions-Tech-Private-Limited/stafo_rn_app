import {NativeEventEmitter, NativeModules} from 'react-native';

/** What the checkout ended with. `response` is PayU's own result, to pass on to the server. */
export type PayuResult =
  | {status: 'success'; txnid: string; amount: string; mode: string; response: Record<string, unknown>}
  | {status: 'failed'; response: Record<string, unknown>}
  | {status: 'cancelled'}
  | {status: 'error'; message: string};

export type PayuCheckout = {
  key: string;
  txnid: string;
  amount: string;
  productInfo: string;
  firstName: string;
  email: string;
  phone: string;
  /** Sent back to the server with the result. */
  extra: Record<string, string>;
  /** Asks the server for a hash; the app never sees the salt. */
  getHash: (hashName: string, hashString: string) => Promise<string>;
};

// The SDK is a classic bridge module (NativeModules.PayUBizSdk).
const sdk = (): {openCheckoutScreen: (p: object) => void; hashGenerated: (m: object) => void} | null =>
  (NativeModules as Record<string, never>).PayUBizSdk ?? null;

export const payuAvailable = () => !!sdk();

type PayuEvent = {payuResponse?: unknown; payUResponse?: unknown} | null | undefined;

/** Android sends {payuResponse}; iOS may send {payUResponse} or the response itself. */
const resultOf = (e: PayuEvent) => e?.payuResponse ?? e?.payUResponse ?? e;

/** PayU's result arrives as a JSON string; sometimes nested under "result". */
function parse(raw: unknown): Record<string, unknown> {
  try {
    const json = typeof raw === 'string' ? JSON.parse(raw) : raw ?? {};
    const result = (json as {result?: unknown}).result;
    return (result && typeof result === 'object' ? result : json) as Record<string, unknown>;
  } catch {
    return {};
  }
}

/** Opens PayU's checkout (UPI, cards, net banking, wallets) and resolves once it closes. */
export function openPayuCheckout(c: PayuCheckout): Promise<PayuResult> {
  const native = sdk();
  if (!native) {
    return Promise.resolve({status: 'error', message: 'Payments aren’t available on this phone.'});
  }
  const emitter = new NativeEventEmitter(NativeModules.PayUBizSdk);
  return new Promise(resolve => {
    const subs = [
      emitter.addListener('generateHash', async (e: {hashName?: string; hashString?: string}) => {
        if (!e.hashName || !e.hashString) {
          return;
        }
        try {
          native.hashGenerated({[e.hashName]: await c.getHash(e.hashName, e.hashString)});
        } catch {
          // PayU fails the step and reports onError; nothing else to do here.
          native.hashGenerated({[e.hashName]: ''});
        }
      }),
      emitter.addListener('onPaymentSuccess', (e: PayuEvent) => {
        const r = parse(resultOf(e));
        done({
          status: 'success',
          txnid: String(r.txnid ?? c.txnid),
          amount: String(r.amount ?? c.amount),
          mode: String(r.mode ?? ''),
          response: r,
        });
      }),
      emitter.addListener('onPaymentFailure', (e: PayuEvent) =>
        done({status: 'failed', response: parse(resultOf(e))}),
      ),
      emitter.addListener('onPaymentCancel', () => done({status: 'cancelled'})),
      emitter.addListener('onError', (e: {errorMsg?: string; errorMessage?: string}) =>
        done({status: 'error', message: e.errorMsg ?? e.errorMessage ?? 'The payment couldn’t start.'}),
      ),
    ];
    let finished = false;
    function done(r: PayuResult) {
      if (!finished) {
        finished = true;
        subs.forEach(s => s.remove());
        resolve(r);
      }
    }
    native.openCheckoutScreen({
      payUPaymentParams: {
        key: c.key,
        transactionId: c.txnid,
        amount: c.amount,
        productInfo: c.productInfo,
        firstName: c.firstName,
        email: c.email,
        phone: c.phone,
        // PayU posts the result here too, so the server hears it even if the app is closed.
        ios_surl: 'https://stafo.in/api/success',
        ios_furl: 'https://stafo.in/api/failure',
        android_surl: 'https://stafo.in/api/success',
        android_furl: 'https://stafo.in/api/failure',
        environment: '0', // production
        userCredential: `${c.key}:${c.email}`,
        additionalParam: c.extra,
      },
      payUCheckoutProConfig: {
        merchantName: 'STAFO',
        showExitConfirmationOnCheckoutScreen: true,
        showExitConfirmationOnPaymentScreen: true,
        merchantResponseTimeout: 15000,
      },
    });
  });
}
