# Demo Init Workflow Home Implementation Plan

> **For agent:** Implement this plan task-by-task. Match verification effort to task mode.

**Goal:** Add `ripplegraph-demo init` so a globally installed demo CLI can prepare a project with a hidden `.ripplegraph/workflow.json` and a root-visible `AGENT.md`.

**Architecture:** Workflow loading should prefer `<workflow-root>/.ripplegraph/workflow.json` and fall back to `<workflow-root>/workflow.json`, while runtime state remains under `.ripplegraph/`. The demo CLI owns initialization by copying packaged minimal templates into the target folder with safe overwrite behavior. The local setup script should consume the public init command instead of manually copying package templates.

**Tech Stack:** TypeScript/Node.js CLI, filesystem JSON state, Zod validation, Vitest tests, npm package templates.

**Execution Mode:** inline

**Test Budget:** ≤ 5 new tests across all tasks.

---

### Task 1: Hidden workflow loading
**Mode:** standard
**Skills:** test-driven-development
**Files:** `src/storage.ts`, `tests/helpers/workflows.ts`, `tests/coach.test.ts`

**Work:**
- Add a small path helper so workflow loading checks `.ripplegraph/workflow.json` before root `workflow.json`.
- Preserve all existing runtime state paths under `.ripplegraph/`.
- Add a focused test or helper coverage proving hidden workflow roots load.
- Keep existing root `workflow.json` tests passing as fallback coverage.

**Verify:**
- `npm test -- --run tests/coach.test.ts`

**Test Budget:** +1 in `tests/coach.test.ts`; focused (<30s)

**Test Pruning:**
- Reuse existing workflow helpers where possible instead of duplicating large workflow fixtures.

**Commit:** `git commit -m "Add hidden workflow loading"`

### Task 2: Demo init command
**Mode:** standard
**Skills:** test-driven-development
**Files:** `src/demo-cli.ts`, `tests/demo-cli.test.ts`

**Work:**
- Add `ripplegraph-demo init <path>` and `ripplegraph-demo init <path> --force`.
- Create the target directory and `<path>/.ripplegraph/` when missing.
- Copy `templates/minimal/workflow.json` to `<path>/.ripplegraph/workflow.json` and `templates/minimal/AGENT.md` to `<path>/AGENT.md`.
- Refuse to overwrite either protected file by default with a clear error naming the existing path and suggesting `--force`.
- With `--force`, replace only the protected files and leave `.ripplegraph/current.json`, `runs/`, artifacts, and logs untouched.
- Print concise next-step output including `ripplegraph-demo status --workflow-root <path>`.

**Verify:**
- `npm test -- --run tests/demo-cli.test.ts`

**Test Budget:** +3 in `tests/demo-cli.test.ts`; focused (<30s) -- happy path, refusal, and force-with-state-preservation are distinct CLI contracts.

**Test Pruning:**
- Keep the existing drift/alignment and start/submit tests; add compact init tests without repeating workflow contents inline.

**Commit:** `git commit -m "Add ripplegraph demo init"`

### Task 3: Setup script consumes init
**Mode:** lightweight
**Skills:** none
**Files:** `build-and-local-setup.sh`

**Work:**
- Replace manual `templates/minimal` copying with `ripplegraph-demo init "$TEST_DIR"` after global tarball install.
- Keep the script behavior of resetting the supplied test directory, running status, and printing the next host-agent instruction.

**Verify:**
- `shellcheck build-and-local-setup.sh` if available, otherwise `bash -n build-and-local-setup.sh`

**Test Budget:** +0; text-only

**Test Pruning:**
- No tests added; script behavior is covered by final smoke verification.

**Commit:** `git commit -m "Use demo init in local setup script"`

### Task 4: Final verification and smoke
**Mode:** lightweight
**Skills:** verification-before-completion
**Files:** `.specdev/assignments/00007_feature_demo-init-workflow-home/implementation/progress.json`

**Work:**
- Run the assignment-level verification suite.
- Run the tarball/global install smoke through `./build-and-local-setup.sh /mnt/h/ripplepulse/tests/ripplegraph`.
- Record task completion through the SpecDev implementation scripts.

**Verify:**
- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm pack --dry-run`
- `./build-and-local-setup.sh /mnt/h/ripplepulse/tests/ripplegraph`

**Test Budget:** +0; final verification only

**Test Pruning:**
- No new tests; this task verifies the integrated behavior.

**Commit:** `git commit -m "Verify demo init workflow home"`
