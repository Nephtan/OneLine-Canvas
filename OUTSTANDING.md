# OneLine-Canvas Outstanding Gaps

This file is the live backlog for unresolved modeling, workflow, testing, and documentation gaps.
`handoff.md` remains the historical architecture narrative; this checklist tracks what still needs to be closed.

## Electrical Data Model
- [ ] Resolve PTX current-rating semantics explicitly: decide whether transformer current metadata belongs on the primary side, secondary side, or both.
- [ ] Decide whether root-source nodes should also carry optional current/rating metadata or remain voltage/sync-only sources for now.
- [ ] Normalize equipment-specific metadata contracts so new, imported, and hydrated gear preserve electrical ratings consistently.
- [ ] Define which metadata belongs on nodes versus edges for switchgear line/load terminals, breaker devices, and future protective schemes.
- [ ] Decide how future fuse-specific metadata should coexist with the new breaker/wire edge schema without overloading the current protective-edge UI.

## Engine Semantics
- [ ] Extend voltage-aware traversal beyond nominal mismatch checks into richer compatibility validation such as allowable windows, source permissives, or equipment-specific voltage tolerances.
- [ ] Define how future electrical metadata is consumed incrementally by the engine without breaking existing project-agnostic topology workflows.
- [ ] Decide whether voltage-fault conditions should stay diagnostic-only or promote into protective-trip events for future solver passes.

## Breaker and Switch Realism
- [ ] Extend the new ideal-selective protection pass into true coordination study behavior with fault current, time-current curves, and settings-based device discrimination.
- [ ] Define future breaker and switch semantics for current limits, permissives, lockout/reclose, and protection-oriented device modeling.
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
- [x] Replace shallow graph-shape import validation with deep schema and version-aware validation for node and edge payloads.
- [x] Add validation for malformed or incomplete electrical metadata so bad imports do not silently degrade simulation fidelity.
- [x] Surface invalid handle assignments and other current hard validation failures to operators through a docked validation workflow instead of alerts alone.
- [ ] Decide whether future validation should add advisory warning tiers and broader generic-wiring guidance beyond the current hard-error-only diagnostics panel.

## Testing and Performance
- [x] Add tests for canonical electrical metadata normalization and persistence across create, hydrate, export, and import flows.
- [ ] Extend operator-facing `Fed From` coverage beyond the current breaker / wire / PTX / ATS / UPS lineup, which now includes handle-aware switchboard precedence and the `ExampleTopology/EXAMPLE-TOPOLOGY.json` regression fixture.
- [x] Add formal large-graph stress and performance coverage for traversal cost ceilings and memoization stability.
- [ ] Add higher-order tests for future protection-study semantics such as TCC discrimination, impedance-driven duty calculations, and device-family-specific settings.

## UI and Workflow Coverage
- [ ] Add automated UI coverage for grid snapping, rigid group node moves with manual edge midpoint translation, edge-properties and delete controls, copy/paste flows, breaker-vs-wire draw mode selection, SCADA actions, and MOP recording or playback flows.
- [ ] Extend the new single-rail command dock beyond desktop `1080p` into deliberate collapse behavior for smaller screens and tablet-class widths.
- [ ] Decide whether manual edge routing needs reset-to-auto controls, richer multi-bend editing, or obstacle-aware autorouting beyond the current single midpoint anchor.
- [ ] Expand the broader properties modal into bulk-edit workflows and richer device-rating workflows so large projects do not require one-by-one metadata entry.
- [ ] Add UI validation or guided affordances around new multi-landing cases such as switchboard bottom-bus targets so operators can tell when a landing is a return corridor versus the preferred main feed.
- [ ] Decide whether node cards need a secondary operator-facing cue for multi-feed cases beyond the current single preferred `Fed From` label.
- [ ] Decide whether copy/paste needs explicit toolbar affordances, system-clipboard interoperability, or undo-aware workflows beyond the current keyboard-only subgraph duplication path.
- [ ] Define how electrical metadata editing should scale across large project topologies without overloading the canvas UI.

## Documentation Alignment
- [ ] Keep `handoff.md` source-map revisions aligned with committed history whenever new phases move from working tree to commit.
- [ ] Update repo documentation as electrical metadata contracts become implemented so AGENTS, handoff, and user-facing docs do not drift.
