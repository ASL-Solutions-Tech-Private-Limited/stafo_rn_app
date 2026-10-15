import {api, ensureOk} from '../client';
import type {BasicResponse} from '../types';
import type {UploadFile} from './tasks';

/** The company record from api/company/profile (only the fields the app edits or shows). */
export type CompanyRecord = {
  id: number;
  company_name: string;
  company_code?: string | null;
  /** Database ids, sent back unchanged when saving. */
  company_type?: string | number | null;
  business_type_id?: number | null;
  city?: string | number | null;
  state?: string | number | null;
  country?: string | number | null;
  registration_number?: string | null;
  gst_number?: string | null;
  pan_number?: string | null;
  address?: string | null;
  pin?: string | null;
  bank_name?: string | null;
  account_number?: string | null;
  ifsc_code?: string | null;
  no_of_employee?: number | null;
  status?: string | null;
  email?: string | null;
  mobile_no?: string | null;
};

export type CompanyProfile = {
  company: CompanyRecord;
  logo: string | null;
  cityName: string | null;
  stateName: string | null;
};

type ProfileBody = BasicResponse & {
  data?: {
    company?: CompanyRecord;
    company_logo?: string | null;
    city_name?: string | null;
    state_name?: string | null;
  } | null;
};

/**
 * The company's details. The server also sends Aadhaar and verification data;
 * only the fields above are kept, and nothing else is stored.
 */
export async function getCompanyDetails(): Promise<CompanyProfile> {
  const {data} = await api.get<ProfileBody>('api/company/profile');
  const d = ensureOk(data).data;
  const c = d?.company;
  if (!c) {
    throw new Error('Couldn’t load the company details.');
  }
  const company: CompanyRecord = {
    id: c.id,
    company_name: c.company_name,
    company_code: c.company_code,
    company_type: c.company_type,
    business_type_id: c.business_type_id,
    city: c.city,
    state: c.state,
    country: c.country,
    registration_number: c.registration_number,
    gst_number: c.gst_number,
    pan_number: c.pan_number,
    address: c.address,
    pin: c.pin,
    bank_name: c.bank_name,
    account_number: c.account_number,
    ifsc_code: c.ifsc_code,
    no_of_employee: c.no_of_employee,
    status: c.status,
    email: c.email,
    mobile_no: c.mobile_no,
  };
  return {
    company,
    logo: d?.company_logo ?? null,
    cityName: d?.city_name ?? null,
    stateName: d?.state_name ?? null,
  };
}

export type CompanyEdit = {
  company_name: string;
  email: string;
  registration_number: string;
  gst_number: string;
  pan_number: string;
  address: string;
  pin: string;
  bank_name: string;
  account_number: string;
  ifsc_code: string;
};

const num = (v: unknown) => (v == null || v === '' ? 0 : Number(v) || 0);

/** Saves the edited fields; everything else is sent back as it was (the server wants the full record). */
export async function updateCompany(current: CompanyRecord, e: CompanyEdit) {
  const t = (s: string) => s.trim();
  const {data} = await api.post<BasicResponse & {success?: boolean}>('api/company/update', {
    company_name: t(e.company_name),
    company_type: String(current.company_type ?? ''),
    business_type_id: num(current.business_type_id),
    registration_number: t(e.registration_number),
    gst_number: t(e.gst_number).toUpperCase(),
    pan_number: t(e.pan_number).toUpperCase(),
    address: t(e.address),
    city_id: num(current.city),
    state_id: num(current.state),
    country_id: num(current.country),
    pin: t(e.pin),
    bank_name: t(e.bank_name),
    account_number: t(e.account_number),
    ifsc_code: t(e.ifsc_code).toUpperCase(),
    no_of_employee: num(current.no_of_employee),
    status: String(current.status ?? '1'),
    email: t(e.email),
    mobile_no: String(current.mobile_no ?? ''),
  });
  return ensureOk(data);
}

const multipart = {headers: {'Content-Type': 'multipart/form-data'}, timeout: 90_000};

export async function uploadCompanyLogo(file: UploadFile) {
  const form = new FormData();
  form.append('image', file as unknown as Blob);
  const {data} = await api.post<BasicResponse & {success?: boolean}>('api/company/update', form, multipart);
  return ensureOk(data);
}

/** The company document types the old app used (api/upload-document's document_type_id). */
export const COMPANY_DOCUMENTS = [
  {id: 1, name: 'Registration certificate'},
  {id: 2, name: 'GST certificate'},
  {id: 3, name: 'PAN card'},
  {id: 4, name: 'Owner’s Aadhaar'},
  {id: 5, name: 'Bank statement'},
] as const;

export async function uploadCompanyDocument(typeId: number, file: UploadFile) {
  const form = new FormData();
  form.append('document_type_id[0]', String(typeId));
  form.append('document[0]', file as unknown as Blob);
  const {data} = await api.post<BasicResponse & {success?: boolean}>('api/upload-document', form, multipart);
  return ensureOk(data);
}

/** Permanently deletes the signed-in company's account. */
export async function deleteCompanyAccount() {
  const {data} = await api.post<BasicResponse & {success?: boolean}>('api/company/delete');
  return ensureOk(data);
}

export async function sendFeedback(by: {companyId: string} | {employeeId: number}, message: string) {
  const {data} = await api.post<BasicResponse & {success?: boolean}>('api/feedback', {
    ...('companyId' in by ? {company_id: by.companyId} : {employee_id: String(by.employeeId)}),
    message: message.trim(),
  });
  return ensureOk(data);
}

export type Referral = {
  id: number;
  company_name: string;
  company_code?: string | null;
  email?: string | null;
  mobile_no?: string | null;
};

export async function getReferrals() {
  const {data} = await api.post<
    BasicResponse & {referral_code?: string | null; referral_count?: number; referral_list?: Referral[]}
  >('api/referral-list');
  const body = ensureOk(data);
  return {code: body.referral_code ?? null, list: body.referral_list ?? []};
}
