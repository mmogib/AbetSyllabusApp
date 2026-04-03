import { joinPdfTextItems } from '../../src/lib/extract/pdfText';

test('preserves line boundaries from PDF text items', () => {
  expect(
    joinPdfTextItems([
      { str: 'Course Title', hasEOL: false },
      { str: 'Intro to Academic Discourse', hasEOL: true },
      { str: 'Course Code', hasEOL: false },
      { str: 'ENGL101', hasEOL: true },
    ]),
  ).toBe(
    ['Course Title Intro to Academic Discourse', 'Course Code ENGL101'].join('\n'),
  );
});

test('preserves line boundaries when PDF emits empty end-of-line markers', () => {
  expect(
    joinPdfTextItems([
      { str: 'Course Title', hasEOL: false },
      { str: 'Business & Entrepreneurship', hasEOL: false },
      { str: '', hasEOL: true },
      { str: 'Course Code', hasEOL: false },
      { str: 'BUS200', hasEOL: false },
      { str: '', hasEOL: true },
      { str: 'Department', hasEOL: false },
      { str: 'Management & Marketing Dept.', hasEOL: false },
    ]),
  ).toBe(
    [
      'Course Title Business & Entrepreneurship',
      'Course Code BUS200',
      'Department Management & Marketing Dept.',
    ].join('\n'),
  );
});

test('does not insert spaces inside words when PDF splits ligatures into separate items', () => {
  expect(
    joinPdfTextItems([
      {
        str: 'fi',
        hasEOL: false,
        width: 5.661,
        transform: [1, 0, 0, 1, 339.477, 409.769531],
      },
      {
        str: 'nancial statements and analysis;',
        hasEOL: true,
        width: 147.582,
        transform: [1, 0, 0, 1, 345.471, 409.769531],
      },
      {
        str: 'Course Code',
        hasEOL: false,
        width: 63.81,
        transform: [1, 0, 0, 1, 120.378906, 616.75],
      },
      {
        str: 'BUS200',
        hasEOL: false,
        width: 36.45,
        transform: [1, 0, 0, 1, 357.640625, 616.75],
      },
    ]),
  ).toBe(['financial statements and analysis;', 'Course Code BUS200'].join('\n'));
});
