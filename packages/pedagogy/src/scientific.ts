import type { PedagogicalBlock, PedagogicalResourceDocument } from "./types.ts";

export type ScientificChartBlock = Extract<PedagogicalBlock, { type: "chart" }>;
export type ScientificDiagramBlock = Extract<PedagogicalBlock, { type: "diagram" }>;

export type ChartPoint = { x: number; y: number; xValue: string | number; value: number };
export type ChartGeometry = {
  width: number; height: number; plot: { left: number; top: number; right: number; bottom: number };
  yMin: number; yMax: number; yTicks: number[];
  xTicks: Array<{ x: number; label: string }>;
  series: Array<{ id: string; label: string; points: ChartPoint[] }>;
};

function extent(values: number[]) {
  const min = Math.min(...values); const max = Math.max(...values);
  if (min === max) return { min: min - 1, max: max + 1 };
  const pad = (max - min) * 0.08;
  return { min: min - pad, max: max + pad };
}

export function buildChartGeometry(block: ScientificChartBlock, width = 720, height = 360): ChartGeometry {
  const plot = { left: 72, top: 24, right: width - 24, bottom: height - 58 };
  const yValues = block.series.flatMap((series) => series.values);
  const { min: yMin, max: yMax } = extent(yValues);
  const yTicks = Array.from({ length: 6 }, (_, index) => yMin + ((yMax - yMin) * index) / 5);
  const numericX = block.xAxis.values.every((value) => typeof value === "number");
  const xNumbers = numericX ? (block.xAxis.values as number[]) : block.xAxis.values.map((_, index) => index);
  const xExtent = extent(xNumbers);
  const xAt = (value: number, index: number) => numericX
    ? plot.left + ((value - xExtent.min) / (xExtent.max - xExtent.min)) * (plot.right - plot.left)
    : plot.left + (index / Math.max(1, block.xAxis.values.length - 1)) * (plot.right - plot.left);
  const yAt = (value: number) => plot.bottom - ((value - yMin) / (yMax - yMin)) * (plot.bottom - plot.top);
  return {
    width, height, plot, yMin, yMax, yTicks,
    xTicks: block.xAxis.values.map((value, index) => ({ x: xAt(xNumbers[index], index), label: String(value) })),
    series: block.series.map((series) => ({ id: series.id, label: series.label, points: series.values.map((value, index) => ({ x: xAt(xNumbers[index], index), y: yAt(value), xValue: block.xAxis.values[index], value })) })),
  };
}

export type DiagramGeometry = {
  width: number; height: number;
  nodes: Array<{ id: string; label: string; description?: string; x: number; y: number; width: number; height: number }>;
  edges: Array<{ id: string; label?: string; x1: number; y1: number; x2: number; y2: number }>;
};

export function buildDiagramGeometry(block: ScientificDiagramBlock, width = 720): DiagramGeometry {
  const nodeWidth = block.nodes.length > 4 ? 128 : 150;
  const nodeHeight = 62;
  const columns = block.diagramType === "cycle" ? Math.min(3, block.nodes.length) : block.diagramType === "anatomical" ? Math.min(4, block.nodes.length) : Math.min(3, block.nodes.length);
  const rows = Math.ceil(block.nodes.length / columns);
  const gapX = (width - 40 - columns * nodeWidth) / Math.max(1, columns - 1);
  const gapY = 62;
  const nodes = block.nodes.map((node, index) => ({
    ...node, width: nodeWidth, height: nodeHeight,
    x: 20 + (index % columns) * (nodeWidth + gapX),
    y: 24 + Math.floor(index / columns) * (nodeHeight + gapY),
  }));
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const edges = block.edges.flatMap((edge) => {
    const from = byId.get(edge.from); const to = byId.get(edge.to);
    if (!from || !to) return [];
    return [{ id: edge.id, label: edge.label, x1: from.x + from.width / 2, y1: from.y + from.height / 2, x2: to.x + to.width / 2, y2: to.y + to.height / 2 }];
  });
  return { width, height: 48 + rows * nodeHeight + Math.max(0, rows - 1) * gapY, nodes, edges };
}

export function scientificSourceLabels(document: PedagogicalResourceDocument, sourceRefIds: string[]) {
  const references = new Map(document.metadata.references.map((reference) => [reference.id, reference]));
  return sourceRefIds.flatMap((id) => {
    const reference = references.get(id);
    return reference ? [{ id, title: reference.title, publisher: reference.publisher, license: reference.license, status: reference.status }] : [];
  });
}
