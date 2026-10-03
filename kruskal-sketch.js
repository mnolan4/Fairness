// Kruskal's Algorithm: Mycelial Network — global p5.js mode

const CANVAS_W = 1100;
const CANVAS_H = 800;
const GRAPH = { x0: 285, x1: 755, y0: 95, y1: 735 };
const R0 = 1;

let nodes = [];
let candidates = [];
let accepted = [];
let rejected = [];
let fusionPool = [];
let uf;
let edgeIndex = 0;
let phase = "ready";
let playing = false;
let lastStepAt = 0;
let currentEdge = null;
let sourceId = 0;
let targetId = 1;
let endpointTurn = "source";
let cycleFlash = null;
let cycleFlashAt = 0;
let classicalEdges = [];
let classicalMetrics = null;
let fusionBudget = 0;
let fusionSpent = 0;
let damagedEdge = null;
let groupConnectedAt = { A: null, B: null };
let metricsCache = null;
let metricsDirty = true;
let edgeUsageCache = new Map();
let edgeUsageSignature = "";
let graphSeed = 1;

let modeSelect, nodeSlider, densitySlider, speedSlider;
let layoutSelect, resistanceSlider, investmentSlider;
let playButton, stepButton, resetButton, newButton, damageButton;

class UnionFind {
  constructor(n) {
    this.parent = Array.from({ length: n }, (_, i) => i);
    this.rank = Array(n).fill(0);
    this.components = n;
  }

  find(x) {
    if (this.parent[x] !== x) this.parent[x] = this.find(this.parent[x]);
    return this.parent[x];
  }

  union(a, b) {
    let ra = this.find(a);
    let rb = this.find(b);
    if (ra === rb) return false;
    if (this.rank[ra] < this.rank[rb]) [ra, rb] = [rb, ra];
    this.parent[rb] = ra;
    if (this.rank[ra] === this.rank[rb]) this.rank[ra]++;
    this.components--;
    return true;
  }
}

function setup() {
  createCanvas(CANVAS_W, CANVAS_H);
  pixelDensity(min(2, window.devicePixelRatio || 1));
  textFont("Arial");
  createControls();
  newGraph();
}

function createControls() {
  const x = 12;
  let y = 82;
  const gap = 48;

  modeSelect = createSelect();
  modeSelect.option("Classical Kruskal", "classical");
  modeSelect.option("Anastomosis", "anastomosis");
  modeSelect.selected("classical");
  positionControl(modeSelect, x, y, 220);
  modeSelect.changed(resetAlgorithm);

  nodeSlider = createSlider(8, 30, 16, 1);
  positionControl(nodeSlider, x, y += gap, 210);
  nodeSlider.changed(newGraph);

  densitySlider = createSlider(10, 100, 42, 1);
  positionControl(densitySlider, x, y += gap, 210);
  densitySlider.changed(newGraph);

  speedSlider = createSlider(1, 30, 8, 1);
  positionControl(speedSlider, x, y += gap, 210);

  layoutSelect = createSelect();
  layoutSelect.option("Random patches", "random");
  layoutSelect.option("Clustered substrate", "clustered");
  positionControl(layoutSelect, x, y += gap, 220);
  layoutSelect.changed(newGraph);

  resistanceSlider = createSlider(0, 100, 0, 1);
  positionControl(resistanceSlider, x, y += gap, 210);
  resistanceSlider.changed(resetAlgorithm);

  investmentSlider = createSlider(0, 100, 25, 1);
  positionControl(investmentSlider, x, y += gap, 210);
  investmentSlider.changed(resetAlgorithm);

  playButton = createButton("Grow");
  stepButton = createButton("Step");
  resetButton = createButton("Reset");
  newButton = createButton("New graph");
  damageButton = createButton("Cut cord");
  const buttons = [playButton, stepButton, resetButton, newButton, damageButton];
  buttons.forEach((button, i) => {
    button.position(x + (i % 2) * 108, 438 + floor(i / 2) * 35);
    button.size(i === 4 ? 102 : 100, 28);
    styleButton(button);
  });
  playButton.mousePressed(togglePlay);
  stepButton.mousePressed(() => {
    playing = false;
    processStep();
    updatePlayLabel();
  });
  resetButton.mousePressed(resetAlgorithm);
  newButton.mousePressed(newGraph);
  damageButton.mousePressed(toggleDamage);
}

function positionControl(control, x, y, w) {
  control.position(x, y);
  control.style("width", `${w}px`);
  control.style("accent-color", "#d8c58e");
}

function styleButton(button) {
  button.style("background", "#292d27");
  button.style("color", "#e7dfc8");
  button.style("border", "1px solid #60685a");
  button.style("border-radius", "3px");
  button.style("cursor", "pointer");
}

function togglePlay() {
  if (phase === "complete") resetAlgorithm();
  playing = !playing;
  if (playing && phase === "ready") phase = "kruskal";
  updatePlayLabel();
}

function updatePlayLabel() {
  playButton.html(playing ? "Pause" : (phase === "complete" ? "Regrow" : "Grow"));
}

function newGraph() {
  graphSeed = floor(random(1, 1000000000));
  randomSeed(graphSeed);
  noiseSeed(graphSeed);
  nodes = [];
  const n = nodeSlider ? nodeSlider.value() : 16;
  const clustered = layoutSelect && layoutSelect.value() === "clustered";

  for (let i = 0; i < n; i++) {
    let x;
    let y;
    let attempts = 0;
    do {
      if (clustered) {
        const groupB = i >= floor(n / 2);
        x = groupB ? random((GRAPH.x0 + GRAPH.x1) / 2, GRAPH.x1) : random(GRAPH.x0, (GRAPH.x0 + GRAPH.x1) / 2);
        y = random(GRAPH.y0, GRAPH.y1);
      } else {
        x = random(GRAPH.x0, GRAPH.x1);
        y = random(GRAPH.y0, GRAPH.y1);
      }
      attempts++;
    } while (attempts < 80 && nodes.some(p => dist(x, y, p.x, p.y) < 42));

    nodes.push({
      id: i,
      x,
      y,
      group: clustered ? (i < floor(n / 2) ? "A" : "B") : (random() < 0.5 ? "A" : "B"),
      glow: random(0.8, 1.2)
    });
  }

  if (!nodes.some(nod => nod.group === "A")) nodes[0].group = "A";
  if (!nodes.some(nod => nod.group === "B")) nodes[nodes.length - 1].group = "B";
  sourceId = 0;
  targetId = farthestNodeFrom(sourceId);
  buildCandidateGraph();
  resetAlgorithm();
}

function buildCandidateGraph() {
  const all = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const length = dist(nodes[i].x, nodes[i].y, nodes[j].x, nodes[j].y);
      all.push(makeEdge(i, j, length));
    }
  }
  all.sort((a, b) => a.length - b.length);

  const connector = new UnionFind(nodes.length);
  const required = [];
  for (const edge of all) {
    if (connector.union(edge.a, edge.b)) required.push(edge.key);
    if (required.length === nodes.length - 1) break;
  }

  const minCount = nodes.length - 1;
  const targetCount = floor(map(densitySlider.value(), 10, 100, minCount, all.length));
  const chosen = new Set(required);
  for (const edge of all) {
    if (chosen.size >= targetCount) break;
    chosen.add(edge.key);
  }
  candidates = all.filter(edge => chosen.has(edge.key));
}

function makeEdge(a, b, length) {
  return {
    a,
    b,
    length,
    key: `${min(a, b)}-${max(a, b)}`,
    cost: length,
    acceptedAs: null,
    order: null
  };
}

function farthestNodeFrom(id) {
  let best = id === 0 ? 1 : 0;
  let bestD = -1;
  for (const node of nodes) {
    const d = dist(nodes[id].x, nodes[id].y, node.x, node.y);
    if (node.id !== id && d > bestD) {
      bestD = d;
      best = node.id;
    }
  }
  return best;
}

function resetAlgorithm() {
  randomSeed(graphSeed);
  const gamma = resistanceSlider.value() / 100;
  for (const edge of candidates) {
    const resistantEnds = (nodes[edge.a].group === "B" ? 1 : 0) + (nodes[edge.b].group === "B" ? 1 : 0);
    edge.cost = edge.length * (1 + gamma * resistantEnds / 2);
    edge.acceptedAs = null;
    edge.order = null;
  }
  candidates.sort((a, b) => a.cost - b.cost || a.length - b.length);
  accepted = [];
  rejected = [];
  fusionPool = [];
  classicalEdges = [];
  classicalMetrics = null;
  uf = new UnionFind(nodes.length);
  edgeIndex = 0;
  phase = "ready";
  playing = false;
  currentEdge = null;
  cycleFlash = null;
  fusionBudget = 0;
  fusionSpent = 0;
  damagedEdge = null;
  groupConnectedAt = { A: null, B: null };
  metricsDirty = true;
  edgeUsageCache = new Map();
  edgeUsageSignature = "";
  endpointTurn = "source";
  updatePlayLabel();
  damageButton.html("Cut cord");
}

function draw() {
  drawSubstrate();
  if (playing && millis() - lastStepAt >= 1000 / speedSlider.value()) {
    processStep();
    lastStepAt = millis();
  }
  drawTitle();
  drawCandidateEdges();
  drawAcceptedEdges();
  drawCurrentEdge();
  drawNodes();
  drawNutrientPulse();
  drawControls();
  drawMetrics();
  drawLegend();
  drawInfoHint();
}

function drawSubstrate() {
  background(20, 24, 19);
  noStroke();
  randomSeed(917);
  for (let i = 0; i < 170; i++) {
    const x = random(width);
    const y = random(height);
    const s = random(15, 85);
    fill(70, 78, 59, random(3, 12));
    ellipse(x, y, s * 1.8, s);
  }
  fill(12, 16, 12, 155);
  rect(GRAPH.x0 - 18, GRAPH.y0 - 25, GRAPH.x1 - GRAPH.x0 + 36, GRAPH.y1 - GRAPH.y0 + 45, 18);
}

function drawTitle() {
  noStroke();
  fill(238, 232, 211);
  textStyle(BOLD);
  textSize(18);
  text("Kruskal’s Algorithm: Mycelial Network", 286, 34);
  fill(161, 169, 146);
  textStyle(NORMAL);
  textSize(11);
  const subtitle = modeSelect.value() === "classical"
    ? "Minimum-biomass tree · every cycle is recycled"
    : "Tree growth followed by benefit/cost anastomosis";
  text(subtitle, 286, 52);
}

function drawCandidateEdges() {
  for (const edge of candidates) {
    if (accepted.includes(edge) || edge === currentEdge) continue;
    const wasRejected = rejected.includes(edge);
    const alpha = wasRejected ? 13 : 21;
    stroke(wasRejected ? 151 : 132, wasRejected ? 88 : 142, wasRejected ? 65 : 124, alpha);
    strokeWeight(0.75);
    line(nodes[edge.a].x, nodes[edge.a].y, nodes[edge.b].x, nodes[edge.b].y);
  }
}

function drawAcceptedEdges() {
  const active = activeEdges();
  const route = shortestPath(sourceId, targetId, active);
  const routeKeys = new Set(route.edges.map(edge => edge.key));

  for (const edge of accepted) {
    const isDamaged = damagedEdge && damagedEdge.key === edge.key;
    const isFusion = edge.acceptedAs === "fusion";
    const inRoute = routeKeys.has(edge.key) && !isDamaged;
    const pathUse = getEdgeUsage(edge, active);
    const thickness = 1.4 + 3.8 * pow(pathUse, 0.7);
    if (isDamaged) {
      stroke(210, 84, 68, 120);
      strokeWeight(2);
      drawOrganicEdge(edge, true);
      continue;
    }
    if (inRoute) stroke(244, 194, 74, 235);
    else if (isFusion) stroke(122, 212, 203, 220);
    else stroke(229, 219, 185, 205);
    strokeWeight(inRoute ? thickness + 1.5 : thickness);
    drawOrganicEdge(edge, false);
    if (!inRoute && !isFusion) drawBranchHairs(edge, thickness);
  }
}

function drawOrganicEdge(edge, broken) {
  const a = nodes[edge.a];
  const b = nodes[edge.b];
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = max(1, sqrt(dx * dx + dy * dy));
  const nx = -dy / len;
  const ny = dx / len;
  const segments = 14;
  noFill();
  beginShape();
  for (let i = 0; i <= segments; i++) {
    if (broken && i > 5 && i < 9) continue;
    const t = i / segments;
    const wave = sin(t * TWO_PI * 2 + edge.a * 1.7 + edge.b) * min(3, edge.length * 0.01) * sin(PI * t);
    vertex(lerp(a.x, b.x, t) + nx * wave, lerp(a.y, b.y, t) + ny * wave);
  }
  endShape();
}

function drawBranchHairs(edge, thickness) {
  if (thickness < 2.1) return;
  const a = nodes[edge.a];
  const b = nodes[edge.b];
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = max(1, sqrt(dx * dx + dy * dy));
  const nx = -dy / len;
  const ny = dx / len;
  stroke(225, 218, 188, 70);
  strokeWeight(0.6);
  for (let i = 1; i <= 3; i++) {
    const t = (i + 0.3) / 4;
    const sign = i % 2 ? 1 : -1;
    const x = lerp(a.x, b.x, t);
    const y = lerp(a.y, b.y, t);
    line(x, y, x + nx * 7 * sign + dx / len * 3, y + ny * 7 * sign + dy / len * 3);
  }
}

function drawCurrentEdge() {
  if (!currentEdge) return;
  const age = constrain((millis() - lastStepAt) / max(100, 1000 / speedSlider.value()), 0, 1);
  const a = nodes[currentEdge.a];
  const b = nodes[currentEdge.b];
  const isFusion = phase === "fusing";
  stroke(isFusion ? color(125, 230, 218, 240) : color(197, 237, 242, 235));
  strokeWeight(3);
  line(a.x, a.y, lerp(a.x, b.x, age), lerp(a.y, b.y, age));
  if (cycleFlash === currentEdge && millis() - cycleFlashAt < 420) {
    stroke(238, 116, 64, map(millis() - cycleFlashAt, 0, 420, 230, 0));
    strokeWeight(5);
    line(a.x, a.y, b.x, b.y);
  }
}

function drawNodes() {
  const metrics = getMetrics();
  let minBurden = Infinity;
  let maxBurden = -Infinity;
  if (metrics.burdens.length) {
    minBurden = min(metrics.burdens);
    maxBurden = max(metrics.burdens);
  }
  for (const node of nodes) {
    const burden = metrics.burdens[node.id];
    const t = Number.isFinite(burden) && maxBurden > minBurden
      ? map(burden, minBurden, maxBurden, 0, 1)
      : 0.5;
    noStroke();
    fill(205, 92, 62, 12 + 24 * t);
    ellipse(node.x, node.y, 35 + 18 * t);
    drawingContext.shadowBlur = 12;
    drawingContext.shadowColor = node.group === "A" ? "rgba(203,184,112,.65)" : "rgba(142,112,82,.65)";
    fill(node.group === "A" ? color(202, 178, 102) : color(136, 101, 71));
    ellipse(node.x, node.y, 17 * node.glow, 15 * node.glow);
    drawingContext.shadowBlur = 0;
    stroke(243, 235, 204, 155);
    strokeWeight(1);
    noFill();
    ellipse(node.x, node.y, 20, 18);
    noStroke();
    fill(17, 20, 15);
    textAlign(CENTER, CENTER);
    textStyle(BOLD);
    textSize(9);
    text(node.id, node.x, node.y + 1);
    if (node.id === sourceId || node.id === targetId) {
      fill(node.id === sourceId ? color(115, 232, 183) : color(247, 190, 72));
      textSize(12);
      text(node.id === sourceId ? "S" : "E", node.x, node.y - 19);
    }
  }
  textAlign(LEFT, BASELINE);
  textStyle(NORMAL);
}

function drawNutrientPulse() {
  if (accepted.length < 1) return;
  const route = shortestPath(sourceId, targetId, activeEdges());
  if (!route.connected || route.edges.length === 0) return;
  const total = route.edges.reduce((sum, edge) => sum + edge.length, 0);
  let travel = ((millis() * 0.055) % total);
  for (const edge of route.edges) {
    if (travel <= edge.length) {
      const from = edge.pathFrom;
      const to = edge.a === from ? edge.b : edge.a;
      const t = travel / edge.length;
      const a = nodes[from];
      const b = nodes[to];
      noStroke();
      fill(255, 218, 91, 235);
      drawingContext.shadowBlur = 13;
      drawingContext.shadowColor = "rgba(255,210,70,.9)";
      ellipse(lerp(a.x, b.x, t), lerp(a.y, b.y, t), 7);
      drawingContext.shadowBlur = 0;
      break;
    }
    travel -= edge.length;
  }
}

function processStep() {
  if (phase === "ready") phase = "kruskal";
  if (phase === "kruskal") {
    if (accepted.length >= nodes.length - 1 || edgeIndex >= candidates.length) {
      finishTreePhase();
      return;
    }
    const edge = candidates[edgeIndex++];
    currentEdge = edge;
    if (uf.union(edge.a, edge.b)) {
      edge.acceptedAs = "tree";
      edge.order = accepted.length;
      accepted.push(edge);
      updateGroupConnectionTiming();
      metricsDirty = true;
    } else {
      rejected.push(edge);
      cycleFlash = edge;
      cycleFlashAt = millis();
    }
    if (accepted.length >= nodes.length - 1) finishTreePhase();
    return;
  }
  if (phase === "fusing") processFusionStep();
}

function finishTreePhase() {
  classicalEdges = [...accepted];
  currentEdge = null;
  metricsDirty = true;
  classicalMetrics = calculateNetworkMetrics(classicalEdges);
  fusionPool = candidates.filter(edge => !accepted.includes(edge));
  fusionBudget = classicalEdges.reduce((sum, edge) => sum + edge.length, 0) * investmentSlider.value() / 100;
  fusionSpent = 0;
  if (modeSelect.value() === "anastomosis" && fusionBudget > 0 && fusionPool.length) {
    phase = "fusing";
  } else {
    completeRun();
  }
}

function processFusionStep() {
  const remaining = fusionBudget - fusionSpent;
  const currentMean = meanEffectiveResistance(accepted);
  let best = null;
  for (const edge of fusionPool) {
    if (edge.length > remaining + 1e-6) continue;
    const nextMean = meanEffectiveResistance([...accepted, edge]);
    const score = (currentMean - nextMean) / edge.length;
    if (score > 1e-10 && (!best || score > best.score)) best = { edge, score };
  }
  if (!best) {
    completeRun();
    return;
  }
  currentEdge = best.edge;
  best.edge.acceptedAs = "fusion";
  best.edge.order = accepted.length;
  accepted.push(best.edge);
  fusionSpent += best.edge.length;
  fusionPool = fusionPool.filter(edge => edge !== best.edge);
  metricsDirty = true;
  if (!fusionPool.length || fusionBudget - fusionSpent < min(fusionPool.map(edge => edge.length))) completeRun();
}

function completeRun() {
  phase = "complete";
  playing = false;
  currentEdge = null;
  metricsDirty = true;
  updatePlayLabel();
}

function updateGroupConnectionTiming() {
  for (const group of ["A", "B"]) {
    if (groupConnectedAt[group] !== null) continue;
    const ids = nodes.filter(node => node.group === group).map(node => node.id);
    if (ids.length && ids.every(id => uf.find(id) === uf.find(ids[0]))) {
      groupConnectedAt[group] = edgeIndex;
    }
  }
}

function activeEdges() {
  return damagedEdge ? accepted.filter(edge => edge !== damagedEdge) : [...accepted];
}

function toggleDamage() {
  if (damagedEdge) {
    damagedEdge = null;
    damageButton.html("Cut cord");
    metricsDirty = true;
    return;
  }
  if (!accepted.length) return;
  let worst = null;
  for (const edge of accepted) {
    const remaining = accepted.filter(item => item !== edge);
    const retained = reachableCount(sourceId, remaining);
    const damage = nodes.length - retained;
    const increase = isConnectedGraph(remaining) ? meanEffectiveResistance(remaining) : 1e6 + damage;
    if (!worst || damage > worst.damage || (damage === worst.damage && increase > worst.increase)) {
      worst = { edge, damage, increase };
    }
  }
  damagedEdge = worst.edge;
  damageButton.html("Repair cord");
  metricsDirty = true;
}

function calculateNetworkMetrics(edges) {
  const connected = isConnectedGraph(edges);
  const route = shortestPath(sourceId, targetId, edges);
  const burdens = connected ? effectiveResistanceBurden(edges) : [];
  const meanBurden = burdens.length ? average(burdens) : Infinity;
  const groupA = burdens.filter((_, i) => nodes[i].group === "A");
  const groupB = burdens.filter((_, i) => nodes[i].group === "B");
  const meanA = groupA.length ? average(groupA) : Infinity;
  const meanB = groupB.length ? average(groupB) : Infinity;
  const disparity = Number.isFinite(meanA + meanB) ? abs(meanA - meanB) / max(1e-9, meanA + meanB) : 1;
  const degrees = nodes.map(node => edges.filter(edge => edge.a === node.id || edge.b === node.id).length);
  return {
    connected,
    route,
    burdens,
    meanBurden,
    gini: burdens.length ? gini(burdens) : 1,
    degreeGini: gini(degrees),
    meanA,
    meanB,
    disparity,
    biomass: edges.reduce((sum, edge) => sum + PI * R0 * R0 * edge.length, 0),
    efficiency: Number.isFinite(meanBurden) && meanBurden > 0 ? 1 / meanBurden : 0,
    loopRank: edges.length - nodes.length + (connected ? 1 : countComponents(edges)),
    retained: reachableCount(sourceId, edges) / nodes.length
  };
}

function getMetrics() {
  if (!metricsDirty && metricsCache) return metricsCache;
  metricsCache = calculateNetworkMetrics(activeEdges());
  metricsDirty = false;
  return metricsCache;
}

function effectiveResistanceBurden(edges) {
  const matrix = effectiveResistanceMatrix(edges);
  if (!matrix) return [];
  return matrix.map((row, i) => row.reduce((sum, value, j) => sum + (i === j ? 0 : value), 0) / (nodes.length - 1));
}

function meanEffectiveResistance(edges) {
  const matrix = effectiveResistanceMatrix(edges);
  if (!matrix) return Infinity;
  let sum = 0;
  let count = 0;
  for (let i = 0; i < matrix.length; i++) {
    for (let j = i + 1; j < matrix.length; j++) {
      sum += matrix[i][j];
      count++;
    }
  }
  return count ? sum / count : Infinity;
}

function effectiveResistanceMatrix(edges) {
  const n = nodes.length;
  if (n < 2 || !isConnectedGraph(edges)) return null;
  const lap = Array.from({ length: n }, () => Array(n).fill(0));
  for (const edge of edges) {
    const conductance = 1 / max(1e-6, edge.length);
    lap[edge.a][edge.a] += conductance;
    lap[edge.b][edge.b] += conductance;
    lap[edge.a][edge.b] -= conductance;
    lap[edge.b][edge.a] -= conductance;
  }
  const reduced = lap.slice(0, n - 1).map(row => row.slice(0, n - 1));
  const inverse = invertMatrix(reduced);
  if (!inverse) return null;
  const result = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      let resistance;
      if (j === n - 1) resistance = inverse[i][i];
      else resistance = inverse[i][i] + inverse[j][j] - 2 * inverse[i][j];
      result[i][j] = result[j][i] = max(0, resistance);
    }
  }
  return result;
}

function invertMatrix(matrix) {
  const n = matrix.length;
  const aug = matrix.map((row, i) => [...row, ...Array.from({ length: n }, (_, j) => i === j ? 1 : 0)]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let row = col + 1; row < n; row++) {
      if (abs(aug[row][col]) > abs(aug[pivot][col])) pivot = row;
    }
    if (abs(aug[pivot][col]) < 1e-12) return null;
    [aug[col], aug[pivot]] = [aug[pivot], aug[col]];
    const scale = aug[col][col];
    for (let j = 0; j < 2 * n; j++) aug[col][j] /= scale;
    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = aug[row][col];
      for (let j = 0; j < 2 * n; j++) aug[row][j] -= factor * aug[col][j];
    }
  }
  return aug.map(row => row.slice(n));
}

function shortestPath(start, goal, edges) {
  const adjacency = Array.from({ length: nodes.length }, () => []);
  for (const edge of edges) {
    adjacency[edge.a].push({ id: edge.b, edge, weight: edge.length });
    adjacency[edge.b].push({ id: edge.a, edge, weight: edge.length });
  }
  const d = Array(nodes.length).fill(Infinity);
  const previous = Array(nodes.length).fill(null);
  const visited = new Set();
  d[start] = 0;
  while (visited.size < nodes.length) {
    let u = -1;
    let best = Infinity;
    for (let i = 0; i < nodes.length; i++) {
      if (!visited.has(i) && d[i] < best) {
        best = d[i];
        u = i;
      }
    }
    if (u < 0 || u === goal) break;
    visited.add(u);
    for (const next of adjacency[u]) {
      const alt = d[u] + next.weight;
      if (alt < d[next.id]) {
        d[next.id] = alt;
        previous[next.id] = { node: u, edge: next.edge };
      }
    }
  }
  if (!Number.isFinite(d[goal])) return { connected: false, cost: Infinity, edges: [] };
  const routeEdges = [];
  let cursor = goal;
  while (cursor !== start) {
    const item = previous[cursor];
    if (!item) break;
    item.edge.pathFrom = item.node;
    routeEdges.unshift(item.edge);
    cursor = item.node;
  }
  return { connected: true, cost: d[goal], edges: routeEdges };
}

function isConnectedGraph(edges) {
  return reachableCount(0, edges) === nodes.length;
}

function reachableCount(start, edges) {
  const adjacency = Array.from({ length: nodes.length }, () => []);
  for (const edge of edges) {
    adjacency[edge.a].push(edge.b);
    adjacency[edge.b].push(edge.a);
  }
  const seen = new Set([start]);
  const queue = [start];
  while (queue.length) {
    const current = queue.shift();
    for (const next of adjacency[current]) {
      if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  return seen.size;
}

function countComponents(edges) {
  const join = new UnionFind(nodes.length);
  edges.forEach(edge => join.union(edge.a, edge.b));
  return join.components;
}

function getEdgeUsage(edge, edges) {
  const signature = edges.map(item => item.key).sort().join("|");
  if (signature !== edgeUsageSignature) {
    edgeUsageCache = new Map(edges.map(item => [item.key, 0]));
    const pairs = nodes.length * (nodes.length - 1) / 2;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const route = shortestPath(i, j, edges);
        for (const used of route.edges) {
          edgeUsageCache.set(used.key, (edgeUsageCache.get(used.key) || 0) + 1 / pairs);
        }
      }
    }
    edgeUsageSignature = signature;
  }
  return edgeUsageCache.get(edge.key) || 0;
}

function gini(values) {
  if (!values.length) return 0;
  const mean = average(values);
  if (mean <= 1e-12) return 0;
  let difference = 0;
  for (const a of values) for (const b of values) difference += abs(a - b);
  return difference / (2 * values.length * values.length * mean);
}

function average(values) {
  return values.reduce((sum, value) => sum + value, 0) / max(1, values.length);
}

function drawControls() {
  fill(235, 229, 207);
  noStroke();
  textStyle(BOLD);
  textSize(13);
  text("GROWTH CONTROLS", 12, 64);
  textStyle(NORMAL);
  textSize(10);
  fill(181, 190, 167);
  const labels = [
    ["Growth mode", 78],
    [`Nutrient patches: ${nodeSlider.value()}`, 126],
    [`Candidate density: ${densitySlider.value()}%`, 174],
    [`Growth speed: ${speedSlider.value()} edges/s`, 222],
    ["Patch distribution", 270],
    [`Substrate resistance: ${resistanceSlider.value()}%`, 318],
    [`Anastomosis investment: ${investmentSlider.value()}%`, 366]
  ];
  labels.forEach(([label, y]) => text(label, 12, y));
  if (modeSelect.value() !== "anastomosis") {
    fill(20, 24, 19, 155);
    rect(8, 365, 228, 33);
  }
  fill(156, 165, 145);
  text("Click patches to assign S, then E.", 12, 558);
  text("Cut cord tests worst single-edge damage.", 12, 575);
  const current = currentEdge ? `${currentEdge.a}–${currentEdge.b}` : "—";
  text(`Current cord: ${current}`, 12, 604);
  text(`Graph seed: ${graphSeed}`, 12, 620);
}

function drawMetrics() {
  const m = getMetrics();
  const modeResult = damagedEdge ? calculateNetworkMetrics(accepted) : m;
  drawPanel(775, 70, 310, 306, "NETWORK METRICS");
  let y = 105;
  const stateName = phase === "kruskal" ? "Building tree" : phase === "fusing" ? "Fusing" : capitalize(phase);
  metricLine("State", stateName, y); y += 18;
  metricLine("Edges processed", `${edgeIndex} / ${candidates.length}`, y); y += 18;
  metricLine("Tree cords", `${min(accepted.length, nodes.length - 1)} / ${nodes.length - 1}`, y); y += 18;
  metricLine("Cycle rejections", `${rejected.length}`, y); y += 18;
  metricLine("Components", `${countComponents(activeEdges())}`, y); y += 18;
  metricLine("Anastomoses", `${accepted.filter(edge => edge.acceptedAs === "fusion").length}`, y); y += 18;
  metricLine("Loop rank", `${max(0, m.loopRank)}`, y); y += 18;
  metricLine("Biomass", formatNumber(m.biomass), y); y += 18;
  metricLine("Transport efficiency", formatNumber(m.efficiency), y); y += 18;
  metricLine("Structural bias (Gini)", formatNumber(m.gini), y); y += 18;
  metricLine("Degree concentration", formatNumber(m.degreeGini), y); y += 18;
  metricLine("Group disparity", formatNumber(m.disparity), y); y += 18;
  metricLine("Damage retention", `${(m.retained * 100).toFixed(0)}%`, y);
  progressBar(790, 346, 278, accepted.length / max(1, nodes.length - 1), phase === "fusing" ? color(105, 207, 195) : color(224, 199, 120));

  drawPanel(775, 390, 310, 230, "SELECTED ROUTE & COMPARISON");
  y = 425;
  metricLine("Route", `S${sourceId} → E${targetId}`, y); y += 18;
  metricLine("Connection", m.route.connected ? "Connected" : "Disconnected", y); y += 18;
  metricLine("Route biomass length", m.route.connected ? formatNumber(m.route.cost) : "—", y); y += 18;
  metricLine("Route hops", m.route.connected ? `${m.route.edges.length}` : "—", y); y += 18;
  const direct = dist(nodes[sourceId].x, nodes[sourceId].y, nodes[targetId].x, nodes[targetId].y);
  metricLine("Route stretch", m.route.connected ? formatNumber(m.route.cost / direct) : "—", y); y += 18;
  metricLine("Fertile burden", formatNumber(m.meanA), y); y += 18;
  metricLine("Resistant burden", formatNumber(m.meanB), y); y += 18;

  if (classicalMetrics && accepted.length >= nodes.length - 1) {
    const efficiencyDelta = percentDelta(modeResult.efficiency, classicalMetrics.efficiency);
    const biasDelta = percentDelta(modeResult.gini, classicalMetrics.gini);
    const biomassDelta = percentDelta(modeResult.biomass, classicalMetrics.biomass);
    metricLine("vs tree: efficiency", efficiencyDelta, y); y += 18;
    metricLine("vs tree: bias", biasDelta, y); y += 18;
    metricLine("vs tree: biomass", biomassDelta, y);
  }

  if (modeSelect.value() === "anastomosis") {
    const ratio = fusionBudget > 0 ? fusionSpent / fusionBudget : 0;
    fill(155, 166, 146);
    textSize(9);
    text("FUSION BIOMASS BUDGET", 790, 597);
    progressBar(790, 604, 278, ratio, color(105, 207, 195));
  }
}

function drawPanel(x, y, w, h, title) {
  fill(238, 234, 220, 236);
  stroke(91, 99, 82, 175);
  strokeWeight(1);
  rect(x, y, w, h, 7);
  noStroke();
  fill(29, 34, 27);
  textStyle(BOLD);
  textSize(12);
  text(title, x + 15, y + 22);
  textStyle(NORMAL);
}

function metricLine(label, value, y) {
  fill(73, 80, 66);
  textSize(10);
  text(label, 790, y);
  fill(24, 29, 22);
  textAlign(RIGHT);
  text(value, 1068, y);
  textAlign(LEFT);
}

function progressBar(x, y, w, ratio, barColor) {
  noStroke();
  fill(42, 47, 39, 90);
  rect(x, y, w, 7, 3);
  fill(barColor);
  rect(x, y, w * constrain(ratio, 0, 1), 7, 3);
}

function drawLegend() {
  const y = 684;
  fill(175, 184, 164);
  textSize(9);
  text("candidate", 785, y);
  stroke(132, 142, 124, 80); line(785, y + 8, 820, y + 8);
  noStroke(); text("tree hypha", 840, y);
  stroke(229, 219, 185); strokeWeight(2); line(840, y + 8, 875, y + 8);
  noStroke(); text("anastomosis", 895, y);
  stroke(122, 212, 203); strokeWeight(3); line(895, y + 8, 930, y + 8);
  noStroke(); text("nutrient route", 950, y);
  stroke(244, 194, 74); strokeWeight(3); line(950, y + 8, 985, y + 8);
  noStroke();
  fill(146, 154, 138);
  text("Classical mode is Kruskal. Anastomosis is a benefit/cost extension.", 785, 721);
  text("Effective resistance includes parallel flow through loops.", 785, 738);
}

function drawInfoHint() {
  const over = mouseX > 1055 && mouseX < 1085 && mouseY > 40 && mouseY < 67;
  fill(over ? 233 : 175, over ? 220 : 192, over ? 177 : 143);
  noStroke();
  textSize(17);
  textStyle(BOLD);
  text("ⓘ", 1058, 59);
  textStyle(NORMAL);
  if (!over) return;
  fill(11, 14, 10, 245);
  stroke(136, 151, 124);
  rect(620, 74, 455, 287, 8);
  noStroke();
  fill(239, 234, 215);
  textSize(11);
  textStyle(BOLD);
  text("MODEL NOTES", 638, 98);
  textStyle(NORMAL);
  const notes = [
    "Classical Kruskal sorts cords by resistance-adjusted construction cost",
    "and accepts a cord only when it joins two separate components.",
    "",
    "Anastomosis begins from that same minimum spanning tree. It then",
    "adds rejected cords that most reduce mean all-pairs effective resistance",
    "per unit of added biomass, within the selected investment budget.",
    "",
    "Structural bias is the Gini coefficient of each patch’s mean effective",
    "resistance to all other patches. Effective resistance represents parallel",
    "flow, so loops can improve access and resilience beyond a shortest path.",
    "",
    "This is a network-design metaphor, not a mechanistic fungal simulation:",
    "living fungi make distributed local responses rather than global rankings."
  ];
  let y = 121;
  for (const line of notes) {
    text(line, 638, y);
    y += 17;
  }
}

function formatNumber(value) {
  return Number.isFinite(value) ? value.toFixed(value >= 100 ? 1 : 3) : "—";
}

function percentDelta(value, baseline) {
  if (!Number.isFinite(value) || !Number.isFinite(baseline) || abs(baseline) < 1e-12) return "—";
  const delta = 100 * (value - baseline) / baseline;
  return `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}%`;
}

function capitalize(value) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : "";
}

function mousePressed() {
  if (mouseX < GRAPH.x0 - 20 || mouseX > GRAPH.x1 + 20 || mouseY < GRAPH.y0 - 20 || mouseY > GRAPH.y1 + 20) return;
  let nearest = null;
  let nearestDistance = 22;
  for (const node of nodes) {
    const d = dist(mouseX, mouseY, node.x, node.y);
    if (d < nearestDistance) {
      nearest = node;
      nearestDistance = d;
    }
  }
  if (!nearest) return;
  if (endpointTurn === "source") {
    sourceId = nearest.id;
    if (targetId === sourceId) targetId = farthestNodeFrom(sourceId);
    endpointTurn = "target";
  } else {
    targetId = nearest.id;
    if (targetId === sourceId) sourceId = farthestNodeFrom(targetId);
    endpointTurn = "source";
  }
  metricsDirty = true;
}
