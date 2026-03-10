// Consensus Fairness (Voting/Opinion Dynamics) - Using global p5.js mode

let agents = [];
let epsilonSlider, wScaleSlider, initSpreadSlider, consensusSpeedSlider, agentCountSlider;
let initialVariance = 0;

class ConsensusAgent {
  constructor(x, y, initSpread) {
    this.x = x;
    this.y = y;
    this.x_opinion = random(-initSpread, initSpread); // Opinion value
    this.vx = random(-0.5, 0.5);
    this.vy = random(-0.5, 0.5);
  }
  
  update(neighbors, epsilon, w_scale, consensusSpeed) {
    // Consensus update: x_i^{t+1} = (1/Z_i) * Σ_{j:|x_j-x_i|≤ε} w_ij * x_j
    let sum = 0;
    let Z = 0;
    
    for (let n of neighbors) {
      const diff = Math.abs(n.x_opinion - this.x_opinion);
      if (diff <= epsilon) {
        const w_ij = w_scale * (1 - diff / epsilon); // Weight decreases with difference
        sum += w_ij * n.x_opinion;
        Z += w_ij;
      }
    }
    
    if (Z > 0) {
      const newOpinion = sum / Z;
      this.x_opinion = lerp(this.x_opinion, newOpinion, consensusSpeed);
    }
    
    // Movement toward similar opinions
    if (neighbors.length > 0) {
      let avgX = 0, avgY = 0, count = 0;
      for (let n of neighbors) {
        if (Math.abs(n.x_opinion - this.x_opinion) <= epsilon) {
          avgX += n.x;
          avgY += n.y;
          count++;
        }
      }
      if (count > 0) {
        avgX /= count;
        avgY /= count;
        const dx = avgX - this.x;
        const dy = avgY - this.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        this.vx += (dx / d) * 0.1;
        this.vy += (dy / d) * 0.1;
      }
    }
    
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
  
  display() {
    // Hue = opinion value (normalized to 0-360)
    const opinionNorm = map(this.x_opinion, -1, 1, 0, 1);
    const hue = map(opinionNorm, 0, 1, 240, 0); // Blue to red
    
    const size = 12;
    noStroke();
    fill(hue, 80, 80, 0.9);
    ellipse(this.x, this.y, size, size);
    
    // Glow for consensus (similar opinions cluster)
    drawingContext.shadowBlur = 10;
    drawingContext.shadowColor = `hsla(${hue}, 70%, 80%, 0.5)`;
    ellipse(this.x, this.y, size * 1.2, size * 1.2);
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
  
  epsilonSlider = createSlider(0.1, 2, 0.5, 0.05);
  epsilonSlider.position(10, y + s);
  epsilonSlider.style('width', '200px');
  
  wScaleSlider = createSlider(0.5, 2, 1, 0.1);
  wScaleSlider.position(10, y + s * 2);
  wScaleSlider.style('width', '200px');
  
  initSpreadSlider = createSlider(0.5, 2, 1, 0.1);
  initSpreadSlider.position(10, y + s * 3);
  initSpreadSlider.style('width', '200px');
  
  consensusSpeedSlider = createSlider(0.01, 0.2, 0.05, 0.01);
  consensusSpeedSlider.position(10, y + s * 4);
  consensusSpeedSlider.style('width', '200px');
}

function initializeAgents(count) {
  agents = [];
  const initSpread = initSpreadSlider.value();
  for (let i = 0; i < count; i++) {
    agents.push(new ConsensusAgent(
      random(100, width - 100),
      random(100, height - 100),
      initSpread
    ));
  }
  
  // Calculate initial variance
  const opinions = agents.map(a => a.x_opinion);
  const mean = opinions.reduce((a, b) => a + b, 0) / opinions.length;
  initialVariance = opinions.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / opinions.length;
}

function draw() {
  background(0, 0, 5);
  
  const epsilon = epsilonSlider.value();
  const w_scale = wScaleSlider.value();
  const consensusSpeed = consensusSpeedSlider.value();
  
  // Update all agents
  for (let a of agents) {
    const neighbors = getNeighbors(a, 100); // Fixed interaction radius
    a.update(neighbors, epsilon, w_scale, consensusSpeed);
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

function calculateMetrics() {
  if (agents.length === 0) return {fairness: 0, variance: 0, meanOpinion: 0};
  
  const opinions = agents.map(a => a.x_opinion);
  const meanOpinion = opinions.reduce((a, b) => a + b, 0) / opinions.length;
  const variance = opinions.reduce((sum, x) => sum + Math.pow(x - meanOpinion, 2), 0) / opinions.length;
  
  // Fairness: F^t = 1 - Var(x^t) / (Var(x^0) + ε)
  const epsilon = 0.01;
  const fairness = 1 - constrain(variance / (initialVariance + epsilon), 0, 1);
  
  return {fairness, variance, meanOpinion};
}

function displayMetrics(metrics) {
  push();
  fill(0, 0, 100, 0.85);
  stroke(0, 0, 60, 0.5);
  rect(width - 260, 10, 250, 140);
  
  fill(0, 0, 0);
  textSize(13);
  textStyle(BOLD);
  text('Consensus Metrics', width - 250, 28);
  textStyle(NORMAL);
  
  textSize(11);
  fill(0, 0, 20);
  text(`Fairness: ${metrics.fairness.toFixed(3)}`, width - 250, 50);
  text(`Variance: ${metrics.variance.toFixed(4)}`, width - 250, 66);
  text(`Mean Opinion: ${metrics.meanOpinion.toFixed(3)}`, width - 250, 82);
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
  
  // Consensus state
  const state = metrics.fairness > 0.8 ? "Consensus" : 
                metrics.fairness > 0.5 ? "Converging" : 
                metrics.fairness > 0.3 ? "Polarized" : "Fragmented";
  fill(metrics.fairness > 0.6 ? 120 : metrics.fairness > 0.3 ? 60 : 0, 80, 80);
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
    text("Consensus Fairness (Voting/Opinion)", boxX + 15, boxY + 30);
    
    textStyle(NORMAL);
    textSize(11);
    fill(255);
    let textY = boxY + 55;
    const lineHeight = 15, margin = 15, textWidth = boxWidth - margin * 2;
    
    const desc = [
      "DESCRIPTION:",
      "Agents have opinions (colors) in 2D space. Similar opinions influence each other, creating consensus. Fairness increases as colors blend toward uniform consensus.",
      "",
      "RELATION TO FAIRNESS:",
      "Fairness means all voices contribute to consensus. Small tolerance (ε) creates polarization; large tolerance enables quick consensus. Fair systems allow diverse opinions to merge without suppressing minority views.",
      "",
      "INTERPRETING METRICS:",
      "• Fairness: 1 - normalized opinion variance. Higher values mean opinions converge (consensus achieved).",
      "",
      "• Variance: Opinion variance. Decreasing variance shows movement toward consensus.",
      "",
      "• Mean Opinion: Average opinion value. Stable values indicate consensus reached.",
      "",
      "OBSERVATIONS:",
      "Watch colors blend: initially diverse colors gradually merge. Consensus appears as uniform color field. Polarization shows as distinct color clusters that don't merge."
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
    { text: `Agent Count: ${agentCountSlider.value()}`, x: 220, y: y + 5, desc: "Total number of agents with opinions. More agents create more complex consensus dynamics." },
    { text: `ε (Tolerance): ${epsilonSlider.value().toFixed(2)}`, x: 220, y: y + spacing + 5, desc: "Range of opinion similarity that allows influence. Small ε → polarization; large ε → quick consensus." },
    { text: `w_ij Scale: ${wScaleSlider.value().toFixed(1)}`, x: 220, y: y + spacing * 2 + 5, desc: "Interaction strength between neighbors. Higher values mean stronger influence between similar opinions." },
    { text: `Init Spread: ${initSpreadSlider.value().toFixed(1)}`, x: 220, y: y + spacing * 3 + 5, desc: "Initial variance of opinions. Higher values start with more diverse opinions." },
    { text: `Consensus Speed: ${consensusSpeedSlider.value().toFixed(2)}`, x: 220, y: y + spacing * 4 + 5, desc: "Scaling factor for averaging rate. Higher values mean faster convergence to consensus." }
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

