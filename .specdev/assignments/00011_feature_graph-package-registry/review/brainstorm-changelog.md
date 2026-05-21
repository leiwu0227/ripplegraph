## Round 1

- Addressed F1.1 by choosing a concrete flat `graph.json` package manifest shape with `id` and `version` beside the existing graph fields.
- Clarified that the existing `graphSchema` should remain graph-only for compact `workflow.json`, while a new `graphPackageManifestSchema` owned by a graph-package module parses standalone package manifests.
- Explicitly rejected the nested `{ id, version, graph }` wrapper for v0 because it adds payload depth without helping the registry or CLI contract.

## Round 2

- Addressed F2.1 by replacing the invalid `graphSchema.extend(...)` instruction with a workable schema structure.
- Specified that implementation should extract a shared `graphFieldsSchema` and `validateGraphReferences` helper, then derive both `graphSchema` and `graphPackageManifestSchema` from that base.
- Clarified that this avoids duplicate validation logic while preserving compact `workflow.json` behavior.

## Round 3

- Addressed F3.1 by changing the `graph.json` package contract example from an invalid empty `nodes` object to a valid minimal manifest with a `classify-ticket` node matching the `entry` field.
- Removed the obsolete open question about whether `graph.json` should use the flat or wrapper shape, since the design now explicitly chooses the flat manifest.
