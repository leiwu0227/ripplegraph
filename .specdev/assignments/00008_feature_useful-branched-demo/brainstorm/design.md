## Overview

The existing minimal demo should be replaced with a more useful end-to-end
workflow for host-agent testing. The new demo will model support ticket triage:
the agent reads a real ticket fixture and policy file, classifies the ticket,
and Ripplegraph branches to the appropriate follow-up node. This gives
Claude/Codex something concrete to inspect and makes the graph's deterministic
control-flow behavior visible during manual testing.

`ripplegraph-demo init` should install the hidden workflow definition at
`.ripplegraph/workflow.json` and copy the rest of the demo workspace files into
the project root. The initialized folder should be usable without pasted data or
manual fixture setup.

## Goals

The demo should exercise more of Ripplegraph's value than a straight-line dry
run. It should include a graph with at least three branches, clear schemas, and
real workspace files the host agent can read. The happy-path manual test should
be: initialize a folder, start the triage graph, read `tickets/inbox.json` and
`support-playbook.md`, submit a classification, land on the branch selected by
the classification, and submit a final artifact summary.

The demo should remain small and transparent. The files should be easy to read
in a terminal, the graph should fit in a single JSON template, and the agent
guide should give explicit commands for common test flows.

## Non-Goals

This assignment will not add file-writing enforcement, script execution, LLM
SDK calls, external integrations, or automatic artifact creation by the runtime.
The host agent still does the work and submits JSON; Ripplegraph only validates
outputs and advances the graph.

This assignment will not remove root `workflow.json` fallback support and will
not introduce a general template engine. It only improves the packaged minimal
demo and the demo init copy behavior needed to install it.

## Design

Replace `templates/minimal/workflow.json` and `examples/minimal/workflow.json`
with a support-triage workflow. The primary graph should be named
`support-triage`; it starts at `classify-ticket`, where the agent reads
`tickets/inbox.json` and `support-playbook.md` and submits:

```json
{"category":"bug|feature|question","priority":"low|normal|urgent","rationale":"..."}
```

Edges branch on `category`: `bug` goes to `reproduce-bug`, `feature` goes to
`scope-feature`, and `question` goes to `answer-question`. Each branch node
should have a distinct required output schema and then transition to a terminal
`done` node. A small second graph, `policy-refresh`, may remain available for
pause/resume and multi-run testing, but it should also use installed files.

Add demo workspace files under `templates/minimal/`, mirrored under
`examples/minimal/`: at minimum `tickets/inbox.json` and
`support-playbook.md`. Update `templates/minimal/AGENT.md` and the example
guide so Claude/Codex know which files to inspect and which commands to run.

Update `ripplegraph-demo init` so it copies all non-`workflow.json` files from
`templates/minimal/` into the target root while still placing `workflow.json`
under `.ripplegraph/workflow.json`. Without `--force`, any existing target file
that would be copied should cause a clear refusal naming the path and suggesting
`--force`. With `--force`, demo files may be refreshed, but runtime state under
`.ripplegraph/current.json`, `.ripplegraph/runs/`, artifacts, and logs must be
preserved.

## Success Criteria

After `ripplegraph-demo init /mnt/h/ripplepulse/tests/ripplegraph`, the folder
contains `.ripplegraph/workflow.json`, `AGENT.md`, `tickets/inbox.json`, and
`support-playbook.md`, with no root `workflow.json` required.

Running `ripplegraph-demo start support-triage --run triage-demo --workflow-root
<path>` should show the classify node and reference the installed ticket and
policy files. Submitting a classification with `category: "bug"` should advance
to `reproduce-bug`; `feature` should advance to `scope-feature`; `question`
should advance to `answer-question`.

Tests should verify template/example workflow alignment, init copies demo data
files, force preserves runtime state while refreshing demo files, and at least
one branch transition works through the demo CLI. Final verification should run
typecheck, tests, build, pack dry-run, and the local tarball/global-install
setup script.
