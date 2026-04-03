import { mkdir, mkdtemp, readFile, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

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
      inputDir,
      outputDir,
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
  await expect(readFile(join(outputDir, 'report.csv'), 'utf8')).resolves.toContain('success');
  await expect(readFile(join(outputDir, 'report.json'), 'utf8')).resolves.toContain('"status": "success"');
});

test('copies review artifacts and skips docx generation for unresolved files', async () => {
  const root = await mkdtemp(join(tmpdir(), 'batch-cli-review-'));
  const inputDir = await createInputFile(root, 'course-spec.txt');
  const outputDir = join(root, 'output');

  const result = await runBatchGenerate(
    {
      inputDir,
      outputDir,
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
  await expect(stat(join(outputDir, 'review', 'course-spec.txt'))).resolves.toBeTruthy();
  await expect(readFile(join(outputDir, 'review', 'course-spec.extracted.txt'), 'utf8')).resolves.toContain('Course Title: Software Engineering I');
});

test('uses the computed current term when no term override is provided', async () => {
  const root = await mkdtemp(join(tmpdir(), 'batch-cli-term-'));
  const inputDir = await createInputFile(root, 'course-spec.txt');
  const outputDir = join(root, 'output');

  const result = await runBatchGenerate(
    {
      inputDir,
      outputDir,
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
      inputDir,
      outputDir,
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
