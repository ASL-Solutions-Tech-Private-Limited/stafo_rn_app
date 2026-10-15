import {companyErrors, confirmsName, maskAccount} from '../src/features/profile/accountLogic';

const ok = {
  company_name: 'Jio for Nikhil',
  email: '',
  gst_number: '',
  pan_number: '',
  pin: '',
  ifsc_code: '',
  account_number: '',
};

describe('company profile checks', () => {
  it('needs only a name; optional fields may be empty', () => {
    expect(companyErrors(ok)).toEqual({});
    expect(companyErrors({...ok, company_name: ' '})).toEqual({company_name: 'Enter the company name.'});
  });
  it('checks GST, PAN, PIN, IFSC, account and email when given', () => {
    const good = {
      ...ok,
      email: 'a@b.in',
      gst_number: '19aaaaa0000a1z5',
      pan_number: 'aaaaa0000a',
      pin: '700032',
      ifsc_code: 'hdfc0001234',
      account_number: '50100012344521',
    };
    expect(companyErrors(good)).toEqual({});
    const bad = companyErrors({
      ...ok,
      email: 'a@b',
      gst_number: '19AAAAA0000',
      pan_number: 'AAAA0000A',
      pin: '70003',
      ifsc_code: 'HDFC1001234',
      account_number: '1234',
    });
    expect(Object.keys(bad).sort()).toEqual([
      'account_number',
      'email',
      'gst_number',
      'ifsc_code',
      'pan_number',
      'pin',
    ]);
  });
  it('masks the account number and confirms the typed name', () => {
    expect(maskAccount('50100012344521')).toBe('•••• 4521');
    expect(confirmsName('  jio  for nikhil ', 'Jio for Nikhil')).toBe(true);
    expect(confirmsName('Jio', 'Jio for Nikhil')).toBe(false);
    expect(confirmsName('', '')).toBe(false);
  });
});

import {initialsOf} from '../src/lib/initials';

test('initials skip brackets and dots', () => {
  expect(initialsOf('ASL SOLUTION TECH PVT. LTD. (JADAVPUR)')).toBe('AJ');
  expect(initialsOf('Hamid')).toBe('H');
  expect(initialsOf('  ')).toBe('?');
});
