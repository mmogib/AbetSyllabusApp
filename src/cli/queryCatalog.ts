import { resolve } from 'node:path';

import { getQueryHelpText, runCatalogQuery, type QueryCommand } from './queryCatalogCore';
import { assertProgramCode } from './program';

function readFlag(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  if (index === -1) {
    return undefined;
  }

  return process.argv[index + 1];
}

function readBooleanFlag(name: string): boolean {
  return process.argv.includes(name);
}

function renderTable(headers: string[], rows: Array<Record<string, string | number | null>>): string {
  if (headers.length === 0) {
    return '(no columns)';
  }

  const widths = headers.map((header) =>
    Math.max(
      header.length,
      ...rows.map((row) => {
        const value = row[header];
        return value == null ? 0 : String(value).length;
      }),
    ),
  );

  const format = (values: string[]) =>
    values.map((value, index) => value.padEnd(widths[index] ?? value.length)).join(' | ');

  const lines = [
    format(headers),
    widths.map((width) => '-'.repeat(width)).join('-|-'),
  ];

  for (const row of rows) {
    lines.push(format(headers.map((header) => String(row[header] ?? ''))));
  }

  return lines.join('\n');
}

function printHelp(): void {
  console.log(getQueryHelpText());
}

async function main(): Promise<void> {
  if (
    process.argv.includes('--help') ||
    process.argv.includes('-h') ||
    process.argv.includes('help') ||
    process.argv.length <= 2
  ) {
    printHelp();
    return;
  }

  const positionalArgs = process.argv.slice(2).filter((value) => !value.startsWith('--'));
  const workspaceDir = readFlag('--workspace') ?? positionalArgs[0];
  const command = positionalArgs[1] as QueryCommand | undefined;

  if (workspaceDir === 'help' || !workspaceDir || !command) {
    printHelp();
    process.exitCode = 1;
    return;
  }

  const result = await runCatalogQuery({
    workspaceDir: resolve(workspaceDir),
    catalogDbPath: readFlag('--catalog-db') ? resolve(readFlag('--catalog-db') as string) : undefined,
    command,
    programCode: readFlag('--program') ? assertProgramCode(readFlag('--program') as string) : undefined,
    termCode: readFlag('--term'),
    courseNumber: readFlag('--course'),
    limit: readFlag('--limit') ? Number(readFlag('--limit')) : undefined,
    sql: readFlag('--sql'),
    exportCsv: readBooleanFlag('--export'),
  });

  console.log(result.title);
  console.log(renderTable(result.headers, result.rows));
  if (result.exportPath) {
    console.log(`CSV saved to ${result.exportPath}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
