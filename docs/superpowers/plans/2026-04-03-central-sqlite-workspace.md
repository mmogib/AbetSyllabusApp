# Central SQLite Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a managed external CLI workspace plus a central SQLite catalog that stores course, term, requisite, CLO, and CLO-to-PLO data for all processed files.

**Architecture:** Extend the batch CLI so it can adopt or bootstrap a managed workspace rooted outside the repo, import and select program-specific PLO definitions, and persist both processing history and academic data into one central SQLite database. Keep the web app untouched except where shared parser/runtime types can be reused by the CLI.

**Tech Stack:** TypeScript, Node 22 `node:sqlite`, existing batch CLI, Vitest, Vite CLI bundle

---

### Task 1: Add Managed Workspace Resolution

**Files:**
- Create: `src/cli/workspace.ts`
- Modify: `src/cli/batchTypes.ts`
- Modify: `src/cli/batchGenerate.ts`
- Test: `tests/cli/workspace.test.ts`

- [ ] **Step 1: Write the failing workspace tests**

```ts
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { resolveWorkspace } from '../../src/cli/workspace';

test('adopts a plain source folder by creating managed workspace folders and moving supported files into inbox', async () => {
  const root = await mkdtemp(join(tmpdir(), 'abet-workspace-'));
  await writeFile(join(root, 'course.pdf'), 'pdf', 'utf8');

  const workspace = await resolveWorkspace(root);

  expect(workspace.rootDir).toBe(root);
  expect(workspace.inboxDir).toBe(join(root, 'inbox'));
});

test('reuses an existing managed workspace when inbox already exists', async () => {
  const root = await mkdtemp(join(tmpdir(), 'abet-workspace-managed-'));
  await mkdir(join(root, 'inbox'), { recursive: true });

  const workspace = await resolveWorkspace(root);

  expect(workspace.inboxDir).toBe(join(root, 'inbox'));
});
```

- [ ] **Step 2: Run the focused workspace test to verify it fails**

Run: `npm test -- tests/cli/workspace.test.ts`
Expected: FAIL with missing module `src/cli/workspace.ts`

- [ ] **Step 3: Add workspace types and resolver**

```ts
// src/cli/workspace.ts
import { mkdir, readdir, rename } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';

const SUPPORTED_SOURCE_EXTENSIONS = new Set(['.pdf', '.docx', '.txt']);

export interface ManagedWorkspace {
  rootDir: string;
  inboxDir: string;
  runsDir: string;
  catalogDir: string;
  exportsDir: string;
  logsDir: string;
}

export async function resolveWorkspace(rootDir: string): Promise<ManagedWorkspace> {
  const inboxDir = join(rootDir, 'inbox');
  const runsDir = join(rootDir, 'runs');
  const catalogDir = join(rootDir, 'catalog');
  const exportsDir = join(rootDir, 'exports');
  const logsDir = join(rootDir, 'logs');

  const entries = await readdir(rootDir, { withFileTypes: true });
  const alreadyManaged = entries.some((entry) => entry.isDirectory() && entry.name === 'inbox');

  await mkdir(inboxDir, { recursive: true });
  await mkdir(runsDir, { recursive: true });
  await mkdir(catalogDir, { recursive: true });
  await mkdir(exportsDir, { recursive: true });
  await mkdir(logsDir, { recursive: true });

  if (!alreadyManaged) {
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      if (!SUPPORTED_SOURCE_EXTENSIONS.has(extname(entry.name).toLowerCase())) continue;
      await rename(join(rootDir, entry.name), join(inboxDir, basename(entry.name)));
    }
  }

  return { rootDir, inboxDir, runsDir, catalogDir, exportsDir, logsDir };
}
```

- [ ] **Step 4: Extend CLI options and argument parsing for workspace-first operation**

```ts
// src/cli/batchTypes.ts
export interface BatchOptions {
  workspaceDir: string;
  inputDir: string;
  outputDir: string;
  catalogDbPath: string;
  programCode: 'MATH' | 'AS' | 'DATA';
  termCode?: string;
  recursive: boolean;
  copyReviewSources: boolean;
  writeExtractedText: boolean;
  now?: Date;
}
```

```ts
// src/cli/batchGenerate.ts
const workspaceDir = readFlag('--workspace') ?? positionalArgs[0];
if (!workspaceDir) {
  throw new Error('Usage: npm run batch -- --workspace <dir> --program <MATH|AS|DATA> [--term 252]');
}
```

- [ ] **Step 5: Run the workspace test to verify it passes**

Run: `npm test -- tests/cli/workspace.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/cli/workspace.ts src/cli/batchTypes.ts src/cli/batchGenerate.ts tests/cli/workspace.test.ts
git commit -m "feat: add managed cli workspace resolution"
```

### Task 2: Add Central SQLite Schema And Program-Scoped PLO Catalog

**Files:**
- Create: `src/cli/catalogDb.ts`
- Create: `src/cli/program.ts`
- Test: `tests/cli/catalogDb.test.ts`

- [ ] **Step 1: Write the failing catalog tests**

```ts
import { mkdtemp } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { openCatalogDb, ensureCatalogSchema } from '../../src/cli/catalogDb';

test('creates all required catalog tables', async () => {
  const root = await mkdtemp(join(tmpdir(), 'abet-catalog-'));
  const db = openCatalogDb(join(root, 'catalog.sqlite'));
  ensureCatalogSchema(db);

  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as { name: string }[];
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
});
```

- [ ] **Step 2: Run the focused catalog test to verify it fails**

Run: `npm test -- tests/cli/catalogDb.test.ts`
Expected: FAIL with missing module `src/cli/catalogDb.ts`

- [ ] **Step 3: Implement the SQLite schema with `node:sqlite`**

```ts
// src/cli/catalogDb.ts
import { DatabaseSync } from 'node:sqlite';

export function openCatalogDb(path: string): DatabaseSync {
  return new DatabaseSync(path);
}

export function ensureCatalogSchema(db: DatabaseSync): void {
  db.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS runs (
      id INTEGER PRIMARY KEY,
      started_at TEXT NOT NULL,
      finished_at TEXT,
      workspace_dir TEXT NOT NULL,
      input_dir TEXT NOT NULL,
      output_dir TEXT NOT NULL,
      catalog_db_path TEXT NOT NULL,
      term_code TEXT NOT NULL,
      program_code TEXT NOT NULL,
      recursive INTEGER NOT NULL,
      copy_review_sources INTEGER NOT NULL,
      write_extracted_text INTEGER NOT NULL,
      total_discovered INTEGER NOT NULL DEFAULT 0,
      processed INTEGER NOT NULL DEFAULT 0,
      success INTEGER NOT NULL DEFAULT 0,
      needs_review INTEGER NOT NULL DEFAULT 0,
      failed INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS source_files (
      id INTEGER PRIMARY KEY,
      source_path TEXT NOT NULL,
      source_name TEXT NOT NULL,
      source_extension TEXT NOT NULL,
      size_bytes INTEGER,
      modified_at TEXT,
      content_hash TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS file_runs (
      id INTEGER PRIMARY KEY,
      run_id INTEGER NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
      source_file_id INTEGER NOT NULL REFERENCES source_files(id) ON DELETE CASCADE,
      status TEXT NOT NULL,
      term_code TEXT NOT NULL,
      program_code TEXT NOT NULL,
      output_file TEXT NOT NULL,
      review_source_file TEXT NOT NULL,
      extracted_text_file TEXT NOT NULL,
      error_message TEXT NOT NULL,
      unresolved_field_count INTEGER NOT NULL,
      unresolved_fields_json TEXT NOT NULL,
      extracted_text TEXT NOT NULL,
      parsed_draft_json TEXT NOT NULL,
      review_state_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS courses (
      id INTEGER PRIMARY KEY,
      department TEXT NOT NULL,
      course_number TEXT NOT NULL,
      course_title TEXT NOT NULL,
      catalog_description TEXT NOT NULL,
      UNIQUE(department, course_number)
    );

    CREATE TABLE IF NOT EXISTS course_terms (
      id INTEGER PRIMARY KEY,
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      term_code TEXT NOT NULL,
      program_code TEXT NOT NULL,
      coordinator_name TEXT NOT NULL,
      source_file_id INTEGER NOT NULL REFERENCES source_files(id) ON DELETE RESTRICT,
      UNIQUE(course_id, term_code, program_code)
    );

    CREATE TABLE IF NOT EXISTS course_requisites (
      id INTEGER PRIMARY KEY,
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      requisite_type TEXT NOT NULL,
      requisite_text TEXT NOT NULL,
      sequence INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS course_clos (
      id INTEGER PRIMARY KEY,
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      clo_code TEXT NOT NULL,
      clo_text TEXT NOT NULL,
      sequence INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS plo_definitions (
      id INTEGER PRIMARY KEY,
      program_code TEXT NOT NULL,
      plo_code TEXT NOT NULL,
      plo_label TEXT NOT NULL,
      plo_description TEXT NOT NULL,
      UNIQUE(program_code, plo_code)
    );

    CREATE TABLE IF NOT EXISTS course_clo_plo_mappings (
      id INTEGER PRIMARY KEY,
      course_clo_id INTEGER NOT NULL REFERENCES course_clos(id) ON DELETE CASCADE,
      plo_id INTEGER NOT NULL REFERENCES plo_definitions(id) ON DELETE CASCADE,
      mapping_source TEXT NOT NULL,
      mapping_confidence TEXT NOT NULL,
      raw_mapping_text TEXT NOT NULL
    );
  `);
}
```

- [ ] **Step 4: Add program validation**

```ts
// src/cli/program.ts
export type ProgramCode = 'MATH' | 'AS' | 'DATA';

export function assertProgramCode(value: string | undefined): ProgramCode {
  if (value === 'MATH' || value === 'AS' || value === 'DATA') return value;
  throw new Error('Program must be one of: MATH, AS, DATA');
}
```

- [ ] **Step 5: Run the catalog test to verify it passes**

Run: `npm test -- tests/cli/catalogDb.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/cli/catalogDb.ts src/cli/program.ts tests/cli/catalogDb.test.ts
git commit -m "feat: add central sqlite catalog schema"
```

### Task 3: Import PLO Definitions From Catalog CSV Files

**Files:**
- Modify: `src/cli/catalogDb.ts`
- Create: `src/cli/ploCatalog.ts`
- Test: `tests/cli/ploCatalog.test.ts`

- [ ] **Step 1: Write the failing PLO import tests**

```ts
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { openCatalogDb, ensureCatalogSchema } from '../../src/cli/catalogDb';
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
    ].join('\\n'),
    'utf8',
  );

  const db = openCatalogDb(join(root, 'catalog.sqlite'));
  ensureCatalogSchema(db);
  await importPloCatalog({ db, ploDir, programCode: 'MATH' });

  const rows = db.prepare('SELECT program_code, plo_code FROM plo_definitions').all() as { program_code: string; plo_code: string }[];
  expect(rows).toEqual([{ program_code: 'MATH', plo_code: '1' }]);
});
```

- [ ] **Step 2: Run the focused PLO test to verify it fails**

Run: `npm test -- tests/cli/ploCatalog.test.ts`
Expected: FAIL with missing module `src/cli/ploCatalog.ts`

- [ ] **Step 3: Implement the PLO importer**

```ts
// src/cli/ploCatalog.ts
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { DatabaseSync } from 'node:sqlite';
import type { ProgramCode } from './program';

export async function importPloCatalog(input: {
  db: DatabaseSync;
  ploDir: string;
  programCode: ProgramCode;
}): Promise<void> {
  const files = await readdir(input.ploDir);
  const insert = input.db.prepare(`
    INSERT INTO plo_definitions (program_code, plo_code, plo_label, plo_description)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(program_code, plo_code) DO UPDATE SET
      plo_label = excluded.plo_label,
      plo_description = excluded.plo_description
  `);

  for (const fileName of files.filter((name) => name.endsWith('.csv'))) {
    const text = await readFile(join(input.ploDir, fileName), 'utf8');
    const rows = text.trim().split(/\\r?\\n/).slice(1);
    for (const row of rows) {
      const [ploCode, ploLabel, ploDescription, programCode] = row.match(/(\"[^\"]*\"|[^,]+)/g) ?? [];
      if (programCode !== input.programCode) continue;
      insert.run(programCode, ploCode, ploLabel, ploDescription.replace(/^\"|\"$/g, ''));
    }
  }
}
```

- [ ] **Step 4: Run the PLO test to verify it passes**

Run: `npm test -- tests/cli/ploCatalog.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/cli/ploCatalog.ts src/cli/catalogDb.ts tests/cli/ploCatalog.test.ts
git commit -m "feat: import program-specific plo definitions"
```

### Task 4: Persist Course, Term, Requisite, CLO, And Mapping Data During Batch Runs

**Files:**
- Modify: `src/cli/batchGenerateCore.ts`
- Modify: `src/cli/nodeAdapters.ts`
- Modify: `src/cli/batchTypes.ts`
- Modify: `src/types/schema.ts`
- Test: `tests/cli/batchGenerate.test.ts`

- [ ] **Step 1: Write the failing persistence test**

```ts
test('persists course, term, requisite, and clo data into the central catalog', async () => {
  const result = await runBatchGenerate(options, deps);
  expect(result.summary.success).toBe(1);

  const db = openCatalogDb(options.catalogDbPath);
  const courses = db.prepare('SELECT course_number, catalog_description FROM courses').all();
  const terms = db.prepare('SELECT term_code, program_code, coordinator_name FROM course_terms').all();
  const clos = db.prepare('SELECT clo_code, clo_text FROM course_clos').all();

  expect(courses).toEqual([{ course_number: 'DATA201', catalog_description: expect.any(String) }]);
  expect(terms).toEqual([{ term_code: '252', program_code: 'DATA', coordinator_name: expect.any(String) }]);
  expect(clos.length).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run the batch test to verify it fails**

Run: `npm test -- tests/cli/batchGenerate.test.ts`
Expected: FAIL because the DB is not being written

- [ ] **Step 3: Extend the parsed draft model only where needed for persistence**

```ts
// src/types/schema.ts
export interface CourseInformation {
  catalogDescription: string;
  prerequisites: string;
  corequisites?: string;
  designation: string;
}
```

- [ ] **Step 4: Add catalog persistence helpers and call them from the batch loop**

```ts
// inside src/cli/batchGenerateCore.ts
const draft = toReviewDraft(extractedText, sourceFile, termCode);
const reviewState = buildReviewState(draft);

const sourceFileId = upsertSourceFile(...);
const courseId = upsertCourse(...);
upsertCourseTerm(...);
replaceCourseRequisites(...);
replaceCourseClos(...);
replaceCourseCloPloMappings(...);
insertFileRun(...);
```

- [ ] **Step 5: Run the batch test to verify it passes**

Run: `npm test -- tests/cli/batchGenerate.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/cli/batchGenerateCore.ts src/cli/nodeAdapters.ts src/cli/batchTypes.ts src/types/schema.ts tests/cli/batchGenerate.test.ts
git commit -m "feat: persist batch processing data into sqlite catalog"
```

### Task 5: Wire CLI Bootstrap Flow And Update Docs

**Files:**
- Modify: `src/cli/batchGenerate.ts`
- Modify: `README.md`
- Modify: `AGENTS.md`
- Modify: `notes/session_handoff.md`
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Update the CLI bootstrap flow**

```ts
// src/cli/batchGenerate.ts
const workspace = await resolveWorkspace(resolve(workspaceDir));
const programCode = assertProgramCode(readFlag('--program'));
const catalogDbPath = readFlag('--catalog-db') ?? join(workspace.catalogDir, 'abet_syllabus_catalog.sqlite');
const outputDir = readFlag('--output') ?? join(workspace.runsDir, createRunStamp(now), 'output');
```

- [ ] **Step 2: Update README usage**

```md
npm run batch -- --workspace "C:\\Users\\mmogi\\Documents\\AbetSyllabusData" --program MATH
```

- [ ] **Step 3: Run full verification**

Run: `npm test`
Expected: PASS

Run: `npm run typecheck`
Expected: PASS

Run: `npx vite build --emptyOutDir false`
Expected: PASS

- [ ] **Step 4: Smoke-test the full CLI flow**

Run: `npm run batch -- --workspace "C:\\Users\\mmogi\\Documents\\AbetSyllabusData" --program MATH`
Expected: exit `0`, managed workspace preserved, SQLite catalog created/updated, run artifacts written under `runs/`

- [ ] **Step 5: Commit**

```bash
git add src/cli/batchGenerate.ts README.md AGENTS.md notes/session_handoff.md CHANGELOG.md
git commit -m "docs: document managed workspace and sqlite catalog"
```

## Self-Review

- Spec coverage: the plan covers managed workspace adoption, central SQLite schema, program-specific PLO imports, course/term/requisite/CLO persistence, and CLI/docs updates.
- Placeholder scan: no `TODO`, `TBD`, or vague “handle appropriately” steps remain.
- Type consistency: `programCode`, `catalogDbPath`, `course_terms`, `course_requisites`, `course_clos`, and `course_clo_plo_mappings` are used consistently across tasks.
