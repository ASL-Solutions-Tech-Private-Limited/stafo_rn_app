import {api, ensureOk} from '../client';
import type {CompanyAccount} from '../types';

export type Option = {id: number; name: string};

type TypeBody = {
  success?: boolean;
  data?: Array<{id: number; company_name?: string; business_name?: string}>;
};

export async function getCompanyTypes(): Promise<Option[]> {
  const {data} = await api.get<TypeBody>('api/company-types');
  return (ensureOk(data).data ?? []).map(t => ({id: t.id, name: t.company_name ?? ''})).filter(t => t.name);
}

export async function getBusinessTypes(): Promise<Option[]> {
  const {data} = await api.get<TypeBody>('api/business-types');
  return (ensureOk(data).data ?? []).map(t => ({id: t.id, name: t.business_name ?? ''})).filter(t => t.name);
}

export type RegisterForm = {
  companyName: string;
  companyTypeId: number;
  businessTypeId: number;
  email: string;
  ownerName: string;
  mobile: string;
  referralCode?: string;
};

/** Creates the company and its owner, as the old app did; the owner comes back signed in. */
export async function registerCompany(f: RegisterForm) {
  const mobile = f.mobile.trim();
  const {data} = await api.post<{
    success?: boolean;
    message?: string;
    token?: string;
    company?: CompanyAccount;
  }>('api/register', {
    company_info: {
      company_name: f.companyName.trim(),
      company_type: String(f.companyTypeId),
      business_type: String(f.businessTypeId),
      registration_number: '',
      gst_number: '',
      pan_number: '',
      mobile_no: mobile,
      email: f.email.trim(),
      password: '',
      password_confirmation: '',
      country: '',
      state: '',
      city: '',
      address: '',
      pin: '',
    },
    owner_info: {first_name: f.ownerName.trim(), last_name: '', email: '', mobile},
    ...(f.referralCode?.trim() ? {referral_code: f.referralCode.trim()} : {}),
  });
  const body = ensureOk(data);
  if (!body.token || !body.company) {
    throw new Error(body.message || 'Couldn’t create the account. Please try again.');
  }
  return {token: body.token, company: body.company, message: body.message};
}

/** KYC document types, as api/document-verify names them. */
export type KycType = 'pan' | 'gstin' | 'company' | 'aadhar';

export type KycStatus = Record<KycType, boolean> & {verified: boolean};

/** Which documents the company has verified, from its profile's flags. */
export async function getKycStatus(): Promise<KycStatus> {
  const {data} = await api.get<{
    status?: boolean;
    message?: string;
    data?: {company?: Record<string, unknown>};
  }>('api/company/profile');
  const c = ensureOk(data).data?.company ?? {};
  const yes = (k: string) => String(c[k] ?? '').toLowerCase() === 'yes';
  return {
    pan: yes('pan_verify'),
    gstin: yes('gstn_verify'),
    company: yes('registration_verify'),
    aadhar: yes('aadhar_verify'),
    verified: yes('is_verified'),
  };
}

type VerifyBody = {status?: string; message?: string; request_id?: string | number | null};

/**
 * Checks a document with the verification service. Aadhaar is two calls:
 * the number (an OTP goes to the linked mobile, and a request id comes back),
 * then the OTP with that request id.
 */
export async function verifyDocument(p: {
  companyId: string;
  type: KycType | 'aadhar-otp';
  number: string;
  otp?: string;
  requestId?: string;
}) {
  const {data} = await api.post<VerifyBody>('api/document-verify', {
    company_id: p.companyId,
    type: p.type,
    number: p.number,
    ...(p.otp ? {otp: p.otp} : {}),
    ...(p.requestId ? {request_id: p.requestId} : {}),
  });
  if (String(data?.status).toLowerCase() !== 'success') {
    throw new Error(data?.message || 'Couldn’t verify this number. Check it and try again.');
  }
  return {requestId: data.request_id != null ? String(data.request_id) : undefined};
}
