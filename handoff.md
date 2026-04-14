# OneLine-Canvas Handoff (Phase 8: Universal Big Bus Standardization)

## 1. Completed Architectural Changes
- Completed universal top-to-bottom handle retrofit across existing equipment families while preserving existing state/persistence architecture.
- Root source retrofit:
  - `UtilityNode.jsx`: removed legacy side handles and now exposes one continuous bottom `source` bus handle (`Position.Bottom`, `isConnectable={true}`).
  - `GeneratorNode.jsx`: removed legacy side handles and now exposes one continuous bottom `source` bus handle (`Position.Bottom`, `isConnectable={true}`).
- Pass-through gear retrofit:
  - `MVSGNode.jsx`: replaced left/right handles with a continuous top `target` bus and continuous bottom `source` bus.
  - `PTXNode.jsx`: replaced left/right handles with a continuous top `target` bus and continuous bottom `source` bus.
- Terminal sink retrofit:
  - `LoadNode.jsx`: replaced side target handle with continuous top `target` bus only.
  - `MechanicalNode.jsx`: standardized to continuous top `target` bus only.
- Visual polish:
  - all retrofitted handles now render as busbars (wide rounded bars spanning node width) rather than default React Flow dot handles.
  - maintained state-driven color inheritance on bus handles (`Live`, `Dead`, `Backfeed`, `Phase Conflict`).
- No physics logic changes:
  - `usePowerFlow` and engine traversal math were not modified for Phase 8.

## 2. Current State of the Dynamic Graph Engine
- Engine remains source-aware and topology-agnostic with root sources:
  - `utility`
  - `generator`
- Connectivity resolution still relies only on React Flow edge `source` and `target` node IDs.
- UI handle position/geometry changes do not alter electrical math; they only affect user interaction and wiring ergonomics.
- Persistence/export/import behavior remains intact:
  - `{ nodes, edges }` graph schema unchanged,
  - all node types continue to serialize and hydrate through localStorage and JSON file import/export.

## 3. Known Bugs / Unhandled Edge Cases
- Big Bus geometry intentionally permits operator-error topologies; no electrical interlock or sequencing constraints are enforced.
- Terminal semantics (Load/Mechanical) are UI-handle constrained only; no deeper directional validation logic exists.
- Imported topology validation remains shallow (top-level array shape only); no deep node schema validation/versioning is implemented.
- Protection behavior remains visual-only (no relay trip logic, selective coordination, or fault-clearing simulation).
- Persistence remains local/browser-scoped (no remote sync, revision history, or collaborative merge controls).
