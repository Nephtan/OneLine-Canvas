# OneLine-Canvas Handoff (Phase 7: 480V & Mechanical Expansion)

## 1. Completed Architectural Changes
- Added new root-capable source node:
  - `GeneratorNode` (`src/nodes/GeneratorNode.jsx`) with distinct diesel/engine visual identity.
  - Includes interactive `Kill Feed` / `Restore Feed` control using `data.isSourceOnline`.
  - Implements the same source-state semantics and visual precedence model as utility (`Live`, `Dead`, `Backfeed`, `Phase Conflict`).
- Expanded physics engine root-source qualification in `src/engine/powerFlow.js`:
  - root source types are now `utility` **and** `generator`.
  - root source online gating uses `data.isSourceOnline !== false` for both types.
  - topology key source-online signature now accounts for both root source types.
  - traversal/set-union math and edge-state logic were otherwise preserved.
- Added Big Bus distribution nodes:
  - `SwitchboardNode` (`src/nodes/SwitchboardNode.jsx`)
  - `TransferSwitchNode` (`src/nodes/TransferSwitchNode.jsx`)
  - Both implement Big Bus handle geometry:
    - single continuous top `target` bus handle,
    - single continuous bottom `source` bus handle,
    - `isConnectable={true}` for unlimited edge snaps.
- Added mechanical terminal sink:
  - `MechanicalNode` (`src/nodes/MechanicalNode.jsx`) with fan/mechanical styling.
  - Terminal behavior enforced by handle geometry (`target` only, no `source`).
- Updated `App.jsx` node registry and spawn factory:
  - registered new node types: `generator`, `switchboard`, `transferSwitch`, `mechanical`.
  - expanded drag/drop whitelist and default node data payloads for all new types.
  - generalized root source toggle callback injection for both utility and generator node types.
- Updated equipment palette (`src/components/EquipmentPalette.jsx`) with draggable entries for:
  - Generator, Switchboard, Transfer Switch, Mechanical.
- Preserved persistence/export/import format and flow:
  - no schema change to persisted graph (`{ nodes, edges }`);
  - all new node types serialize and hydrate natively through existing localStorage and JSON file paths.
- Expanded engine unit tests (`src/engine/powerFlow.test.js`):
  - generator root propagation,
  - generator-offline de-energization,
  - utility+generator tie conflict,
  - generator topology-key invalidation,
  - generator -> switchboard -> transfer switch -> mechanical downstream propagation.

## 2. Current State of the Dynamic Graph Engine
- Engine remains source-aware and topology-agnostic with dynamic adjacency from current React Flow `nodes`/`edges`.
- Root source set now includes:
  - `utility`
  - `generator`
- State outputs remain:
  - node: `Dead`, `Live`, `Backfeed`, `Phase Conflict`
  - edge: `de-energized`, `energized`, `phase-conflict`
- Topology recomputation is still memoized and deterministic:
  - position-only drags do not invalidate topology key;
  - online/offline source toggles for utility and generator do invalidate topology key.
- Big Bus philosophy is implemented in UI geometry only:
  - no bespoke port-mapping or direction-routing logic beyond single bus handles.

## 3. Known Bugs / Unhandled Edge Cases
- Big Bus handles permit intentionally invalid/operator-error topologies by design; no electrical interlock constraints are applied.
- Mechanical/load terminal semantics are UI-enforced via handle geometry only; no additional electrical-direction validation is implemented.
- Imported topology validation remains shallow (top-level arrays only); deep schema/type validation for unknown node payloads is not implemented.
- Persistence remains local-only (no remote sync, version history, or multi-user merge resolution).
- Protection behavior remains visual-only (no breaker auto-trip, relay coordination, selective isolation, or fault-clearing timing simulation).
