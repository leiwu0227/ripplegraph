# Proposal

Add workflow-ref nodes with durable frame-stack execution. A parent workflow
should be able to enter a registered workflow package, run it inside the same
focused run, and then resume the parent workflow when the child reaches a
terminal node.

This builds on assignment 00016, which made registered workflow packages
directly executable and pinned package identity in checkpoints. The new work
turns that package execution into composition: workflow packages can become
reusable phase blocks rather than only top-level runs.
