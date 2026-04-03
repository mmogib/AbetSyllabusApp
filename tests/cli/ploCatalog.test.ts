// @vitest-environment node

import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { ensureCatalogSchema, openCatalogDb } from '../../src/cli/catalogDb';
import { importPloCatalog } from '../../src/cli/ploCatalog';

test('imports only the selected program rows from the PLO csv', async () => {
  const root = await mkdtemp(join(tmpdir(), 'abet-plo-'));
  const ploDir = join(root, 'plo');
  await mkdir(ploDir, { recursive: true });
  await writeFile(
    join(ploDir, 'math_and_as_plos.csv'),
    [
      'plo_code,plo_label,plo_description,program_code',
      '1,SO1,Desc MATH,MATH',
      '1,SO1,Desc AS,AS',
    ].join('\n'),
    'utf8',
  );

  const db = openCatalogDb(join(root, 'catalog.sqlite'));
  ensureCatalogSchema(db);
  await importPloCatalog({ db, ploDir, programCode: 'MATH' });

  const rows = db.prepare('SELECT program_code, plo_code FROM plo_definitions').all() as {
    program_code: string;
    plo_code: string;
  }[];

  expect(rows).toEqual([{ program_code: 'MATH', plo_code: '1' }]);

  db.close();
});
