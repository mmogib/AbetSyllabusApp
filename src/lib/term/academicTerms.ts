export interface TermOption {
  code: string;
  label: string;
}

interface AcademicTerm {
  startYear: number;
  sequence: 1 | 2 | 3;
}

const FALL_START_MONTH = 7;
const SPRING_START_MONTH = 0;
const SUMMER_START_MONTH = 5;
const TERM_START_DAY = 15;

function createBoundary(year: number, monthIndex: number): Date {
  return new Date(year, monthIndex, TERM_START_DAY, 0, 0, 0, 0);
}

function getAcademicTerm(date: Date): AcademicTerm {
  const year = date.getFullYear();
  const springStart = createBoundary(year, SPRING_START_MONTH);
  const summerStart = createBoundary(year, SUMMER_START_MONTH);
  const fallStart = createBoundary(year, FALL_START_MONTH);

  if (date >= fallStart) {
    return { startYear: year, sequence: 1 };
  }

  if (date >= summerStart) {
    return { startYear: year - 1, sequence: 3 };
  }

  if (date >= springStart) {
    return { startYear: year - 1, sequence: 2 };
  }

  return { startYear: year - 1, sequence: 1 };
}

function shiftAcademicTerm(term: AcademicTerm, offset: number): AcademicTerm {
  let startYear = term.startYear;
  let sequence = term.sequence + offset;

  while (sequence < 1) {
    startYear -= 1;
    sequence += 3;
  }

  while (sequence > 3) {
    startYear += 1;
    sequence -= 3;
  }

  return {
    startYear,
    sequence: sequence as 1 | 2 | 3,
  };
}

function getTermSeasonLabel(sequence: 1 | 2 | 3): string {
  if (sequence === 1) {
    return 'Fall';
  }

  if (sequence === 2) {
    return 'Spring';
  }

  return 'Summer';
}

function formatAcademicYearLabel(startYear: number): string {
  return `${startYear}-${startYear + 1}`;
}

function formatTermCode(term: AcademicTerm): string {
  return `${String(term.startYear).slice(-2)}${term.sequence}`;
}

export function getCurrentTermCode(now: Date = new Date()): string {
  return formatTermCode(getAcademicTerm(now));
}

export function getTermOptions(now: Date = new Date()): TermOption[] {
  const currentTerm = getAcademicTerm(now);

  return [-2, -1, 0, 1, 2].map((offset) => {
    const term = shiftAcademicTerm(currentTerm, offset);

    return {
      code: formatTermCode(term),
      label: `T${formatTermCode(term)} - ${getTermSeasonLabel(term.sequence)} ${formatAcademicYearLabel(term.startYear)}`,
    };
  });
}

export function buildAbetSyllabusFileName(termCode: string, courseNumber: string): string {
  const normalizedTermCode = termCode.replace(/[^0-9]/g, '').trim();
  const normalizedCourseNumber = courseNumber.replace(/[^A-Za-z0-9]/g, '').trim();

  if (normalizedTermCode === '' && normalizedCourseNumber === '') {
    return 'AbetSyllabus.docx';
  }

  return `T${normalizedTermCode}${normalizedCourseNumber}AbetSyllabus.docx`;
}
