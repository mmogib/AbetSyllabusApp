import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { DatabaseSync } from 'node:sqlite';

import type { ProgramCode } from './batchTypes';
import { countPloDefinitionsForProgram } from './catalogDb';

export interface PloCatalogImportResult {
  csvFilesScanned: number;
  matchedRows: number;
  totalDefinitions: number;
}

function parseCsvLine(line: string): string[] {
  const values = line.match(/("[^"]*"|[^,]+)/g) ?? [];
  return values.map((value) => value.replace(/^"|"$/g, '').trim());
}

export async function importPloCatalog(input: {
  db: DatabaseSync;
  ploDir: string;
  programCode: ProgramCode;
}): Promise<PloCatalogImportResult> {
  const fileNames = (await readdir(input.ploDir)).filter((name) => name.toLowerCase().endsWith('.csv'));
  let matchedRows = 0;
  const insert = input.db.prepare(`
    INSERT INTO plo_definitions (program_code, plo_code, plo_label, plo_description)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(program_code, plo_code) DO UPDATE SET
      plo_label = excluded.plo_label,
      plo_description = excluded.plo_description
  `);

  for (const fileName of fileNames) {
    const text = await readFile(join(input.ploDir, fileName), 'utf8');
    const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '');

    for (const line of lines.slice(1)) {
      const [ploCode, ploLabel, ploDescription, programCode] = parseCsvLine(line);
      if (programCode !== input.programCode) {
        continue;
      }

      matchedRows += 1;
      insert.run(programCode, ploCode, ploLabel, ploDescription);
    }
  }

  return {
    csvFilesScanned: fileNames.length,
    matchedRows,
    totalDefinitions: countPloDefinitionsForProgram(input.db, input.programCode),
  };
}
