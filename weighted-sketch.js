// Weighted Fairness Model - Using global p5.js mode

let agents = [];
let fairnessSystem;
let agentCountSlider, neighborhoodRadiusSlider, weightSkewSlider;

// Wrapper class to use FairAgent with global p5 mode
class FairAgentGlobal {
  constructor(x, y, utility, weight) {
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

function setup() {
  createCanvas(1000, 800);
  colorMode(HSB, 360, 100, 100, 1);
  fairnessSystem = new FairnessSystem();
  createControls();
  initializeAgents(120);
}

function createControls() {
  let y = 60, s = 30; // Start below menu bar
  agentCountSlider = createSlider(20, 250, 120, 5);
  agentCountSlider.position(10, y);
  agentCountSlider.style('width', '200px');
  agentCountSlider.input(() => initializeAgents(agentCountSlider.value()));
  
  neighborhoodRadiusSlider = createSlider(20, 220, 90, 5);
  neighborhoodRadiusSlider.position(10, y + s);
  neighborhoodRadiusSlider.style('width', '200px');
  
  weightSkewSlider = createSlider(0, 4, 2, 0.1);
  weightSkewSlider.position(10, y + s * 2);
  weightSkewSlider.style('width', '200px');
}

function initializeAgents(count) {
  agents = [];
  for (let i = 0; i < count; i++) {
    const x = random(50, width - 50);
    const y = random(50, height - 50);
    const utility = random(0.2, 0.9);
    const weight = 1;
    agents.push(new FairAgentGlobal(x, y, utility, weight));
  }
}

function draw() {
  const fcWeighted = fairnessSystem.calculateWeightedFairness(agents.map(a => a.agent));
  const bgHue = map(fcWeighted, 0, 1, 0, 120);
  const bgBrightness = map(fcWeighted, 0, 1, 5, 18);
  background(bgHue, 25, bgBrightness);

  // Update weights dynamically based on skew slider
  const skew = weightSkewSlider.value();
  for (let i = 0; i < agents.length; i++) {
    const t = i / (agents.length - 1 || 1);
    agents[i].weight = Math.max(0.2, Math.pow(1 + t, skew));
  }

  // Update using stronger sensitivity to emphasize weighted effects
  for (let a of agents) {
    a.update(agents, neighborhoodRadiusSlider.value(), 0.3, 0.5);
    // Boundary wrapping
    if (a.pos.x < 0) a.pos.x = width;
    if (a.pos.x > width) a.pos.x = 0;
    if (a.pos.y < 0) a.pos.y = height;
    if (a.pos.y > height) a.pos.y = 0;
  }

  // Display agents using FairAgent display method
  for (let a of agents) {
    a.display(fcWeighted);
  }

  displayPanel(fcWeighted);
  displayInfoBox();
  displayControlLabels();
}

function displayControlLabels() {
  push();
  fill(0, 0, 100, 0.9);
  textAlign(LEFT);
  textSize(10);
  let y = 60, spacing = 30; // Start below menu bar
  
  const labels = [
    { text: `Agent Count: ${agentCountSlider.value()}`, x: 220, y: y + 5, desc: "Total number of agents in the system. More agents create denser neighborhoods and more complex weighted fairness interactions." },
    { text: `Neighborhood Radius: ${neighborhoodRadiusSlider.value()}`, x: 220, y: y + spacing + 5, desc: "The distance within which agents consider others as neighbors for weighted fairness calculations. Larger radius means more agents influence each other's utility/weight ratios." },
    { text: `Weight Skew: ${weightSkewSlider.value().toFixed(1)}`, x: 220, y: y + spacing * 2 + 5, desc: "Controls the distribution of weights across agents. Higher values create exponential weight differences, emphasizing the importance of weighted fairness over standard fairness." }
  ];
  
  // Draw labels and check for hover
  let hoveredLabel = null;
  for (let label of labels) {
    const labelWidth = textWidth(label.text);
    if (mouseX >= label.x && mouseX <= label.x + labelWidth && 
        mouseY >= label.y - 10 && mouseY <= label.y + 5) {
      hoveredLabel = label;
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

function displayInfoBox() {
  const infoX = width - 40;
  const metricsPanelHeight = 120;
  const infoY = 10 + metricsPanelHeight - 25; // Bottom of metrics panel
  const infoSize = 20;
  const mouseOverInfo = mouseX >= infoX - 5 && mouseX <= infoX + infoSize + 5 &&
                        mouseY >= infoY - 5 && mouseY <= infoY + infoSize + 5;
  
  push();
  fill(200, 50, 80, mouseOverInfo ? 1 : 0.7);
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(16);
  textStyle(BOLD);
  text("ℹ", infoX + infoSize/2, infoY + infoSize/2);
  pop();
  
  if (mouseOverInfo) {
    push();
    const boxWidth = 400, boxHeight = 500, boxX = width - boxWidth - 50;
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
    text("Weighted Fairness", boxX + 15, boxY + 30);
    
    textStyle(NORMAL);
    textSize(11);
    fill(255);
    let textY = boxY + 55;
    const lineHeight = 15, margin = 15, textWidth = boxWidth - margin * 2;
    
    const desc = [
      "DESCRIPTION:",
      "Emphasizes weighted fairness where agents have different importance (weights). The system balances utility/weight ratios rather than just utilities.",
      "",
      "RELATION TO FAIRNESS:",
      "Weighted fairness recognizes that agents may have different significance. Fairness means equal utility per unit weight, not equal utility. This model shows how fairness adapts when agents have varying importance.",
      "",
      "INTERPRETING METRICS:",
      "• Weighted FC: Fairness considering agent weights. Higher values mean fair utility/weight ratios.",
      "",
      "• Standard FC: Traditional fairness (ignoring weights). Compare to see weight impact.",
      "",
      "• Weight Skew: Distribution of weights. Higher skew creates greater inequality in agent importance.",
      "",
      "OBSERVATIONS:",
      "Watch how agents with different weights (sizes) achieve fairness through adjusted utilities. Weighted fairness may differ from standard fairness when weights vary significantly."
    ];
    
    for (let line of desc) {
      noStroke();
      if (line.startsWith("•") || (line === line.toUpperCase() && line.length > 0 && !line.includes(":"))) {
        fill(255);
        textStyle(BOLD);
      } else {
        fill(255);
        textStyle(NORMAL);
      }
      const wrapped = wrapTextForInfo(line, textWidth);
      for (let w of wrapped) {
        text(w, boxX + margin, textY);
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
  if (currentLine) lines.push(currentLine);
  return lines.length > 0 ? lines : [""];
}

function displayTooltip(label) {
  push();
  const padding = 10;
  const maxWidth = 300;
  const lineHeight = 14;
  const lines = wrapText(label.desc, maxWidth);
  const tooltipHeight = lines.length * lineHeight + padding * 2;
  const tooltipWidth = maxWidth + padding * 2;
  
  let tooltipX = label.x + 200;
  if (tooltipX + tooltipWidth > width) {
    tooltipX = label.x - tooltipWidth - 10;
  }
  let tooltipY = label.y - 5;
  if (tooltipY + tooltipHeight > height) {
    tooltipY = height - tooltipHeight - 10;
  }
  
  fill(0, 0, 20, 0.95);
  stroke(0, 0, 60, 0.8);
  strokeWeight(1);
  rect(tooltipX, tooltipY, tooltipWidth, tooltipHeight, 4);
  
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

function displayPanel(fcWeighted) {
  const metrics = fairnessSystem.calculateAllMetrics(agents.map(a => a.agent));
  push();
  fill(0, 0, 100, 0.85);
  stroke(0, 0, 60, 0.5);
  rect(width - 260, 10, 250, 120);
  fill(0, 0, 0);
  textSize(13);
  textStyle(BOLD);
  text('Weighted Fairness', width - 250, 28);
  textStyle(NORMAL);
  textSize(11);
  fill(0, 0, 20);
  text(`Weighted FC: ${metrics.weightedFC.toFixed(3)}`, width - 250, 50);
  text(`Standard FC: ${metrics.fc.toFixed(3)}`, width - 250, 66);
  text(`Mean Utility: ${metrics.meanUtility.toFixed(3)}`, width - 250, 82);
  text(`Agents: ${agents.length}`, width - 250, 98);
  pop();
}

