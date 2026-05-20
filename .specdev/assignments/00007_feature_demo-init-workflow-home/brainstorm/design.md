## Overview

This assignment adds a first-class `ripplegraph-demo init` command and changes
the demo workflow-root model so a project can be "coached" by Ripplegraph
without placing `workflow.json` in the project root. The demo CLI should
initialize a hidden `.ripplegraph/` workflow home containing the demo workflow
definition, while placing the host-agent guide at the workflow root where
Claude/Codex can discover it. This matches the longer-term direction
where Ripplegraph is the runtime backbone and each consumer owns its visible
workflow folder, such as `.specdev`, `.oceanshed`, or `.oceanlive`.

The implementation should keep existing workflows usable by making workflow
loading prefer `<workflow-root>/.ripplegraph/workflow.json` and fall back to
`<workflow-root>/workflow.json`. Runtime state should remain under
`.ripplegraph/`, so the demo has one hidden folder containing workflow
definition and run state. The root contains only the agent-facing guide needed
for discovery. Current examples/tests can migrate gradually instead of breaking
immediately.

## Goals

This feature should make the globally installed demo CLI usable without manual
template copying. A user should be able to run one command to prepare a project
folder, then immediately ask Claude or Codex to drive the workflow with
`ripplegraph-demo`. The command should create the target directory if needed,
install the minimal demo workflow definition into `.ripplegraph/`, install a
root-visible `AGENT.md`, and print a clear next command such as
`ripplegraph-demo status --workflow-root <path>`.

The runtime should prefer hidden workflow definitions at
`.ripplegraph/workflow.json` while preserving root `workflow.json` fallback.
Existing examples, tests, and direct root workflow use should keep working
during this transition. The demo init behavior should be safe by default: do not
overwrite existing `.ripplegraph/workflow.json` or root `AGENT.md`
unless an explicit `--force` flag is provided.

## Non-Goals

This assignment will not redesign Ripplegraph's core graph model, add
SpecDev-style gates/reviewloops, or introduce consumer-specific folders beyond
the demo default `.ripplegraph/`. It will not attempt to support `.specdev`,
`.oceanshed`, or `.oceanlive` as first-class workflow homes yet; the design
should simply avoid blocking that direction later.

It will not remove root `workflow.json` support in this change. Existing
examples and manually created workflow roots should continue to work through
fallback loading. It also will not globally initialize user projects
automatically during `npm install -g`; initialization stays explicit through
`ripplegraph-demo init <path>`.

## Design

Add an `init` command to `src/demo-cli.ts`:

```sh
ripplegraph-demo init <path>
ripplegraph-demo init <path> --force
```

The command should create `<path>/.ripplegraph/`, copy the packaged minimal demo
`workflow.json` to `<path>/.ripplegraph/workflow.json`, copy the packaged
minimal `AGENT.md` to `<path>/AGENT.md`, and print the next status command. The
guide stays root-visible because host agents are normally opened in the workflow
root and its commands use `--workflow-root .`.

The command should refuse to overwrite existing demo files by default, returning
a clear error that names the existing file and suggests `--force`. The protected
files are `<path>/.ripplegraph/workflow.json` and `<path>/AGENT.md`. With
`--force`, it may replace only those demo-installed files, not runtime files
such as `current.json`, `runs/`, artifacts, or transition logs.

Update storage workflow loading so `loadWorkflow(rootPath)` prefers
`<rootPath>/.ripplegraph/workflow.json`, then falls back to
`<rootPath>/workflow.json`. Runtime state paths stay under
`<rootPath>/.ripplegraph/`. This gives the demo one hidden workflow home while
keeping compatibility. Tests should cover init, force refusal/overwrite, hidden
workflow loading, and fallback root workflow loading. The script
`build-and-local-setup.sh` should switch from manual template copying to
`ripplegraph-demo init`.

## Success Criteria

The assignment is complete when a globally installed `ripplegraph-demo` can
initialize and drive a clean folder without manual copying:

```sh
ripplegraph-demo init /mnt/h/ripplepulse/tests/ripplegraph
ripplegraph-demo status --workflow-root /mnt/h/ripplepulse/tests/ripplegraph
```

The initialized folder should contain `.ripplegraph/workflow.json` and a
root-visible `AGENT.md`, and should not require a root `workflow.json`. Existing
root `workflow.json` workflow roots must still load. Re-running init without
`--force` should fail safely when demo files already exist; re-running with
`--force` should refresh demo workflow files without deleting runtime state.

Verification should include focused tests for `ripplegraph-demo init`, hidden
workflow loading, root fallback loading, and existing CLI start/submit behavior.
Final verification should include `npm run typecheck`, `npm test`,
`npm run build`, `npm pack --dry-run`, and a tarball/global install smoke test
using `build-and-local-setup.sh`.
