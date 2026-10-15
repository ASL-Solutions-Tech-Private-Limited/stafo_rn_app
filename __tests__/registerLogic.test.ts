import {
  businessErrors,
  cleanKyc,
  detailsErrors,
  kycError,
  maskAadhaar,
} from '../src/features/auth/registerLogic';

test('business step needs name, both types and a real email', () => {
  expect(businessErrors({companyName: '', companyTypeId: null, businessTypeId: null, email: 'x'})).toEqual({
    companyName: expect.any(String),
    companyTypeId: expect.any(String),
    businessTypeId: expect.any(String),
    email: expect.any(String),
  });
  expect(
    businessErrors({companyName: 'Sharma Textiles', companyTypeId: 2, businessTypeId: 3, email: 'a@b.in'}),
  ).toEqual({});
});

test('details step needs an owner name and an Indian mobile', () => {
  expect(Object.keys(detailsErrors({ownerName: 'R', mobile: '12345'}))).toEqual(['ownerName', 'mobile']);
  expect(detailsErrors({ownerName: 'Rakesh', mobile: '9830012345'})).toEqual({});
});

test('document formats', () => {
  expect(kycError('pan', 'abcde1234f')).toBeNull();
  expect(kycError('pan', 'ABCD1234F')).not.toBeNull();
  expect(kycError('gstin', '19abcde1234f1z5')).toBeNull();
  expect(kycError('gstin', '19ABCDE1234F1X5')).not.toBeNull();
  expect(kycError('company', 'U72900WB2020PTC123456')).toBeNull();
  expect(kycError('company', 'AAB-1234')).toBeNull();
  expect(kycError('aadhar', '2345 6789 0123')).toBeNull();
  expect(kycError('aadhar', '1234 5678 9012')).not.toBeNull();
});

test('cleaning and masking', () => {
  expect(cleanKyc('pan', ' abcde 1234f ')).toBe('ABCDE1234F');
  expect(cleanKyc('aadhar', '2345-6789-0123-99')).toBe('234567890123');
  expect(maskAadhaar('234567890123')).toBe('XXXX XXXX 0123');
});
