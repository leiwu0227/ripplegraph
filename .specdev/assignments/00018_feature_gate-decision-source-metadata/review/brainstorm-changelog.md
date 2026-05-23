## Round 1

- Addressed [F1.1] by changing `decisionSource` from one object with optional
  `tool` into a discriminated shape where `kind: 'tool'` requires a non-empty
  `tool` identifier. The testing section now explicitly requires rejection of
  tool sources without a tool id.
