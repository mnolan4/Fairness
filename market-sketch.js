// Market Exchange Model - Using global p5.js mode

let agents = [];
let tradeRateSlider, agentCountSlider, volatilitySlider, zoomSlider, viewModeSlider;
let fairnessSystem;
let recentTrades = []; // Track recent trades for visualization
let maxRecentTrades = 50;

function setup() {
  createCanvas(1000, 800);
  colorMode(HSB, 360, 100, 100, 1);
  fairnessSystem = new FairnessSystem();
  createControls();
  initializeAgents(80);
}

function createControls() {
  let y = 60, s = 30; // Start below menu bar
  agentCountSlider = createSlider(20, 200, 80, 5);
  agentCountSlider.position(10, y);
  agentCountSlider.style('width', '200px');
  agentCountSlider.input(() => initializeAgents(agentCountSlider.value()));
  
  tradeRateSlider = createSlider(0, 5, 1.2, 0.1);
  tradeRateSlider.position(10, y + s);
  tradeRateSlider.style('width', '200px');
  
  volatilitySlider = createSlider(0, 1, 0.3, 0.01);
  volatilitySlider.position(10, y + s * 2);
  volatilitySlider.style('width', '200px');
  
  zoomSlider = createSlider(0.3, 1.5, 0.8, 0.05);
  zoomSlider.position(10, y + s * 3);
  zoomSlider.style('width', '200px');
  
  viewModeSlider = createSlider(0, 1, 1, 1); // 0 = spatial, 1 = organized (default to organized)
  viewModeSlider.position(10, y + s * 4);
  viewModeSlider.style('width', '200px');
}

function initializeAgents(count) {
  agents = [];
  // Initialize agents in a more organized grid-like pattern with better spacing
  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);
  const margin = 80;
  const cellWidth = (width - margin * 2) / cols;
  const cellHeight = (height - margin * 2) / rows;
  
  for (let i = 0; i < count; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    agents.push({
      x: margin + (col + 0.5) * cellWidth + random(-cellWidth * 0.15, cellWidth * 0.15),
      y: margin + (row + 0.5) * cellHeight + random(-cellHeight * 0.15, cellHeight * 0.15),
      utility: random(0.2, 0.9),
      weight: random(0.6, 1.4),
      wealth: random(0.2, 2),
      vx: random(-0.3, 0.3),
      vy: random(-0.3, 0.3)
    });
  }
  recentTrades = [];
}

function draw() {
  const fc = fairnessSystem.calculateFairnessCoefficient(agents);
  const hue = map(fc, 0, 1, 0, 120);
  background(hue, 20, 14);

  // Simple zoom centered on canvas
  const zoom = zoomSlider.value();
  const centerX = width / 2;
  const centerY = height / 2;
  
  push();
  translate(centerX, centerY);
  scale(zoom);
  translate(-centerX, -centerY);

  // Random pairing trades
  const trades = Math.floor(agents.length * tradeRateSlider.value());
  for (let i = 0; i < trades; i++) {
    const a = agents[Math.floor(Math.random() * agents.length)];
    const b = agents[Math.floor(Math.random() * agents.length)];
    if (a === b) continue;
    const traded = trade(a, b);
    if (traded) {
      // Record trade for visualization
      recentTrades.push({
        from: {x: a.x, y: a.y},
        to: {x: b.x, y: b.y},
        age: 0
      });
      if (recentTrades.length > maxRecentTrades) {
        recentTrades.shift();
      }
    }
  }

  // Update trade ages and remove old ones
  recentTrades = recentTrades.filter(t => {
    t.age++;
    return t.age < 30; // Fade out after 30 frames
  });

  const viewMode = viewModeSlider.value();
  
  if (viewMode < 0.5) {
    // Spatial view - agents move with repulsion
    for (let a of agents) {
      let fx = 0, fy = 0;
      
      // Stronger repulsion from other agents
      for (let b of agents) {
        if (a === b) continue;
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = 50; // Increased minimum distance
        const agentSize = map(Math.max(a.wealth, b.wealth), 0.1, 5, 12, 36);
        
        if (dist < minDist + agentSize && dist > 0) {
          const force = ((minDist + agentSize) - dist) / dist * 0.8;
          fx += (dx / dist) * force;
          fy += (dy / dist) * force;
        }
      }
      
      // Add to velocity
      a.vx += fx;
      a.vy += fy;
      
      // Velocity damping
      a.vx *= 0.90;
      a.vy *= 0.90;
      
      // Add small random movement
      a.vx += random(-0.15, 0.15);
      a.vy += random(-0.15, 0.15);
      
      // Limit velocity
      const speed = Math.sqrt(a.vx * a.vx + a.vy * a.vy);
      if (speed > 1.2) {
        a.vx = (a.vx / speed) * 1.2;
        a.vy = (a.vy / speed) * 1.2;
      }
      
      // Update position
      a.x += a.vx;
      a.y += a.vy;
      
      // Soft boundary with repulsion
      const margin = 80;
      if (a.x < margin) { 
        a.x = margin; 
        a.vx += 0.4;
      }
      if (a.x > width - margin) { 
        a.x = width - margin; 
        a.vx -= 0.4; 
      }
      if (a.y < margin) { 
        a.y = margin; 
        a.vy += 0.4; 
      }
      if (a.y > height - margin) { 
        a.y = height - margin; 
        a.vy -= 0.4; 
      }
    }
  } else {
    // Organized view - arrange by wealth in a grid
    agents.sort((a, b) => a.wealth - b.wealth);
    const cols = Math.ceil(Math.sqrt(agents.length));
    const rows = Math.ceil(agents.length / cols);
    const margin = 100;
    const cellWidth = (width - margin * 2) / cols;
    const cellHeight = (height - margin * 2) / rows;
    
    for (let i = 0; i < agents.length; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const targetX = margin + (col + 0.5) * cellWidth;
      const targetY = margin + (row + 0.5) * cellHeight;
      
      // Smooth movement toward organized position
      agents[i].x = lerp(agents[i].x, targetX, 0.15);
      agents[i].y = lerp(agents[i].y, targetY, 0.15);
      // Reset velocity in organized mode
      agents[i].vx *= 0.8;
      agents[i].vy *= 0.8;
    }
  }

  // Draw recent trade connections (fade with age) - only show significant trades
  push();
  strokeWeight(1.5);
  for (let trade of recentTrades) {
    const alpha = map(trade.age, 0, 30, 0.5, 0);
    if (alpha > 0.1) {
      stroke(200, 50, 80, alpha);
      line(trade.from.x, trade.from.y, trade.to.x, trade.to.y);
    }
  }
  pop();

  // Draw agents (wealth ~ size, utility ~ hue)
  // Sort by wealth to draw larger agents on top
  const sortedAgents = [...agents].sort((a, b) => a.wealth - b.wealth);
  
  for (let a of sortedAgents) {
    const size = map(a.wealth, 0.1, 5, 12, 36);
    const uh = map(a.utility, 0.1, 1, 240, 60);
    
    // Draw shadow for depth
    fill(0, 0, 0, 0.4);
    noStroke();
    ellipse(a.x + 3, a.y + 3, size * 0.9, size * 0.9);
    
    // Draw agent with stroke for definition
    stroke(uh, 30, 40, 0.8);
    strokeWeight(1.5);
    fill(uh, 70, 70, 0.95);
    ellipse(a.x, a.y, size, size);
    
    // Draw inner wealth indicator (smaller circle)
    noStroke();
    fill(uh, 50, 50, 0.6);
    ellipse(a.x, a.y, size * 0.5, size * 0.5);
  }
  
  pop(); // End zoom transform

  // Panel
  const metrics = fairnessSystem.calculateAllMetrics(agents);
  displayPanel(metrics);
  displayInfoBox();
  displayControlLabels();
}

function displayControlLabels() {
  push();
  fill(0, 0, 100, 0.9);
  textAlign(LEFT);
  textSize(10);
  let y = 60, spacing = 30; // Start below menu bar
  
  const viewMode = viewModeSlider.value();
  const viewModeText = viewMode < 0.5 ? "Spatial" : "Organized";
  
  const labels = [
    { text: `Agent Count: ${agentCountSlider.value()}`, x: 220, y: y + 5, desc: "Total number of trading agents in the market. More agents create more trading opportunities and complex wealth distributions." },
    { text: `Trade Rate: ${tradeRateSlider.value().toFixed(1)}`, x: 220, y: y + spacing + 5, desc: "Number of trades per frame per agent. Higher rates mean more frequent exchanges, potentially leading to faster wealth redistribution." },
    { text: `Volatility: ${volatilitySlider.value().toFixed(2)}`, x: 220, y: y + spacing * 2 + 5, desc: "Price fluctuation in trades. Higher volatility creates more uncertainty in exchange rates, affecting how wealth flows between agents." },
    { text: `Zoom: ${zoomSlider.value().toFixed(2)}x`, x: 220, y: y + spacing * 3 + 5, desc: "Zoom level for the visualization. Zoom out to see the whole system, zoom in to see individual agents and trades more clearly." },
    { text: `View: ${viewModeText}`, x: 220, y: y + spacing * 4 + 5, desc: "Spatial view shows agents moving freely with repulsion. Organized view arranges agents by wealth level for clearer distribution visualization." }
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
    text("Market Exchange", boxX + 15, boxY + 30);
    
    textStyle(NORMAL);
    textSize(11);
    fill(255);
    let textY = boxY + 55;
    const lineHeight = 15, margin = 15, textWidth = boxWidth - margin * 2;
    
    const desc = [
      "DESCRIPTION:",
      "Agents trade resources based on utility/weight ratio mismatches. Wealth (size) and utility (color) change through exchanges. Recent trades appear as fading lines.",
      "",
      "RELATION TO FAIRNESS:",
      "Fair markets redistribute wealth through voluntary exchange. Fairness emerges when trading corrects utility/weight imbalances. High trade rates enable faster redistribution; volatility adds uncertainty.",
      "",
      "INTERPRETING METRICS:",
      "• FC: Fairness coefficient. Higher values mean more equitable utility distribution after trading.",
      "",
      "• Mean Utility: Average agent utility. Increasing values show improving conditions.",
      "",
      "• Variance: Utility variance. Decreasing variance shows wealth redistribution.",
      "",
      "OBSERVATIONS:",
      "Watch trade lines fade: active trading shows wealth flow. Organized view arranges agents by wealth. Fair markets show gradual wealth equalization through exchange."
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

function trade(a, b) {
  // Price fluctuation
  const price = 1 + (random(-volatilitySlider.value(), volatilitySlider.value()) * 0.2);
  // Trade size scaled by mismatch of utility/weight ratios
  const ra = a.utility / a.weight;
  const rb = b.utility / b.weight;
  const gap = Math.abs(ra - rb);
  const flow = Math.min(a.wealth, 0.05 + gap * 0.1);
  
  if (flow < 0.01) return false; // No significant trade
  
  if (ra > rb) {
    a.wealth -= flow;
    b.wealth += flow * price;
    a.utility -= flow * 0.02;
    b.utility += flow * 0.02;
  } else if (rb > ra) {
    b.wealth -= flow;
    a.wealth += flow * price;
    b.utility -= flow * 0.02;
    a.utility += flow * 0.02;
  }
  a.utility = Math.max(0.1, Math.min(1, a.utility));
  b.utility = Math.max(0.1, Math.min(1, b.utility));
  a.wealth = Math.max(0.1, a.wealth);
  b.wealth = Math.max(0.1, b.wealth);
  
  return true; // Trade occurred
}

function displayPanel(metrics) {
  push();
  fill(0, 0, 100, 0.85);
  stroke(0, 0, 60, 0.5);
  rect(width - 260, 10, 250, 120);
  fill(0, 0, 0);
  textSize(13);
  textStyle(BOLD);
  text('Market Exchange', width - 250, 28);
  textStyle(NORMAL);
  textSize(11);
  fill(0, 0, 20);
  text(`FC: ${metrics.fc.toFixed(3)}`, width - 250, 50);
  text(`Mean Utility: ${metrics.meanUtility.toFixed(3)}`, width - 250, 66);
  text(`Variance: ${metrics.variance.toFixed(4)}`, width - 250, 82);
  text(`Agents: ${agents.length}`, width - 250, 98);
  pop();
}

