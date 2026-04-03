import { join, resolve } from 'node:path';

import type { BatchOptions } from './batchTypes';
import { runBatchGenerate } from './batchGenerateCore';
import { ensureCatalogSchema, openCatalogDb } from './catalogDb';
import { importPloCatalog } from './ploCatalog';
import { assertProgramCode } from './program';
import { resolveWorkspace } from './workspace';
import { extractSourceTextFromPath, generateDocxBytesForDraft } from './nodeAdapters';

function getBatchHelpText(): string {
  return [
    'Usage: npm run batch -- "<workspaceDir>" <MATH|AS|DATA> [options]',
    '',
    'Options:',
    '  --workspace <path>',
    '  --program <MATH|AS|DATA>',
    '  --term 252',
    '  --output <path>',
    '  --catalog-db <path>',
    '  --recursive false',
    '  --copy-review-sources false',
    '  --write-extracted-text false',
    '',
    'Examples:',
    '  npm run batch -- "C:\\Users\\mmogi\\Documents\\AbetSyllabusData" MATH',
    '  npm run batch -- --workspace "C:\\Users\\mmogi\\Documents\\AbetSyllabusData" --program DATA --term 253',
  ].join('\n');
}

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
  if (positionalArgs[0] === 'help') {
    throw new Error(getBatchHelpText());
  }
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
    processedDir: '',
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
  if (
    process.argv.includes('--help') ||
    process.argv.includes('-h') ||
    process.argv.includes('help') ||
    process.argv.length <= 2
  ) {
    console.log(getBatchHelpText());
    return;
  }

  const rawOptions = readOptions();
  const workspace = await resolveWorkspace(rawOptions.workspaceDir);
  const options: BatchOptions = {
    ...rawOptions,
    inputDir: workspace.inboxDir,
    processedDir: workspace.processedDir,
    outputDir:
      rawOptions.outputDir ||
      join(workspace.runsDir, new Date().toISOString().replace(/[:.]/g, '-'), 'output'),
    catalogDbPath: rawOptions.catalogDbPath || join(workspace.catalogDir, 'abet_syllabus_catalog.sqlite'),
  };

  const db = openCatalogDb(options.catalogDbPath);
  ensureCatalogSchema(db);
  try {
    const ploImport = await importPloCatalog({
      db,
      ploDir: workspace.indexDir,
      programCode: options.programCode,
    });

    if (ploImport.totalDefinitions === 0) {
      console.warn(
        `Warning: no PLO definitions found for program ${options.programCode} in ${workspace.indexDir}. Continuing without PLO catalog rows.`,
      );
    } else if (ploImport.matchedRows === 0) {
      console.log(
        `Using existing PLO definitions for program ${options.programCode} from ${options.catalogDbPath}.`,
      );
    } else {
      console.log(
        `Loaded ${ploImport.matchedRows} PLO CSV rows for program ${options.programCode}; catalog now has ${ploImport.totalDefinitions} definitions.`,
      );
    }
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
