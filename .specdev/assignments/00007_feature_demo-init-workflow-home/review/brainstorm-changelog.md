# Brainstorm Changelog

Tracks changes made in response to review feedback.

## Round 1

- Clarified that `ripplegraph-demo init` installs `workflow.json` into the
  hidden `.ripplegraph/` workflow home but installs `AGENT.md` at the workflow
  root for host-agent discovery.
- Updated overwrite protection and success criteria to refer to
  `<root>/.ripplegraph/workflow.json` and `<root>/AGENT.md`.
- Explained that root-visible `AGENT.md` keeps existing `--workflow-root .`
  instructions correct when Claude/Codex are opened in the workflow root.
