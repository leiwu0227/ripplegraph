## Round 1

**Verdict:** needs-changes

### Findings
1. [F1.1] The design installs the host-agent guide at `<path>/.ripplegraph/AGENT.md`, but the existing packaged guide is written as if it lives at the workflow root: its commands use `--workflow-root .` and its debug paths point at `.ripplegraph/...` (`templates/minimal/AGENT.md:7-40`). If that file is followed from inside `.ripplegraph/`, the commands target the wrong root and create/read nested state under `.ripplegraph/.ripplegraph`; if Claude/Codex are opened in `<path>`, the hidden singular `AGENT.md` is also unlikely to be discovered automatically. The brainstorm should specify the guide strategy before breakdown: either install/update a root-visible host-agent file with correct commands, or make the hidden guide explicitly root-aware and ensure the printed next command is the primary onboarding path.

### Addressed from changelog
- (none -- first round)

## Round 2

**Verdict:** approved

### Findings
1. (none)

### Addressed from changelog
- F1.1 addressed: the design now installs `AGENT.md` at the workflow root while
  placing only the workflow definition under `.ripplegraph/workflow.json`, so
  the existing `--workflow-root .` guide remains correct for host agents opened
  in the initialized project root.
