# OneLine-Canvas

**A visual scripting simulator for mission-critical electrical topologies.**

Physics does not care about your deadlines, and electrons do not negotiate. OneLine-Canvas is an interactive node-graph simulator built for commissioning agents, MEP coordinators, and electrical engineers who need to test data center switching logic without turning a reserve electric room into a ten-million-dollar crater.

Think of it as a sandbox for high-voltage paranoia. You drag gear onto the canvas (MVSGs, PTXs, Utility Grids), snap your nodes together to establish the physical bus connections, and dictate your switching logic. 

The simulation engine continuously propagates power states across the directed graph. It does not grade on a curve. If your virtual main-tie-main logic backfeeds a live bus from a secondary utility loop, the graph will light up red and politely inform you that you’ve just engineered a catastrophic phase conflict.

Bastard-proof your MOPs before you ever step foot on the yard.

---

## Core Features

* **Node-Based Topology Mapping:** Drag and drop 12.47kV utility feeds, switchgear, and transformers. Wire up the DINs and breakers using intuitive visual scripting.
* **Live Power Propagation:** The engine evaluates circuit states in real-time. Close a breaker, and watch the flow of live voltage snake through your loops. 
* **Catastrophic Conflict Detection:** Instantly flags dead-bus conditions, accidental paralleling of out-of-phase sources, and backfeed vulnerabilities. 
* **Cx Sequencing Validation:** Step through your Commissioning (Cx) scripts and Lock-Out/Tag-Out (LOTO) procedures safely. Prove the logic works before an operator flips copper in the real world.