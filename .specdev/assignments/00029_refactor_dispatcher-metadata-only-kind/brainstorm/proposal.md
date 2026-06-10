# Dispatcher as a metadata-only graph kind

Today a dispatcher graph package is required by the shared graph schema to carry a full
executable body — an `entry` node plus a non-empty `nodes` map — exactly like a workflow or
callable. But nothing ever executes that body. `startRun` requires `kind: 'workflow'`
(`coach.ts:261`), `startCallableCall` requires `kind: 'callable'` (`callable.ts:98`), and the
kind check in `resolveRegisteredGraphPackage` (`registry.ts:121`) rejects a dispatcher before any
node could run. The dispatch contract itself is hardcoded in `dispatcher.ts`
(`dispatcherActionSchema`), so the dispatcher's declared `inputSchema`/`outputSchema` are never
read either. The original dispatcher-runtime design already framed dispatch as metadata-driven —
"dispatch should use registered package metadata and existing workflow runtime only where
executable support exists" (00012 design.md:41) — so the executable body was never an intended
capability; it was inherited from the shared schema.

That inert-but-required body has a real cost: it has already drifted from reality. The template
dispatcher's declared `outputSchema` lists only `[start_run, list_runs, ask_user]` while the
engine actually accepts six actions including `resume_run`, `switch_run`, and `call_graph`. This
refactor makes the schema honest: a discriminated union on `kind` gives the dispatcher a
metadata-only variant with no `entry`/`nodes` (and no `inputSchema`/`outputSchema`/`requires`),
while workflow and callable keep their executable bodies unchanged. Manifests that still carry a
body on a dispatcher are rejected, and the one template manifest is migrated. Behavior of the
dispatch runtime is unchanged — this only removes a dead, drift-prone field from the schema.
