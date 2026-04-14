# OneLine-Canvas Master Handoff (Phases 1-9)

## Source Map (Historical Inputs)
| Phase | Revision | Date | Commit Subject | Status |
| --- | --- | --- | --- | --- |
| Phase 1 | `733328d13c4dcb90743bb2e9a1e5db853f5c5bec` | `2026-04-13` | `Scaffold React Flow sandbox with single-file Vite build` | Committed |
| Phase 2 | `bd4b70c42fef3779f1874ebc6f56560e602e4e84` | `2026-04-13` | `Implement phase conflict and backfeed power flow visualization` | Committed |
| Phase 3 | `6cc3ad7017c9e5461d262650bd034f633067b2ff` | `2026-04-13` | `Implement phase conflict and backfeed power flow states` | Committed |
| Phase 4 | `1b81d50991b0d3da427e63bbafba252ca59bb086` | `2026-04-13` | `Add draggable equipment palette and blank-canvas sandbox` | Committed |
| Phase 5 | `9e242de2cd1c7d1ea307eff9f0fc5ba0f81f72ad` | `2026-04-13` | `Add utility source toggle and PTX/load equipment nodes` | Committed |
| Phase 6 | `0e460484c7c1298af44a4adb4b90fca1e124183f` | `2026-04-13` | `Build single-file bundle for persistence and import controls` | Committed |
| Phase 7 | `af45a63826a360598164015d84be0d2f9eb1b64e` | `2026-04-13` | `Expand yard with generator big-bus and mechanical node support` | Committed |
| Phase 8 | `1d3482f4edfba70ec4d0a10ce7fde857efcd4991` | `2026-04-13` | `Big Bus geometry update for all gear` | Committed |
| Phase 9 | `WORKTREE (uncommitted)` | `2026-04-13` | `Implement protective isolation auto-trip breakers` | Completed in workspace |

## Timeline of Architectural Evolution

### Phase 1: Scaffolding the Sandbox
- Revision: `733328d13c4dcb90743bb2e9a1e5db853f5c5bec`
- Date: `2026-04-13`
- Subject: `Scaffold React Flow sandbox with single-file Vite build`
- Major additions:
  - Bootstrapped Vite + React 18 with Tailwind and `@xyflow/react`.
  - Configured `vite-plugin-singlefile` and inlining-focused build settings for monolithic output.
  - Added initial custom nodes (`utility`, `mvsg`) and dynamic edge creation.
- Engine-state evolution:
  - No traversal engine yet.
  - Canvas state plumbing for dynamic topology (`nodes`, `edges`) established.
- Unresolved items at phase end:
  - `Dead`, `Live`, `Backfeed`, and `Phase Conflict` logic not implemented yet.
  - Dynamic adjacency extraction and conflict detection not implemented yet.
  - No engine unit tests yet.
  - Historical note: these core gaps were addressed incrementally in Phases 2 and 3.

### Phase 2: Dynamic Power Propagation
- Revision: `bd4b70c42fef3779f1874ebc6f56560e602e4e84`
- Date: `2026-04-13`
- Subject: `Implement phase conflict and backfeed power flow visualization`
- Major additions:
  - Added interactive breaker edge type with open/closed visuals.
  - Introduced `usePowerFlow` cache/memoization and topology-key invalidation.
  - Implemented dynamic adjacency build and basic continuity traversal from utility roots.
- Engine-state evolution:
  - First dynamic power engine output: nodes resolved to `Live` or `Dead`.
  - Closed breakers modeled as bi-directional conductive paths.
- Unresolved items at phase end:
  - `Backfeed` and `Phase Conflict` states not implemented yet.
  - Multi-source synchronization/conflict logic absent.
  - Historical note: these gaps were closed in Phase 3.

### Phase 3: Catastrophic Failure Detection
- Revision: `6cc3ad7017c9e5461d262650bd034f633067b2ff`
- Date: `2026-04-13`
- Subject: `Implement phase conflict and backfeed power flow states`
- Major additions:
  - Upgraded traversal to source-aware propagation using set-union across closed breakers.
  - Added node-state resolution: `Dead`, `Live`, `Backfeed`, `Phase Conflict`.
  - Added edge-state resolution: `de-energized`, `energized`, `phase-conflict`.
  - Expanded tests for source aggregation, conflict, backfeed, and edge state mapping.
- Engine-state evolution:
  - Engine became source-resolved and catastrophic-failure aware.
  - Utility online status (`isSourceOnline`) entered topology-key invalidation.
- Unresolved items at phase end:
  - No phase-angle/synchronization compatibility model.
  - No protection actions (trip, relay coordination, isolation).
  - Advanced component semantics not implemented (transformer groups, transfer logic depth).

### Phase 4: Equipment Sandbox
- Revision: `1b81d50991b0d3da427e63bbafba252ca59bb086`
- Date: `2026-04-13`
- Subject: `Add draggable equipment palette and blank-canvas sandbox`
- Major additions:
  - Added draggable equipment palette and HTML5 drag-drop into React Flow.
  - Replaced hardcoded startup topology with blank canvas.
  - Added deletion plumbing for nodes/edges and dangling edge cleanup.
- Engine-state evolution:
  - No math rewrite; Phase 3 engine now consumed fully dynamic user-generated topology.
- Unresolved items at phase end:
  - Utility online/offline toggle had no explicit UI.
  - Minimal equipment set only.
  - No persistence.
  - Historical note: utility controls were added in Phase 5; persistence was added in Phase 6.

### Phase 5: Expanded Yard and Active Source Control
- Revision: `9e242de2cd1c7d1ea307eff9f0fc5ba0f81f72ad`
- Date: `2026-04-13`
- Subject: `Add utility source toggle and PTX/load equipment nodes`
- Major additions:
  - Added utility `Kill Feed` / `Restore Feed` control and online status UI.
  - Added `ptx` and `load` node types and palette integration.
  - Kept engine unchanged; reused existing root-online gating and topology-key behavior.
  - Added tests for PTX/load propagation and utility-offline blackout.
- Engine-state evolution:
  - Root online/offline controls became user-operable without changing traversal math.
  - PTX/load participated as non-root graph members with inherited states.
- Unresolved items at phase end:
  - No bulk source orchestration (panel/queue/SCADA layer).
  - Persistence still absent.
  - Terminal behavior enforced by geometry only.
  - Historical note: persistence arrived in Phase 6.

### Phase 6: Persistence and State Sharing
- Revision: `0e460484c7c1298af44a4adb4b90fca1e124183f`
- Date: `2026-04-13`
- Subject: `Build single-file bundle for persistence and import controls`
- Major additions:
  - Added localStorage hydration/autosave for canonical `{ nodes, edges }`.
  - Added export/import/clear controls for topology JSON.
  - Added safe fallback behavior for missing/invalid persisted payloads.
- Engine-state evolution:
  - Engine math unchanged; hydrated/imported graphs fed directly into existing traversal.
- Unresolved items at phase end:
  - Import validation shallow at top-level array shape only.
  - Clear is destructive with no undo flow.
  - State remains local-only with no remote sync/collaboration.

### Phase 7: 480V and Mechanical Expansion
- Revision: `af45a63826a360598164015d84be0d2f9eb1b64e`
- Date: `2026-04-13`
- Subject: `Expand yard with generator big-bus and mechanical node support`
- Major additions:
  - Added `generator` as second root-capable source type with online controls.
  - Expanded root-source qualification to `utility` and `generator`.
  - Added Big Bus nodes (`switchboard`, `transferSwitch`) and terminal `mechanical`.
  - Added generator- and chain-propagation test coverage.
- Engine-state evolution:
  - Root-source model expanded while preserving traversal/set-union core.
  - Topology key updated to include both utility and generator online signatures.
- Unresolved items at phase end:
  - Big Bus permissiveness intentionally allows invalid operator topologies.
  - No interlocks/protective sequencing.
  - Terminal sink directionality still geometry-enforced only.

### Phase 8: Universal Big Bus Standardization
- Revision: `1d3482f4edfba70ec4d0a10ce7fde857efcd4991`
- Date: `2026-04-13`
- Subject: `Big Bus geometry update for all gear`
- Major additions:
  - Retrofitted legacy nodes to top/bottom continuous bus handles.
  - Updated root sources (`utility`, `generator`) to bottom source bus handles.
  - Updated pass-through nodes (`mvsg`, `ptx`) to top target + bottom source bus handles.
  - Updated terminal nodes (`load`, `mechanical`) to top target bus handles only.
  - Standardized busbar-style handle visuals with state-aware color inheritance.
- Engine-state evolution:
  - No traversal or `usePowerFlow` logic changes.
  - UI geometry changes only; electrical math and persistence contracts unchanged.
- Unresolved items at phase end:
  - Big Bus and terminal constraints remain interaction-level, not protection-level.
  - Existing persistence/import/protection limitations remain.

### Phase 9: Protective Isolation
- Revision: `WORKTREE (uncommitted)`
- Date: `2026-04-13`
- Subject: `Implement protective isolation auto-trip breakers`
- Major additions:
  - Expanded breaker model from binary states to `open | closed | tripped`.
  - Added tripped breaker edge visuals and mechanical reset interaction cycle (`tripped -> open -> closed`).
  - Extended power engine output with `faultedEdgeIds` to identify closed breakers touching conflict nodes.
  - Added App-level protection effect that force-trips emitted faulted breakers without mutating node state directly.
  - Added unit coverage for tripped conductivity and faulted-edge emission behavior.
- Engine-state evolution:
  - Traversal remains topology-driven and memoized; `tripped` is now treated as non-conductive.
  - Conflict detection now drives immediate breaker isolation feedback into canonical edge state.
- Unresolved items at phase end:
  - Protective isolation is intentionally aggressive and trips all closed breakers adjacent to conflict nodes.
  - No relay timing/selective coordination hierarchy is modeled yet.

## Cumulative System State (Latest)

### Completed Architectural Changes
- Platform and deployment:
  - Vite + React 18 + Tailwind + `@xyflow/react` with `vite-plugin-singlefile` monolithic output strategy.
- Dynamic canvas and equipment workflow:
  - Blank-canvas sandbox with drag-drop equipment palette, user-created edges, and deletion support.
- Source-aware dynamic power engine:
  - Topology extracted from live React Flow `nodes`/`edges`.
  - Only closed breakers (`edge.data.breakerState === "closed"`) are conductive and bi-directional.
  - Open and tripped breakers are non-conductive.
  - Root sources are `utility` and `generator` where `data.isSourceOnline !== false`.
- Normalized state model:
  - Node states: `Dead`, `Live`, `Backfeed`, `Phase Conflict`.
  - Edge states: `de-energized`, `energized`, `phase-conflict`.
- Rendering architecture:
  - Simulation output is derived into render nodes/edges without mutating canonical graph state.
- Persistence and topology portability:
  - Local autosave/hydration plus JSON export/import for `{ nodes, edges }`.
- Big Bus interaction standard:
  - Multi-connection ergonomics standardized to continuous bus handles; permissive wiring is intentional.
- Protective isolation:
  - Engine emits `faultedEdgeIds` for closed breakers adjacent to `Phase Conflict` nodes.
  - App auto-trips those edges to `breakerState: "tripped"` and forces a recalculation cascade.
  - Breaker interaction enforces mechanical reset (`tripped -> open -> closed`).

### Current Dynamic Graph Engine Behavior
- Traversal:
  - Queue-based source-set propagation over dynamically built adjacency from the current canvas graph.
- Conflict and backfeed:
  - Multi-source overlap resolves to `Phase Conflict`.
  - Root fed by a non-self source resolves to `Backfeed`.
- Protection feedback:
  - Conflict evaluation emits a deterministic fault-hit list of closed breakers connected to conflicted nodes.
  - The hit list is consumed by `App.jsx` to trip breakers and clear active faults in the next recompute.
- Recompute and memoization:
  - Topology key includes node identity/type plus root-source online signatures.
  - Topology key includes edge source/target and breaker state (`open`, `closed`, `tripped`).
  - Position-only drags do not invalidate traversal cache.

### Locked Behavioral Contracts for Implementers
- Topology source of truth is always live React Flow `nodes`/`edges`; no hardcoded adjacency is permitted.
- Breaker conductivity is controlled only by `edge.data.breakerState`.
- Valid breaker states are `open`, `closed`, and `tripped`; only `closed` is conductive.
- Big Bus handle geometry is intentionally permissive and does not enforce electrical correctness.
- Persistence contract remains `{ nodes, edges }` with shallow import validation.
- `usePowerFlow` now returns `faultedEdgeIds` in addition to node/edge power maps.

## Known Bugs and Unhandled Edge Cases (Cumulative)
- Multi-source overlap is treated as immediate `Phase Conflict`; no phase-angle/synchronization compatibility model exists.
- Protective isolation is coarse-grained: all closed breakers adjacent to conflict nodes trip in the same cycle.
- No relay timing/coordination hierarchy exists (instantaneous trip, no selective delay curves, no lockout sequencing).
- Big Bus geometry intentionally allows operator-error topologies; no interlock/sequencing logic is enforced.
- Terminal sinks (`load`, `mechanical`) rely on handle geometry; deeper directionality/protection validation is not implemented.
- Advanced electrical semantics remain unmodeled (for example transformer vector groups and detailed transfer/protection schemes).
- Import validation is shallow; deep schema/version validation for node payloads is not implemented.
- Persistence is local-browser scoped only; no remote sync, revision history, or multi-user merge workflow exists.
- `Clear Yard` remains destructive with no confirmation/undo stack.
- Source controls are node-local; no bulk dispatch/SCADA orchestration layer exists.

## Engine Verification and Test Coverage Snapshot

### Existing Engine Test Coverage (`src/engine/powerFlow.test.js`)
- Continuity and topology-key behavior for open/closed breaker paths.
- Source aggregation with explicit assertions for `Backfeed` and `Phase Conflict`.
- Edge power-state mapping (`de-energized`, `energized`, `phase-conflict`).
- Trip-aware breaker behavior (`tripped` treated as non-conductive/de-energized).
- Fault-hitlist emission (`faultedEdgeIds`) for conflict corridors and non-conflict empty-set checks.
- PTX/load downstream propagation and utility-offline blackout behavior.
- Generator root propagation, generator-offline behavior, utility+generator tie conflict, and generator topology-key invalidation.
- End-to-end chain propagation through `generator -> switchboard -> transferSwitch -> mechanical`.

### Current Validation Gaps
- No engine model/tests for synchronization compatibility, phase-angle drift, or source-matching windows.
- No selective relay coordination model (zone-selective interlocking, staged tripping, breaker priorities).
- No lockout/reclose lifecycle model beyond manual reset via edge click cycle.
- No deep import-schema validation tests for unknown/malformed node data payloads.
- No formal large-graph stress/performance test suite for traversal cost ceilings.
