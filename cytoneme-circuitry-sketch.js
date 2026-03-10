// Advanced Cytoneme Circuitry: Fair Signal Flow in Fixed Networks
// Using global p5.js mode
//
// This model visualizes fairness as signal-matter flowing through a fixed circuit.
// Nodes and paths are immutable; only signals move. Fairness emerges from how
// signals are routed, gated, reversed, amplified, and throttled through the network.
//
// Visual aesthetic: organic circuitry, biological signal transport, connective goo
// NOT a graph visualization - this is living circuitry

let nodes = [];
let paths = [];
let signals = [];
let signalBuffer;
let isPlaying = true;
let stepCount = 0;

// Fairness mode
let mode = 'Hybrid'; // 'ThresholdParity', 'DemandMatching', 'WorstOff', 'Hybrid'

// Parameters
let signalSpeed = 0.02;
let conductanceScale = 1.0;
let gatingSensitivity = 1.0;
let wDemand = 0.33;
let wThreshold = 0.33;
let wWorst = 0.34;
let showAutonomousCirculation = true;
let showPathwayFairness = true;
let brightnessScale = 1.0; // Global brightness multiplier
let baselineActivity = 0.5; // Baseline activity level

// Max signals to prevent performance issues
const MAX_SIGNALS = 500;

// UI Controls
let modeSelect;
let signalSpeedSlider, conductanceScaleSlider, gatingSensitivitySlider;
let wDemandSlider, wThresholdSlider, wWorstSlider;
let brightnessSlider, baselineActivitySlider;
let playPauseButton, resetButton;
let autonomousToggle, fairnessToggle;

// Metrics
let maxDeficit = 0;
let meanDeficit = 0;
let activePaths = 0;
let totalSignals = 0;

// Info box state
let infoBoxOpen = false;
let infoBoxScrollOffset = 0;
let cachedWrappedText = null;

// Node class: Fixed position, supply, demand, threshold, capacity
class Node {
  constructor(x, y, id) {
    this.x = x;
    this.y = y;
    this.id = id;
    this.supply = random(0.3, 0.7);
    this.demand = random(0.5, 1.0);
    this.threshold = random(0.2, 0.5);
    this.capacity = 1.5;
    this.isSource = false;
    this.pressure = 0;
    this.worstOffWeight = 0;
  }
  
  getDemandResidual() {
    return this.demand - this.supply;
  }
  
  getThresholdResidual() {
    return max(0, this.threshold - this.supply);
  }
  
  getPressure(weights, worstOffWeight) {
    const demandP = this.getDemandResidual();
    const thresholdP = this.getThresholdResidual();
    const worstP = worstOffWeight;
    
    return weights.wDemand * demandP + 
           weights.wThreshold * thresholdP + 
           weights.wWorst * worstP;
  }
  
  updateSupply(amount) {
    this.supply = constrain(this.supply + amount, 0, this.capacity);
  }
}

// Path class: Fixed endpoints, conductance, gating, direction, congestion
class Path {
  constructor(nodeA, nodeB) {
    this.nodeA = nodeA;
    this.nodeB = nodeB;
    this.baseConductance = random(0.3, 1.0);
    this.conductance = this.baseConductance;
    this.gating = 0.5;
    this.direction = 0; // -1 (A→B), 0 (bidirectional), 1 (B→A), 2 (autonomous)
    this.congestion = 0;
    this.throughput = 0;
    this.fairnessLoad = 0;
    this.length = dist(nodeA.x, nodeA.y, nodeB.x, nodeB.y);
    this.active = false;
  }
  
  updateFlow(pressureA, pressureB, hysteresis) {
    const pressureDiff = pressureA - pressureB;
    const absDiff = abs(pressureDiff);
    
    // Update gating based on endpoint pressures
    const maxPressure = max(pressureA, pressureB);
    this.gating = constrain(0.1 + gatingSensitivity * maxPressure * 0.5, 0.1, 1.0);
    
    // Determine direction
    if (absDiff < hysteresis) {
      this.direction = 0; // Bidirectional
    } else if (pressureDiff > 0) {
      this.direction = -1; // A→B
    } else {
      this.direction = 1; // B→A
    }
    
    this.active = absDiff > 0.01;
    
    return absDiff;
  }
  
  spawnSignals(pressureDiff, maxSignals, signalType) {
    const absDiff = abs(pressureDiff);
    const effectiveConductance = this.conductance * conductanceScale * this.gating;
    const spawnRate = absDiff * effectiveConductance;
    
    const numToSpawn = floor(spawnRate * 10);
    const actualSpawn = min(numToSpawn, maxSignals);
    
    for (let i = 0; i < actualSpawn; i++) {
      if (signals.length >= MAX_SIGNALS) break;
      
      const direction = pressureDiff > 0 ? -1 : 1;
      const amount = random(0.01, 0.05) * absDiff;
      
      signals.push(new SignalPacket(this, direction, amount, signalType));
    }
  }
  
  updateThroughput() {
    // Count signals on this path
    this.congestion = signals.filter(s => s.path === this).length;
    this.throughput = this.throughput * 0.95 + this.congestion * 0.05;
  }
}

// SignalPacket class: Moves along paths as organic blobs
class SignalPacket {
  constructor(path, direction, amount, type) {
    this.path = path;
    this.t = direction > 0 ? 0 : 1;
    this.direction = direction;
    this.amount = amount;
    this.speed = signalSpeed * (0.8 + random(0.4));
    this.lifetime = 300; // Increased for better visibility
    this.maxLifetime = 300;
    this.type = type || 'demand';
    this.jitter = random(-0.5, 0.5);
    this.size = 6 + amount * 30; // Larger base size
    this.trail = []; // Store trail positions for motion blur effect
    this.maxTrailLength = 8;
  }
  
  update() {
    const oldPos = this.getPosition();
    this.t += this.direction * this.speed;
    this.lifetime--;
    
    // Add subtle jitter for organic feel
    this.jitter += random(-0.1, 0.1);
    this.jitter = constrain(this.jitter, -2, 2);
    
    // Store trail for motion blur effect (more dramatic at high speeds)
    const newPos = this.getPosition();
    this.trail.push({x: newPos.x, y: newPos.y, age: 0});
    if (this.trail.length > this.maxTrailLength) {
      this.trail.shift();
    }
    // Age trail points
    this.trail.forEach(point => point.age++);
  }
  
  isExpired() {
    return this.lifetime <= 0 || this.t < -0.1 || this.t > 1.1;
  }
  
  getPosition() {
    const a = this.path.nodeA;
    const b = this.path.nodeB;
    const baseX = lerp(a.x, b.x, this.t);
    const baseY = lerp(a.y, b.y, this.t);
    
    // Perpendicular offset for organic feel
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = sqrt(dx * dx + dy * dy);
    if (len > 0) {
      const perpX = -dy / len;
      const perpY = dx / len;
      return {
        x: baseX + perpX * this.jitter,
        y: baseY + perpY * this.jitter
      };
    }
    return { x: baseX, y: baseY };
  }
  
  arrive() {
    // Signal reaches endpoint
    const targetNode = this.direction > 0 ? this.path.nodeB : this.path.nodeA;
    targetNode.updateSupply(this.amount);
    return true;
  }
}

// Create fixed topology
function createTopology() {
  nodes = [];
  paths = [];
  signals = [];
  
  // Grid layout
  const cols = 8;
  const rows = 6;
  const spacingX = (width - 200) / (cols + 1);
  const spacingY = (height - 200) / (rows + 1);
  
  // Create nodes
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = 100 + spacingX * (c + 1);
      const y = 100 + spacingY * (r + 1);
      const id = r * cols + c;
      const node = new Node(x, y, id);
      
      // Make some nodes sources and create more interesting initial state
      if (random() < 0.15) {
        node.isSource = true;
        node.supply = random(0.8, 1.2);
      } else {
        // Create varied initial states for visual interest
        node.supply = random(0.2, 0.9);
        node.demand = random(0.6, 1.2);
        node.threshold = random(0.3, 0.6);
      }
      
      nodes.push(node);
    }
  }
  
  // Create paths: connect neighbors and some longer connections
  for (let i = 0; i < nodes.length; i++) {
    const nodeA = nodes[i];
    
    // Connect to neighbors
    for (let j = i + 1; j < nodes.length; j++) {
      const nodeB = nodes[j];
      const distance = dist(nodeA.x, nodeA.y, nodeB.x, nodeB.y);
      
      // Connect if close enough or randomly for longer connections
      if (distance < spacingX * 1.5 || (distance < spacingX * 3 && random() < 0.1)) {
        paths.push(new Path(nodeA, nodeB));
      }
    }
  }
}

// Compute worst-off weights
function computeWorstOffWeights() {
  const supplies = nodes.map(n => n.supply);
  const sorted = [...supplies].sort((a, b) => a - b);
  const minSupply = sorted[0];
  const maxSupply = sorted[sorted.length - 1];
  const range = maxSupply - minSupply;
  
  if (range < 0.001) {
    nodes.forEach(n => n.worstOffWeight = 0);
    return;
  }
  
  // Softmax-like weighting: more weight to nodes with lower supply
  const weights = nodes.map(n => {
    const normalized = (n.supply - minSupply) / range;
    return Math.exp(-normalized * 5); // Exponential decay
  });
  
  const sum = weights.reduce((a, b) => a + b, 0);
  nodes.forEach((n, i) => {
    n.worstOffWeight = sum > 0 ? weights[i] / sum : 1.0 / nodes.length;
  });
}

// Compute pressures for all nodes
function computePressures() {
  computeWorstOffWeights();
  
  const weights = {
    wDemand: mode === 'DemandMatching' ? 1.0 : (mode === 'WorstOff' ? 0.0 : wDemand),
    wThreshold: mode === 'ThresholdParity' ? 1.0 : (mode === 'WorstOff' ? 0.0 : wThreshold),
    wWorst: mode === 'WorstOff' ? 1.0 : (mode === 'ThresholdParity' ? 0.0 : wWorst)
  };
  
  // Normalize weights
  const sum = weights.wDemand + weights.wThreshold + weights.wWorst;
  if (sum > 0.01) {
    weights.wDemand /= sum;
    weights.wThreshold /= sum;
    weights.wWorst /= sum;
  }
  
  nodes.forEach(node => {
    node.pressure = node.getPressure(weights, node.worstOffWeight);
  });
}

// Update edge flows and spawn signals
function updateEdgeFlows() {
  const hysteresis = 0.05;
  activePaths = 0;
  
  paths.forEach(path => {
    const pressureA = path.nodeA.pressure;
    const pressureB = path.nodeB.pressure;
    const pressureDiff = path.updateFlow(pressureA, pressureB, hysteresis);
    
    if (path.active) {
      activePaths++;
      
      // Spawn signals
      const maxNewSignals = floor((MAX_SIGNALS - signals.length) / paths.length);
      if (maxNewSignals > 0) {
        const signalType = mode === 'ThresholdParity' ? 'parity' : 
                          mode === 'WorstOff' ? 'worst-off' : 'demand';
        path.spawnSignals(pressureDiff, maxNewSignals, signalType);
      }
    }
    
    path.updateThroughput();
  });
}

// Autonomous circulation: inject signals into cycles when pressure is low
function autonomousCirculation() {
  if (!showAutonomousCirculation) return;
  
  // Check if global pressure is low (adjusted with baseline activity)
  const avgPressure = nodes.reduce((sum, n) => sum + abs(n.pressure), 0) / nodes.length;
  const threshold = 0.1 + (1.0 - baselineActivity) * 0.2;
  if (avgPressure > threshold) return; // Too much pressure, skip
  
  // Find cycles (simple: triangles)
  const cycles = [];
  for (let i = 0; i < paths.length; i++) {
    for (let j = i + 1; j < paths.length; j++) {
      for (let k = j + 1; k < paths.length; k++) {
        const p1 = paths[i];
        const p2 = paths[j];
        const p3 = paths[k];
        
        // Check if they form a triangle
        if ((p1.nodeA === p2.nodeA && p2.nodeB === p3.nodeA && p3.nodeB === p1.nodeB) ||
            (p1.nodeA === p2.nodeB && p2.nodeA === p3.nodeA && p3.nodeB === p1.nodeB) ||
            (p1.nodeA === p2.nodeA && p2.nodeB === p3.nodeB && p3.nodeA === p1.nodeB)) {
          cycles.push([p1, p2, p3]);
        }
      }
    }
  }
  
  // Inject low-amplitude signals into cycles (scaled by baseline activity)
  const spawnRate = 0.1 + baselineActivity * 0.2;
  for (let cycle of cycles.slice(0, 5)) { // Limit to 5 cycles
    if (signals.length >= MAX_SIGNALS - 10) break;
    
    for (let path of cycle) {
      if (random() < spawnRate) {
        const amount = 0.01 + baselineActivity * 0.02;
        signals.push(new SignalPacket(path, random() > 0.5 ? -1 : 1, amount, 'autonomous'));
      }
    }
  }
}

// Pathway fairness: prevent single-path monopolies
function updatePathwayFairness() {
  if (!showPathwayFairness) {
    paths.forEach(p => p.conductance = p.baseConductance);
    return;
  }
  
  // Compute total throughput
  const totalThroughput = paths.reduce((sum, p) => sum + p.throughput, 0);
  if (totalThroughput < 0.01) return;
  
  // Adjust conductance based on fairness load
  paths.forEach(path => {
    const loadRatio = path.throughput / totalThroughput;
    const targetLoad = 1.0 / paths.length;
    
    // Reduce conductance if path is overused
    if (loadRatio > targetLoad * 2) {
      path.conductance = max(0.1, path.baseConductance * 0.95);
    } else {
      path.conductance = lerp(path.conductance, path.baseConductance, 0.05);
    }
    
    path.fairnessLoad = loadRatio;
  });
}

// Update signals
function updateSignals() {
  for (let i = signals.length - 1; i >= 0; i--) {
    const signal = signals[i];
    signal.update();
    
    // Check if signal arrived at endpoint
    if ((signal.direction > 0 && signal.t >= 1.0) || 
        (signal.direction < 0 && signal.t <= 0.0)) {
      signal.arrive();
      signals.splice(i, 1);
      continue;
    }
    
    // Remove expired signals
    if (signal.isExpired()) {
      signals.splice(i, 1);
    }
  }
  
  totalSignals = signals.length;
}

// Compute metrics
function computeMetrics() {
  const deficits = nodes.map(n => max(0, n.demand - n.supply));
  maxDeficit = max(deficits);
  meanDeficit = deficits.reduce((a, b) => a + b, 0) / deficits.length;
}

function setup() {
  try {
    createCanvas(1000, 800);
    colorMode(HSB, 360, 100, 100, 1);
    
    // Create offscreen buffer for signals
    signalBuffer = createGraphics(width, height);
    signalBuffer.colorMode(HSB, 360, 100, 100, 1);
    
    createTopology();
    createControls();
  } catch (error) {
    throw error;
  }
}

function createControls() {
  let y = 95, s = 30;
  
  modeSelect = createSelect();
  modeSelect.position(10, y);
  modeSelect.option('Hybrid');
  modeSelect.option('ThresholdParity');
  modeSelect.option('DemandMatching');
  modeSelect.option('WorstOff');
  modeSelect.style('width', '200px');
  modeSelect.changed(() => {
    mode = modeSelect.value();
  });
  
  signalSpeedSlider = createSlider(0.0, 1.0, 0.02, 0.01);
  signalSpeedSlider.position(10, y + s);
  signalSpeedSlider.style('width', '200px');
  
  conductanceScaleSlider = createSlider(0.0, 2.0, 1.0, 0.01);
  conductanceScaleSlider.position(10, y + s * 2);
  conductanceScaleSlider.style('width', '200px');
  
  gatingSensitivitySlider = createSlider(0.0, 2.0, 1.0, 0.01);
  gatingSensitivitySlider.position(10, y + s * 3);
  gatingSensitivitySlider.style('width', '200px');
  
  wDemandSlider = createSlider(0.0, 1.0, 0.33, 0.01);
  wDemandSlider.position(10, y + s * 4);
  wDemandSlider.style('width', '200px');
  
  wThresholdSlider = createSlider(0.0, 1.0, 0.33, 0.01);
  wThresholdSlider.position(10, y + s * 5);
  wThresholdSlider.style('width', '200px');
  
  wWorstSlider = createSlider(0.0, 1.0, 0.34, 0.01);
  wWorstSlider.position(10, y + s * 6);
  wWorstSlider.style('width', '200px');
  
  brightnessSlider = createSlider(0.5, 3.0, 1.0, 0.1);
  brightnessSlider.position(10, y + s * 7);
  brightnessSlider.style('width', '200px');
  
  baselineActivitySlider = createSlider(0.0, 1.0, 0.5, 0.05);
  baselineActivitySlider.position(10, y + s * 8);
  baselineActivitySlider.style('width', '200px');
  
  autonomousToggle = createCheckbox('Autonomous Circulation', true);
  autonomousToggle.position(10, y + s * 9);
  autonomousToggle.changed(() => {
    showAutonomousCirculation = autonomousToggle.checked();
  });
  
  fairnessToggle = createCheckbox('Pathway Fairness', true);
  fairnessToggle.position(10, y + s * 10);
  fairnessToggle.changed(() => {
    showPathwayFairness = fairnessToggle.checked();
  });
  
  playPauseButton = createButton('Pause');
  playPauseButton.position(10, y + s * 11);
  playPauseButton.mousePressed(togglePlayPause);
  
  resetButton = createButton('Reset');
  resetButton.position(80, y + s * 11);
  resetButton.mousePressed(resetSimulation);
}

function togglePlayPause() {
  isPlaying = !isPlaying;
  playPauseButton.html(isPlaying ? 'Pause' : 'Play');
}

function resetSimulation() {
  createTopology();
  stepCount = 0;
}

function draw() {
  // Brighter background for better visibility
  background(220, 10, 20);
  
  if (isPlaying) {
    // Update parameters from sliders
    signalSpeed = signalSpeedSlider.value();
    conductanceScale = conductanceScaleSlider.value();
    gatingSensitivity = gatingSensitivitySlider.value();
    wDemand = wDemandSlider.value();
    wThreshold = wThresholdSlider.value();
    wWorst = wWorstSlider.value();
    brightnessScale = brightnessSlider.value();
    baselineActivity = baselineActivitySlider.value();
    
    // Update simulation
    computePressures();
    updateEdgeFlows();
    updatePathwayFairness();
    autonomousCirculation();
    updateSignals();
    computeMetrics();
    
    stepCount++;
  }
  
  // Fade signal buffer (minimal fade to preserve circuit visibility)
  signalBuffer.push();
  signalBuffer.fill(220, 10, 20, 0.005);
  signalBuffer.noStroke();
  signalBuffer.rect(0, 0, width, height);
  signalBuffer.pop();
  
  // Draw static paths (circuit structure - always visible)
  drawPaths();
  
  // Draw static nodes (circuit structure - always visible)
  drawNodes();
  
  // Draw signals to buffer
  drawSignals();
  
  // Composite signal buffer (signals overlay on top)
  image(signalBuffer, 0, 0);
  
  // Redraw nodes and paths on top for maximum visibility
  // (subtle redraw to ensure they're never obscured)
  push();
  blendMode(NORMAL);
  for (let path of paths) {
    const a = path.nodeA;
    const b = path.nodeB;
    // Quick gold line redraw for visibility
    stroke(45, 70, min(100, 50 * brightnessScale), 0.4);
    strokeWeight(1);
    line(a.x, a.y, b.x, b.y);
  }
  pop();
  
  // Draw UI
  displayFormula();
  displayMetrics();
  displayInfoBox();
  displayControlLabels();
}

function drawPaths() {
  for (let path of paths) {
    const a = path.nodeA;
    const b = path.nodeB;
    
    // Base thickness always visible, increases with activity
    const baseThickness = 1.5;
    const activeThickness = path.throughput * 6 + path.congestion * 2;
    const thickness = baseThickness + activeThickness;
    
    // Base glow always visible, increases with activity
    const baseGlow = 25 * brightnessScale;
    const activeGlow = path.throughput * 80 * brightnessScale + path.congestion * 20;
    const glow = min(100, baseGlow + activeGlow);
    
    const baseAlpha = 0.4;
    const activeAlpha = path.gating * 0.4;
    const alpha = min(1.0, baseAlpha + activeAlpha);
    
    // Pulsing effect when signals are active
    const pulseIntensity = path.congestion > 0 ? sin(stepCount * 0.2) * 0.2 + 0.8 : 1.0;
    
    // Color based on direction and activity
    let hue = 200;
    if (path.direction === -1) hue = 180; // A→B (cyan)
    if (path.direction === 1) hue = 240; // B→A (blue)
    if (path.direction === 0) hue = 200; // Bidirectional (teal)
    if (path.direction === 2) hue = 300; // Autonomous (magenta)
    
    // Draw visible gold base path (always visible)
    push();
    stroke(45, 70, min(100, 60 * brightnessScale), 0.8); // Gold color
    strokeWeight(baseThickness * 1.5); // Thicker for visibility
    noFill();
    
    const midX = (a.x + b.x) / 2;
    const midY = (a.y + b.y) / 2;
    const perpX = -(b.y - a.y) / path.length;
    const perpY = (b.x - a.x) / path.length;
    const curveAmount = path.throughput * 5;
    
    beginShape();
    vertex(a.x, a.y);
    quadraticVertex(
      midX + perpX * curveAmount,
      midY + perpY * curveAmount,
      b.x, b.y
    );
    endShape();
    pop();
    
    // Draw active path overlay (when active)
    if (activeThickness > 0.1 || path.gating > 0.3) {
      push();
      stroke(hue, 70, glow * pulseIntensity, alpha);
      strokeWeight(thickness * pulseIntensity);
      noFill();
      
      // Dramatic pulsing when gated open or active
      if (path.gating > 0.7 || path.congestion > 0) {
        const pulse = sin(stepCount * 0.15) * 0.3 + 1.0;
        strokeWeight(thickness * pulse);
        stroke(hue, 80, min(100, glow * pulse), alpha);
      }
      
      beginShape();
      vertex(a.x, a.y);
      quadraticVertex(
        midX + perpX * curveAmount,
        midY + perpY * curveAmount,
        b.x, b.y
      );
      endShape();
      
      pop();
    }
  }
}

function drawNodes() {
  for (let node of nodes) {
    const fillRatio = node.supply / node.capacity;
    const demandRatio = node.demand / node.capacity;
    const thresholdRatio = node.threshold / node.capacity;
    
    // Color based on pressure
    let hue = 120; // Green (good)
    if (node.pressure > 0.1) hue = 0; // Red (needs supply)
    if (node.pressure < -0.1) hue = 60; // Yellow (surplus)
    
    const size = 20; // Larger base size
    
    push();
    
    // Outer glow ring (always visible for prominence)
    noFill();
    stroke(hue, 40, min(100, 40 * brightnessScale), 0.3);
    strokeWeight(1);
    ellipse(node.x, node.y, size * 1.4, size * 1.4);
    
    // Bucket/reservoir shape
    noStroke();
    
    // Overflow glow (more prominent)
    if (fillRatio > 1.0) {
      fill(hue, 80, min(100, 95 * brightnessScale), 0.4);
      ellipse(node.x, node.y, size * 1.6, size * 1.6);
    }
    
    // Deficit dryness (more prominent)
    if (fillRatio < thresholdRatio) {
      fill(hue, 90, min(100, 40 * brightnessScale), 0.5);
      ellipse(node.x, node.y, size * 0.9, size * 0.9);
    }
    
    // Bucket outline (thicker, brighter)
    stroke(hue, 70, min(100, 80 * brightnessScale), 1.0);
    strokeWeight(3);
    noFill();
    ellipse(node.x, node.y, size, size);
    
    // Inner ring for depth
    stroke(hue, 60, min(100, 60 * brightnessScale), 0.6);
    strokeWeight(1.5);
    ellipse(node.x, node.y, size * 0.85, size * 0.85);
    
    // Fill level (more prominent with gradient effect)
    const fillHeight = size * constrain(fillRatio, 0, 1);
    if (fillHeight > 0) {
      // Main fill
      fill(hue, 70, min(100, 85 * brightnessScale), 0.9);
      noStroke();
      arc(node.x, node.y, size * 0.9, size * 0.9, PI, PI + TWO_PI * (fillHeight / size));
      
      // Highlight on top of fill
      fill(hue, 50, min(100, 100 * brightnessScale), 0.6);
      arc(node.x, node.y, size * 0.7, size * 0.7, PI, PI + TWO_PI * (fillHeight / size) * 0.5);
    }
    
    // Demand line (thicker, brighter)
    stroke(200, 70, min(100, 95 * brightnessScale), 0.9);
    strokeWeight(2);
    const demandAngle = PI + TWO_PI * constrain(demandRatio, 0, 1);
    line(node.x, node.y, 
         node.x + cos(demandAngle) * size / 2,
         node.y + sin(demandAngle) * size / 2);
    
    // Demand indicator dot
    fill(200, 70, min(100, 95 * brightnessScale), 0.9);
    noStroke();
    ellipse(node.x + cos(demandAngle) * size / 2,
            node.y + sin(demandAngle) * size / 2, 3, 3);
    
    // Threshold line (thicker, brighter)
    stroke(60, 70, min(100, 95 * brightnessScale), 0.9);
    strokeWeight(2);
    const thresholdAngle = PI + TWO_PI * constrain(thresholdRatio, 0, 1);
    line(node.x, node.y,
         node.x + cos(thresholdAngle) * size / 2,
         node.y + sin(thresholdAngle) * size / 2);
    
    // Threshold indicator dot
    fill(60, 70, min(100, 95 * brightnessScale), 0.9);
    noStroke();
    ellipse(node.x + cos(thresholdAngle) * size / 2,
            node.y + sin(thresholdAngle) * size / 2, 3, 3);
    
    // Source indicator (more prominent)
    if (node.isSource) {
      fill(hue, 80, 100, 1.0);
      noStroke();
      ellipse(node.x, node.y, size * 0.4, size * 0.4);
      // Pulsing glow for sources
      fill(hue, 60, 100, 0.3);
      const pulse = sin(stepCount * 0.2) * 0.2 + 0.8;
      ellipse(node.x, node.y, size * 0.6 * pulse, size * 0.6 * pulse);
    }
    
    // Pressure indicator (subtle ring when under pressure)
    if (abs(node.pressure) > 0.05) {
      noFill();
      stroke(hue, 80, min(100, 70 * brightnessScale), 0.5);
      strokeWeight(1);
      const pressureSize = size * (1.0 + abs(node.pressure) * 0.3);
      ellipse(node.x, node.y, pressureSize, pressureSize);
    }
    
    pop();
  }
}

function drawSignals() {
  signalBuffer.push();
  signalBuffer.blendMode(ADD);
  
  for (let signal of signals) {
    const pos = signal.getPosition();
    const lifeRatio = signal.lifetime / signal.maxLifetime;
    
    // Color based on type
    let hue = 200;
    if (signal.type === 'parity') hue = 0;
    if (signal.type === 'worst-off') hue = 300;
    if (signal.type === 'autonomous') hue = 60;
    
    // Size scales with speed for dramatic effect
    const speedMultiplier = 1.0 + signalSpeed * 0.5;
    const baseAlpha = 0.3 * brightnessScale; // Reduced opacity so circuit remains visible
    const alpha = lifeRatio * baseAlpha;
    const size = signal.size * lifeRatio * speedMultiplier;
    
    // Draw motion trail for dramatic effect (especially at high speeds)
    if (signal.trail.length > 1) {
      for (let i = 0; i < signal.trail.length - 1; i++) {
        const point = signal.trail[i];
        const nextPoint = signal.trail[i + 1];
        const trailAge = point.age / signal.maxTrailLength;
        const trailAlpha = alpha * (1.0 - trailAge) * 0.4;
        const trailSize = size * (1.0 - trailAge * 0.5);
        
        // Draw trail segment
        signalBuffer.fill(hue, 70, min(100, 90 * brightnessScale), trailAlpha);
        signalBuffer.noStroke();
        signalBuffer.ellipse(point.x, point.y, trailSize, trailSize);
        
        // Draw connecting line for motion blur
        if (i < signal.trail.length - 2) {
          signalBuffer.stroke(hue, 60, min(100, 85 * brightnessScale), trailAlpha * 0.6);
          signalBuffer.strokeWeight(trailSize * 0.3);
          signalBuffer.line(point.x, point.y, nextPoint.x, nextPoint.y);
        }
      }
    }
    
    // Main glowing blob (much brighter and larger)
    signalBuffer.fill(hue, 80, min(100, 100 * brightnessScale), alpha);
    signalBuffer.noStroke();
    signalBuffer.ellipse(pos.x, pos.y, size, size);
    
    // Bright core (reduced opacity)
    signalBuffer.fill(hue, 60, 100, min(0.6, alpha * 1.2));
    signalBuffer.ellipse(pos.x, pos.y, size * 0.5, size * 0.5);
    
    // Dramatic leading edge with direction indicator (reduced opacity)
    const angle = atan2(signal.path.nodeB.y - signal.path.nodeA.y,
                        signal.path.nodeB.x - signal.path.nodeA.x);
    const leadX = pos.x + cos(angle) * size * 0.6;
    const leadY = pos.y + sin(angle) * size * 0.6;
    signalBuffer.fill(hue, 50, 100, min(0.7, alpha * 1.8));
    signalBuffer.ellipse(leadX, leadY, size * 0.4, size * 0.4);
    
    // Outer glow halo (reduced opacity)
    signalBuffer.fill(hue, 90, min(100, 70 * brightnessScale), alpha * 0.15);
    signalBuffer.ellipse(pos.x, pos.y, size * 1.8, size * 1.8);
  }
  
  signalBuffer.pop();
}

function displayFormula() {
  push();
  fill(0, 0, 15, 0.92);
  stroke(200, 50, 70, 0.8);
  strokeWeight(2);
  rect(10, 10, 500, 60, 5);
  
  fill(255);
  noStroke();
  textAlign(LEFT);
  textSize(13);
  textStyle(BOLD);
  text("Advanced Cytoneme Circuitry: Fair Signal Flow", 20, 32);
  
  textSize(11);
  textStyle(NORMAL);
  fill(200, 70, 95);
  text(`Mode: ${mode}  |  Signals: ${totalSignals}  |  Active Paths: ${activePaths}`, 20, 50);
  pop();
}

function displayMetrics() {
  push();
  fill(0, 0, 100, 0.85);
  stroke(0, 0, 60, 0.5);
  rect(width - 280, 10, 270, 150);
  
  fill(0, 0, 0);
  textSize(13);
  textStyle(BOLD);
  text('Circuit Metrics', width - 270, 28);
  textStyle(NORMAL);
  
  textSize(11);
  fill(255);
  text(`Max Deficit: ${maxDeficit.toFixed(4)}`, width - 270, 50);
  text(`Mean Deficit: ${meanDeficit.toFixed(4)}`, width - 270, 70);
  text(`Active Paths: ${activePaths} / ${paths.length}`, width - 270, 90);
  text(`Signals in Motion: ${totalSignals}`, width - 270, 110);
  
  if (mode === 'Hybrid') {
    text(`Weights: D=${wDemand.toFixed(2)} T=${wThreshold.toFixed(2)} W=${wWorst.toFixed(2)}`, width - 270, 130);
  }
  
  pop();
}

function displayInfoBox() {
  const infoX = width - 40;
  const metricsPanelHeight = 150;
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
        "MODEL AND FAIRNESS:",
        "Advanced Cytoneme Circuitry models fairness as signal-matter flowing through a fixed circuit. Nodes and paths are immutable; only signals move. Fairness emerges from how signals are routed, gated, reversed, amplified, and throttled through the network.",
        "",
        "FIXED TOPOLOGY:",
        "Nodes are placed in a fixed grid layout and never move. Paths connect nodes and are immutable once created. This models institutional/infrastructural rigidity. The circuit structure represents constraints that cannot be easily changed.",
        "",
        "NODE STATE:",
        "Each node has:",
        "• supply: current amount held (bucket fill)",
        "• demand: target amount",
        "• threshold: minimum acceptable level",
        "• capacity: maximum bucket size",
        "",
        "Nodes visually show reservoirs/buckets with visible fill levels, target lines (demand or threshold), overflow glow, or deficit dryness.",
        "",
        "SIGNAL FLOW:",
        "Signals are discrete packets of goo that flow along paths. Each signal has:",
        "• position along path (t ∈ [0,1])",
        "• direction (+1 or -1)",
        "• amount (resource carried)",
        "• lifetime",
        "• type (demand/parity/worst-off/autonomous)",
        "",
        "Signals spawn from nodes with surplus or source status, flow along pathways, and arrive at destination nodes to update supply.",
        "",
        "FAIRNESS MODES:",
        "1. Threshold Parity: Nodes below threshold generate strong pull pressure. Paths reorient to feed these nodes. Once threshold is met, pressure collapses.",
        "",
        "2. Demand Matching: Continuous flows toward unmet demand. Stable bidirectional flows emerge. Minimal urgency; smooth circulation.",
        "",
        "3. Worst-Off Minimization: System focuses flow aggressively toward most underserved nodes. Other nodes temporarily starve. Visually dramatic rerouting.",
        "",
        "4. Hybrid (Default): Combines all three modes with weights. Threshold acts as floor, worst-off adds urgency, demand matching smooths once stable.",
        "",
        "PRESSURE SYSTEM:",
        "Each node computes pressure from:",
        "• demandPressure = demand - supply",
        "• thresholdPressure = max(0, threshold - supply)",
        "• worstOffPressure = priority weight based on rank",
        "",
        "Total pressure = wDemand·demandPressure + wThreshold·thresholdPressure + wWorst·worstOffPressure",
        "",
        "EDGE FLOW LOGIC:",
        "Each frame:",
        "• Compute pressure difference across each path",
        "• Determine flow direction (forward/backward/bidirectional)",
        "• Gating increases when endpoints have high pressure",
        "• Spawn signal packets proportional to |pressure difference| and conductance",
        "",
        "AUTONOMOUS CIRCULATION:",
        "When global pressure is low, the system injects low-amplitude circulating signals around cycles. This represents baseline physiological/institutional circulation, keeping the system alive even when fair.",
        "",
        "PATHWAY FAIRNESS:",
        "The circuit itself must not become unfair. Throughput is tracked per path. If a path carries too much of total flow, its conductance is temporarily reduced, encouraging alternative paths and preventing single-path monopolies.",
        "",
        "VISUAL AESTHETIC:",
        "• Soft glowing blobs for signals (metaball-like)",
        "• Fading trails using offscreen buffer",
        "• Additive blending for organic feel",
        "• Thickness modulation on active paths",
        "• Subtle jitter for organic movement",
        "• NO arrows or hard lines",
        "",
        "OBSERVATIONS:",
        "Watch how signals flow like connective goo through the circuit. In Threshold Parity mode, watch paths pulse and redirect toward nodes below threshold. In Worst-Off mode, observe dramatic rerouting as the system focuses on most underserved nodes. Hybrid mode shows balanced behavior with all three mechanisms working together."
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
    text("Advanced Cytoneme Circuitry", boxX + 15, headerY);
    
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

// Spawn signals from a clicked node
function spawnSignalsFromNode(node) {
  if (signals.length >= MAX_SIGNALS - 20) return; // Leave room for other signals
  
  // Find all paths connected to this node
  const connectedPaths = paths.filter(p => p.nodeA === node || p.nodeB === node);
  
  // Spawn signals on connected paths
  for (let path of connectedPaths) {
    if (signals.length >= MAX_SIGNALS) break;
    
    // Determine direction based on which node was clicked
    const direction = path.nodeA === node ? -1 : 1;
    const amount = random(0.02, 0.08);
    const signalType = mode === 'ThresholdParity' ? 'parity' : 
                      mode === 'WorstOff' ? 'worst-off' : 'demand';
    
    // Spawn 2-4 signals per path for visual impact
    const numSignals = floor(random(2, 5));
    for (let i = 0; i < numSignals && signals.length < MAX_SIGNALS; i++) {
      signals.push(new SignalPacket(path, direction, amount, signalType));
    }
  }
}

function mousePressed() {
  const infoX = width - 40;
  const metricsPanelHeight = 150;
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
  
  // Check for node clicks (only if not clicking on UI elements)
  if (mouseX < width - 300 && mouseY > 100) {
    const nodeSize = 20;
    for (let node of nodes) {
      const distToNode = dist(mouseX, mouseY, node.x, node.y);
      if (distToNode < nodeSize / 2) {
        spawnSignalsFromNode(node);
        return false;
      }
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
      // Scale delta for smoother scrolling
      const scrollSpeed = 0.5;
      infoBoxScrollOffset -= event.delta * scrollSpeed;
      
      // Constrain scroll offset (need to recalculate maxScroll)
      if (cachedWrappedText) {
        const lineHeight = 15;
        let totalHeight = 60;
        for (let item of cachedWrappedText) {
          totalHeight += item.wrapped.length * lineHeight;
        }
        const maxScroll = max(0, totalHeight - boxHeight + 20);
        infoBoxScrollOffset = constrain(infoBoxScrollOffset, 0, maxScroll);
      }
      
      return false; // Prevent default scrolling
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
    { text: `Mode: ${mode}`, x: 220, y: y + 5 },
    { text: `Signal Speed: ${signalSpeedSlider.value().toFixed(2)}x`, x: 220, y: y + spacing + 5 },
    { text: `Conductance: ${conductanceScaleSlider.value().toFixed(2)}`, x: 220, y: y + spacing * 2 + 5 },
    { text: `Gating Sensitivity: ${gatingSensitivitySlider.value().toFixed(2)}`, x: 220, y: y + spacing * 3 + 5 },
    { text: `wDemand: ${wDemandSlider.value().toFixed(2)}`, x: 220, y: y + spacing * 4 + 5 },
    { text: `wThreshold: ${wThresholdSlider.value().toFixed(2)}`, x: 220, y: y + spacing * 5 + 5 },
    { text: `wWorst: ${wWorstSlider.value().toFixed(2)}`, x: 220, y: y + spacing * 6 + 5 },
    { text: `Brightness: ${brightnessSlider.value().toFixed(1)}`, x: 220, y: y + spacing * 7 + 5 },
    { text: `Baseline Activity: ${baselineActivitySlider.value().toFixed(2)}`, x: 220, y: y + spacing * 8 + 5 }
  ];
  
  for (let label of labels) {
    text(label.text, label.x, label.y);
  }
  
  pop();
}

