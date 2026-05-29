## Round 1

**Verdict:** needs-changes

### Findings
1. [F1.1] Direct CLI starts have no way to satisfy `requires`. The design adds `preconditionState` to `startRun()` and dispatcher `start_run`, but `src/cli.ts` exposes a supported direct start command (`ripplegraph start --graph <graph-id> --run-id <id>`) that currently passes only `workflowRoot`, `graphId`, `runId`, and `effectPolicy` into `startRun()`. With fail-closed requirements, any required workflow becomes impossible to start through this documented debug/management path, even when the host has evaluated the predicates. Please add the direct CLI contract to the design, for example a `--precondition-state <json>` flag parsed like the existing JSON flags and forwarded to `startRun()`, plus CLI help and tests.

### Addressed from changelog
- (none -- first round)

## Round 2

**Verdict:** needs-changes

### Findings
1. [F2.1] Preserve structured requirement details through CLI error JSON. The design adds `RipplegraphError("E_START_REQUIREMENTS_UNMET", message, details)` so hosts can render redirect guidance without parsing strings, and it covers the direct `start` flag plus dispatcher forwarding. However, the current CLI boundary catches every thrown error in `src/cli.ts` and serializes it through `jsonErrorPayload()`, which currently returns only `{ status, code, message }` from `src/internal/cli-helpers.ts`. That means `ripplegraph start --precondition-state ...` and `ripplegraph dispatch --action ...` would both drop the `unmet` array and `redirectTo` metadata exactly where host-agent CLIs are likely to consume the command. Please add the CLI serialization contract to the design and tests, e.g. `jsonErrorPayload()` includes `details` when present and CLI tests assert unmet requirement errors expose `details.unmet`.

### Addressed from changelog
- Addressed [F1.1] by adding the direct CLI `ripplegraph start --precondition-state <json>` contract to goals, design, success criteria, and tests.

## Round 3

**Verdict:** approved

### Findings
- None.

### Addressed from changelog
- Addressed [F2.1] by adding the CLI error serialization contract: `jsonErrorPayload()` should include `RipplegraphError.details` when present.
- Updated success criteria and testing approach to cover `details.unmet` in CLI JSON errors for unmet start requirements.
