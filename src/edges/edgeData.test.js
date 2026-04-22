import { describe, expect, it } from "vitest";
import { normalizeGraphState } from "../nodes/nodeData";
import {
  BREAKER_STATE,
  EDGE_LINE_SIDE,
  FAULT_TYPE,
  PROTECTION_MODE
} from "../engine/protectionModel";

describe("normalizeGraphState edge protection metadata", () => {
  it("preserves imported edge protection metadata and fault settings", () => {
    const normalizedGraph = normalizeGraphState({
      nodes: [
        {
          id: "utility-a",
          type: "utility",
          data: {
            label: "utility-a",
            nominalVoltage: 480
          },
          position: { x: 0, y: 0 }
        },
        {
          id: "swbd-a",
          type: "switchboard",
          data: {
            label: "swbd-a",
            nominalVoltage: 480
          },
          position: { x: 0, y: 0 }
        }
      ],
      edges: [
        {
          id: "main-a",
          type: "breaker",
          source: "utility-a",
          target: "swbd-a",
          data: {
            breakerState: BREAKER_STATE.CLOSED,
            lineSide: EDGE_LINE_SIDE.TARGET,
            faultType: FAULT_TYPE.BOLTED,
            protectionMode: PROTECTION_MODE.TCC,
            ratedCurrentAmps: 1200,
            interruptingRatingAmps: 65000,
            deviceFamily: "LSIG-Frame",
            tripUnit: "Trip-01",
            curveKey: "curve-a",
            conductorImpedanceOhms: 0.125
          }
        }
      ]
    });
    const normalizedEdge = normalizedGraph.edges[0];

    expect(normalizedEdge.data).toMatchObject({
      breakerState: BREAKER_STATE.CLOSED,
      lineSide: EDGE_LINE_SIDE.TARGET,
      faultType: FAULT_TYPE.BOLTED,
      protectionMode: PROTECTION_MODE.TCC,
      ratedCurrentAmps: 1200,
      interruptingRatingAmps: 65000,
      deviceFamily: "LSIG-Frame",
      tripUnit: "Trip-01",
      curveKey: "curve-a",
      conductorImpedanceOhms: 0.125
    });
  });
});
