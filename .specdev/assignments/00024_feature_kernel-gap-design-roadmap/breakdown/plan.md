# Kernel Gap Design Roadmap Implementation Plan

> **For agent:** Implement this plan task-by-task. Match verification effort to task mode.

**Goal:** Publish the Oceanlive-first kernel gap roadmap as durable project documentation and align existing guidance with the activity/audit model.

**Architecture:** This is a documentation-only implementation of the approved design. The durable roadmap should state the focus/storage decision, the workspace activity-log direction, the derived nature of side channels, and the ordered follow-up SpecDev assignments. Existing docs that still present side-channel actions as the primary future abstraction should point readers toward activity records and frozen-origin support work.

**Tech Stack:** Markdown documentation in the existing TypeScript/Node Ripplegraph repository.

**Execution Mode:** inline

**Test Budget:** ≤ 0 new tests across all tasks. Documentation-only change; verification is text scan plus relevant SpecDev checkpoints.

---

### Task 1: Publish Kernel Roadmap Doc
**Mode:** lightweight
**Skills:** []
**Files:** `docs/kernel-gap-design-roadmap.md`

**Work:**
- Create a durable roadmap document from the approved brainstorm design.
- Include the Oceanlive-first framing, non-goals, activity record shape, focus/storage decision, workspace activity log, interrupt/freeze semantics, evidence/reconciliation guidance, and follow-up assignment sequence.
- Keep the document independent enough to read without opening the SpecDev assignment.

**Verify:**
- `test -f docs/kernel-gap-design-roadmap.md`
- `rg -n "workspace-level activity log|frozen origin remains|side channel|Oceanlive|Follow-Up" docs/kernel-gap-design-roadmap.md`

**Test Budget:** +0; text-only

**Test Pruning:**
- No executable tests apply.

**Commit:** `git commit -m "Document kernel gap roadmap"`

### Task 2: Align Existing Backbone/Product-CLI Guidance
**Mode:** lightweight
**Skills:** []
**Files:** `docs/backbone-fit-analysis.md`, `docs/building-product-clis-on-ripplegraph.md`

**Work:**
- Update the kernel additions section in `docs/backbone-fit-analysis.md` so side-channel is presented as the current runtime primitive, with the roadmap direction being activity records and frozen-origin support.
- Update `docs/building-product-clis-on-ripplegraph.md` so product CLI authors see side-channel actions as the current API and the activity/audit model as the next design direction.
- Link both documents to `docs/kernel-gap-design-roadmap.md`.

**Verify:**
- `rg -n "kernel-gap-design-roadmap|activity|frozen-origin|side-channel" docs/backbone-fit-analysis.md docs/building-product-clis-on-ripplegraph.md`

**Test Budget:** +0; text-only

**Test Pruning:**
- No executable tests apply.

**Commit:** `git commit -m "Align docs with activity roadmap"`

### Task 3: Final Documentation Verification
**Mode:** lightweight
**Skills:** []
**Files:** `.specdev/assignments/00024_feature_kernel-gap-design-roadmap/implementation/progress.json`

**Work:**
- Run the SpecDev implementation checkpoint after documentation edits.
- Record task progress through the SpecDev implementation flow.
- Confirm no code behavior changed and no executable tests are required.

**Verify:**
- `specdev checkpoint implementation`
- `specdev next --json`

**Test Budget:** +0; text-only

**Test Pruning:**
- No executable tests apply.

**Commit:** `git commit -m "Record kernel roadmap implementation"`
