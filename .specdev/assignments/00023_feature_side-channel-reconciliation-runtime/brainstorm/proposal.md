# Proposal

Ripplegraph now lets workflow packages declare side-channel actions and host contracts, but there is still no runtime place for a host to record that it performed a side-channel action or reconciled authoritative external state. Consumer graph/business repos, especially Oceanlive-style hosts, need a small audited API that records those events while proving the graph position did not advance.

This assignment adds host-submitted side-channel audit and external-state reconciliation records for focused workflow runs. Ripplegraph will append validated transition-log entries, return the unchanged active state/position, and report whether a host-supplied external snapshot matches an expected snapshot. Ripplegraph will not read external systems or execute side-channel commands; the host remains responsible for those actions and only submits their structured results.
