import type { BatchRecord } from './batchTypes';

function escapeCsvCell(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

export function buildCsvReport(records: readonly BatchRecord[]): string {
  const header = [
    'sourceFile',
    'relativeSourcePath',
    'status',
    'termCode',
    'courseNumber',
    'courseTitle',
    'outputFile',
    'unresolvedFieldCount',
    'unresolvedFields',
    'extractedTextFile',
    'errorMessage',
  ];

  const lines = records.map((record) =>
    [
      record.sourceFile,
      record.relativeSourcePath,
      record.status,
      record.termCode,
      record.courseNumber,
      record.courseTitle,
      record.outputFile,
      String(record.unresolvedFieldCount),
      record.unresolvedFields.join('|'),
      record.extractedTextFile,
      record.errorMessage,
    ].map(escapeCsvCell).join(','),
  );

  return [header.join(','), ...lines].join('\n');
}
