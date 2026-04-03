import { DatabaseSync } from 'node:sqlite';

import type { ProgramCode } from './batchTypes';

export function openCatalogDb(path: string): DatabaseSync {
  return new DatabaseSync(path);
}

export function countPloDefinitionsForProgram(db: DatabaseSync, programCode: ProgramCode): number {
  const row = db
    .prepare('SELECT COUNT(*) as count FROM plo_definitions WHERE program_code = ?')
    .get(programCode) as { count: number };

  return row.count;
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

function asJson(value: unknown): string {
  return JSON.stringify(value);
}

export interface RunInsertInput {
  startedAt: string;
  workspaceDir: string;
  inputDir: string;
  outputDir: string;
  catalogDbPath: string;
  termCode: string;
  programCode: ProgramCode;
  recursive: boolean;
  copyReviewSources: boolean;
  writeExtractedText: boolean;
}

export interface SourceFileUpsertInput {
  sourcePath: string;
  sourceName: string;
  sourceExtension: string;
  sizeBytes: number;
  modifiedAt: string;
  contentHash: string;
}

export interface FileRunInsertInput {
  runId: number;
  sourceFileId: number;
  status: string;
  termCode: string;
  programCode: ProgramCode;
  outputFile: string;
  reviewSourceFile: string;
  extractedTextFile: string;
  errorMessage: string;
  unresolvedFieldCount: number;
  unresolvedFields: string[];
  extractedText: string;
  parsedDraft: unknown;
  reviewState: unknown;
}

export function insertRun(db: DatabaseSync, input: RunInsertInput): number {
  const result = db
    .prepare(
      `INSERT INTO runs (
        started_at,
        workspace_dir,
        input_dir,
        output_dir,
        catalog_db_path,
        term_code,
        program_code,
        recursive,
        copy_review_sources,
        write_extracted_text
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.startedAt,
      input.workspaceDir,
      input.inputDir,
      input.outputDir,
      input.catalogDbPath,
      input.termCode,
      input.programCode,
      input.recursive ? 1 : 0,
      input.copyReviewSources ? 1 : 0,
      input.writeExtractedText ? 1 : 0,
    );

  return Number(result.lastInsertRowid);
}

export function finishRun(
  db: DatabaseSync,
  input: {
    runId: number;
    finishedAt: string;
    totalDiscovered: number;
    processed: number;
    success: number;
    needsReview: number;
    failed: number;
  },
): void {
  db.prepare(
    `UPDATE runs
     SET finished_at = ?,
         total_discovered = ?,
         processed = ?,
         success = ?,
         needs_review = ?,
         failed = ?
     WHERE id = ?`,
  ).run(
    input.finishedAt,
    input.totalDiscovered,
    input.processed,
    input.success,
    input.needsReview,
    input.failed,
    input.runId,
  );
}

export function upsertSourceFile(db: DatabaseSync, input: SourceFileUpsertInput): number {
  db.prepare(
    `INSERT INTO source_files (
      source_path,
      source_name,
      source_extension,
      size_bytes,
      modified_at,
      content_hash
    ) VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(content_hash) DO UPDATE SET
      source_path = excluded.source_path,
      source_name = excluded.source_name,
      source_extension = excluded.source_extension,
      size_bytes = excluded.size_bytes,
      modified_at = excluded.modified_at`,
  ).run(
    input.sourcePath,
    input.sourceName,
    input.sourceExtension,
    input.sizeBytes,
    input.modifiedAt,
    input.contentHash,
  );

  const row = db
    .prepare('SELECT id FROM source_files WHERE content_hash = ?')
    .get(input.contentHash) as { id: number };

  return row.id;
}

export function upsertCourse(
  db: DatabaseSync,
  input: {
    department: string;
    courseNumber: string;
    courseTitle: string;
    catalogDescription: string;
  },
): number {
  db.prepare(
    `INSERT INTO courses (department, course_number, course_title, catalog_description)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(department, course_number) DO UPDATE SET
       course_title = excluded.course_title,
       catalog_description = excluded.catalog_description`,
  ).run(input.department, input.courseNumber, input.courseTitle, input.catalogDescription);

  const row = db
    .prepare('SELECT id FROM courses WHERE department = ? AND course_number = ?')
    .get(input.department, input.courseNumber) as { id: number };

  return row.id;
}

export function upsertCourseTerm(
  db: DatabaseSync,
  input: {
    courseId: number;
    termCode: string;
    programCode: ProgramCode;
    coordinatorName: string;
    sourceFileId: number;
  },
): number {
  db.prepare(
    `INSERT INTO course_terms (course_id, term_code, program_code, coordinator_name, source_file_id)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(course_id, term_code, program_code) DO UPDATE SET
       coordinator_name = excluded.coordinator_name,
       source_file_id = excluded.source_file_id`,
  ).run(
    input.courseId,
    input.termCode,
    input.programCode,
    input.coordinatorName,
    input.sourceFileId,
  );

  const row = db
    .prepare('SELECT id FROM course_terms WHERE course_id = ? AND term_code = ? AND program_code = ?')
    .get(input.courseId, input.termCode, input.programCode) as { id: number };

  return row.id;
}

export function replaceCourseRequisites(
  db: DatabaseSync,
  input: {
    courseId: number;
    prerequisites: string;
    corequisites: string;
  },
): void {
  db.prepare('DELETE FROM course_requisites WHERE course_id = ?').run(input.courseId);

  const insert = db.prepare(
    'INSERT INTO course_requisites (course_id, requisite_type, requisite_text, sequence) VALUES (?, ?, ?, ?)',
  );

  if (input.prerequisites.trim() !== '') {
    insert.run(input.courseId, 'prerequisite', input.prerequisites, 1);
  }

  if (input.corequisites.trim() !== '') {
    insert.run(input.courseId, 'corequisite', input.corequisites, 2);
  }
}

export function replaceCourseClos(
  db: DatabaseSync,
  input: {
    courseId: number;
    clos: Array<{ outcomeCode: string; clo: string }>;
  },
): Array<{ id: number; outcomeCode: string; clo: string }> {
  db.prepare('DELETE FROM course_clos WHERE course_id = ?').run(input.courseId);

  const insert = db.prepare(
    'INSERT INTO course_clos (course_id, clo_code, clo_text, sequence) VALUES (?, ?, ?, ?)',
  );
  const select = db.prepare(
    'SELECT id FROM course_clos WHERE course_id = ? AND clo_code = ? AND sequence = ?',
  );

  return input.clos.map((item, index) => {
    insert.run(input.courseId, item.outcomeCode, item.clo, index + 1);
    const row = select.get(input.courseId, item.outcomeCode, index + 1) as { id: number };
    return {
      id: row.id,
      outcomeCode: item.outcomeCode,
      clo: item.clo,
    };
  });
}

export function replaceCourseCloPloMappings(
  db: DatabaseSync,
  input: {
    courseCloRows: Array<{ id: number }>;
    programCode: ProgramCode;
  },
): void {
  for (const courseClo of input.courseCloRows) {
    db.prepare('DELETE FROM course_clo_plo_mappings WHERE course_clo_id = ?').run(courseClo.id);
  }
}

export function insertFileRun(db: DatabaseSync, input: FileRunInsertInput): number {
  const result = db
    .prepare(
      `INSERT INTO file_runs (
        run_id,
        source_file_id,
        status,
        term_code,
        program_code,
        output_file,
        review_source_file,
        extracted_text_file,
        error_message,
        unresolved_field_count,
        unresolved_fields_json,
        extracted_text,
        parsed_draft_json,
        review_state_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.runId,
      input.sourceFileId,
      input.status,
      input.termCode,
      input.programCode,
      input.outputFile,
      input.reviewSourceFile,
      input.extractedTextFile,
      input.errorMessage,
      input.unresolvedFieldCount,
      asJson(input.unresolvedFields),
      input.extractedText,
      asJson(input.parsedDraft),
      asJson(input.reviewState),
    );

  return Number(result.lastInsertRowid);
}
