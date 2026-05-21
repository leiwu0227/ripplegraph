# Framework Architecture Review

Ripplegraph is moving from a focused-run proof of concept into a reusable coach
backbone for future CLIs. The current implementation proves durable runs,
schema-validated steps, external decision gates, and agent-facing status
rendering, but the project notes and command surface still mix older ideas
with newer requirements: graph packages, dispatcher selection, callable graphs,
activation hints, and stronger drift recovery.

This assignment reviews the architecture from the long-term framework
perspective. The goal is to identify design holes before they harden into API,
define a simpler graph/package/runtime model for future CLIs, and reduce command
complexity while preserving the core invariant: Ripplegraph owns flow and the
host agent works only inside the current contract.
