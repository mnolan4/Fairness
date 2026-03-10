// Cytoneme-Constrained Diffusion with Fairness Residuals
// Using global p5.js mode
//
// This model demonstrates fairness through cytoneme-constrained diffusion with fairness residuals.
// Nodes have resource p[i] and demand d[i], with excess/deficit e[i] = p[i] - d[i].
// Four fairness modes modify dynamics through residual terms r[i]:
// 1) Demand Matching, 2) Threshold Parity, 3) Worst-Off Minimization, 4) Hybrid
//
// Key parameters:
// - p[i]: resource level at node i
// - d[i]: demand at node i
// - e[i] = p[i] - d[i]: excess/deficit
// - A[j][i]: directed adjacency matrix (0 or 1)
// - D[j][i]: conductance (edge strength)
// - r[i]: fairness residual (mode-dependent)
// - λ: fairness strength

let sim;
let isPlaying = true;
let stepCount = 0;

// UI Controls
let modeSelect;
let dtSlider, lambdaSlider, kSlider, tauSlider, alphaSlider;
let diffusionStrengthSlider, graphDensitySlider;
let beta1Slider, beta2Slider, beta3Slider;
let resetButton, randomizeDemandsButton, randomizeEdgesButton;
let playPauseButton, stepButton;
let showEdgesToggle, showLabelsToggle, showUnderservedToggle, manualWeightsToggle;

// Metrics history
let maxUnderserviceHistory = [];
let fractionBelowThresholdHistory = [];
let meanAbsEHistory = [];
let maxHistoryLength = 300;

// Info box state
let infoBoxOpen = false;
let infoBoxScrollOffset = 0;
let cachedWrappedText = null;

// Helper functions
function softplus(x, k) {
  // softplus(x) = ln(1 + exp(k*x)) / k
  if (k === 0) return max(0, x);
  return Math.log(1 + Math.exp(k * x)) / k;
}

function sigmoid(x) {
  // sigmoid(x) = 1 / (1 + exp(-x))
  return 1 / (1 + Math.exp(-x));
}

// Node class
class Node {
  constructor(x, y, id) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.p = random(0.5, 1.5); // Initial resource level
    this.d = random(0.5, 1.5); // Demand
    this.e = 0; // Excess/deficit (calculated)
    this.w = 1.0; // Weight (default 1.0)
    this.isSource = false;
    this.s = 0; // Source term
    this.u = 0; // Usage/consumption
  }
  
  setSource(sourceStrength) {
    this.isSource = true;
    this.s = sourceStrength;
  }
  
  updateE() {
    this.e = this.p - this.d;
  }
}

// Edge class
class Edge {
  constructor(sourceNode, targetNode) {
    this.source = sourceNode;
    this.target = targetNode;
    this.A = 1; // Adjacency (0 or 1)
    this.D = 0.5 + random(0.5); // Conductance (edge strength)
    this.length = dist(sourceNode.x, sourceNode.y, targetNode.x, targetNode.y);
  }
  
  getFlux() {
    // Flux along edge: D[j][i] * (p[j] - p[i])
    return this.D * (this.source.p - this.target.p);
  }
}

// Simulation class
class Simulation {
  constructor() {
    this.nodes = [];
    this.edges = [];
    this.p = []; // Resource levels (synced with nodes)
    this.d = []; // Demands (synced with nodes)
    this.e = []; // Excess/deficit (synced with nodes)
    this.mode = 'DemandMatching';
    this.lambda = 0.1;
    this.k = 1.0;
    this.tau = 1.0;
    this.alpha = 0.1;
    this.dt = 0.01;
    this.diffusionStrength = 1.0;
    this.beta1 = 0.33;
    this.beta2 = 0.33;
    this.beta3 = 0.34;
    this.useManualWeights = false;
    this.layoutType = 'random'; // 'random' or 'grid'
    this.seed = null;
  }
  
  init(nodeCount, edgeProbability, layoutType) {
    this.nodes = [];
    this.edges = [];
    this.layoutType = layoutType || 'random';
    
    // Create nodes
    if (this.layoutType === 'grid') {
      const cols = ceil(sqrt(nodeCount));
      const rows = ceil(nodeCount / cols);
      const spacingX = (width - 200) / (cols + 1);
      const spacingY = (height - 200) / (rows + 1);
      
      for (let i = 0; i < nodeCount; i++) {
        const col = i % cols;
        const row = floor(i / cols);
        const x = 100 + spacingX * (col + 1);
        const y = 100 + spacingY * (row + 1);
        this.nodes.push(new Node(x, y, i));
      }
    } else {
      // Random layout
      for (let i = 0; i < nodeCount; i++) {
        let x, y;
        let attempts = 0;
        do {
          x = random(100, width - 100);
          y = random(100, height - 100);
          attempts++;
        } while (attempts < 50 && this.nodes.some(n => dist(x, y, n.x, n.y) < 40));
        
        this.nodes.push(new Node(x, y, i));
      }
    }
    
    // Initialize demands
    for (let node of this.nodes) {
      node.d = random(0.5, 2.0);
      node.p = random(0.3, 1.5);
      node.updateE();
    }
    
    // Create edges based on probability
    for (let i = 0; i < this.nodes.length; i++) {
      for (let j = 0; j < this.nodes.length; j++) {
        if (i !== j && random() < edgeProbability) {
          this.edges.push(new Edge(this.nodes[i], this.nodes[j]));
        }
      }
    }
    
    // Sync arrays
    this.syncArrays();
  }
  
  syncArrays() {
    this.p = this.nodes.map(n => n.p);
    this.d = this.nodes.map(n => n.d);
    this.e = this.nodes.map(n => n.e);
  }
  
  step() {
    const dt = this.dt;
    stepCount++;
    
    // Update e[i] = p[i] - d[i]
    for (let node of this.nodes) {
      node.updateE();
    }
    this.syncArrays();
    
    // Calculate fairness residuals r[i] based on mode
    const r = this.calculateResiduals();
    
    // Calculate dp[i]/dt for each node
    const dp = new Array(this.nodes.length).fill(0);
    
    for (let i = 0; i < this.nodes.length; i++) {
      const node = this.nodes[i];
      
      // Diffusion term: Σ_j A[j][i] * D[j][i] * (p[j] - p[i])
      for (let edge of this.edges) {
        if (edge.target === node) {
          // Edge j→i exists
          const flux = this.diffusionStrength * edge.D * (edge.source.p - node.p);
          dp[i] += flux;
        }
      }
      
      // Source term: s[i]
      if (node.isSource) {
        dp[i] += node.s;
      }
      
      // Usage term: -u[i] (simplified: proportional to p)
      dp[i] -= 0.1 * node.p; // Simple consumption model
      
      // Fairness residual term: -λ * r[i]
      dp[i] -= this.lambda * r[i];
    }
    
    // Apply Euler step: p[i] += dt * dp[i]/dt
    for (let i = 0; i < this.nodes.length; i++) {
      this.nodes[i].p = max(0, this.nodes[i].p + dt * dp[i]);
      this.nodes[i].updateE();
    }
    
    this.syncArrays();
  }
  
  calculateResiduals() {
    const n = this.nodes.length;
    const r = new Array(n).fill(0);
    
    if (this.mode === 'DemandMatching') {
      // r_dm[i] = w[i] * e[i]
      for (let i = 0; i < n; i++) {
        r[i] = this.nodes[i].w * this.nodes[i].e;
      }
    } else if (this.mode === 'ThresholdParity') {
      // r_tp[i] = -w[i] * sigmoid(k*(τ - p[i]))
      for (let i = 0; i < n; i++) {
        const node = this.nodes[i];
        r[i] = -node.w * sigmoid(this.k * (this.tau - node.p));
      }
    } else if (this.mode === 'WorstOff') {
      // b[i] = softplus(d[i] - p[i])
      // pi[i] = exp(b[i]/α) / Σ exp(b[*]/α)
      // r_wo[i] = -pi[i] * sigmoid(k*(d[i] - p[i]))
      const b = [];
      let sumExp = 0;
      
      for (let i = 0; i < n; i++) {
        const node = this.nodes[i];
        b[i] = softplus(node.d - node.p, this.k);
        sumExp += Math.exp(b[i] / this.alpha);
      }
      
      for (let i = 0; i < n; i++) {
        const node = this.nodes[i];
        const pi = sumExp > 0 ? Math.exp(b[i] / this.alpha) / sumExp : 1.0 / n;
        r[i] = -pi * sigmoid(this.k * (node.d - node.p));
      }
    } else if (this.mode === 'Hybrid') {
      // Calculate individual residuals
      const r_dm = new Array(n).fill(0);
      const r_tp = new Array(n).fill(0);
      const r_wo = new Array(n).fill(0);
      
      // Demand matching
      for (let i = 0; i < n; i++) {
        r_dm[i] = this.nodes[i].w * this.nodes[i].e;
      }
      
      // Threshold parity
      for (let i = 0; i < n; i++) {
        const node = this.nodes[i];
        r_tp[i] = -node.w * sigmoid(this.k * (this.tau - node.p));
      }
      
      // Worst-off
      const b = [];
      let sumExp = 0;
      for (let i = 0; i < n; i++) {
        const node = this.nodes[i];
        b[i] = softplus(node.d - node.p, this.k);
        sumExp += Math.exp(b[i] / this.alpha);
      }
      for (let i = 0; i < n; i++) {
        const node = this.nodes[i];
        const pi = sumExp > 0 ? Math.exp(b[i] / this.alpha) / sumExp : 1.0 / n;
        r_wo[i] = -pi * sigmoid(this.k * (node.d - node.p));
      }
      
      // Calculate gamma and betas
      let gamma = 0;
      for (let i = 0; i < n; i++) {
        gamma += sigmoid(this.k * (this.tau - this.nodes[i].p));
      }
      gamma = gamma / n;
      
      let beta1, beta2, beta3;
      if (this.useManualWeights) {
        // Normalize manual weights
        const sum = this.beta1 + this.beta2 + this.beta3;
        beta1 = sum > 0 ? this.beta1 / sum : 0.33;
        beta2 = sum > 0 ? this.beta2 / sum : 0.33;
        beta3 = sum > 0 ? this.beta3 / sum : 0.34;
      } else {
        beta1 = 1 - gamma;
        beta2 = gamma;
        beta3 = gamma;
      }
      
      // Blend residuals
      for (let i = 0; i < n; i++) {
        r[i] = beta1 * r_dm[i] + beta2 * r_tp[i] + beta3 * r_wo[i];
      }
    }
    
    return r;
  }
  
  reset() {
    // Reset resource levels but keep demands and network
    for (let node of this.nodes) {
      node.p = random(0.3, 1.5);
      node.updateE();
    }
    this.syncArrays();
    stepCount = 0;
    maxUnderserviceHistory = [];
    fractionBelowThresholdHistory = [];
    meanAbsEHistory = [];
  }
  
  randomizeNetwork(edgeProbability) {
    this.edges = [];
    for (let i = 0; i < this.nodes.length; i++) {
      for (let j = 0; j < this.nodes.length; j++) {
        if (i !== j && random() < edgeProbability) {
          this.edges.push(new Edge(this.nodes[i], this.nodes[j]));
        }
      }
    }
  }
  
  randomizeDemand() {
    for (let node of this.nodes) {
      node.d = random(0.5, 2.0);
      node.updateE();
    }
    this.syncArrays();
  }
  
  calculateMetrics() {
    if (this.nodes.length === 0) {
      return {
        meanE: 0,
        meanAbsE: 0,
        maxUnderservice: 0,
        fractionBelowThreshold: 0,
        gini: 0,
        gamma: 0,
        beta1: 0,
        beta2: 0,
        beta3: 0
      };
    }
    
    const e = this.nodes.map(n => n.e);
    const meanE = e.reduce((a, b) => a + b, 0) / e.length;
    const meanAbsE = e.reduce((sum, val) => sum + abs(val), 0) / e.length;
    
    // Max underservice: max of (d[i] - p[i]) for underserved nodes
    let maxUnderservice = 0;
    for (let node of this.nodes) {
      if (node.d > node.p) {
        maxUnderservice = max(maxUnderservice, node.d - node.p);
      }
    }
    
    // Fraction below threshold
    let belowThreshold = 0;
    for (let node of this.nodes) {
      if (node.p < this.tau) {
        belowThreshold++;
      }
    }
    const fractionBelowThreshold = belowThreshold / this.nodes.length;
    
    // Gini-like inequality on p
    const pSorted = [...this.p].sort((a, b) => a - b);
    let gini = 0;
    const meanP = pSorted.reduce((a, b) => a + b, 0) / pSorted.length;
    if (meanP > 0) {
      for (let i = 0; i < pSorted.length; i++) {
        for (let j = 0; j < pSorted.length; j++) {
          gini += abs(pSorted[i] - pSorted[j]);
        }
      }
      gini = gini / (2 * pSorted.length * pSorted.length * meanP);
    }
    
    // Gamma and betas (for hybrid mode)
    let gamma = 0;
    if (this.mode === 'Hybrid') {
      for (let node of this.nodes) {
        gamma += sigmoid(this.k * (this.tau - node.p));
      }
      gamma = gamma / this.nodes.length;
    }
    
    let beta1 = 0, beta2 = 0, beta3 = 0;
    if (this.mode === 'Hybrid') {
      if (this.useManualWeights) {
        const sum = this.beta1 + this.beta2 + this.beta3;
        beta1 = sum > 0 ? this.beta1 / sum : 0.33;
        beta2 = sum > 0 ? this.beta2 / sum : 0.33;
        beta3 = sum > 0 ? this.beta3 / sum : 0.34;
      } else {
        beta1 = 1 - gamma;
        beta2 = gamma;
        beta3 = gamma;
      }
    }
    
    return {
      meanE,
      meanAbsE,
      maxUnderservice,
      fractionBelowThreshold,
      gini,
      gamma,
      beta1,
      beta2,
      beta3
    };
  }
}

function setup() {
  createCanvas(1000, 800);
  colorMode(HSB, 360, 100, 100, 1);
  
  sim = new Simulation();
  createControls();
  
  // Initialize simulation
  sim.init(30, 0.2, 'random');
}

function createControls() {
  let y = 95, s = 30;
  
  modeSelect = createSelect();
  modeSelect.position(10, y);
  modeSelect.option('DemandMatching');
  modeSelect.option('ThresholdParity');
  modeSelect.option('WorstOff');
  modeSelect.option('Hybrid');
  modeSelect.style('width', '200px');
  modeSelect.changed(() => {
    sim.mode = modeSelect.value();
  });
  
  dtSlider = createSlider(0.001, 0.1, 0.01, 0.001);
  dtSlider.position(10, y + s);
  dtSlider.style('width', '200px');
  
  lambdaSlider = createSlider(0.0, 2.0, 0.1, 0.01);
  lambdaSlider.position(10, y + s * 2);
  lambdaSlider.style('width', '200px');
  
  kSlider = createSlider(0.1, 10.0, 1.0, 0.1);
  kSlider.position(10, y + s * 3);
  kSlider.style('width', '200px');
  
  tauSlider = createSlider(0.0, 5.0, 1.0, 0.1);
  tauSlider.position(10, y + s * 4);
  tauSlider.style('width', '200px');
  
  alphaSlider = createSlider(0.01, 1.0, 0.1, 0.01);
  alphaSlider.position(10, y + s * 5);
  alphaSlider.style('width', '200px');
  
  diffusionStrengthSlider = createSlider(0.0, 2.0, 1.0, 0.01);
  diffusionStrengthSlider.position(10, y + s * 6);
  diffusionStrengthSlider.style('width', '200px');
  
  graphDensitySlider = createSlider(0.0, 1.0, 0.2, 0.01);
  graphDensitySlider.position(10, y + s * 7);
  graphDensitySlider.style('width', '200px');
  
  beta1Slider = createSlider(0.0, 1.0, 0.33, 0.01);
  beta1Slider.position(10, y + s * 8);
  beta1Slider.style('width', '200px');
  
  beta2Slider = createSlider(0.0, 1.0, 0.33, 0.01);
  beta2Slider.position(10, y + s * 9);
  beta2Slider.style('width', '200px');
  
  beta3Slider = createSlider(0.0, 1.0, 0.34, 0.01);
  beta3Slider.position(10, y + s * 10);
  beta3Slider.style('width', '200px');
  
  manualWeightsToggle = createCheckbox('Manual Weights', false);
  manualWeightsToggle.position(10, y + s * 11);
  
  showEdgesToggle = createCheckbox('Show Edges', true);
  showEdgesToggle.position(10, y + s * 12);
  
  showLabelsToggle = createCheckbox('Show Labels', false);
  showLabelsToggle.position(10, y + s * 13);
  
  showUnderservedToggle = createCheckbox('Highlight Underserved', false);
  showUnderservedToggle.position(10, y + s * 14);
  
  resetButton = createButton('Reset');
  resetButton.position(10, y + s * 15);
  resetButton.mousePressed(resetSimulation);
  
  randomizeDemandsButton = createButton('Randomize Demands');
  randomizeDemandsButton.position(80, y + s * 15);
  randomizeDemandsButton.mousePressed(() => {
    sim.randomizeDemand();
  });
  
  randomizeEdgesButton = createButton('Randomize Edges');
  randomizeEdgesButton.position(200, y + s * 15);
  randomizeEdgesButton.mousePressed(() => {
    sim.randomizeNetwork(graphDensitySlider.value());
  });
  
  playPauseButton = createButton('Pause');
  playPauseButton.position(320, y + s * 15);
  playPauseButton.mousePressed(togglePlayPause);
  
  stepButton = createButton('Step');
  stepButton.position(400, y + s * 15);
  stepButton.mousePressed(stepForward);
}

function resetSimulation() {
  sim.reset();
}

function togglePlayPause() {
  isPlaying = !isPlaying;
  playPauseButton.html(isPlaying ? 'Pause' : 'Play');
}

function stepForward() {
  if (!isPlaying) {
    updateSimulation();
  }
}

function updateSimulation() {
  // Update simulation parameters from sliders
  sim.dt = dtSlider.value();
  sim.lambda = lambdaSlider.value();
  sim.k = kSlider.value();
  sim.tau = tauSlider.value();
  sim.alpha = alphaSlider.value();
  sim.diffusionStrength = diffusionStrengthSlider.value();
  sim.mode = modeSelect.value();
  sim.useManualWeights = manualWeightsToggle.checked();
  sim.beta1 = beta1Slider.value();
  sim.beta2 = beta2Slider.value();
  sim.beta3 = beta3Slider.value();
  
  // Step simulation
  sim.step();
  
  // Update metrics history
  const metrics = sim.calculateMetrics();
  maxUnderserviceHistory.push(metrics.maxUnderservice);
  fractionBelowThresholdHistory.push(metrics.fractionBelowThreshold);
  meanAbsEHistory.push(metrics.meanAbsE);
  
  if (maxUnderserviceHistory.length > maxHistoryLength) {
    maxUnderserviceHistory.shift();
    fractionBelowThresholdHistory.shift();
    meanAbsEHistory.shift();
  }
}

function draw() {
  background(220, 15, 8);
  
  if (isPlaying) {
    updateSimulation();
  }
  
  // Draw edges
  if (showEdgesToggle.checked()) {
    drawEdges();
  }
  
  // Draw nodes
  drawNodes();
  
  // Draw formula
  displayFormula();
  
  // Display metrics
  displayMetrics();
  
  // Display info box
  displayInfoBox();
  
  // Display control labels
  displayControlLabels();
}

function drawEdges() {
  for (let edge of sim.edges) {
    const opacity = map(edge.D, 0, 1, 0.2, 0.6);
    const thickness = map(edge.D, 0, 1, 0.5, 2);
    
    push();
    stroke(200, 50, 70, opacity);
    strokeWeight(thickness);
    noFill();
    
    const x1 = edge.source.x;
    const y1 = edge.source.y;
    const x2 = edge.target.x;
    const y2 = edge.target.y;
    
    // Draw line
    line(x1, y1, x2, y2);
    
    // Draw arrowhead
    const angle = atan2(y2 - y1, x2 - x1);
    const arrowSize = 6;
    push();
    translate(x2, y2);
    rotate(angle);
    fill(200, 50, 70, opacity);
    noStroke();
    triangle(-arrowSize, -arrowSize/2, -arrowSize, arrowSize/2, 0, 0);
    pop();
    
    pop();
  }
}

function drawNodes() {
  const metrics = sim.calculateMetrics();
  
  // Find min/max e for color mapping
  const eValues = sim.nodes.map(n => n.e);
  const minE = min(eValues);
  const maxE = max(eValues);
  const rangeE = maxE - minE;
  
  // Find min/max d for size mapping
  const dValues = sim.nodes.map(n => n.d);
  const minD = min(dValues);
  const maxD = max(dValues);
  const rangeD = maxD - minD;
  
  for (let node of sim.nodes) {
    // Color: encodes e[i] = p[i] - d[i]
    // Diverging colormap: blue (underserved) → white (balanced) → red (overserved)
    let hue, saturation, brightness;
    if (rangeE > 0.001) {
      const normalized = (node.e - minE) / rangeE;
      if (normalized < 0.5) {
        // Blue to white (underserved)
        hue = lerp(240, 200, normalized * 2);
        saturation = lerp(80, 0, normalized * 2);
        brightness = lerp(60, 80, normalized * 2);
      } else {
        // White to red (overserved)
        hue = lerp(200, 0, (normalized - 0.5) * 2);
        saturation = lerp(0, 80, (normalized - 0.5) * 2);
        brightness = lerp(80, 90, (normalized - 0.5) * 2);
      }
    } else {
      hue = 200;
      saturation = 0;
      brightness = 80;
    }
    
    // Size: encodes d[i] (demand) or |underservice|
    let size;
    if (showUnderservedToggle.checked() && node.d > node.p) {
      const underservice = node.d - node.p;
      size = 8 + map(underservice, 0, 2, 0, 12);
    } else {
      size = 8 + map(node.d, minD, maxD, 0, 12);
    }
    
    push();
    
    // Underserved highlighting
    if (showUnderservedToggle.checked() && node.p < sim.tau) {
      fill(hue, saturation, brightness, 0.3);
      noStroke();
      ellipse(node.x, node.y, size * 2, size * 2);
    }
    
    // Node circle
    fill(hue, saturation, brightness, 0.9);
    stroke(hue, saturation, brightness * 1.2, 0.8);
    strokeWeight(1);
    ellipse(node.x, node.y, size, size);
    
    // Node label
    if (showLabelsToggle.checked()) {
      fill(0, 0, 100);
      textAlign(CENTER, CENTER);
      textSize(10);
      text(node.id, node.x, node.y);
    }
    
    pop();
  }
}

function displayFormula() {
  push();
  fill(0, 0, 15, 0.92);
  stroke(200, 50, 70, 0.8);
  strokeWeight(2);
  rect(10, 10, 500, 80, 5);
  
  fill(255);
  noStroke();
  textAlign(LEFT);
  textSize(13);
  textStyle(BOLD);
  text("Cytoneme Fairness Residuals:", 20, 32);
  
  textSize(11);
  textStyle(NORMAL);
  fill(200, 70, 95);
  text("dp[i]/dt = Σ_j A[j][i]·D[j][i]·(p[j]-p[i]) + s[i] - u[i] - λ·r[i]", 20, 50);
  
  fill(255);
  textSize(10);
  text(`Mode: ${sim.mode}  |  λ = ${sim.lambda.toFixed(2)}  |  τ = ${sim.tau.toFixed(2)}`, 20, 68);
  pop();
}

function displayMetrics() {
  const metrics = sim.calculateMetrics();
  
  push();
  fill(0, 0, 100, 0.85);
  stroke(0, 0, 60, 0.5);
  rect(width - 280, 10, 270, 400);
  
  fill(0, 0, 0);
  textSize(13);
  textStyle(BOLD);
  text('Fairness Metrics', width - 270, 28);
  textStyle(NORMAL);
  
  textSize(11);
  fill(0, 0, 20);
  
  // mean(e)
  text(`mean(e): ${metrics.meanE.toFixed(4)}`, width - 270, 50);
  
  // mean(|e|)
  text(`mean(|e|): ${metrics.meanAbsE.toFixed(4)}`, width - 270, 70);
  drawSparkline(width - 270, 80, 250, 50, meanAbsEHistory, 'mean(|e|)');
  
  // max underservice
  text(`Max Underservice: ${metrics.maxUnderservice.toFixed(4)}`, width - 270, 145);
  drawSparkline(width - 270, 155, 250, 50, maxUnderserviceHistory, 'Max Underservice');
  
  // fraction below threshold
  text(`Fraction < τ: ${(metrics.fractionBelowThreshold * 100).toFixed(1)}%`, width - 270, 220);
  drawSparkline(width - 270, 230, 250, 50, fractionBelowThresholdHistory, 'Fraction < τ');
  
  // Gini
  text(`Gini (on p): ${metrics.gini.toFixed(4)}`, width - 270, 295);
  
  // Hybrid mode info
  if (sim.mode === 'Hybrid') {
    text(`γ (gamma): ${metrics.gamma.toFixed(4)}`, width - 270, 320);
    text(`β1: ${metrics.beta1.toFixed(3)}  β2: ${metrics.beta2.toFixed(3)}  β3: ${metrics.beta3.toFixed(3)}`, width - 270, 340);
  }
  
  // Edge count
  text(`Edges: ${sim.edges.length}`, width - 270, 365);
  text(`Nodes: ${sim.nodes.length}`, width - 270, 380);
  
  pop();
}

function drawSparkline(x, y, w, h, data, label) {
  if (data.length < 2) return;
  
  push();
  fill(0, 0, 20, 0.5);
  noStroke();
  rect(x, y, w, h);
  
  let minVal = min(data);
  let maxVal = max(data);
  let range = maxVal - minVal;
  if (range < 0.001) {
    range = 0.1;
    const center = (minVal + maxVal) / 2;
    minVal = max(0, center - range / 2);
    maxVal = min(10, center + range / 2);
  }
  
  noFill();
  stroke(200, 80, 80);
  strokeWeight(1.5);
  beginShape();
  for (let i = 0; i < data.length; i++) {
    const px = map(i, 0, data.length - 1, x + 5, x + w - 5);
    const py = map(data[i], minVal, maxVal, y + h - 5, y + 5);
    vertex(px, py);
  }
  endShape();
  pop();
}

function displayInfoBox() {
  const infoX = width - 40;
  const metricsPanelHeight = 400;
  const infoY = 10 + metricsPanelHeight - 25;
  const infoSize = 20;
  const mouseOverInfo = mouseX >= infoX - 5 && mouseX <= infoX + infoSize + 5 &&
                        mouseY >= infoY - 5 && mouseY <= infoY + infoSize + 5;
  
  push();
  fill(200, 50, 80, (mouseOverInfo || infoBoxOpen) ? 1 : 0.7);
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(16);
  textStyle(BOLD);
  text("ℹ", infoX + infoSize/2, infoY + infoSize/2);
  pop();
  
  if (infoBoxOpen) {
    push();
    const boxWidth = 450, boxHeight = 600;
    const boxX = width - boxWidth - 20;
    const boxY = 100;
    
    fill(0, 0, 0, 0.95);
    stroke(200, 50, 80, 0.8);
    strokeWeight(2);
    rect(boxX, boxY, boxWidth, boxHeight, 8);
    
    const lineHeight = 15, margin = 15, maxTextWidth = boxWidth - margin * 2 - 20;
    const headerY = boxY + 30;
    const contentStartY = boxY + 60;
    const contentEndY = boxY + boxHeight - 10;
    
    if (!cachedWrappedText) {
      const desc = [
        "OVERVIEW:",
        "The Cytoneme-Constrained Diffusion with Fairness Residuals model demonstrates how fairness outcomes differ when resources are constrained by directed graph edges (cytonemes) and modified by fairness residual terms. Nodes have resource p[i] and demand d[i], with excess/deficit e[i] = p[i] - d[i].",
        "",
        "MATHEMATICAL MODEL:",
        "Update Rule (Euler step):",
        "dp[i]/dt = Σ_j A[j][i] · D[j][i] · (p[j] - p[i]) + s[i] - u[i] - λ · r[i]",
        "p[i] += dt · dp[i]/dt",
        "",
        "Where:",
        "• A[j][i] ∈ {0,1}: directed adjacency matrix (edge exists from j to i)",
        "• D[j][i] ≥ 0: conductance (edge strength)",
        "• s[i]: source term (emission)",
        "• u[i]: usage/consumption",
        "• λ: fairness strength",
        "• r[i]: fairness residual (mode-dependent)",
        "",
        "FAIRNESS MODES:",
        "1. Demand Matching:",
        "Phi_dm = 0.5 · Σ_i w[i] · e[i]²",
        "r_dm[i] = w[i] · e[i]",
        "Minimizes squared excess/deficit. Pushes resources toward matching demands.",
        "",
        "2. Threshold Parity:",
        "Phi_tp = Σ_i w[i] · softplus(τ - p[i])",
        "r_tp[i] = -w[i] · sigmoid(k·(τ - p[i]))",
        "Ensures nodes reach threshold τ. Uses smooth floor function (softplus).",
        "",
        "3. Worst-Off Minimization:",
        "b[i] = softplus(d[i] - p[i])  // underservice magnitude",
        "pi[i] = exp(b[i]/α) / Σ exp(b[*]/α)  // softmax attention",
        "r_wo[i] = -pi[i] · sigmoid(k·(d[i] - p[i]))",
        "Focuses attention on worst-served nodes. α controls softness of worst-off selection.",
        "",
        "4. Hybrid:",
        "γ = average_i sigmoid(k·(τ - p[i]))",
        "β1 = 1 - γ, β2 = γ, β3 = γ",
        "r_hyb[i] = β1·r_dm[i] + β2·r_tp[i] + β3·r_wo[i]",
        "Blends all three modes. γ adapts based on how many nodes are below threshold. Manual weights available.",
        "",
        "FAIRNESS METRICS:",
        "• mean(e): Average excess/deficit across all nodes. Positive = overall oversupply, negative = overall undersupply.",
        "",
        "• mean(|e|): Average absolute excess/deficit. Measures overall deviation from demand matching.",
        "",
        "• Max Underservice: Maximum (d[i] - p[i]) for nodes where d[i] > p[i]. Shows worst-case deficit.",
        "",
        "• Fraction < τ: Percentage of nodes below threshold τ. Lower is better for threshold parity.",
        "",
        "• Gini (on p): Inequality measure on resource levels. 0 = perfect equality, 1 = maximum inequality.",
        "",
        "USER GUIDE:",
        "• Mode dropdown: Select fairness mode (DemandMatching, ThresholdParity, WorstOff, Hybrid).",
        "• λ (fairness strength): Controls how strongly residuals affect dynamics. Higher = stronger fairness correction.",
        "• k (sharpness): Controls smoothness of sigmoid/softplus functions. Higher = sharper transitions.",
        "• τ (threshold): Target resource level for threshold parity mode.",
        "• α (worst-off softness): Controls how sharply worst-off mode focuses on most underserved nodes.",
        "• Diffusion Strength: Global multiplier on edge conductances D[j][i].",
        "• Graph Density: Probability of creating edge when randomizing network.",
        "• Manual Weights: Enable to manually set β1, β2, β3 for hybrid mode.",
        "",
        "VISUALIZATION:",
        "• Node color: Blue = underserved (e[i] < 0), White = balanced (e[i] ≈ 0), Red = overserved (e[i] > 0).",
        "• Node size: Encodes demand d[i] or |underservice| (if highlight toggle enabled).",
        "• Edge opacity: Reflects conductance D[j][i]. Thicker/more opaque = stronger connection.",
        "• Underserved highlighting: Shows nodes below threshold τ with halo effect.",
        "",
        "OBSERVATIONS:",
        "Watch how node colors shift from blue (underserved) toward white/red as fairness residuals correct imbalances. In hybrid mode, γ adapts based on system state. Compare how different modes prioritize different aspects of fairness: demand matching focuses on overall balance, threshold parity ensures minimum levels, worst-off prioritizes the most underserved."
      ];
      
      cachedWrappedText = [];
      for (let line of desc) {
        const wrapped = wrapTextForInfo(line, maxTextWidth);
        cachedWrappedText.push({
          text: line,
          wrapped: wrapped,
          isBold: line.startsWith("•") || (line === line.toUpperCase() && line.length > 0 && !line.includes(":"))
        });
      }
    }
    
    let totalHeight = 60;
    for (let item of cachedWrappedText) {
      totalHeight += item.wrapped.length * lineHeight;
    }
    
    const maxScroll = max(0, totalHeight - boxHeight + 20);
    infoBoxScrollOffset = constrain(infoBoxScrollOffset, 0, maxScroll);
    
    // Draw header
    noStroke();
    fill(255);
    textSize(16);
    textStyle(BOLD);
    textAlign(LEFT);
    text("Cytoneme Fairness Residuals", boxX + 15, headerY);
    
    // Draw scrollable content
    textSize(11);
    let textY = contentStartY - infoBoxScrollOffset;
    
    for (let item of cachedWrappedText) {
      const lineBottom = textY + item.wrapped.length * lineHeight;
      if (lineBottom < boxY || textY > contentEndY) {
        textY += item.wrapped.length * lineHeight;
        continue;
      }
      
      if (item.isBold) {
        textStyle(BOLD);
      } else {
        textStyle(NORMAL);
      }
      fill(255);
      
      for (let w of item.wrapped) {
        if (textY >= boxY - 5 && textY <= contentEndY + 5) {
          text(w, boxX + margin, textY);
        }
        textY += lineHeight;
      }
    }
    
    // Scrollbar
    if (totalHeight > boxHeight) {
      const scrollbarWidth = 8;
      const scrollbarX = boxX + boxWidth - scrollbarWidth - 5;
      const scrollbarHeight = boxHeight - 20;
      const scrollbarY = boxY + 10;
      const thumbHeight = max(10, (boxHeight / totalHeight) * scrollbarHeight);
      const thumbY = maxScroll > 0 ? scrollbarY + (infoBoxScrollOffset / maxScroll) * (scrollbarHeight - thumbHeight) : scrollbarY;
      
      fill(0, 0, 30, 0.5);
      noStroke();
      rect(scrollbarX, scrollbarY, scrollbarWidth, scrollbarHeight, 4);
      
      fill(200, 50, 80, 0.8);
      rect(scrollbarX, thumbY, scrollbarWidth, thumbHeight, 4);
    }
    
    // Close button
    const closeButtonSize = 20;
    const closeButtonX = boxX + boxWidth - closeButtonSize - 10;
    const closeButtonY = boxY + 10;
    const mouseOverClose = mouseX >= closeButtonX && mouseX <= closeButtonX + closeButtonSize &&
                          mouseY >= closeButtonY && mouseY <= closeButtonY + closeButtonSize;
    
    fill(200, 50, 80, mouseOverClose ? 1 : 0.7);
    noStroke();
    textAlign(CENTER, CENTER);
    textSize(14);
    textStyle(BOLD);
    text("×", closeButtonX + closeButtonSize/2, closeButtonY + closeButtonSize/2);
    
    pop();
  }
}

function wrapTextForInfo(text, maxWidth) {
  if (!text) return [""];
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';
  for (let word of words) {
    const testLine = currentLine + (currentLine ? ' ' : '') + word;
    if (textWidth(testLine) > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines.length > 0 ? lines : [""];
}

function mousePressed() {
  const infoX = width - 40;
  const metricsPanelHeight = 400;
  const infoY = 10 + metricsPanelHeight - 25;
  const infoSize = 20;
  const mouseOverInfo = mouseX >= infoX - 5 && mouseX <= infoX + infoSize + 5 &&
                        mouseY >= infoY - 5 && mouseY <= infoY + infoSize + 5;
  
  if (mouseOverInfo) {
    infoBoxOpen = !infoBoxOpen;
    if (!infoBoxOpen) {
      infoBoxScrollOffset = 0;
    }
    return false;
  }
  
  if (infoBoxOpen) {
    const boxWidth = 450;
    const boxX = width - boxWidth - 20;
    const boxY = 100;
    const closeButtonSize = 20;
    const closeButtonX = boxX + boxWidth - closeButtonSize - 10;
    const closeButtonY = boxY + 10;
    const mouseOverClose = mouseX >= closeButtonX && mouseX <= closeButtonX + closeButtonSize &&
                          mouseY >= closeButtonY && mouseY <= closeButtonY + closeButtonSize;
    
    if (mouseOverClose) {
      infoBoxOpen = false;
      infoBoxScrollOffset = 0;
      return false;
    }
  }
  return true;
}

function mouseWheel(event) {
  if (infoBoxOpen) {
    const boxWidth = 450;
    const boxX = width - boxWidth - 20;
    const boxY = 100;
    const boxHeight = 600;
    
    if (mouseX >= boxX && mouseX <= boxX + boxWidth &&
        mouseY >= boxY && mouseY <= boxY + boxHeight) {
      infoBoxScrollOffset -= event.delta;
      return false;
    }
  }
  return true;
}

function displayControlLabels() {
  push();
  fill(0, 0, 100, 0.9);
  textAlign(LEFT);
  textSize(10);
  let y = 95, spacing = 30;
  
  const labels = [
    { text: `Mode: ${modeSelect.value()}`, x: 220, y: y + 5 },
    { text: `dt: ${dtSlider.value().toFixed(3)}`, x: 220, y: y + spacing + 5 },
    { text: `λ: ${lambdaSlider.value().toFixed(2)}`, x: 220, y: y + spacing * 2 + 5 },
    { text: `k: ${kSlider.value().toFixed(2)}`, x: 220, y: y + spacing * 3 + 5 },
    { text: `τ: ${tauSlider.value().toFixed(2)}`, x: 220, y: y + spacing * 4 + 5 },
    { text: `α: ${alphaSlider.value().toFixed(2)}`, x: 220, y: y + spacing * 5 + 5 },
    { text: `Diffusion: ${diffusionStrengthSlider.value().toFixed(2)}`, x: 220, y: y + spacing * 6 + 5 },
    { text: `Graph Density: ${graphDensitySlider.value().toFixed(2)}`, x: 220, y: y + spacing * 7 + 5 },
    { text: `β1: ${beta1Slider.value().toFixed(2)}`, x: 220, y: y + spacing * 8 + 5 },
    { text: `β2: ${beta2Slider.value().toFixed(2)}`, x: 220, y: y + spacing * 9 + 5 },
    { text: `β3: ${beta3Slider.value().toFixed(2)}`, x: 220, y: y + spacing * 10 + 5 }
  ];
  
  for (let label of labels) {
    text(label.text, label.x, label.y);
  }
  
  pop();
}
