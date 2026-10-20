/**
 * Features that are built but switched off.
 *
 * editAttendance: the company correcting a day directly (status + punch times).
 * Off for now: records change on the backend when the company approves or
 * rejects a punch-fix request. Turn on once the company may edit directly.
 *
 * inAppPayment: paying for a plan with PayU from the Subscription screen, as
 * the native app did. Security still depends on the backend: it should stop
 * sending the PayU salt from api/hasgenerate (the app then asks PAYU_HASH_PATH
 * for hashes) and check each payment with PayU before extending a plan.
 *
 * rolesDemo: Manager and HR views for employees, picked from their position,
 * with sample data and a "view as" switch in Profile. For client demos until
 * the backend has real roles.
 */
export const FEATURES = {
  editAttendance: false,
  inAppPayment: true,
  rolesDemo: true,
} as const;

/**
 * STAFO's PayU merchant key. It is public (PayU shows it in every checkout);
 * the salt is not, and never goes in the app.
 */
export const PAYU_MERCHANT_KEY = '1AJhSD';

/** Server endpoint that computes PayU hashes; agree the path with the backend team. */
export const PAYU_HASH_PATH = 'api/payu/hash';
