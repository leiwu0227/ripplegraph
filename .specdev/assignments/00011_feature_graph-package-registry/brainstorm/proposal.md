# Proposal: graph package registry foundation

Implement the first runtime slice of Ripplegraph's graph-repository architecture: validate self-contained graph package folders, register them into `.ripplegraph/registry.json`, and expose graph management commands for CLIs and host agents. This turns the previous architecture decision into a concrete package boundary without jumping ahead to full dispatcher execution or callable graph invocation.

The goal is to make graph packages inspectable, portable, and safe to adopt by higher-level CLIs. A package folder should declare its graph metadata and contract in `graph.json`; Ripplegraph should validate that folder, persist a registry entry, list registered packages, and keep enough metadata for later dispatcher and callable runtime work.
