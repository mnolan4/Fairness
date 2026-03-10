// Self-Organizing Fairness Ecosystem
// An interactive visualization of autonomous agents
// self-organizing through a universal principle of fairness

let agents = [];
let fairnessSystem;
let entropyHistory = [];
let maxEntropyHistory = 200;

// UI Controls
let fairnessSensitivitySlider;
let neighborhoodRadiusSlider;
let noiseLevelSlider;
let agentCountSlider;
let canvasWidthSlider;
let canvasHeightSlider;
let weightDistributionSlider;

// Display parameters
let canvasWidth = 1000;
let canvasHeight = 800;
let showMetrics = true;
let showEntropyGraph = true;
let lastWeightDistribution = 1.0;

function setup() {
  createCanvas(canvasWidth, canvasHeight);
  colorMode(HSB, 360, 100, 100, 1);
  
  // Initialize fairness system
  fairnessSystem = new FairnessSystem();
  
  // Create UI controls
  createControls();
  
  // Initialize agents
  initializeAgents(50);
}

function createControls() {
  // Control panel styling
  let controlY = 10;
  let controlSpacing = 30;
  
  fairnessSensitivitySlider = createSlider(0, 1, 0.3, 0.01);
  fairnessSensitivitySlider.position(10, controlY);
  fairnessSensitivitySlider.style('width', '200px');
  
  neighborhoodRadiusSlider = createSlider(20, 200, 80, 5);
  neighborhoodRadiusSlider.position(10, controlY + controlSpacing);
  neighborhoodRadiusSlider.style('width', '200px');
  
  noiseLevelSlider = createSlider(0, 2, 0.5, 0.1);
  noiseLevelSlider.position(10, controlY + controlSpacing * 2);
  noiseLevelSlider.style('width', '200px');
  
  agentCountSlider = createSlider(10, 200, 50, 5);
  agentCountSlider.position(10, controlY + controlSpacing * 3);
  agentCountSlider.style('width', '200px');
  
  canvasWidthSlider = createSlider(400, 1600, canvasWidth, 50);
  canvasWidthSlider.position(10, controlY + controlSpacing * 4);
  canvasWidthSlider.style('width', '200px');
  
  canvasHeightSlider = createSlider(300, 1200, canvasHeight, 50);
  canvasHeightSlider.position(10, controlY + controlSpacing * 5);
  canvasHeightSlider.style('width', '200px');
  
  weightDistributionSlider = createSlider(0.1, 3, 1, 0.1);
  weightDistributionSlider.position(10, controlY + controlSpacing * 6);
  weightDistributionSlider.style('width', '200px');
}

function initializeAgents(count) {
  agents = [];
  let w = width || canvasWidth;
  let h = height || canvasHeight;
  for (let i = 0; i < count; i++) {
    let x = random(50, w - 50);
    let y = random(50, h - 50);
    let utility = random(0.3, 0.7);
    let weight = random(0.5, 1.5) * weightDistributionSlider.value();
    agents.push(new FairAgent(x, y, utility, weight));
  }
  lastWeightDistribution = weightDistributionSlider.value();
}

function draw() {
  // Update canvas size if sliders changed
  let newWidth = canvasWidthSlider.value();
  let newHeight = canvasHeightSlider.value();
  if (newWidth !== width || newHeight !== height) {
    resizeCanvas(newWidth, newHeight);
    canvasWidth = newWidth;
    canvasHeight = newHeight;
  }
  
  // Update agent count if slider changed
  let targetCount = agentCountSlider.value();
  if (agents.length !== targetCount) {
    if (agents.length < targetCount) {
      // Add agents
      for (let i = agents.length; i < targetCount; i++) {
        let x = random(50, width - 50);
        let y = random(50, height - 50);
        let utility = random(0.3, 0.7);
        let weight = random(0.5, 1.5) * weightDistributionSlider.value();
        agents.push(new FairAgent(x, y, utility, weight));
      }
    } else {
      // Remove agents
      agents = agents.slice(0, targetCount);
    }
  }
  
  // Update weights if distribution changed
  let currentWeightDist = weightDistributionSlider.value();
  if (abs(currentWeightDist - lastWeightDistribution) > 0.05) {
    for (let agent of agents) {
      agent.weight = random(0.5, 1.5) * currentWeightDist;
    }
    lastWeightDistribution = currentWeightDist;
  }
  
  // Background with system state influence
  let fc = fairnessSystem.calculateFairnessCoefficient(agents);
  let bgBrightness = map(fc, 0, 1, 5, 15);
  let bgHue = map(fc, 0, 1, 0, 120); // Red to green based on fairness
  background(bgHue, 30, bgBrightness);
  
  // Add subtle visual noise when fairness is low
  if (fc < 0.4) {
    push();
    blendMode(OVERLAY);
    for (let i = 0; i < 20; i++) {
      fill(random(360), 50, random(10, 30), 0.1);
      noStroke();
      ellipse(random(width), random(height), random(5, 15), random(5, 15));
    }
    pop();
  }
  
  // Update all agents
  for (let agent of agents) {
    agent.update(agents, 
                 neighborhoodRadiusSlider.value(),
                 noiseLevelSlider.value(),
                 fairnessSensitivitySlider.value());
  }
  
  // Calculate and store metrics
  let metrics = fairnessSystem.calculateAllMetrics(agents);
  entropyHistory.push(metrics.entropy);
  if (entropyHistory.length > maxEntropyHistory) {
    entropyHistory.shift();
  }
  
  // Draw connections between nearby agents (visualize neighborhood)
  if (metrics.fc > 0.5) {
    drawAgentConnections(metrics.fc);
  }
  
  // Display agents
  for (let agent of agents) {
    agent.display(metrics.fc);
  }
  
  // Display metrics
  if (showMetrics) {
    displayMetrics(metrics);
  }
  
  // Display entropy graph
  if (showEntropyGraph) {
    displayEntropyGraph();
  }
  
  // Display control labels
  displayControlLabels();
}

function displayMetrics(metrics) {
  push();
  
  // Background panel with border
  fill(0, 0, 100, 0.85);
  stroke(0, 0, 60, 0.5);
  strokeWeight(1);
  rect(width - 250, 10, 240, 200);
  
  // Title
  fill(0, 0, 0);
  textAlign(LEFT);
  textSize(13);
  textStyle(BOLD);
  text("System Metrics", width - 240, 28);
  textStyle(NORMAL);
  
  // Metrics
  textSize(11);
  fill(0, 0, 20);
  text(`Fairness Coefficient: ${metrics.fc.toFixed(3)}`, width - 240, 48);
  text(`Weighted FC: ${metrics.weightedFC.toFixed(3)}`, width - 240, 65);
  text(`Mean Utility: ${metrics.meanUtility.toFixed(3)}`, width - 240, 82);
  text(`Variance: ${metrics.variance.toFixed(4)}`, width - 240, 99);
  text(`Entropy: ${metrics.entropy.toFixed(4)}`, width - 240, 116);
  
  // Fairness bar
  let barWidth = 200;
  let barHeight = 8;
  let barX = width - 240;
  let barY = 135;
  
  // Background bar
  fill(0, 0, 30);
  noStroke();
  rect(barX, barY, barWidth, barHeight);
  
  // Fairness bar (color-coded)
  let fcColor = metrics.fc > 0.6 ? color(120, 80, 80) : 
                metrics.fc > 0.4 ? color(60, 80, 80) : 
                color(0, 80, 80);
  fill(fcColor);
  rect(barX, barY, barWidth * metrics.fc, barHeight);
  
  // System state
  let state = metrics.fc > 0.8 ? "Harmonious" : 
              metrics.fc > 0.6 ? "Balanced" : 
              metrics.fc > 0.4 ? "Turbulent" : "Chaotic";
  fill(metrics.fc > 0.6 ? 120 : metrics.fc > 0.4 ? 60 : 0, 80, 80);
  textSize(12);
  textStyle(BOLD);
  text(`State: ${state}`, width - 240, 160);
  textStyle(NORMAL);
  
  // System mood (emotional equilibrium)
  let mood = metrics.fc > 0.75 ? "😊 Content" : 
             metrics.fc > 0.5 ? "😐 Neutral" : 
             metrics.fc > 0.25 ? "😟 Stressed" : "😰 Distressed";
  textSize(11);
  fill(0, 0, 20);
  text(`Mood: ${mood}`, width - 240, 180);
  
  pop();
}

function displayEntropyGraph() {
  if (entropyHistory.length < 2) return;
  
  push();
  let graphWidth = 300;
  let graphHeight = 150;
  let graphX = width - graphWidth - 10;
  let graphY = height - graphHeight - 10;
  
  // Background with border
  fill(0, 0, 20, 0.85);
  stroke(0, 0, 60, 0.5);
  strokeWeight(1);
  rect(graphX, graphY, graphWidth, graphHeight);
  
  // Title
  fill(0, 0, 100);
  textSize(11);
  textAlign(LEFT);
  textStyle(BOLD);
  text("Entropy Over Time", graphX + 5, graphY + 15);
  textStyle(NORMAL);
  
  // Calculate bounds with padding to prevent clipping
  let minEntropy = min(entropyHistory);
  let maxEntropy = max(entropyHistory);
  let entropyRange = maxEntropy - minEntropy;
  
  // Ensure minimum range for visibility
  if (entropyRange < 0.01) {
    entropyRange = 0.1;
    let center = (minEntropy + maxEntropy) / 2;
    minEntropy = max(0, center - entropyRange / 2);
    maxEntropy = min(1, center + entropyRange / 2);
  }
  
  // Add padding (15% on each side) to ensure all values are visible
  let padding = entropyRange * 0.15;
  minEntropy = max(0, minEntropy - padding);
  maxEntropy = min(1, maxEntropy + padding);
  entropyRange = maxEntropy - minEntropy;
  
  // Draw grid lines
  stroke(0, 0, 40, 0.3);
  strokeWeight(1);
  for (let i = 0; i <= 4; i++) {
    let y = map(i / 4, 0, 1, graphY + graphHeight - 10, graphY + 30);
    line(graphX + 10, y, graphX + graphWidth - 10, y);
  }
  
  // Draw graph line with gradient effect
  noFill();
  strokeWeight(2);
  
  // Main line
  stroke(200, 80, 80);
  beginShape();
  for (let i = 0; i < entropyHistory.length; i++) {
    let x = map(i, 0, entropyHistory.length - 1, graphX + 10, graphX + graphWidth - 10);
    let y = map(entropyHistory[i], minEntropy, maxEntropy, 
                graphY + graphHeight - 10, graphY + 30);
    vertex(x, y);
  }
  endShape();
  
  // Fill area under curve
  fill(200, 80, 80, 0.2);
  noStroke();
  beginShape();
  vertex(graphX + 10, graphY + graphHeight - 10);
  for (let i = 0; i < entropyHistory.length; i++) {
    let x = map(i, 0, entropyHistory.length - 1, graphX + 10, graphX + graphWidth - 10);
    let y = map(entropyHistory[i], minEntropy, maxEntropy, 
                graphY + graphHeight - 10, graphY + 30);
    vertex(x, y);
  }
  vertex(graphX + graphWidth - 10, graphY + graphHeight - 10);
  endShape(CLOSE);
  
  // Axis labels
  fill(0, 0, 60);
  textSize(8);
  textAlign(LEFT);
  text(`${minEntropy.toFixed(2)}`, graphX + 5, graphY + graphHeight - 5);
  text(`${maxEntropy.toFixed(2)}`, graphX + 5, graphY + 30);
  
  // Current value indicator
  if (entropyHistory.length > 0) {
    let currentEntropy = entropyHistory[entropyHistory.length - 1];
    let x = graphX + graphWidth - 10;
    let y = map(currentEntropy, minEntropy, maxEntropy, 
                graphY + graphHeight - 10, graphY + 30);
    fill(200, 80, 80);
    noStroke();
    ellipse(x, y, 6, 6);
  }
  
  pop();
}

function displayControlLabels() {
  push();
  fill(0, 0, 100, 0.9);
  textAlign(LEFT);
  textSize(10);
  let y = 10;
  let spacing = 30;
  
  text(`Fairness Sensitivity: ${fairnessSensitivitySlider.value().toFixed(2)}`, 220, y + 5);
  text(`Neighborhood Radius: ${neighborhoodRadiusSlider.value()}`, 220, y + spacing + 5);
  text(`Noise Level: ${noiseLevelSlider.value().toFixed(1)}`, 220, y + spacing * 2 + 5);
  text(`Agent Count: ${agentCountSlider.value()}`, 220, y + spacing * 3 + 5);
  text(`Canvas: ${canvasWidthSlider.value()}×${canvasHeightSlider.value()}`, 220, y + spacing * 4 + 5);
  text(`Weight Distribution: ${weightDistributionSlider.value().toFixed(1)}`, 220, y + spacing * 5 + 5);
  
  pop();
}

function drawAgentConnections(fc) {
  let radius = neighborhoodRadiusSlider.value();
  push();
  stroke(200, 50, 80, map(fc, 0.5, 1, 0.1, 0.3));
  strokeWeight(1);
  noFill();
  
  for (let i = 0; i < agents.length; i++) {
    for (let j = i + 1; j < agents.length; j++) {
      let dist = p5.Vector.dist(agents[i].pos, agents[j].pos);
      if (dist < radius * 0.8) {
        let alpha = map(dist, 0, radius * 0.8, 0.3, 0.05);
        stroke(200, 50, 80, alpha);
        line(agents[i].pos.x, agents[i].pos.y, 
             agents[j].pos.x, agents[j].pos.y);
      }
    }
  }
  pop();
}

