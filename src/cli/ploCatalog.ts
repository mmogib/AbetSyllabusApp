import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { DatabaseSync } from 'node:sqlite';

import type { ProgramCode } from './batchTypes';

function parseCsvLine(line: string): string[] {
  const values = line.match(/("[^"]*"|[^,]+)/g) ?? [];
  return values.map((value) => value.replace(/^"|"$/g, '').trim());
}

export async function importPloCatalog(input: {
  db: DatabaseSync;
  ploDir: string;
  programCode: ProgramCode;
}): Promise<void> {
  const fileNames = await readdir(input.ploDir);
  const insert = input.db.prepare(`
    INSERT INTO plo_definitions (program_code, plo_code, plo_label, plo_description)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(program_code, plo_code) DO UPDATE SET
      plo_label = excluded.plo_label,
      plo_description = excluded.plo_description
  `);

  for (const fileName of fileNames.filter((name) => name.toLowerCase().endsWith('.csv'))) {
    const text = await readFile(join(input.ploDir, fileName), 'utf8');
    const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '');

    for (const line of lines.slice(1)) {
      const [ploCode, ploLabel, ploDescription, programCode] = parseCsvLine(line);
      if (programCode !== input.programCode) {
        continue;
      }

      insert.run(programCode, ploCode, ploLabel, ploDescription);
    }
  }
}
