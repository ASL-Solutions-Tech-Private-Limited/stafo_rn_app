/** Field checks for the company profile form; empty optional fields are fine. */

const GST = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const PAN = /^[A-Z]{5}\d{4}[A-Z]$/;
const IFSC = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function companyErrors(e: {
  company_name: string;
  email: string;
  gst_number: string;
  pan_number: string;
  pin: string;
  ifsc_code: string;
  account_number: string;
}) {
  const up = (s: string) => s.trim().toUpperCase();
  const errors: Record<string, string> = {};
  if (!e.company_name.trim()) {
    errors.company_name = 'Enter the company name.';
  }
  if (e.email.trim() && !EMAIL.test(e.email.trim())) {
    errors.email = 'That email doesn’t look right.';
  }
  if (e.gst_number.trim() && !GST.test(up(e.gst_number))) {
    errors.gst_number = 'A GSTIN has 15 characters, like 19ABCDE1234F1Z5.';
  }
  if (e.pan_number.trim() && !PAN.test(up(e.pan_number))) {
    errors.pan_number = 'A PAN looks like ABCDE1234F.';
  }
  if (e.pin.trim() && !/^\d{6}$/.test(e.pin.trim())) {
    errors.pin = 'A PIN code has 6 digits.';
  }
  if (e.ifsc_code.trim() && !IFSC.test(up(e.ifsc_code))) {
    errors.ifsc_code = 'An IFSC looks like HDFC0001234.';
  }
  if (e.account_number.trim() && !/^\d{9,18}$/.test(e.account_number.trim())) {
    errors.account_number = 'Account numbers have 9 to 18 digits.';
  }
  return errors;
}

/** "50100012344521" → "•••• 4521". */
export const maskAccount = (n?: string | null) => (n && n.length > 4 ? `•••• ${n.slice(-4)}` : n ?? '');

/** The delete button works only when the typed name matches (case and extra spaces ignored). */
export const confirmsName = (typed: string, name: string) =>
  typed.trim().replace(/\s+/g, ' ').toLowerCase() === name.trim().replace(/\s+/g, ' ').toLowerCase() &&
  name.trim().length > 0;
