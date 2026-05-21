# Proposal: dispatcher runtime

Implement the next Ripplegraph repository milestone: a dispatcher runtime that lets host agents route user requests through a registered dispatcher graph without giving the host agent unchecked control over graph selection or run state. The dispatcher should use the graph registry from assignment 00011, expose a small `dispatch` command surface, validate structured dispatcher actions, and apply safe actions such as starting, resuming, switching, listing, or asking for clarification.

This assignment should keep the architecture simple. Ripplegraph still should not run an LLM. The host agent interprets the user's request and drafts a dispatcher action inside a schema-validated contract; Ripplegraph validates that action against the registered catalog and workspace state before changing focus or creating runs.
