# OneLine-Canvas Handoff (Phase 4: Equipment Sandbox)

## 1. Completed Architectural Changes
- Added `src/components/EquipmentPalette.jsx` as an industrial-styled sidebar palette with draggable gear entries:
  - `Utility Feed`
  - `MVSG`
- Implemented HTML5 drag-and-drop integration in `App.jsx`:
  - palette uses `onDragStart` and a custom MIME payload,
  - canvas wrapper handles `onDragOver` and `onDrop`.
- Implemented dynamic node spawning into React Flow state on drop:
  - projected drop coordinates are converted via React Flow viewport projection,
  - node IDs are generated with `crypto.randomUUID()` (no iterative IDs),
  - spawned node types and default data map directly to existing engine-compatible shapes.
- Added default deletion interaction wiring in `App.jsx`:
  - `onNodesDelete` and `onEdgesDelete` are explicitly handled,
  - dangling conductors are removed when a node is deleted,
  - keyboard deletion (`Delete`/`Backspace`) is enabled.
- Removed the hardcoded startup topology and now load with a fully blank canvas (`nodes: []`, `edges: []`).
- Preserved existing breaker creation/toggle behavior and existing render pipeline so dynamically spawned nodes/edges feed directly into the locked physics engine.

## 2. Current State of the Dynamic Graph Engine
- Physics engine math is unchanged from Phase 3 and remains source-aware/catastrophic-state capable.
- Dynamic canvas state now fully drives the engine:
  - user-dropped nodes and user-created edges flow through the same `nodes`/`edges` arrays consumed by `usePowerFlow`,
  - topology key recalculation occurs automatically on add/delete/toggle operations.
- Node and edge render states continue to be derived (no simulation-driven mutation loops).

## 3. Known Bugs / Unhandled Edge Cases
- Utility source online/offline toggling is data-supported (`isSourceOnline`) but no explicit UI control exists yet.
- Equipment library is currently minimal (`Utility Feed`, `MVSG` only); no transformers, breakers as standalone nodes, or load devices yet.
- No persistence/session save exists yet; canvas state resets on reload.
- Conflict model still assumes immediate incompatibility for multi-source overlap (no phase-angle/synchronization model).
- Protection behavior remains visual-only (no auto-trip/relay sequence/zone-isolation logic).
