jest.mock('@react-native-documents/picker', () => ({}));
jest.mock('../src/components/ui', () => ({toast: {error: jest.fn()}}));
import {uploadName} from '../src/features/tasks/pickFiles';

describe('uploadName', () => {
  it('keeps names that already have an extension', () => {
    expect(uploadName('stock sheet.pdf', 'application/pdf', 0)).toBe('stock sheet.pdf');
  });
  it('adds one from the type (the old app’s files without one 404)', () => {
    expect(uploadName('task_01751895128.', 'image/jpeg', 0)).toBe('task_01751895128.jpg');
    expect(uploadName('IMG_2041', 'image/heic', 0)).toBe('IMG_2041.heic');
    expect(uploadName(null, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 2)).toBe(
      'file-3.xlsx',
    );
    expect(uploadName('notes', null, 0)).toBe('notes.bin');
  });
});
