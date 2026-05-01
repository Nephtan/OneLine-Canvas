# OneLine-Canvas Master Handoff (Phases 1-15 + Working Tree Updates)

`handoff.md` is the historical architecture log. For the live backlog of unresolved modeling, workflow, testing, and documentation gaps, see `OUTSTANDING.md`.

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
| Phase 9 | `6ae264482bbf10a9113a05493e41c88310c548f9` | `2026-04-13` | `Implement protective isolation auto-trip breakers` | Committed |
| Phase 10 | `c5c1a2b5d41f3648ce5c0c2c387b7a5b92815bd0` | `2026-04-14` | `Implement equipment identity and synchronized source paralleling` | Committed |
| Phase 11 | `17ed10fee00b6d88bc3cf2264ad95b46828833c9` | `2026-04-14` | `Add docked SCADA dashboard for source control and breaker reset` | Committed |
| Phase 12 | `d1de6d1` | `2026-04-14` | `Implement snapshot-based MOP recorder and playback deck` | Committed |
| Phase 13 | `09bc204` | `2026-04-14` | `Implement intelligent ATS interlocks and MOP-aware transfer throws` | Committed |
| Phase 14 | `4e66668` | `2026-04-14` | `Add native visual deletion controls and explicit breaker vs wire draw modes` | Committed |
| Phase 15 | `9fe5e68` | `2026-04-17` | `Implement voltage-aware transformer propagation and properties modal` | Committed |
| Feature Update | `516637d` | `2026-04-17` | `Enable PTX primary-bus daisy-chain propagation` | Committed |
| Feature Update | `273fa4c` | `2026-04-17` | `Add dual-ended PTX primary terminals` | Committed |
| Working Tree | `working-tree` | `2026-04-17` | `Repair PTX top-edge terminal visuals` | Implemented |
| Working Tree | `working-tree` | `2026-04-20` | `Add grid-snapped node layout and draggable edge midpoints` | Implemented |
| Working Tree | `working-tree` | `2026-04-20` | `Add UPS node, directional power flow, and switchboard bottom landing` | Implemented |
| Working Tree | `working-tree` | `2026-04-20` | `Expand node editability and breaker-based source display` | Implemented |
| Working Tree | `working-tree` | `2026-04-20` | `Implement operator-facing Fed From and canvas copy/paste` | Implemented |
| Working Tree | `working-tree` | `2026-04-20` | `Correct switchboard Fed From precedence with ExampleTopology regression coverage` | Implemented |
| Working Tree | `working-tree` | `2026-04-20` | `Keep manual edge centers attached during rigid group node moves` | Implemented |
| Working Tree | `working-tree` | `2026-04-22` | `Add hybrid selective protection, bolted faults, and edge properties` | Implemented |
| Working Tree | `working-tree` | `2026-04-22` | `Restore edge-properties gear access for breakers and wires` | Implemented |
| Working Tree | `working-tree` | `2026-05-01` | `Audit documentation backlog and prioritize import-validation hardening` | Implemented |
| Working Tree | `working-tree` | `2026-05-01` | `Implement schema-v1 persistence validation and metadata round-trip tests` | Implemented |
| Working Tree | `working-tree` | `2026-05-01` | `Consolidate left dock into single tabbed command rail` | Implemented |
| Maintenance | `c5c1a2b5d41f3648ce5c0c2c387b7a5b92815bd0` | `2026-04-14` | `Add DEPENDENCIES.md dependency inventory` | Committed |
| Maintenance | `bb16e038263c94da64e6ed1f8d4ceb44e2358ae1` | `2026-04-14` | `Add dependency self-validation tooling and setup guidance` | Committed |
| Maintenance | `cafe8dbffcbd0d7ec1414aab84b5395a34c7d35c` | `2026-04-14` | `Repair Windows npm launch path for dependency self-check` | Committed |
| Maintenance | `working-tree` | `2026-04-17` | `Rewrite README for accurate public repo presentation` | Implemented |

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
- Revision: `6ae264482bbf10a9113a05493e41c88310c548f9`
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

### Phase 10: Identity and Synchronization
- Revision: `c5c1a2b5d41f3648ce5c0c2c387b7a5b92815bd0`
- Date: `2026-04-14`
- Subject: `Implement equipment identity and synchronized source paralleling`
- Major additions:
  - Centralized canonical node-data defaults/backfill so new, imported, and hydrated nodes all preserve `label` fields and root-source `syncGroup` metadata.
  - Added reusable inline label editing for every rendered node via double-click rename.
  - Added visible `Sync Group` inputs on `utility` and `generator` nodes while preserving raw user-entered text in canonical graph state.
  - Expanded engine tests to cover synchronized paralleling, blank/mixed sync-group conflicts, normalization behavior, and topology-key invalidation rules.
- Engine-state evolution:
  - Source propagation still tracks unique root source IDs over closed breakers.
  - `Phase Conflict` now occurs only when a multi-source set does not collapse to one shared, non-empty normalized sync group.
  - Same-group Utility/Generator parallels remain energized and do not emit `faultedEdgeIds`, so Phase 9 auto-trip logic stays dormant on healthy synchronized ties.
- Unresolved items at phase end:
  - Sync groups model compatibility identity only; there is still no phase-angle, frequency, or permissive-window simulation.
  - Validation code was updated, but automated Vitest execution remains blocked in this shell until `node`/`npm` are available.

### Phase 11: SCADA Dashboard
- Revision: `17ed10fee00b6d88bc3cf2264ad95b46828833c9`
- Date: `2026-04-14`
- Subject: `Add docked SCADA dashboard for source control and breaker reset`
- Major additions:
  - Added `ScadaPanel` as a docked HMI-style sidebar between the Equipment Palette and the canvas.
  - Added dynamic source telemetry derived from canonical React Flow `nodes` for all `utility` and `generator` root sources.
  - Added remote source actuation that reuses the existing App-level source toggle path instead of duplicating node logic.
  - Added a global `Reset All Breakers` action that mechanically resets every `tripped` breaker to `open`.
- Engine-state evolution:
  - None. `usePowerFlow` and `powerFlow.js` remain unchanged.
  - SCADA is a UI control surface only; it reads canonical state and mutates `nodes`/`edges` through React state setters.
- Unresolved items at phase end:
  - SCADA does not yet execute scripted Sequence of Operations runs, batches, or timed failover orchestration.
  - Breaker reset is global/manual only; there is no selective reset or breaker grouping model.

### Phase 12: MOP Recorder
- Revision: `d1de6d1`
- Date: `2026-04-14`
- Subject: `Implement snapshot-based MOP recorder and playback deck`
- Major additions:
  - Added App-level MOP recorder state: `mopSteps`, `mopBaseSnapshot`, `isRecordingMop`, `mopPlaybackIndex`, and a pending recorded-action descriptor.
  - Expanded localStorage and JSON import/export payloads from `{ nodes, edges }` to `{ nodes, edges, mopSteps, mopBaseSnapshot }` while keeping backward compatibility for older graph-only payloads.
  - Added SCADA-side `Record MOP` controls, pulsing red record status, playback deck rendering, and snapshot playback buttons for `Reset`, `Step Back`, and `Step Forward`.
  - Routed source toggles through a shared App-level callback so SCADA source actions and on-node source buttons both participate in MOP capture.
  - Routed breaker clicks through App-level capture logic so recorded steps store the operator action text plus a post-settle canonical graph snapshot.
- Engine-state evolution:
  - None. `usePowerFlow` and `powerFlow.js` remain unchanged.
  - MOP playback is a pure React state overwrite of canonical `nodes` and `edges`; the existing physics engine simply re-evaluates whatever snapshot is currently applied.
  - Recorded keyframes are committed only after `faultedEdgeIds` returns to empty, so Phase 9 auto-trips are captured in the step snapshot instead of being truncated mid-fault.
- Unresolved items at phase end:
  - Playback is linear only; no branching timeline, reordering, inline editing, or timed autoplay exists yet.
  - Snapshot playback is authoritative and may overwrite manual yard edits made after the recording was captured.

### Phase 13: Intelligent Transfer Switches
- Revision: `09bc204`
- Date: `2026-04-14`
- Subject: `Implement intelligent ATS interlocks and MOP-aware transfer throws`
- Major additions:
  - Replaced the ATS single top bus handle with two distinct top target handles: `target-primary` and `target-emergency`, while preserving the continuous bottom output handle.
  - Added canonical `transferSwitch.data.activeSource` state with a node-local selector UI and visual conductor cue that highlights the currently connected source path.
  - Added graph normalization that migrates legacy ATS inbound edges with missing or `transfer-bus-in` target handles onto `target-primary` during hydrate/import.
  - Extended MOP capture so ATS throws are stored as first-class actions and replay cleanly through the existing snapshot deck.
- Engine-state evolution:
  - Added a handle-aware ATS conduction gate ahead of adjacency construction so inactive ATS feeder edges behave like mechanically open branches.
  - Closed ATS feeder edges on the inactive input are now excluded from traversal, shown as `de-energized`, and excluded from `faultedEdgeIds`.
  - Topology-key invalidation now includes ATS `activeSource` plus edge source/target handle IDs so transfer throws and handle migrations trigger recomputation.
- Unresolved items at phase end:
  - ATS behavior is still a manual two-position selector only; no sensing, timers, source-availability logic, or automatic retransfer policy exists yet.
  - Break-before-make is modeled as pure connectivity filtering with no overlap or transfer-delay timing window.

### Phase 14: Canvas Ergonomics
- Revision: `4e66668`
- Date: `2026-04-14`
- Subject: `Add native visual deletion controls and explicit breaker vs wire draw modes`
- Major additions:
  - Added a shared top-right delete button to every custom node and routed all node deletes through React Flow's native `deleteElements()` path so attached wires are pruned safely with the parent node.
  - Added a new `standard` custom edge renderer with an inline delete button and upgraded `breaker` edges with the same explicit wire eraser control.
  - Added a palette-level connection tool selector that lets operators choose between `Breaker` and `Solid Wire` draw modes before dragging a new connection.
  - Extended MOP capture so node deletes and edge deletes are recorded as snapshot keyframes with operator-facing `Deleted ...` action text.
- Engine-state evolution:
  - Dynamic adjacency now distinguishes `breaker` and `standard` edges: breakers conduct only when `closed`, while standard wires conduct continuously unless blocked by ATS interlocks.
  - Topology-key invalidation now includes edge type in addition to existing endpoint, handle, breaker-state, sync-group, and ATS signatures.
  - Conflict-driven `faultedEdgeIds` still target breakers only, so standard wires visualize energized/conflict state but are never auto-tripped.
- Unresolved items at phase end:
  - Visual delete controls and connection-mode ergonomics are not yet covered by automated UI tests.
  - Keyboard deletion remains enabled, but MOP capture is only guaranteed for the new explicit delete buttons.

### Phase 15: Voltage Reality Check
- Revision: `9fe5e68`
- Date: `2026-04-17`
- Subject: `Implement voltage-aware transformer propagation and properties modal`
- Major additions:
  - Replaced legacy display-only voltage strings with canonical numeric node metadata: `nominalVoltage` for standard gear and `primaryVoltage` / `secondaryVoltage` for PTXs.
  - Added a compact industrial properties modal, opened from a node-local gear button, for editing labels and voltage metadata without disturbing the existing inline rename flow.
  - Added backward-compatible graph normalization that preserves numeric voltage metadata and parses recognizable legacy voltage strings such as `34.5 kV`, `12.47 kV Bus`, `480 V Generator`, and `12.47 kV / 480 V`.
  - Added a new `Voltage Fault` node state with deep-purple pulsing visuals and explicit precedence over `Phase Conflict`, `Backfeed`, and `Live`.
- Engine-state evolution:
  - Replaced the continuity-only source-set traversal with packet-based propagation that carries both source identity and propagating voltage.
  - PTXs now act as true electrical bridges: matched primary-side packets step down to the configured secondary voltage, matched secondary-side packets step back up to the configured primary voltage, and mismatched PTX arrivals fault and stop conduction through that direction.
  - Non-transformer gear now evaluates incoming propagating voltages against canonical `nominalVoltage`, allowing same-source overvoltage and cross-voltage operator errors to resolve as `Voltage Fault` instead of silently energizing.
  - The engine now emits `powerFlagsByNodeId` and `propagatingVoltagesByNodeId` so the UI can inspect latent `Phase Conflict` flags even when `Voltage Fault` wins visually.
- Unresolved items at phase end:
  - Voltage faults do not auto-trip breakers yet; only `Phase Conflict` continues to drive breaker trip isolation.
  - PTX behavior is still ideal-ratio only; there is no impedance, inrush, vector-group, tap, or protective relay model.

### Feature Update: PTX Primary Daisy-Chain
- Revision: `516637d`
- Date: `2026-04-17`
- Subject: `Enable PTX primary-bus daisy-chain propagation`
- Major additions:
  - Split the PTX primary side into explicit handle roles: `ptx-bus-in` for inbound MV feeders, `ptx-bus-loop` for MV continuation to the next PTX, and the existing `ptx-bus-out` secondary source handle for stepped-down output.
  - Updated `PTXNode.jsx` to render the top side as one labeled MV bus with distinct `In` and `Loop` connection points so operators can chain transformers input-to-input without loosening handle semantics app-wide.
  - Preserved existing saved-graph behavior by keeping legacy missing-handle PTX edges compatible with `ptx-bus-in` / `ptx-bus-out` fallback inference.
- Engine-state evolution:
  - PTX side detection now reads explicit handle roles from live edge handle IDs rather than inferring transformer side only from source-versus-target position.
  - A matched PTX primary or secondary arrival now energizes the whole internal primary bus, allowing MV packets to continue across chained PTX primary corridors while still transforming to the configured secondary voltage.
  - Reverse PTX backfeed now traverses the new primary daisy-chain path, while primary-voltage mismatches still fault the offending PTX and block onward MV continuation plus secondary output.
- Unresolved items at phase end:
  - PTX primary terminals remained asymmetric at this commit: operators could land an inbound source only on `ptx-bus-in`, not on the right-side `ptx-bus-loop` terminal.
  - PTX primary daisy-chain behavior is currently modeled as an always-continuous internal bus; explicit operator-controlled S1/S2-style MV switch states are not implemented yet.
  - PTX protection remains idealized; no fuse, relay, or sectionalizing-device behavior is attached to the new primary loop corridor.

### Feature Update: PTX Dual-Ended Primary Terminals
- Revision: `273fa4c`
- Date: `2026-04-17`
- Subject: `Add dual-ended PTX primary terminals`
- Major additions:
  - Expanded each PTX top terminal into a strict source/target pair so both primary-side connection points can accept an inbound feeder and continue an MV daisy-chain without enabling loose-mode wiring.
  - Added new companion handle IDs `ptx-bus-in-source` and `ptx-bus-loop-target` while preserving legacy `ptx-bus-in`, `ptx-bus-loop`, and `ptx-bus-out` IDs for saved-graph compatibility.
  - Updated the PTX renderer to expose neutral `A` and `B` primary-terminal labels with vertically separated source and target grab points at each top terminal.
- Engine-state evolution:
  - PTX handle interpretation is now terminal-aware as well as side-aware: both top terminals belong to the primary bus, but only the target half accepts inbound packets and only the source half emits onward MV packets.
  - A matched primary arrival on either top terminal energizes the full internal primary bus plus the stepped secondary output, allowing PTX corridors to be fed from either end while staying in strict React Flow connection mode and preserving legacy primary-target edge behavior.
  - Existing phase-conflict, backfeed, voltage-fault, and breaker-trip semantics remain unchanged; only PTX primary terminal connectivity is broadened.
- Unresolved items at phase end:
  - This commit exposed an unintended PTX shell regression: all four logical primary handles were visually exposed and drifted into the node body instead of collapsing into two clean top-edge operator terminals.
  - PTX primary daisy-chains are still modeled as always-continuous internal buses; explicit operator-controlled S1/S2-style MV switch states are not implemented yet.
  - PTX protection remains idealized; no fuse, relay, or sectionalizing-device behavior is attached to the primary bus corridor.

### Working Tree Update: PTX Two-Terminal Visual Repair
- Revision: `working-tree`
- Date: `2026-04-17`
- Subject: `Repair PTX top-edge terminal visuals`
- Major additions:
  - Reworked the PTX shell so operators now see exactly two visible primary connection points, both flush on the top border of the transformer card instead of four exposed handles inside the node body.
  - Kept the four logical PTX primary handles intact under the hood by pairing each visible top-edge source terminal with a transparent companion target handle at the same location.
  - Removed the visible `A` / `B` terminal chrome and vertical handle stacks so the PTX returns to a clean two-terminal MV presentation without sacrificing strict source/target connectivity.
- Engine-state evolution:
  - None. PTX traversal, voltage-fault handling, backfeed modeling, breaker semantics, and handle-aware primary-bus continuity remain unchanged from `273fa4c`.
- Unresolved items at phase end:
  - PTX primary daisy-chains are still modeled as always-continuous internal buses; explicit operator-controlled S1/S2-style MV switch states are not implemented yet.
  - PTX protection remains idealized; no fuse, relay, or sectionalizing-device behavior is attached to the primary bus corridor.

### Working Tree Update: Grid-Snapped Layout and Draggable Edge Midpoints
- Revision: `working-tree`
- Date: `2026-04-20`
- Subject: `Add grid-snapped node layout and draggable edge midpoints`
- Major additions:
  - Standardized the canvas on a single `24px` snap grid that now drives the React Flow background, newly dropped node placement, and subsequent node dragging.
  - Introduced shared node shell size families so source gear, standard gear, and complex gear now render from one deterministic footprint contract without changing any existing handle IDs or electrical interfaces.
  - Added a shared edge-center drag control for both breaker and standard-wire renderers so operators can reroute edges from the midpoint UI and persist that bend anchor in `edge.pathOptions.centerX` / `centerY`.
  - Extended graph normalization to sanitize optional midpoint coordinates during hydration/import so malformed saved view metadata cannot break edge rendering.
- Engine-state evolution:
  - None to electrical semantics. Traversal, conflict detection, voltage propagation, breaker trip behavior, and ATS gating remain unchanged.
  - Layout-only node moves and midpoint reroutes remain excluded from `createTopologyKey(...)`, so these operator-facing canvas adjustments do not invalidate the memoized power-flow result.
- Unresolved items at phase end:
  - Midpoint routing currently supports one absolute snapped bend anchor per edge; there is no reset-to-auto affordance, multi-bend editing, or obstacle-aware autorouting yet.
  - Automated UI coverage still does not exercise node snap behavior or midpoint-drag workflows.

### Working Tree Update: UPS Node, Directional Power Flow, and Switchboard Bottom Landing
- Revision: `working-tree`
- Date: `2026-04-20`
- Subject: `Add UPS node, directional power flow, and switchboard bottom landing`
- Major additions:
  - Added a new `ups` equipment type with canonical metadata for `operatingMode`, `batteryAvailable`, `syncGroup`, `ratedCurrentAmps`, `kvaRating`, `batteryRuntimeMinutes`, and `upsClass`.
  - Added a complex UPS node shell with top input / bottom output handles, mode controls for `Normal`, `Battery`, and `Bypass`, and operational readouts for battery status and ratings.
  - Expanded switchboard geometry with a bottom-edge target hitbox (`switchboard-bus-bottom-in`) that lands on the same one-bus switchboard as the existing top target, allowing UPS output to reconnect into either edge of downstream switchboards.
  - Extended the shared properties modal and SCADA panel so UPS mode control, battery availability visibility, and switchboard / UPS electrical metadata are editable and visible from first-class UI surfaces.
- Engine-state evolution:
  - Added handle-aware UPS traversal rules so `normal` and `bypass` conduct input-to-output only on matching voltage, while `battery` seeds the UPS output with the UPS node's own source identity and never backfeeds the input side.
  - Extended topology-key invalidation to include UPS mode, battery availability, UPS sync groups, and bottom-vs-top switchboard landing handle changes without invalidating on label-only or layout-only edits.
  - Expanded engine tests to cover UPS directional behavior, battery-mode source IDs and sync-group paralleling, wrong-voltage UPS faulting, and the new switchboard bottom-landing corridor.
- Unresolved items at phase end:
  - UPS behavior remains intentionally first-pass: one line input, one load output, no separate rectifier input, static bypass input, maintenance bypass path, or automatic source-fail sensing.
  - UPS battery availability is modeled manually; there is still no runtime depletion, charger state, or timed transfer / retransfer sequencing.

### Working Tree Update: Operator-Facing Fed From and Canvas Copy/Paste
- Revision: `working-tree`
- Date: `2026-04-20`
- Subject: `Implement operator-facing Fed From and canvas copy/paste`
- Major additions:
  - Replaced node-card `Sources` readouts with a single operator-facing `Fed From` label mapped from the preferred live feeder node at render time.
  - Added app-local keyboard copy/paste for selected nodes plus any edges whose source and target nodes are both inside the selection, while preserving node metadata, edge metadata, and manual edge midpoint routing.
  - Added a pure clipboard helper plus headless tests covering subgraph extraction, id remapping, cursor-anchored paste placement, grid snapping, and repeated-paste nudging.
- Engine-state evolution:
  - Traversal packets now carry preferred-feeder metadata (`fedFromNodeId`, breaker-boundary flag, feeder distance, path hops) alongside the existing electrical source ID, propagated voltage, and breaker-boundary display provenance.
  - `usePowerFlow` now exposes `fedFromNodeIdByNodeId`; the older `displaySourceNodeIdsByNodeId` output remains available only as a parallel provenance/debug map and no longer drives node-card text.
- Unresolved items at phase end:
  - Multi-feed nodes intentionally collapse to one preferred `Fed From` label; there is still no secondary operator cue for the other simultaneous live feeders on the card.
  - Copy/paste is keyboard-only and app-local; there is still no explicit toolbar action or external clipboard exchange format.

### Working Tree Update: Switchboard Fed From Precedence and ExampleTopology Regression
- Revision: `working-tree`
- Date: `2026-04-20`
- Subject: `Correct switchboard Fed From precedence with ExampleTopology regression coverage`
- Major additions:
  - Refined operator-facing `Fed From` selection so handle-aware arrival precedence distinguishes preferred inbound feeds from downstream return corridors on one-bus switchboards.
  - Added fixture-backed regression coverage against `ExampleTopology/NTT-CH3-TOPOLOGY.json` for `CH3-MSB-301D -> CH3-PTX-301D` and `CH3-MSB-301E -> CH3-PTX-301E`.
  - Added a focused engine test proving a switchboard main input beats both bottom-return and source-side return candidates without changing electrical live-state results.
- Engine-state evolution:
  - Traversal packets now carry a `fedFromArrivalRank` alongside the existing operator-facing feeder metadata so packet dedupe and candidate selection stay stable when the same node is reached through multiple handle classes.
  - `Fed From` comparison now ranks candidates by inbound-handle precedence first, then feeder distance, then overall path hops, then lexical node id.
- Unresolved items at phase end:
  - Multi-feed nodes still collapse to one preferred `Fed From` label even when more than one inbound source is healthy.
  - Switchboard bottom-return landings remain electrically valid on the one-bus model, but the UI still offers no secondary cue distinguishing them from the main top feed on the card.

### Working Tree Update: Manual Edge Centers Follow Rigid Group Moves
- Revision: `working-tree`
- Date: `2026-04-20`
- Subject: `Keep manual edge centers attached during rigid group node moves`
- Major additions:
  - Replaced the direct React Flow `onNodesChange` pass-through with a custom App-level node-change handler that inspects position changes before applying them.
  - Added shared edge-path helpers so rigid group node moves and clipboard paste both translate manual `edge.pathOptions.centerX/centerY` through the same normalization and grid-snapping rules.
  - Added headless helper coverage for rigid subgraph translation, single-endpoint no-op behavior, mismatched-delta no-op behavior, and grid-snapped midpoint translation.
- Engine-state evolution:
  - None. Electrical traversal, voltage propagation, and `Fed From` selection are unchanged.
  - Canvas routing metadata now stays visually attached to a moved subgraph whenever both endpoints of a manually routed edge move by the same delta.
- Unresolved items at phase end:
  - Manual midpoint anchors still remain fixed during non-rigid reshapes such as moving only one endpoint, by design.
  - Automated UI coverage still does not exercise the actual shift-box selection drag path inside React Flow.

### Maintenance Update: Dependency Inventory
- Revision: `c5c1a2b5d41f3648ce5c0c2c387b7a5b92815bd0`
- Date: `2026-04-14`
- Subject: `Add DEPENDENCIES.md dependency inventory`
- Major additions:
  - Added `DEPENDENCIES.md` as a repo-level inventory of the declared runtime and development packages from `package.json`.
  - Documented `npm install` and clarified that `package-lock.json` remains the exact-resolution lockfile for reproducible installs.
- Engine-state evolution:
  - No graph traversal, React Flow, protection, or synchronization logic changed.
- Unresolved items at phase end:
  - Dependency inventory is documentation only; `package.json` and `package-lock.json` remain the canonical install sources.

### Maintenance Update: Dependency Self-Validation
- Revision: `bb16e038263c94da64e6ed1f8d4ceb44e2358ae1`
- Date: `2026-04-14`
- Subject: `Add dependency self-validation tooling and setup guidance`
- Major additions:
  - Added a repo-local `npm run check:deps` command backed by `scripts/check-deps.mjs`.
  - Enforced a documented Node policy of `^20.19.0 || >=22.12.0` in `package.json`.
  - Added README setup instructions for Node verification, `npm ci`, dependency validation, and Windows PATH troubleshooting.
  - Updated `DEPENDENCIES.md` to prefer `npm ci` and documented that the inventory is now checked against the manifests.
- Engine-state evolution:
  - No graph traversal, protection, synchronization, or React Flow behavior changed.
- Unresolved items at phase end:
  - Initial Windows execution path used a direct `spawnSync("npm.cmd", ...)` call, which was later repaired in a follow-up maintenance pass.

### Maintenance Update: Windows Dependency Checker Repair
- Revision: `cafe8dbffcbd0d7ec1414aab84b5395a34c7d35c`
- Date: `2026-04-14`
- Subject: `Repair Windows npm launch path for dependency self-check`
- Major additions:
  - Reworked `scripts/check-deps.mjs` so it no longer depends on nested npm subprocess launches during validation.
  - Added direct inspection of `node_modules` and `package-lock.json` to verify declared top-level packages are installed at the locked versions and to detect top-level entries not tracked by the lockfile.
  - Re-verified the dependency checker from both `node scripts/check-deps.mjs` and `npm run check:deps` on this Windows workspace.
- Engine-state evolution:
  - No graph traversal, protection, synchronization, or React Flow behavior changed.
- Unresolved items at phase end:
  - None specific to dependency-check command execution on Windows in the current workspace.

### Maintenance Update: README Public Repo Refresh
- Revision: `working-tree`
- Date: `2026-04-17`
- Subject: `Rewrite README for accurate public repo presentation`
- Major additions:
  - Reworked `README.md` into a public-facing project overview with explicit current capabilities, setup commands, usage steps, supporting-doc links, and current limitations.
  - Removed repo-local path assumptions from the setup instructions and aligned the public command list with the actual `package.json` scripts.
  - Documented the current `npm run check:deps` clean-workspace caveat so the README does not overstate current dependency-check behavior.
- Engine-state evolution:
  - No graph traversal, protection, synchronization, or React Flow behavior changed.
- Unresolved items at phase end:
  - `npm run check:deps` still treats Vite temp directories such as `.vite` and `.vite-temp` as extraneous top-level packages after normal tool activity.

## Cumulative System State (Latest)

### Completed Architectural Changes
- Platform and deployment:
  - Vite + React 18 + Tailwind + `@xyflow/react` with `vite-plugin-singlefile` monolithic output strategy.
- Documentation and repo metadata:
  - Added `DEPENDENCIES.md` as a quick dependency inventory derived from the existing npm manifest and lockfile.
  - Added Windows-first setup guidance to `README.md` plus a repo-local dependency validation command.
  - Reworked `README.md` into an accurate public repo landing page with a docs map, current-status framing, command guidance, and an explicit limitations section.
- Dynamic canvas and equipment workflow:
  - Blank-canvas sandbox with drag-drop equipment palette, user-created edges, and deletion support.
  - Node placement and dragging now snap to a shared `24px` canvas grid, while legacy off-grid saved layouts remain untouched until an operator moves them.
  - Breaker and standard-wire edges now support manual midpoint rerouting through the existing center UI cluster, with view-only bend coordinates persisted separately from electrical edge state.
- Canonical electrical metadata and editor workflow:
  - Every node now persists canonical numeric voltage metadata through create, hydrate, export/import, autosave, and MOP snapshots.
  - A node-local properties gear opens a shared industrial modal for editing `label`, `nominalVoltage`, or PTX `primaryVoltage` / `secondaryVoltage`.
  - Switchboards now preserve `boardClass` and optional `ratedCurrentAmps`, while UPS nodes preserve `operatingMode`, `batteryAvailable`, `syncGroup`, optional ratings, and runtime metadata through the same shared modal.
- Source-aware dynamic power engine:
  - Topology extracted from live React Flow `nodes`/`edges`.
  - Only closed breakers (`edge.data.breakerState === "closed"`) are conductive and bi-directional.
  - Open and tripped breakers are non-conductive.
  - Root sources are `utility` and `generator` where `data.isSourceOnline !== false`, and they now seed traversal packets with their configured `nominalVoltage`.
- Normalized state model:
  - Node states: `Dead`, `Live`, `Backfeed`, `Phase Conflict`, `Voltage Fault`.
  - Edge states: `de-energized`, `energized`, `phase-conflict`.
- Rendering architecture:
  - Simulation output is derived into render nodes/edges without mutating canonical graph state.
- Persistence and topology portability:
  - Local autosave/hydration plus JSON export/import for `{ nodes, edges, mopSteps, mopBaseSnapshot }`.
- Big Bus interaction standard:
  - Multi-connection ergonomics standardized to continuous bus handles; permissive wiring is intentional.
- Protective isolation:
  - Engine emits `faultedEdgeIds` for closed breakers adjacent to `Phase Conflict` nodes.
  - App auto-trips those edges to `breakerState: "tripped"` and forces a recalculation cascade.
  - Breaker interaction enforces mechanical reset (`tripped -> open -> closed`).
- Equipment identity and synchronization:
  - Every node now carries a canonical `data.label`.
  - `utility` and `generator` nodes also carry raw `data.syncGroup` strings that persist through localStorage and JSON import/export.
  - All node labels are renameable in-place via double-click without mutating topology geometry.
- Centralized SCADA control:
  - A docked SCADA panel lists all root sources with label, sync group, active power state, and source online/offline status.
  - Source online/offline control can now be actuated remotely from the control-room panel using the same canonical node mutation path as on-canvas controls.
  - A global `Reset All Breakers` control resets every `tripped` breaker edge back to `open` without changing engine math.
- Scenario recording and playback:
  - The SCADA panel can now capture a fresh MOP recording session from a canonical base snapshot and append sequential keyframe steps after each recorded action settles.
  - Each MOP step persists the operator intent (`TOGGLE_SOURCE` or `TOGGLE_BREAKER`), the target state, operator-friendly action text, and a deep-cloned post-settle graph snapshot.
  - Playback controls overwrite canonical `nodes` and `edges` from the base snapshot or recorded step snapshots so the existing engine can recompute flow, backfeed, and any auto-trip side effects deterministically.
- Intelligent transfer switching:
  - `transferSwitch` nodes now expose two named inputs (`target-primary`, `target-emergency`) and one output bus with canonical `data.activeSource` control.
  - Legacy ATS inbound edges are normalized onto `target-primary` during graph hydration/import so older saved yards continue to conduct through the default primary path.
  - ATS throws are now MOP-recordable actions and replay purely through canonical snapshot application rather than any special transfer-sequence engine.
- UPS critical-power modeling:
  - Added a new `ups` node type with canonical `data.operatingMode`, `data.batteryAvailable`, `data.syncGroup`, `data.upsClass`, `data.ratedCurrentAmps`, `data.kvaRating`, and `data.batteryRuntimeMinutes`.
  - Switchboards remain one-bus gear, but now expose an additional bottom target landing (`switchboard-bus-bottom-in`) so UPS outputs can reconnect into downstream switchboards from either the top or bottom edge without creating a second bus section.
  - UPS operating-mode throws are now MOP-recordable actions and SCADA-controllable actions alongside source toggles and ATS throws.
- Voltage-aware electrical modeling:
  - All non-PTX gear now compares incoming propagated voltage against `nominalVoltage` and resolves any mismatch as `Voltage Fault`.
  - PTXs now expose explicit dual-ended primary-bus handle roles (`ptx-bus-in`, `ptx-bus-in-source`, `ptx-bus-loop-target`, `ptx-bus-loop`) plus the existing `ptx-bus-out` secondary handle so MV daisy-chains can be modeled directly on either transformer input terminal.
  - PTX shells now collapse those four logical primary handles into two visible top-edge operator terminals, keeping the MV presentation clean while strict React Flow source/target wiring remains fully supported underneath.
  - PTXs now transform matched primary packets to `secondaryVoltage` and matched secondary packets to `primaryVoltage`, while a live primary bus can continue the same MV voltage onward through chained PTX corridors.
  - Visual precedence is now locked to `Voltage Fault > Phase Conflict > Backfeed > Live > Dead`; latent phase-conflict flags remain available in engine output even when the node renders purple.
- Tooling guardrails:
  - `package.json` now declares a Node engine policy of `^20.19.0 || >=22.12.0`.
  - `scripts/check-deps.mjs` validates Node version, manifest/lockfile parity, `DEPENDENCIES.md` parity, `node_modules` presence, and top-level npm install health.
  - Dependency validation no longer relies on nested npm process launches, allowing `npm run check:deps` to work in this repo environment.
- Latest working-tree summary:
  - Expanded the shared properties modal from a switchboard / UPS-focused editor into a broader node editor covering source online state, sync groups, transfer active source, and descriptive/rating metadata across the current node lineup.
  - Canonical node normalization now preserves `ratedCurrentAmps` on MVSG, load, transfer-switch, and mechanical gear, while descriptive class fields fall back cleanly when operators clear them.
  - Replaced node-card `Sources` text with a single `Fed From` label driven by preferred live-feeder provenance and live label remapping, while leaving electrical source aggregation untouched.
  - Refined `Fed From` precedence so switchboard main-input arrivals outrank bottom-return and source-side return corridors, with the CH3 ExampleTopology fixture locked in as a regression guard.
  - Added app-local keyboard copy/paste for selected subgraphs, including internal-edge filtering, cursor-anchored paste placement, grid-snapped geometry, and preserved edge midpoint routing.
  - Manual breaker and wire midpoint anchors now translate with rigid multi-node drags when both edge endpoints move together, preventing shift-box selection moves from leaving custom edge centers behind.
  - Replaced the old dual-rail `EquipmentPalette + ScadaPanel` stack with one `LeftRail` command dock that keeps a compact live status shelf visible at all times and moves the operator workflows behind `Build`, `Operate`, and `Diagnostics` tabs.
  - Repacked the build workflow into a denser two-column equipment grid and moved SCADA fault, validation, source, UPS, breaker-reset, and MOP surfaces into one tabbed scroll region so a 1080p desktop no longer requires browser zoom just to expose every panel.

### Current Dynamic Graph Engine Behavior
- Traversal:
  - Queue-based packet propagation over dynamically built adjacency from the current canvas graph.
  - Each packet now carries `{ sourceId, voltage, displaySourceNodeId, fedFromNodeId, hasBreakerBoundary, fedFromArrivalRank, fedFromDistance, pathHopCount }`, so electrical state, breaker-boundary provenance, and preferred operator-facing feeder attribution can be evaluated in one memoized traversal pass.
  - Conductive edges are added to adjacency only after edge-type and ATS-handle evaluation: `breaker` edges must be `closed`, while `standard` wires conduct unless an ATS interlock blocks that branch.
  - Display-source attribution remains independent from electrical source attribution: crossing a closed breaker resets the packet display boundary to the current node, while standard wires and internal PTX / ATS / UPS conduction preserve the last breaker boundary.
  - `Fed From` attribution is a second parallel operator-facing layer: breakers set the feeder to the breaker-side node, wires before any breaker boundary reset to the nearest upstream node, wires after a breaker boundary preserve that feeder, and PTX / ATS / UPS internal conduction preserve the current feeder candidate.
  - `Fed From` selection is now handle-aware: preferred top/input arrivals beat lower-priority bottom-return arrivals, which in turn beat source-side/output return paths when the same node sees multiple live corridors.
  - Each node resolves one preferred `fedFromNodeId` by arrival-rank precedence first, shortest feeder distance second, shortest overall energized path third, and lexical node-id tie-break fourth.
- Voltage handling:
  - Root sources inject their own `nominalVoltage` into the traversal when online.
  - Non-transformer nodes conduct packets unchanged and mark `Voltage Fault` whenever any incoming packet voltage differs from their `nominalVoltage`.
  - Battery-mode UPS nodes now inject their own `nominalVoltage` on the output side only, using the UPS node `id` as the propagated source identity so sync-group checks can evaluate UPS-to-UPS paralleling without synthetic source records.
  - PTX side detection is now explicit-handle-aware: `ptx-bus-in` and `ptx-bus-loop-target` are primary targets, `ptx-bus-in-source` and `ptx-bus-loop` are primary MV sources, and `ptx-bus-out` is the stepped secondary source.
  - PTXs evaluate packets by arrival side: matched primary arrivals on either top terminal energize the full internal primary bus, matched secondary arrivals step back up to `primaryVoltage`, and either matched path can propagate MV packets across chained PTX primary corridors while keeping legacy primary-target edges electrically tied to that bus.
  - A PTX voltage mismatch blocks conduction through that direction only, leaving the far side dark while the PTX itself renders as `Voltage Fault`.
  - UPSs now evaluate packets by handle role: `normal` and `bypass` conduct only from `ups-line-in` to `ups-load-out` on matching voltage, while `battery` keeps all conduction on the output side and blocks any output-to-input backfeed path.
- Conflict and backfeed:
  - Multi-source overlap resolves to `Phase Conflict` only when the contributing source IDs do not all map to one shared, non-empty normalized sync group.
  - Blank sync groups are treated as unsynchronized/unknown and never safely parallel.
  - Root fed by synchronized foreign sources without its own source ID resolves to `Backfeed`.
- Fault precedence and protection:
  - Node render state is derived from flags with strict precedence: `Voltage Fault > Phase Conflict > Backfeed > Live > Dead`.
  - Protective tripping now runs as a second engine pass after power flow, so topology/voltage/source propagation remain decoupled from selective fault clearing.
- Protection feedback:
  - The protection resolver now emits `faultSummaries`, `protectionTripEdgeIds`, and backward-compatible `faultedEdgeIds`.
  - Bolted node faults, bolted edge faults, and `Phase Conflict` components all feed the same ideal-selective trip-selection pass.
  - Phase-conflict clearing now prefers the smallest protective cut set, with a bias toward internal tie devices before root-source mains when either would clear the overlap.
  - Bolted faults still use explicit line/load orientation on protective edges so backfeed-side faults pick the correct upstream clearing device.
- SCADA interaction:
  - The control-room panel reads canonical `nodes` and `edges` only.
  - Remote source actuation and breaker reset are App-level state mutations layered on top of the existing engine output.
  - The MOP recorder also remains App/UI-only: it records operator actions, stores canonical snapshots, and replays them by overwriting `nodes`/`edges` without duplicating any engine calculations.
  - SCADA now includes a UPS lineup with live operating-mode buttons, battery-availability visibility, and node power-state telemetry without duplicating any UPS physics inside the panel.
  - Left-side operator surfaces now live inside one `LeftRail` dock with persistent summary telemetry plus tab-local content regions for build controls, live operations, and diagnostics; the layout changed, but the callback contracts and engine data flow did not.
- Canvas ergonomics:
  - Node and edge deletion now flows through native React Flow `deleteElements()` so topology pruning invalidates the graph naturally without manual dangling-edge cleanup logic.
  - New user-drawn connections always carry an explicit custom edge type (`breaker` or `standard`); React Flow fallback edges are no longer part of the supported topology contract.
  - New node drops, subsequent node drags, and manual edge midpoint reroutes all snap to the shared `24px` grid; legacy saved layouts are preserved until the operator touches them.
  - Manual edge midpoint anchors now follow rigid subgraph moves when both endpoints of that edge move by the same delta, while single-endpoint reshapes intentionally leave the midpoint fixed.
  - Breaker status pills and standard-wire midpoint grab rails now double as drag handles for rerouting without interfering with breaker toggles or delete controls.
- Recompute and memoization:
- Topology key includes node identity/type plus root-source online signatures, normalized root sync-group signatures, and transfer-switch `activeSource`.
- Topology key also includes UPS `operatingMode`, UPS `batteryAvailable`, and UPS `syncGroup`, plus any source/target handle differences such as switchboard top-vs-bottom landings.
- Topology key includes edge type, source/target, source-handle/target-handle IDs, and breaker state (`open`, `closed`, `tripped`) where applicable.
- Position-only drags, manual midpoint reroutes, and label-only renames do not invalidate traversal cache; `Fed From` labels are remapped at render time from live node labels instead.

### Locked Behavioral Contracts for Implementers
- Topology source of truth is always live React Flow `nodes`/`edges`; no hardcoded adjacency is permitted.
- Edge conductivity is controlled by normalized edge type plus edge data: `breaker` edges use `edge.data.breakerState`, while `standard` edges are always conductive unless blocked by ATS logic.
- Valid breaker states are `open`, `closed`, and `tripped`; only `closed` is conductive.
- Big Bus handle geometry is intentionally permissive and does not enforce electrical correctness.
- Persistence contract is now `{ schemaVersion, nodes, edges, mopSteps, mopBaseSnapshot }`, where `schemaVersion: 1` is canonical for new exports and legacy unversioned payloads remain importable only through the explicit persistence validator/migration path.
- Manual edge routing metadata is view-only and must stay isolated under `edge.pathOptions.centerX` / `centerY`; it must never alter conductivity, topology extraction, or breaker semantics.
- `usePowerFlow` now returns `displaySourceNodeIdsByNodeId`, `fedFromNodeIdByNodeId`, `sourceIdsByEdgeId`, `faultSummaries`, `protectionTripEdgeIds`, and backward-compatible `faultedEdgeIds` in addition to node/edge power maps.
- Canonical voltage metadata must remain numeric in volts: standard gear uses `nominalVoltage`, while PTXs use `primaryVoltage` and `secondaryVoltage`.
- Voltage-aware traversal packets must preserve `sourceId`, propagated voltage, breaker-boundary display provenance, and preferred `Fed From` metadata all the way through memoized evaluation.
- Sync-group comparisons are normalized with `trim().toUpperCase()` inside the engine only; raw UI text is preserved in canonical node state.
- Healthy paralleling requires a shared non-empty normalized sync group across all contributing root sources.
- Canvas `Fed From:` readouts must use `fedFromNodeIdByNodeId` mapped through current node labels; `displaySourceNodeIdsByNodeId` is now provenance/debug output only and must not drive the operator-facing card label.
- `Fed From` precedence must remain handle-aware: supply-side inbound landings outrank switchboard bottom-return corridors, and any source-side/output-side return remains fallback-only when a healthier inbound feeder is present.
- PTX handle semantics are deterministic: `ptx-bus-in` and `ptx-bus-loop-target` are primary targets, `ptx-bus-in-source` and `ptx-bus-loop` are primary MV sources, and `ptx-bus-out` remains the stepped secondary source.
- PTX rendering must expose only two visible top-edge operator terminals even though four logical primary handles exist internally for strict source/target connectivity.
- PTX conduction is side-aware and idealized: matched primary or secondary arrivals energize the internal primary bus, any primary-side edge tied to that bus can then conduct for compatibility, matched primary paths still transform to `secondaryVoltage`, matched secondary paths still step back up to `primaryVoltage`, and mismatched arrivals block that direction.
- Visual state precedence is locked to `Voltage Fault > Phase Conflict > Backfeed > Live > Dead`, but phase-conflict flags must remain available for breaker trip logic and future diagnostics.
- `transferSwitch` nodes now require canonical `data.activeSource` of `"primary"` or `"emergency"`.
- ATS inactive feeder edges must behave exactly like open branches: non-conductive, `de-energized`, and excluded from conflict/trip evaluation.
- `ups` nodes now require canonical `data.operatingMode` of `"normal"`, `"battery"`, or `"bypass"` and canonical `data.batteryAvailable` boolean state.
- UPS handle semantics are deterministic: `ups-line-in` is the only inbound line-side handle and `ups-load-out` is the only outbound load-side handle.
- Switchboards remain electrically one-bus gear even though they now expose two inbound landings (`switchboard-bus-in` and `switchboard-bus-bottom-in`) plus one outbound landing (`switchboard-bus-out`).
- UPS conduction is intentionally directional: `normal` and `bypass` pass matching voltage from input to output only, `battery` seeds and conducts on the output side only, and no UPS mode permits output-to-input backfeed.
- SCADA panel must remain a pure UI controller and must not implement or duplicate physics calculations.
- MOP playback must remain a canonical state-overwrite layer on top of React Flow state; it must not simulate clicks or fork the power engine.
- MOP actions now include ATS throws, UPS mode throws, plus explicit node/edge delete keyframes in addition to source toggles and breaker toggles.
- Canvas copy/paste must duplicate only selected nodes plus edges whose endpoints both remain inside the copied node set; pasted ids must regenerate, labels stay verbatim, and pasted geometry must snap back to the shared `24px` grid.

## Known Bugs and Unhandled Edge Cases (Cumulative)
- Sync groups still model source identity only; there is no phase-angle, frequency, or breaker permissive-window simulation beyond the new node/PTX voltage matching rules.
- Protective isolation is now ideal-selective rather than coarse node-adjacent tripping, but it still does not perform true fault-current or time-current-curve coordination.
- Voltage faults are visualized and preserved in engine flags, but they still do not trigger automatic protective isolation in this first selective-protection pass.
- No relay timing/coordination hierarchy exists (instantaneous trip, no selective delay curves, no lockout sequencing).
- Big Bus geometry intentionally allows operator-error topologies; no interlock/sequencing logic is enforced.
- Terminal sinks (`load`, `mechanical`) rely on handle geometry; deeper directionality/protection validation is not implemented.
- Advanced electrical semantics remain unmodeled (for example transformer vector groups, impedance, tap settings, and detailed transfer/protection schemes).
- Persistence is local-browser scoped only; no remote sync, revision history, or multi-user merge workflow exists.
- `Clear Yard` remains destructive with no confirmation/undo stack.
- Source controls are now available both node-local and via SCADA, and Phase 12 adds linear scenario playback, but there is still no scripted SOO automation, batch editing, timeline branching, or timed autoplay layer.
- ATS nodes now prevent primary/emergency source paralleling internally, but they do not yet implement automatic transfer, source-fail sensing, permissive timers, or neutral-position logic.
- UPS nodes now model directional line-vs-load isolation, but they do not yet implement separate rectifier / bypass inputs, maintenance bypass paths, automatic source-fail sensing, battery depletion, or charger-state behavior.
- PTX primary daisy-chains are currently modeled as always-continuous internal buses; explicit S1/S2-style MV switch states or isolation points are not yet operator-editable.
- PTX current metadata remains intentionally undefined; the repo does not yet model whether transformer current ratings belong on the primary, secondary, or both sides.
- Fresh Windows environments still require manual Node installation before `npm ci`, `npm run check:deps`, `npm test`, or `npm run build` can execute.
- `npm run check:deps` currently assumes a clean `node_modules`; Vite temp directories such as `.vite` and `.vite-temp` can trigger false-positive extraneous-package failures after normal dev/build/test activity.
- Visual delete controls, grid-snapped layout ergonomics, rigid group midpoint translation, edge midpoint dragging, and connection draw-mode workflows are now present, but there is still no automated UI coverage for these operator paths.
- The new command rail is intentionally tuned for desktop `1920x1080` and larger; there is still no dedicated small-screen or tablet collapse behavior below that target footprint.
- Multi-feed nodes now intentionally collapse to one preferred `Fed From` label, but there is still no secondary card-level cue for the other simultaneous live feeders.
- Copy/paste is app-local and keyboard-driven only; there is still no toolbar affordance, no external clipboard serialization contract, and no undo stack beyond browser refresh/local persistence.

## Engine and Clipboard Test Coverage Snapshot

### Existing Engine Test Coverage (`src/engine/powerFlow.test.js`)
- Continuity and topology-key behavior for open/closed breaker paths.
- Standard-wire continuity, mixed breaker/wire corridors, and edge-type topology-key invalidation.
- Breaker-boundary display-source attribution, including breaker-then-wire inheritance, downstream-breaker boundary reset, direct-wire empty display provenance, PTX secondary downstream attribution, and multi-feed display-source aggregation.
- Operator-facing `Fed From` attribution, including breaker-fed inheritance, wire-only nearest-upstream selection, PTX / ATS / UPS pass-through preservation, handle-aware switchboard precedence, ExampleTopology-backed CH3 regression coverage, preferred-feeder collapse on multi-feed corridors, lexical tie resolution, and backfed-source provenance.
- Source aggregation with explicit assertions for `Backfeed` and `Phase Conflict`.
- Sync-group-aware conflict resolution for same-group parallel, blank/mixed-group conflict, and normalization behavior.
- Edge power-state mapping (`de-energized`, `energized`, `phase-conflict`).
- Trip-aware breaker behavior (`tripped` treated as non-conductive/de-energized).
- Fault-hitlist emission (`faultedEdgeIds`) for conflict corridors and non-conflict empty-set checks.
- Voltage-fault detection for direct MV-to-LV feeds, PTX step-down success paths, PTX primary mismatch firewall behavior, dual-ended PTX primary daisy-chain continuation, opposite-end feeder isolation/conflict behavior, and reverse PTX backfeed across chained primary buses.
- Clipboard helper coverage (`src/canvas/clipboard.test.js`) now includes selected-subgraph extraction, eligible-edge filtering, id remapping, path-option translation, cursor-anchor placement, grid snapping, and repeated-paste nudging.
- Generator root propagation, generator-offline behavior, utility+generator tie conflict, and generator topology-key invalidation.
- Root sync-group topology-key invalidation and label-only cache stability.
- ATS interlock behavior on both breaker and standard-wire feeders plus end-to-end chain propagation through `generator -> switchboard -> transferSwitch -> mechanical`.
- UPS directional behavior, battery-mode source identities and sync-group paralleling, wrong-voltage UPS faulting, top-vs-bottom switchboard bus landing, and UPS topology-key invalidation.
- Graph normalization coverage for numeric voltage metadata and recognizable legacy voltage-string imports.
- Topology-key cache stability for layout-only node-position changes, label-only renames, and manual edge midpoint routing metadata.

### Current Validation Gaps
- No engine model/tests for synchronization permissives beyond shared sync-group identity (phase-angle drift, frequency slip, or voltage windows).
- No selective relay coordination model (zone-selective interlocking, staged tripping, breaker priorities).
- No lockout/reclose lifecycle model beyond manual reset via edge click cycle.
- No formal large-graph stress/performance test suite for traversal cost ceilings.
- Persistence validation and metadata round-trip coverage now exist for schema-v1 payloads, legacy voltage/ratio/ATS migrations, malformed node and edge payloads, handle validation, and invalid MOP snapshots.
- No dedicated UI tests yet cover SCADA rendering, MOP record/playback interaction, ATS selector behavior, remote actuation, edge-properties/delete-button workflows, snap-to-grid layout behavior, midpoint edge rerouting, or the breaker vs solid-wire connection tool.
- No dedicated UI tests yet cover UPS mode buttons, switchboard bottom-edge connection hitboxes, or battery-availability editing flows.
- Automated simulation test execution beyond dependency validation still depends on the current workspace toolchain remaining installed and healthy.

## Working Tree Update: Hybrid Selective Protection and Edge Properties (`2026-04-22`)
- Major additions:
  - Added canonical edge protection metadata normalization in `src/edges/edgeData.js` so breakers and wires now persist `lineSide`, `faultType`, `protectionMode`, current/rating placeholders, and future TCC identifiers consistently across create/import/export flows.
  - Added `src/engine/protection.js` as a second-pass ideal selective protection resolver layered on top of `evaluatePowerFlow`.
  - Added explicit bolted-fault injection on nodes and edges plus edge-properties editing, SCADA protection visibility, and protection-tagged breaker trips in the React Flow UI.
  - Repaired the broken example-topology regression import and added new unit coverage for selective branch isolation, main-bus isolation, main-tie-main clearing, backfeed orientation, re-trip behavior, and edge metadata persistence.
- Current engine state:
  - `evaluatePowerFlow` remains the pure topology/voltage/source propagation engine and now also exposes `sourceIdsByEdgeId` for downstream protection diagnostics.
  - `evaluateProtectionState` consumes live nodes/edges plus power-flow output and selects the minimum protective trip set for bolted faults and phase-conflict components.
  - `App.jsx` consumes `protectionTripEdgeIds` to convert only the selected closed breakers to `tripped`, tagging those trips with `tripReason: "protection"` while preserving the existing operator `open` state and reset flow.
  - SCADA now exposes persistent fault summaries (`active`, `isolated`, `unprotected`) and the currently selected clearing devices instead of only counting tripped breakers.
- Known gaps after this working-tree update:
  - The protection pass is still idealized: no fault-current magnitude, transformer/conductor impedance solving, or TCC timing math is performed yet.
  - `Phase Conflict` component isolation uses a minimum-edge heuristic with root-source penalties rather than a full protection-study-grade coordination engine.
  - Voltage faults remain diagnostic-only and can persist after a selective phase-conflict trip if no bolted-fault event is also present.

## Working Tree Update: Edge Properties Gear Access (`2026-04-22`)
- Major additions:
  - Repaired `src/components/EdgePropertiesButton.jsx` so the edge-properties gear now opts back into pointer events inside the `EdgeCenterControl` overlay.
  - Matched the working delete-button interaction contract by adding `pointer-events-auto`, `nopan`, and pointer-down `preventDefault()` so the gear opens the modal without starting a pan, midpoint drag, or breaker toggle.
- Current engine state:
  - The power-flow and selective-protection engines are unchanged; this is a React Flow overlay interaction repair only.
  - `App.jsx` still uses `activePropertiesEdgeId` plus `openEdgeProperties(edge.id)` / `applyEdgeProperties(...)` as the single modal open/save path for breaker and wire metadata edits.
- Known gaps after this working-tree update:
  - Edge overlay controls still rely on manual UI verification because the repo does not yet carry automated coverage for edge-properties interactions.

## Working Tree Update: Documentation Backlog Audit (`2026-05-01`)
- Major additions:
  - Reviewed `AGENTS.md`, `README.md`, `OUTSTANDING.md`, `handoff.md`, and `DEPENDENCIES.md` against the current source tree to identify the highest-leverage unresolved gap.
  - Confirmed that app-level import safety is still shallow in `src/App.jsx`: persisted and imported payloads are accepted when they only satisfy top-level `{ nodes, edges }` array shape checks, after which `normalizeGraphState(...)` silently backfills canonical node and edge data.
  - Confirmed that engine coverage is deep in `src/engine/powerFlow.test.js` and `src/engine/protection.test.js`, while direct coverage for malformed node payloads, bad handle assignments, and metadata persistence across create/hydrate/export/import remains thin.
- Current engine state:
  - `evaluatePowerFlow(...)` and `evaluateProtectionState(...)` remain unchanged; this review did not alter traversal, voltage propagation, or selective trip behavior.
  - Canonical metadata normalization already has a strong architectural home in `src/nodes/nodeData.js` and `src/edges/edgeData.js`, which makes validation hardening the cleanest next increment without coupling new physics into the React Flow layer.
- Recommended next step:
  - Implement deep, version-aware graph import validation ahead of `normalizePersistedAppState(...)`, then add tests that prove canonical electrical metadata survives create, hydrate, export, and import flows without silently accepting malformed payloads.
- Known gaps after this working-tree update:
  - Invalid node payloads, malformed electrical metadata, and unsupported handle assignments are still not surfaced as first-class operator diagnostics.
  - Node-side metadata normalization coverage is still much lighter than engine traversal/protection coverage, especially for imported and hydrated graphs.

## Working Tree Update: Schema-v1 Persistence Validation (`2026-05-01`)
- Major additions:
  - Added `src/persistence/topologyPersistence.js` as the pure persistence boundary for schema versioning, deep payload validation, import normalization, and issue-summary formatting.
  - Upgraded autosave and file export payloads to include canonical `schemaVersion: 1` while keeping legacy unversioned imports compatible with the existing voltage-string, transformer-ratio, and legacy ATS-handle migrations.
  - Reworked `src/App.jsx` to route localStorage hydration and file import through the shared validator, reject bad payloads without mutating the active yard, and surface aggregated validation summaries to operators plus full issue lists in the console.
  - Added `src/persistence/topologyPersistence.test.js` coverage for valid schema-v1 payloads, valid legacy imports, malformed topology structure, bad metadata, invalid PTX/ATS/UPS handles, invalid MOP snapshots, and metadata round-trip preservation across create/hydrate/export/import flows.
- Current engine state:
  - `evaluatePowerFlow(...)` and `evaluateProtectionState(...)` remain unchanged; this update does not alter traversal, voltage propagation, protection heuristics, or React Flow rendering semantics for valid graphs.
  - Persistence acceptance is now fail-closed at the boundary: accepted payloads are validated first and normalized second, while invalid payloads never reach `normalizeGraphState(...)` or mutate live canvas state.
  - Schema-v1 exports are now the canonical portable artifact shape, but the runtime still intentionally accepts legacy unversioned payloads through the explicit migration/validation path.
- Known gaps after this working-tree update:
  - Import diagnostics remain lightweight and modal-free: operators get an aggregated alert plus console detail, but there is still no inline issue browser or per-element recovery workflow.
  - Validation is intentionally strict only for PTX, ATS, and UPS handle identities; broader wiring-permissive checks for generic bus gear remain future work.

## Working Tree Update: Live Validation Diagnostics and Persistence Guardrails (`2026-05-01`)
- Major additions:
  - Extended `src/persistence/topologyPersistence.js` from a persisted-payload validator into a shared diagnostics boundary with structured issues (`code`, `severity`, `source`, `path`, `nodeIds`, `edgeIds`), a new `validateLiveAppState(...)` entrypoint, and reusable validation-report formatting helpers.
  - Reworked `src/App.jsx` so live canonical app state is memo-validated, invalid yards no longer autosave or export, invalid file/storage payloads populate a reusable rejected-report object, and clicking validation issues can now select and viewport-focus the affected gear on the active canvas.
  - Expanded `src/components/ScadaPanel.jsx` with a docked `Validation` section that shows current-yard blocking issues separately from the latest rejected import/storage payload, including persistence status, source badges, and click-to-focus behavior when the referenced gear exists on the active yard.
  - Added persistence tests for structured issue metadata, live-vs-persisted validation parity, blocking live persistence behavior, and structured invalid-JSON reports.
- Current engine state:
  - `evaluatePowerFlow(...)` and `evaluateProtectionState(...)` remain unchanged; this update is still UI/persistence guardrail work only.
  - Live topology validation now runs against canonical `{ nodes, edges, mopSteps, mopBaseSnapshot }` state before any persistence path, so the React Flow yard can remain editable while localStorage writes and file export fail closed on hard contract errors.
  - Import/load rejection is now dual-surface: operators still get an aggregated alert for immediate feedback, but the canonical diagnostics state also persists the latest rejected report into the SCADA rail for follow-up inspection.
- Known gaps after this working-tree update:
  - The first live diagnostics pass is intentionally hard-error-only; there is still no advisory warning tier for permissive-but-suspicious generic bus wiring or other non-blocking modeling guidance.
  - Rejected import/storage reports only retain the latest failure and only focus the canvas when the referenced node or edge ids exist on the active yard.

## Working Tree Update: Single-Rail Command Dock (`2026-05-01`)
- Major additions:
  - Added `src/components/LeftRail.jsx` as the new left-docked operator boundary and removed the old side-by-side `EquipmentPalette` / `ScadaPanel` mount from `src/App.jsx`.
  - Consolidated the palette, SCADA, protection, and validation surfaces into one `21rem`-class command rail with a persistent summary shelf plus `Build`, `Operate`, and `Diagnostics` tabs.
  - Repacked equipment drops into a denser two-column draggable grid, moved topology I/O and connection draw-mode controls into the build tab, and converted source telemetry from a narrow table into compact cards that fit the reduced rail width.
  - Collapsed the old nested SCADA scroll islands into one tab-local scroll region so MOP playback, breaker reset, UPS mode throws, fault summaries, and validation focus cards remain reachable on a 1080p desktop without browser zoom.
- Current engine state:
  - `evaluatePowerFlow(...)`, `evaluateProtectionState(...)`, persistence validation, MOP snapshotting, and every existing App-level callback contract remain unchanged.
  - The refactor is layout-only: React Flow still receives the same canonical node and edge state, and the left rail remains a pure UI controller over existing node, edge, and diagnostics mutations.
  - Engine and persistence regression coverage remained green after the rail swap, and the single-file Vite build still emits one inlined `dist/index.html`.
- Known gaps after this working-tree update:
  - The consolidated rail is intentionally optimized for desktop `1920x1080` and larger only; smaller-screen collapse patterns are not implemented yet.
  - The repo still has no dedicated UI automation around the new tabbed rail, source cards, UPS cards, validation cards, or tab-switching workflows.
