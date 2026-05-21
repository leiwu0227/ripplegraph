## Round 1

- Accepted [F1.1].
- Added a `Dispatcher Invocation Contract` section defining `dispatch` as the
  explicit user-intent entry operation.
- Specified the dispatcher input shape, structured action output, workspace
  event logging, and how `status` behaves when no workflow run is focused but a
  dispatcher is registered.
- Updated the simplified command model from `status/explain/advance` to
  `status/dispatch/explain/advance`, with direct `start <graph-id>` retained as
  a management/debug path rather than the normal host-agent entry.
