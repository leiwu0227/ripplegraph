Add a first-class `ripplegraph-demo init` command so a globally installed demo
CLI can prepare a folder without manual template copying. The command should
install the minimal demo workflow into a hidden `.ripplegraph/` workflow home and
print the next status command for Claude/Codex-driven testing.

Workflow loading should prefer `.ripplegraph/workflow.json` while preserving the
current root `workflow.json` fallback. This keeps existing examples compatible
and moves the runtime toward consumer-owned workflow folders such as `.specdev`,
`.oceanshed`, or `.oceanlive`.
