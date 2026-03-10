// Temporal Fairness (Memory Model) - Using global p5.js mode

let agents = [];
let lambdaSlider, alphaSlider, betaSlider, radiusSlider, agentCountSlider;
let epsilon = 0.01; // Small constant for numerical stability

class TemporalAgent {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = random(-1, 1);
    this.vy = random(-1, 1);
    this.u = random(0.3, 0.7); // utility
    this.m = 0.5; // fairness memory
    this.trail = []; // Trail positions for visualization
    this.maxTrailLength = 50;
    this.orbitRadius = 0;
    this.orbitAngle = random(TWO_PI);
    this.stable = false;
  }
  
  update(neighbors, lambda, alpha, beta, r) {
    // Calculate average utility of neighbors
    let avgU = 0;
    if (neighbors.length > 0) {
      avgU = neighbors.reduce((sum, n) => sum + n.u, 0) / neighbors.length;
    } else {
      avgU = this.u;
    }
    
    // Calculate current fairness F_i^t
    const R_u = 1.0; // Range of utility
    const F_t = 1 - Math.abs(this.u - avgU) / Math.max(epsilon, R_u);
    const F_t_clamped = constrain(F_t, 0, 1);
    
    // Update memory: m_i^{t+1} = (1 - λ)m_i^t + λF_i^t
    this.m = (1 - lambda) * this.m + lambda * F_t_clamped;
    
    // Calculate average memory of neighbors
    let avgM = 0;
    if (neighbors.length > 0) {
      avgM = neighbors.reduce((sum, n) => sum + n.m, 0) / neighbors.length;
    } else {
      avgM = this.m;
    }
    
    // Update utility: u_i^{t+1} = u_i^t + α[β(ū_i^t - u_i^t) + (1-β)(m_i^t - m̄^t)]
    const term1 = beta * (avgU - this.u);
    const term2 = (1 - beta) * (this.m - avgM);
    this.u += alpha * (term1 + term2);
    this.u = constrain(this.u, 0.1, 1.0);
    
    // Determine stability (fair agents stabilize)
    this.stable = this.m > 0.7 && Math.abs(this.u - avgU) < 0.1;
    
    // Movement: stable agents orbit, unfair ones oscillate
    if (this.stable) {
      // Stationary orbit
      this.orbitRadius = lerp(this.orbitRadius, 15, 0.1);
      this.orbitAngle += 0.02;
      const centerX = this.x;
      const centerY = this.y;
      this.x = centerX + cos(this.orbitAngle) * this.orbitRadius;
      this.y = centerY + sin(this.orbitAngle) * this.orbitRadius;
    } else {
      // Oscillation for unfair agents
      this.vx += random(-0.5, 0.5) * (1 - this.m);
      this.vy += random(-0.5, 0.5) * (1 - this.m);
      this.vx *= 0.95;
      this.vy *= 0.95;
      this.x += this.vx;
      this.y += this.vy;
    }
    
    // Check for wrapping before applying it
    const willWrapX = this.x < 50 || this.x > width - 50;
    const willWrapY = this.y < 50 || this.y > height - 50;
    
    // Boundary wrapping
    if (this.x < 50) this.x = width - 50;
    if (this.x > width - 50) this.x = 50;
    if (this.y < 50) this.y = height - 50;
    if (this.y > height - 50) this.y = 50;
    
    // If wrapping occurred, clear trail to prevent streaks
    if (willWrapX || willWrapY) {
      this.trail = [];
    }
    
    // Update trail
    this.trail.push({x: this.x, y: this.y, m: this.m});
    if (this.trail.length > this.maxTrailLength) {
      this.trail.shift();
    }
  }
  
  display() {
    // Draw trail (fading, color based on memory)
    for (let i = 0; i < this.trail.length - 1; i++) {
      const t = i / this.trail.length;
      const mem = this.trail[i].m;
      const hue = map(mem, 0, 1, 240, 0); // Blue (low) to white/yellow (high)
      const alpha = t * 0.6;
      stroke(hue, 50, 90, alpha);
      strokeWeight(2);
      line(this.trail[i].x, this.trail[i].y, 
           this.trail[i + 1].x, this.trail[i + 1].y);
    }
    
    // Draw glowing orb
    const size = map(this.m, 0, 1, 8, 20);
    const hue = map(this.m, 0, 1, 240, 0);
    
    // Outer glow
    drawingContext.shadowBlur = 20;
    drawingContext.shadowColor = `hsla(${hue}, 70%, 80%, 0.8)`;
    
    noStroke();
    fill(hue, 70, 90, 0.9);
    ellipse(this.x, this.y, size, size);
    
    // Inner core
    fill(hue, 50, 100, 0.95);
    ellipse(this.x, this.y, size * 0.6, size * 0.6);
    
    drawingContext.shadowBlur = 0;
  }
}

function setup() {
  createCanvas(1000, 800);
  colorMode(HSB, 360, 100, 100, 1);
  createControls();
  initializeAgents(60);
}

function createControls() {
  let y = 60, s = 30;
  agentCountSlider = createSlider(20, 150, 60, 5);
  agentCountSlider.position(10, y);
  agentCountSlider.style('width', '200px');
  agentCountSlider.input(() => initializeAgents(agentCountSlider.value()));
  
  lambdaSlider = createSlider(0, 1, 0.3, 0.01);
  lambdaSlider.position(10, y + s);
  lambdaSlider.style('width', '200px');
  
  alphaSlider = createSlider(0, 0.5, 0.1, 0.01);
  alphaSlider.position(10, y + s * 2);
  alphaSlider.style('width', '200px');
  
  betaSlider = createSlider(0, 1, 0.5, 0.01);
  betaSlider.position(10, y + s * 3);
  betaSlider.style('width', '200px');
  
  radiusSlider = createSlider(20, 200, 80, 5);
  radiusSlider.position(10, y + s * 4);
  radiusSlider.style('width', '200px');
}

function initializeAgents(count) {
  agents = [];
  for (let i = 0; i < count; i++) {
    agents.push(new TemporalAgent(
      random(100, width - 100),
      random(100, height - 100)
    ));
  }
}

function draw() {
  background(0, 0, 5);
  
  const lambda = lambdaSlider.value();
  const alpha = alphaSlider.value();
  const beta = betaSlider.value();
  const r = radiusSlider.value();
  
  // Update all agents
  for (let a of agents) {
    const neighbors = getNeighbors(a, r);
    a.update(neighbors, lambda, alpha, beta, r);
  }
  
  // Draw all agents
  for (let a of agents) {
    a.display();
  }
  
  // Calculate and display metrics
  const metrics = calculateMetrics();
  displayMetrics(metrics);
  displayInfoBox();
  displayControlLabels();
}

function getNeighbors(agent, radius) {
  return agents.filter(a => {
    if (a === agent) return false;
    const d = dist(agent.x, agent.y, a.x, a.y);
    return d < radius;
  });
}

function displayInfoBox() {
  const infoX = width - 40;
  const metricsPanelHeight = 140;
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
    text("Temporal Fairness (Memory Model)", boxX + 15, boxY + 30);
    
    textStyle(NORMAL);
    textSize(11);
    fill(255);
    let textY = boxY + 55;
    const lineHeight = 15, margin = 15, textWidth = boxWidth - margin * 2;
    
    const desc = [
      "DESCRIPTION:",
      "Agents maintain a memory of past fairness experiences, blending real-time fairness with historical memory. Glowing orbs leave fading trails showing their fairness memory over time.",
      "",
      "RELATION TO FAIRNESS:",
      "Memory allows agents to learn from past unfairness. Long memory (high λ) creates stability but may slow adaptation. Short memory responds quickly but may overreact to temporary imbalances. Fairness emerges from balancing immediate needs with learned experience.",
      "",
      "INTERPRETING METRICS:",
      "• Fairness: Overall system fairness based on memory distribution. Higher values mean agents have consistent positive fairness memories.",
      "",
      "• Mean Memory: Average fairness memory across agents. Values near 1 indicate agents remember mostly fair conditions.",
      "",
      "• Mean Utility: Average agent utility. Watch how this stabilizes as memory guides agents toward equilibrium.",
      "",
      "• Variance: Utility variance. Decreasing variance shows convergence toward fairness.",
      "",
      "OBSERVATIONS:",
      "Trail color shows memory: blue (low memory) to white/yellow (high memory). Stable agents orbit in place; unfair agents oscillate until they find equilibrium."
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

function calculateMetrics() {
  if (agents.length === 0) return {meanMemory: 0, meanUtility: 0, variance: 0, fairness: 0};
  
  const meanMemory = agents.reduce((sum, a) => sum + a.m, 0) / agents.length;
  const meanUtility = agents.reduce((sum, a) => sum + a.u, 0) / agents.length;
  const variance = agents.reduce((sum, a) => sum + Math.pow(a.u - meanUtility, 2), 0) / agents.length;
  
  // Global fairness based on memory distribution
  const memoryVariance = agents.reduce((sum, a) => sum + Math.pow(a.m - meanMemory, 2), 0) / agents.length;
  const fairness = 1 - constrain(memoryVariance * 4, 0, 1);
  
  return {meanMemory, meanUtility, variance, fairness};
}

function displayMetrics(metrics) {
  push();
  fill(0, 0, 100, 0.85);
  stroke(0, 0, 60, 0.5);
  rect(width - 260, 10, 250, 140);
  
  fill(0, 0, 0);
  textSize(13);
  textStyle(BOLD);
  text('Temporal Fairness', width - 250, 28);
  textStyle(NORMAL);
  
  textSize(11);
  fill(0, 0, 20);
  text(`Fairness: ${metrics.fairness.toFixed(3)}`, width - 250, 50);
  text(`Mean Memory: ${metrics.meanMemory.toFixed(3)}`, width - 250, 66);
  text(`Mean Utility: ${metrics.meanUtility.toFixed(3)}`, width - 250, 82);
  text(`Variance: ${metrics.variance.toFixed(4)}`, width - 250, 98);
  text(`Agents: ${agents.length}`, width - 250, 114);
  
  // Fairness bar
  const barWidth = 200, barHeight = 8, barX = width - 250, barY = 125;
  fill(0, 0, 30);
  noStroke();
  rect(barX, barY, barWidth, barHeight);
  
  const fcColor = metrics.fairness > 0.6 ? color(120, 80, 80) : 
                  metrics.fairness > 0.4 ? color(60, 80, 80) : 
                  color(0, 80, 80);
  fill(fcColor);
  rect(barX, barY, barWidth * metrics.fairness, barHeight);
  
  pop();
}

function displayControlLabels() {
  push();
  fill(0, 0, 100, 0.9);
  textAlign(LEFT);
  textSize(10);
  let y = 60, spacing = 30;
  
  const labels = [
    { text: `Agent Count: ${agentCountSlider.value()}`, x: 220, y: y + 5, desc: "Total number of agents. More agents create denser neighborhoods and more complex memory interactions." },
    { text: `λ (Memory): ${lambdaSlider.value().toFixed(2)}`, x: 220, y: y + spacing + 5, desc: "Memory persistence: how long agents remember unfairness. High λ smooths fluctuations but slows convergence." },
    { text: `α (Adaptation): ${alphaSlider.value().toFixed(2)}`, x: 220, y: y + spacing * 2 + 5, desc: "Adaptation rate: responsiveness to fairness differences. Higher values mean faster utility adjustments." },
    { text: `β (Blending): ${betaSlider.value().toFixed(2)}`, x: 220, y: y + spacing * 3 + 5, desc: "Memory blending: weight between real-time fairness (β) and remembered fairness (1-β)." },
    { text: `Radius: ${radiusSlider.value()}`, x: 220, y: y + spacing * 4 + 5, desc: "Neighborhood radius: how far fairness is measured. Small r yields micro-fairness zones; large r promotes rapid homogenization." }
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

