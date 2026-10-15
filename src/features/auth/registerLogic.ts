import type {KycType} from '../../api/endpoints/register';

export const MOBILE_PATTERN = /^[6-9]\d{9}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type BusinessStep = {
  companyName: string;
  companyTypeId: number | null;
  businessTypeId: number | null;
  email: string;
};
export type DetailsStep = {ownerName: string; mobile: string};

/** Step 1 of sign-up: everything the old app required, plus the email the server requires. */
export function businessErrors(s: BusinessStep): Record<string, string> {
  const e: Record<string, string> = {};
  if (s.companyName.trim().length < 2) {
    e.companyName = 'Enter your company name.';
  }
  if (s.companyTypeId == null) {
    e.companyTypeId = 'Choose a company type.';
  }
  if (s.businessTypeId == null) {
    e.businessTypeId = 'Choose a business type.';
  }
  if (!EMAIL.test(s.email.trim())) {
    e.email = 'Enter a valid email address.';
  }
  return e;
}

export function detailsErrors(s: DetailsStep): Record<string, string> {
  const e: Record<string, string> = {};
  if (s.ownerName.trim().length < 2) {
    e.ownerName = 'Enter your name.';
  }
  if (!MOBILE_PATTERN.test(s.mobile)) {
    e.mobile = 'Enter a valid 10-digit mobile number.';
  }
  return e;
}

/** Normalises what was typed for each document: upper case, no spaces. */
export function cleanKyc(type: KycType, raw: string) {
  const s = raw.toUpperCase().replace(/\s+/g, '');
  return type === 'aadhar' ? s.replace(/\D/g, '').slice(0, 12) : s;
}

const KYC_PATTERNS: Record<KycType, RegExp> = {
  pan: /^[A-Z]{5}\d{4}[A-Z]$/,
  gstin: /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/,
  // CIN (21 characters), LLPIN (AAA-1234) or another registration number.
  company: /^[A-Z0-9-]{6,25}$/,
  aadhar: /^[2-9]\d{11}$/,
};

const KYC_HINTS: Record<KycType, string> = {
  pan: 'A PAN looks like ABCDE1234F.',
  gstin: 'A GSTIN has 15 characters, like 19ABCDE1234F1Z5.',
  company: 'Enter the CIN or LLPIN, letters and numbers only.',
  aadhar: 'An Aadhaar number has 12 digits.',
};

export function kycError(type: KycType, value: string): string | null {
  return KYC_PATTERNS[type].test(cleanKyc(type, value)) ? null : KYC_HINTS[type];
}

export function maskAadhaar(n: string) {
  const d = n.replace(/\D/g, '');
  return d.length >= 4 ? `XXXX XXXX ${d.slice(-4)}` : d;
}
