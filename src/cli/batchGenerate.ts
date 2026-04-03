import { join, resolve } from 'node:path';

import type { BatchOptions } from './batchTypes';
import { runBatchGenerate } from './batchGenerateCore';
import { ensureCatalogSchema, openCatalogDb } from './catalogDb';
import { importPloCatalog } from './ploCatalog';
import { assertProgramCode } from './program';
import { resolveWorkspace } from './workspace';
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
  const workspaceDir = readFlag('--workspace') ?? positionalArgs[0];
  const programCode = assertProgramCode(readFlag('--program') ?? positionalArgs[1]);

  if (!workspaceDir) {
    throw new Error(
      'Usage: npm run batch -- --workspace <dir> --program <MATH|AS|DATA> [--term 252] [--output <dir>] [--catalog-db <path>] [--recursive false] [--copy-review-sources false] [--write-extracted-text false]',
    );
  }

  const resolvedWorkspaceDir = resolve(workspaceDir);

  return {
    workspaceDir: resolvedWorkspaceDir,
    inputDir: resolvedWorkspaceDir,
    outputDir: readFlag('--output') ? resolve(readFlag('--output') as string) : '',
    catalogDbPath: readFlag('--catalog-db')
      ? resolve(readFlag('--catalog-db') as string)
      : join(resolvedWorkspaceDir, 'catalog', 'abet_syllabus_catalog.sqlite'),
    programCode,
    termCode: readFlag('--term'),
    recursive: readBooleanFlag('--recursive', true),
    copyReviewSources: readBooleanFlag('--copy-review-sources', true),
    writeExtractedText: readBooleanFlag('--write-extracted-text', true),
  };
}

async function main(): Promise<void> {
  const rawOptions = readOptions();
  const workspace = await resolveWorkspace(rawOptions.workspaceDir);
  const options: BatchOptions = {
    ...rawOptions,
    inputDir: workspace.inboxDir,
    outputDir:
      rawOptions.outputDir ||
      join(workspace.runsDir, new Date().toISOString().replace(/[:.]/g, '-'), 'output'),
    catalogDbPath: rawOptions.catalogDbPath || join(workspace.catalogDir, 'abet_syllabus_catalog.sqlite'),
  };

  const db = openCatalogDb(options.catalogDbPath);
  ensureCatalogSchema(db);
  try {
    await importPloCatalog({
      db,
      ploDir: workspace.ploDir,
      programCode: options.programCode,
    });
    await importPloCatalog({
      db,
      ploDir: workspace.inboxDir,
      programCode: options.programCode,
    });
    await importPloCatalog({
      db,
      ploDir: workspace.rootDir,
      programCode: options.programCode,
    });
  } finally {
    db.close();
  }

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
