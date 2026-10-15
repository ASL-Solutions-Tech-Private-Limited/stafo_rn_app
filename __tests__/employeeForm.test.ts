import type {EmployeeProfile} from '../src/api/types';
import {
  buildUpdateBody,
  editErrors,
  editFromProfile,
  joiningDateWarning,
  normalizePhone,
  phoneError,
} from '../src/features/employees/employeeForm';

describe('phone', () => {
  it('normalises common ways of typing a number', () => {
    expect(normalizePhone('+91 75012 19386')).toBe('7501219386');
    expect(normalizePhone('075012-19386')).toBe('7501219386');
    expect(normalizePhone('7501219386')).toBe('7501219386');
  });
  it('explains what is wrong', () => {
    expect(phoneError('')).toBe('Add their mobile number.');
    expect(phoneError('75012')).toBe('A mobile number has 10 digits.');
    expect(phoneError('1234567890')).toBe('Indian mobile numbers start with 6, 7, 8 or 9.');
    expect(phoneError('+91 98765 43210')).toBeNull();
  });
});

describe('joiningDateWarning', () => {
  const now = new Date(2026, 9, 1);
  it("flags Hamid's 1998 joining date but not normal ones", () => {
    expect(joiningDateWarning('1998-08-01', now)).toBe('Looks unusual: 28 years ago.');
    expect(joiningDateWarning('2025-03-18', now)).toBeNull();
    expect(joiningDateWarning('2026-10-15', now)).toBeNull();
    expect(joiningDateWarning('2027-06-01', now)).toBe('That’s more than three months away.');
  });
});

describe('update body', () => {
  // Hamid Test's real profile (employee-details/91).
  const hamid = {
    id: 91,
    company_id: 1,
    name: 'Hamid Test',
    email: 'hamid324@gmail.com',
    phone: '7501219386',
    position: 'Android App Developer Native',
    salary: '12000.00',
    marital_status: 'single',
    guardian_name: null,
    blood_group: 'O+',
    date_of_joining: '1998-08-01',
    date_of_birth: null,
    gender: 'male',
    address: 'Chinar park,Kolkata',
    country: null,
    state: null,
    city: null,
    job_title_id: null,
    employee_type_id: null,
    official_email_id: null,
    pf_number: null,
    esi_number: null,
    date_of_leaving: null,
  } as EmployeeProfile;

  it('round-trips an untouched profile without losing anything', () => {
    expect(buildUpdateBody(hamid, editFromProfile(hamid))).toEqual({
      name: 'Hamid Test',
      email: 'hamid324@gmail.com',
      phone: '7501219386',
      position: 'Android App Developer Native',
      salary: '12000',
      marital_status: 'single',
      guardian_name: null,
      blood_group: 'O+',
      date_of_joining: '1998-08-01',
      date_of_birth: null,
      gender: 'male',
      address: 'Chinar park,Kolkata',
      country: null,
      state: null,
      city: null,
      job_title_id: null,
      employee_type_id: null,
      official_email_id: null,
      pf_number: null,
      esi_number: null,
      date_of_leaving: null,
    });
  });

  it('applies edits and keeps fields the form does not show', () => {
    const body = buildUpdateBody(
      {...hamid, city: 5, job_title_id: 3},
      {...editFromProfile(hamid), pf_number: ' KN/12345 ', salary: ''},
    );
    expect(body.pf_number).toBe('KN/12345');
    expect(body.salary).toBe('0');
    expect(body.city).toBe(5);
    expect(body.job_title_id).toBe(3);
    expect(body.name).toBe('Hamid Test');
  });
});

describe('editErrors', () => {
  it('blocks a missing name, a bad phone and a bad email', () => {
    expect(editErrors({name: ' ', phone: '123', email: 'nope', salary: '12000'})).toEqual({
      name: 'Add their name.',
      phone: 'A mobile number has 10 digits.',
      email: 'That email doesn’t look right.',
    });
    expect(editErrors({name: 'A', phone: '9876543210', email: '', salary: ''})).toEqual({});
  });
});
