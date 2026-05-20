# Brainstorm Changelog

Tracks changes made in response to review feedback.

## Round 1

- Addressed F1.1 by defining the gated active-state contract:
  `node.gate` carries the external decision metadata,
  `responseContract.command` switches to `decide`, and the contract schema is
  the gate `decisionSchema`.
- Clarified that non-gated nodes keep the existing `step` contract, while
  gated nodes must not present normal `outputSchema` as the next required
  payload.
- Added demo/status rendering rules: normal nodes show "Required output" plus
  `submit`; gated nodes show "External decision required" plus `decide`.
