// Information Fairness (Network Influence Model) - Using global p5.js mode

let nodes = [];
let edges = [];
let etaSlider, wMinSlider, wMaxSlider, agentCountSlider, layoutSlider, centralityToggle;
let fairnessHistory = [];
let maxHistory = 200;

class NetworkNode {
  constructor(x, y, id) {
    this.x = x;
    this.y = y;
    this.id = id;
    this.b = random(0.3, 0.9); // Information access (brightness)
    this.targetX = x;
    this.targetY = y;
    this.vx = 0;
    this.vy = 0;
    this.centrality = 0;
  }
  
  update(eta, w_min, w_max) {
    // Update information access: b^{t+1} = W * b^t (simplified)
    // In practice, we update based on weighted neighbors
    let newB = 0;
    let totalWeight = 0;
    
    for (let edge of edges) {
      if (edge.to === this.id) {
        newB += nodes[edge.from].b * edge.w;
        totalWeight += edge.w;
      }
    }
    
    if (totalWeight > 0) {
      this.b = lerp(this.b, newB / totalWeight, 0.1);
    }
    this.b = constrain(this.b, 0, 1);
  }
  
  display() {
    // Node brightness = information access
    const brightness = map(this.b, 0, 1, 30, 100);
    const size = map(this.b, 0, 1, 12, 28);
    
    // Glow effect based on brightness
    if (this.b > 0.7) {
      drawingContext.shadowBlur = 20;
      drawingContext.shadowColor = `hsla(200, 70%, ${brightness}%, 0.6)`;
    }
    
    noStroke();
    fill(200, 70, brightness, 0.95);
    ellipse(this.x, this.y, size, size);
    
    // Centrality indicator
    if (centralityToggle.value() === 1 && this.centrality > 0.1) {
      stroke(200, 50, 100, 0.6);
      strokeWeight(2);
      noFill();
      ellipse(this.x, this.y, size * (1 + this.centrality * 0.5), size * (1 + this.centrality * 0.5));
    }
    
    drawingContext.shadowBlur = 0;
  }
}

function setup() {
  createCanvas(1000, 800);
  colorMode(HSB, 360, 100, 100, 1);
  createControls();
  initializeNetwork(40);
}

function createControls() {
  let y = 60, s = 30;
  agentCountSlider = createSlider(20, 100, 40, 5);
  agentCountSlider.position(10, y);
  agentCountSlider.style('width', '200px');
  agentCountSlider.input(() => initializeNetwork(agentCountSlider.value()));
  
  etaSlider = createSlider(0, 0.1, 0.02, 0.001);
  etaSlider.position(10, y + s);
  etaSlider.style('width', '200px');
  
  wMinSlider = createSlider(0, 0.5, 0.1, 0.01);
  wMinSlider.position(10, y + s * 2);
  wMinSlider.style('width', '200px');
  
  wMaxSlider = createSlider(0.5, 2, 1.5, 0.1);
  wMaxSlider.position(10, y + s * 3);
  wMaxSlider.style('width', '200px');
  
  layoutSlider = createSlider(0, 2, 0, 1); // 0=random, 1=circular, 2=force-directed
  layoutSlider.position(10, y + s * 4);
  layoutSlider.style('width', '200px');
  
  centralityToggle = createSlider(0, 1, 0, 1);
  centralityToggle.position(10, y + s * 5);
  centralityToggle.style('width', '200px');
}

function initializeNetwork(count) {
  nodes = [];
  edges = [];
  
  const layout = layoutSlider.value();
  
  if (layout < 0.5) {
    // Random layout
    for (let i = 0; i < count; i++) {
      nodes.push(new NetworkNode(
        random(100, width - 100),
        random(100, height - 100),
        i
      ));
    }
  } else if (layout < 1.5) {
    // Circular layout
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = min(width, height) * 0.3;
    for (let i = 0; i < count; i++) {
      const angle = (TWO_PI / count) * i;
      nodes.push(new NetworkNode(
        centerX + cos(angle) * radius,
        centerY + sin(angle) * radius,
        i
      ));
    }
  } else {
    // Force-directed (will be updated in draw)
    for (let i = 0; i < count; i++) {
      nodes.push(new NetworkNode(
        random(100, width - 100),
        random(100, height - 100),
        i
      ));
    }
  }
  
  // Create edges (connect each node to a few neighbors)
  for (let i = 0; i < nodes.length; i++) {
    const numConnections = floor(random(2, 5));
    const candidates = [];
    for (let j = 0; j < nodes.length; j++) {
      if (i !== j) candidates.push(j);
    }
    shuffle(candidates, true);
    
    for (let k = 0; k < min(numConnections, candidates.length); k++) {
      const j = candidates[k];
      const w = random(wMinSlider.value(), wMaxSlider.value());
      edges.push({from: i, to: j, w: w});
    }
  }
}

function draw() {
  background(0, 0, 5);
  
  const eta = etaSlider.value();
  const w_min = wMinSlider.value();
  const w_max = wMaxSlider.value();
  const layout = layoutSlider.value();
  
  // Update edge weights: w_ij^{t+1} = Π_Δ[w_ij^t - η * ∂Φ/∂w_ij]
  // Simplified: adjust weights to reduce fairness potential Φ
  for (let edge of edges) {
    const fromNode = nodes[edge.from];
    const toNode = nodes[edge.to];
    
    // Calculate gradient (simplified)
    const c_i = nodes.reduce((sum, n) => {
      const e = edges.find(e => e.to === n.id && e.from === edge.from);
      return sum + (e ? e.w : 0);
    }, 0);
    const c_avg = edges.reduce((sum, e) => sum + e.w, 0) / edges.length;
    
    const gradient = 2 * (c_i - c_avg);
    edge.w -= eta * gradient;
    edge.w = constrain(edge.w, w_min, w_max);
  }
  
  // Update nodes
  for (let node of nodes) {
    node.update(eta, w_min, w_max);
  }
  
  // Update layout if force-directed
  if (layout >= 1.5) {
    updateForceDirected();
  }
  
  // Calculate centrality if enabled
  if (centralityToggle.value() === 1) {
    calculateCentrality();
  }
  
  // Draw edges (thickness = weight)
  push();
  for (let edge of edges) {
    const fromNode = nodes[edge.from];
    const toNode = nodes[edge.to];
    const thickness = map(edge.w, w_min, w_max, 1, 4);
    const alpha = map(edge.w, w_min, w_max, 0.2, 0.6);
    
    stroke(200, 50, 70, alpha);
    strokeWeight(thickness);
    line(fromNode.x, fromNode.y, toNode.x, toNode.y);
  }
  pop();
  
  // Draw nodes
  for (let node of nodes) {
    node.display();
  }
  
  // Calculate and display metrics
  const metrics = calculateMetrics();
  displayMetrics(metrics);
  displayInfoBox();
  displayControlLabels();
}

function updateForceDirected() {
  // Simple force-directed layout
  for (let node of nodes) {
    let fx = 0, fy = 0;
    
    // Repulsion from all nodes
    for (let other of nodes) {
      if (node === other) continue;
      const dx = node.x - other.x;
      const dy = node.y - other.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = 1000 / (d * d);
      fx += (dx / d) * force;
      fy += (dy / d) * force;
    }
    
    // Attraction along edges
    for (let edge of edges) {
      if (edge.from === node.id) {
        const other = nodes[edge.to];
        const dx = other.x - node.x;
        const dy = other.y - node.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = d * 0.01 * edge.w;
        fx += (dx / d) * force;
        fy += (dy / d) * force;
      }
    }
    
    node.vx = (node.vx + fx) * 0.9;
    node.vy = (node.vy + fy) * 0.9;
    node.x += node.vx;
    node.y += node.vy;
    
    // Keep in bounds
    node.x = constrain(node.x, 50, width - 50);
    node.y = constrain(node.y, 50, height - 50);
  }
}

function calculateCentrality() {
  // Simplified eigenvector centrality approximation
  for (let node of nodes) {
    let centrality = 0;
    for (let edge of edges) {
      if (edge.to === node.id) {
        centrality += edge.w * nodes[edge.from].b;
      }
    }
    node.centrality = constrain(centrality / nodes.length, 0, 1);
  }
}

function calculateMetrics() {
  if (nodes.length === 0) return {fairness: 0, meanAccess: 0, variance: 0};
  
  const accesses = nodes.map(n => n.b);
  const meanAccess = accesses.reduce((a, b) => a + b, 0) / accesses.length;
  const variance = accesses.reduce((sum, b) => sum + Math.pow(b - meanAccess, 2), 0) / accesses.length;
  
  // Fairness potential: Φ = Σ(c_i - c̄)²
  const c_values = nodes.map(n => {
    return edges.filter(e => e.to === n.id).reduce((sum, e) => sum + e.w, 0);
  });
  const c_avg = c_values.reduce((a, b) => a + b, 0) / c_values.length;
  const phi = c_values.reduce((sum, c) => sum + Math.pow(c - c_avg, 2), 0);
  const maxPhi = nodes.length * Math.pow(wMaxSlider.value() * 5, 2);
  const fairness = 1 - constrain(phi / maxPhi, 0, 1);
  
  fairnessHistory.push(fairness);
  if (fairnessHistory.length > maxHistory) {
    fairnessHistory.shift();
  }
  
  return {fairness, meanAccess, variance};
}

function displayMetrics(metrics) {
  push();
  fill(0, 0, 100, 0.85);
  stroke(0, 0, 60, 0.5);
  rect(width - 260, 10, 250, 160);
  
  fill(0, 0, 0);
  textSize(13);
  textStyle(BOLD);
  text('Network Metrics', width - 250, 28);
  textStyle(NORMAL);
  
  textSize(11);
  fill(0, 0, 20);
  text(`Fairness: ${metrics.fairness.toFixed(3)}`, width - 250, 50);
  text(`Mean Access: ${metrics.meanAccess.toFixed(3)}`, width - 250, 66);
  text(`Variance: ${metrics.variance.toFixed(4)}`, width - 250, 82);
  text(`Nodes: ${nodes.length}`, width - 250, 98);
  text(`Edges: ${edges.length}`, width - 250, 114);
  
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
  
  // Fairness history graph
  if (fairnessHistory.length > 2) {
    const graphWidth = 200, graphHeight = 40;
    const graphX = width - 250, graphY = 145;
    
    fill(0, 0, 20, 0.8);
    rect(graphX, graphY, graphWidth, graphHeight);
    
    const minF = Math.min(...fairnessHistory);
    const maxF = Math.max(...fairnessHistory);
    const range = maxF - minF || 0.001;
    
    noFill();
    stroke(200, 80, 80);
    strokeWeight(1.5);
    beginShape();
    for (let i = 0; i < fairnessHistory.length; i++) {
      const x = map(i, 0, fairnessHistory.length - 1, graphX + 5, graphX + graphWidth - 5);
      const y = map(fairnessHistory[i], minF, maxF, graphY + graphHeight - 5, graphY + 5);
      vertex(x, y);
    }
    endShape();
  }
  
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
    text("Information Fairness (Network Influence)", boxX + 15, boxY + 30);
    
    textStyle(NORMAL);
    textSize(11);
    fill(255);
    let textY = boxY + 55;
    const lineHeight = 15, margin = 15, textWidth = boxWidth - margin * 2;
    
    const desc = [
      "DESCRIPTION:",
      "A dynamic network where nodes represent agents and edges show influence connections. Node brightness indicates information access; edge thickness shows connection strength.",
      "",
      "RELATION TO FAIRNESS:",
      "Fairness means equal access to information and influence. The network rebalances edge weights to reduce inequality in information access. Central nodes (high brightness) have more influence—fairness emerges when influence distributes evenly.",
      "",
      "INTERPRETING METRICS:",
      "• Fairness: Based on fairness potential Φ. Higher values mean more balanced information access across nodes.",
      "",
      "• Mean Access: Average information access. Increasing values show improving access for all agents.",
      "",
      "• Variance: Access variance. Lower variance means more equitable information distribution.",
      "",
      "OBSERVATIONS:",
      "Watch node brightness equalize and edges normalize. Networks with localized power slowly rebalance. Stable fairness corresponds to evenly distributed brightness."
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
  
  const layoutNames = ["Random", "Circular", "Force-Directed"];
  const layoutIdx = Math.floor(layoutSlider.value());
  const layoutName = layoutNames[layoutIdx] || "Random";
  
  const labels = [
    { text: `Nodes: ${agentCountSlider.value()}`, x: 220, y: y + 5, desc: "Total number of nodes in the network. More nodes create more complex influence patterns." },
    { text: `η (Learning): ${etaSlider.value().toFixed(3)}`, x: 220, y: y + spacing + 5, desc: "Learning rate: how quickly edge weights adjust to reduce fairness potential. Higher values mean faster rebalancing." },
    { text: `w_min: ${wMinSlider.value().toFixed(2)}`, x: 220, y: y + spacing * 2 + 5, desc: "Minimum connection strength. Lower values allow weaker connections in the network." },
    { text: `w_max: ${wMaxSlider.value().toFixed(2)}`, x: 220, y: y + spacing * 3 + 5, desc: "Maximum connection strength. Higher values allow stronger influence connections." },
    { text: `Layout: ${layoutName}`, x: 220, y: y + spacing * 4 + 5, desc: "Network layout style. Random: scattered nodes. Circular: arranged in circle. Force-Directed: physics-based positioning." },
    { text: `Centrality: ${centralityToggle.value() === 1 ? "On" : "Off"}`, x: 220, y: y + spacing * 5 + 5, desc: "Show eigenvector centrality visualization. Central nodes (high influence) show larger rings." }
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

