Replace the current minimal demo workflow with a self-contained branched demo
that gives Claude/Codex real files to inspect. The current demo is technically
runnable, but its `daily-execution` graph asks the agent to review generated
intents that `ripplegraph-demo init` never creates.

The new demo should initialize a small support-triage workspace with fixture
files, agent guidance, and a graph that branches based on the agent's
classification output. This should make the demo useful for testing starts,
submits, branching, pause/resume, generated artifacts, and hidden workflow
loading without requiring external domain data.
