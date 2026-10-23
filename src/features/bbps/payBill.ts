import {useMutation} from '@tanstack/react-query';
import {confirmBillPayment, startBillPayment, type FetchedBill, type Payer} from '../../api/endpoints/bbps';
import {PAYU_MERCHANT_KEY} from '../../config/features';
import {PAYU_SALT} from '../../config/secrets';
import {openPayuCheckout} from '../../lib/payu';
import {payuHashLocal} from '../../lib/payuHash';
import {useSession} from '../../store/session';
import type {PaymentOutcome} from '../subscription/pay';

/** Who is paying, as BBPS records it. */
export function usePayer(): (Payer & {name: string; email: string; phone: string}) | null {
  const s = useSession();
  if (s.role === 'company' && s.companyId) {
    return {
      userId: s.companyId,
      userType: 'company',
      name: s.company?.company_name ?? '',
      email: s.company?.email ?? '',
      phone: s.company?.mobile_no ?? '',
    };
  }
  if (s.role === 'employee' && s.employee) {
    return {
      userId: String(s.employee.id),
      userType: 'employee',
      name: s.employee.name,
      email: s.employee.email ?? '',
      phone: s.employee.phone ?? '',
    };
  }
  return null;
}

/**
 * Starts the payment on the server, opens PayU, then asks the server to check
 * the payment and pay the biller. Hashing works like plan payments (subscription/pay.ts).
 */
export function usePayBill() {
  const payer = usePayer();
  return useMutation({
    mutationFn: async (p: {
      operatorCode: string;
      category: string;
      amount: string;
      bill: FetchedBill | null;
    }): Promise<PaymentOutcome> => {
      if (!payer) {
        throw new Error('Sign in again to pay bills.');
      }
      const bill = p.bill ? {refid: p.bill.refid, xml: p.bill.xml} : null;
      const order = await startBillPayment({
        payer,
        operatorCode: p.operatorCode,
        category: p.category,
        amount: p.amount,
        bill,
      });
      // Server's salt if it sends one; otherwise the app's, as the native app did.
      const salt = order.salt || PAYU_SALT;
      if (!salt) {
        throw new Error('Bill payments aren’t set up in this build (no PayU salt). No money was taken.');
      }
      const result = await openPayuCheckout({
        key: order.key || PAYU_MERCHANT_KEY,
        txnid: order.txnid,
        amount: order.amount,
        productInfo: order.productInfo,
        firstName: payer.name,
        email: payer.email,
        phone: payer.phone,
        extra: {udf1: order.userId, udf2: order.userType, udf3: order.operatorCode},
        // Hashed on the phone, like plan payments.
        getHash: async (_name, hashString) => payuHashLocal(hashString, salt),
      });
      if (result.status === 'cancelled' || result.status === 'error') {
        return result;
      }
      const ok = result.status === 'success';
      const txnid = ok ? result.txnid : order.txnid;
      const amount = ok ? result.amount : order.amount;
      try {
        const confirmed = await confirmBillPayment({
          payer,
          operatorCode: p.operatorCode,
          category: p.category,
          amount,
          mode: ok ? result.mode : '',
          txnid,
          bill,
          payuResponse: result.response,
        });
        if (!ok) {
          return {status: 'failed', txnid, amount};
        }
        // Paid at PayU but the biller hasn't confirmed: BBPS settles these later.
        return confirmed.ok
          ? {status: 'success', txnid, amount, mode: result.mode}
          : {status: 'pending', txnid, amount};
      } catch {
        return ok ? {status: 'pending', txnid, amount} : {status: 'failed', txnid, amount};
      }
    },
  });
}
