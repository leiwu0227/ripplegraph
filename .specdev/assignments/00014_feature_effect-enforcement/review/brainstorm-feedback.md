## Round 1

**Verdict:** needs-changes

### Findings
1. [F1.1] The CLI policy shape is underspecified for repeated `--allow-effect` flags. The design says the CLI can accept repeated `--allow-effect <effect>` flags or comma-separated `--allow-effects <a,b>`, but `src/internal/cli-helpers.ts` currently parses flags into `Record<string, string | boolean>`, so repeated flags overwrite earlier values. Without an explicit parser/API change, an implementation can silently grant only the last repeated effect and deny graphs that requested all flags correctly. Either specify changing `parseArgs` to preserve repeated flag values, or narrow v0 to the comma-separated form plus a single `--allow-effect`.
2. [F1.2] The direct workflow denial ordering needs to be explicit because `ensureWorkflowRoot` mutates state. The design requires denied workflow starts to leave `current.json` and `runs/` unchanged, but the current `startRun` path calls `ensureWorkflowRoot(opts.workflowRoot)` before selecting the graph, and `ensureWorkflowRoot` creates `.ripplegraph/runs/` and may write `.ripplegraph/current.json`. The design should state that `startRun` must load the workflow, select the graph, and enforce effects before calling `ensureWorkflowRoot` or any other state-initializing helper.

### Addressed from changelog
- (none -- first round)

## Round 2

**Verdict:** approved

### Findings
- (none)

### Addressed from changelog
- [F1.1] Addressed. The design now calls out the current `parseArgs` overwrite behavior and requires either preserving repeated `--allow-effect` values or adding a dedicated repeated-value helper, with explicit guidance not to accept only the last repeated value.
- [F1.2] Addressed. The design now requires direct `startRun` effect checks to happen before `ensureWorkflowRoot()` or any helper that creates `.ripplegraph/runs/` or `.ripplegraph/current.json`.
