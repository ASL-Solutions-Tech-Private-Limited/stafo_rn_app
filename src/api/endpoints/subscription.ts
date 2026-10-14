import {api, ensureOk} from '../client';
import type {BasicResponse} from '../types';

export type PlanFeature = {
  id: number;
  name: string;
  description?: string | null;
  status?: number | null;
  /** "Yes", "No", a number like "20", or null when the plan doesn't list it. */
  pivot?: {feature_value?: string | null} | null;
};

export type Plan = {
  id: number;
  package_name: string;
  description?: string | null;
  price: string | number;
  discount_price?: string | number | null;
  days: number;
  status?: string | null;
  features?: PlanFeature[] | null;
};

export type Subscription = {
  id: number;
  company_name?: string | null;
  package_id: number;
  package_price?: number | string | null;
  /** yyyy-MM-dd */
  subscription_start?: string | null;
  subscription_end?: string | null;
  /** Null when the plan is no longer offered. */
  package?: Omit<Plan, 'features'> | null;
};

export async function getPlans() {
  const {data} = await api.get<BasicResponse & {data?: Plan[]}>('api/package');
  return ensureOk(data).data ?? [];
}

export async function getSubscription() {
  const {data} = await api.get<BasicResponse & {data?: Subscription | null; downloadUrl?: string | null}>(
    'api/subscription-info',
  );
  const body = ensureOk(data);
  return {subscription: body.data ?? null, invoiceUrl: body.downloadUrl || null};
}

// ---------- PayU payment ----------

/** What the server prepares for a PayU checkout (api/hasgenerate). */
export type PayuOrder = {
  merchantKey: string;
  txnid: string;
  amount: string;
  productinfo: string;
  firstname: string;
  email: string;
  phone: string;
  /** Plan length in days and package, echoed back when reporting the payment. */
  duration: number;
  package_id: number;
  user_id: number;
};

/**
 * Starts a payment for a plan. Today the server also sends the merchant salt
 * (as it did for the native app); it's returned separately so it's only used
 * for this payment's hashes and never stored. Once the backend stops sending
 * it, hashes come from the server instead (see payuHash).
 */
export async function createPayuOrder(companyId: string, packageId: number) {
  const {data} = await api.post<BasicResponse & {hashParam?: (PayuOrder & {salt?: string}) | null}>(
    'api/hasgenerate',
    {company_id: companyId, package_id: String(packageId)},
  );
  const p = ensureOk(data).hashParam;
  if (!p?.merchantKey || !p.txnid || !p.amount) {
    throw new Error('Couldn’t start the payment. Please try again.');
  }
  const order: PayuOrder = {
    merchantKey: p.merchantKey,
    txnid: p.txnid,
    amount: p.amount,
    productinfo: p.productinfo,
    firstname: p.firstname,
    email: p.email,
    phone: String(p.phone ?? ''),
    duration: p.duration,
    package_id: p.package_id,
    user_id: p.user_id,
  };
  return {order, salt: p.salt?.trim() || null};
}

/**
 * The hash PayU's checkout asks for while it runs, computed by the server with
 * the salt it keeps to itself. PAYU_HASH_PATH is set once the backend has it.
 */
export async function payuHash(path: string, hashName: string, hashString: string, txnid: string) {
  const {data} = await api.post<BasicResponse & {hash?: string}>(path, {
    hash_name: hashName,
    hash_string: hashString,
    txnid,
  });
  const hash = ensureOk(data).hash;
  if (!hash) {
    throw new Error('The server didn’t return a payment hash.');
  }
  return hash;
}

/**
 * Tells the server how the payment ended. The server must confirm it with
 * PayU (verify_payment) before extending the plan; the app's word isn't proof.
 */
export async function reportPayuPayment(p: {
  companyId: string;
  order: PayuOrder;
  status: 'success' | 'failed';
  amount: string;
  txnid: string;
  payuResponse: Record<string, unknown>;
}) {
  const {data} = await api.post<BasicResponse>('api/paymentUpdate', {
    company_id: p.companyId,
    duration: String(p.order.duration),
    packageId: String(p.order.package_id),
    amount: p.amount,
    txnid: p.txnid,
    status: p.status,
    payment_Message: p.status,
    payment_info: p.payuResponse,
  });
  return ensureOk(data);
}
