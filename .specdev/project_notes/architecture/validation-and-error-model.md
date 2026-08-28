# Ripplegraph Validation and Error Model

Status: implemented

## Purpose and scope

Ripplegraph accepts data from package files, workspace state, callers, and
hosts. It does not treat all of that data as one undifferentiated JSON input.
Each owning boundary validates a different contract: structural schemas define
records, a small runtime schema language validates execution values, engine
checks enforce semantic and lifecycle rules, and adapters project failures to
their callers.

This note binds that validation and error model as it exists today. It covers
structural normalization, the runtime-enforced JSON Schema subset, host-facing
contracts, dispatcher action validation, semantic checks, returned validation
rejections, thrown errors, CLI representation, and the durable evidence left
by a failed boundary. It refines the validation principles in
`core-concepts.md`, module ownership in `source-module-boundaries.md`, the
submission protocol in `host-runtime-interaction.md`, transition ordering in
`execution-and-workflow-model.md`, persistence limits in
`state-and-recovery.md`, host authority in `effects-and-authority.md`, and the
package validation layers in `package-and-extension-model.md`.

This is not a frozen catalog of every current error code or message, an
operational troubleshooting guide, a claim of full JSON Schema conformance, or
a future retry, repair, telemetry, or exception-compatibility design.

## Validation ownership

The current system has five distinct validation planes:

| Plane | Current owner | What acceptance establishes |
| --- | --- | --- |
| JSON acquisition | CLI parsing helpers or the shared filesystem JSON reader | The supplied text can be parsed as JSON, or the file could be read and parsed. |
| Structural record validation | Shared Zod schemas consumed by package, registry, storage, dispatcher, and engine owners | The value has the declared record shape, strict fields, defaults, and local cross-field invariants for that record. |
| Runtime value-contract validation | The workflow or callable engine using Ripplegraph's custom schema validator | A callable input, node output, gate decision, or declared graph output satisfies the supported subset for its active contract. |
| Semantic and lifecycle checks | The registry, dispatcher, effect service, workflow engine, or callable engine that owns the operation | The requested identity, kind, authority input, route, lifecycle state, and recovery relationship are acceptable at that operation. |
| Host-service validation | The consuming product or host | Tool, interaction, validator, renderer, side-channel, external-state, identity, and operating-system rules outside Ripplegraph were actually enforced. |

Passing one plane does not imply acceptance by a later plane. A package can be
structurally valid but unregistered, registered but rejected by an engine, or
successfully started and later blocked by its active value contract or
recovery identity. Conversely, host-service metadata can be structurally valid
without Ripplegraph executing or enforcing the described external service.

## Structural records and normalization

Shared Zod schemas own graph manifests, workspace identity, registry entries,
focus, workflow and callable checkpoints, transition records, and their public
TypeScript types. Most owned object records are strict: undeclared fields are
rejected rather than silently retained. Two regions deliberately pass through
additional fields: JSON Schema objects parse their common known fields while
retaining additional keyword names for the later owner of that schema slot,
and each workflow or callable transition's `validation` envelope requires an
`ok` boolean while retaining fields such as runtime issue arrays. The enclosing
transition record remains strict.

Structural parsing also normalizes data. Defaults such as empty activation
hints, effects, requirements and edges; `inline` node execution; object node
output; callable object input/output; and empty checkpoint maps and stacks are
materialized before runtime owners consume the record. Absence of a workflow
graph output schema remains meaningful and is not normalized to an object
contract.

Package validation applies the strict dispatcher, workflow, or callable
variant, checks the graph's entry and edge targets against nodes in the same
manifest, rejects a gate combined with `workflowRef`, and asserts supported
keywords in runtime-consumed schema slots. That acceptance does not establish
that a referenced child package exists, every node is reachable, an edge set
covers every valid output, a dispatcher is unique, or every structurally legal
feature is executable by a particular engine.

Persistent control records are checked by their owning storage or registry
reader. A missing registry is treated as an empty version-1 catalog, and a
missing focus record is treated as no focused run; missing named checkpoints
and invalid existing control records are errors. Validation is per record.
It does not establish cross-file consistency, reconstruct corrupt state, or
turn transition logs and artifacts into checkpoint authority.

## Runtime schema language

Ripplegraph does not embed a general JSON Schema implementation. Its runtime
validator recognizes this closed subset:

| Keyword | Implemented meaning |
| --- | --- |
| `type` | Accepts `object`, `string`, `number`, `boolean`, or `array` and performs a JavaScript-type check without coercion. `null` and `integer` are not type values in the shared schema. |
| `required` | On an object, requires each named own-or-inherited string key to be present according to JavaScript's `in` check. |
| `properties` | Recursively validates declared string keys present according to the same `in` check, including inherited keys. It does not reject undeclared keys by itself. |
| `enum` | Requires one member to be strictly equal with JavaScript `===`; it performs no coercion or general structural comparison. |
| `const` | Compares the JSON serialization of the expected and submitted values. Object key insertion order is therefore observable rather than normalized away. |
| `oneOf` | Requires exactly one child schema to accept the value. |
| `items` | Applies one schema object recursively to every array element. Tuple-form items are unsupported. |
| `additionalProperties` | Only the literal `false` is supported; it rejects undeclared own enumerable string keys returned by `Object.keys`. Inherited and symbol keys are not enumerated by this check. |

Shape keywords also imply a container check without an explicit `type`.
Presence of `items` requires the submitted value to be an array; presence of
`properties`, `required`, or `additionalProperties: false` requires an object.
This rejects a value of the wrong container shape rather than coercing it.

Object paths use dot notation and array paths use bracketed indexes in returned
issues. Each issue contains only `path` and `message`. The validator returns an
ordered issue array; it does not mutate the submitted value, apply schema
defaults, coerce types, resolve references, execute formats, or attach a
keyword-specific machine code. A type mismatch ends validation of that branch
before nested constraints are evaluated. An empty schema accepts any value.

Keywords such as `$ref`, `allOf`, `anyOf`, `not`, `format`, `pattern`, length
or numeric limits, object dependencies, and conditional schemas are not
runtime contracts. An unsupported keyword or unsupported value for `oneOf`,
`items`, or `additionalProperties` in a runtime-consumed slot makes the package
invalid instead of being silently ignored.

Package-time supported-keyword assertion applies to:

- an executable graph's output schema, when declared;
- a callable graph's input schema;
- every executable node's output schema; and
- every gate's decision schema on either executable graph kind.

The engines later consume the graph, callable-input, and node contracts at
their owning workflow or callable boundaries. Workflow gates consume their
decision schemas. A callable gate's decision schema passes the package-time
keyword assertion, but callable startup rejects the gate as unsupported before
any callable decision value can be validated against it. Package assertion and
runtime value use are therefore overlapping, not identical, slot sets.

Callable input and output and node output have current object defaults; a
workflow graph output has no contract when absent. The package manifest
assertion and callable engine's supported-schema check provide separate entry
defenses around these contracts.

## Host-facing schemas and dispatcher actions

Interaction form schemas, tool input/output schemas, validator input/output
schemas, and side-channel output schemas pass through the shared schema shape
parser but are not handed to Ripplegraph's runtime value validator. The common
keys still have the shared five-type vocabulary and parsed shapes; additional
keyword names can remain for a host with richer validation support. A package
loading successfully therefore proves only that this metadata is structurally
representable, not that a named host validator exists or that any external
input or output conforms to it.

Dispatcher actions use another two-contract boundary:

```text
Ripplegraph JSON Schema literal
    -> advertised to the host with dispatcher state
    -> host returns one action value
    -> separate strict Zod union validates the action on the server side
    -> owning dispatcher branch performs semantic checks and delegates
```

The advertised JSON Schema and server-side Zod union are maintained as
separate declarations. Current tests require the two to expose the same action
discriminator values, but the runtime does not derive either declaration from
the other or prove their full semantic equivalence. The advertised dispatcher
schema is host-facing and is not constrained to the custom runtime validator's
keyword subset; server acceptance is decided by the Zod union.

## Semantic checks beyond schemas

A structurally valid value can still fail an operation-owned rule. Current
semantic checks include:

- registry identifier ownership, expected graph kind, current package identity,
  and explicit replacement rules;
- dispatcher uniqueness, workspace entry-graph agreement, action target kind,
  and the operation selected by the action;
- workflow start requirements, recursive workflow effects, focus and run-ID
  collisions, active/suspended lifecycle guards, child-reference resolution,
  entry-cycle detection, and route availability;
- callable graph-level effects, unsupported callable features, call-ID
  collision, active-call status, and route availability; and
- active recovery agreement on checkpointed path, identifier, version, and the
  kind expected by the owning engine.

These failures are not reported as response-contract issue arrays. Expected
domain failures normally throw `RipplegraphError`; the operation's sequencing
determines whether any earlier read or write has occurred. There is no global
validation transaction or rollback rule that makes every thrown error
residue-free.

## Returned validation rejections

Ripplegraph reserves `status: "validation_error"` responses for submitted
execution values that fail an applicable runtime value contract:

| Boundary | Returned rejection and durable consequence |
| --- | --- |
| Callable input | Returns the proposed call identifier, graph identifier, and issues, but no position. No call checkpoint, call directory, or transition is created by the callable engine; retry is a fresh call-start submission. |
| Active workflow node output | Returns run and unchanged position plus issues. A failed `step` transition is appended; no output artifact is written and the checkpoint is not advanced. |
| Active workflow gate decision | Returns run and unchanged position plus issues. A failed `decide` transition is appended; no output artifact is written and the checkpoint is not advanced. |
| Early root-completion output | Returns run and the unchanged durable pre-submission position plus issues. It appends failed-validation evidence before an accepted source artifact or transition is written. |
| Later child-output boundary | Can first retain the child source artifact and accepted operation, then append failed-validation evidence whose response and log position is the child terminal. That terminal position was only an in-memory intermediate: the durable checkpoint and frame remain at the pre-submission child source node. |
| Active callable node or completion output | Returns call and unchanged position plus issues. A failed callable `step` transition is appended; the checkpoint remains active and no accepted output artifact is written for that submission. |

A returned validation rejection is an expected retryable protocol result, not
a thrown exception and not an execution lifecycle transition to failure. The
workflow lifecycle has no `failed` status. The callable checkpoint schema and
callable transition schema recognize `failed` and `fail`, but current callable
engine paths do not produce them. Invalid callable input requires another
start attempt. Ordinary active-state rejection accepts another value at the
same durable position. After a later child-output rejection, the returned
terminal position is not the retry position; the host must re-anchor from
checkpoint-backed state and resubmit at the durable child source node.

When an active-state rejection appends a transition, that record carries
`validation.ok: false`, issue details, and an `E_VALIDATION` error object. The
API response itself carries `status: "validation_error"` and `errors`, not an
`E_VALIDATION` code field. Rejected values are not retained uniformly: ordinary
workflow step records leave transition input and output null, gate records
retain the attempted value as `gateDecision`, and callable step records retain
it as transition output. Failed-validation logs are therefore audit evidence
for their specific operation, not a uniform rejected-input archive.

## Thrown errors

Expected non-response-contract failures generally use the exported
`RipplegraphError` class:

```text
RipplegraphError
├── code: string
├── message: string
└── details?: unknown
```

The code is an open string rather than an exported closed enum or discriminated
union. Modules currently use contextual `E_*` values for missing or invalid
records, package and registry mismatch, admission denial, lifecycle conflict,
unsupported features, route failure, and command errors. Optional structured
details are supplied selectively—for example, unmet workflow requirements
include the graph and graph-authored redirect/message data. Message text and
the complete current code inventory are not a separately versioned protocol.

The shared filesystem JSON reader maps both filesystem-read failure and JSON
parse failure to `E_BAD_JSON`; prechecks distinguish some missing resources
before that reader is invoked. CLI inline JSON parsing also maps malformed text
to `E_BAD_JSON`, but the demo CLI's `--file` helper reads the file before
entering that parser. A missing or unreadable demo `--file` therefore surfaces
as a native error and is projected by that adapter as `E_INTERNAL`. Package,
workspace, registry, focus, and checkpoint owners then map structural issues
to their contextual invalid-record errors where implemented.

Not every public throw is normalized into `RipplegraphError`. Root-exported
low-level storage writers use Zod `.parse()` for control records and call Node
filesystem and JSON serialization primitives directly. Invalid low-level
objects, filesystem failures, circular values, `bigint`, or other
non-serializable direct-library inputs can therefore surface native or Zod
errors. Library consumers must not assume every possible failure has a
Ripplegraph error code.

## Adapter projection

The machine-readable `ripplegraph` CLI catches thrown values at its outer
boundary. A `RipplegraphError` becomes JSON with `status: "error"`, its code,
message, and optional details. Any other thrown value becomes
`status: "error"` with code `E_INTERNAL` and the thrown message. The process
exits with status 1 for either kind of throw.

A library call that returns `status: "validation_error"` does not enter that
catch path. The machine CLI emits it as the command result and completes
normally. CLI clients must therefore inspect the response discriminator rather
than treating process exit status alone as proof that an execution submission
was accepted.

The human-readable demo adapter makes the same distinction with different
presentation. It renders returned validation issues as ordinary output, while
a thrown `RipplegraphError` is rendered on stderr as `CODE: message`, other
throws are labeled `E_INTERNAL`, and the process exits 1. These adapters do not
change engine validation or persistence semantics.

## Error evidence and recovery boundary

Ripplegraph has no workspace-wide error journal. Package errors, dispatcher
action rejection, effect or requirement denial, invalid callable input,
storage-read failure, and most lifecycle or recovery errors do not create an
engine-generated execution transition. Only an already-created run or call can
receive the engine-generated failed-validation evidence described above.
Root-exported low-level transition appenders are outside that engine guarantee:
they validate the supplied record shape, create parent directories, and can
produce a log-only run or call directory without a checkpoint or valid
execution lifecycle.

A transition's `error` field is open data rather than an exhaustive error
ledger. Logs are not replayed to rebuild state, and their presence does not
change the checkpoint's authority. When a later boundary fails after earlier
writes, artifacts, logs, checkpoints, and the thrown or returned failure have
to be interpreted in the operation-specific order recorded by
`execution-and-workflow-model.md` and `state-and-recovery.md`.

Validation-named operations are not categorically read-only. For example,
workspace validation ensures the workflow state scaffold before listing the
registry. More generally, the mutation guarantee is attached to a particular
boundary—such as invalid callable input creating no call state or an invalid
active node response not advancing its checkpoint—not to the word
“validation” itself.

## Current limits and non-guarantees

Ripplegraph currently does not provide:

- full JSON Schema draft compatibility, `$ref` resolution, custom formats,
  coercion, schema-driven defaults, or pluggable runtime keywords;
- one generated source of truth for the advertised dispatcher JSON Schema and
  its server-side Zod action union;
- an exported closed taxonomy covering every error code, detail shape, message,
  native I/O failure, or low-level Zod failure;
- a uniform exception-only or result-only library API;
- automatic persistence of invalid starts, denied policy, malformed actions,
  corrupt-state reads, or every rejected raw value;
- a `failed` workflow lifecycle status or dedicated workflow `fail` operation,
  an engine-produced failed callable state, automatic retry, retry count,
  backoff, dead-letter record, or background recovery worker;
- rollback across validation, artifact, transition, checkpoint, focus, and
  filesystem boundaries; or
- runtime enforcement of graph-authored host tool, validator, interaction,
  side-channel, identity, or operating-system contracts.

A consuming product can wrap the library with stricter error unions, telemetry,
input sanitation, richer host-schema validation, retry policy, or external
audit. Those are product responsibilities and cannot be inferred from a
successful Ripplegraph structural or runtime value check.

## Validation and error invariants present in the system

1. Structural record validation, runtime value-contract validation, semantic
   admission, and host-service enforcement are distinct ownership boundaries.
2. Runtime-consumed schemas use a closed, asserted subset; unsupported
   keywords make the package invalid rather than becoming silently ignored
   runtime promises.
3. Host-facing schemas are structurally carried but are not enforced by
   Ripplegraph's runtime value validator.
4. Dispatcher action shape is enforced by the server-side Zod union; the
   advertised JSON Schema is a separate host contract that must remain aligned.
5. A runtime value mismatch returns `validation_error`; expected semantic,
   lifecycle, identity, route, and record failures normally throw coded domain
   errors.
6. An invalid active run or call submission leaves durable position unchanged
   and can append boundary-specific failed-validation evidence.
7. A validation rejection does not mark its run or call failed; retry remains
   a host invocation at the same durable position.
8. The exported domain-error code is open-ended, optional details are
   selective, and native or Zod errors can escape low-level library surfaces.
9. CLI process status alone does not distinguish an accepted execution value
   from a returned `validation_error`; callers must inspect the response status.
10. Validation is not a global transaction, repair mechanism, security
    boundary, or complete error-audit system.

## Conformance evidence

This note was verified against clean tracked product source at Git revision
`f54052ae83682b04e4efc743303e45f240d69dbc` on 2026-08-28. Product source and
focused tests are unchanged from revision
`480dcc8ef55b4b840737d066d56c54ceca8f228d`.

Verification was static: the focused tests were inspected but not executed
because the workspace has no installed Vitest executable.

Relevant source paths:

- `src/index.ts`
- `src/schema.ts`
- `src/graph-package.ts`
- `src/registry.ts`
- `src/storage.ts`
- `src/effects.ts`
- `src/dispatcher.ts`
- `src/coach.ts`
- `src/callable.ts`
- `src/cli.ts`
- `src/demo-cli.ts`
- `src/internal/cli-helpers.ts`
- `src/internal/dispatcher-resolution.ts`
- `src/internal/json-io.ts`
- `src/internal/output-validation.ts`
- `src/internal/runtime-graph.ts`
- `src/internal/schema-keywords.ts`
- `src/internal/transitions.ts`
- `src/internal/zod-issues.ts`
- `tests/schema.test.ts`
- `tests/graph-package.test.ts`
- `tests/output-validation.test.ts`
- `tests/storage.test.ts`
- `tests/registry.test.ts`
- `tests/dispatcher.test.ts`
- `tests/effects.test.ts`
- `tests/coach.test.ts`
- `tests/callable.test.ts`
- `tests/cli.test.ts`
- `tests/demo-cli.test.ts`

Relevant active architecture authority:

- `.specdev/project_notes/architecture/core-concepts.md`
- `.specdev/project_notes/architecture/source-module-boundaries.md`
- `.specdev/project_notes/architecture/host-runtime-interaction.md`
- `.specdev/project_notes/architecture/execution-and-workflow-model.md`
- `.specdev/project_notes/architecture/state-and-recovery.md`
- `.specdev/project_notes/architecture/effects-and-authority.md`
- `.specdev/project_notes/architecture/package-and-extension-model.md`
