# Ripplegraph Admission and Lifecycle Guard Model

Status: implemented

## Purpose and scope

This note defines how Ripplegraph currently decides whether one registration,
dispatch, start, resume, or continuation invocation may proceed. It records
the operation-local guard sequences, the lifetime of their results, and the
boundary between checks that precede execution state and checks that can run
after durable mutation has begun.

The active package note continues to own manifest and registry semantics; the
effects note owns effect meaning and policy authority; the execution note owns
workflow and callable branches; the validation note owns failure
representation; the state note owns exact filesystem write ordering and crash
residue; and the identity note owns namespaces and source identity. This note
owns how those checks compose at an invocation boundary. It does not define
authentication, authorization principals, scheduling, or a future policy
engine.

## Admission decision

Ripplegraph has no universal admission pipeline and no durable `admitted` bit.
Each scoped high-level operation performs the structural, semantic, identity,
lifecycle, and source checks it needs in a fixed local order. The first check
that throws or returns a rejection ends that invocation; later checks are not
evaluated. As a result, two entry paths that eventually delegate to the same
engine can surface different first failures when an adapter performs earlier
snapshot checks.

A successful check applies only to the current invocation. Effect allow-lists
and workflow precondition assertions are caller inputs, not retained grants.
Package resolution is a read, not a reservation. Focus and identifier
availability are read/check/write observations, not locks. A later invocation
therefore reloads the state and source required by its own operation instead of
inheriting a general prior admission result.

The current boundary has three distinguishable phases:

1. **Pre-state checks** inspect caller values and live workspace, registry, and
   package records before a new checkpoint is created or an existing checkpoint
   is mutated.
2. **Allocation or lifecycle checks** inspect focus, identifiers, checkpoint
   status, and retained source identity around the operation's mutation
   boundary.
3. **Activation or projection checks** can reload an active source, enter a
   child workflow, or build returned state after earlier writes have already
   succeeded.

Not every operation has all three phases, and Ripplegraph does not wrap them in
one transaction.

## Guard boundaries at a glance

| Boundary | Current ordered guard shape | Durable-state qualification |
| --- | --- | --- |
| Register package | Load and validate package → read and validate registry → normalize path → enforce identifier/path ownership → construct and validate replacement registry | Replaces `registry.json` only after those checks; registration is not executable admission |
| Get dispatcher request | Snapshot catalog → resolve exactly one dispatcher from another registry read → load workspace → enforce optional `entryGraph` agreement | Returns a transient request; creates no execution state and does not live-load the dispatcher package |
| Apply dispatcher action | Snapshot catalog → resolve dispatcher/workspace → parse strict action → run branch-specific snapshot checks → delegate to owning engine | No durable correlation with a prior request; delegated engines reload the records they own |
| Start workflow | Load workspace → resolve current workflow package → root requirements → recursive effect preflight → construct checkpoint → initialize storage → focus guard → run-directory collision guard → persist start → activate/project | Requirement and effect denial precede workflow execution state; later activation can fail after start state exists |
| Start callable | Resolve current callable package → effect policy → callable feature guard → choose call identity → normalize and validate input → validate identity/checkpoint → call-directory collision guard → persist start → project state | Invalid input returns without call state; identity and collision checks occur after input validation |
| Resume workflow | Load workspace → initialize storage → require no focus → load named checkpoint → require suspended → persist active/focus/resume → activate/project | Does not repeat start requirements or effect preflight; source activation can fail after resume state exists |
| Continue workflow | Load workspace → load focus/checkpoint → require active → reload retained active source → apply operation-specific node/value/route guards | Effect and root-precondition inputs are not rechecked; returned value rejection can append failure evidence |
| Continue callable | Load named checkpoint → require active → reload retained source and callable feature support → apply node/value/route guards | Effect policy is not rechecked; completed inspection bypasses source reload |

This table describes the high-level ordering contract. Exact error shapes,
schema algorithms, and multi-file write prefixes remain owned by their
specialized notes.

## Package registration is catalog admission

Registration first requires a package directory, a `graph.json` file, and a
manifest accepted by the closed package schema. Workflow and callable
manifests additionally pass the executable graph's semantic refinements;
dispatcher manifests have no executable graph body to refine. Registration
then reads the current registry, computes the stored path, and checks whether
the manifest identifier is already owned by a different path. A different path
requires explicit replacement; the same identifier at the same path refreshes
its snapshot without that flag, including when version, kind, or metadata
changed.

Only after those checks does registration replace the registry with an entry
containing the current identifier, version, kind, discovery metadata,
requirements, effects, path, and registration time applicable to that kind.
Registration does not load `workflow.json`, inspect workflow focus, evaluate
start requirements, compute a workflow's recursive effect closure, apply the
callable engine's feature restrictions, or reserve the package bytes.

A registered entry therefore means “catalogued from a valid package snapshot,”
not “every engine operation will accept this graph.” Later resolution checks
the requested kind against the registry entry, loads the package currently at
the stored path, and requires its identifier and kind to agree with the entry.
It does not require the live version or other snapshot fields to equal the
registry copy.

## Dispatcher request and action guards

Dispatcher interaction is a two-call host protocol rather than one durable
admission ticket.

`getDispatchRequest` first snapshots the registered graph summaries. It then
resolves exactly one registry entry whose recorded kind is `dispatcher` using
another registry read, loads the workspace descriptor, and, when
`entryGraph` is present, requires it to name that dispatcher. Dispatcher
resolution uses registry metadata; it does not reload the dispatcher package
at this point. The returned request, catalog, and advertised action schema are
not persisted or assigned a correlation identity.

`applyDispatchAction` repeats catalog snapshot and dispatcher/workspace
resolution before it validates the submitted action against the strict
server-side action union. Consequently, a missing or ambiguous dispatcher, an
invalid workspace, or an entry-graph mismatch can surface before an invalid
action shape. Once the action parses:

- `ask_user` returns a host-facing question without execution mutation;
- `list_runs` delegates to the run-list operation, which can initialize missing
  workflow storage even though it does not advance a run;
- `resume_run` and `switch_run` both delegate to the same resume operation;
- `start_run` checks target presence and recorded workflow kind in the earlier
  catalog snapshot, then the workflow engine reloads registry and package
  state and performs its own admission; and
- `call_graph` checks target presence, recorded callable kind, and recorded
  effects in the snapshot, then the callable engine reloads the current package
  and checks its current effects again.

The snapshot checks improve early feedback but are not authoritative locks.
Registry or package changes between reads can change the engine result. An
action also need not have been produced from the immediately preceding request;
the runtime does not compare the two.

## Workflow start admission

Direct workflow start has the following current order:

1. Load and validate the live workspace descriptor.
2. Resolve the requested registry entry as a workflow, load the package at its
   current stored path, and require the package identifier and kind to agree
   with the entry.
3. Check every root manifest start requirement against the caller's exact
   boolean precondition map. Unmet root requirements stop the operation before
   effect inspection.
4. Compute the effective effects of root nodes and recursively reachable
   workflow-reference packages, including tool and side-channel declarations,
   and require exact membership in the caller's allow-list.
5. Construct the initial checkpoint in memory from the workspace and selected
   root source.
6. Initialize missing workflow storage, reject an existing focused run, then
   reject an existing run directory with the proposed identifier.
7. Persist the checkpoint, focus pointer, and start transition in the order
   owned by the state note.
8. Reload the retained active source, automatically enter any workflow
   reference at the current position, and project the resulting state.

The precondition check applies only to the root workflow. Child
`requires` declarations are not evaluated during the recursive effect walk or
at child entry. The effect walk does resolve the then-current package for each
reachable child identifier and visits that closure once by graph identifier,
but it does not pin a registry snapshot. A child selected or edited after
preflight and before its later entry is not subjected to another effect-policy
check.

Unmet requirements and denied effects occur before `startRun` creates the
workflow execution scaffold. Focus and run-directory collision checks occur
after the helper has ensured `runs/` and a missing null focus file. The run
identifier's full schema is enforced when the checkpoint is parsed for its
first write rather than by a dedicated early start guard; the identity and
state notes own the possible directory residue from that ordering.

The start return is not the commit boundary. Source reload and automatic child
entry occur after the root checkpoint, focus, and start evidence exist.
Concurrent package or registry change, a child-resolution failure, or a
workflow-reference entry cycle can therefore make start throw while leaving a
durable focused run. The host must inspect current state after such an
ambiguous outcome.

## Callable start admission

Callable start is independent of workflow focus and does not load the workspace
descriptor. Its current order is:

1. Resolve the requested registry entry as callable and load the current
   package, including manifest schema plus local entry and edge-reference
   validation.
2. Check the current graph-level effect declaration against the caller policy.
3. Apply the callable engine's explicit supported-schema and unsupported
   feature checks.
4. Keep the explicit call identifier or generate one, and normalize a nullish
   input to an empty object.
5. Validate that input against the callable graph input contract.
6. If valid, validate the call identifier and checkpoint, reject an existing
   call directory, write the call checkpoint, append its start transition, and
   project active state.

Input rejection is a returned `validation_error` containing the proposed call
identifier and graph identifier. It creates no call directory, checkpoint, or
transition. Because input validation precedes path/identifier and collision
checks, invalid input wins over an invalid or already-used call identifier for
that invocation. A valid input exposes those later identity guards.

Effect denial and explicit callable-feature rejection also precede call-state
creation. Passing those checks does not certify arbitrary callable metadata:
the exact supported and unsupported feature boundary remains the one defined
by the execution and validation notes.

## Resume and switch admission

Resume is reactivation of retained state, not a new workflow start. It loads
the live workspace descriptor, initializes missing workflow storage, requires
the focus pointer to be empty, loads the named checkpoint, and requires that
checkpoint to be suspended. Focus absence is checked before named-run
existence or status, so an existing focused run masks those later failures.

Once those guards pass, resume changes the checkpoint to active, writes focus,
and appends resume evidence. It then reloads the checkpointed active package
and enters any pending workflow reference while producing returned state.
Workspace identity retained by the checkpoint is not compared with the live
descriptor. Root start requirements, root or child effects, and the registry
entry that originally selected the root are not rechecked.

`switch_run` is an exact dispatcher-action alias for this same operation. It
does not suspend, abandon, or displace an existing focus; the no-focus guard
still applies. The machine CLI exposes the underlying operation as `resume`,
not as a separate switch implementation.

Because source reload follows the resume writes, a missing, invalid, or
identity-mismatched retained package can make resume throw after the run has
become durably active and focused. There is no rollback to suspended state.

## Active workflow lifecycle guards

Ordinary workflow advancement, gate decisions, reconciliation, and
validly-shaped side-channel recording share the active-focused-run boundary.
The runtime normally:

1. loads the live workspace descriptor;
2. initializes missing workflow storage and requires a focus;
3. loads and validates the focused checkpoint;
4. requires active status; and
5. reloads the retained root or top child package and requires its identifier,
   version, and workflow kind to match the checkpointed source.

Only then does the owning operation inspect node mode, value contracts, routes,
or most operation-specific values. `recordSideChannelAction` is the narrow
ordering exception: it validates its supplied completion/failed status before
loading the active run. The downstream branches are defined by the execution,
validation, and data-flow notes. A failed submitted-value contract is a
returned rejection and may append failure evidence; it is not a new lifecycle
status and does not make the run non-active.

Current lifecycle operations are deliberately not one uniform wrapper:

- `suspendRun` loads the live workspace and focused checkpoint, reloads the
  retained package, and only then checks that the checkpoint is active; after
  that check, checkpoint, focus, and log writes precede final returned-state
  projection, so projection can fail after suspension is durable;
- `abandonRun` loads the focused checkpoint without loading the workspace,
  checking active status, or reloading the package before it writes abandoned
  status and clears focus;
- the focused `getState` path loads workspace, focus, and checkpoint but does
  not require active status before projecting state and automatically entering
  workflow references; this can mutate a non-active focused run, while the
  no-focus branch loads no checkpoint; and
- `listRuns` loads the workspace, initializes workflow storage, and summarizes
  checkpoints without reloading their graph packages or reconciling focus with
  status.

These are current enforcement boundaries, not evidence of an implicit repair
or administrative override model. In particular, the permissive abandon and
state-projection paths must not be generalized to normal advancement.

## Active callable lifecycle guards

Callable continuation addresses a call directly rather than through focus. A
step loads and validates the named checkpoint, requires active status, reloads
the package from the retained path, requires exact graph identifier, graph
version, and callable kind, and reapplies the callable feature guard. It then
checks the active node, submitted node output, route, target node, and any
terminal graph-output contract before accepted writes.

Effect policy is not rechecked during continuation. A rejected active value
appends callable failure evidence but leaves the checkpoint active and at its
prior durable position. Completed call lookup returns checkpointed input,
output, graph identifier, and graph version without reloading the package; it
does not expose the retained package path or an explicit graph kind. Every
non-completed checkpoint takes the package-reload path and is projected as
active, including a low-level `failed` checkpoint; the high-level engine itself
does not produce that status. Call listing validates checkpoints but does not
load each package.

The current engine has no callable suspend/resume operation. Direct use of the
root-exported storage helpers can create states outside these engine guards,
but that does not extend the high-level lifecycle.

## Guard lifetime and freshness

Guarded operations read several independently mutable records. A registry
entry can be a stale metadata snapshot; a package can change between effect
preflight and activation; focus or identifier availability can change between
read and write; and a retained source path can preserve identity fields while
its content changes. No guard acquires a content pin, an isolated or pinned
registry snapshot spanning independent reads or later invocations, a
filesystem lease, or an expected checkpoint revision.

The practical lifetimes are:

- registration checks end when the registry replacement is attempted;
- dispatcher snapshot checks end when the selected engine is invoked;
- workflow requirements and effect policy end with that start invocation;
- callable effect policy ends with that call-start invocation;
- focus, status, collision, and source checks apply to the one operation that
  read them; and
- retained path, identifier, version, and kind are rechecked where an active
  execution reloads its source, but they are not proof of unchanged content.

Passing a guard is therefore neither a security grant nor a promise that every
later check or write succeeds.

## Failure and persistence boundary

Most structural, package, policy, identity, lifecycle, and route failures
throw. Submitted callable input and active execution values use the returned
validation-rejection paths owned by the validation note. Ripplegraph does not
collect every possible admission issue and return an aggregate; the local
ordering determines the observable first outcome.

Some early failures are state-free by construction. Registration collision
precedes registry replacement. Workflow root requirements and recursive effect
denial precede workflow execution-state initialization. Callable effects,
feature checks, and input validation precede call creation.

Other failures can follow writes. Workflow focus and run collision checks can
follow workspace scaffolding; run-checkpoint parsing can follow directory
creation; workflow start and resume activation can follow checkpoint, focus,
and log writes; suspend's final state projection follows its lifecycle writes;
and active-value rejection can append audit evidence. Any filesystem failure
can also expose a successful prefix of a higher-level operation. There is no
cross-file rollback that makes “threw” equivalent to “nothing changed.”

## Host responsibilities

A conforming host treats engine admission as an invocation boundary:

- provide current precondition assertions and an explicit effect allow-list on
  each new workflow or callable start that needs them;
- treat dispatcher output as advice to submit a separately validated action,
  not as an authorization token;
- serialize mutations at the relevant workspace or execution boundary;
- after an uncertain start, resume, or continuation result, reload checkpoint
  and focus state before retrying; and
- enforce caller identity, credentials, operating-system isolation, and
  product-specific authorization outside Ripplegraph.

The host must not infer that registration, catalog visibility, a previous
policy pass, an empty focus read, or a returned dispatcher request reserves the
right to execute later.

## Current limits and non-guarantees

Ripplegraph currently provides no:

- validate-only or dry-run operation covering every later guard; the current
  `validate` entry point only loads the workspace, initializes missing workflow
  storage, and lists registered identifiers;
- global admission record, retained effect grant, retained precondition proof,
  or principal-aware authorization decision;
- durable dispatcher request/action correlation or action nonce;
- package-content reservation, registry snapshot pin, focus lease, identifier
  reservation, compare-and-swap revision, or transaction;
- aggregate diagnostic containing all failures that would have occurred after
  the first rejection;
- uniform guarantee that an observation or listing API is filesystem
  read-only;
- automatic retry, idempotency key, rollback, orphan cleanup, or repair after a
  partial admission;
- scheduler, queue, worker, or fairness policy deciding when an admitted
  execution advances; or
- frozen closed catalog of every error code, message, or precedence
  combination.

These omissions are not delegated hidden services. Products that need them
must add them outside the current runtime or adopt a separately approved
architecture change.

## Admission and lifecycle invariants present in the system

1. Registration admits a package to the catalog, not to every execution
   engine or future invocation.
2. Guards are operation-local and ordered; there is no global validation pass
   or durable admitted state.
3. Dispatcher requests and actions resolve dispatcher/workspace validity
   independently, and target engines reload their own current source.
4. Workflow start checks the live workspace and root package, then root
   requirements, then the recursive current effect closure before it creates
   workflow execution state.
5. Child workflow requirements are not part of start or child-entry admission,
   and successful effect preflight is not rechecked at later child entry.
6. Workflow focus absence is checked before start allocation or resume
   reactivation can claim focus; the current read/check/write sequence is not a
   lease.
7. Callable start checks current effects and callable support, then input,
   before it validates and claims the proposed call identity.
8. Resume requires an empty focus and a suspended checkpoint but does not
   repeat start requirements or effect policy; `switch_run` has identical
   semantics.
9. Normal active continuation rechecks lifecycle status and retained package
   identity, while policy and precondition inputs are one-shot start inputs.
10. Source activation and returned-state projection can occur after start or
    resume writes, and suspend projects returned state after its lifecycle
    writes, so a thrown operation does not imply absence of durable mutation.
11. Completed callable inspection and list operations use retained checkpoints
    without requiring every package to remain executable; every non-completed
    callable lookup instead reloads its package and projects active state.
12. Low-level storage reachability does not make its callers conform to the
    higher-level admission and lifecycle guards.

## Conformance evidence

This note was verified against repository HEAD
`c4f80535d9084708b95177004e1b4632e535b8af` on 2026-08-29. Tracked product
source, tests, package metadata, launchers, templates, TypeScript
configuration, and generated distribution output are unchanged from product
baseline `480dcc8ef55b4b840737d066d56c54ceca8f228d`; intervening commits publish
architecture notes and receipts only.

Primary implementation boundaries:

- `src/graph-package.ts`
- `src/registry.ts`
- `src/internal/dispatcher-resolution.ts`
- `src/dispatcher.ts`
- `src/cli.ts`
- `src/coach.ts`
- `src/internal/coach-responses.ts`
- `src/callable.ts`
- `src/effects.ts`
- `src/storage.ts`
- `src/schema.ts`

Focused supporting tests:

- `tests/graph-package.test.ts`
- `tests/registry.test.ts`
- `tests/dispatcher.test.ts`
- `tests/cli.test.ts`
- `tests/coach.test.ts`
- `tests/effects.test.ts`
- `tests/callable.test.ts`
- `tests/storage.test.ts`

Verification was static. The focused tests were inspected but not executed
because `node_modules/.bin/vitest` is absent.
