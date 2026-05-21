## Round 1

- [F1.1] Fixed `start_run` compact runtime validation so a registered workflow package only starts when the matching compact `workflow.json` graph is also `kind: "workflow"`.
- Added a regression case where the registry graph is a workflow but the compact graph with the same id is a dispatcher; dispatch now returns `E_GRAPH_NOT_EXECUTABLE_YET` instead of starting it.
- Regenerated `dist/` after the source change.
