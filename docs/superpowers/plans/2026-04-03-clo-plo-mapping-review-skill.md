# CLO-PLO Mapping Review Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an interactive Codex skill that exports human-reviewable CLO-PLO mapping Markdown files from an ABET workspace catalog with initial mappings already proposed in `Final PLOs`, validates reviewed files, and applies approved mappings back into SQLite safely.

**Architecture:** Implement the skill in the user skill directory with a thin `SKILL.md` workflow and deterministic Python helper scripts. The scripts will read the existing managed workspace/catalog, generate one Markdown review file per course with initial mappings in `Final PLOs` and rationale in `Notes`, validate reviewed files strictly, and update `course_clo_plo_mappings` transactionally after approval.

**Tech Stack:** Codex skill folder structure, Python 3, SQLite, Markdown, existing ABET workspace schema

---

### Task 1: Create Skill Skeleton And Reference Material

**Files:**
- Create: `C:\Users\mmogi\.codex\skills\clo-plo-mapping-review\SKILL.md`
- Create: `C:\Users\mmogi\.codex\skills\clo-plo-mapping-review\agents\openai.yaml`
- Create: `C:\Users\mmogi\.codex\skills\clo-plo-mapping-review\references\db-schema.md`
- Create: `C:\Users\mmogi\.codex\skills\clo-plo-mapping-review\references\review-format.md`

- [ ] **Step 1: Create the skill folder structure**

```powershell
New-Item -ItemType Directory -Force -Path C:\Users\mmogi\.codex\skills\clo-plo-mapping-review | Out-Null
New-Item -ItemType Directory -Force -Path C:\Users\mmogi\.codex\skills\clo-plo-mapping-review\agents | Out-Null
New-Item -ItemType Directory -Force -Path C:\Users\mmogi\.codex\skills\clo-plo-mapping-review\references | Out-Null
New-Item -ItemType Directory -Force -Path C:\Users\mmogi\.codex\skills\clo-plo-mapping-review\scripts | Out-Null
```

- [ ] **Step 2: Write the skill frontmatter and core workflow**

```md
---
name: clo-plo-mapping-review
description: Use when reviewing, exporting, validating, or applying CLO-to-PLO mappings from an ABET workspace SQLite catalog, especially when a human should approve course-level mapping files before database updates.
---

# CLO-PLO Mapping Review

Use this skill when a user wants to:
- export CLO-PLO mapping review files from a workspace
- review mappings for one course, a term/program, or a filtered batch
- validate reviewed mapping Markdown files
- apply approved mappings into the SQLite catalog

## Workflow

1. Ask for missing inputs:
   - workspace path
   - program
   - term
   - scope (single course, whole term/program, or filtered batch)
   - mode (`export-review` or `apply-reviewed`)
2. Use the helper scripts in `scripts/`.
3. Export one Markdown review file per course.
4. Never update the DB without a reviewed file.
5. Abort updates if any CLO block is incomplete.

## Scripts

- Export review files: `scripts/export_review.py`
- Validate reviewed files: `scripts/validate_review.py`
- Apply approved files: `scripts/apply_review.py`

## References

- Database schema: `references/db-schema.md`
- Review file format: `references/review-format.md`
```

- [ ] **Step 3: Write the DB schema reference**

```md
# Database Schema

Relevant tables:
- `courses`
- `course_terms`
- `course_clos`
- `plo_definitions`
- `course_clo_plo_mappings`

Important relationships:
- `course_terms.course_id -> courses.id`
- `course_clos.course_id -> courses.id`
- `course_clo_plo_mappings.course_clo_id -> course_clos.id`
- `course_clo_plo_mappings.plo_id -> plo_definitions.id`

Program-scoped PLO uniqueness:
- `UNIQUE(program_code, plo_code)`

Course-term uniqueness:
- `UNIQUE(course_id, term_code, program_code)`
```

- [ ] **Step 4: Write the review-format reference**

```md
# Review File Format

Each file covers one course.

Required per-CLO block:

```md
### CLO 1.1
CLO Text: Explain the concept of sequences and series.

Suggested PLOs: [1, 4]
Approve: yes
Final PLOs: [1, 4]
Notes:
```

Rules:
- `Approve` must be `yes` or `no`
- `Final PLOs` is authoritative
- `Final PLOs: []` is allowed
- missing `Approve` or `Final PLOs` invalidates the whole file
```

- [ ] **Step 5: Generate `agents/openai.yaml`**

```powershell
python C:\Users\mmogi\.codex\skills\.system\skill-creator\scripts\generate_openai_yaml.py `
  --skill-dir C:\Users\mmogi\.codex\skills\clo-plo-mapping-review `
  --interface display_name="CLO-PLO Mapping Review" `
  --interface short_description="Export, review, validate, and apply CLO-PLO mappings from an ABET workspace catalog." `
  --interface default_prompt="Review CLO-PLO mappings for a workspace and prepare or apply approved Markdown mapping files."
```

### Task 2: Export Review Files And Initial Mappings

**Files:**
- Update: `C:\Users\mmogi\.codex\skills\clo-plo-mapping-review\scripts\export_review.py`
- Test manually against: `C:\Users\mmogi\Documents\AbetSyllabusData`

- [ ] **Step 1: Update the export script**

```python
from __future__ import annotations

import argparse
import pathlib
import sqlite3
from typing import Iterable


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--workspace", required=True)
    parser.add_argument("--program", required=True)
    parser.add_argument("--term", required=True)
    parser.add_argument("--course")
    parser.add_argument("--filter", default="single")
    return parser.parse_args()


def catalog_path(workspace: pathlib.Path) -> pathlib.Path:
    return workspace / "catalog" / "abet_syllabus_catalog.sqlite"


def export_dir(workspace: pathlib.Path) -> pathlib.Path:
    return workspace / "exports" / "clo-plo-review"


def fetch_courses(conn: sqlite3.Connection, program: str, term: str, course: str | None) -> list[sqlite3.Row]:
    sql = """
    SELECT c.id, c.course_number, c.course_title, c.department, ct.coordinator_name
    FROM courses c
    JOIN course_terms ct ON ct.course_id = c.id
    WHERE ct.program_code = ? AND ct.term_code = ?
    """
    params: list[str] = [program, term]
    if course:
        sql += " AND REPLACE(UPPER(c.course_number), ' ', '') = ?"
        params.append(course.replace(" ", "").upper())
    sql += " ORDER BY c.course_number"
    return list(conn.execute(sql, params))


def fetch_plos(conn: sqlite3.Connection, program: str) -> list[sqlite3.Row]:
    return list(
        conn.execute(
            """
            SELECT plo_code, plo_label, plo_description
            FROM plo_definitions
            WHERE program_code = ?
            ORDER BY CAST(plo_code AS INTEGER), plo_code
            """,
            [program],
        )
    )


def fetch_clos(conn: sqlite3.Connection, course_id: int) -> list[sqlite3.Row]:
    return list(
        conn.execute(
            """
            SELECT id, clo_code, clo_text
            FROM course_clos
            WHERE course_id = ?
            ORDER BY sequence
            """,
            [course_id],
        )
    )


def propose_initial_mapping(clo_text: str, plos: list[sqlite3.Row]) -> tuple[list[str], str]:
    ...


def render_review(course: sqlite3.Row, plos: list[sqlite3.Row], clos: list[sqlite3.Row], program: str, term: str) -> str:
    lines: list[str] = []
    lines.append(f"# {course['course_number']} CLO-PLO Mapping Review")
    lines.append("")
    lines.append(f"Program: {program}")
    lines.append(f"Term: {term}")
    lines.append(f"Course: {course['course_number']}")
    lines.append(f"Title: {course['course_title']}")
    lines.append(f"Department: {course['department']}")
    lines.append(f"Coordinator: {course['coordinator_name']}")
    lines.append("")
    lines.append("## PLO Reference")
    lines.append("")
    for plo in plos:
      lines.append(f"- PLO {plo['plo_code']} ({plo['plo_label']}): {plo['plo_description']}")
    lines.append("")
    lines.append("## CLO Review")
    lines.append("")
    for clo in clos:
      mapped, rationale = propose_initial_mapping(clo["clo_text"], plos)
      mapped_text = ", ".join(mapped)
      lines.append(f"### CLO {clo['clo_code']}")
      lines.append(f"CLO Text: {clo['clo_text']}")
      lines.append("")
      lines.append("Approve: yes")
      lines.append(f"Final PLOs: [{mapped_text}]")
      lines.append(f"Notes: {rationale}")
      lines.append("")
    return "\n".join(lines)


def main() -> None:
    args = parse_args()
    workspace = pathlib.Path(args.workspace)
    out_dir = export_dir(workspace)
    out_dir.mkdir(parents=True, exist_ok=True)

    conn = sqlite3.connect(catalog_path(workspace))
    conn.row_factory = sqlite3.Row
    try:
        plos = fetch_plos(conn, args.program)
        courses = fetch_courses(conn, args.program, args.term, args.course)
        for course in courses:
            clos = fetch_clos(conn, course["id"])
            text = render_review(course, plos, clos, args.program, args.term)
            file_name = f"{course['course_number'].replace(' ', '')}-{args.program}-{args.term}-clo-plo-review.md"
            (out_dir / file_name).write_text(text, encoding="utf-8")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Run the export script manually**

Run:

```powershell
python C:\Users\mmogi\.codex\skills\clo-plo-mapping-review\scripts\export_review.py `
  --workspace C:\Users\mmogi\Documents\AbetSyllabusData `
  --program MATH `
  --term 252 `
  --course MATH102
```

Expected:
- one Markdown file created in `C:\Users\mmogi\Documents\AbetSyllabusData\exports\clo-plo-review\`
- each CLO block has `Approve: yes`
- each CLO block has an initial `Final PLOs` mapping
- each CLO block has rationale text in `Notes`

### Task 3: Validate Reviewed Markdown Files Against The New Format

**Files:**
- Create: `C:\Users\mmogi\.codex\skills\clo-plo-mapping-review\scripts\validate_review.py`

- [ ] **Step 1: Write the validation script**

```python
from __future__ import annotations

import argparse
import pathlib
import re
import sys


CLO_BLOCK_RE = re.compile(
    r"### CLO (?P<clo_code>[^\n]+)\n"
    r"CLO Text: (?P<clo_text>[^\n]+)\n\n"
    r"Approve: (?P<approve>[^\n]+)\n"
    r"Final PLOs: \[(?P<final>[^\]]*)\]\n"
    r"Notes:?(?P<notes>.*?)(?=\n### CLO |\Z)",
    re.S,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--file", required=True)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    text = pathlib.Path(args.file).read_text(encoding="utf-8")
    matches = list(CLO_BLOCK_RE.finditer(text))
    if not matches:
        print("No valid CLO blocks found.", file=sys.stderr)
        raise SystemExit(1)

    errors: list[str] = []
    for match in matches:
        approve = match.group("approve").strip().lower()
        final = match.group("final").strip()
        clo_code = match.group("clo_code").strip()

        if approve not in {"yes", "no"}:
            errors.append(f"{clo_code}: Approve must be yes or no")

        if final == "":
            errors.append(f"{clo_code}: Final PLOs must be present, use [] for no mapping")

    if errors:
        print("\n".join(errors), file=sys.stderr)
        raise SystemExit(1)

    print("Validation passed.")


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Run the validator against an exported file and confirm failure before review**

Run:

```powershell
python C:\Users\mmogi\.codex\skills\clo-plo-mapping-review\scripts\validate_review.py `
  --file C:\Users\mmogi\Documents\AbetSyllabusData\exports\clo-plo-review\MATH102-MATH-252-clo-plo-review.md
```

Expected:
- PASS for exported files, because `Approve` is prefilled as `yes`

### Task 4: Apply Approved Reviews Transactionally

**Files:**
- Create: `C:\Users\mmogi\.codex\skills\clo-plo-mapping-review\scripts\apply_review.py`

- [ ] **Step 1: Write the apply script**

```python
from __future__ import annotations

import argparse
import pathlib
import re
import sqlite3


CLO_BLOCK_RE = re.compile(
    r"### CLO (?P<clo_code>[^\n]+)\n"
    r"CLO Text: (?P<clo_text>[^\n]+)\n\n"
    r"Approve: (?P<approve>[^\n]+)\n"
    r"Final PLOs: \[(?P<final>[^\]]*)\]\n"
    r"Notes:?(?P<notes>.*?)(?=\n### CLO |\Z)",
    re.S,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--workspace", required=True)
    parser.add_argument("--file", required=True)
    parser.add_argument("--program", required=True)
    parser.add_argument("--course", required=True)
    return parser.parse_args()


def parse_codes(value: str) -> list[str]:
    value = value.strip()
    if value == "":
        return []
    return [part.strip() for part in value.split(",") if part.strip()]


def main() -> None:
    args = parse_args()
    db_path = pathlib.Path(args.workspace) / "catalog" / "abet_syllabus_catalog.sqlite"
    text = pathlib.Path(args.file).read_text(encoding="utf-8")
    matches = list(CLO_BLOCK_RE.finditer(text))

    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    try:
        course = conn.execute(
            "SELECT id FROM courses WHERE REPLACE(UPPER(course_number), ' ', '') = ?",
            [args.course.replace(" ", "").upper()],
        ).fetchone()
        if course is None:
            raise SystemExit("Course not found.")

        clo_rows = {
            row["clo_code"]: row["id"]
            for row in conn.execute(
                "SELECT id, clo_code FROM course_clos WHERE course_id = ?",
                [course["id"]],
            ).fetchall()
        }

        plo_rows = {
            row["plo_code"]: row["id"]
            for row in conn.execute(
                "SELECT id, plo_code FROM plo_definitions WHERE program_code = ?",
                [args.program],
            ).fetchall()
        }

        parsed: list[tuple[int, list[int]]] = []
        for match in matches:
            clo_code = match.group("clo_code").strip()
            approve = match.group("approve").strip().lower()
            final_codes = parse_codes(match.group("final"))

            if approve not in {"yes", "no"}:
                raise SystemExit(f"{clo_code}: invalid Approve value")
            if clo_code not in clo_rows:
                raise SystemExit(f"{clo_code}: CLO not found in DB")

            plo_ids: list[int] = []
            for code in final_codes:
                if code not in plo_rows:
                    raise SystemExit(f"{clo_code}: unknown PLO code {code}")
                plo_ids.append(plo_rows[code])

            parsed.append((clo_rows[clo_code], plo_ids))

        with conn:
            for clo_id, _ in parsed:
                conn.execute("DELETE FROM course_clo_plo_mappings WHERE course_clo_id = ?", [clo_id])
            for clo_id, plo_ids in parsed:
                for plo_id in plo_ids:
                    conn.execute(
                        """
                        INSERT INTO course_clo_plo_mappings
                        (course_clo_id, plo_id, mapping_source, mapping_confidence, raw_mapping_text)
                        VALUES (?, ?, 'reviewed-markdown', 'approved', '')
                        """,
                        [clo_id, plo_id],
                    )
        print("Approved mappings applied.")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Validate the review file, edit one exported file to completion, then apply it**

Run:

```powershell
python C:\Users\mmogi\.codex\skills\clo-plo-mapping-review\scripts\validate_review.py `
  --file C:\Users\mmogi\Documents\AbetSyllabusData\exports\clo-plo-review\MATH102-MATH-252-clo-plo-review.md

python C:\Users\mmogi\.codex\skills\clo-plo-mapping-review\scripts\apply_review.py `
  --workspace C:\Users\mmogi\Documents\AbetSyllabusData `
  --file C:\Users\mmogi\Documents\AbetSyllabusData\exports\clo-plo-review\MATH102-MATH-252-clo-plo-review.md `
  --program MATH `
  --course MATH102
```

Expected:
- validator passes for exported files
- apply script writes mappings transactionally

### Task 5: Forward-Test The Skill End To End

**Files:**
- Verify: `C:\Users\mmogi\.codex\skills\clo-plo-mapping-review\SKILL.md`
- Verify: `C:\Users\mmogi\.codex\skills\clo-plo-mapping-review\scripts\export_review.py`
- Verify: `C:\Users\mmogi\.codex\skills\clo-plo-mapping-review\scripts\validate_review.py`
- Verify: `C:\Users\mmogi\.codex\skills\clo-plo-mapping-review\scripts\apply_review.py`

- [ ] **Step 1: Verify single-course export flow**

Run:

```powershell
python C:\Users\mmogi\.codex\skills\clo-plo-mapping-review\scripts\export_review.py `
  --workspace C:\Users\mmogi\Documents\AbetSyllabusData `
  --program MATH `
  --term 252 `
  --course MATH102
```

Expected:
- one review file for `MATH102`

- [ ] **Step 2: Verify batch export flow**

Run:

```powershell
python C:\Users\mmogi\.codex\skills\clo-plo-mapping-review\scripts\export_review.py `
  --workspace C:\Users\mmogi\Documents\AbetSyllabusData `
  --program MATH `
  --term 252
```

Expected:
- one review file per matched course

- [ ] **Step 3: Confirm the skill instructions are interactive**

Manual check:
- if the user does not provide workspace/program/term/mode, the skill asks for them
- if the user requests apply mode, the skill validates before writing
- if any CLO block is incomplete, the skill refuses to apply
