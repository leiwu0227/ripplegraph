# Ripplegraph support triage demo

Use `ripplegraph-demo` as the workflow guide. The filesystem is the source of
truth; do not infer the active step from conversation alone.

Start by running:

```sh
npx ripplegraph-demo status --workflow-root .
```

If there is no current run, start the branched triage workflow:

```sh
npx ripplegraph-demo start support-triage --run triage-demo --workflow-root .
```

For the first node, inspect:

```sh
tickets/inbox.json
support-playbook.md
```

Then submit a classification. Try different `category` values in fresh runs to
test branching:

```sh
npx ripplegraph-demo submit '{"category":"bug","priority":"urgent","rationale":"Checkout failures block customers from completing payment."}' --workflow-root .
```

The branch nodes are:

- `bug` -> `reproduce-bug`
- `feature` -> `scope-feature`
- `question` -> `answer-question`

To test pause and resume with a second graph:

```sh
npx ripplegraph-demo pause "switching workflows" --workflow-root .
npx ripplegraph-demo start policy-refresh --run policy-demo --workflow-root .
npx ripplegraph-demo resume triage-demo --workflow-root .
```

Watch these files when debugging:

```sh
.ripplegraph/current.json
.ripplegraph/runs/<run-id>/checkpoint.json
.ripplegraph/runs/<run-id>/transition-log.jsonl
```
