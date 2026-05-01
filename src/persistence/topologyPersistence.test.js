import { describe, expect, it } from "vitest";
import { EDGE_LINE_SIDE, FAULT_TYPE, PROTECTION_MODE } from "../engine/protectionModel";
import { EDGE_TYPE } from "../topology/edgeTypes";
import {
  TRANSFER_SWITCH_ACTIVE_SOURCE,
  TRANSFER_SWITCH_CONTROL_MODE,
  TRANSFER_SWITCH_HANDLE_ID
} from "../topology/transferSwitch";
import { TRANSFER_SWITCH_RETRANSFER_POLICY } from "../topology/transferSwitch";
import { TRANSFORMER_HANDLE_ID } from "../topology/transformer";
import { UPS_HANDLE_ID, UPS_OPERATING_MODE } from "../topology/ups";
import { normalizeGraphState } from "../nodes/nodeData";
import {
  createBlankAppState,
  createValidationReport,
  createPersistedAppState,
  deserializePersistedAppStateJson,
  hasBlockingValidationIssues,
  MOP_ACTION_TYPE,
  parsePersistedAppState,
  serializePersistedAppState,
  TOPOLOGY_SCHEMA_VERSION,
  validateLiveAppState,
  validatePersistedAppState,
  VALIDATION_SEVERITY,
  VALIDATION_SOURCE
} from "./topologyPersistence";

function utilityNode(id, data = {}) {
  return {
    id,
    type: "utility",
    position: { x: 0, y: 0 },
    data: {
      label: id,
      nominalVoltage: 34500,
      isSourceOnline: true,
      syncGroup: "",
      ...data
    }
  };
}

function generatorNode(id, data = {}) {
  return {
    id,
    type: "generator",
    position: { x: 144, y: 0 },
    data: {
      label: id,
      nominalVoltage: 480,
      isSourceOnline: true,
      syncGroup: "",
      ...data
    }
  };
}

function mvsgNode(id, data = {}) {
  return {
    id,
    type: "mvsg",
    position: { x: 0, y: 144 },
    data: {
      label: id,
      nominalVoltage: 34500,
      ...data
    }
  };
}

function ptxNode(id, data = {}) {
  return {
    id,
    type: "ptx",
    position: { x: 0, y: 288 },
    data: {
      label: id,
      primaryVoltage: 34500,
      secondaryVoltage: 480,
      ...data
    }
  };
}

function switchboardNode(id, data = {}) {
  return {
    id,
    type: "switchboard",
    position: { x: 0, y: 432 },
    data: {
      label: id,
      nominalVoltage: 480,
      boardClass: "Main Distribution Board",
      ...data
    }
  };
}

function transferSwitchNode(id, data = {}) {
  return {
    id,
    type: "transferSwitch",
    position: { x: 288, y: 432 },
    data: {
      label: id,
      nominalVoltage: 480,
      switchClass: "Automatic Transfer Switch",
      activeSource: TRANSFER_SWITCH_ACTIVE_SOURCE.PRIMARY,
      controlMode: TRANSFER_SWITCH_CONTROL_MODE.MANUAL,
      retransferPolicy: TRANSFER_SWITCH_RETRANSFER_POLICY.MANUAL_RETURN,
      transferDelaySeconds: 0,
      retransferDelaySeconds: 0,
      ...data
    }
  };
}

function upsNode(id, data = {}) {
  return {
    id,
    type: "ups",
    position: { x: 576, y: 432 },
    data: {
      label: id,
      nominalVoltage: 480,
      upsClass: "Double Conversion UPS",
      batteryAvailable: true,
      operatingMode: UPS_OPERATING_MODE.NORMAL,
      syncGroup: "",
      ...data
    }
  };
}

function loadNode(id, data = {}) {
  return {
    id,
    type: "load",
    position: { x: 288, y: 576 },
    data: {
      label: id,
      nominalVoltage: 480,
      loadClass: "Data Hall",
      ...data
    }
  };
}

function mechanicalNode(id, data = {}) {
  return {
    id,
    type: "mechanical",
    position: { x: 576, y: 576 },
    data: {
      label: id,
      nominalVoltage: 480,
      mechanicalClass: "Fan Coil Wall",
      ...data
    }
  };
}

function breakerEdge(id, source, target, options = {}) {
  return {
    id,
    type: EDGE_TYPE.BREAKER,
    source,
    target,
    sourceHandle: options.sourceHandle,
    targetHandle: options.targetHandle,
    data: {
      breakerState: "closed",
      ...options.data
    }
  };
}

function standardEdge(id, source, target, options = {}) {
  return {
    id,
    type: EDGE_TYPE.STANDARD,
    source,
    target,
    sourceHandle: options.sourceHandle,
    targetHandle: options.targetHandle,
    data: {
      ...options.data
    }
  };
}

function createValidVersionedPayload() {
  return {
    schemaVersion: TOPOLOGY_SCHEMA_VERSION,
    nodes: [
      utilityNode("utility-a"),
      generatorNode("generator-a"),
      mvsgNode("mvsg-a"),
      ptxNode("ptx-a"),
      switchboardNode("switchboard-a"),
      transferSwitchNode("ats-a"),
      upsNode("ups-a"),
      loadNode("load-a"),
      mechanicalNode("mech-a")
    ],
    edges: [
      breakerEdge("utility-to-mvsg", "utility-a", "mvsg-a", {
        sourceHandle: "utility-bus-out"
      }),
      breakerEdge("mvsg-to-ptx", "mvsg-a", "ptx-a", {
        sourceHandle: "mvsg-bus-out",
        targetHandle: TRANSFORMER_HANDLE_ID.PRIMARY_IN
      }),
      breakerEdge("ptx-to-switchboard", "ptx-a", "switchboard-a", {
        sourceHandle: TRANSFORMER_HANDLE_ID.SECONDARY,
        targetHandle: "switchboard-bus-in"
      }),
      breakerEdge("switchboard-to-ats", "switchboard-a", "ats-a", {
        sourceHandle: "switchboard-bus-out",
        targetHandle: TRANSFER_SWITCH_HANDLE_ID.PRIMARY
      }),
      breakerEdge("generator-to-ats", "generator-a", "ats-a", {
        sourceHandle: "generator-bus-out",
        targetHandle: TRANSFER_SWITCH_HANDLE_ID.EMERGENCY
      }),
      standardEdge("ats-to-load", "ats-a", "load-a", {
        sourceHandle: TRANSFER_SWITCH_HANDLE_ID.OUTPUT,
        targetHandle: "load-bus-in"
      }),
      breakerEdge("switchboard-to-ups", "switchboard-a", "ups-a", {
        sourceHandle: "switchboard-bus-out",
        targetHandle: UPS_HANDLE_ID.INPUT
      }),
      breakerEdge("ups-to-mech", "ups-a", "mech-a", {
        sourceHandle: UPS_HANDLE_ID.OUTPUT,
        targetHandle: "mechanical-bus-in"
      })
    ],
    mopSteps: [],
    mopBaseSnapshot: null
  };
}

function toComparableIssueShape(issues) {
  return [...issues]
    .map((issue) => ({
      code: issue.code,
      message: issue.message,
      nodeIds: issue.nodeIds,
      edgeIds: issue.edgeIds
    }))
    .sort((leftIssue, rightIssue) =>
      `${leftIssue.code}:${leftIssue.message}`.localeCompare(
        `${rightIssue.code}:${rightIssue.message}`
      )
    );
}

describe("topology persistence validation", () => {
  it("accepts a valid schemaVersion 1 payload", () => {
    const validation = validatePersistedAppState(createValidVersionedPayload());

    expect(validation.isValid).toBe(true);
    expect(validation.issues).toEqual([]);
  });

  it("accepts a legacy unversioned payload with voltage-string, ratio, and legacy ATS handle migrations", () => {
    const legacyPayload = {
      nodes: [
        utilityNode("utility-a", {
          nominalVoltage: undefined,
          voltage: "34.5 kV"
        }),
        ptxNode("ptx-a", {
          primaryVoltage: undefined,
          secondaryVoltage: undefined,
          ratio: "12.47 kV / 480 V"
        }),
        transferSwitchNode("ats-a"),
        loadNode("load-a")
      ],
      edges: [
        breakerEdge("utility-to-ptx", "utility-a", "ptx-a", {
          sourceHandle: "utility-bus-out"
        }),
        breakerEdge("ptx-to-ats", "ptx-a", "ats-a", {
          sourceHandle: TRANSFORMER_HANDLE_ID.SECONDARY,
          targetHandle: TRANSFER_SWITCH_HANDLE_ID.LEGACY_INPUT
        }),
        standardEdge("ats-to-load", "ats-a", "load-a", {
          sourceHandle: TRANSFER_SWITCH_HANDLE_ID.OUTPUT
        })
      ],
      mopSteps: [],
      mopBaseSnapshot: null
    };

    const result = parsePersistedAppState(legacyPayload);

    expect(result.ok).toBe(true);
    expect(result.isLegacyPayload).toBe(true);

    const utility = result.appState.nodes.find((node) => node.id === "utility-a");
    const ptx = result.appState.nodes.find((node) => node.id === "ptx-a");
    const atsFeed = result.appState.edges.find((edge) => edge.id === "ptx-to-ats");

    expect(utility.data.nominalVoltage).toBe(34500);
    expect(ptx.data.primaryVoltage).toBe(12470);
    expect(ptx.data.secondaryVoltage).toBe(480);
    expect(atsFeed.targetHandle).toBe(TRANSFER_SWITCH_HANDLE_ID.PRIMARY);
  });

  it("rejects unsupported schema versions", () => {
    const validation = validatePersistedAppState({
      ...createValidVersionedPayload(),
      schemaVersion: 99
    });

    expect(validation.isValid).toBe(false);
    expect(validation.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "schemaVersion" })
      ])
    );
  });

  it("rejects duplicate node ids and duplicate edge ids", () => {
    const payload = createValidVersionedPayload();
    payload.nodes[1].id = payload.nodes[0].id;
    payload.edges[1].id = payload.edges[0].id;

    const validation = validatePersistedAppState(payload);

    expect(validation.isValid).toBe(false);
    expect(validation.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "payload.nodes[1].id" }),
        expect.objectContaining({ path: "payload.edges[1].id" })
      ])
    );
  });

  it("emits structured issue metadata for duplicate ids and missing references", () => {
    const payload = createValidVersionedPayload();
    payload.nodes[1].id = payload.nodes[0].id;
    payload.edges[0].target = "missing-node";

    const validation = validatePersistedAppState(payload, {
      source: VALIDATION_SOURCE.STORAGE
    });

    expect(validation.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "duplicate-node-id",
          severity: VALIDATION_SEVERITY.ERROR,
          source: VALIDATION_SOURCE.STORAGE,
          path: "payload.nodes[1].id",
          nodeIds: [payload.nodes[0].id],
          edgeIds: []
        }),
        expect.objectContaining({
          code: "missing-node-reference",
          severity: VALIDATION_SEVERITY.ERROR,
          source: VALIDATION_SOURCE.STORAGE,
          path: "payload.edges[0].target",
          nodeIds: ["missing-node"],
          edgeIds: ["utility-to-mvsg"]
        })
      ])
    );
  });

  it("rejects edges that reference missing nodes", () => {
    const payload = createValidVersionedPayload();
    payload.edges[0].target = "missing-node";

    const validation = validatePersistedAppState(payload);

    expect(validation.isValid).toBe(false);
    expect(validation.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "payload.edges[0].target" })
      ])
    );
  });

  it("rejects unknown node types and unknown edge types", () => {
    const payload = createValidVersionedPayload();
    payload.nodes[0].type = "mystery";
    payload.edges[0].type = "mystery";

    const validation = validatePersistedAppState(payload);

    expect(validation.isValid).toBe(false);
    expect(validation.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "payload.nodes[0].type" }),
        expect.objectContaining({ path: "payload.edges[0].type" })
      ])
    );
  });

  it("rejects non-finite node positions", () => {
    const payload = createValidVersionedPayload();
    payload.nodes[0].position.x = Number.NaN;
    payload.nodes[1].position.y = Number.POSITIVE_INFINITY;

    const validation = validatePersistedAppState(payload);

    expect(validation.isValid).toBe(false);
    expect(validation.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "payload.nodes[0].position.x" }),
        expect.objectContaining({ path: "payload.nodes[1].position.y" })
      ])
    );
  });

  it("rejects invalid voltage, current, impedance, and rating metadata", () => {
    const payload = createValidVersionedPayload();
    payload.nodes[0].data.nominalVoltage = 0;
    payload.nodes[1].data.availableFaultCurrentAmps = -1000;
    payload.nodes[3].data.transformerImpedancePercent = 0;
    payload.nodes[6].data.kvaRating = "bad";
    payload.edges[0].data.interruptingRatingAmps = -1;
    payload.edges[0].data.conductorImpedanceOhms = 0;

    const validation = validatePersistedAppState(payload);

    expect(validation.isValid).toBe(false);
    expect(validation.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "payload.nodes[0].data.nominalVoltage" }),
        expect.objectContaining({
          path: "payload.nodes[1].data.availableFaultCurrentAmps"
        }),
        expect.objectContaining({
          path: "payload.nodes[3].data.transformerImpedancePercent"
        }),
        expect.objectContaining({ path: "payload.nodes[6].data.kvaRating" }),
        expect.objectContaining({
          path: "payload.edges[0].data.interruptingRatingAmps"
        }),
        expect.objectContaining({
          path: "payload.edges[0].data.conductorImpedanceOhms"
        })
      ])
    );
  });

  it("accepts ATS automation defaults and zero-second delays", () => {
    const payload = createValidVersionedPayload();
    payload.nodes = payload.nodes.map((node) =>
      node.id === "ats-a"
        ? transferSwitchNode("ats-a", {
            controlMode: TRANSFER_SWITCH_CONTROL_MODE.AUTO,
            retransferPolicy: TRANSFER_SWITCH_RETRANSFER_POLICY.AUTO_RETURN,
            transferDelaySeconds: 0,
            retransferDelaySeconds: 0
          })
        : node
    );

    const validation = validatePersistedAppState(payload);
    const result = parsePersistedAppState(payload);

    expect(validation.isValid).toBe(true);
    expect(result.ok).toBe(true);
    expect(result.appState.nodes.find((node) => node.id === "ats-a").data).toMatchObject({
      controlMode: TRANSFER_SWITCH_CONTROL_MODE.AUTO,
      retransferPolicy: TRANSFER_SWITCH_RETRANSFER_POLICY.AUTO_RETURN,
      transferDelaySeconds: 0,
      retransferDelaySeconds: 0
    });
  });

  it("rejects invalid ATS automation enums and negative or non-numeric delay values", () => {
    const payload = createValidVersionedPayload();
    payload.nodes = payload.nodes.map((node) =>
      node.id === "ats-a"
        ? transferSwitchNode("ats-a", {
            controlMode: "bad-mode",
            retransferPolicy: "bad-policy",
            transferDelaySeconds: -1,
            retransferDelaySeconds: "bad"
          })
        : node
    );

    const validation = validatePersistedAppState(payload);

    expect(validation.isValid).toBe(false);
    expect(validation.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "payload.nodes[5].data.controlMode" }),
        expect.objectContaining({ path: "payload.nodes[5].data.retransferPolicy" }),
        expect.objectContaining({ path: "payload.nodes[5].data.transferDelaySeconds" }),
        expect.objectContaining({
          path: "payload.nodes[5].data.retransferDelaySeconds"
        })
      ])
    );
  });

  it("rejects invalid PTX, ATS, and UPS handle assignments on schemaVersion 1 payloads", () => {
    const payload = createValidVersionedPayload();
    payload.edges[1].targetHandle = "not-a-transformer-handle";
    payload.edges[3].targetHandle = TRANSFER_SWITCH_HANDLE_ID.LEGACY_INPUT;
    payload.edges[6].targetHandle = "wrong-ups-handle";

    const validation = validatePersistedAppState(payload);

    expect(validation.isValid).toBe(false);
    expect(validation.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "payload.edges[1].targetHandle" }),
        expect.objectContaining({ path: "payload.edges[3].targetHandle" }),
        expect.objectContaining({ path: "payload.edges[6].targetHandle" })
      ])
    );
  });

  it("rejects invalid mop base snapshots and invalid mop step snapshots", () => {
    const payload = createValidVersionedPayload();
    payload.mopBaseSnapshot = { nodes: [] };
    payload.mopSteps = [
      {
        targetId: "utility-a",
        actionType: MOP_ACTION_TYPE.TOGGLE_SOURCE,
        targetState: true,
        snapshot: { edges: [] }
      }
    ];

    const validation = validatePersistedAppState(payload);

    expect(validation.isValid).toBe(false);
    expect(validation.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "payload.mopBaseSnapshot.edges" }),
        expect.objectContaining({ path: "payload.mopSteps[0].snapshot.nodes" })
      ])
    );
  });
});

describe("topology persistence round-trip", () => {
  it("preserves canonical electrical metadata across create, hydrate, export, and import flows", () => {
    const normalizedGraph = normalizeGraphState({
      nodes: [
        utilityNode("utility-a", {
          availableFaultCurrentAmps: 65000,
          syncGroup: "GRID-A"
        }),
        generatorNode("generator-a", {
          availableFaultCurrentAmps: 42000,
          syncGroup: "EMERGENCY-A"
        }),
        mvsgNode("mvsg-a", { ratedCurrentAmps: 3000 }),
        ptxNode("ptx-a", { transformerImpedancePercent: 5.75 }),
        switchboardNode("switchboard-a", { ratedCurrentAmps: 4000 }),
        transferSwitchNode("ats-a", {
          ratedCurrentAmps: 1600,
          activeSource: TRANSFER_SWITCH_ACTIVE_SOURCE.PRIMARY,
          controlMode: TRANSFER_SWITCH_CONTROL_MODE.AUTO,
          retransferPolicy: TRANSFER_SWITCH_RETRANSFER_POLICY.AUTO_RETURN,
          transferDelaySeconds: 3,
          retransferDelaySeconds: 15
        }),
        upsNode("ups-a", {
          ratedCurrentAmps: 800,
          kvaRating: 750,
          batteryRuntimeMinutes: 15,
          syncGroup: "UPS-BUS"
        }),
        loadNode("load-a", { ratedCurrentAmps: 225 }),
        mechanicalNode("mech-a", { ratedCurrentAmps: 140 })
      ],
      edges: [
        breakerEdge("utility-to-mvsg", "utility-a", "mvsg-a", {
          sourceHandle: "utility-bus-out",
          data: {
            breakerState: "closed",
            protectionMode: PROTECTION_MODE.TCC,
            lineSide: EDGE_LINE_SIDE.TARGET,
            faultType: FAULT_TYPE.NONE,
            ratedCurrentAmps: 3200,
            interruptingRatingAmps: 65000,
            deviceFamily: "LSIG-Frame",
            tripUnit: "Trip-01",
            curveKey: "curve-a",
            conductorImpedanceOhms: 0.125
          }
        }),
        breakerEdge("mvsg-to-ptx", "mvsg-a", "ptx-a", {
          sourceHandle: "mvsg-bus-out",
          targetHandle: TRANSFORMER_HANDLE_ID.PRIMARY_IN
        }),
        breakerEdge("ptx-to-switchboard", "ptx-a", "switchboard-a", {
          sourceHandle: TRANSFORMER_HANDLE_ID.SECONDARY,
          targetHandle: "switchboard-bus-in"
        }),
        breakerEdge("switchboard-to-ats", "switchboard-a", "ats-a", {
          sourceHandle: "switchboard-bus-out",
          targetHandle: TRANSFER_SWITCH_HANDLE_ID.PRIMARY
        }),
        breakerEdge("generator-to-ats", "generator-a", "ats-a", {
          sourceHandle: "generator-bus-out",
          targetHandle: TRANSFER_SWITCH_HANDLE_ID.EMERGENCY
        }),
        breakerEdge("switchboard-to-ups", "switchboard-a", "ups-a", {
          sourceHandle: "switchboard-bus-out",
          targetHandle: UPS_HANDLE_ID.INPUT
        }),
        breakerEdge("ups-to-mech", "ups-a", "mech-a", {
          sourceHandle: UPS_HANDLE_ID.OUTPUT,
          targetHandle: "mechanical-bus-in"
        }),
        standardEdge("ats-to-load", "ats-a", "load-a", {
          sourceHandle: TRANSFER_SWITCH_HANDLE_ID.OUTPUT,
          targetHandle: "load-bus-in",
          data: {
            ratedCurrentAmps: 200,
            conductorImpedanceOhms: 0.02
          }
        })
      ]
    });
    const appState = {
      nodes: normalizedGraph.nodes,
      edges: normalizedGraph.edges,
      mopBaseSnapshot: {
        nodes: normalizedGraph.nodes,
        edges: normalizedGraph.edges
      },
      mopSteps: [
        {
          targetId: "utility-a",
          actionType: MOP_ACTION_TYPE.TOGGLE_SOURCE,
          targetState: false,
          actionText: "Killed Utility A",
          snapshot: {
            nodes: normalizedGraph.nodes,
            edges: normalizedGraph.edges
          }
        }
      ]
    };

    const createdPayload = createPersistedAppState(appState);
    const hydratedResult = parsePersistedAppState(createdPayload);
    const importedResult = deserializePersistedAppStateJson(
      serializePersistedAppState(appState, true)
    );

    expect(createdPayload.schemaVersion).toBe(TOPOLOGY_SCHEMA_VERSION);
    expect(hydratedResult.ok).toBe(true);
    expect(importedResult.ok).toBe(true);

    for (const result of [hydratedResult, importedResult]) {
      const nodeById = new Map(result.appState.nodes.map((node) => [node.id, node]));
      const edgeById = new Map(result.appState.edges.map((edge) => [edge.id, edge]));

      expect(nodeById.get("utility-a").data.availableFaultCurrentAmps).toBe(65000);
      expect(nodeById.get("generator-a").data.availableFaultCurrentAmps).toBe(42000);
      expect(nodeById.get("mvsg-a").data.ratedCurrentAmps).toBe(3000);
      expect(nodeById.get("ptx-a").data.transformerImpedancePercent).toBe(5.75);
      expect(nodeById.get("switchboard-a").data.ratedCurrentAmps).toBe(4000);
      expect(nodeById.get("ats-a").data.ratedCurrentAmps).toBe(1600);
      expect(nodeById.get("ats-a").data.controlMode).toBe(
        TRANSFER_SWITCH_CONTROL_MODE.AUTO
      );
      expect(nodeById.get("ats-a").data.retransferPolicy).toBe(
        TRANSFER_SWITCH_RETRANSFER_POLICY.AUTO_RETURN
      );
      expect(nodeById.get("ats-a").data.transferDelaySeconds).toBe(3);
      expect(nodeById.get("ats-a").data.retransferDelaySeconds).toBe(15);
      expect(nodeById.get("ups-a").data.ratedCurrentAmps).toBe(800);
      expect(nodeById.get("ups-a").data.kvaRating).toBe(750);
      expect(nodeById.get("ups-a").data.batteryRuntimeMinutes).toBe(15);
      expect(nodeById.get("load-a").data.ratedCurrentAmps).toBe(225);
      expect(nodeById.get("mech-a").data.ratedCurrentAmps).toBe(140);

      expect(edgeById.get("utility-to-mvsg").data).toMatchObject({
        protectionMode: PROTECTION_MODE.TCC,
        lineSide: EDGE_LINE_SIDE.TARGET,
        ratedCurrentAmps: 3200,
        interruptingRatingAmps: 65000,
        deviceFamily: "LSIG-Frame",
        tripUnit: "Trip-01",
        curveKey: "curve-a",
        conductorImpedanceOhms: 0.125
      });

      expect(result.appState.mopBaseSnapshot).not.toBeNull();
      expect(result.appState.mopSteps).toHaveLength(1);
      expect(result.appState.mopSteps[0]).toMatchObject({
        targetId: "utility-a",
        actionType: MOP_ACTION_TYPE.TOGGLE_SOURCE,
        targetState: false,
        actionText: "Killed Utility A"
      });
    }
  });
});

describe("live topology diagnostics", () => {
  it("matches persisted and live issue semantics for the same invalid topology", () => {
    const appState = createBlankAppState();
    const payload = createValidVersionedPayload();

    payload.edges[1].targetHandle = "not-a-transformer-handle";
    payload.edges[3].targetHandle = TRANSFER_SWITCH_HANDLE_ID.LEGACY_INPUT;
    payload.nodes[0].data.nominalVoltage = 0;

    appState.nodes = payload.nodes;
    appState.edges = payload.edges;

    const persistedValidation = validatePersistedAppState(
      createPersistedAppState(appState),
      { source: VALIDATION_SOURCE.IMPORT }
    );
    const liveValidation = validateLiveAppState(appState);

    expect(persistedValidation.isValid).toBe(false);
    expect(liveValidation.isValid).toBe(false);
    expect(liveValidation.issues.every((issue) => issue.source === VALIDATION_SOURCE.LIVE)).toBe(
      true
    );
    expect(toComparableIssueShape(liveValidation.issues)).toEqual(
      toComparableIssueShape(persistedValidation.issues)
    );
  });

  it("treats live hard errors as persistence blockers", () => {
    const validPayload = createValidVersionedPayload();
    const validAppState = {
      nodes: validPayload.nodes,
      edges: validPayload.edges,
      mopSteps: [],
      mopBaseSnapshot: null
    };
    const invalidAppState = {
      ...validAppState,
      edges: validAppState.edges.map((edge) =>
        edge.id === "switchboard-to-ats"
          ? {
              ...edge,
              targetHandle: TRANSFER_SWITCH_HANDLE_ID.LEGACY_INPUT
            }
          : edge
      )
    };

    expect(hasBlockingValidationIssues(validateLiveAppState(validAppState).issues)).toBe(false);
    expect(hasBlockingValidationIssues(validateLiveAppState(invalidAppState).issues)).toBe(true);
  });

  it("returns structured invalid-json issues and report summaries for rejected payloads", () => {
    const result = deserializePersistedAppStateJson("{", {
      source: VALIDATION_SOURCE.STORAGE
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual([
      expect.objectContaining({
        code: "invalid-json",
        severity: VALIDATION_SEVERITY.ERROR,
        source: VALIDATION_SOURCE.STORAGE
      })
    ]);

    const report = createValidationReport({
      label: "Persisted topology",
      source: VALIDATION_SOURCE.STORAGE,
      issues: result.issues,
      parseError: result.parseError
    });

    expect(report.summary).toContain("Persisted topology rejected.");
    expect(report.issues).toHaveLength(1);
  });
});
