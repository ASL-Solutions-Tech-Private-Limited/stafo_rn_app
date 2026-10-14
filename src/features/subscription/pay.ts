import {useMutation, useQueryClient} from '@tanstack/react-query';
import {createPayuOrder, payuHash, reportPayuPayment, type Plan} from '../../api/endpoints/subscription';
import {FEATURES, PAYU_HASH_PATH} from '../../config/features';
import {openPayuCheckout, payuAvailable} from '../../lib/payu';
import {useSession} from '../../store/session';

/** Paying in the app is on only when the backend is ready and the SDK is in this build. */
export const canPayInApp = () => FEATURES.inAppPayment && payuAvailable();

export type PaymentOutcome =
  | {status: 'success'; txnid: string; amount: string; mode: string}
  | {status: 'failed'; txnid: string; amount: string}
  | {status: 'pending'; txnid: string; amount: string}
  | {status: 'cancelled'}
  | {status: 'error'; message: string};

/**
 * Prepares the order on the server, opens PayU, and reports how it ended.
 * The plan is only shown as active once the server, having checked with PayU,
 * says so; a success the server can't confirm is shown as pending.
 */
export function usePayForPlan() {
  const companyId = useSession(s => s.companyId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (plan: Plan): Promise<PaymentOutcome> => {
      const order = await createPayuOrder(companyId!, plan.id);
      const result = await openPayuCheckout({
        key: order.merchantKey,
        txnid: order.txnid,
        amount: order.amount,
        productInfo: order.productinfo,
        firstName: order.firstname,
        email: order.email,
        phone: order.phone,
        extra: {udf1: String(order.user_id), udf2: String(order.duration), udf3: String(order.package_id)},
        getHash: (name, hashString) => payuHash(PAYU_HASH_PATH, name, hashString, order.txnid),
      });
      if (result.status === 'cancelled' || result.status === 'error') {
        return result;
      }
      const ok = result.status === 'success';
      const txnid = ok ? result.txnid : order.txnid;
      const amount = ok ? result.amount : order.amount;
      try {
        await reportPayuPayment({
          companyId: companyId!,
          order,
          status: ok ? 'success' : 'failed',
          amount,
          txnid,
          payuResponse: result.response,
        });
      } catch {
        // PayU also tells the server (surl/furl); the plan may still update shortly.
        return ok ? {status: 'pending', txnid, amount} : {status: 'failed', txnid, amount};
      }
      return ok ? {status: 'success', txnid, amount, mode: result.mode} : {status: 'failed', txnid, amount};
    },
    onSettled: () => {
      queryClient.invalidateQueries({queryKey: ['subscription']});
    },
  });
}
