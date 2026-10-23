import {api, ensureOk} from '../client';

/**
 * BBPS (Bharat Bill Payment System) bill payments, with the old app's requests:
 * biller/category → getBiller → biller/detail → fetchBill → payBill → checkPaymentStatus.
 */

/**
 * Where the BBPS routes live: "api/", the same paths the native app calls.
 * The backend also plans "api/v1/" (not on live as of 23 Oct 2026); switch here.
 */
const BBPS = 'api/';

export type BillCategory = {id: number; name: string; code: string; iconUrl: string | null};

export async function getBillCategories(): Promise<BillCategory[]> {
  const {data} = await api.post<{
    success?: boolean;
    message?: string;
    data?: Array<{name: string; category_code?: string; category_icon?: string | null}>;
  }>(`${BBPS}biller/category`, {});
  // The icon files it names are missing on the server, so the app draws its own.
  return (ensureOk(data).data ?? []).map((c, i) => ({
    id: i,
    name: c.name,
    code: c.category_code ?? c.name,
    iconUrl: null,
  }));
}

export type Biller = {id: number; name: string; operatorCode: string};

export async function getBillers(category: string): Promise<Biller[]> {
  const {data} = await api.post<{
    success?: boolean;
    message?: string;
    data?: Array<{name: string; operator_code: string; category?: string}>;
  }>(`${BBPS}getBiller`, {category, circle: ''});
  return (ensureOk(data).data ?? []).map((b, i) => ({id: i, name: b.name, operatorCode: b.operator_code}));
}

/** One field the biller needs to find the bill, e.g. "Customer ID / Account ID". */
export type RawParam = {
  paramName?: string;
  dataType?: string;
  isOptional?: string;
  minLength?: string;
  maxLength?: string;
  regEx?: string;
};

export type BillerDetail = {
  billerId: string;
  name: string;
  category: string;
  /** "MANDATORY": the bill is fetched first; otherwise the amount can be typed straight away. */
  fetchRequirement: string;
  /** e.g. "Exact", "Exact and above". */
  paymentExactness: string;
  coverage: string | null;
  /** The server sends one object or a list; both are kept as they came. */
  params: RawParam | RawParam[] | null;
};

type MdmBiller = {
  billerId?: string;
  billerName?: string;
  billerCategory?: string;
  billerCoverage?: string;
  billerFetchRequiremet?: unknown;
  billerFetchRequirement?: unknown;
  billerPaymentExactness?: unknown;
  billerInputParams?: {paramInfo?: RawParam | RawParam[]};
};

type MdmBody = {mdmRequestNew?: {biller?: MdmBiller}};

/** BBPS sends some text fields as [] when empty. */
const text = (v: unknown) => (typeof v === 'string' ? v : '');

export async function getBillerDetail(operatorCode: string): Promise<BillerDetail> {
  const {data} = await api.post<MdmBody & {data?: MdmBody; status?: number | boolean; message?: string}>(
    `${BBPS}biller/detail`,
    {operator_code: operatorCode},
  );
  // biller/detail wraps mdmRequestNew in data; older routes sent it at the top.
  const b = data?.mdmRequestNew?.biller ?? data?.data?.mdmRequestNew?.biller;
  if (!b) {
    throw new Error(
      data?.message && data.message !== 'Success' ? data.message : 'Couldn’t load this biller.',
    );
  }
  return {
    billerId: b.billerId ?? operatorCode,
    name: b.billerName ?? '',
    category: b.billerCategory ?? '',
    fetchRequirement: text(b.billerFetchRequiremet ?? b.billerFetchRequirement) || 'MANDATORY',
    // Often [] instead of a string.
    paymentExactness: text(b.billerPaymentExactness),
    coverage: b.billerCoverage ?? null,
    params: b.billerInputParams?.paramInfo ?? null,
  };
}

export type FetchedBill = {
  /** BBPS request id, sent back when paying. */
  refid: string;
  /** Signed bill request, sent back when paying. */
  xml: string;
  customerName: string | null;
  billNumber: string | null;
  billDate: string | null;
  billPeriod: string | null;
  dueDate: string | null;
  /** In paise, as BBPS sends it. */
  amountPaise: number;
  /** Extra lines such as a balance. */
  info: {name: string; value: string}[];
};

type ListOrOne<T> = T | T[] | undefined | null;
const asList = <T>(v: ListOrOne<T>): T[] => (Array.isArray(v) ? v : v ? [v] : []);

export async function fetchBill(p: {operatorCode: string; category: string; inputs: Record<string, string>}) {
  const {data} = await api.post<{
    success?: boolean;
    message?: string;
    data?: {
      refid?: string;
      xml?: string;
      message?: string;
      billData?: {
        billerResponse?: {
          billAmount?: string;
          billDate?: string;
          billNumber?: string;
          billPeriod?: string;
          customerName?: string;
          dueDate?: string;
        };
        additionalInfo?: {info?: ListOrOne<{infoName?: string; infoValue?: string}>} | null;
      };
    };
  }>(`${BBPS}fetchBill`, {operator_code: p.operatorCode, category: p.category, postdata: p.inputs});
  const d = ensureOk(data).data;
  const r = d?.billData?.billerResponse;
  if (!d?.refid || !r) {
    throw new Error(d?.message || data.message || 'No bill was found for these details.');
  }
  const clean = (v?: string) => (v && v.trim() && v.trim().toUpperCase() !== 'NA' ? v.trim() : null);
  return {
    refid: d.refid,
    xml: d.xml ?? '',
    customerName: clean(r.customerName),
    billNumber: clean(r.billNumber),
    billDate: clean(r.billDate),
    billPeriod: clean(r.billPeriod),
    dueDate: clean(r.dueDate),
    amountPaise: Number(r.billAmount) || 0,
    info: asList(d.billData?.additionalInfo?.info)
      .filter(i => i.infoName && i.infoValue)
      .map(i => ({name: i.infoName!, value: i.infoValue!})),
  } satisfies FetchedBill;
}

export type BillOrder = {
  txnid: string;
  amount: string;
  productInfo: string;
  userId: string;
  userType: string;
  operatorCode: string;
  /** Sent by some servers; otherwise the app uses STAFO's PayU key. */
  key?: string;
};

export type Payer = {userId: string; userType: 'company' | 'employee'};

/** Starts a bill payment; the server returns the PayU order for it. */
export async function startBillPayment(p: {
  payer: Payer;
  operatorCode: string;
  category: string;
  amount: string;
  bill: {refid: string; xml: string} | null;
}): Promise<BillOrder> {
  const {data} = await api.post<{
    success?: boolean;
    message?: string;
    data?: {
      txnid?: string;
      amount?: string | number;
      product_info?: string;
      user_id?: string | number;
      user_type?: string;
      operator_code?: string;
      key?: string;
    };
  }>(`${BBPS}payBill`, {
    operator_code: p.operatorCode,
    user_id: p.payer.userId,
    user_type: p.payer.userType,
    postdata: {
      amount: p.amount,
      requestId: p.bill?.refid ?? '',
      mode: 'online',
      billPaymentRequestxml: p.bill?.xml ?? '',
    },
    category: p.category,
  });
  const d = ensureOk(data).data;
  if (!d?.txnid) {
    throw new Error(data.message || 'Couldn’t start the payment. Please try again.');
  }
  return {
    txnid: String(d.txnid),
    amount: String(d.amount ?? p.amount),
    productInfo: d.product_info ?? `${p.category} bill`,
    userId: String(d.user_id ?? p.payer.userId),
    userType: d.user_type ?? p.payer.userType,
    operatorCode: d.operator_code ?? p.operatorCode,
    key: d.key,
  };
}

/** After PayU closes: the server checks the payment and pays the biller. */
export async function confirmBillPayment(p: {
  payer: Payer;
  operatorCode: string;
  category: string;
  amount: string;
  mode: string;
  txnid: string;
  bill: {refid: string; xml: string} | null;
  payuResponse: Record<string, unknown>;
}) {
  const {data} = await api.post<{success?: boolean; message?: string; data?: {status?: string} | null}>(
    `${BBPS}checkPaymentStatus`,
    {
      category: p.category,
      operator_code: p.operatorCode,
      postdata: {
        amount: p.amount,
        billPaymentRequestxml: p.bill?.xml ?? '',
        mode: p.mode,
        requestId: p.bill?.refid ?? '',
      },
      transactionResponse: p.payuResponse,
      txnId: p.txnid,
      user_id: p.payer.userId,
      user_type: p.payer.userType,
    },
  );
  return {ok: data?.success === true, message: data?.message ?? null};
}
