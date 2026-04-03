# Public Release Preparation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prepare the ABET syllabus app for public beta publication with current docs, repo hygiene, GitHub hosting, and Netlify deployment metadata.

**Architecture:** Keep the app as a static client-only Vite deployment. Document the real current state, publish the repository under the requested owner, and configure Netlify to build directly from the public repo without introducing backend infrastructure.

**Tech Stack:** Vite, React, TypeScript, Vitest, Netlify, GitHub CLI

---

## File Structure

- Modify: `AGENTS.md`
- Create: `README.md`
- Create: `.gitignore`
- Create: `netlify.toml`
- Create: `docs/superpowers/plans/2026-04-03-release-publication.md`
- Modify: `notes/session_handoff.md`
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `C:\Users\mmogi\.codex\memories\abet-syllabus-app.md`

### Task 1: Refresh Current-State Documentation

**Files:**
- Modify: `AGENTS.md`
- Modify: `notes/session_handoff.md`
- Create: `README.md`

- [ ] Replace stale prototype wording with the actual beta state
- [ ] Document current capabilities, known limitations, and restart instructions
- [ ] Add a repository-facing README for public testers and collaborators

### Task 2: Add Release Hygiene Files

**Files:**
- Create: `.gitignore`
- Create: `netlify.toml`
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] Add ignore rules for generated and local-only files
- [ ] Add Netlify build metadata for static deployment
- [ ] Align package metadata with the public repository name

### Task 3: Save Durable Session Memory

**Files:**
- Create: `C:\Users\mmogi\.codex\memories\abet-syllabus-app.md`

- [ ] Save the current product state, template choice, deployment target, and testing guidance for future sessions

### Task 4: Publish Repository

**Files:**
- Modify: `.git/` metadata created during execution

- [ ] Initialize git in the workspace
- [ ] Create the first repository commit
- [ ] Create `mmogib/AbetSyllabusApp` as a public GitHub repository with `gh`
- [ ] Push the current branch to `origin`

### Task 5: Verify Release State

**Files:**
- No source changes expected

- [ ] Run `npm test`
- [ ] Run `npm run build`
- [ ] Confirm Netlify-ready outputs and summarize any remaining manual deployment step
