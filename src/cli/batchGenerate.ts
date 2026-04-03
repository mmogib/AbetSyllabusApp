import { resolve } from 'node:path';

import type { BatchOptions } from './batchTypes';
import { runBatchGenerate } from './batchGenerateCore';
import { extractSourceTextFromPath, generateDocxBytesForDraft } from './nodeAdapters';

function readFlag(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  if (index === -1) {
    return undefined;
  }

  return process.argv[index + 1];
}

function readBooleanFlag(name: string, defaultValue: boolean): boolean {
  const value = readFlag(name);
  if (value === undefined) {
    return defaultValue;
  }

  return value !== 'false';
}

function readOptions(): BatchOptions {
  const positionalArgs = process.argv.slice(2).filter((value) => !value.startsWith('--'));
  const inputDir = readFlag('--input') ?? positionalArgs[0];
  const outputDir = readFlag('--output') ?? positionalArgs[1];

  if (!inputDir || !outputDir) {
    throw new Error(
      'Usage: npm run batch -- --input <dir> --output <dir> [--term 252] [--recursive false] [--copy-review-sources false] [--write-extracted-text false]',
    );
  }

  return {
    inputDir: resolve(inputDir),
    outputDir: resolve(outputDir),
    termCode: readFlag('--term'),
    recursive: readBooleanFlag('--recursive', true),
    copyReviewSources: readBooleanFlag('--copy-review-sources', true),
    writeExtractedText: readBooleanFlag('--write-extracted-text', true),
  };
}

async function main(): Promise<void> {
  const options = readOptions();
  const result = await runBatchGenerate(options, {
    extractSourceText: extractSourceTextFromPath,
    generateDocxBytes: generateDocxBytesForDraft,
  });

  console.log(
    `Batch complete: total=${result.summary.totalDiscovered} success=${result.summary.success} needs_review=${result.summary.needsReview} failed=${result.summary.failed} output=${options.outputDir}`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
