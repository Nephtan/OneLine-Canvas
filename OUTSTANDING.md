# OneLine-Canvas Outstanding Gaps

This file is the live backlog for unresolved modeling, workflow, testing, and documentation gaps.
`handoff.md` remains the historical architecture narrative; this checklist tracks what still needs to be closed.

## Electrical Data Model
- [ ] Expand the now-canonical node voltage metadata with optional `ratedCurrentAmps` and other equipment-specific ratings.
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

## Validation and Import Safety
- [ ] Replace shallow graph-shape import validation with deep schema and version-aware validation for node and edge payloads.
- [ ] Add validation for malformed or incomplete electrical metadata so bad imports do not silently degrade simulation fidelity.
- [ ] Decide how invalid handle assignments or future device-specific wiring errors should be surfaced to the operator.

## Testing and Performance
- [ ] Add tests for canonical electrical metadata normalization and persistence across create, hydrate, export, and import flows.
- [ ] Add formal large-graph stress and performance coverage for traversal cost ceilings and memoization stability.
- [ ] Add tests for any future protection, relay coordination, or breaker rating semantics.

## UI and Workflow Coverage
- [ ] Add automated UI coverage for delete controls, breaker-vs-wire draw mode selection, SCADA actions, and MOP recording or playback flows.
- [ ] Expand the new properties modal beyond voltage into current, device ratings, and richer equipment-specific electrical metadata.
- [ ] Define how electrical metadata editing should scale across large project topologies without overloading the canvas UI.

## Documentation Alignment
- [ ] Keep `handoff.md` source-map revisions aligned with committed history whenever new phases move from working tree to commit.
- [ ] Update repo documentation as electrical metadata contracts become implemented so AGENTS, handoff, and user-facing docs do not drift.
