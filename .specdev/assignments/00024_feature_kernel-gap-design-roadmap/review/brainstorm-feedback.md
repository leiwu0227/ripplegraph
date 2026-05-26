## Round 1

**Verdict:** needs-changes

### Findings
1. [F1.1] The roadmap needs to decide the focus/storage model for frozen-origin support graph activities before the follow-up assignments are independently implementable. The design says an Oceanlive menu freezes the daily workflow while the dispatcher may run declared support activities, including activities that "may call another workgraph" (`brainstorm/design.md:33-36`, `brainstorm/design.md:122-127`). In the current runtime, though, workflow graph execution is tied to the single `current.focusedRunId`; `startRun` rejects any new workflow while a run is focused (`src/coach.ts:283-295`), and `suspendRun` clears focus and changes the origin status to `suspended` (`src/coach.ts:471-487`). Callable calls can run outside focused workflow state (`src/callable.ts:97-130`), but they have their own isolated call logs and are not the same as workflow runs. The design's follow-up list splits "Activity Audit Model", "Workflow Freeze / Interrupt Semantics", and "Dispatcher Activity Routing" without first specifying whether a frozen origin remains focused, gains a new `frozen` status, uses a focus stack, starts support work as callable-only, or records support graph execution in a workspace-level activity log. Without that decision, implementation can easily produce mutually incompatible APIs: freeze semantics that cannot start support workflows, dispatcher routing that cannot show "one clear primary workflow plus concise handoff context", or audit records split across run and call logs instead of the promised top-level activity trail.

### Addressed from changelog
- (none -- first round)

## Round 2

**Verdict:** approved

### Findings
1. (none)

### Addressed from changelog
- [F1.1] Addressed. The updated proposal and design now make the focus/storage model explicit: Ripplegraph keeps one primary focused workflow, frozen origins remain focused rather than becoming suspended, support activity is recorded in a workspace-level append-only activity log, and support graph work initially uses callable-style execution rather than a second focused workflow run. I verified this is feasible against the current runtime: `startRun` still enforces one focused workflow, `suspendRun` clears focus and marks the run suspended, callable execution is isolated under `.ripplegraph/calls`, and dispatcher `call_graph` already starts registered callable packages without mutating focused workflow state. The remaining activity log, freeze semantics, routing, and evidence attachment work is now split into coherent follow-up assignments with testable boundaries.
