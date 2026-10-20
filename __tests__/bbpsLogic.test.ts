import {
  amountError,
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
