/**
 * Features that are built but switched off.
 *
 * editAttendance: the company correcting a day directly (status + punch times).
 * Off for now: records change on the backend when the company approves or
 * rejects a punch-fix request. Turn on once the company may edit directly.
 *
 * inAppPayment: paying for a plan with PayU from the Subscription screen.
 * Off until the backend (1) stops sending the PayU salt from api/hasgenerate,
 * (2) has an endpoint that returns PayU hashes (set PAYU_HASH_PATH), and
 * (3) checks each payment with PayU before extending a plan. Until then the
 * Subscription screen sends people to STAFO sales.
 */
export const FEATURES = {
  editAttendance: false,
  inAppPayment: false,
} as const;

/** Server endpoint that computes PayU hashes; agree the path with the backend team. */
export const PAYU_HASH_PATH = 'api/payu/hash';
