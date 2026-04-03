// @vitest-environment node

import { mkdtemp, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { ensureCatalogSchema, openCatalogDb } from '../../src/cli/catalogDb';
import { getQueryHelpText, runCatalogQuery } from '../../src/cli/queryCatalogCore';
import { resolveWorkspace } from '../../src/cli/workspace';

async function seedWorkspace(root: string): Promise<string> {
  const workspace = await resolveWorkspace(root, { adoptSourceFiles: false });
  const dbPath = join(workspace.catalogDir, 'abet_syllabus_catalog.sqlite');
  const db = openCatalogDb(dbPath);
  ensureCatalogSchema(db);

  db.exec(`
    INSERT INTO runs (
      id, started_at, finished_at, workspace_dir, input_dir, output_dir, catalog_db_path,
      term_code, program_code, recursive, copy_review_sources, write_extracted_text,
      total_discovered, processed, success, needs_review, failed
    ) VALUES (
      1, '2026-04-03T00:00:00Z', '2026-04-03T00:01:00Z', '${root.replace(/'/g, "''")}',
      '${join(root, 'inbox').replace(/'/g, "''")}', '${join(root, 'runs', 'r1', 'output').replace(/'/g, "''")}',
      '${dbPath.replace(/'/g, "''")}', '252', 'MATH', 1, 1, 1, 1, 1, 1, 0, 0
    );
    INSERT INTO source_files (id, source_path, source_name, source_extension, size_bytes, modified_at, content_hash)
    VALUES (1, '${join(root, 'processed', 'math102.docx').replace(/'/g, "''")}', 'math102.docx', '.docx', 100, '2026-04-03T00:00:00Z', 'hash-math102');
    INSERT INTO courses (id, department, course_number, course_title, catalog_description)
    VALUES (1, 'Mathematics', 'MATH102', 'Calculus II', 'Description');
    INSERT INTO course_terms (id, course_id, term_code, program_code, coordinator_name, source_file_id)
    VALUES (1, 1, '252', 'MATH', 'Dr. Ada', 1);
    INSERT INTO course_clos (id, course_id, clo_code, clo_text, sequence)
    VALUES
      (1, 1, '1.1', 'Explain limits.', 1),
      (2, 1, '1.2', 'Apply integration.', 2);
    INSERT INTO plo_definitions (id, program_code, plo_code, plo_label, plo_description)
    VALUES
      (1, 'MATH', '1', 'SO1', 'PLO 1'),
      (2, 'MATH', '3', 'SO3', 'PLO 3');
    INSERT INTO course_clo_plo_mappings (id, course_clo_id, plo_id, mapping_source, mapping_confidence, raw_mapping_text)
    VALUES
      (1, 1, 1, 'manual', 'high', 'SO1'),
      (2, 2, 2, 'manual', 'high', 'SO3');
  `);

  db.close();
  return dbPath;
}

test('help text lists named commands and raw sql mode', () => {
  const help = getQueryHelpText();
  expect(help).toContain('program-plo-matrix');
  expect(help).toContain('course-plo-mappings');
  expect(help).toContain('sql --sql');
});

test('returns runs from the catalog', async () => {
  const root = await mkdtemp(join(tmpdir(), 'abet-query-runs-'));
  await seedWorkspace(root);

  const result = await runCatalogQuery({
    workspaceDir: root,
    command: 'runs',
  });

  expect(result.rows[0]?.program_code).toBe('MATH');
  expect(result.rows[0]?.success).toBe(1);
});

test('supports read-only raw sql queries', async () => {
  const root = await mkdtemp(join(tmpdir(), 'abet-query-sql-'));
  await seedWorkspace(root);

  const result = await runCatalogQuery({
    workspaceDir: root,
    command: 'sql',
    sql: 'select course_number, course_title from courses',
  });

  expect(result.headers).toEqual(['course_number', 'course_title']);
  expect(result.rows).toEqual([{ course_number: 'MATH102', course_title: 'Calculus II' }]);
});

test('exports the program plo matrix to the workspace exports folder', async () => {
  const root = await mkdtemp(join(tmpdir(), 'abet-query-matrix-'));
  await seedWorkspace(root);

  const result = await runCatalogQuery({
    workspaceDir: root,
    command: 'program-plo-matrix',
    programCode: 'MATH',
    termCode: '252',
    exportCsv: true,
  });

  expect(result.headers).toEqual(['course', 'term', 'PLO1', 'PLO3']);
  expect(result.rows).toEqual([{ course: 'MATH102', term: '252', PLO1: 'x', PLO3: 'x' }]);
  expect(result.exportPath).toBe(join(root, 'exports', 'plo-matrix-MATH-252.csv'));
  await expect(readFile(result.exportPath as string, 'utf8')).resolves.toContain('course,term,PLO1,PLO3');
});
