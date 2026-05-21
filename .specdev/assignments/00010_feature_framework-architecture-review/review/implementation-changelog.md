## Round 1

- Accepted [F1.1]. Tightened `workflowSchema` so `entryGraph` must reference an
  existing graph with `kind: "dispatcher"`, and added a regression test for a
  workflow that points `entryGraph` at a normal workflow graph.
- Accepted [F1.2]. Recorded valid gate decisions in `checkpoint.outputs` in
  addition to `checkpoint.gateDecisions`, preserving the separate gate decision
  map while allowing recent context to show the external decision that selected
  the route.
- Re-ran `npm run typecheck`, focused tests for coach/CLI/demo CLI, and
  `npm run build`.
