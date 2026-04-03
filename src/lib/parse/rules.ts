export type ParsedFieldRule = {
  labels: readonly string[];
};

export const courseTitleRule: ParsedFieldRule = {
  labels: ['Course Title'],
};

export const courseNumberRule: ParsedFieldRule = {
  labels: ['Course Code'],
};

export const departmentRule: ParsedFieldRule = {
  labels: ['Department'],
};

export const instructorRule: ParsedFieldRule = {
  labels: ['Course Instructor/Coordinator'],
};

export const catalogDescriptionRule: ParsedFieldRule = {
  labels: [
    'Catalog Course Description',
    'Course Catalog Description',
    'Course Catalog Description (General description in the form used in Bulletin)',
  ],
};

export const prerequisitesRule: ParsedFieldRule = {
  labels: [
    'Course Pre-requisites',
    'Pre-requisites for this course (if any)',
    'Pre-requisites',
  ],
};

export const corequisitesRule: ParsedFieldRule = {
  labels: ['Course Co-requisites', 'Co-requisites for this course (if any)', 'Co-requisites'],
};

export const creditsRule: ParsedFieldRule = {
  labels: ['Course Credit Hours'],
};

export const textbookRule: ParsedFieldRule = {
  labels: ['Required Textbooks', 'List Required Textbooks'],
};

export const supplementalMaterialsRule: ParsedFieldRule = {
  labels: [
    'Essential References Materials',
    'List Essential References Materials (Journals, Reports, etc.)',
    'Recommended Reference Material',
    'List Recommended Textbooks and Reference Material (Journals, Reports, etc)',
    'Other Learning Material',
    'Other learning material such as computer-based software, professional standards or regulations and software.',
  ],
};
