import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { DatabaseSync } from 'node:sqlite';

import { openCatalogDb } from './catalogDb';
import { resolveWorkspace } from './workspace';
import type { ProgramCode } from './batchTypes';

type QueryScalar = string | number | null;
type QueryRow = Record<string, QueryScalar>;

export type QueryCommand =
  | 'runs'
  | 'courses'
  | 'needs-review'
  | 'clos'
  | 'course-plo-mappings'
  | 'program-plo-matrix'
  | 'sql';

export interface QueryOptions {
  workspaceDir: string;
  catalogDbPath?: string;
  command: QueryCommand;
  programCode?: ProgramCode;
  termCode?: string;
  courseNumber?: string;
  limit?: number;
  sql?: string;
  exportCsv?: boolean;
}

export interface QueryResult {
  title: string;
  headers: string[];
  rows: QueryRow[];
  exportPath?: string;
}

function normalizeCourseNumber(value: string): string {
  return value.replace(/\s+/g, '').toUpperCase();
}

function quoteCsv(value: QueryScalar): string {
  const text = value == null ? '' : String(value);
  if (!/[",\n]/.test(text)) {
    return text;
  }
  return `"${text.replace(/"/g, '""')}"`;
}

function buildCsv(headers: string[], rows: QueryRow[]): string {
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((header) => quoteCsv(row[header] ?? null)).join(','));
  }
  return lines.join('\n');
}

async function writeExportCsv(
  exportsDir: string,
  fileName: string,
  headers: string[],
  rows: QueryRow[],
): Promise<string> {
  await mkdir(exportsDir, { recursive: true });
  const exportPath = join(exportsDir, fileName);
  await writeFile(exportPath, buildCsv(headers, rows), 'utf8');
  return exportPath;
}

function usageError(message: string): never {
  throw new Error(message);
}

function getCourseRowsSql(): string {
  return `
    SELECT
      c.course_number AS course,
      c.course_title AS title,
      ct.term_code AS term,
      ct.program_code AS program,
      ct.coordinator_name AS coordinator
    FROM courses c
    JOIN course_terms ct ON ct.course_id = c.id
  `;
}

function queryRuns(db: DatabaseSync, limit: number): QueryResult {
  const rows = db
    .prepare(
      `SELECT
         id,
         started_at,
         finished_at,
         term_code,
         program_code,
         total_discovered,
         success,
         needs_review,
         failed
       FROM runs
       ORDER BY id DESC
       LIMIT ?`,
    )
    .all(limit) as QueryRow[];

  return {
    title: 'Runs',
    headers: [
      'id',
      'started_at',
      'finished_at',
      'term_code',
      'program_code',
      'total_discovered',
      'success',
      'needs_review',
      'failed',
    ],
    rows,
  };
}

function queryCourses(
  db: DatabaseSync,
  options: { programCode?: ProgramCode; termCode?: string; limit: number },
): QueryResult {
  const filters: string[] = [];
  const params: Array<string | number> = [];

  if (options.programCode) {
    filters.push('ct.program_code = ?');
    params.push(options.programCode);
  }

  if (options.termCode) {
    filters.push('ct.term_code = ?');
    params.push(options.termCode);
  }

  const sql = `
    ${getCourseRowsSql()}
    ${filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : ''}
    ORDER BY c.course_number
    LIMIT ?
  `;

  const rows = db.prepare(sql).all(...params, options.limit) as QueryRow[];
  return {
    title: 'Courses',
    headers: ['course', 'title', 'term', 'program', 'coordinator'],
    rows,
  };
}

function queryNeedsReview(
  db: DatabaseSync,
  options: { programCode?: ProgramCode; termCode?: string; limit: number },
): QueryResult {
  const filters = ['fr.status = ?'];
  const params: Array<string | number> = ['needs_review'];

  if (options.programCode) {
    filters.push('fr.program_code = ?');
    params.push(options.programCode);
  }

  if (options.termCode) {
    filters.push('fr.term_code = ?');
    params.push(options.termCode);
  }

  const rows = db
    .prepare(
      `SELECT
         sf.source_name AS source_file,
         fr.term_code,
         fr.program_code,
         fr.unresolved_field_count,
         fr.unresolved_fields_json,
         fr.error_message
       FROM file_runs fr
       JOIN source_files sf ON sf.id = fr.source_file_id
       WHERE ${filters.join(' AND ')}
       ORDER BY fr.id DESC
       LIMIT ?`,
    )
    .all(...params, options.limit) as QueryRow[];

  return {
    title: 'Needs Review',
    headers: [
      'source_file',
      'term_code',
      'program_code',
      'unresolved_field_count',
      'unresolved_fields_json',
      'error_message',
    ],
    rows,
  };
}

function queryClos(db: DatabaseSync, courseNumber: string): QueryResult {
  const rows = db
    .prepare(
      `SELECT
         c.course_number AS course,
         cc.clo_code,
         cc.clo_text
       FROM course_clos cc
       JOIN courses c ON c.id = cc.course_id
       WHERE REPLACE(UPPER(c.course_number), ' ', '') = ?
       ORDER BY cc.sequence`,
    )
    .all(normalizeCourseNumber(courseNumber)) as QueryRow[];

  return {
    title: `CLOs for ${courseNumber}`,
    headers: ['course', 'clo_code', 'clo_text'],
    rows,
  };
}

function queryCoursePloMappings(
  db: DatabaseSync,
  options: { courseNumber: string; termCode?: string; programCode?: ProgramCode },
): QueryResult {
  const filters = [`REPLACE(UPPER(c.course_number), ' ', '') = ?`];
  const params: Array<string | number> = [normalizeCourseNumber(options.courseNumber)];

  if (options.termCode) {
    filters.push('ct.term_code = ?');
    params.push(options.termCode);
  }

  if (options.programCode) {
    filters.push('ct.program_code = ?');
    params.push(options.programCode);
  }

  const rows = db
    .prepare(
      `SELECT DISTINCT
         c.course_number AS course,
         cc.clo_code,
         pd.plo_code,
         pd.plo_label
       FROM courses c
       JOIN course_terms ct ON ct.course_id = c.id
       JOIN course_clos cc ON cc.course_id = c.id
       JOIN course_clo_plo_mappings map ON map.course_clo_id = cc.id
       JOIN plo_definitions pd ON pd.id = map.plo_id
       WHERE ${filters.join(' AND ')}
       ORDER BY c.course_number, cc.clo_code, pd.plo_code`,
    )
    .all(...params) as QueryRow[];

  return {
    title: `Course-PLO mappings for ${options.courseNumber}`,
    headers: ['course', 'clo_code', 'plo_code', 'plo_label'],
    rows,
  };
}

function queryProgramPloMatrix(
  db: DatabaseSync,
  options: { programCode: ProgramCode; termCode?: string },
): QueryResult {
  const plos = db
    .prepare(
      `SELECT plo_code, plo_label
       FROM plo_definitions
       WHERE program_code = ?
       ORDER BY CAST(plo_code AS INTEGER), plo_code`,
    )
    .all(options.programCode) as Array<{ plo_code: string; plo_label: string }>;

  const filters = ['ct.program_code = ?'];
  const params: Array<string | number> = [options.programCode];
  if (options.termCode) {
    filters.push('ct.term_code = ?');
    params.push(options.termCode);
  }

  const mappingRows = db
    .prepare(
      `SELECT DISTINCT
         c.course_number AS course,
         ct.term_code AS term,
         pd.plo_code
       FROM courses c
       JOIN course_terms ct ON ct.course_id = c.id
       LEFT JOIN course_clos cc ON cc.course_id = c.id
       LEFT JOIN course_clo_plo_mappings map ON map.course_clo_id = cc.id
       LEFT JOIN plo_definitions pd ON pd.id = map.plo_id
       WHERE ${filters.join(' AND ')}
       ORDER BY c.course_number`,
    )
    .all(...params) as Array<{ course: string; term: string; plo_code: string | null }>;

  const byCourse = new Map<string, QueryRow>();
  for (const row of mappingRows) {
    const key = row.course;
    const existing = byCourse.get(key) ?? { course: row.course, term: row.term };
    if (row.plo_code) {
      existing[`PLO${row.plo_code}`] = 'x';
    }
    byCourse.set(key, existing);
  }

  const headers = ['course', 'term', ...plos.map((plo) => `PLO${plo.plo_code}`)];
  const rows = [...byCourse.values()].map((row) => {
    const normalized: QueryRow = { course: row.course ?? '', term: row.term ?? '' };
    for (const plo of plos) {
      normalized[`PLO${plo.plo_code}`] = row[`PLO${plo.plo_code}`] ?? '';
    }
    return normalized;
  });

  return {
    title: `Program PLO matrix for ${options.programCode}${options.termCode ? ` ${options.termCode}` : ''}`,
    headers,
    rows,
  };
}

function querySql(db: DatabaseSync, sql: string): QueryResult {
  if (!/^\s*(select|with|pragma|explain)\b/i.test(sql)) {
    usageError('Raw SQL mode only allows read-only statements such as SELECT, WITH, PRAGMA, or EXPLAIN.');
  }

  const rows = db.prepare(sql).all() as QueryRow[];
  const headers = rows[0] ? Object.keys(rows[0]) : [];
  return {
    title: 'Raw SQL',
    headers,
    rows,
  };
}

function defaultExportName(command: QueryCommand, options: QueryOptions): string {
  const suffix = options.termCode ? `-${options.termCode}` : '';
  switch (command) {
    case 'program-plo-matrix':
      return `plo-matrix-${options.programCode ?? 'program'}${suffix}.csv`;
    case 'course-plo-mappings':
      return `course-plo-mappings-${normalizeCourseNumber(options.courseNumber ?? 'course')}${suffix}.csv`;
    case 'runs':
      return 'runs.csv';
    case 'courses':
      return `courses-${options.programCode ?? 'all'}${suffix}.csv`;
    case 'needs-review':
      return `needs-review-${options.programCode ?? 'all'}${suffix}.csv`;
    case 'clos':
      return `clos-${normalizeCourseNumber(options.courseNumber ?? 'course')}.csv`;
    case 'sql':
      return 'sql-query.csv';
  }
}

export function getQueryHelpText(): string {
  return [
    'Usage: npm run query -- "<workspaceDir>" <command> [options]',
    '',
    'Commands:',
    '  runs',
    '  courses --program <MATH|AS|DATA> [--term 252] [--limit 50]',
    '  needs-review [--program <MATH|AS|DATA>] [--term 252] [--limit 50]',
    '  clos --course <MATH102>',
    '  course-plo-mappings --course <MATH102> [--program <MATH|AS|DATA>] [--term 252]',
    '  program-plo-matrix --program <MATH|AS|DATA> [--term 252]',
    '  sql --sql "<SELECT ...>"',
    '',
    'Flags:',
    '  --workspace <path>',
    '  --catalog-db <path>',
    '  --export',
    '',
    'Examples:',
    '  npm run query -- "C:\\Users\\mmogi\\Documents\\AbetSyllabusData" runs',
    '  npm run query -- "C:\\Users\\mmogi\\Documents\\AbetSyllabusData" program-plo-matrix --program MATH --term 252 --export',
    '  npm run query -- "C:\\Users\\mmogi\\Documents\\AbetSyllabusData" sql --sql "select course_number, course_title from courses limit 10"',
  ].join('\n');
}

export async function runCatalogQuery(options: QueryOptions): Promise<QueryResult> {
  const workspace = await resolveWorkspace(options.workspaceDir, { adoptSourceFiles: false });
  const catalogDbPath = options.catalogDbPath ?? join(workspace.catalogDir, 'abet_syllabus_catalog.sqlite');
  const db = openCatalogDb(catalogDbPath);

  try {
    let result: QueryResult;
    const limit = options.limit ?? 50;

    switch (options.command) {
      case 'runs':
        result = queryRuns(db, limit);
        break;
      case 'courses':
        result = queryCourses(db, {
          programCode: options.programCode,
          termCode: options.termCode,
          limit,
        });
        break;
      case 'needs-review':
        result = queryNeedsReview(db, {
          programCode: options.programCode,
          termCode: options.termCode,
          limit,
        });
        break;
      case 'clos':
        result = queryClos(db, options.courseNumber ?? usageError('The `clos` command requires --course.'));
        break;
      case 'course-plo-mappings':
        result = queryCoursePloMappings(db, {
          courseNumber:
            options.courseNumber ?? usageError('The `course-plo-mappings` command requires --course.'),
          termCode: options.termCode,
          programCode: options.programCode,
        });
        break;
      case 'program-plo-matrix':
        result = queryProgramPloMatrix(db, {
          programCode:
            options.programCode ??
            usageError('The `program-plo-matrix` command requires --program <MATH|AS|DATA>.'),
          termCode: options.termCode,
        });
        break;
      case 'sql':
        result = querySql(db, options.sql ?? usageError('The `sql` command requires --sql "<query>".'));
        break;
      default:
        usageError(`Unsupported query command: ${options.command satisfies never}`);
    }

    if (options.exportCsv) {
      const exportPath = await writeExportCsv(
        workspace.exportsDir,
        defaultExportName(options.command, options),
        result.headers,
        result.rows,
      );
      result = { ...result, exportPath };
    }

    return result;
  } finally {
    db.close();
  }
}

