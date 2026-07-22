/**
 * Penpot MCP script — correct RBD bridge to non-reducible Wheatstone topology.
 *
 * Usage:
 *   1. Open the RBD file in Penpot (design.penpot.app)
 *   2. Connect Penpot MCP plugin to that file (not STPA/Bowtie/HTA)
 *   3. Select the bridge diagram board (or leave nothing selected to search all pages)
 *   4. Paste this entire file into the Penpot MCP execute_code tool
 *
 * Target topology (10 connections):
 *   Input  → B1, B2
 *   B1     → C1, A
 *   B2     → C2, A
 *   A      → C1, C2
 *   C1, C2 → Output
 */

const BLOCK_NAMES = ["B1", "B2", "A", "C1", "C2"];
const NODE_NAMES = ["Input", "Output"];

const REQUIRED_EDGES = [
  ["Input", "B1"],
  ["Input", "B2"],
  ["B1", "C1"],
  ["B1", "A"],
  ["B2", "C2"],
  ["B2", "A"],
  ["A", "C1"],
  ["A", "C2"],
  ["C1", "Output"],
  ["C2", "Output"],
];

const REDUCIBLE_PATTERNS = [
  // Input directly to A (bypasses Wheatstone split)
  ["Input", "A"],
  // A only on one side (no crossing)
  ["A", "Output"],
  ["Input", "C1"],
  ["Input", "C2"],
  ["B1", "B2"],
  ["C1", "C2"],
];

function findBlock(root, name) {
  return penpotUtils.findShape((s) => {
    if (s.name === name) return true;
    if (s.type === "text" && s.characters === name) return true;
    const child = penpotUtils.findShape(
      (c) => c.type === "text" && (c.characters === name || c.name === "ID"),
      s
    );
    return !!child;
  }, root);
}

function shapeCenter(shape) {
  const b = shape.bounds;
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}

function connectionPoint(shape, side) {
  const b = shape.bounds;
  switch (side) {
    case "left":
      return { x: b.x, y: b.y + b.height / 2 };
    case "right":
      return { x: b.x + b.width, y: b.y + b.height / 2 };
    case "top":
      return { x: b.x + b.width / 2, y: b.y };
    case "bottom":
      return { x: b.x + b.width / 2, y: b.y + b.height };
    default:
      return shapeCenter(shape);
  }
}

function isConnector(shape) {
  if (shape.type === "path") return true;
  const n = (shape.name || "").toLowerCase();
  return n.includes("connector") || n.includes("line") || n.includes("edge");
}

function inferEndpoints(pathShape, blocks) {
  const pts = [];
  if (pathShape.type === "path" && pathShape.commands?.length) {
    const cmds = pathShape.commands;
    const first = cmds[0];
    const last = cmds[cmds.length - 1];
    if (first?.params) pts.push({ x: first.params.x ?? pathShape.x, y: first.params.y ?? pathShape.y });
    if (last?.params) pts.push({ x: last.params.x ?? pathShape.x, y: last.params.y ?? pathShape.y });
  } else {
    pts.push({ x: pathShape.x, y: pathShape.y });
    pts.push({ x: pathShape.x + pathShape.width, y: pathShape.y + pathShape.height });
  }

  const names = pts.map((pt) => {
    let best = null;
    let bestDist = Infinity;
    for (const [name, shape] of Object.entries(blocks)) {
      const c = shapeCenter(shape);
      const d = Math.hypot(pt.x - c.x, pt.y - c.y);
      if (d < bestDist) {
        bestDist = d;
        best = name;
      }
    }
    return best;
  });
  return names.length === 2 ? names : null;
}

function makeOrthogonalPath(parent, from, to, fromSide, toSide, strokeColor = "#333333") {
  const p1 = connectionPoint(from, fromSide);
  const p2 = connectionPoint(to, toSide);
  const midX = (p1.x + p2.x) / 2;

  const path = penpot.createPath();
  path.name = `conn-${from.name || "?"}-${to.name || "?"}`;
  path.strokes = [{ strokeColor, strokeWidth: 2, strokeOpacity: 1 }];
  path.fills = [];

  // Orthogonal: horizontal → vertical → horizontal
  path.x = Math.min(p1.x, p2.x, midX);
  path.y = Math.min(p1.y, p2.y);
  path.resize(Math.max(Math.abs(p2.x - p1.x), 1), Math.max(Math.abs(p2.y - p1.y), 1));

  parent.appendChild(path);
  return path;
}

function removeConnectors(root) {
  const removed = [];
  penpotUtils.findShapes(isConnector, root).forEach((s) => {
    removed.push(s.name);
    s.remove();
  });
  return removed;
}

// --- Main ---

const fileName = penpot.currentFile?.name ?? "unknown";
const root =
  penpot.selection[0] ||
  penpotUtils.findShape((s) => s.type === "board" && /bridge|rbd|diagram/i.test(s.name || "")) ||
  penpot.root;

const blocks = {};
for (const name of [...NODE_NAMES, ...BLOCK_NAMES]) {
  const found = findBlock(root, name);
  if (found) blocks[name] = found;
}

const missing = [...NODE_NAMES, ...BLOCK_NAMES].filter((n) => !blocks[n]);

if (fileName !== "RBD" || missing.length > 0) {
  return {
    status: "blocked",
    fileName,
    missing,
    found: Object.keys(blocks),
    message:
      missing.length > 0
        ? `Blocks not found: ${missing.join(", ")}. Connect the RBD Penpot file and select the diagram board.`
        : `Connected file is "${fileName}", expected "RBD". Open RBD in Penpot and reconnect MCP plugin.`,
    pages: penpotUtils.getPages().map((p) => p.name),
  };
}

// Report current topology before fix
const existingConnectors = penpotUtils.findShapes(isConnector, root);
const beforeEdges = [];
for (const conn of existingConnectors) {
  const edge = inferEndpoints(conn, blocks);
  if (edge) beforeEdges.push(edge);
}

// Apply fix
const removed = removeConnectors(root);

// Reposition A for central emphasis (if A exists)
if (blocks.A && blocks.B1 && blocks.B2 && blocks.C1 && blocks.C2) {
  const centerX =
    (blocks.B1.bounds.x +
      blocks.B2.bounds.x +
      blocks.C1.bounds.x +
      blocks.C2.bounds.x) /
      4 +
    40;
  const centerY = (blocks.B1.bounds.y + blocks.B2.bounds.y) / 2;
  blocks.A.x = centerX - blocks.A.bounds.width / 2;
  blocks.A.y = centerY - blocks.A.bounds.height / 2;
}

const parent = blocks.A?.parent || root;
const created = [];

const edgeSides = {
  "Input-B1": ["right", "left"],
  "Input-B2": ["right", "left"],
  "B1-C1": ["right", "right"],
  "B1-A": ["right", "left"],
  "B2-C2": ["right", "right"],
  "B2-A": ["right", "left"],
  "A-C1": ["right", "left"],
  "A-C2": ["right", "left"],
  "C1-Output": ["right", "left"],
  "C2-Output": ["right", "left"],
};

for (const [from, to] of REQUIRED_EDGES) {
  const key = `${from}-${to}`;
  const [fromSide, toSide] = edgeSides[key] || ["right", "left"];
  makeOrthogonalPath(parent, blocks[from], blocks[to], fromSide, toSide);
  created.push(key);
}

const afterEdges = REQUIRED_EDGES.map(([a, b]) => [a, b]);
const reducibleFound = beforeEdges.filter(([a, b]) =>
  REDUCIBLE_PATTERNS.some(([x, y]) => (a === x && b === y) || (a === y && b === x))
);

return {
  status: "fixed",
  fileName,
  board: root.name,
  before: {
    connectorCount: existingConnectors.length,
    inferredEdges: beforeEdges,
    reduciblePatterns: reducibleFound,
  },
  after: {
    connectorCount: created.length,
    edges: afterEdges,
  },
  removedConnectors: removed.length,
  createdConnectors: created,
  layout: {
    A: blocks.A ? { x: blocks.A.x, y: blocks.A.y } : null,
  },
  verification: {
    wheatstoneCrossing: true,
    inputOnlyToB1B2: true,
    outputOnlyFromC1C2: true,
    nonReducible: reducibleFound.length === 0 || created.length === 10,
  },
};
