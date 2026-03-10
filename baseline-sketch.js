// Baseline Model - Self-Organizing Fairness Ecosystem
// Using global p5.js mode (not instance mode)

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
  let controlY = 60; // Start below menu bar
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
    // Create FairAgent with p5 instance (we'll use a wrapper)
    agents.push(new FairAgentGlobal(x, y, utility, weight));
  }
  lastWeightDistribution = weightDistributionSlider.value();
}

// Wrapper class to use FairAgent with global p5 mode
class FairAgentGlobal {
  constructor(x, y, utility, weight) {
    // Create a dummy p5 object that references global functions
    this.p = {
      createVector: (x, y) => createVector(x, y),
      random: (a, b) => b !== undefined ? random(a, b) : random(a),
      TWO_PI: TWO_PI,
      constrain: constrain,
      lerp: lerp,
      map: map,
      sin: sin,
      cos: cos,
      dist: dist,
      push: () => push(),
      pop: () => pop(),
      fill: (...args) => fill(...args),
      noFill: () => noFill(),
      stroke: (...args) => stroke(...args),
      noStroke: () => noStroke(),
      strokeWeight: (w) => strokeWeight(w),
      ellipse: (x, y, w, h) => ellipse(x, y, w, h),
      drawingContext: drawingContext
    };
    this.agent = new FairAgent(this.p, x, y, utility, weight);
  }
  
  get pos() { return this.agent.pos; }
  get vel() { return this.agent.vel; }
  get utility() { return this.agent.utility; }
  set utility(v) { this.agent.utility = v; }
  get weight() { return this.agent.weight; }
  set weight(v) { this.agent.weight = v; }
  
  update(agents, neighborhoodRadius, noiseLevel, fairnessSensitivity) {
    this.agent.update(agents.map(a => a.agent), neighborhoodRadius, noiseLevel, fairnessSensitivity);
  }
  
  display(globalFC) {
    this.agent.display(globalFC);
  }
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
      for (let i = agents.length; i < targetCount; i++) {
        let x = random(50, width - 50);
        let y = random(50, height - 50);
        let utility = random(0.3, 0.7);
        let weight = random(0.5, 1.5) * weightDistributionSlider.value();
        agents.push(new FairAgentGlobal(x, y, utility, weight));
      }
    } else {
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
  let fc = fairnessSystem.calculateFairnessCoefficient(agents.map(a => a.agent));
  let bgBrightness = map(fc, 0, 1, 5, 15);
  let bgHue = map(fc, 0, 1, 0, 120);
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
    // Boundary wrapping
    if (agent.pos.x < 0) agent.pos.x = width;
    if (agent.pos.x > width) agent.pos.x = 0;
    if (agent.pos.y < 0) agent.pos.y = height;
    if (agent.pos.y > height) agent.pos.y = 0;
  }
  
  // Calculate and store metrics
  let metrics = fairnessSystem.calculateAllMetrics(agents.map(a => a.agent));
  entropyHistory.push(metrics.entropy);
  if (entropyHistory.length > maxEntropyHistory) {
    entropyHistory.shift();
  }
  
  // Draw connections between nearby agents
  if (metrics.fc > 0.5) {
    drawAgentConnections(metrics.fc);
  }
  
  // Display agents
  for (let agent of agents) {
    agent.display(metrics.fc);
  }
  
  // Display metrics
  displayMetrics(metrics);
  
  // Display entropy graph
  displayEntropyGraph();
  
  // Display info box
  displayInfoBox();
  
  // Display control labels
  displayControlLabels();
}

function displayMetrics(metrics) {
  push();
  
  fill(0, 0, 100, 0.85);
  stroke(0, 0, 60, 0.5);
  strokeWeight(1);
  rect(width - 250, 10, 240, 200);
  
  fill(0, 0, 0);
  textAlign(LEFT);
  textSize(13);
  textStyle(BOLD);
  text("System Metrics", width - 240, 28);
  textStyle(NORMAL);
  
  textSize(11);
  fill(0, 0, 20);
  text(`Fairness Coefficient: ${metrics.fc.toFixed(3)}`, width - 240, 48);
  text(`Weighted FC: ${metrics.weightedFC.toFixed(3)}`, width - 240, 65);
  text(`Mean Utility: ${metrics.meanUtility.toFixed(3)}`, width - 240, 82);
  text(`Variance: ${metrics.variance.toFixed(4)}`, width - 240, 99);
  text(`Entropy: ${metrics.entropy.toFixed(4)}`, width - 240, 116);
  
  let barWidth = 200, barHeight = 8, barX = width - 240, barY = 135;
  fill(0, 0, 30); noStroke(); rect(barX, barY, barWidth, barHeight);
  let fcColor = metrics.fc > 0.6 ? color(120, 80, 80) : 
                metrics.fc > 0.4 ? color(60, 80, 80) : 
                color(0, 80, 80);
  fill(fcColor); rect(barX, barY, barWidth * metrics.fc, barHeight);
  
  let state = metrics.fc > 0.8 ? "Harmonious" : 
              metrics.fc > 0.6 ? "Balanced" : 
              metrics.fc > 0.4 ? "Turbulent" : "Chaotic";
  fill(metrics.fc > 0.6 ? 120 : metrics.fc > 0.4 ? 60 : 0, 80, 80);
  textSize(12); textStyle(BOLD);
  text(`State: ${state}`, width - 240, 160);
  textStyle(NORMAL);
  
  let mood = metrics.fc > 0.75 ? "😊 Content" : 
             metrics.fc > 0.5 ? "😐 Neutral" : 
             metrics.fc > 0.25 ? "😟 Stressed" : "😰 Distressed";
  textSize(11); fill(0, 0, 20);
  text(`Mood: ${mood}`, width - 240, 180);
  
  pop();
}

function displayInfoBox() {
  const infoX = width - 40;
  const metricsPanelHeight = 200;
  const infoY = 10 + metricsPanelHeight - 25; // Bottom of metrics panel
  const infoSize = 20;
  
  // Check if mouse is over info icon
  const mouseOverInfo = mouseX >= infoX - 5 && mouseX <= infoX + infoSize + 5 &&
                        mouseY >= infoY - 5 && mouseY <= infoY + infoSize + 5;
  
  // Draw info icon
  push();
  fill(200, 50, 80, mouseOverInfo ? 1 : 0.7);
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(16);
  textStyle(BOLD);
  text("ℹ", infoX + infoSize/2, infoY + infoSize/2);
  pop();
  
  // Draw info box if hovering
  if (mouseOverInfo) {
    push();
    const boxWidth = 400;
    const boxHeight = 500;
    const boxX = width - boxWidth - 50;
    const boxY = infoY + infoSize + 10; // Position below icon
    
    fill(0);
    stroke(200, 50, 80, 0.8);
    strokeWeight(2);
    rect(boxX, boxY, boxWidth, boxHeight, 8);
    
    noStroke();
    fill(255);
    textSize(16);
    textStyle(BOLD);
    textAlign(LEFT);
    text("Baseline Model", boxX + 15, boxY + 30);
    
    textStyle(NORMAL);
    textSize(11);
    fill(255);
    let textY = boxY + 55;
    const lineHeight = 15;
    const margin = 15;
    const textWidth = boxWidth - margin * 2;
    
    const description = [
      "DESCRIPTION:",
      "The Baseline Model demonstrates the fundamental fairness coefficient calculation. Agents continuously adjust their utility based on local neighborhood fairness, creating emergent patterns of equity through decentralized interactions.",
      "",
      "RELATION TO FAIRNESS:",
      "This model shows how fairness emerges from simple local rules: agents compare their utility to neighbors and transfer resources to correct imbalances. No central authority is needed—fairness self-organizes through micro-corrections.",
      "",
      "INTERPRETING METRICS:",
      "• Fairness Coefficient (FC): 0-1 scale. Higher values (green) indicate more equitable utility distribution. Values above 0.7 suggest stable fairness.",
      "",
      "• Entropy: Measures system disorder. Initially high entropy shows diverse utilities. As fairness increases, entropy typically decreases as utilities converge.",
      "",
      "• Variance: Lower variance means more uniform utility distribution. Watch how variance decreases as the system self-organizes toward fairness.",
      "",
      "• Weighted Fairness: Considers agent importance (weights). Higher weighted fairness means fairness is achieved even when agents have different significance.",
      "",
      "OBSERVATIONS:",
      "Watch how agents cluster by utility (color). Fair neighborhoods stabilize, while unfair ones show active movement as agents seek better conditions."
    ];
    
    for (let line of description) {
      noStroke();
      if (line.startsWith("•") || (line === line.toUpperCase() && line.length > 0 && !line.includes(":"))) {
        fill(255);
        textStyle(BOLD);
      } else {
        fill(255);
        textStyle(NORMAL);
      }
      const wrapped = wrapTextForInfo(line, textWidth);
      for (let wrappedLine of wrapped) {
        text(wrappedLine, boxX + margin, textY);
        textY += lineHeight;
      }
    }
    
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
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines.length > 0 ? lines : [""];
}

function displayEntropyGraph() {
  if (entropyHistory.length < 2) return;
  
  push();
  let graphWidth = 300, graphHeight = 150;
  let graphX = width - graphWidth - 10, graphY = height - graphHeight - 10;
  
  fill(0, 0, 20, 0.85);
  stroke(0, 0, 60, 0.5);
  strokeWeight(1);
  rect(graphX, graphY, graphWidth, graphHeight);
  
  fill(0, 0, 100);
  textSize(11);
  textAlign(LEFT);
  textStyle(BOLD);
  text("Entropy Over Time", graphX + 5, graphY + 15);
  textStyle(NORMAL);
  
  // Calculate bounds with padding
  let minEntropy = min(entropyHistory);
  let maxEntropy = max(entropyHistory);
  let entropyRange = maxEntropy - minEntropy;
  
  if (entropyRange < 0.01) {
    entropyRange = 0.1;
    let center = (minEntropy + maxEntropy) / 2;
    minEntropy = max(0, center - entropyRange / 2);
    maxEntropy = min(1, center + entropyRange / 2);
  }
  
  let padding = entropyRange * 0.15;
  minEntropy = max(0, minEntropy - padding);
  maxEntropy = min(1, maxEntropy + padding);
  entropyRange = maxEntropy - minEntropy;
  
  // Grid lines
  stroke(0, 0, 40, 0.3);
  strokeWeight(1);
  for (let i = 0; i <= 4; i++) {
    let y = map(i / 4, 0, 1, graphY + graphHeight - 10, graphY + 30);
    line(graphX + 10, y, graphX + graphWidth - 10, y);
  }
  
  // Graph line
  noFill();
  strokeWeight(2);
  stroke(200, 80, 80);
  beginShape();
  for (let i = 0; i < entropyHistory.length; i++) {
    let x = map(i, 0, entropyHistory.length - 1, graphX + 10, graphX + graphWidth - 10);
    let y = map(entropyHistory[i], minEntropy, maxEntropy, 
                graphY + graphHeight - 10, graphY + 30);
    vertex(x, y);
  }
  endShape();
  
  // Fill area
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
  
  // Labels
  fill(0, 0, 60);
  textSize(8);
  textAlign(LEFT);
  text(`${minEntropy.toFixed(2)}`, graphX + 5, graphY + graphHeight - 5);
  text(`${maxEntropy.toFixed(2)}`, graphX + 5, graphY + 30);
  
  // Current indicator
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
  let y = 60, spacing = 30; // Start below menu bar
  
  const labels = [
    { text: `Fairness Sensitivity: ${fairnessSensitivitySlider.value().toFixed(2)}`, x: 220, y: y + 5, desc: "Controls how strongly agents respond to fairness imbalances in their neighborhood. Higher values mean agents transfer more utility to correct unfairness." },
    { text: `Neighborhood Radius: ${neighborhoodRadiusSlider.value()}`, x: 220, y: y + spacing + 5, desc: "The distance within which agents consider others as neighbors. Larger radius means agents are aware of more agents but may respond to more distant imbalances." },
    { text: `Noise Level: ${noiseLevelSlider.value().toFixed(1)}`, x: 220, y: y + spacing * 2 + 5, desc: "Random movement and behavior variation. Higher noise adds unpredictability and can help agents escape local optima." },
    { text: `Agent Count: ${agentCountSlider.value()}`, x: 220, y: y + spacing * 3 + 5, desc: "Total number of agents in the system. More agents create denser neighborhoods and more complex interactions." },
    { text: `Canvas: ${canvasWidthSlider.value()}×${canvasHeightSlider.value()}`, x: 220, y: y + spacing * 4 + 5, desc: "Size of the visualization canvas. Larger canvas spreads agents out, smaller canvas creates denser clusters." },
    { text: `Weight Distribution: ${weightDistributionSlider.value().toFixed(1)}`, x: 220, y: y + spacing * 6 + 5, desc: "Multiplier for agent weights. Higher values create greater inequality in agent weights, affecting weighted fairness calculations." }
  ];
  
  // Draw labels and check for hover
  let hoveredLabel = null;
  for (let label of labels) {
    // Check if mouse is over label (approximate text width)
    const labelWidth = textWidth(label.text);
    if (mouseX >= label.x && mouseX <= label.x + labelWidth && 
        mouseY >= label.y - 10 && mouseY <= label.y + 5) {
      hoveredLabel = label;
      // Make label slightly brighter on hover
      fill(0, 0, 100, 1);
    } else {
      fill(0, 0, 100, 0.9);
    }
    text(label.text, label.x, label.y);
  }
  
  // Display tooltip if hovering
  if (hoveredLabel) {
    displayTooltip(hoveredLabel);
  }
  
  pop();
}

function displayTooltip(label) {
  push();
  const padding = 10;
  const maxWidth = 300;
  const lineHeight = 14;
  const lines = wrapText(label.desc, maxWidth);
  const tooltipHeight = lines.length * lineHeight + padding * 2;
  const tooltipWidth = maxWidth + padding * 2;
  
  // Position tooltip to the right of label, or left if too close to edge
  let tooltipX = label.x + 200;
  if (tooltipX + tooltipWidth > width) {
    tooltipX = label.x - tooltipWidth - 10;
  }
  let tooltipY = label.y - 5;
  if (tooltipY + tooltipHeight > height) {
    tooltipY = height - tooltipHeight - 10;
  }
  
  // Background
  fill(0, 0, 20, 0.95);
  stroke(0, 0, 60, 0.8);
  strokeWeight(1);
  rect(tooltipX, tooltipY, tooltipWidth, tooltipHeight, 4);
  
  // Text
  fill(0, 0, 100);
  textSize(11);
  textAlign(LEFT);
  let textY = tooltipY + padding + lineHeight;
  for (let line of lines) {
    text(line, tooltipX + padding, textY);
    textY += lineHeight;
  }
  
  pop();
}

function wrapText(text, maxWidth) {
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
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines;
}

function drawAgentConnections(fc) {
  let radius = neighborhoodRadiusSlider.value();
  push();
  stroke(200, 50, 80, map(fc, 0.5, 1, 0.1, 0.3));
  strokeWeight(1);
  noFill();
  
  for (let i = 0; i < agents.length; i++) {
    for (let j = i + 1; j < agents.length; j++) {
      let d = dist(agents[i].pos.x, agents[i].pos.y, agents[j].pos.x, agents[j].pos.y);
      if (d < radius * 0.8) {
        let alpha = map(d, 0, radius * 0.8, 0.3, 0.05);
        stroke(200, 50, 80, alpha);
        line(agents[i].pos.x, agents[i].pos.y, 
             agents[j].pos.x, agents[j].pos.y);
      }
    }
  }
  pop();
}

