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

Then submit a classification. This intentionally does not go straight to the
branch node; it stops at an external-decision gate first:

```sh
npx ripplegraph-demo submit '{"category":"bug","priority":"urgent","rationale":"Checkout failures block customers from completing payment."}' --workflow-root .
```

The workflow enters `review-classification`, an external-decision gate. Normal
`submit` is blocked at this node. Ask the user/operator to approve or reject the
classification, then use `decide`.

To test the rejection loop:

```sh
npx ripplegraph-demo decide '{"decision":"rejected","reason":"Need a clearer category before routing."}' --workflow-root .
```

That sends the run back to `classify-ticket`. Submit the classification again,
then test an approval:

```sh
npx ripplegraph-demo decide '{"decision":"approved-bug","reason":"The ticket describes a checkout regression that blocks renewal."}' --workflow-root .
```

The branch nodes are:

- `approved-bug` -> `reproduce-bug`
- `approved-feature` -> `scope-feature`
- `approved-question` -> `answer-question`
- `rejected` -> `classify-ticket`

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
