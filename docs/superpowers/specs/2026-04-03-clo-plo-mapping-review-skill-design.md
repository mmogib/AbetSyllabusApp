# CLO-PLO Mapping Review Skill Design

**Skill name:** `clo-plo-mapping-review`

**Install location:** `C:\Users\mmogi\.codex\skills\clo-plo-mapping-review`

## Goal

Create an interactive Codex skill that helps review and update CLO-to-PLO mappings stored in the central SQLite catalog for an ABET syllabus workspace.

The skill should:
- ask the user for any missing required inputs
- read the database from a user-provided workspace
- export a human-friendly Markdown review file
- generate an initial CLO-to-PLO mapping during export
- wait for human review and approval
- validate the reviewed file strictly
- update the database only after approval

## Why A Skill

This workflow is larger than a single query or script:
- it requires guided interaction
- it needs repeated access to a known database schema
- it has a human approval gate
- it benefits from a reusable procedure and helper scripts

So the right shape is a reusable Codex skill plus a few deterministic helper scripts.

## Scope

### V1 In Scope

- interactive workflow
- one course or a filtered batch of courses
- read workspace and catalog database
- read CLOs and PLO definitions
- generate initial CLO-to-PLO mappings
- generate one Markdown review file per course
- validate reviewed Markdown strictly
- apply approved mappings to `course_clo_plo_mappings`
- transactional database update

### V1 Out Of Scope

- automatic mapping inference across the full program in one pass
- multi-course batch approval files
- UI integration into the web app
- modifying CLOs or PLO definitions themselves
- fuzzy parsing of free-form human notes into mappings

## User Workflow

### Phase 1: Review Export

The user asks Codex to review mappings for a workspace/course.

The skill asks for missing inputs if not already given:
- workspace path
- program code
- term code
- scope:
  - one course
  - all courses in a term/program
  - filtered subset by criteria
- mode: `export-review` or `apply-reviewed`

Then the skill:
1. resolves the workspace
2. opens the catalog database
3. loads:
   - course identity
   - course term record
   - CLO rows
   - PLO definitions for the selected program
4. selects matching courses from the catalog
5. generates an initial mapping for each CLO
6. writes one Markdown review file per selected course into a review/export folder

### Phase 2: Human Review

The human reviews the Markdown file and edits the approval fields.

### Phase 3: Apply Approved Review

The user asks Codex to apply the reviewed mapping file.

The skill:
1. reads the Markdown file
2. validates that every CLO block is complete
3. rejects the file if any required field is missing
4. updates the DB transactionally

## Interaction Model

The skill must be interactive.

If the user does not provide enough information, the skill should ask for it explicitly rather than guessing.

Required inputs:
- workspace path
- program: `MATH`, `AS`, or `DATA`
- term code
- scope definition:
  - exact course number, or
  - batch selection criteria
- desired mode:
  - export review file
  - apply approved review file

Optional inputs:
- exact review file path
- custom export location inside workspace
- filter criteria for batch export such as:
  - only courses with no mappings
  - only courses with incomplete mappings
  - explicit course-number prefix or list

## Workspace Assumptions

The skill works against the existing managed workspace structure:

```text
<workspace>/
  index/
  inbox/
  processed/
  runs/
  catalog/
    abet_syllabus_catalog.sqlite
  exports/
  logs/
```

The skill reads from:
- `catalog/abet_syllabus_catalog.sqlite`

The skill writes review Markdown files to:
- `<workspace>/exports/clo-plo-review/`

## Review File Format

The review file should be Markdown, human-readable first.

Each file still covers one course only.

For batch review, the skill generates many one-course files, not one giant combined file.

### File Header

The file should contain:
- program
- term
- course number
- course title
- department
- coordinator

### PLO Reference Section

List all PLOs for the selected program with:
- PLO code
- PLO label
- full description

### CLO Review Section

For each CLO, include:

```md
### CLO 1.1
CLO Text: Explain the concept of sequences and series.

Approve: yes
Final PLOs: [1, 4]
Notes: Mapped to PLO 1 for mathematical foundations and PLO 4 for problem-solving/application.
```

Rules:
- `Approve` defaults to `yes`
- `Approve` must be `yes` or `no`
- `Final PLOs` is authoritative
- `Final PLOs` is prefilled by the initial mapping pass
- `Final PLOs: []` is allowed as an explicit no-mapping decision
- `Notes` should carry the mapping rationale

## Validation Rules

The updater must be strict.

For every CLO block:
- the block must exist
- `Approve` must be present and be `yes` or `no`
- `Final PLOs` must be present
- every listed PLO code must exist for the selected program

If any CLO block is incomplete or invalid:
- abort the whole update
- do not partially update the database
- report the exact validation failures

## Database Update Rules

Target table:
- `course_clo_plo_mappings`

Related tables used for validation:
- `courses`
- `course_terms`
- `course_clos`
- `plo_definitions`

Update behavior:
1. resolve the course and term
2. resolve all course CLO rows
3. resolve selected PLO definition rows for the program
4. start a transaction
5. delete existing mappings for the selected course’s CLO rows
6. insert the approved mappings from `Final PLOs`
7. commit only if all inserts succeed

If anything fails:
- roll back the transaction

## Helper Script Responsibilities

The skill should use deterministic helper scripts for fragile operations.

Recommended scripts:

### `scripts/export_review.py` or `scripts/export_review.ts`

Responsibilities:
- read workspace/catalog path
- query course/CLO/PLO data
- support scope selection:
  - single course
  - all courses in a term/program
  - filtered subsets
- generate initial CLO-to-PLO mappings with rationale
- emit one Markdown review file per selected course

### `scripts/validate_review.py` or `scripts/validate_review.ts`

Responsibilities:
- parse the Markdown review file
- validate completeness and correctness
- produce a structured validation result

### `scripts/apply_review.py` or `scripts/apply_review.ts`

Responsibilities:
- parse reviewed Markdown
- validate again before write
- update mappings transactionally

## Skill Triggering

The explicit skill name should be used because it is clear and searchable:
- `clo-plo-mapping-review`

Example trigger intents:
- “Use clo-plo-mapping-review for MATH102”
- “Export a CLO-PLO mapping review for this workspace”
- “Apply the reviewed CLO-PLO mapping file”

## Safety Principles

- never write to the DB without a reviewed file
- never partially apply incomplete reviews
- never infer missing approval fields
- always prefer validation failure over silent guessing
- treat `Final PLOs` as the only authoritative mapping field

## Recommended V1 Implementation Shape

Skill folder:

```text
C:\Users\mmogi\.codex\skills\clo-plo-mapping-review/
  SKILL.md
  agents/
    openai.yaml
  scripts/
    export_review.py
    validate_review.py
    apply_review.py
  references/
    db-schema.md
    review-format.md
```

## Scope Selection Model

The skill should support three scope modes:

### 1. Single Course

Inputs:
- workspace
- program
- term
- course number

Output:
- one review Markdown file

### 2. Whole Term / Program

Inputs:
- workspace
- program
- term

Output:
- one review Markdown file per course in that program/term

### 3. Filtered Batch

Inputs:
- workspace
- program
- term
- one or more criteria

Recommended first criteria:
- `unmapped-only`
- `has-no-mappings`
- `has-some-mappings`
- explicit course list

Output:
- one review Markdown file per matched course

## Why Batch Is Still One File Per Course

Even if AI can reason across many courses, human review quality will drop if everything is combined into one giant document.

So the better design is:
- selection can be batch
- review files remain one course per file
- apply step can process one reviewed file or a folder of reviewed files

This keeps the review surface readable while still allowing large-term coverage.

## Initial Mapping Behavior

The initial mapping generated during export is the review starting point.

That means:
- `Final PLOs` is prefilled during export
- `Approve` starts as `yes`
- the reviewer changes the mapping only when they disagree
- `Notes` should explain the rationale so the reviewer can assess it quickly

The human reviewer remains authoritative.
