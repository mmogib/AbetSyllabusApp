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

test('reports existing rows and no warning when the selected program already exists in the catalog', async () => {
  const root = await mkdtemp(join(tmpdir(), 'abet-plo-existing-'));
  const indexDir = join(root, 'index');
  await mkdir(indexDir, { recursive: true });
  await writeFile(
    join(indexDir, 'math_and_as_plos.csv'),
    [
      'plo_code,plo_label,plo_description,program_code',
      '1,SO1,Desc MATH,MATH',
      '2,SO2,Desc MATH 2,MATH',
    ].join('\n'),
    'utf8',
  );

  const db = openCatalogDb(join(root, 'catalog.sqlite'));
  ensureCatalogSchema(db);

  const first = await importPloCatalog({ db, ploDir: indexDir, programCode: 'MATH' });
  const second = await importPloCatalog({ db, ploDir: indexDir, programCode: 'MATH' });

  expect(first.totalDefinitions).toBe(2);
  expect(second.totalDefinitions).toBe(2);
  expect(second.csvFilesScanned).toBe(1);
  expect(second.matchedRows).toBe(2);

  db.close();
});

test('returns zero definitions when no rows exist for the selected program', async () => {
  const root = await mkdtemp(join(tmpdir(), 'abet-plo-missing-'));
  const indexDir = join(root, 'index');
  await mkdir(indexDir, { recursive: true });
  await writeFile(
    join(indexDir, 'math_and_as_plos.csv'),
    [
      'plo_code,plo_label,plo_description,program_code',
      '1,SO1,Desc MATH,MATH',
    ].join('\n'),
    'utf8',
  );

  const db = openCatalogDb(join(root, 'catalog.sqlite'));
  ensureCatalogSchema(db);
  const result = await importPloCatalog({ db, ploDir: indexDir, programCode: 'DATA' });

  expect(result.totalDefinitions).toBe(0);
  expect(result.matchedRows).toBe(0);

  db.close();
});
