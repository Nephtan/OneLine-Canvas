import { performance } from "node:perf_hooks";
import { describe, expect, it } from "vitest";
import { createTopologyKey, evaluatePowerFlow } from "./powerFlow";
import { evaluateProtectionState } from "./protection";
import {
  createMainTieMainConflictTopology,
  createMixedVoltageCorridorTopology,
  createRadialFeederTopology
} from "./performanceTopologies";

const ITERATION_COUNT = 5;

const BENCHMARK_SCENARIOS = [
  {
    name: "radial-feeder",
    build: () =>
      createRadialFeederTopology({
        segmentCount: 320,
        branchLoadFanout: 2,
        openSegmentIndex: 240
      })
  },
  {
    name: "main-tie-main-conflict",
    build: () =>
      createMainTieMainConflictTopology({
        sectionCount: 144,
        branchLoadFanout: 1
      })
  },
  {
    name: "mixed-voltage-corridor",
    build: () =>
      createMixedVoltageCorridorTopology({
        corridorCount: 72,
        faultedUpsIndex: 71
      })
  }
];

const benchmarkIt =
  process.env.ONE_LINE_ENGINE_BENCH === "1" ? it : it.skip;

function measureIterations(callback) {
  callback();
  const durationsMs = [];
  let lastResult;

  for (let iterationIndex = 0; iterationIndex < ITERATION_COUNT; iterationIndex += 1) {
    const startedAt = performance.now();
    lastResult = callback();
    durationsMs.push(performance.now() - startedAt);
  }

  const totalMs = durationsMs.reduce((sum, durationMs) => sum + durationMs, 0);

  return {
    avgMs: totalMs / durationsMs.length,
    minMs: Math.min(...durationsMs),
    maxMs: Math.max(...durationsMs),
    lastResult
  };
}

function formatMs(value) {
  return Number(value).toFixed(2);
}

describe("bench:engine", () => {
  benchmarkIt("prints repeatable local timings for the large-graph engine scenarios", () => {
    const rows = [];

    for (const scenario of BENCHMARK_SCENARIOS) {
      const topology = scenario.build();
      const topologyKeyMetrics = measureIterations(() =>
        createTopologyKey(topology.nodes, topology.edges)
      );
      const powerFlowMetrics = measureIterations(() =>
        evaluatePowerFlow(topology.nodes, topology.edges)
      );
      const protectionMetrics = measureIterations(() =>
        evaluateProtectionState(
          topology.nodes,
          topology.edges,
          powerFlowMetrics.lastResult
        )
      );

      rows.push({
        scenario: scenario.name,
        nodes: topology.nodes.length,
        edges: topology.edges.length,
        "key avg (ms)": formatMs(topologyKeyMetrics.avgMs),
        "key min/max": `${formatMs(topologyKeyMetrics.minMs)} / ${formatMs(
          topologyKeyMetrics.maxMs
        )}`,
        "flow avg (ms)": formatMs(powerFlowMetrics.avgMs),
        "flow min/max": `${formatMs(powerFlowMetrics.minMs)} / ${formatMs(
          powerFlowMetrics.maxMs
        )}`,
        "protection avg (ms)": formatMs(protectionMetrics.avgMs),
        "protection min/max": `${formatMs(protectionMetrics.minMs)} / ${formatMs(
          protectionMetrics.maxMs
        )}`
      });
    }

    console.log(
      `OneLine-Canvas engine benchmark (${ITERATION_COUNT} measured iterations after one warm-up pass)`
    );
    console.table(rows);
    console.log(
      "These timings are machine-local spot checks for scale regressions, not cross-machine pass/fail gates."
    );

    expect(rows).toHaveLength(BENCHMARK_SCENARIOS.length);
  });
});
