# Useful Branched Demo Implementation Plan

> **For agent:** Implement this plan task-by-task. Match verification effort to task mode.

**Goal:** Replace the minimal demo with a self-contained support-triage workflow that installs real fixture files and exercises branching.

**Architecture:** The packaged minimal template remains the source of truth and examples mirror it. `ripplegraph-demo init` continues to install `workflow.json` under `.ripplegraph/`, but now copies all other demo template files into the target root. The workflow branches on `category` from the classify node into bug, feature, and question follow-up nodes.

**Tech Stack:** TypeScript/Node.js CLI, filesystem templates, JSON workflow definitions, Vitest tests, npm package templates.

**Execution Mode:** inline

**Test Budget:** ≤ 5 new tests across all tasks.

---

### Task 1: Replace demo template content
**Mode:** lightweight
**Skills:** none
**Files:** `templates/minimal/workflow.json`, `templates/minimal/AGENT.md`, `templates/minimal/tickets/inbox.json`, `templates/minimal/support-playbook.md`, `examples/minimal/workflow.json`, `examples/minimal/AGENT.md`, `examples/minimal/tickets/inbox.json`, `examples/minimal/support-playbook.md`

**Work:**
- Replace the existing daily/mockcopy demo with `support-triage` and `policy-refresh`.
- Add installed ticket and playbook fixture files used by the workflow instructions.
- Update agent guidance to tell Claude/Codex which files to inspect and how to test branches.
- Keep `examples/minimal` mirrored with `templates/minimal`.

**Verify:**
- `diff -ru templates/minimal examples/minimal`

**Test Budget:** +0; text-only

**Test Pruning:**
- No tests added; executable coverage follows in later tasks.

**Commit:** `git commit -m "Replace minimal demo with branched triage"`

### Task 2: Init copies demo workspace files
**Mode:** standard
**Skills:** test-driven-development
**Files:** `src/demo-cli.ts`, `tests/demo-cli.test.ts`

**Work:**
- Change `ripplegraph-demo init` to copy every file under `templates/minimal/` except `workflow.json` into the target root.
- Keep installing `workflow.json` to `<root>/.ripplegraph/workflow.json`.
- Refuse without `--force` if any target demo file already exists, naming the first conflicting path.
- With `--force`, refresh demo files while preserving runtime state under `.ripplegraph/current.json`, `.ripplegraph/runs/`, artifacts, and logs.
- Update init tests to assert `tickets/inbox.json` and `support-playbook.md` are installed.

**Verify:**
- `npm test -- --run tests/demo-cli.test.ts`

**Test Budget:** +1 in `tests/demo-cli.test.ts`; focused (<30s)

**Test Pruning:**
- Update existing init tests instead of adding duplicate copy-behavior tests.

**Commit:** `git commit -m "Install demo workspace files on init"`

### Task 3: Update demo CLI branch expectations
**Mode:** standard
**Skills:** test-driven-development
**Files:** `tests/helpers/workflows.ts`, `tests/demo-cli.test.ts`

**Work:**
- Update demo test helpers to use the new support-triage workflow shape.
- Update CLI tests that mention `daily` or `mockcopy` to the new graph names.
- Add or update branch coverage proving a `bug` classification advances to `reproduce-bug`.

**Verify:**
- `npm test -- --run tests/demo-cli.test.ts`

**Test Budget:** +1 in `tests/demo-cli.test.ts`; focused (<30s)

**Test Pruning:**
- Replace old demo-specific assertions rather than keeping obsolete daily/mockcopy expectations.

**Commit:** `git commit -m "Update demo tests for branched triage"`

### Task 4: Final verification and smoke
**Mode:** lightweight
**Skills:** verification-before-completion
**Files:** `dist/demo-cli.js`, `.specdev/assignments/00008_feature_useful-branched-demo/implementation/progress.json`

**Work:**
- Run the assignment-level verification suite.
- Run the tarball/global install smoke through `./build-and-local-setup.sh /mnt/h/ripplepulse/tests/ripplegraph`.
- Confirm the initialized test folder includes the new demo files.

**Verify:**
- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm pack --dry-run`
- `./build-and-local-setup.sh /mnt/h/ripplepulse/tests/ripplegraph`
- `test -f /mnt/h/ripplepulse/tests/ripplegraph/tickets/inbox.json`

**Test Budget:** +0; final verification only

**Test Pruning:**
- No new tests; this task verifies integrated packaging and install behavior.

**Commit:** `git commit -m "Verify branched demo workflow"`
