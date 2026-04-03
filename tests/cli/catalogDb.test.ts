// @vitest-environment node

import { mkdtemp } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { ensureCatalogSchema, openCatalogDb } from '../../src/cli/catalogDb';

test('creates all required catalog tables', async () => {
  const root = await mkdtemp(join(tmpdir(), 'abet-catalog-'));
  const db = openCatalogDb(join(root, 'catalog.sqlite'));
  ensureCatalogSchema(db);

  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as {
    name: string;
  }[];

  expect(tables.map((row) => row.name)).toEqual(
    expect.arrayContaining([
      'runs',
      'source_files',
      'file_runs',
      'courses',
      'course_terms',
      'course_requisites',
      'course_clos',
      'plo_definitions',
      'course_clo_plo_mappings',
    ]),
  );

  db.close();
});
