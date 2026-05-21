# Project Big Picture

## Overview

Ripplegraph is a lightweight, host-agent-driven coach runtime. A graph is the
deterministic skeleton; nodes are units of agent execution where an LLM can work
inside a schema-validated boundary. The runtime is the gatekeeper: it owns
position, state, transitions, gates, and recovery context while the host agent
does the actual work.

The long-term product is not a single workflow runner. Ripplegraph is the
portable orchestration backbone for agent-facing CLIs: a structured replacement
for the weak control-flow parts of ad hoc skills/plugins, while still allowing
skills, scripts, assets, and templates to exist as resources used by graph
nodes.

## Users / Consumers

Primary consumers are host-agent-driven CLIs that need deterministic,
multi-step workflows:

- `specdev-cli` — assignment workflows, human gates, external review loops.
- `oceanshed-cli` — signal/sweep lifecycles, candidate promotion, agent
  reviews.
- `oceanlive-cli` — live trading session orchestration with approval gates.

Secondarily, any CLI or project folder that wants Claude Code, Codex, OpenCode,
or another host agent to follow a portable graph-backed coach protocol can build
on Ripplegraph.

## Tech Stack

- TypeScript / Node.js.
- Zod for runtime schema validation and type inference.
- Filesystem state by default: JSON checkpoints, transition logs, artifacts,
  and graph package metadata.
- No runtime LLM SDK dependency. The host agent owns LLM execution; Ripplegraph
  returns contracts and validates transitions.
- Distributed as an npm package plus reference CLIs.

## Architecture

- **Graph owns flow, LLM owns work inside nodes.** Edges are deterministic over
  validated data. The model may produce content, but it does not freely choose
  transitions.
- **Workspace as graph repository.** A workspace can contain many graph
  packages. A package is a self-contained folder with graph definition,
  metadata, docs, templates, assets, and tests.
- **Graph package metadata is the framework API.** Packages declare `kind`,
  `activationHints`, `inputSchema`, `outputSchema`, `effects`, version, and
  human-readable description. Demos are examples, not contracts.
- **Graph kinds are explicit.**
  - `dispatcher`: front door for user intent; emits structured actions such as
    start, resume, list, ask, or call.
  - `workflow`: durable user-visible run with checkpointing, gates, history,
    suspend/resume, and one current node.
  - `callable`: graph-shaped function with typed input/output. It may have
    internal transitions, but from the caller's perspective it has no external
    workflow side effects beyond its returned value and audit record.
- **Dispatcher selection is structured.** The host agent should not pick random
  graph IDs. It submits user intent through `dispatch`; Ripplegraph validates
  the dispatcher action against the registered graph catalog.
- **Runs are durable by default.** Every workflow execution is a run with
  checkpoint, transition log, artifacts, timestamps, status, and root graph.
  A workspace can have many saved runs but at most one focused run.
- **Context is served, not guessed.** State responses provide orientation,
  recent outputs, nearby routes, response contract, exact next allowed command,
  and a help/explain command. This is how Ripplegraph pulls a long-context host
  agent back onto the rails.
- **Effects are explicit.** Callable graphs, script nodes, and future tool
  integrations should declare effects such as `read_repo`, `write_files`,
  `network`, or domain-specific side effects. Pure-looking graph calls must not
  hide mutations.

## Command Model

The normal host-agent loop should be small:

- `status` — show focused state, or dispatcher-ready state when no run is
  focused.
- `dispatch` — submit user intent to the dispatcher and apply or return a
  validated structured action.
- `explain` — richer re-anchor when the host agent is confused or context is
  long.
- `advance` — submit the current node response, whether it is normal output or
  an external decision.

Management/debug commands can still exist, but they should not be the main
mental model:

- `init`
- `runs`
- `focus`
- `pause`
- `abandon`
- `graph register/list/validate`
- `call`
- direct `start <graph-id>` for tests and explicit debugging

Compatibility aliases such as `submit`, `decide`, `state`, and `resume` may
remain while the canonical protocol settles.

## Conventions & Constraints

- **Litmus test:** does this give the LLM control over flow, or only over
  content within a fixed contract? If it gives the LLM flow control, redesign.
- Schemas should be as tight as the use case allows; loose schemas hide drift.
- Direct graph selection is a debugging/management path. Normal entry should go
  through the dispatcher when one is registered.
- Callable graphs may have internal transitions, but they do not mutate caller
  run state except through explicit returned output consumed by the caller.
- Historical runs are evidence. A currently focused run must validate against
  the installed graph package; old completed runs do not need forced migration
  unless explicitly resumed/upgraded.
- Keep the core small and boring. Prefer data schemas, explicit contracts, and
  simple filesystem state over a hidden event loop or embedded LLM runner.
