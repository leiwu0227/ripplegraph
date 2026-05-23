## Round 1

- Addressed [F1.1] by adding an active graph/scope resolution rule. The design
  now requires runtime helpers to resolve the active graph from the top stack
  frame, write child positions with the child graph id, and restore parent
  context from the popped frame.
- Addressed [F1.2] by adding stable scoped output keys and matching artifact
  namespaces. Top-level keys remain compatible, while nested nodes write under
  frame-qualified keys and paths.
