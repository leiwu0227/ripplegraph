# Ripplegraph engineering coach demo

Use `ripplegraph-demo` as the workflow guide. The filesystem is the source of
truth; do not infer the active step from conversation alone.

Start by running:

```sh
npx ripplegraph-demo status --workflow-root .
```

If there is no current run, start the change-intake workflow:

```sh
npx ripplegraph-demo start change-intake --run change-demo --workflow-root .
```

For the first node, inspect:

```sh
work-items/inbox.json
engineering-playbook.md
repo-brief.md
```

Then submit a classification. The workflow intentionally stops at a human gate
before it branches:

```sh
npx ripplegraph-demo advance '{"changeType":"refactor","risk":"medium","rationale":"The request targets duplicated routing code without changing behavior."}' --workflow-root .
```

The workflow enters `review-routing`, an external-decision gate. Ask the
operator to approve or reject the route, then use `advance` with a decision.

To test the rejection loop:

```sh
npx ripplegraph-demo advance '{"decision":"rejected","reason":"Need clearer risk reasoning before routing."}' --workflow-root .
```

That sends the run back to `classify-change`. Submit the classification again,
then test an approval:

```sh
npx ripplegraph-demo advance '{"decision":"approved-refactor","reason":"The request is a behavior-preserving simplification."}' --workflow-root .
```

The branch nodes are:

- `approved-bugfix` -> `plan-bugfix`
- `approved-feature` -> `shape-feature`
- `approved-refactor` -> `simplify-design`
- `approved-question` -> `answer-question`
- `rejected` -> `classify-change`

To test pause and resume with a second graph:

```sh
npx ripplegraph-demo pause "switching workflows" --workflow-root .
npx ripplegraph-demo start architecture-sweep --run sweep-demo --workflow-root .
npx ripplegraph-demo resume change-demo --workflow-root .
```

Watch these files when debugging:

```sh
.ripplegraph/current.json
.ripplegraph/runs/<run-id>/checkpoint.json
.ripplegraph/runs/<run-id>/transition-log.jsonl
```
