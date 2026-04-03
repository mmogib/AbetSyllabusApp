# Central DB And CLI Structure Note

Date: 2026-04-03

## Goal

Design the next phase around:
- one central SQLite database for all processed files
- cleaner separation between repo code and CLI runtime data
- richer academic data capture, including course description, requisites, CLOs, and CLO-to-PLO mappings

## Recommended Separation

Separate three things clearly:

1. App/code inside the repo
2. CLI code inside the repo
3. Operational data outside the repo

This avoids top-level clutter such as:
- `cli_processing/`
- `batch_output/`
- `data_abet_syllabi/`
- `data_courses/`
- `.cli-dist/`

## Recommended Repo Structure

Keep the repository focused on code:

```text
repo/
  src/
    cli/
    components/
    lib/
    state/
    styles/
    types/
  tests/
    cli/
    ...
  output_template/
  docs/
  notes/
  scripts/          optional later
  .gitignore
  package.json
```

Inside the repo:
- `src/cli/` for CLI code only
- `tests/cli/` for CLI tests only
- no real input/output data folders tracked in git
- no database file in the repo
- no review/output artifacts in the repo

## Recommended Runtime Structure Outside The Repo

Use one external workspace folder, for example:

```text
D:\AbetSyllabusData\
  catalog\
    abet_syllabus_catalog.sqlite
    plo_catalog.json
  inbox\
  runs\
    2026-04-03_1100\
      output\
        success\
        review\
        report.csv
        report.json
  exports\
  logs\
```

Recommended meanings:
- `catalog/`: central SQLite DB and reference files like PLO definitions
- `inbox/`: raw input files when a staging area is useful
- `runs/`: per-run artifacts and reports
- `exports/`: later, for CSV extracts or DB exports
- `logs/`: optional later

## Database Direction

The database should capture more than summary report rows.

Minimum useful academic schema:

### `source_files`

One row per unique source document:
- path
- filename
- extension
- size
- modified time
- content hash

### `runs`

One row per CLI execution:
- input dir
- output dir
- term code
- timestamps
- summary counts

### `file_runs`

One row per file processed in one run:
- links a source file to a run
- status
- output path
- review path
- extracted text path
- error message
- key parsed metadata

### `courses`

Stable course-level academic data:
- department
- course number
- course title
- catalog description

Important note:
- `teacherName` or coordinator name is not a permanent course field
- a course may be taught by many people
- only the coordinator attached to a specific term file should be stored for that term

### `course_terms`

One row per `course + term + program`:
- `course_id`
- `term_code`
- `program_code`
- `coordinator_name`
- `source_file_id`
- unique constraint on `course_id + term_code + program_code`

Business rule:
- each term has one processed file for that course within the selected program

### `course_requisites`

Separate table related to the course:
- `course_id`
- type: `prerequisite` or `corequisite`
- text
- normalized text later if needed

### `course_clos`

One row per CLO related to the course:
- `course_id`
- `clo_code` if present, such as `1.1`
- `clo_text`
- `sequence`

### `plo_definitions`

Master PLO table to be populated later:
- `program_code`
- `plo_code`
- `plo_label`
- `plo_description`

Allowed program codes:
- `MATH`
- `AS`
- `DATA`

### `course_clo_plo_mappings`

Many-to-many mapping:
- `course_clo_id`
- `plo_id`
- `mapping_source`
- `mapping_confidence`
- `raw_mapping_text`

Cardinality note:
- one CLO may map to more than one PLO
- one PLO may map to more than one CLO

## Strong Recommendation On Storage Shape

Do not flatten everything into columns only.

Use:
- columns for filtering and reporting
- JSON/text for full fidelity

Examples that should be explicit columns:
- status
- department
- course number
- course title
- catalog description
- term code
- program code
- coordinator name
- unresolved field count
- output file
- error message
- source extension
- content hash

Examples that should also be stored as JSON/text:
- full extracted text
- full parsed draft object
- full review state
- unresolved fields array
- future parser diagnostics

## Important Modeling Decision

Do not make `courses` fully canonical across all runs yet.

For v1:
- `source_files` = physical document identity
- `file_runs` = one processing event
- `courses` = stable course-level academic identity
- `course_terms` = coordinator and source for a course in a specific term and program
- `course_requisites` = course-level requisites
- `course_clos` = course-level CLOs
- mappings = course-level CLO-to-PLO relationships

Reason:
- the same source may be reprocessed later
- the parser will improve
- output and mappings may evolve over time

This preserves history.

## Course Data That Must Be Captured

The central DB should capture at least:
- course description
- prerequisites
- corequisites
- term code
- program code
- coordinator name for that term file
- CLOs, one row per CLO
- CLO-to-PLO mappings

This means:
- course description belongs in `courses`
- prerequisites/corequisites belong in `course_requisites`
- term/program/coordinator belong in `course_terms`
- CLOs belong in `course_clos`
- CLO-PLO relationships belong in `course_clo_plo_mappings`

## Folder Cleanup Recommendation

Treat these as runtime artifacts, not repo structure:
- `cli_processing/`
- `batch_output/`
- `data_abet_syllabi/`
- `data_courses/`

Recommendation:
- move all of them under one external root such as `D:\AbetSyllabusData\`
- make future CLI runs default to external paths rather than repo-root folders

Also:
- keep `.cli-dist/` gitignored and in-repo
- move `tmp_bus200_review.txt` into a temp/debug area or delete it when no longer needed
- keep `input_samples/` only for small regression fixtures, not operational backlog input

## Recommended CLI Path Design

Add explicit flags:
- `--catalog-db <path>`
- `--input <path>`
- `--output <path>`
- `--program <MATH|AS|DATA>`
- later: `--plo-file <path>`

Recommended behavior:
- `--catalog-db` points to the central DB outside the repo
- `--output` points to one run folder
- `--input` can be anywhere
- `--program` is required so the CLI can select the correct PLO set during processing

Example:

```bash
npm run batch -- --input "D:\AbetSyllabusData\inbox" --output "D:\AbetSyllabusData\runs\2026-04-03_1100\output" --catalog-db "D:\AbetSyllabusData\catalog\abet_syllabus_catalog.sqlite" --program MATH
```

## Recommended Implementation Order

1. Normalize folder strategy and CLI path flags
2. Add central SQLite database support
3. Create tables:
   - `runs`
   - `source_files`
   - `file_runs`
   - `courses`
   - `course_terms`
   - `course_requisites`
   - `course_clos`
   - `plo_definitions`
   - `course_clo_plo_mappings`
4. Persist:
   - course description
   - prerequisites/corequisites
   - term/program/coordinator
   - CLO rows
   - parsed draft JSON
   - review state JSON
5. Add PLO import keyed by `program_code` once the PLO source is provided
6. Update docs and `.gitignore`

## Recommendation Summary

Use this split:
- repo holds code only
- one central external SQLite DB
- one external runtime data root
- normalized academic tables for course data, term-specific coordinator data, requisites, CLOs, and CLO-PLO mappings
