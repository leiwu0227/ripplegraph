# Assert supported schema keywords at manifest load

The runtime's `validateOutput` honors eight JSON Schema keywords (`type`, `required`,
`properties`, `enum`, `const`, `oneOf`, `items`, `additionalProperties`) and silently ignores
everything else. Only callables guard against this today (`assertSupportedCallableSchema`, at
call time); a workflow gate `decisionSchema` with `pattern` or a node `outputSchema` with
`minLength` registers fine and then validates nothing — a declared constraint that quietly isn't
one, three weeks later at decide-time. This is the keyword-level form of the dishonesty 00029
and 00030 fixed at the field level.

This refactor asserts supported keywords for **every schema the runtime hands to
`validateOutput`** — workflow graph `outputSchema`, node `outputSchema`, gate `decisionSchema`,
and callable `inputSchema`/`outputSchema` — at the strongest choke point available: the zod
manifest schema itself. A `superRefine` walk rejects unsupported keywords with path-named issues,
so `loadGraphPackage` fails fast everywhere it's used (registration, `graph validate`, and
checkpointed package reloads) with zero extra call sites. Host-facing schemas that ripplegraph
never validates (`interaction.schema`, `toolContract` I/O, `validators[]`,
`sideChannelActions[].outputSchema`) are explicitly exempt — hosts may support richer JSON
Schema. The callable call-time assertion stays as defense-in-depth against a registered
package edited on disk. Breaking for manifests with exotic keywords; ships inside the
not-yet-vendored 0.1.0 per decision.
