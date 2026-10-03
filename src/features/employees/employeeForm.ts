import type {EmployeeProfile} from '../../api/types';
import type {EmployeeUpdateBody} from '../../api/endpoints/employees';
import {toDateKey} from '../../lib/date';

/** "+91 75012 19386", "075012-19386" → "7501219386". */
export function normalizePhone(input: string) {
  const digits = input.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return digits.slice(1);
  }
  return digits;
}

/** An error for an Indian mobile number, or null when it's fine. */
export function phoneError(input: string) {
  const p = normalizePhone(input);
  if (!p) {
    return 'Add their mobile number.';
  }
  if (p.length !== 10) {
    return 'A mobile number has 10 digits.';
  }
  if (!/^[6-9]/.test(p)) {
    return 'Indian mobile numbers start with 6, 7, 8 or 9.';
  }
  return null;
}

export function emailError(input: string) {
  const e = input.trim();
  return !e || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? null : 'That email doesn’t look right.';
}

/** "75012 19386" */
export const formatPhone = (p: string) => (p.length === 10 ? `${p.slice(0, 5)} ${p.slice(5)}` : p);

/** A gentle warning for joining dates that are probably typos. */
export function joiningDateWarning(dateKey: string, now = new Date()) {
  if (!dateKey) {
    return null;
  }
  const today = toDateKey(now);
  if (dateKey > today) {
    const ahead = Math.round((Date.parse(dateKey) - Date.parse(today)) / 86_400_000);
    return ahead > 90 ? 'That’s more than three months away.' : null;
  }
  const years = (Date.parse(today) - Date.parse(dateKey)) / (365.25 * 86_400_000);
  return years >= 20 ? `Looks unusual: ${Math.floor(years)} years ago.` : null;
}

/** Everything the edit form can change. */
export type EmployeeEdit = {
  name: string;
  phone: string;
  email: string;
  gender: string;
  date_of_birth: string;
  blood_group: string;
  marital_status: string;
  guardian_name: string;
  address: string;
  position: string;
  date_of_joining: string;
  official_email_id: string;
  salary: string;
  pf_number: string;
  esi_number: string;
};

const s = (v: unknown) => (v == null ? '' : String(v));

export function editFromProfile(p: EmployeeProfile): EmployeeEdit {
  return {
    name: s(p.name),
    phone: s(p.phone),
    email: s(p.email),
    gender: s(p.gender).toLowerCase(),
    date_of_birth: s(p.date_of_birth).slice(0, 10),
    blood_group: s(p.blood_group),
    marital_status: s(p.marital_status).toLowerCase(),
    guardian_name: s(p.guardian_name),
    address: s(p.address),
    position: s(p.position),
    date_of_joining: s(p.date_of_joining).slice(0, 10),
    official_email_id: s(p.official_email_id),
    salary: Number(p.salary) > 0 ? String(Number(p.salary)) : '',
    pf_number: s(p.pf_number),
    esi_number: s(p.esi_number),
  };
}

const orNull = (v: string) => (v.trim() ? v.trim() : null);
const idOrNull = (v: unknown) => {
  const n = Number(v);
  return v == null || v === '' || !Number.isFinite(n) || n === 0 ? null : n;
};

/**
 * employees-update replaces the whole profile, so send every field: the edits on
 * top of the current profile, never just the changes.
 */
export function buildUpdateBody(profile: EmployeeProfile, edit: EmployeeEdit): EmployeeUpdateBody {
  return {
    name: edit.name.trim(),
    email: edit.email.trim(),
    phone: normalizePhone(edit.phone),
    position: edit.position.trim(),
    salary: edit.salary.trim() ? String(Number(edit.salary)) : '0',
    marital_status: orNull(edit.marital_status),
    guardian_name: orNull(edit.guardian_name),
    blood_group: orNull(edit.blood_group),
    date_of_joining: orNull(edit.date_of_joining),
    date_of_birth: orNull(edit.date_of_birth),
    gender: orNull(edit.gender),
    address: orNull(edit.address),
    country: idOrNull(profile.country),
    state: idOrNull(profile.state),
    city: idOrNull(profile.city),
    job_title_id: idOrNull(profile.job_title_id),
    employee_type_id: idOrNull(profile.employee_type_id),
    official_email_id: orNull(edit.official_email_id),
    pf_number: orNull(edit.pf_number),
    esi_number: orNull(edit.esi_number),
    date_of_leaving: orNull(s(profile.date_of_leaving)),
  };
}

/** Problems that block saving, keyed by field. */
export function editErrors(
  edit: Pick<EmployeeEdit, 'name' | 'phone' | 'email' | 'salary'> & {official_email_id?: string},
) {
  const errors: Partial<Record<'name' | 'phone' | 'email' | 'official_email_id' | 'salary', string>> = {};
  if (!edit.name.trim()) {
    errors.name = 'Add their name.';
  }
  const phone = phoneError(edit.phone);
  if (phone) {
    errors.phone = phone;
  }
  const email = emailError(edit.email);
  if (email) {
    errors.email = email;
  }
  const official = emailError(edit.official_email_id ?? '');
  if (official) {
    errors.official_email_id = official;
  }
  if (edit.salary.trim() && !(Number(edit.salary) >= 0)) {
    errors.salary = 'Enter an amount in rupees.';
  }
  return errors;
}
