// Quantum Symmetry Fairness (Superposition Model) - Using global p5.js mode

let agents = [];
let etaSlider, uncertaintyScaleSlider, numStatesSlider, interactionRangeSlider, agentCountSlider;

class QuantumAgent {
  constructor(x, y, numStates) {
    this.x = x;
    this.y = y;
    this.vx = random(-0.5, 0.5);
    this.vy = random(-0.5, 0.5);
    this.numStates = numStates;
    this.p = new Array(numStates).fill(1 / numStates); // Probability distribution
    this.sigma = 20; // Uncertainty width
  }
  
  update(neighbors, eta, interactionRange) {
    // Calculate JS divergence with neighbors
    let totalJS = 0;
    let neighborCount = 0;
    
    for (let n of neighbors) {
      const js = this.jsDivergence(n.p);
      totalJS += js;
      neighborCount++;
    }
    
    if (neighborCount > 0) {
      const avgJS = totalJS / neighborCount;
      
      // Update probabilities: p_i^{t+1}(u) ∝ p_i^t(u) * exp(-η * ∂JS/∂p_i)
      for (let i = 0; i < this.numStates; i++) {
        const gradient = avgJS * 0.1; // Simplified gradient
        this.p[i] *= Math.exp(-eta * gradient);
      }
      
      // Normalize
      const sum = this.p.reduce((a, b) => a + b, 0);
      if (sum > 0) {
        this.p = this.p.map(pi => pi / sum);
      }
    }
    
    // Motion jitter (uncertainty)
    this.vx += random(-0.3, 0.3) * this.getUncertainty();
    this.vy += random(-0.3, 0.3) * this.getUncertainty();
    this.vx *= 0.95;
    this.vy *= 0.95;
    this.x += this.vx;
    this.y += this.vy;
    
    // Boundary wrapping
    if (this.x < 50) this.x = width - 50;
    if (this.x > width - 50) this.x = 50;
    if (this.y < 50) this.y = height - 50;
    if (this.y > height - 50) this.y = 50;
  }
  
  jsDivergence(q) {
    // JS(p, q) = 0.5 * D_KL(p|m) + 0.5 * D_KL(q|m), m = 0.5(p + q)
    const m = this.p.map((pi, i) => 0.5 * (pi + q[i]));
    let js = 0;
    for (let i = 0; i < this.p.length; i++) {
      if (m[i] > 0 && this.p[i] > 0) {
        js += 0.5 * this.p[i] * Math.log(this.p[i] / m[i]);
      }
      if (m[i] > 0 && q[i] > 0) {
        js += 0.5 * q[i] * Math.log(q[i] / m[i]);
      }
    }
    return js;
  }
  
  getUncertainty() {
    // Entropy of distribution
    let entropy = 0;
    for (let pi of this.p) {
      if (pi > 0) {
        entropy -= pi * Math.log(pi);
      }
    }
    return entropy / Math.log(this.numStates);
  }
  
  display(uncertaintyScale) {
    const uncertainty = this.getUncertainty();
    const sigma = this.sigma * uncertaintyScale * (1 + uncertainty);
    
    // Draw probability cloud (Gaussian blur effect)
    for (let i = 0; i < this.numStates; i++) {
      const alpha = this.p[i] * 0.6;
      const hue = map(i, 0, this.numStates - 1, 0, 360);
      
      // Draw multiple circles for cloud effect
      for (let j = 0; j < 3; j++) {
        const offset = random(-sigma * 0.5, sigma * 0.5);
        const x = this.x + cos(TWO_PI * j / 3) * offset;
        const y = this.y + sin(TWO_PI * j / 3) * offset;
        
        fill(hue, 50, 80, alpha * 0.3);
        noStroke();
        ellipse(x, y, sigma * 2, sigma * 2);
      }
    }
    
    // Core (most probable state)
    const maxIdx = this.p.indexOf(Math.max(...this.p));
    const hue = map(maxIdx, 0, this.numStates - 1, 0, 360);
    fill(hue, 70, 90, 0.7);
    noStroke();
    ellipse(this.x, this.y, sigma, sigma);
  }
}

function setup() {
  createCanvas(1000, 800);
  colorMode(HSB, 360, 100, 100, 1);
  createControls();
  initializeAgents(40);
}

function createControls() {
  let y = 60, s = 30;
  agentCountSlider = createSlider(20, 100, 40, 5);
  agentCountSlider.position(10, y);
  agentCountSlider.style('width', '200px');
  agentCountSlider.input(() => initializeAgents(agentCountSlider.value()));
  
  etaSlider = createSlider(0, 0.5, 0.1, 0.01);
  etaSlider.position(10, y + s);
  etaSlider.style('width', '200px');
  
  uncertaintyScaleSlider = createSlider(0.5, 3, 1, 0.1);
  uncertaintyScaleSlider.position(10, y + s * 2);
  uncertaintyScaleSlider.style('width', '200px');
  
  numStatesSlider = createSlider(3, 10, 5, 1);
  numStatesSlider.position(10, y + s * 3);
  numStatesSlider.style('width', '200px');
  
  interactionRangeSlider = createSlider(30, 150, 80, 5);
  interactionRangeSlider.position(10, y + s * 4);
  interactionRangeSlider.style('width', '200px');
}

function initializeAgents(count) {
  agents = [];
  const numStates = numStatesSlider.value();
  for (let i = 0; i < count; i++) {
    agents.push(new QuantumAgent(
      random(100, width - 100),
      random(100, height - 100),
      numStates
    ));
  }
}

function draw() {
  background(0, 0, 5);
  
  const eta = etaSlider.value();
  const interactionRange = interactionRangeSlider.value();
  const uncertaintyScale = uncertaintyScaleSlider.value();
  
  // Update numStates if changed
  const newNumStates = numStatesSlider.value();
  for (let a of agents) {
    if (a.numStates !== newNumStates) {
      a.numStates = newNumStates;
      a.p = new Array(newNumStates).fill(1 / newNumStates);
    }
  }
  
  // Update all agents
  for (let a of agents) {
    const neighbors = getNeighbors(a, interactionRange);
    a.update(neighbors, eta, interactionRange);
  }
  
  // Draw all agents (back to front for proper blending)
  const sorted = [...agents].sort((a, b) => a.getUncertainty() - b.getUncertainty());
  for (let a of sorted) {
    a.display(uncertaintyScale);
  }
  
  // Calculate and display metrics
  const metrics = calculateMetrics();
  displayMetrics(metrics);
  displayInfoBox();
  displayControlLabels();
}

function getNeighbors(agent, range) {
  return agents.filter(a => {
    if (a === agent) return false;
    const d = dist(agent.x, agent.y, a.x, a.y);
    return d < range;
  });
}

function calculateMetrics() {
  if (agents.length === 0) return {fairness: 0, meanUncertainty: 0, meanJS: 0};
  
  const uncertainties = agents.map(a => a.getUncertainty());
  const meanUncertainty = uncertainties.reduce((a, b) => a + b, 0) / uncertainties.length;
  
  // Calculate mean JS divergence between all pairs
  let totalJS = 0;
  let pairCount = 0;
  for (let i = 0; i < agents.length; i++) {
    for (let j = i + 1; j < agents.length; j++) {
      totalJS += agents[i].jsDivergence(agents[j].p);
      pairCount++;
    }
  }
  const meanJS = pairCount > 0 ? totalJS / pairCount : 0;
  
  // Fairness increases as JS divergence decreases (distributions converge)
  const maxJS = Math.log(agents[0].numStates);
  const fairness = 1 - constrain(meanJS / maxJS, 0, 1);
  
  return {fairness, meanUncertainty, meanJS};
}

function displayMetrics(metrics) {
  push();
  fill(0, 0, 100, 0.85);
  stroke(0, 0, 60, 0.5);
  rect(width - 260, 10, 250, 140);
  
  fill(0, 0, 0);
  textSize(13);
  textStyle(BOLD);
  text('Quantum Metrics', width - 250, 28);
  textStyle(NORMAL);
  
  textSize(11);
  fill(0, 0, 20);
  text(`Fairness: ${metrics.fairness.toFixed(3)}`, width - 250, 50);
  text(`Mean Uncertainty: ${metrics.meanUncertainty.toFixed(3)}`, width - 250, 66);
  text(`Mean JS Divergence: ${metrics.meanJS.toFixed(4)}`, width - 250, 82);
  text(`Agents: ${agents.length}`, width - 250, 98);
  
  // Fairness bar
  const barWidth = 200, barHeight = 8, barX = width - 250, barY = 115;
  fill(0, 0, 30);
  noStroke();
  rect(barX, barY, barWidth, barHeight);
  
  const fcColor = metrics.fairness > 0.6 ? color(120, 80, 80) : 
                  metrics.fairness > 0.4 ? color(60, 80, 80) : 
                  color(0, 80, 80);
  fill(fcColor);
  rect(barX, barY, barWidth * metrics.fairness, barHeight);
  
  // State indicator
  const state = metrics.meanUncertainty > 0.7 ? "Superposition" : 
                metrics.meanUncertainty > 0.4 ? "Partial Collapse" : "Collapsed";
  fill(metrics.meanUncertainty > 0.5 ? 200 : 60, 80, 80);
  textSize(12);
  textStyle(BOLD);
  text(`State: ${state}`, width - 250, 135);
  textStyle(NORMAL);
  
  pop();
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
    text("Quantum Symmetry Fairness", boxX + 15, boxY + 30);
    
    textStyle(NORMAL);
    textSize(11);
    fill(255);
    let textY = boxY + 55;
    const lineHeight = 15, margin = 15, textWidth = boxWidth - margin * 2;
    
    const desc = [
      "DESCRIPTION:",
      "Agents exist as probability clouds (superpositions) rather than fixed states. Fairness increases when neighboring clouds overlap smoothly. High uncertainty creates shimmering effects; collapse occurs when distributions converge.",
      "",
      "RELATION TO FAIRNESS:",
      "Fairness emerges from probabilistic symmetry. When agent probability distributions overlap harmoniously, fairness increases. High update rates (η) accelerate collapse to fixed states; low rates sustain probabilistic fairness with uncertainty.",
      "",
      "INTERPRETING METRICS:",
      "• Fairness: 1 - normalized JS divergence. Higher values mean probability distributions converge (fairer).",
      "",
      "• Mean Uncertainty: Average entropy of distributions. High values show superposition; low values show collapse.",
      "",
      "• Mean JS Divergence: Average Jensen-Shannon divergence between agents. Lower divergence means more similar distributions (fairer).",
      "",
      "OBSERVATIONS:",
      "Watch probability clouds: fair systems show smooth overlap and color blending. High uncertainty creates motion jitter. Collapse to clear points shows convergence to fairness."
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
    { text: `Agent Count: ${agentCountSlider.value()}`, x: 220, y: y + 5, desc: "Total number of quantum agents. More agents create more complex superposition interactions." },
    { text: `η (Update Rate): ${etaSlider.value().toFixed(2)}`, x: 220, y: y + spacing + 5, desc: "How strongly probabilities converge. High η accelerates collapse; low η sustains shimmering probabilistic fairness." },
    { text: `Uncertainty Scale: ${uncertaintyScaleSlider.value().toFixed(1)}`, x: 220, y: y + spacing * 2 + 5, desc: "Visual blur multiplier for superposition width. Higher values show larger probability clouds." },
    { text: `States: ${numStatesSlider.value()}`, x: 220, y: y + spacing * 3 + 5, desc: "Number of utility states in probability distribution. More states increase complexity and uncertainty." },
    { text: `Interaction Range: ${interactionRangeSlider.value()}`, x: 220, y: y + spacing * 4 + 5, desc: "Distance for measuring overlap between probability distributions. Larger range means more agents interact." }
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

