## Round 1

- [F1.1] Addressed by making the CLI parser requirement explicit: repeated `--allow-effect` values must be preserved or handled by a dedicated helper, and accepting only the last repeated value is forbidden.
- [F1.2] Addressed by requiring `startRun` effect checks to occur before `ensureWorkflowRoot()` or any helper that creates `.ripplegraph/runs/` or `.ripplegraph/current.json`.
