import {
  buildAbetSyllabusFileName,
  getCurrentTermCode,
  getTermOptions,
} from '../../src/lib/term/academicTerms';

test('computes the current term code across academic year boundaries', () => {
  expect(getCurrentTermCode(new Date('2025-09-01T12:00:00Z'))).toBe('251');
  expect(getCurrentTermCode(new Date('2026-04-03T12:00:00Z'))).toBe('252');
  expect(getCurrentTermCode(new Date('2026-07-01T12:00:00Z'))).toBe('253');
  expect(getCurrentTermCode(new Date('2026-08-20T12:00:00Z'))).toBe('261');
});

test('builds two previous and two next term options around the current term', () => {
  expect(
    getTermOptions(new Date('2026-04-03T12:00:00Z')).map((option) => option.code),
  ).toEqual(['243', '251', '252', '253', '261']);
});

test('formats the final downloaded docx file name', () => {
  expect(buildAbetSyllabusFileName('252', 'MATH 101')).toBe(
    'T252MATH101AbetSyllabus.docx',
  );
  expect(buildAbetSyllabusFileName('261', ' ICS-485 ')).toBe(
    'T261ICS485AbetSyllabus.docx',
  );
});
