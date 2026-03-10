// Energy Redistribution (Thermodynamic Analog) - Using global p5.js mode

let agents = [];
let kappaSlider, capacitySlider, radiusSlider, agentCountSlider, entropyScaleSlider;
let entropyHistory = [];
let maxEntropyHistory = 200;

class EnergyAgent {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.E = random(10, 50); // Energy
    this.C = random(0.5, 2); // Heat capacity
    this.vx = random(-0.5, 0.5);
    this.vy = random(-0.5, 0.5);
  }
  
  get T() {
    return this.E / this.C; // Temperature
  }
  
  update(neighbors, kappa, r) {
    // Energy exchange with neighbors: ΔE_ij = κ * w_ij * (T_j - T_i)
    let deltaE = 0;
    for (let n of neighbors) {
      const w_ij = 1.0; // Uniform weight for simplicity
      const T_diff = n.T - this.T;
      const deltaE_ij = kappa * w_ij * T_diff;
      deltaE += deltaE_ij;
    }
    
    // Update energy: E_i^{t+1} = E_i^t + ΣΔE_ij
    this.E += deltaE;
    this.E = Math.max(1, Math.min(100, this.E)); // Clamp energy
    
    // Gentle drift
    this.vx += random(-0.1, 0.1);
    this.vy += random(-0.1, 0.1);
    this.vx *= 0.98;
    this.vy *= 0.98;
    this.x += this.vx;
    this.y += this.vy;
    
    // Boundary wrapping
    if (this.x < 30) this.x = width - 30;
    if (this.x > width - 30) this.x = 30;
    if (this.y < 30) this.y = height - 30;
    if (this.y > height - 30) this.y = 30;
  }
  
  display() {
    // Color based on temperature (red=hot, blue=cold)
    const T_norm = map(this.T, 0, 50, 0, 1);
    const hue = map(T_norm, 0, 1, 240, 0); // Blue to red
    const brightness = map(T_norm, 0, 1, 40, 90);
    
    const size = map(this.T, 0, 50, 8, 24);
    
    // Heat glow effect
    drawingContext.shadowBlur = 15 * T_norm;
    drawingContext.shadowColor = `hsla(${hue}, 80%, ${brightness}%, 0.6)`;
    
    noStroke();
    fill(hue, 80, brightness, 0.9);
    ellipse(this.x, this.y, size, size);
    
    drawingContext.shadowBlur = 0;
  }
}

function setup() {
  createCanvas(1000, 800);
  colorMode(HSB, 360, 100, 100, 1);
  createControls();
  initializeAgents(80);
}

function createControls() {
  let y = 60, s = 30;
  agentCountSlider = createSlider(30, 200, 80, 5);
  agentCountSlider.position(10, y);
  agentCountSlider.style('width', '200px');
  agentCountSlider.input(() => initializeAgents(agentCountSlider.value()));
  
  kappaSlider = createSlider(0, 0.1, 0.02, 0.001);
  kappaSlider.position(10, y + s);
  kappaSlider.style('width', '200px');
  
  capacitySlider = createSlider(0.5, 3, 1, 0.1);
  capacitySlider.position(10, y + s * 2);
  capacitySlider.style('width', '200px');
  
  radiusSlider = createSlider(20, 150, 60, 5);
  radiusSlider.position(10, y + s * 3);
  radiusSlider.style('width', '200px');
  
  entropyScaleSlider = createSlider(0.5, 2, 1, 0.1);
  entropyScaleSlider.position(10, y + s * 4);
  entropyScaleSlider.style('width', '200px');
}

function initializeAgents(count) {
  agents = [];
  for (let i = 0; i < count; i++) {
    agents.push(new EnergyAgent(
      random(50, width - 50),
      random(50, height - 50)
    ));
  }
}

function draw() {
  background(0, 0, 8);
  
  const kappa = kappaSlider.value();
  const r = radiusSlider.value();
  
  // Update capacity if slider changed
  const newCapacity = capacitySlider.value();
  for (let a of agents) {
    a.C = lerp(a.C, newCapacity, 0.1);
  }
  
  // Update all agents
  for (let a of agents) {
    const neighbors = getNeighbors(a, r);
    a.update(neighbors, kappa, r);
  }
  
  // Draw heat map background (interpolated temperature field)
  drawHeatMap();
  
  // Draw agents
  for (let a of agents) {
    a.display();
  }
  
  // Calculate and display metrics
  const metrics = calculateMetrics();
  displayMetrics(metrics);
  displayInfoBox();
  displayControlLabels();
}

function drawHeatMap() {
  // Create interpolated temperature field
  const gridRes = 20;
  push();
  noStroke();
  
  for (let gx = 0; gx < width; gx += gridRes) {
    for (let gy = 0; gy < height; gy += gridRes) {
      let sumT = 0;
      let sumWeight = 0;
      
      // Interpolate temperature from nearby agents
      for (let a of agents) {
        const d = dist(gx, gy, a.x, a.y);
        if (d < 100) {
          const weight = 1 / (1 + d * d);
          sumT += a.T * weight;
          sumWeight += weight;
        }
      }
      
      if (sumWeight > 0) {
        const avgT = sumT / sumWeight;
        const T_norm = map(avgT, 0, 50, 0, 1);
        const hue = map(T_norm, 0, 1, 240, 0);
        const brightness = map(T_norm, 0, 1, 20, 60);
        fill(hue, 60, brightness, 0.3);
        rect(gx, gy, gridRes, gridRes);
      }
    }
  }
  
  pop();
}

function getNeighbors(agent, radius) {
  return agents.filter(a => {
    if (a === agent) return false;
    const d = dist(agent.x, agent.y, a.x, a.y);
    return d < radius;
  });
}

function calculateMetrics() {
  if (agents.length === 0) return {meanTemp: 0, variance: 0, entropy: 0, fairness: 0};
  
  const temps = agents.map(a => a.T);
  const meanTemp = temps.reduce((a, b) => a + b, 0) / temps.length;
  const variance = temps.reduce((sum, t) => sum + Math.pow(t - meanTemp, 2), 0) / temps.length;
  
  // Calculate entropy H = -Σ p_b ln p_b
  // Bin temperatures into buckets
  const bins = 20;
  const binCounts = new Array(bins).fill(0);
  const minT = Math.min(...temps);
  const maxT = Math.max(...temps);
  const range = maxT - minT || 1;
  
  for (let t of temps) {
    const bin = Math.floor(map(t, minT, maxT, 0, bins));
    binCounts[constrain(bin, 0, bins - 1)]++;
  }
  
  let entropy = 0;
  for (let count of binCounts) {
    if (count > 0) {
      const p = count / temps.length;
      entropy -= p * Math.log(p);
    }
  }
  
  // Normalize entropy
  const maxEntropy = Math.log(bins);
  const normalizedEntropy = entropy / maxEntropy;
  
  // Fairness = 1 - normalized temperature variance
  const maxVariance = 625; // Approximate max variance for T in [0,50]
  const fairness = 1 - constrain(variance / maxVariance, 0, 1);
  
  entropyHistory.push(normalizedEntropy * entropyScaleSlider.value());
  if (entropyHistory.length > maxEntropyHistory) {
    entropyHistory.shift();
  }
  
  return {meanTemp, variance, entropy: normalizedEntropy, fairness};
}

function displayMetrics(metrics) {
  push();
  fill(0, 0, 100, 0.85);
  stroke(0, 0, 60, 0.5);
  rect(width - 260, 10, 250, 180);
  
  fill(0, 0, 0);
  textSize(13);
  textStyle(BOLD);
  text('Energy Metrics', width - 250, 28);
  textStyle(NORMAL);
  
  textSize(11);
  fill(0, 0, 20);
  text(`Fairness: ${metrics.fairness.toFixed(3)}`, width - 250, 50);
  text(`Mean Temp: ${metrics.meanTemp.toFixed(2)}`, width - 250, 66);
  text(`Variance: ${metrics.variance.toFixed(2)}`, width - 250, 82);
  text(`Entropy: ${metrics.entropy.toFixed(3)}`, width - 250, 98);
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
  
  // Entropy graph
  if (entropyHistory.length > 2) {
    const graphWidth = 200, graphHeight = 40;
    const graphX = width - 250, graphY = 145;
    
    fill(0, 0, 20, 0.8);
    rect(graphX, graphY, graphWidth, graphHeight);
    
    const minE = Math.min(...entropyHistory);
    const maxE = Math.max(...entropyHistory);
    const range = maxE - minE || 0.001;
    
    noFill();
    stroke(200, 80, 80);
    strokeWeight(1.5);
    beginShape();
    for (let i = 0; i < entropyHistory.length; i++) {
      const x = map(i, 0, entropyHistory.length - 1, graphX + 5, graphX + graphWidth - 5);
      const y = map(entropyHistory[i], minE, maxE, graphY + graphHeight - 5, graphY + 5);
      vertex(x, y);
    }
    endShape();
  }
  
  pop();
}

function displayInfoBox() {
  const infoX = width - 40;
  const metricsPanelHeight = 180;
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
    text("Energy Redistribution (Thermodynamic)", boxX + 15, boxY + 30);
    
    textStyle(NORMAL);
    textSize(11);
    fill(255);
    let textY = boxY + 55;
    const lineHeight = 15, margin = 15, textWidth = boxWidth - margin * 2;
    
    const desc = [
      "DESCRIPTION:",
      "Agents carry energy (temperature) that diffuses through the system like heat. The heat map visualization shows how energy spreads from hot (red) to cold (blue) regions until equilibrium.",
      "",
      "RELATION TO FAIRNESS:",
      "Energy represents access to resources. Fairness emerges when energy (opportunity) diffuses evenly, like heat spreading through a material. High conductivity (κ) creates rapid equalization; low conductivity shows visible 'thermal fronts' of fairness spreading.",
      "",
      "INTERPRETING METRICS:",
      "• Fairness: 1 - normalized temperature variance. Higher values mean more uniform energy distribution (fairer access).",
      "",
      "• Mean Temp: Average system temperature. Stable values indicate equilibrium.",
      "",
      "• Variance: Temperature variance. Decreasing variance shows energy equalization.",
      "",
      "• Entropy: Energy distribution entropy. High entropy = diverse temperatures; low entropy = uniform distribution (fairer).",
      "",
      "OBSERVATIONS:",
      "Watch the heat map: red regions (high energy) gradually cool as energy spreads. Blue regions warm up. At equilibrium, colors become uniform—fairness achieved through diffusion."
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
  
  const labels = [
    { text: `Agent Count: ${agentCountSlider.value()}`, x: 220, y: y + 5, desc: "Total number of energy-carrying agents. More agents create denser thermal interactions." },
    { text: `κ (Conductivity): ${kappaSlider.value().toFixed(3)}`, x: 220, y: y + spacing + 5, desc: "Rate of energy exchange. High κ creates fast equalization (smooth diffusion); low κ yields visible thermal fronts." },
    { text: `C (Capacity): ${capacitySlider.value().toFixed(1)}`, x: 220, y: y + spacing * 2 + 5, desc: "Heat capacity: controls agent responsiveness to temperature changes. Higher capacity means slower temperature changes." },
    { text: `Radius: ${radiusSlider.value()}`, x: 220, y: y + spacing * 3 + 5, desc: "Interaction radius: scope of energy diffusion. Larger radius means more agents participate in energy exchange." },
    { text: `Entropy Scale: ${entropyScaleSlider.value().toFixed(1)}`, x: 220, y: y + spacing * 4 + 5, desc: "Visualization scale for entropy graph. Adjusts the display range of entropy values." }
  ];
  
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

