# OneLine-Canvas Outstanding Gaps

This file is the live backlog for unresolved modeling, workflow, testing, and documentation gaps.
`handoff.md` remains the historical architecture narrative; this checklist tracks what still needs to be closed.

## Electrical Data Model
- [ ] Resolve PTX current-rating semantics explicitly: decide whether transformer current metadata belongs on the primary side, secondary side, or both.
- [ ] Decide whether root-source nodes should also carry optional current/rating metadata or remain voltage/sync-only sources for now.
- [ ] Add canonical editable electrical metadata for breaker, wire, switch, and future protective-device edges, including optional `ratedCurrentAmps` and device-specific rating fields.
- [ ] Normalize equipment-specific metadata contracts so new, imported, and hydrated gear preserve electrical ratings consistently.
- [ ] Define which metadata belongs on nodes versus edges for switchgear line/load terminals, breaker devices, and future protective schemes.

## Engine Semantics
- [ ] Extend voltage-aware traversal beyond nominal mismatch checks into richer compatibility validation such as allowable windows, source permissives, or equipment-specific voltage tolerances.
- [ ] Define how future electrical metadata is consumed incrementally by the engine without breaking existing project-agnostic topology workflows.

## Breaker and Switch Realism
- [ ] Add editable breaker and switch ratings as canonical device metadata.
- [ ] Expand protection modeling beyond coarse conflict auto-trip toward selective isolation or relay coordination behavior.
- [ ] Define future breaker and switch semantics for current limits, permissives, and protection-oriented device modeling.
- [ ] Decide whether additional named handles are needed for future breaker terminals, line/load separation, or protective-device interfaces beyond the current ATS exception.
- [ ] Replace the current always-continuous PTX primary daisy-chain bus with explicit operator-controlled MV switch or isolation semantics where S1/S2-style behavior matters.

## Transfer-Switch Automation
- [ ] Add automatic ATS source-fail sensing instead of manual source selection only.
- [ ] Add timer or delay semantics for transfer and retransfer behavior.
- [ ] Model richer ATS or STS policies such as permissive logic, neutral positions, or non-overlap timing where needed.

## UPS Modeling
- [ ] Expand the first-pass UPS model beyond one line input / one load output into separate rectifier, static bypass, and maintenance-bypass interfaces where that realism matters.
- [ ] Add automatic UPS source-fail sensing, battery-to-line transfer policy, and manual / automatic retransfer behavior instead of mode selection only.
- [ ] Model UPS battery depletion, charger state, and runtime consumption instead of the current binary `batteryAvailable` flag.

## Validation and Import Safety
- [ ] Replace shallow graph-shape import validation with deep schema and version-aware validation for node and edge payloads.
- [ ] Add validation for malformed or incomplete electrical metadata so bad imports do not silently degrade simulation fidelity.
- [ ] Decide how invalid handle assignments or future device-specific wiring errors should be surfaced to the operator.

## Testing and Performance
- [ ] Add tests for canonical electrical metadata normalization and persistence across create, hydrate, export, and import flows.
- [ ] Add focused tests around operator-facing `Fed From` provenance for future devices with directional semantics beyond the current breaker / wire / PTX / ATS / UPS lineup.
- [ ] Add formal large-graph stress and performance coverage for traversal cost ceilings and memoization stability.
- [ ] Add tests for any future protection, relay coordination, or breaker rating semantics.

## UI and Workflow Coverage
- [ ] Add automated UI coverage for grid snapping, manual edge midpoint routing, delete controls, copy/paste flows, breaker-vs-wire draw mode selection, SCADA actions, and MOP recording or playback flows.
- [ ] Decide whether manual edge routing needs reset-to-auto controls, richer multi-bend editing, or obstacle-aware autorouting beyond the current single midpoint anchor.
- [ ] Expand the broader properties modal into bulk-edit workflows, richer device ratings, and edge-property editing so large projects do not require node-by-node metadata entry.
- [ ] Add UI validation or guided affordances around new multi-landing cases such as switchboard bottom-bus targets so operators can tell which landing is semantically equivalent versus electrically distinct.
- [ ] Decide whether node cards need a secondary operator-facing cue for multi-feed cases beyond the current single preferred `Fed From` label.
- [ ] Decide whether copy/paste needs explicit toolbar affordances, system-clipboard interoperability, or undo-aware workflows beyond the current keyboard-only subgraph duplication path.
- [ ] Define how electrical metadata editing should scale across large project topologies without overloading the canvas UI.

## Documentation Alignment
- [ ] Keep `handoff.md` source-map revisions aligned with committed history whenever new phases move from working tree to commit.
- [ ] Update repo documentation as electrical metadata contracts become implemented so AGENTS, handoff, and user-facing docs do not drift.
