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
