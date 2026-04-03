import { normalizeText } from '../../src/lib/extract/normalizeText';

test('normalizes repeated whitespace and line endings', () => {
  expect(normalizeText('A\r\n\r\nB   C')).toBe('A\n\nB C');
});
