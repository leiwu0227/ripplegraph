## Round 1

- **[F1.1] Addressed** — The "no change; already kind-guarded" claim for `coach.ts`/`callable.ts`/
  `dispatcher.ts` conflated runtime guards with type narrowing. Added a new foundational subsection
  "Type narrowing: runtime guards are not type narrowing" to `design.md`: `resolveRegisteredGraphPackage`
  becomes **generic on the requested `kind`** (a `ManifestForKind<K>` mapping) so passing
  `kind: 'workflow'`/`'callable'` returns a narrowed executable manifest and the existing
  `manifest.requires`/`entry`/`nodes`/`inputSchema` accesses (`coach.ts:268,274`,
  `callable.ts:98-109,264-267`) compile unchanged. The `coach.ts`/`callable.ts` knock-on bullet now
  states they need no *logic* change but compile only via this resolver narrowing.

- **[F1.2] Addressed** — Corrected the `src/cli.ts:217` `packageSummary` bullet: it reads **both**
  `manifest.entry` *and* `manifest.requires` (and hard-codes `entry: string` in its return type),
  both non-common after the split. The plan now branches `packageSummary` on `kind` — dispatcher omits
  `entry` and sources `requires` as `[]`; executable kinds keep the current shape — and makes `entry`
  optional in the returned summary type.

- **[F1.3] Addressed** — Added `tests/helpers/workspace.ts` as the primary, fix-first fixture
  touch-point. Documented that `GraphPackageManifestInput` (`:5-17`) requires `entry`/`nodes` and
  `normalizedManifest()` (`:45-59`) always writes them, so metadata-only dispatcher fixtures would
  fail TypeScript or emit strict-rejected keys. The plan now makes the input type kind-conditional and
  has `normalizedManifest` omit `entry`/`nodes`/`inputSchema`/`outputSchema`/`requires` for
  `kind === 'dispatcher'`. The `workflows.ts`/test-suite bullet was corrected to reference the real
  fixture lines (`:156`, `:227`) and noted to flow through this helper.

- **Also updated** — Risks: reframed the "missed consumer" risk to list all handled readers and rely
  on `tsc` exhaustively surfacing any missed non-common-field access as a build failure.
