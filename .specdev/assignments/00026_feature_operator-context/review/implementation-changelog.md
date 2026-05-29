## Round 1

- [F1.1] Addressed by adding `operatorContext: z.record(z.string(), z.unknown()).optional()` to `src/schema.ts`, so strict graph node parsing now accepts passive operator metadata.
- [F1.2] Addressed by adding `operatorContext?: Node['operatorContext']` to workflow and callable current-node response types and copying `node.operatorContext` in `src/internal/coach-responses.ts` and `src/callable.ts`.
- [F1.3] Addressed by adding focused workflow and callable round-trip tests, proving workflow transition behavior remains unchanged, regenerating `dist/` with `npm run build`, and verifying with `npm run typecheck`, `npm test`, and `rg -n "operatorContext" src tests dist`.
