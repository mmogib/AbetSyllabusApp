import { access, copyFile, mkdir, readdir, writeFile } from 'node:fs/promises';
import { basename, extname, join, parse, relative } from 'node:path';

import { parseCourseSpec } from '../lib/parse/courseSpecParser';
import { buildReviewState } from '../lib/review/buildReviewState';
import { buildAbetSyllabusFileName, getCurrentTermCode } from '../lib/term/academicTerms';
import { applyUploadedDraft } from '../state/actions';
import { createAppState } from '../state/appState';
import type { SyllabusDraft } from '../types/schema';
import type { BatchOptions, BatchRecord, BatchSummary } from './batchTypes';
import { buildCsvReport } from './reportWriters';

interface BatchDependencies {
  extractSourceText: (filePath: string) => Promise<string>;
  generateDocxBytes: (draft: SyllabusDraft) => Promise<Uint8Array>;
}

const SUPPORTED_EXTENSIONS = new Set(['.pdf', '.docx', '.txt']);

async function discoverFiles(rootDir: string, recursive: boolean): Promise<string[]> {
  const entries = await readdir(rootDir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = join(rootDir, entry.name);

    if (entry.isDirectory()) {
      if (recursive) {
        files.push(...(await discoverFiles(fullPath, recursive)));
      }
      continue;
    }

    if (SUPPORTED_EXTENSIONS.has(extname(entry.name).toLowerCase())) {
      files.push(fullPath);
    }
  }

  return files.sort((left, right) => left.localeCompare(right));
}

async function ensureDirectory(path: string): Promise<void> {
  await mkdir(path, { recursive: true });
}

async function findUniqueFilePath(directory: string, fileName: string): Promise<string> {
  const { name, ext } = parse(fileName);
  let candidate = join(directory, fileName);
  let counter = 2;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      await access(candidate);
      candidate = join(directory, `${name}-${counter}${ext}`);
      counter += 1;
    } catch {
      return candidate;
    }
  }
}

async function writeUniqueFile(
  directory: string,
  fileName: string,
  contents: Uint8Array | string,
): Promise<string> {
  await ensureDirectory(directory);
  const targetPath = await findUniqueFilePath(directory, fileName);
  await writeFile(targetPath, contents);
  return targetPath;
}

function toReviewDraft(
  extractedText: string,
  sourceFileName: string,
  termCode: string,
): SyllabusDraft {
  const parsedDraft = parseCourseSpec(extractedText);
  parsedDraft.generationMetadata.termCode = termCode;

  return applyUploadedDraft(createAppState(), {
    draft: parsedDraft,
    extractedText,
    sourceFileName,
  }).draft;
}

function createSummary(records: readonly BatchRecord[]): BatchSummary {
  return records.reduce<BatchSummary>(
    (summary, record) => {
      summary.processed += 1;
      if (record.status === 'success') {
        summary.success += 1;
      } else if (record.status === 'needs_review') {
        summary.needsReview += 1;
      } else {
        summary.failed += 1;
      }
      return summary;
    },
    {
      totalDiscovered: records.length,
      processed: 0,
      success: 0,
      needsReview: 0,
      failed: 0,
    },
  );
}

export async function runBatchGenerate(
  options: BatchOptions,
  deps: BatchDependencies,
): Promise<{ records: BatchRecord[]; summary: BatchSummary }> {
  const termCode = options.termCode ?? getCurrentTermCode(options.now ?? new Date());
  const successDir = join(options.outputDir, 'success');
  const reviewDir = join(options.outputDir, 'review');
  await ensureDirectory(options.outputDir);
  await ensureDirectory(successDir);
  await ensureDirectory(reviewDir);

  const discoveredFiles = await discoverFiles(options.inputDir, options.recursive);
  const records: BatchRecord[] = [];

  for (const filePath of discoveredFiles) {
    const sourceFile = basename(filePath);
    const relativeSourcePath = relative(options.inputDir, filePath);
    let extractedText = '';
    let extractedTextFile = '';

    try {
      extractedText = await deps.extractSourceText(filePath);
      const draft = toReviewDraft(extractedText, sourceFile, termCode);
      const reviewState = buildReviewState(draft);

      if (reviewState.canGenerate) {
        const outputFileName = buildAbetSyllabusFileName(termCode, draft.courseIdentity.courseNumber);
        const bytes = await deps.generateDocxBytes(draft);
        const outputPath = await writeUniqueFile(successDir, outputFileName, bytes);

        records.push({
          sourceFile,
          relativeSourcePath,
          status: 'success',
          termCode,
          courseNumber: draft.courseIdentity.courseNumber,
          courseTitle: draft.courseIdentity.courseTitle,
          outputFile: relative(options.outputDir, outputPath),
          unresolvedFieldCount: 0,
          unresolvedFields: [],
          extractedTextFile: '',
          errorMessage: '',
        });
        continue;
      }

      if (options.copyReviewSources) {
        await copyFile(filePath, join(reviewDir, sourceFile));
      }
      if (options.writeExtractedText) {
        const extractedTextPath = await writeUniqueFile(
          reviewDir,
          `${parse(sourceFile).name}.extracted.txt`,
          extractedText,
        );
        extractedTextFile = relative(options.outputDir, extractedTextPath);
      }

      records.push({
        sourceFile,
        relativeSourcePath,
        status: 'needs_review',
        termCode,
        courseNumber: draft.courseIdentity.courseNumber,
        courseTitle: draft.courseIdentity.courseTitle,
        outputFile: '',
        unresolvedFieldCount: reviewState.unresolvedFields.length,
        unresolvedFields: [...reviewState.unresolvedFields],
        extractedTextFile,
        errorMessage: '',
      });
    } catch (error) {
      if (options.copyReviewSources) {
        await copyFile(filePath, join(reviewDir, sourceFile));
      }
      if (options.writeExtractedText && extractedText.trim() !== '') {
        const extractedTextPath = await writeUniqueFile(
          reviewDir,
          `${parse(sourceFile).name}.extracted.txt`,
          extractedText,
        );
        extractedTextFile = relative(options.outputDir, extractedTextPath);
      }

      records.push({
        sourceFile,
        relativeSourcePath,
        status: 'failed',
        termCode,
        courseNumber: '',
        courseTitle: '',
        outputFile: '',
        unresolvedFieldCount: 0,
        unresolvedFields: [],
        extractedTextFile,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const summary = createSummary(records);
  summary.totalDiscovered = discoveredFiles.length;

  await writeFile(join(options.outputDir, 'report.csv'), buildCsvReport(records), 'utf8');
  await writeFile(join(options.outputDir, 'report.json'), JSON.stringify(records, null, 2), 'utf8');

  return { records, summary };
}
