import {
  amountError,
  choicesOf,
  needsOneOf,
  amountRule,
  fieldError,
  fieldsOf,
  rupeesFromPaise,
  shortBillerName,
} from '../src/features/bbps/bbpsLogic';

test('biller fields come as one object or a list', () => {
  const one = fieldsOf({
    paramName: 'Customer ID / Account ID',
    dataType: 'NUMERIC',
    isOptional: 'false',
    minLength: '1',
    maxLength: '10',
  });
  expect(one).toHaveLength(1);
  expect(one[0]).toMatchObject({numeric: true, optional: false, min: 1, max: 10});
  expect(fieldsOf([{paramName: 'A'}, {paramName: 'B', isOptional: 'true'}]).map(f => f.optional)).toEqual([
    false,
    true,
  ]);
  expect(fieldsOf(null)).toEqual([]);
  // A bad regEx from the server is ignored, not a crash.
  expect(fieldsOf({paramName: 'X', regEx: '(['})[0].pattern).toBeNull();
});

test('field checks', () => {
  const [f] = fieldsOf({paramName: 'Customer ID', dataType: 'NUMERIC', minLength: '4', maxLength: '10'});
  expect(fieldError(f, '')).toBe('Enter your Customer ID.');
  expect(fieldError(f, '12a4')).toBe('Numbers only.');
  expect(fieldError(f, '123')).toMatch(/At least 4/);
  expect(fieldError(f, '12345678901')).toMatch(/At most 10/);
  expect(fieldError(f, '1234567')).toBeNull();
});

test('amounts', () => {
  expect(rupeesFromPaise(123450)).toBe('₹1,234.50');
  expect(amountRule('Electricity', 'Exact', 50000)).toEqual({editable: false, min: 500});
  expect(amountRule('Electricity', 'Exact and above', 50000)).toEqual({editable: true, min: 500});
  expect(amountRule('DTH', 'Exact', 0)).toEqual({editable: true, min: 1});
  expect(amountError('499', {min: 500})).toMatch(/At least/);
  expect(amountError('500.555', {min: 1})).toMatch(/2 decimal/);
  expect(amountError('', {min: 1})).toBe('Enter an amount.');
  expect(amountError('750.5', {min: 500})).toBeNull();
});

test('short biller names', () => {
  expect(shortBillerName('Bangalore Electricity Supply Co. Ltd (BESCOM)')).toBe('BESCOM');
  expect(shortBillerName('Tata Play')).toBe('Tata Play');
});

test('fixed-choice fields, amount fields and either-or billers', () => {
  expect(choicesOf('^(Andhra Pradesh)$|^(Assam)$|^(West Bengal)$')).toEqual([
    'Andhra Pradesh',
    'Assam',
    'West Bengal',
  ]);
  expect(choicesOf('^(Delhi)$')).toEqual(['Delhi']);
  expect(choicesOf('^[0-9]{10}$')).toBeNull();
  expect(choicesOf('^[6-9][0-9]{9}$|^[0-9]{17}$')).toBeNull();
  const [amt] = fieldsOf({paramName: 'Amount', dataType: 'NUMERIC'});
  expect(amt.isAmount).toBe(true);
  const gas = fieldsOf([
    {paramName: 'LPG ID', isOptional: 'true'},
    {paramName: 'Registered Contact Number', isOptional: 'true'},
  ]);
  expect(needsOneOf(gas, {})).toMatch(/at least one/);
  expect(needsOneOf(gas, {'LPG ID': '12345678901234567'})).toBeNull();
});

test('values lists become dropdowns, hidden fields stay hidden', () => {
  const [, payType] = fieldsOf([
    {
      paramName: 'Application Id/Loan Account Number',
      dataType: 'ALPHANUMERIC',
      isOptional: 'true',
      minLength: '3',
      maxLength: '50',
    },
    {
      paramName: 'Application Payment Type',
      dataType: 'ALPHANUMERIC',
      isOptional: 'true',
      minLength: '0',
      maxLength: '0',
      values: 'Overdue Installment,Full Overdue,Advance EMI',
    },
  ]);
  expect(payType.choices).toEqual(['Overdue Installment', 'Full Overdue', 'Advance EMI']);
  expect(fieldError(payType, 'Full Overdue')).toBeNull();
  expect(fieldError(payType, 'Something else')).toMatch(/Choose/);
  const [hidden] = fieldsOf({paramName: 'Ref', visibility: 'false'});
  expect(hidden.visible).toBe(false);
});

test('date fields and field groups', () => {
  const {dateFormatOf, formatBillDate, groupError} = jest.requireActual('../src/features/bbps/bbpsLogic');
  expect(dateFormatOf('DOB of Student(DDMMYYYY)')).toBe('DDMMYYYY');
  expect(dateFormatOf('Date of Birth (DD-MM-YYYY)')).toBe('DD-MM-YYYY');
  expect(dateFormatOf('Loan Account Number')).toBeNull();
  expect(formatBillDate('2009-04-07', 'DDMMYYYY')).toBe('07042009');
  expect(formatBillDate('2009-04-07', 'DD-MM-YYYY')).toBe('07-04-2009');
  const hero = [{input: 2, params: ['Application Id/Loan Account Number', 'Application Payment Type']}];
  expect(groupError(hero, {'Application Id/Loan Account Number': 'ABC123'})).toMatch(/and/);
  expect(
    groupError(hero, {
      'Application Id/Loan Account Number': 'ABC123',
      'Application Payment Type': 'Full Overdue',
    }),
  ).toBeNull();
});
