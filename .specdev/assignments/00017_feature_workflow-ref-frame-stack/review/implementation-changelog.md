## Round 1

- Addressed [F1.1] by routing focused `getState` and `resumeRun` through
  workflow-ref entry. A restored checkpoint positioned on a ref node now enters
  the child package and persists the frame before returning state.
- Addressed [F1.2] by making `enterWorkflowRefs` derive its active graph and
  scope from the checkpoint active context. Nested child exits now preserve the
  remaining parent frame scope when returning to non-terminal parent nodes.
