import { parseCourseSpec } from '../../src/lib/parse/courseSpecParser';

function expectIdentity(
  draft: ReturnType<typeof parseCourseSpec>,
  expected: {
    courseTitle: string;
    courseNumber: string;
    department: string;
    instructorName: string;
    catalogDescription: string;
    prerequisites?: string;
    creditsText?: string;
    creditsCategorization?: {
      mathAndBasicSciences: string;
      engineeringTopics: string;
      other: string;
    };
    textbook?: string;
    supplementalMaterials?: string;
  },
) {
  expect(draft.courseIdentity.courseTitle).toBe(expected.courseTitle);
  expect(draft.courseIdentity.courseNumber).toBe(expected.courseNumber);
  expect(draft.courseIdentity.department).toBe(expected.department);
  expect(draft.courseIdentity.instructorName).toBe(expected.instructorName);
  expect(draft.courseIdentity.creditsText).toBe(expected.creditsText ?? '');
  expect(draft.courseIdentity.creditsCategorization).toEqual(
    expected.creditsCategorization ?? {
      mathAndBasicSciences: '',
      engineeringTopics: '',
      other: '',
    },
  );
  expect(draft.courseInformation.catalogDescription).toBe(
    expected.catalogDescription,
  );
  expect(draft.courseInformation.prerequisites).toBe(
    expected.prerequisites ?? '',
  );
  expect(draft.materials.textbook).toBe(expected.textbook ?? '');
  expect(draft.materials.supplementalMaterials).toBe(
    expected.supplementalMaterials ?? '',
  );
}

test('extracts identity fields from DOCX-style flattened extracted text', () => {
  const text = `
Course Title: Probability for Data Science
Course Code: DATA 201
Department: Mathematics
Course Instructor/Coordinator: Dr. Mohammed Alshahrani
1. Catalog Course Description (General description in the form used in Bulletin)
An introduction to probability and statistics for data science.
4. Pre-requisites for this course (if any): STAT 201 and (MATH 208 or MATH 225)
1. List Required Textbooks
"Introduction to Probability for Data Science" by Stanley H. Chan (2021)
  `;

  const draft = parseCourseSpec(text);

  expectIdentity(draft, {
    courseTitle: 'Probability for Data Science',
    courseNumber: 'DATA 201',
    department: 'Mathematics',
    instructorName: 'Dr. Mohammed Alshahrani',
    catalogDescription: 'An introduction to probability and statistics for data science.',
    prerequisites: 'STAT 201 and (MATH 208 or MATH 225)',
    textbook: '"Introduction to Probability for Data Science" by Stanley H. Chan (2021)',
  });
});

test('extracts identity fields from PDF-style flattened extracted text', () => {
  const text = `
Course Title                                    Machine Learning
Course Code                                          ICS485
Department                                Info. & Computer Science Dept.
Course Instructor/Coordinator: Wasfi Al-Khatib
1. Course Credit Hours:
3-0-3
1. Subject Area Credit Hours:
Engineering / Computer Science Mathematics/Science Humanities
3.00 0 0
Business General Education Other Subject Areas
0 0 0
2. Course Pre-requisites:
• COE 292: Introduction to AI
• MATH 208: Intro. Diff. Eq & Lin. Algebra
1. Course Catalog Description: Essential foundations of machine learning; supervised learning.
1. Required Textbooks:
None
  `;

  const draft = parseCourseSpec(text);

  expectIdentity(draft, {
    courseTitle: 'Machine Learning',
    courseNumber: 'ICS485',
    department: 'Info. & Computer Science Dept.',
    instructorName: 'Wasfi Al-Khatib',
    catalogDescription: 'Essential foundations of machine learning; supervised learning.',
    prerequisites:
      'COE 292: Introduction to AI MATH 208: Intro. Diff. Eq & Lin. Algebra',
    creditsText: '3-0-3',
    creditsCategorization: {
      mathAndBasicSciences: '0',
      engineeringTopics: '3',
      other: '0',
    },
    textbook: 'None',
  });
  expect(draft.courseInformation.corequisites).toBe('');
});

test('derives credits categorization from DOCX-style area credit hours', () => {
  const text = `
Course Title: Probability for Data Science
Course Code: DATA 201
Department: Mathematics
Course Instructor/Coordinator: Dr. Mohammed Alshahrani
1. Course Credit Hours:
3-0-3
Area Credit Hours
(Indicate the number of credit hours against the classification below; do not exceed the course credit hours)
Engineering/Computer Science
Mathematics/ Science
Business
General Education / Social Sciences / Humanities
Other
0
3
0
0
0
1. Catalog Course Description (General description in the form used in Bulletin)
An introduction to probability and statistics for data science.
4. Pre-requisites for this course (if any): STAT 201 and (MATH 208 or MATH 225)
1. List Required Textbooks
"Introduction to Probability for Data Science" by Stanley H. Chan (2021)
  `;

  const draft = parseCourseSpec(text);

  expectIdentity(draft, {
    courseTitle: 'Probability for Data Science',
    courseNumber: 'DATA 201',
    department: 'Mathematics',
    instructorName: 'Dr. Mohammed Alshahrani',
    catalogDescription: 'An introduction to probability and statistics for data science.',
    prerequisites: 'STAT 201 and (MATH 208 or MATH 225)',
    creditsText: '3-0-3',
    creditsCategorization: {
      mathAndBasicSciences: '3',
      engineeringTopics: '0',
      other: '0',
    },
    textbook: '"Introduction to Probability for Data Science" by Stanley H. Chan (2021)',
  });
});

test('derives credits categorization from sparse DOCX row output with preserved empty cells', () => {
  const text = `
Course Title: Calculus I
Course Code: MATH 101
Department: Mathematics
Course Instructor/Coordinator: Dr. Example
1. Course Credit Hours:
4-0-4
1. Subject Area Credit Hours
Engineering/Computer Science
Mathematics/ Science
Business
General Education / Social Sciences / Humanities
Other
Engineering/Computer Science ||| Mathematics/ Science ||| Business ||| General Education / Social Sciences / Humanities ||| Other
||| 4 |||  |||  |||
1. Catalog Course Description:
Introduction to differential calculus.
  `;

  const draft = parseCourseSpec(text);

  expect(draft.courseIdentity.creditsCategorization).toEqual({
    mathAndBasicSciences: '4',
    engineeringTopics: '0',
    other: '0',
  });
});

test('does not double-count credits when the delimited value row comes after individual value lines', () => {
  const text = `
Course Title: Numerical Computing
Course Code: MATH371
Department: Mathematics
Course Instructor/Coordinator: Dr. Example
1. Subject Area Credit Hours (Indicate the number of credit hours against the classification below; do not exceed the course credit hours)
Engineering/Computer Science
Mathematics/ Science
Business
General Education/ Social Sciences/ Humanities
Other
Engineering/Computer Science ||| Mathematics/ Science ||| Business ||| General Education/ Social Sciences/ Humanities ||| Other
0
3
0
0
0
0 ||| 3 ||| 0 ||| 0 ||| 0
2. Topics to be Covered
  `;

  const draft = parseCourseSpec(text);

  expect(draft.courseIdentity.creditsCategorization).toEqual({
    mathAndBasicSciences: '3',
    engineeringTopics: '0',
    other: '0',
  });
});

test('extracts identity fields from the ENGL-style PDF layout', () => {
  const text = `
COURSE SPECIFICATIONS

Course Title Intro to Academic Discourse
Course Code ENGL101
Department English Language Dept.

Prepared by
Course Instructor/Coordinator: Dawn Booth

B. COURSE DESCRIPTION, OBJECTIVES:

1. Course Catalog Description:

Introduction to academic reading, writing, and vocabulary. Students are exposed to reading texts of various genres.
2. Course Pre-requisites:
• PYP 004: Preparatory Engineering Tech.
1. Required Textbooks:
• Q: Skills for Success Level 4 Reading and Writing
  `;

  const draft = parseCourseSpec(text);

  expectIdentity(draft, {
    courseTitle: 'Intro to Academic Discourse',
    courseNumber: 'ENGL101',
    department: 'English Language Dept.',
    instructorName: 'Dawn Booth',
    catalogDescription:
      'Introduction to academic reading, writing, and vocabulary. Students are exposed to reading texts of various genres.',
    prerequisites: 'PYP 004: Preparatory Engineering Tech.',
    textbook: 'Q: Skills for Success Level 4 Reading and Writing',
  });
});

test('extracts instructor name when the source uses Course Instructor without coordinator', () => {
  const text = `
Course Title: Number Theory
Course Code: Math427
Department: Mathematics
Prepared by
Course Instructor: Dr. Ibrahim Al-Rasasi Signature: Ibrahim Al-Rasasi
1. Catalog Course Description (General description in the form used in Bulletin)
Introduction to number theory.
  `;

  const draft = parseCourseSpec(text);

  expectIdentity(draft, {
    courseTitle: 'Number Theory',
    courseNumber: 'Math427',
    department: 'Mathematics',
    instructorName: 'Dr. Ibrahim Al-Rasasi',
    catalogDescription: 'Introduction to number theory.',
  });
});

test('does not parse near-miss labels as field values', () => {
  const text = `
Course Title CLO Mapping
Department Mission
Course Code:
Course Instructor/Coordinator:
  `;

  const draft = parseCourseSpec(text);

  expect(draft.courseIdentity.courseTitle).toBe('');
  expect(draft.courseIdentity.department).toBe('');
  expect(draft.courseIdentity.courseNumber).toBe('');
  expect(draft.courseIdentity.instructorName).toBe('');
});

test('extracts topics and learning outcomes from structured course-spec sections', () => {
  const text = `
3. Map Course-level Student Learning Outcomes (CLOs) to the Program-level Student Learning Outcomes (PLOs)*.
Code
CLOs
1
Knowledge and Understanding
1.1
Explain key concepts of probability, including discrete and continuous distributions.
1.2
Describe the principles of Markov chains and Bayesian approaches.

C. COURSE CONTENT
2. Topics to be Covered
No
List of Topics
Contact hours
1
Mathematical Background: Sets, Series, and Combinatorics
3
2
Discrete Probability and Random Variables
4

F. Learning Resources and Facilities
  `;

  const draft = parseCourseSpec(text);

  expect(draft.learningOutcomes).toEqual([
    {
      outcomeCode: '1.1',
      clo: 'Explain key concepts of probability, including discrete and continuous distributions.',
    },
    {
      outcomeCode: '1.2',
      clo: 'Describe the principles of Markov chains and Bayesian approaches.',
    },
  ]);
  expect(draft.topics).toEqual([
    {
      title: 'Mathematical Background: Sets, Series, and Combinatorics',
      durationText: '3',
    },
    {
      title: 'Discrete Probability and Random Variables',
      durationText: '4',
    },
  ]);
});

test('ignores synthetic docx row lines in topics so titles do not contain delimiters', () => {
  const text = `
2. Topics to be Covered
No
List of Topics
Contact hours
No ||| List of Topics ||| Contact hours
1
Differential Equations & Mathematical Models, Integrals as General & Particular Solutions, Separable Equations & Applications, Linear First-Order Equations, Substitution Methods & Exact Equations
10
1 ||| Differential Equations & Mathematical Models, Integrals as General & Particular Solutions, Separable Equations & Applications, Linear First-Order Equations, Substitution Methods & Exact Equations ||| 10
2
Introduction to Linear Systems, Matrices and Gaussian Elimination, Reduced Row-Echelon Matrices, Matrix Operations
2
2 ||| Introduction to Linear Systems, Matrices and Gaussian Elimination, Reduced Row-Echelon Matrices, Matrix Operations ||| 2

F. Learning Resources and Facilities
  `;

  const draft = parseCourseSpec(text);

  expect(draft.topics).toEqual([
    {
      title:
        'Differential Equations & Mathematical Models, Integrals as General & Particular Solutions, Separable Equations & Applications, Linear First-Order Equations, Substitution Methods & Exact Equations',
      durationText: '10',
    },
    {
      title:
        'Introduction to Linear Systems, Matrices and Gaussian Elimination, Reduced Row-Echelon Matrices, Matrix Operations',
      durationText: '2',
    },
  ]);
});

test('extracts learning outcomes when the CLO mapping heading is split across lines', () => {
  const text = `
3. Student Learning Outcomes (CLOs) Mapping to the Program-level Student Learning
Outcomes (PLOs) :

Code CLO PLO's Code
1 Knowledge and Understanding
1.1
Describe the technical, economical, legal and socio-cultural context of the business environment

1.2
Demonstrate an understanding of the functions and strategies to successfully manage organizations and work effectively with employees and customers

1.3
Demonstrate an understanding of financial statements, and
financial markets & institutions

2 Skills
2.1
Analyze business challenges that affect organizational
performance, employees' productivity and customer expectations

C. COURSE CONTENT
  `;

  const draft = parseCourseSpec(text);

  expect(draft.learningOutcomes).toEqual([
    {
      outcomeCode: '1.1',
      clo: 'Describe the technical, economical, legal and socio-cultural context of the business environment',
    },
    {
      outcomeCode: '1.2',
      clo: 'Demonstrate an understanding of the functions and strategies to successfully manage organizations and work effectively with employees and customers',
    },
    {
      outcomeCode: '1.3',
      clo: 'Demonstrate an understanding of financial statements, and financial markets & institutions',
    },
    {
      outcomeCode: '2.1',
      clo: "Analyze business challenges that affect organizational performance, employees' productivity and customer expectations",
    },
  ]);
});

test('extracts learning outcomes from BUS 200 style inline CLO rows with table noise', () => {
  const text = `
3. Student Learning Outcomes (CLOs) Mapping to the Program-level Student Learning
Outcomes (PLOs) :
Code CLO PLO’s Code
1 Knowledge and Understanding
1.1 Describe the technical, economical, legal and socio-cultural
context of the business environment
1.2 Demonstrate an understanding of the functions and strategies to
successfully manage organizations and work effectively with
employees and customers
1.3 Demonstrate an understanding of financial statements, and
financial markets & institutions
1.
4.
Code CLO PLO’s Code
2 Skills
2.1 Analyze business challenges that affect organizational
performance, employees’ productivity and customer expectations
2.2 Analyze business problems using basic ratio analysis, time-value-of
money, and risk and return techniques
3 Values
3.1 Demonstrating effective teamwork skills and values in a multi-
disciplinary team.
3.2 Design and pitch a desirable, feasible, and viable business model
by going through the entrepreneurial process.

C. COURSE CONTENT
  `;

  const draft = parseCourseSpec(text);

  expect(draft.learningOutcomes).toEqual([
    {
      outcomeCode: '1.1',
      clo: 'Describe the technical, economical, legal and socio-cultural context of the business environment',
    },
    {
      outcomeCode: '1.2',
      clo: 'Demonstrate an understanding of the functions and strategies to successfully manage organizations and work effectively with employees and customers',
    },
    {
      outcomeCode: '1.3',
      clo: 'Demonstrate an understanding of financial statements, and financial markets & institutions',
    },
    {
      outcomeCode: '2.1',
      clo: "Analyze business challenges that affect organizational performance, employees' productivity and customer expectations",
    },
    {
      outcomeCode: '2.2',
      clo: 'Analyze business problems using basic ratio analysis, time-value-of money, and risk and return techniques',
    },
    {
      outcomeCode: '3.1',
      clo: 'Demonstrating effective teamwork skills and values in a multi-disciplinary team.',
    },
    {
      outcomeCode: '3.2',
      clo: 'Design and pitch a desirable, feasible, and viable business model by going through the entrepreneurial process.',
    },
  ]);
});

test('ignores synthetic docx row lines so CLO text does not absorb other table columns', () => {
  const text = `
3.  Map Course-level Student Learning Outcomes (CLOs) to the Program-level Student Learning Outcomes (PLOs)*.
Code
CLOs
Aligned PLOs (PLO’s Code)
Teaching Strategies
Assessment Methods
Code ||| CLOs ||| Aligned PLOs (PLO’s Code) ||| Teaching Strategies ||| Assessment Methods
1
Knowledge and Understanding
1 ||| Knowledge and Understanding
1.1
Identify some basic functions from their derivatives.
K1
Lecturing, Problem solving
Exams, Quizzes, and Homework
1.1 ||| Identify some basic functions from their derivatives. ||| K1 ||| Lecturing, Problem solving ||| Exams, Quizzes, and Homework
2
Skills
2 ||| Skills
2.1
Determine the region of continuity and types of discontinuity of a function.
S1
Lecturing, Problem solving
Exams, Quizzes, and Homework
2.1 ||| Determine the region of continuity and types of discontinuity of a function. ||| S1 ||| Lecturing, Problem solving ||| Exams, Quizzes, and Homework

C. COURSE CONTENT
  `;

  const draft = parseCourseSpec(text);

  expect(draft.learningOutcomes).toEqual([
    {
      outcomeCode: '1.1',
      clo: 'Identify some basic functions from their derivatives.',
    },
    {
      outcomeCode: '2.1',
      clo: 'Determine the region of continuity and types of discontinuity of a function.',
    },
  ]);
});

test('stops CLO parsing before aligned PLO code and assessment text in math208 style rows', () => {
  const text = `
3.  Map Course-level Student Learning Outcomes (CLOs) to the Program-level Student Learning Outcomes (PLOs)*.
Code
CLOs
Aligned PLOs (PLO’s Code)
Teaching Strategies
Assessment Methods
Code ||| CLOs ||| Aligned PLOs (PLO’s Code) ||| Teaching Strategies ||| Assessment Methods
1
Knowledge and Understanding
1 ||| Knowledge and Understanding
1.1
Discuss basic concepts of differential equations and linear algebra.
K.1
Lecturing
Online Homework, Quizzes and Exams: First, Second, Final
1.1 ||| Discuss basic concepts of differential equations and linear algebra. ||| K.1 ||| Lecturing ||| Online Homework, Quizzes and Exams: First, Second, Final

C. COURSE CONTENT
  `;

  const draft = parseCourseSpec(text);

  expect(draft.learningOutcomes).toEqual([
    {
      outcomeCode: '1.1',
      clo: 'Discuss basic concepts of differential equations and linear algebra.',
    },
  ]);
});

test('does not treat mapping rules note as part of the final CLO', () => {
  const text = `
3. Map Course-level Student Learning Outcomes (CLOs) to the Program-level Student Learning Outcomes (PLOs)*.
Code
CLOs
1
Knowledge and Understanding
1.1
Explain key concepts of probability, including discrete and continuous distributions.
1.2
Describe the principles of Markov chains and Bayesian approaches.
1.3
Apply statistical thinking to real data problems.
*Mapping Rules: (1)No. of CLOs within the range 4-7; (2) at least one CLO linked to a PLO; (3) it is not necessary to link all the CLOs to PLOs or to cover all the domains.

C. COURSE CONTENT
  `;

  const draft = parseCourseSpec(text);

  expect(draft.learningOutcomes).toEqual([
    {
      outcomeCode: '1.1',
      clo: 'Explain key concepts of probability, including discrete and continuous distributions.',
    },
    {
      outcomeCode: '1.2',
      clo: 'Describe the principles of Markov chains and Bayesian approaches.',
    },
    {
      outcomeCode: '1.3',
      clo: 'Apply statistical thinking to real data problems.',
    },
  ]);
});

test('keeps legitimate values that begin with a former noise word', () => {
  const text = `
Course Title: Mission Systems Engineering
Course Code: ICS 490
Department: Info. & Computer Science Dept.
Course Instructor/Coordinator: Dr. Sara Alqahtani
1. Course Catalog Description: Design and analysis of mission-critical systems.
  `;

  const draft = parseCourseSpec(text);

  expectIdentity(draft, {
    courseTitle: 'Mission Systems Engineering',
    courseNumber: 'ICS 490',
    department: 'Info. & Computer Science Dept.',
    instructorName: 'Dr. Sara Alqahtani',
    catalogDescription: 'Design and analysis of mission-critical systems.',
  });
});

test('does not let later repeated labels override the first real values', () => {
  const text = `
Course Title: Probability for Data Science
Course Code: DATA 201
Department: Mathematics
Course Instructor/Coordinator: Dr. Mohammed Alshahrani
1. Course Catalog Description: Introductory probability for data science.

Later in the document:
Course Title: Not the real title
Course Code: NOT 999
Department: Not a real department
Course Instructor/Coordinator: Not a real instructor
  `;

  const draft = parseCourseSpec(text);

  expectIdentity(draft, {
    courseTitle: 'Probability for Data Science',
    courseNumber: 'DATA 201',
    department: 'Mathematics',
    instructorName: 'Dr. Mohammed Alshahrani',
    catalogDescription: 'Introductory probability for data science.',
  });
});

test('extracts BUS 200 PDF fields without bleeding adjacent labels into values', () => {
  const text = `
COURSE SPECIFICATIONS

Course Title Business & Entrepreneurship
Course Code BUS200
Program BUS
Department Management & Marketing Dept.
College KFUPM Business School (KBS)

Prepared by
Course Instructor/Coordinator: Sami Alwuhaibi

A. COURSE IDENTIFICATION:
1. Course Credit Hours:
3-0-3
2. Course Pre-requisites:
None
3. Course Co-requisites:
None
5. Other Requirements:
None

B. COURSE DESCRIPTION, OBJECTIVES:
1. Course Catalog Description:
Overview of the fourth industrial revolution; economy, legal system, business ethics, socio-cultural factors; managerial functions, business strategies, organizational structures; consumer behavior, marketing strategies and mix; financial statements and analysis; financial markets, time value of money, risk and return; entrepreneurial process, innovation, business model and digital entrepreneurship.

3. Student Learning Outcomes (CLOs) Mapping to the Program-level Student Learning Outcomes (PLOs) :
Code CLO PLO's Code
1 Knowledge and Understanding
1.1
Describe the technical, economical, legal and socio-cultural context of the business environment
1.2
Demonstrate an understanding of the functions and strategies to successfully manage organizations and work effectively with employees and customers

C. COURSE CONTENTS:
2. Lecture Topics to be Covered:
No Topic Hours
1
Introduction to the Course and Industrial Revolution 4.0
3.00
9 Financial Statements (Income Statement, Returned Earnings Statement, 3.00
Statement of Financial Position, and Statement of Cash Flows).

F. LEARNING RESOURCES:
1. Required Textbooks:
• William M. Pride, Robert J. Hughes, and Jack R. Kapoor. (2019). Foundations of Business, 6th Edition, Cengage Publications.
2. Essential References Materials:
None
3. Recommended Reference Material:
• Alexander Osterwalder & Yves Pigneur. (2010). Business Model Generation, Wiley Publisher.
• Alexander Osterwalder, Yves Pigneur, Gregory Bernarda, Alan Smith, & Trish Papadakos. (2014). Value Proposition Design, Wiley Publisher.
  `;

  const draft = parseCourseSpec(text);

  expectIdentity(draft, {
    courseTitle: 'Business & Entrepreneurship',
    courseNumber: 'BUS200',
    department: 'Management & Marketing Dept.',
    instructorName: 'Sami Alwuhaibi',
    creditsText: '3-0-3',
    catalogDescription:
      'Overview of the fourth industrial revolution; economy, legal system, business ethics, socio-cultural factors; managerial functions, business strategies, organizational structures; consumer behavior, marketing strategies and mix; financial statements and analysis; financial markets, time value of money, risk and return; entrepreneurial process, innovation, business model and digital entrepreneurship.',
    prerequisites: 'None',
    textbook:
      'William M. Pride, Robert J. Hughes, and Jack R. Kapoor. (2019). Foundations of Business, 6th Edition, Cengage Publications.',
    supplementalMaterials:
      'Alexander Osterwalder & Yves Pigneur. (2010). Business Model Generation, Wiley Publisher. Alexander Osterwalder, Yves Pigneur, Gregory Bernarda, Alan Smith, & Trish Papadakos. (2014). Value Proposition Design, Wiley Publisher.',
  });
  expect(draft.learningOutcomes).toEqual([
    {
      outcomeCode: '1.1',
      clo: 'Describe the technical, economical, legal and socio-cultural context of the business environment',
    },
    {
      outcomeCode: '1.2',
      clo: 'Demonstrate an understanding of the functions and strategies to successfully manage organizations and work effectively with employees and customers',
    },
  ]);
  expect(draft.topics).toEqual([
    {
      title: 'Introduction to the Course and Industrial Revolution 4.0',
      durationText: '3.00',
    },
    {
      title:
        'Financial Statements (Income Statement, Returned Earnings Statement, Statement of Financial Position, and Statement of Cash Flows).',
      durationText: '3.00',
    },
  ]);
  expect(draft.courseInformation.corequisites).toBe('None');
});

test('stops supplemental materials before facilities section in DATA 201 style docx text', () => {
  const text = `
3. List Recommended Textbooks and Reference Material (Journals, Reports, etc)
Ani Adhikari and Jim Pitman, "Probability for Data Science," 2021
4. List Electronic Materials, Web Sites, Facebook, Twitter, etc.
5. Other learning material such as computer-based software, professional standards or regulations and software.
R: A language and environment for statistical computing. R Foundation for Statistical Computing, Vienna, Austria. URL http://www.R-project.org/
Educational and Research Facilities and Equipment
Items
Resources
Facilities
(Classrooms, laboratories, exhibitions rooms, simulation rooms, etc.)
Classroom with a
Technology Equipment (Projector, Smart Board, Software)
Projector/Smart Board
Other Equipment (Depending on the nature of the specialty)
none
  `;

  const draft = parseCourseSpec(text);

  expect(draft.materials.supplementalMaterials).toBe(
    'Ani Adhikari and Jim Pitman, "Probability for Data Science," 2021; R: A language and environment for statistical computing. R Foundation for Statistical Computing, Vienna, Austria. URL http://www.R-project.org/',
  );
});
