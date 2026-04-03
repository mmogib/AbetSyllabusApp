// @vitest-environment node

import { mkdir, mkdtemp, readFile, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { openCatalogDb } from '../../src/cli/catalogDb';
import { runBatchGenerate } from '../../src/cli/batchGenerateCore';

async function createInputFile(root: string, name: string, contents = 'placeholder'): Promise<string> {
  const inputDir = join(root, 'input');
  await mkdir(inputDir, { recursive: true });
  await writeFile(join(inputDir, name), contents, 'utf8');
  return inputDir;
}

test('writes success docx output plus csv and json reports for a complete source file', async () => {
  const root = await mkdtemp(join(tmpdir(), 'batch-cli-success-'));
  const inputDir = await createInputFile(root, 'course-spec.txt');
  const outputDir = join(root, 'output');

  const result = await runBatchGenerate(
    {
      workspaceDir: root,
      inputDir,
      outputDir,
      catalogDbPath: join(root, 'catalog.sqlite'),
      programCode: 'MATH',
      recursive: true,
      copyReviewSources: true,
      writeExtractedText: true,
      now: new Date('2026-04-03T00:00:00Z'),
    },
    {
      extractSourceText: async () =>
        [
          'Department: ICS',
          'Course Code: ICS 321',
          'Course Title: Software Engineering I',
          'Course Instructor/Coordinator: Dr. Ada Lovelace',
          'Catalog Course Description: Introduction to software engineering.',
          '4. Pre-requisites for this course (if any): ICS 253',
          '1. Required Textbooks',
          'Software Engineering, 10th Edition',
        ].join('\n'),
      generateDocxBytes: async () => new Uint8Array([1, 2, 3]),
    },
  );

  expect(result.summary.success).toBe(1);
  expect(result.records[0]?.status).toBe('success');
  await expect(stat(join(outputDir, 'success', 'T252ICS321AbetSyllabus.docx'))).resolves.toBeTruthy();
  await expect(stat(join(root, 'processed', 'course-spec.txt'))).resolves.toBeTruthy();
  await expect(readFile(join(outputDir, 'report.csv'), 'utf8')).resolves.toContain('success');
  await expect(readFile(join(outputDir, 'report.json'), 'utf8')).resolves.toContain('"status": "success"');
});

test('copies review artifacts and skips docx generation for unresolved files', async () => {
  const root = await mkdtemp(join(tmpdir(), 'batch-cli-review-'));
  const inputDir = await createInputFile(root, 'course-spec.txt');
  const outputDir = join(root, 'output');

  const result = await runBatchGenerate(
    {
      workspaceDir: root,
      inputDir,
      outputDir,
      catalogDbPath: join(root, 'catalog.sqlite'),
      programCode: 'MATH',
      recursive: true,
      copyReviewSources: true,
      writeExtractedText: true,
      now: new Date('2026-04-03T00:00:00Z'),
    },
    {
      extractSourceText: async () =>
        [
          'Department: ICS',
          'Course Code: ICS 321',
          'Course Title: Software Engineering I',
          'Catalog Course Description: Introduction to software engineering.',
        ].join('\n'),
      generateDocxBytes: async () => new Uint8Array([1, 2, 3]),
    },
  );

  expect(result.summary.needsReview).toBe(1);
  expect(result.records[0]?.status).toBe('needs_review');
  await expect(stat(join(inputDir, 'course-spec.txt'))).resolves.toBeTruthy();
  await expect(stat(join(outputDir, 'review', 'course-spec.txt'))).resolves.toBeTruthy();
  await expect(readFile(join(outputDir, 'review', 'course-spec.extracted.txt'), 'utf8')).resolves.toContain('Course Title: Software Engineering I');
});

test('uses the computed current term when no term override is provided', async () => {
  const root = await mkdtemp(join(tmpdir(), 'batch-cli-term-'));
  const inputDir = await createInputFile(root, 'course-spec.txt');
  const outputDir = join(root, 'output');

  const result = await runBatchGenerate(
    {
      workspaceDir: root,
      inputDir,
      outputDir,
      catalogDbPath: join(root, 'catalog.sqlite'),
      programCode: 'MATH',
      recursive: true,
      copyReviewSources: true,
      writeExtractedText: true,
      now: new Date('2026-04-03T00:00:00Z'),
    },
    {
      extractSourceText: async () =>
        [
          'Department: ICS',
          'Course Code: ICS 321',
          'Course Title: Software Engineering I',
          'Course Instructor/Coordinator: Dr. Ada Lovelace',
          'Catalog Course Description: Introduction to software engineering.',
          '4. Pre-requisites for this course (if any): ICS 253',
          '1. Required Textbooks',
          'Software Engineering, 10th Edition',
        ].join('\n'),
      generateDocxBytes: async () => new Uint8Array([1, 2, 3]),
    },
  );

  expect(result.records[0]?.termCode).toBe('252');
  expect(result.records[0]?.outputFile).toContain('T252ICS321AbetSyllabus.docx');
});

test('keeps both outputs when two source files resolve to the same DOCX filename', async () => {
  const root = await mkdtemp(join(tmpdir(), 'batch-cli-collision-'));
  const inputDir = join(root, 'input');
  const outputDir = join(root, 'output');
  await mkdir(inputDir, { recursive: true });
  await writeFile(join(inputDir, 'course-spec-a.txt'), 'placeholder', 'utf8');
  await writeFile(join(inputDir, 'course-spec-b.txt'), 'placeholder', 'utf8');

  const result = await runBatchGenerate(
    {
      workspaceDir: root,
      inputDir,
      outputDir,
      catalogDbPath: join(root, 'catalog.sqlite'),
      programCode: 'MATH',
      recursive: true,
      copyReviewSources: true,
      writeExtractedText: true,
      now: new Date('2026-04-03T00:00:00Z'),
    },
    {
      extractSourceText: async () =>
        [
          'Department: ICS',
          'Course Code: ICS 321',
          'Course Title: Software Engineering I',
          'Course Instructor/Coordinator: Dr. Ada Lovelace',
          'Catalog Course Description: Introduction to software engineering.',
          '4. Pre-requisites for this course (if any): ICS 253',
          '1. Required Textbooks',
          'Software Engineering, 10th Edition',
        ].join('\n'),
      generateDocxBytes: async () => new Uint8Array([1, 2, 3]),
    },
  );

  expect(result.summary.success).toBe(2);
  await expect(stat(join(outputDir, 'success', 'T252ICS321AbetSyllabus.docx'))).resolves.toBeTruthy();
  await expect(
    stat(join(outputDir, 'success', 'T252ICS321AbetSyllabus-2.docx')),
  ).resolves.toBeTruthy();
});

test('persists course, term, requisite, and clo data into the central catalog', async () => {
  const root = await mkdtemp(join(tmpdir(), 'batch-cli-db-'));
  const inputDir = await createInputFile(root, 'course-spec.txt');
  const outputDir = join(root, 'output');
  const catalogDbPath = join(root, 'catalog.sqlite');

  const result = await runBatchGenerate(
    {
      workspaceDir: root,
      inputDir,
      outputDir,
      catalogDbPath,
      programCode: 'DATA',
      recursive: true,
      copyReviewSources: true,
      writeExtractedText: true,
      now: new Date('2026-04-03T00:00:00Z'),
    },
    {
      extractSourceText: async () =>
        [
          'Department: Mathematics',
          'Course Code: DATA201',
          'Course Title: Probability for Data Science',
          'Course Instructor/Coordinator: Dr. Ada Lovelace',
          '1. Course Catalog Description: Introduction to probability for data science.',
          '2. Course Pre-requisites: STAT 201',
          '3. Student Learning Outcomes (CLOs) Mapping to the Program-level Student Learning Outcomes (PLOs) :',
          'Code CLO PLO\'s Code',
          '1.1 Explain key probability models.',
          '1.2 Apply probability methods computationally.',
          'C. COURSE CONTENT',
          '1. Required Textbooks',
          'Probability Textbook',
        ].join('\n'),
      generateDocxBytes: async () => new Uint8Array([1, 2, 3]),
    },
  );

  expect(result.summary.success).toBe(1);

  const db = openCatalogDb(catalogDbPath);
  const courses = db.prepare('SELECT course_number, catalog_description FROM courses').all() as {
    course_number: string;
    catalog_description: string;
  }[];
  const terms = db
    .prepare('SELECT term_code, program_code, coordinator_name FROM course_terms')
    .all() as {
    term_code: string;
    program_code: string;
    coordinator_name: string;
  }[];
  const requisites = db
    .prepare('SELECT requisite_type, requisite_text FROM course_requisites')
    .all() as {
    requisite_type: string;
    requisite_text: string;
  }[];
  const clos = db.prepare('SELECT clo_code, clo_text FROM course_clos ORDER BY sequence').all() as {
    clo_code: string;
    clo_text: string;
  }[];

  expect(courses).toEqual([
    {
      course_number: 'DATA201',
      catalog_description: 'Introduction to probability for data science.',
    },
  ]);
  expect(terms).toEqual([
    {
      term_code: '252',
      program_code: 'DATA',
      coordinator_name: 'Dr. Ada Lovelace',
    },
  ]);
  expect(requisites).toEqual([
    {
      requisite_type: 'prerequisite',
      requisite_text: 'STAT 201',
    },
  ]);
  expect(clos).toEqual([
    {
      clo_code: '1.1',
      clo_text: 'Explain key probability models.',
    },
    {
      clo_code: '1.2',
      clo_text: 'Apply probability methods computationally.',
    },
  ]);

  db.close();
});
