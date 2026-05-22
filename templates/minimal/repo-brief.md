# Demo repository brief

The demo project is a small TypeScript CLI runtime. It has:

- a command parser shared by JSON and text CLIs,
- graph validation and runtime state in `.ripplegraph/`,
- a dispatcher that routes structured actions,
- callable graph execution for isolated typed tasks.

The current maintenance theme is to keep the runtime boring: explicit schemas,
small modules, no hidden side effects, and state changes only through runtime
commands.
