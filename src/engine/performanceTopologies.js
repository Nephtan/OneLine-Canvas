import {
  DEFAULT_LOW_VOLTAGE,
  DEFAULT_MEDIUM_VOLTAGE
} from "../electrical/voltage";
import { EDGE_TYPE } from "../topology/edgeTypes";
import {
  TRANSFER_SWITCH_ACTIVE_SOURCE,
  TRANSFER_SWITCH_HANDLE_ID
} from "../topology/transferSwitch";
import { TRANSFORMER_HANDLE_ID } from "../topology/transformer";
import {
  UPS_HANDLE_ID,
  UPS_OPERATING_MODE
} from "../topology/ups";
import { BREAKER_STATE } from "./protectionModel";

function createNode(id, type, data, x, y) {
  return {
    id,
    type,
    data,
    position: { x, y }
  };
}

function utilityNode(id, options = {}) {
  return createNode(
    id,
    "utility",
    {
      label: options.label ?? id,
      nominalVoltage: options.nominalVoltage ?? DEFAULT_MEDIUM_VOLTAGE,
      syncGroup: options.syncGroup ?? "",
      isSourceOnline:
        options.isSourceOnline === undefined ? true : options.isSourceOnline
    },
    options.x ?? 0,
    options.y ?? 0
  );
}

function generatorNode(id, options = {}) {
  return createNode(
    id,
    "generator",
    {
      label: options.label ?? id,
      nominalVoltage: options.nominalVoltage ?? DEFAULT_LOW_VOLTAGE,
      syncGroup: options.syncGroup ?? "",
      isSourceOnline:
        options.isSourceOnline === undefined ? true : options.isSourceOnline
    },
    options.x ?? 0,
    options.y ?? 0
  );
}

function mvsgNode(id, options = {}) {
  return createNode(
    id,
    "mvsg",
    {
      label: options.label ?? id,
      nominalVoltage: options.nominalVoltage ?? DEFAULT_MEDIUM_VOLTAGE
    },
    options.x ?? 0,
    options.y ?? 0
  );
}

function ptxNode(id, options = {}) {
  return createNode(
    id,
    "ptx",
    {
      label: options.label ?? id,
      primaryVoltage: options.primaryVoltage ?? DEFAULT_MEDIUM_VOLTAGE,
      secondaryVoltage: options.secondaryVoltage ?? DEFAULT_LOW_VOLTAGE
    },
    options.x ?? 0,
    options.y ?? 0
  );
}

function switchboardNode(id, options = {}) {
  return createNode(
    id,
    "switchboard",
    {
      label: options.label ?? id,
      nominalVoltage: options.nominalVoltage ?? DEFAULT_LOW_VOLTAGE
    },
    options.x ?? 0,
    options.y ?? 0
  );
}

function transferSwitchNode(id, options = {}) {
  return createNode(
    id,
    "transferSwitch",
    {
      label: options.label ?? id,
      nominalVoltage: options.nominalVoltage ?? DEFAULT_LOW_VOLTAGE,
      activeSource:
        options.activeSource ?? TRANSFER_SWITCH_ACTIVE_SOURCE.PRIMARY
    },
    options.x ?? 0,
    options.y ?? 0
  );
}

function upsNode(id, options = {}) {
  return createNode(
    id,
    "ups",
    {
      label: options.label ?? id,
      nominalVoltage: options.nominalVoltage ?? DEFAULT_LOW_VOLTAGE,
      batteryAvailable:
        options.batteryAvailable === undefined ? true : options.batteryAvailable,
      operatingMode: options.operatingMode ?? UPS_OPERATING_MODE.NORMAL,
      syncGroup: options.syncGroup ?? ""
    },
    options.x ?? 0,
    options.y ?? 0
  );
}

function loadNode(id, options = {}) {
  return createNode(
    id,
    "load",
    {
      label: options.label ?? id,
      nominalVoltage: options.nominalVoltage ?? DEFAULT_LOW_VOLTAGE
    },
    options.x ?? 0,
    options.y ?? 0
  );
}

function breakerEdge(id, source, target, breakerState, handleOptions = {}) {
  return {
    id,
    type: EDGE_TYPE.BREAKER,
    source,
    target,
    ...handleOptions,
    data: {
      breakerState
    }
  };
}

function standardEdge(id, source, target, handleOptions = {}) {
  return {
    id,
    type: EDGE_TYPE.STANDARD,
    source,
    target,
    ...handleOptions,
    data: {}
  };
}

export function createRadialFeederTopology({
  segmentCount = 180,
  branchLoadFanout = 2,
  openSegmentIndex = Math.max(1, Math.floor(segmentCount * 0.72))
} = {}) {
  const nodes = [
    utilityNode("radial-utility-root", {
      label: "RADIAL-UTILITY",
      x: 0,
      y: 0
    })
  ];
  const edges = [];
  let previousNodeId = "radial-utility-root";

  for (let segmentIndex = 0; segmentIndex < segmentCount; segmentIndex += 1) {
    const busId = `radial-bus-${segmentIndex}`;
    nodes.push(
      mvsgNode(busId, {
        label: `RADIAL-BUS-${segmentIndex}`,
        x: 260 * (segmentIndex + 1),
        y: 0
      })
    );
    edges.push(
      breakerEdge(
        `radial-feed-${segmentIndex}`,
        previousNodeId,
        busId,
        segmentIndex === openSegmentIndex
          ? BREAKER_STATE.OPEN
          : BREAKER_STATE.CLOSED
      )
    );

    for (
      let branchIndex = 0;
      branchIndex < branchLoadFanout;
      branchIndex += 1
    ) {
      const loadId = `radial-load-${segmentIndex}-${branchIndex}`;
      nodes.push(
        loadNode(loadId, {
          label: `RADIAL-LOAD-${segmentIndex}-${branchIndex}`,
          nominalVoltage: DEFAULT_MEDIUM_VOLTAGE,
          x: 260 * (segmentIndex + 1),
          y: 180 + branchIndex * 120
        })
      );
      edges.push(
        standardEdge(`radial-load-feed-${segmentIndex}-${branchIndex}`, busId, loadId)
      );
    }

    previousNodeId = busId;
  }

  return {
    name: "radial-feeder",
    nodes,
    edges,
    sentinels: {
      lastLiveNodeId: `radial-bus-${Math.max(0, openSegmentIndex - 1)}`,
      firstDeadNodeId: `radial-bus-${openSegmentIndex}`,
      deepestDeadLoadId: `radial-load-${segmentCount - 1}-${Math.max(
        0,
        branchLoadFanout - 1
      )}`,
      openBreakerEdgeId: `radial-feed-${openSegmentIndex}`
    }
  };
}

export function createMainTieMainConflictTopology({
  sectionCount = 96,
  branchLoadFanout = 1
} = {}) {
  const nodes = [
    utilityNode("mtm-utility-left", {
      label: "MTM-UTILITY-L",
      syncGroup: "",
      x: 0,
      y: -220
    }),
    utilityNode("mtm-utility-right", {
      label: "MTM-UTILITY-R",
      syncGroup: "",
      x: 0,
      y: 220
    })
  ];
  const edges = [
    breakerEdge(
      "mtm-main-left",
      "mtm-utility-left",
      "mtm-left-bus-0",
      BREAKER_STATE.CLOSED
    ),
    breakerEdge(
      "mtm-main-right",
      "mtm-utility-right",
      "mtm-right-bus-0",
      BREAKER_STATE.CLOSED
    )
  ];

  for (let sectionIndex = 0; sectionIndex < sectionCount; sectionIndex += 1) {
    const leftBusId = `mtm-left-bus-${sectionIndex}`;
    const rightBusId = `mtm-right-bus-${sectionIndex}`;
    nodes.push(
      switchboardNode(leftBusId, {
        label: `MTM-L-${sectionIndex}`,
        nominalVoltage: DEFAULT_MEDIUM_VOLTAGE,
        x: 280 + sectionIndex * 180,
        y: -220
      })
    );
    nodes.push(
      switchboardNode(rightBusId, {
        label: `MTM-R-${sectionIndex}`,
        nominalVoltage: DEFAULT_MEDIUM_VOLTAGE,
        x: 280 + sectionIndex * 180,
        y: 220
      })
    );

    if (sectionIndex > 0) {
      edges.push(
        standardEdge(
          `mtm-left-link-${sectionIndex - 1}`,
          `mtm-left-bus-${sectionIndex - 1}`,
          leftBusId
        )
      );
      edges.push(
        standardEdge(
          `mtm-right-link-${sectionIndex - 1}`,
          `mtm-right-bus-${sectionIndex - 1}`,
          rightBusId
        )
      );
    }

    for (
      let branchIndex = 0;
      branchIndex < branchLoadFanout;
      branchIndex += 1
    ) {
      const leftLoadId = `mtm-left-load-${sectionIndex}-${branchIndex}`;
      const rightLoadId = `mtm-right-load-${sectionIndex}-${branchIndex}`;

      nodes.push(
        loadNode(leftLoadId, {
          label: `MTM-LD-L-${sectionIndex}-${branchIndex}`,
          nominalVoltage: DEFAULT_MEDIUM_VOLTAGE,
          x: 280 + sectionIndex * 180,
          y: -380 - branchIndex * 90
        })
      );
      nodes.push(
        loadNode(rightLoadId, {
          label: `MTM-LD-R-${sectionIndex}-${branchIndex}`,
          nominalVoltage: DEFAULT_MEDIUM_VOLTAGE,
          x: 280 + sectionIndex * 180,
          y: 380 + branchIndex * 90
        })
      );
      edges.push(
        standardEdge(`mtm-left-load-feed-${sectionIndex}-${branchIndex}`, leftBusId, leftLoadId)
      );
      edges.push(
        standardEdge(`mtm-right-load-feed-${sectionIndex}-${branchIndex}`, rightBusId, rightLoadId)
      );
    }
  }

  edges.push(
    breakerEdge(
      "mtm-tie-main",
      `mtm-left-bus-${sectionCount - 1}`,
      `mtm-right-bus-${sectionCount - 1}`,
      BREAKER_STATE.CLOSED
    )
  );

  const middleSectionIndex = Math.floor(sectionCount / 2);

  return {
    name: "main-tie-main-conflict",
    nodes,
    edges,
    sentinels: {
      leftConflictNodeId: `mtm-left-bus-${middleSectionIndex}`,
      rightConflictNodeId: `mtm-right-bus-${middleSectionIndex}`,
      leftHealthyLoadId: `mtm-left-load-${middleSectionIndex}-0`,
      rightHealthyLoadId: `mtm-right-load-${middleSectionIndex}-0`,
      tieBreakerEdgeId: "mtm-tie-main"
    }
  };
}

export function createMixedVoltageCorridorTopology({
  corridorCount = 48,
  faultedUpsIndex = Math.max(1, corridorCount - 1)
} = {}) {
  const nodes = [
    utilityNode("mixed-utility-root", {
      label: "MIXED-UTILITY",
      nominalVoltage: DEFAULT_MEDIUM_VOLTAGE,
      syncGroup: "GRID-A",
      x: 0,
      y: -280
    }),
    generatorNode("mixed-emergency-generator", {
      label: "MIXED-EMERGENCY-GEN",
      nominalVoltage: DEFAULT_LOW_VOLTAGE,
      syncGroup: "GEN-A",
      x: 0,
      y: 280
    }),
    switchboardNode("mixed-emergency-bus", {
      label: "MIXED-EMERGENCY-BUS",
      nominalVoltage: DEFAULT_LOW_VOLTAGE,
      x: 280,
      y: 280
    })
  ];
  const edges = [
    breakerEdge(
      "mixed-emergency-generator-feed",
      "mixed-emergency-generator",
      "mixed-emergency-bus",
      BREAKER_STATE.CLOSED
    ),
    breakerEdge(
      "mixed-utility-to-ptx-0",
      "mixed-utility-root",
      "mixed-ptx-0",
      BREAKER_STATE.CLOSED,
      {
        targetHandle: TRANSFORMER_HANDLE_ID.PRIMARY_IN
      }
    )
  ];

  for (let corridorIndex = 0; corridorIndex < corridorCount; corridorIndex += 1) {
    const ptxId = `mixed-ptx-${corridorIndex}`;
    const primaryBusId = `mixed-primary-bus-${corridorIndex}`;
    const atsId = `mixed-ats-${corridorIndex}`;
    const upsId = `mixed-ups-${corridorIndex}`;
    const loadId = `mixed-load-${corridorIndex}`;
    const corridorX = 520 + corridorIndex * 220;

    nodes.push(
      ptxNode(ptxId, {
        label: `MIXED-PTX-${corridorIndex}`,
        primaryVoltage: DEFAULT_MEDIUM_VOLTAGE,
        secondaryVoltage: DEFAULT_LOW_VOLTAGE,
        x: corridorX,
        y: -280
      })
    );
    nodes.push(
      switchboardNode(primaryBusId, {
        label: `MIXED-SWBD-${corridorIndex}`,
        nominalVoltage: DEFAULT_LOW_VOLTAGE,
        x: corridorX,
        y: -40
      })
    );
    nodes.push(
      transferSwitchNode(atsId, {
        label: `MIXED-ATS-${corridorIndex}`,
        nominalVoltage: DEFAULT_LOW_VOLTAGE,
        activeSource: TRANSFER_SWITCH_ACTIVE_SOURCE.PRIMARY,
        x: corridorX,
        y: 140
      })
    );
    nodes.push(
      upsNode(upsId, {
        label: `MIXED-UPS-${corridorIndex}`,
        nominalVoltage: corridorIndex === faultedUpsIndex ? 600 : DEFAULT_LOW_VOLTAGE,
        operatingMode: UPS_OPERATING_MODE.NORMAL,
        batteryAvailable: true,
        x: corridorX + 120,
        y: 140
      })
    );
    nodes.push(
      loadNode(loadId, {
        label: `MIXED-LOAD-${corridorIndex}`,
        nominalVoltage: DEFAULT_LOW_VOLTAGE,
        x: corridorX + 240,
        y: 140
      })
    );

    if (corridorIndex > 0) {
      edges.push(
        standardEdge(`mixed-primary-loop-${corridorIndex - 1}`, `mixed-ptx-${corridorIndex - 1}`, ptxId, {
          sourceHandle: TRANSFORMER_HANDLE_ID.PRIMARY_LOOP,
          targetHandle: TRANSFORMER_HANDLE_ID.PRIMARY_LOOP_TARGET
        })
      );
    }

    edges.push(
      breakerEdge(
        `mixed-ptx-secondary-${corridorIndex}`,
        ptxId,
        primaryBusId,
        BREAKER_STATE.CLOSED,
        {
          sourceHandle: TRANSFORMER_HANDLE_ID.SECONDARY,
          targetHandle: "switchboard-bus-in"
        }
      )
    );
    edges.push(
      breakerEdge(
        `mixed-ats-primary-${corridorIndex}`,
        primaryBusId,
        atsId,
        BREAKER_STATE.CLOSED,
        {
          sourceHandle: "switchboard-bus-out",
          targetHandle: TRANSFER_SWITCH_HANDLE_ID.PRIMARY
        }
      )
    );
    edges.push(
      breakerEdge(
        `mixed-ats-emergency-${corridorIndex}`,
        "mixed-emergency-bus",
        atsId,
        BREAKER_STATE.CLOSED,
        {
          sourceHandle: "switchboard-bus-out",
          targetHandle: TRANSFER_SWITCH_HANDLE_ID.EMERGENCY
        }
      )
    );
    edges.push(
      standardEdge(`mixed-ats-output-${corridorIndex}`, atsId, upsId, {
        sourceHandle: TRANSFER_SWITCH_HANDLE_ID.OUTPUT,
        targetHandle: UPS_HANDLE_ID.INPUT
      })
    );
    edges.push(
      breakerEdge(
        `mixed-ups-output-${corridorIndex}`,
        upsId,
        loadId,
        BREAKER_STATE.CLOSED,
        {
          sourceHandle: UPS_HANDLE_ID.OUTPUT
        }
      )
    );
  }

  const healthyCorridorIndex = Math.min(
    Math.max(1, Math.floor(corridorCount / 2)),
    Math.max(0, faultedUpsIndex - 1)
  );

  return {
    name: "mixed-voltage-corridor",
    nodes,
    edges,
    sentinels: {
      healthyLoadId: `mixed-load-${healthyCorridorIndex}`,
      healthyUpsId: `mixed-ups-${healthyCorridorIndex}`,
      inactiveEmergencyEdgeId: `mixed-ats-emergency-${healthyCorridorIndex}`,
      electricalMutationAtsNodeId: `mixed-ats-${healthyCorridorIndex}`,
      electricalMutationBreakerEdgeId: `mixed-ptx-secondary-${healthyCorridorIndex}`,
      faultedUpsId: `mixed-ups-${faultedUpsIndex}`,
      deadFaultedLoadId: `mixed-load-${faultedUpsIndex}`
    }
  };
}

export function cloneTopologyWithShiftedLayout(
  topology,
  {
    nodeShiftX = 480,
    nodeShiftY = 120,
    edgeCenterOffsetX = 36,
    edgeCenterOffsetY = 24
  } = {}
) {
  return {
    ...topology,
    nodes: topology.nodes.map((node, nodeIndex) => ({
      ...node,
      position: {
        x: node.position.x + nodeShiftX + nodeIndex * 3,
        y: node.position.y + nodeShiftY + (nodeIndex % 7) * 4
      }
    })),
    edges: topology.edges.map((edge, edgeIndex) => ({
      ...edge,
      pathOptions: {
        centerX: edgeCenterOffsetX * (edgeIndex + 1),
        centerY: edgeCenterOffsetY * ((edgeIndex % 11) + 1)
      }
    }))
  };
}
