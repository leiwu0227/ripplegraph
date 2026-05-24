## Round 1

- Fixed [F1.1] by documenting callable metadata semantics: callable packages reject node-level host-interaction metadata in this assignment, matching the existing gate rejection and avoiding hidden contracts that `CallableState.node` cannot expose.
- Fixed [F1.2] by defining the minimal renderable `form` interaction shape: `form` requires an object JSON schema in `interaction.schema`, and tests must cover invalid form metadata.
