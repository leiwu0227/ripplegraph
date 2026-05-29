## Round 1

- Addressed [F1.1] by adding the direct CLI `ripplegraph start --precondition-state <json>` contract to the design.
- Updated goals, design, success criteria, and testing approach so the direct debug/management start path can satisfy graph start requirements while preserving fail-closed behavior.

## Round 2

- Addressed [F2.1] by adding the CLI error serialization contract: `jsonErrorPayload()` should include `RipplegraphError.details` when present.
- Updated success criteria and testing approach to cover `details.unmet` in CLI JSON errors for unmet start requirements.
