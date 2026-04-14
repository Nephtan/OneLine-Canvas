# OneLine-Canvas Handoff (Phase 5: Expanded Yard & Active Source Control)

## 1. Completed Architectural Changes
- Added active utility source control in `UtilityNode.jsx`:
  - interactive `Kill Feed` / `Restore Feed` button,
  - online/offline status chip,
  - callback-driven mutation of canonical node data (`isSourceOnline`) via `App.jsx`.
- Implemented strict utility visual precedence:
  - `Phase Conflict` remains critical red and overrides offline dimming,
  - `Backfeed` remains aggressive orange and overrides offline dimming,
  - true offline dim/grey only when `isSourceOnline === false` and resolved state is `Dead`.
- Expanded equipment library with new node types:
  - `PTX` (`src/nodes/PTXNode.jsx`) as pass-through transformer node (`target` + `source` handles),
  - `Load` (`src/nodes/LoadNode.jsx`) as terminal sink (`target` handles only, no source handle).
- Updated `EquipmentPalette.jsx` to include draggable `PTX` and `Load` cards.
- Updated `App.jsx` integration:
  - registered new React Flow node types (`ptx`, `load`),
  - extended drag-drop spawn whitelist and data factories for both new types,
  - injected `onToggleSourceOnline` callback into utility render data,
  - retained blank startup canvas and existing breaker/deletion interactions.
- Preserved locked physics engine behavior:
  - no traversal/propagation algorithm rewrite in `usePowerFlow` or engine math,
  - utility online/offline changes flow through existing topology-key recalc path.
- Extended engine unit tests (`src/engine/powerFlow.test.js`):
  - PTX/Load downstream live-state inheritance test,
  - PTX/Load downstream blackout test when utility is offline.

## 2. Current State of the Dynamic Graph Engine
- Engine remains source-aware and topology-agnostic with states:
  - `Dead`, `Live`, `Backfeed`, `Phase Conflict`.
- Root-source qualification still uses `utility.data.isSourceOnline !== false`.
- Topology key already includes utility online signature, so utility kill/restore toggles trigger immediate recomputation without engine changes.
- PTX and Load nodes are treated as non-utility conductive graph members:
  - they inherit power state from graph continuity,
  - Load is UI-restricted to terminal behavior by handle configuration.

## 3. Known Bugs / Unhandled Edge Cases
- Utility online toggle is per-node UI only; no bulk control panel, scheduling, or SCADA-style command queue yet.
- No persistence exists yet; sandbox graph resets on page reload.
- Load termination is handle-restricted but does not yet enforce electrical directionality/protection beyond connection geometry.
- Conflict model still assumes immediate incompatibility for multi-source overlap (no phase-angle/synchronization model).
- Protection behavior remains visual-only (no breaker auto-trip, relay coordination, selective isolation, or fault-clearing timing).
