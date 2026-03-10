// Ecological Fairness (Resource-Population Feedback) - Using global p5.js mode

let agents = [];
let grid = [];
let gridCols = 50;
let gridRows = 40;
let cellWidth, cellHeight;
let rhoSlider, gammaSlider, cMaxSlider, harvestRadiusSlider, agentCountSlider;
let K0 = 100; // Base carrying capacity

class EcologicalAgent {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.c = 0; // Consumption
    this.vx = random(-0.5, 0.5);
    this.vy = random(-0.5, 0.5);
  }
  
  update(harvestRadius, c_max) {
    // Harvest from nearby cells
    const gridX = floor(this.x / cellWidth);
    const gridY = floor(this.y / cellHeight);
    const radiusCells = ceil(harvestRadius / cellWidth);
    
    let totalHarvest = 0;
    for (let dx = -radiusCells; dx <= radiusCells; dx++) {
      for (let dy = -radiusCells; dy <= radiusCells; dy++) {
        const gx = gridX + dx;
        const gy = gridY + dy;
        if (gx >= 0 && gx < gridCols && gy >= 0 && gy < gridRows) {
          const cellX = gx * cellWidth + cellWidth / 2;
          const cellY = gy * cellHeight + cellHeight / 2;
          const d = dist(cellX, cellY, this.x, this.y);
          if (d < harvestRadius) {
            const cell = grid[gy][gx];
            const harvest = min(c_max, cell.R * 0.1);
            cell.R -= harvest;
            totalHarvest += harvest;
          }
        }
      }
    }
    
    this.c = totalHarvest;
    
    // Movement
    this.vx += random(-0.2, 0.2);
    this.vy += random(-0.2, 0.2);
    this.vx *= 0.95;
    this.vy *= 0.95;
    this.x += this.vx;
    this.y += this.vy;
    
    // Boundary wrapping
    if (this.x < 0) this.x = width;
    if (this.x > width) this.x = 0;
    if (this.y < 0) this.y = height;
    if (this.y > height) this.y = 0;
  }
  
  display() {
    const c_max = cMaxSlider ? cMaxSlider.value() : 0.5;
    const size = map(this.c, 0, c_max, 8, 18);
    fill(60, 70, 80, 0.9);
    noStroke();
    ellipse(this.x, this.y, size, size);
    
    // Draw consumption indicator
    if (this.c > 0) {
      fill(0, 80, 100, 0.6);
      ellipse(this.x, this.y, size * 0.6, size * 0.6);
    }
  }
}

function setup() {
  createCanvas(1000, 800);
  colorMode(HSB, 360, 100, 100, 1);
  cellWidth = width / gridCols;
  cellHeight = height / gridRows;
  createControls();
  initializeGrid();
  initializeAgents(30);
}

function createControls() {
  let y = 60, s = 30;
  agentCountSlider = createSlider(10, 80, 30, 5);
  agentCountSlider.position(10, y);
  agentCountSlider.style('width', '200px');
  agentCountSlider.input(() => initializeAgents(agentCountSlider.value()));
  
  rhoSlider = createSlider(0, 0.1, 0.05, 0.001);
  rhoSlider.position(10, y + s);
  rhoSlider.style('width', '200px');
  
  gammaSlider = createSlider(0, 0.5, 0.1, 0.01);
  gammaSlider.position(10, y + s * 2);
  gammaSlider.style('width', '200px');
  
  cMaxSlider = createSlider(0.1, 2, 0.5, 0.1);
  cMaxSlider.position(10, y + s * 3);
  cMaxSlider.style('width', '200px');
  
  harvestRadiusSlider = createSlider(10, 80, 30, 5);
  harvestRadiusSlider.position(10, y + s * 4);
  harvestRadiusSlider.style('width', '200px');
}

function initializeGrid() {
  grid = [];
  for (let y = 0; y < gridRows; y++) {
    grid[y] = [];
    for (let x = 0; x < gridCols; x++) {
      grid[y][x] = {
        R: random(50, 100) // Initial resource level
      };
    }
  }
}

function initializeAgents(count) {
  agents = [];
  for (let i = 0; i < count; i++) {
    agents.push(new EcologicalAgent(
      random(50, width - 50),
      random(50, height - 50)
    ));
  }
}

function draw() {
  background(120, 20, 10);
  
  if (!rhoSlider || !gammaSlider || !harvestRadiusSlider || !cMaxSlider) {
    return; // Wait for sliders to initialize
  }
  
  const rho = rhoSlider.value();
  const gamma = gammaSlider.value();
  const harvestRadius = harvestRadiusSlider.value();
  const c_max = cMaxSlider.value();
  
  // Calculate global inequality G^t for carrying capacity
  const consumptions = agents.map(a => a.c);
  const meanC = consumptions.length > 0 ? consumptions.reduce((a, b) => a + b, 0) / consumptions.length : 0;
  const variance = consumptions.length > 0 ? consumptions.reduce((sum, c) => sum + Math.pow(c - meanC, 2), 0) / consumptions.length : 0;
  const G = variance / (meanC * meanC + 0.01); // Gini-like measure
  
  // Update grid resources: R^{t+1} = R^t + ρR^t(1 - R^t/K) - Σc_i^t
  // K = K_0(1 - γG^t)
  const K = K0 * (1 - gamma * G);
  
  for (let y = 0; y < gridRows; y++) {
    for (let x = 0; x < gridCols; x++) {
      const cell = grid[y][x];
      // Regeneration: ρR(1 - R/K)
      const regeneration = rho * cell.R * (1 - cell.R / K);
      cell.R += regeneration;
      cell.R = constrain(cell.R, 0, K);
    }
  }
  
  // Update agents (harvesting)
  for (let a of agents) {
    a.update(harvestRadius, c_max);
  }
  
  // Draw terrain grid
  drawTerrain();
  
  // Draw agents
  for (let a of agents) {
    a.display();
  }
  
  // Calculate and display metrics
  const metrics = calculateMetrics(G);
  displayMetrics(metrics);
  displayInfoBox();
  displayControlLabels();
}

function drawTerrain() {
  for (let y = 0; y < gridRows; y++) {
    for (let x = 0; x < gridCols; x++) {
      const cell = grid[y][x];
      const R_norm = constrain(cell.R / K0, 0, 1); // Normalize to base capacity
      
      // Color saturation = resource health (green=lush, brown=depleted)
      const hue = map(R_norm, 0, 1, 30, 120); // Brown to green
      const saturation = map(R_norm, 0, 1, 40, 80);
      const brightness = map(R_norm, 0, 1, 20, 60);
      
      fill(hue, saturation, brightness);
      noStroke();
      rect(x * cellWidth, y * cellHeight, cellWidth, cellHeight);
    }
  }
}

function calculateMetrics(G) {
  if (agents.length === 0) return {fairness: 0, meanConsumption: 0, meanResource: 0, inequality: 0};
  
  const consumptions = agents.map(a => a.c);
  const meanConsumption = consumptions.reduce((a, b) => a + b, 0) / consumptions.length;
  
  // Calculate mean resource level
  let totalResource = 0;
  for (let y = 0; y < gridRows; y++) {
    for (let x = 0; x < gridCols; x++) {
      totalResource += grid[y][x].R;
    }
  }
  const meanResource = totalResource / (gridCols * gridRows);
  
  // Fairness: F_i^t = 1 - |c_i^t/(R_i^t/N_i) - 1|
  let totalFairness = 0;
  for (let a of agents) {
    const gridX = floor(a.x / cellWidth);
    const gridY = floor(a.y / cellHeight);
    if (gridX >= 0 && gridX < gridCols && gridY >= 0 && gridY < gridRows) {
      const localR = grid[gridY][gridX].R;
      const expected = localR / agents.length;
      const ratio = expected > 0 ? a.c / expected : 0;
      const F_i = 1 - Math.abs(ratio - 1);
      totalFairness += constrain(F_i, 0, 1);
    }
  }
  const fairness = agents.length > 0 ? totalFairness / agents.length : 0;
  
  return {fairness, meanConsumption, meanResource, inequality: G};
}

function displayMetrics(metrics) {
  push();
  fill(0, 0, 100, 0.85);
  stroke(0, 0, 60, 0.5);
  rect(width - 260, 10, 250, 160);
  
  fill(0, 0, 0);
  textSize(13);
  textStyle(BOLD);
  text('Ecological Metrics', width - 250, 28);
  textStyle(NORMAL);
  
  textSize(11);
  fill(0, 0, 20);
  text(`Fairness: ${metrics.fairness.toFixed(3)}`, width - 250, 50);
  text(`Mean Consumption: ${metrics.meanConsumption.toFixed(2)}`, width - 250, 66);
  text(`Mean Resource: ${metrics.meanResource.toFixed(1)}`, width - 250, 82);
  text(`Inequality (G): ${metrics.inequality.toFixed(3)}`, width - 250, 98);
  text(`Agents: ${agents.length}`, width - 250, 114);
  
  // Fairness bar
  const barWidth = 200, barHeight = 8, barX = width - 250, barY = 130;
  fill(0, 0, 30);
  noStroke();
  rect(barX, barY, barWidth, barHeight);
  
  const fcColor = metrics.fairness > 0.6 ? color(120, 80, 80) : 
                  metrics.fairness > 0.4 ? color(60, 80, 80) : 
                  color(0, 80, 80);
  fill(fcColor);
  rect(barX, barY, barWidth * metrics.fairness, barHeight);
  
  // Ecosystem state
  const state = metrics.meanResource > 70 ? "Lush" : 
                metrics.meanResource > 40 ? "Healthy" : 
                metrics.meanResource > 20 ? "Stressed" : "Depleted";
  fill(metrics.meanResource > 50 ? 120 : metrics.meanResource > 25 ? 60 : 0, 80, 80);
  textSize(12);
  textStyle(BOLD);
  text(`State: ${state}`, width - 250, 150);
  textStyle(NORMAL);
  
  pop();
}

function displayInfoBox() {
  const infoX = width - 40;
  const metricsPanelHeight = 160;
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
    text("Ecological Fairness (Resource-Population)", boxX + 15, boxY + 30);
    
    textStyle(NORMAL);
    textSize(11);
    fill(255);
    let textY = boxY + 55;
    const lineHeight = 15, margin = 15, textWidth = boxWidth - margin * 2;
    
    const desc = [
      "DESCRIPTION:",
      "A living terrain grid where agents harvest resources. Cell color shows resource health: green (lush) to brown (depleted). Agents consume resources, which regenerate based on ecosystem carrying capacity.",
      "",
      "RELATION TO FAIRNESS:",
      "Fairness means sustainable resource use. Overexploitation creates visible ecological collapse (brown patches). Sustainable harvesters maintain green landscapes. The system shows how inequality reduces carrying capacity, creating feedback loops.",
      "",
      "INTERPRETING METRICS:",
      "• Fairness: Based on consumption relative to local resource availability. Higher values mean agents harvest sustainably.",
      "",
      "• Mean Consumption: Average agent consumption. Sustainable levels maintain ecosystem health.",
      "",
      "• Mean Resource: Average resource level across terrain. Values above 50 indicate healthy ecosystem.",
      "",
      "• Inequality (G): Consumption inequality. High inequality reduces carrying capacity, creating collapse.",
      "",
      "OBSERVATIONS:",
      "Watch the terrain: fair harvesters keep areas lush green. Overconsumers leave brown patches. Sustainable fairness regenerates the landscape automatically."
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

function displayControlLabels() {
  push();
  fill(0, 0, 100, 0.9);
  textAlign(LEFT);
  textSize(10);
  let y = 60, spacing = 30;
  
  if (!agentCountSlider || !rhoSlider || !gammaSlider || !cMaxSlider || !harvestRadiusSlider) {
    pop();
    return; // Sliders not initialized yet
  }
  
  const labels = [
    { text: `Agent Count: ${agentCountSlider.value()}`, x: 220, y: y + 5, desc: "Total number of harvesting agents. More agents increase consumption pressure on resources." },
    { text: `ρ (Regeneration): ${rhoSlider.value().toFixed(3)}`, x: 220, y: y + spacing + 5, desc: "Regeneration rate: speed of ecosystem recovery. Higher values mean faster resource regrowth." },
    { text: `γ (Feedback): ${gammaSlider.value().toFixed(2)}`, x: 220, y: y + spacing * 2 + 5, desc: "Feedback sensitivity: how inequality reduces carrying capacity. Higher values create stronger feedback loops." },
    { text: `c_max: ${cMaxSlider.value().toFixed(1)}`, x: 220, y: y + spacing * 3 + 5, desc: "Maximum consumption per agent per frame. Higher values allow more aggressive harvesting." },
    { text: `Harvest Radius: ${harvestRadiusSlider.value()}`, x: 220, y: y + spacing * 4 + 5, desc: "Area of resource extraction around each agent. Larger radius means agents affect more cells." }
  ];
  
  let hoveredLabel = null;
  for (let label of labels) {
    const labelWidthVal = textWidth(label.text);
    if (mouseX >= label.x && mouseX <= label.x + labelWidthVal && 
        mouseY >= label.y - 10 && mouseY <= label.y + 5) {
      hoveredLabel = label;
      fill(0, 0, 100, 1);
    } else {
      fill(0, 0, 100, 0.9);
    }
    text(label.text, label.x, label.y);
  }
  
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

