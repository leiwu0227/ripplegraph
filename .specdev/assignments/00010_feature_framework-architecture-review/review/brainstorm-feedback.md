# Brainstorm Review Feedback

## Round 1

**Verdict:** needs-changes

### Findings
1. [F1.1] The dispatcher is a central architectural goal, but the proposed command protocol has no operation that carries user intent into it. The design correctly says graph selection is still exposed through `start <graph-id>` and that a dispatcher should map user/workspace context to structured actions. I verified the current code still requires direct graph IDs in both CLIs (`src/cli.ts` `start --graph <graph-id>`, `src/demo-cli.ts` `start <graph-id>`) and the current no-focus state only lists `availableGraphs` from `src/coach.ts` / `src/internal/coach-responses.ts`. However, the proposed normal protocol is only `status`, `advance`, and `explain`, while management has `call`; none of those accepts the user's request or defines whether dispatcher execution is an implicit focused run, a stateless callable, or a special workspace-level loop. Without this contract, a breakdown cannot implement the claimed reduction in graph-selection exposure without inventing a new command or lifecycle rule. Please add a small dispatcher invocation contract, for example: what input shape carries user intent, which command accepts it, whether dispatcher actions are logged as runs or workspace events, and how `status` behaves when there is no focused workflow but a dispatcher is registered.

### Addressed from changelog
- (none -- first round)

## Round 2

**Verdict:** approved

### Findings
1. (none)

### Addressed from changelog
- [F1.1] Addressed. The design now defines `dispatch` as the explicit user-intent entry point, gives the dispatcher input and structured action output shapes, treats dispatcher invocation as workspace-level with append-only audit events, and specifies no-focused `status` behavior when a dispatcher is registered. I verified the current implementation still exposes direct graph selection through `src/cli.ts`, `src/demo-cli.ts`, and no-focus state in `src/coach.ts` / `src/internal/coach-responses.ts`, so this added contract is enough for a later breakdown to implement the intended reduction in graph-selection exposure without inventing lifecycle semantics.
