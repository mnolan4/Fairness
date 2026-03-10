// Cooperative Game Theory (Coalitions) - Using global p5.js mode

let agents = [];
let coalitions = [];
let mergeThresholdSlider, gammaSplitSlider, vTypeSlider, agentCountSlider;

class CoalitionAgent {
  constructor(x, y, id) {
    this.x = x;
    this.y = y;
    this.id = id;
    this.coalitionId = id; // Start in own coalition
    this.utility = random(0.3, 0.7);
    this.vx = random(-0.3, 0.3);
    this.vy = random(-0.3, 0.3);
  }
  
  update() {
    // Move toward coalition center
    const coalition = coalitions.find(c => c.id === this.coalitionId);
    if (coalition && coalition.members.length > 1) {
      const centerX = coalition.centerX;
      const centerY = coalition.centerY;
      const dx = centerX - this.x;
      const dy = centerY - this.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      this.vx += (dx / d) * 0.05;
      this.vy += (dy / d) * 0.05;
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
  
  display(coalition) {
    const size = 10;
    const fairness = coalition ? coalition.fairness : 0.5;
    const hue = map(fairness, 0, 1, 0, 120);
    
    // Transparency based on fairness
    const alpha = map(fairness, 0, 1, 0.4, 0.95);
    
    noStroke();
    fill(hue, 70, 80, alpha);
    ellipse(this.x, this.y, size, size);
  }
}

class Coalition {
  constructor(id, members) {
    this.id = id;
    this.members = members;
    this.updateCenter();
    this.pulsePhase = random(TWO_PI);
    this.stable = false;
  }
  
  updateCenter() {
    if (this.members.length > 0) {
      this.centerX = this.members.reduce((sum, a) => sum + a.x, 0) / this.members.length;
      this.centerY = this.members.reduce((sum, a) => sum + a.y, 0) / this.members.length;
    }
  }
  
  calculateValue(vType) {
    // v(S) - coalition value function
    if (vType < 0.33) {
      // Additive
      return this.members.reduce((sum, a) => sum + a.utility, 0);
    } else if (vType < 0.66) {
      // Synergistic (superadditive)
      const base = this.members.reduce((sum, a) => sum + a.utility, 0);
      return base * (1 + 0.2 * this.members.length);
    } else {
      // Random
      return random(0.5, 2) * this.members.length;
    }
  }
  
  calculateShapleyValues() {
    // Simplified Shapley value approximation
    const n = this.members.length;
    const vS = this.calculateValue(vTypeSlider.value());
    const shapley = vS / n; // Simplified: equal division
    return this.members.map(() => shapley);
  }
  
  calculateFairness() {
    const payoffs = this.calculateShapleyValues();
    const mean = payoffs.reduce((a, b) => a + b, 0) / payoffs.length;
    const variance = payoffs.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / payoffs.length;
    return 1 - constrain(variance, 0, 1);
  }
  
  display() {
    this.updateCenter();
    const fairness = this.calculateFairness();
    this.fairness = fairness;
    this.stable = fairness > 0.7;
    
    // Draw coalition boundary
    if (this.members.length > 1) {
      const hue = map(fairness, 0, 1, 0, 120);
      const alpha = map(fairness, 0, 1, 0.2, 0.5);
      
      // Pulsing for unstable coalitions
      let pulse = 1;
      if (!this.stable) {
        this.pulsePhase += 0.1;
        pulse = 1 + sin(this.pulsePhase) * 0.1;
      }
      
      noFill();
      stroke(hue, 50, 70, alpha);
      strokeWeight(2);
      
      // Draw convex hull approximation
      beginShape();
      for (let a of this.members) {
        vertex(a.x, a.y);
      }
      endShape(CLOSE);
    }
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
  
  mergeThresholdSlider = createSlider(0, 0.5, 0.1, 0.01);
  mergeThresholdSlider.position(10, y + s);
  mergeThresholdSlider.style('width', '200px');
  
  gammaSplitSlider = createSlider(0, 0.1, 0.02, 0.001);
  gammaSplitSlider.position(10, y + s * 2);
  gammaSplitSlider.style('width', '200px');
  
  vTypeSlider = createSlider(0, 1, 0, 0.01); // 0=additive, 0.33=synergistic, 0.66=random
  vTypeSlider.position(10, y + s * 3);
  vTypeSlider.style('width', '200px');
}

function initializeAgents(count) {
  agents = [];
  coalitions = [];
  for (let i = 0; i < count; i++) {
    agents.push(new CoalitionAgent(
      random(100, width - 100),
      random(100, height - 100),
      i
    ));
    coalitions.push(new Coalition(i, [agents[i]]));
  }
}

function draw() {
  background(0, 0, 5);
  
  // Update coalitions (merge/split logic)
  updateCoalitions();
  
  // Update agents
  for (let a of agents) {
    a.update();
  }
  
  // Draw coalitions
  for (let c of coalitions) {
    c.display();
  }
  
  // Draw agents
  for (let a of agents) {
    const coalition = coalitions.find(c => c.id === a.coalitionId);
    a.display(coalition);
  }
  
  // Calculate and display metrics
  const metrics = calculateMetrics();
  displayMetrics(metrics);
  displayInfoBox();
  displayControlLabels();
}

function updateCoalitions() {
  const mergeThreshold = mergeThresholdSlider.value();
  const gammaSplit = gammaSplitSlider.value();
  
  // Try merging nearby coalitions
  for (let i = 0; i < coalitions.length; i++) {
    for (let j = i + 1; j < coalitions.length; j++) {
      const c1 = coalitions[i];
      const c2 = coalitions[j];
      
      // Check distance between coalition centers
      const d = dist(c1.centerX, c1.centerY, c2.centerX, c2.centerY);
      if (d < 150) {
        // Calculate potential gain from merging
        const v1 = c1.calculateValue(vTypeSlider.value());
        const v2 = c2.calculateValue(vTypeSlider.value());
        const merged = new Coalition(c1.id, [...c1.members, ...c2.members]);
        const vMerged = merged.calculateValue(vTypeSlider.value());
        const gain = vMerged - (v1 + v2);
        
        if (gain > mergeThreshold) {
          // Merge
          c1.members.push(...c2.members);
          c2.members.forEach(a => a.coalitionId = c1.id);
          coalitions.splice(j, 1);
          j--;
        }
      }
    }
  }
  
  // Try splitting unfair coalitions
  for (let i = coalitions.length - 1; i >= 0; i--) {
    const c = coalitions[i];
    if (c.members.length > 1) {
      const fairness = c.calculateFairness();
      if (fairness < 0.5 && random() < gammaSplit) {
        // Split coalition
        const mid = Math.floor(c.members.length / 2);
        const newCoalition = new Coalition(coalitions.length, c.members.slice(mid));
        c.members = c.members.slice(0, mid);
        newCoalition.members.forEach(a => a.coalitionId = newCoalition.id);
        coalitions.push(newCoalition);
      }
    }
  }
}

function calculateMetrics() {
  if (coalitions.length === 0) return {fairness: 0, numCoalitions: 0, meanSize: 0};
  
  const fairnesses = coalitions.map(c => c.calculateFairness());
  const meanFairness = fairnesses.reduce((a, b) => a + b, 0) / fairnesses.length;
  const meanSize = coalitions.reduce((sum, c) => sum + c.members.length, 0) / coalitions.length;
  
  return {fairness: meanFairness, numCoalitions: coalitions.length, meanSize};
}

function displayMetrics(metrics) {
  push();
  fill(0, 0, 100, 0.85);
  stroke(0, 0, 60, 0.5);
  rect(width - 260, 10, 250, 140);
  
  fill(0, 0, 0);
  textSize(13);
  textStyle(BOLD);
  text('Coalition Metrics', width - 250, 28);
  textStyle(NORMAL);
  
  textSize(11);
  fill(0, 0, 20);
  text(`Fairness: ${metrics.fairness.toFixed(3)}`, width - 250, 50);
  text(`Coalitions: ${metrics.numCoalitions}`, width - 250, 66);
  text(`Mean Size: ${metrics.meanSize.toFixed(1)}`, width - 250, 82);
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
    text("Cooperative Game Theory (Coalitions)", boxX + 15, boxY + 30);
    
    textStyle(NORMAL);
    textSize(11);
    fill(255);
    let textY = boxY + 55;
    const lineHeight = 15, margin = 15, textWidth = boxWidth - margin * 2;
    
    const desc = [
      "DESCRIPTION:",
      "Agents form coalitions (clusters) to maximize collective payoff. Coalition boundaries show fairness of payoff distribution. Stable coalitions have steady colors; unstable ones pulse or fragment.",
      "",
      "RELATION TO FAIRNESS:",
      "Fairness means Shapley values (marginal contributions) determine payoffs. Agents continuously form, merge, and break alliances seeking fair distribution. Equilibrium yields few stable, well-balanced coalitions with transparent boundaries.",
      "",
      "INTERPRETING METRICS:",
      "• Fairness: Average coalition fairness. Higher values mean payoffs are distributed fairly within coalitions.",
      "",
      "• Coalitions: Number of active coalitions. Fewer, larger coalitions often indicate stable fairness.",
      "",
      "• Mean Size: Average coalition size. Balanced sizes suggest fair coalition formation.",
      "",
      "OBSERVATIONS:",
      "Watch coalition boundaries: transparent boundaries indicate fair payoffs. Pulsing boundaries show instability. Stable coalitions maintain steady colors and don't fragment."
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
  
  const vTypes = ["Additive", "Synergistic", "Random"];
  const vTypeIdx = Math.floor(vTypeSlider.value() * 3);
  const vTypeName = vTypes[constrain(vTypeIdx, 0, 2)];
  
  const labels = [
    { text: `Agent Count: ${agentCountSlider.value()}`, x: 220, y: y + 5, desc: "Total number of agents. System size affects coalition formation dynamics." },
    { text: `Merge Threshold: ${mergeThresholdSlider.value().toFixed(2)}`, x: 220, y: y + spacing + 5, desc: "Minimum payoff gain for merging coalitions. Lower values encourage more merging." },
    { text: `γ_split: ${gammaSplitSlider.value().toFixed(3)}`, x: 220, y: y + spacing * 2 + 5, desc: "Probability of split under unfair payoffs. Higher values mean unstable coalitions break apart faster." },
    { text: `v(S) Type: ${vTypeName}`, x: 220, y: y + spacing * 3 + 5, desc: "Coalition value function type. Additive: sum of utilities. Synergistic: bonus for size. Random: stochastic values." }
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

