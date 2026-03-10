// Segregation Analog Model - Using global p5.js mode

let agents = [];
let neighborhoodRadiusSlider, intoleranceSlider, densitySlider;

function setup() {
  createCanvas(1000, 800);
  colorMode(HSB, 360, 100, 100, 1);
  createControls();
  initializeAgents();
}

function createControls() {
  let y = 60, s = 30; // Start below menu bar
  neighborhoodRadiusSlider = createSlider(20, 200, 80, 5);
  neighborhoodRadiusSlider.position(10, y);
  neighborhoodRadiusSlider.style('width', '200px');
  
  intoleranceSlider = createSlider(0, 0.9, 0.3, 0.01);
  intoleranceSlider.position(10, y + s);
  intoleranceSlider.style('width', '200px');
  
  densitySlider = createSlider(0.2, 1, 0.6, 0.05);
  densitySlider.position(10, y + s * 2);
  densitySlider.style('width', '200px');
  densitySlider.input(() => initializeAgents());
}

function initializeAgents() {
  const count = Math.floor(600 * densitySlider.value());
  agents = [];
  for (let i = 0; i < count; i++) {
    agents.push({
      x: random(30, width - 30),
      y: random(30, height - 30),
      group: Math.random() < 0.5 ? 0 : 1,
      satisfied: true
    });
  }
}

function draw() {
  background(210, 10, 12);
  const radius = neighborhoodRadiusSlider.value();
  const intolerance = intoleranceSlider.value();
  
  // Move unsatisfied agents toward less dense regions
  for (let a of agents) {
    const neighbors = getNeighbors(a, radius);
    const myGroup = a.group;
    const same = neighbors.filter(n => n.group === myGroup).length;
    const propSame = neighbors.length ? same / neighbors.length : 1;
    a.satisfied = propSame >= (1 - intolerance);
    
    // Drift
    if (!a.satisfied) {
      const angle = random(TWO_PI);
      a.x += cos(angle) * 2;
      a.y += sin(angle) * 2;
    } else {
      a.x += random(-0.5, 0.5);
      a.y += random(-0.5, 0.5);
    }
    
    // Wrap
    if (a.x < 0) a.x = width;
    if (a.x > width) a.x = 0;
    if (a.y < 0) a.y = height;
    if (a.y > height) a.y = 0;
  }
  
  // Draw connections to same-group neighbors
  push();
  for (let i = 0; i < agents.length; i++) {
    for (let j = i + 1; j < agents.length; j++) {
      const ai = agents[i], aj = agents[j];
      const d = dist(ai.x, ai.y, aj.x, aj.y);
      if (d < radius * 0.6 && ai.group === aj.group) {
        const hue = ai.group === 0 ? 200 : 20;
        stroke(hue, 60, 60, map(d, 0, radius * 0.6, 0.4, 0.05));
        line(ai.x, ai.y, aj.x, aj.y);
      }
    }
  }
  pop();
  
  // Draw agents
  for (let a of agents) {
    const hue = a.group === 0 ? 200 : 20;
    const br = a.satisfied ? 80 : 40;
    noStroke();
    fill(hue, 70, br, 0.95);
    ellipse(a.x, a.y, 10, 10);
  }
  
  // Calculate and display metrics
  const metrics = calculateSegregationMetrics(radius);
  displayMetrics(metrics);
  displayInfoBox();
  displayControlLabels();
}

function calculateSegregationMetrics(radius) {
  let satisfiedCount = 0;
  let group0Count = 0;
  let group1Count = 0;
  let totalSimilarity = 0;
  let validAgents = 0;
  
  for (let a of agents) {
    if (a.satisfied) satisfiedCount++;
    if (a.group === 0) group0Count++;
    else group1Count++;
    
    const neighbors = getNeighbors(a, radius);
    if (neighbors.length > 0) {
      const same = neighbors.filter(n => n.group === a.group).length;
      const similarity = same / neighbors.length;
      totalSimilarity += similarity;
      validAgents++;
    }
  }
  
  const satisfactionRate = agents.length > 0 ? satisfiedCount / agents.length : 0;
  const avgSimilarity = validAgents > 0 ? totalSimilarity / validAgents : 0;
  
  // Calculate segregation index (0 = fully integrated, 1 = fully segregated)
  // Based on how much agents' neighborhoods differ from overall population
  let segregationIndex = 0;
  if (agents.length > 0) {
    const overallGroup0Prop = group0Count / agents.length;
    let totalDeviation = 0;
    let validCount = 0;
    
    for (let a of agents) {
      const neighbors = getNeighbors(a, radius);
      if (neighbors.length > 0) {
        const group0Neighbors = neighbors.filter(n => n.group === 0).length;
        const localGroup0Prop = group0Neighbors / neighbors.length;
        // Deviation from expected (overall proportion)
        const deviation = Math.abs(localGroup0Prop - overallGroup0Prop);
        totalDeviation += deviation;
        validCount++;
      }
    }
    
    // Normalize: max deviation would be 0.5 (if all neighborhoods are homogeneous but opposite)
    segregationIndex = validCount > 0 ? (totalDeviation / validCount) * 2 : 0;
    segregationIndex = Math.min(1, segregationIndex);
  }
  
  return {
    satisfactionRate,
    segregationIndex,
    group0Count,
    group1Count,
    avgSimilarity,
    agentCount: agents.length
  };
}

function displayMetrics(metrics) {
  push();
  fill(0, 0, 100, 0.85);
  stroke(0, 0, 60, 0.5);
  rect(width - 260, 10, 250, 160);
  
  fill(0, 0, 0);
  textSize(13);
  textStyle(BOLD);
  text('Segregation Metrics', width - 250, 28);
  textStyle(NORMAL);
  
  textSize(11);
  fill(0, 0, 20);
  text(`Satisfaction Rate: ${(metrics.satisfactionRate * 100).toFixed(1)}%`, width - 250, 50);
  text(`Segregation Index: ${metrics.segregationIndex.toFixed(3)}`, width - 250, 66);
  text(`Avg Similarity: ${metrics.avgSimilarity.toFixed(3)}`, width - 250, 82);
  text(`Group 0: ${metrics.group0Count} | Group 1: ${metrics.group1Count}`, width - 250, 98);
  text(`Agents: ${metrics.agentCount}`, width - 250, 114);
  
  // Segregation bar
  const barWidth = 200, barHeight = 8, barX = width - 250, barY = 130;
  fill(0, 0, 30);
  noStroke();
  rect(barX, barY, barWidth, barHeight);
  
  // Color based on segregation level
  const segColor = metrics.segregationIndex > 0.6 ? color(0, 80, 80) : 
                   metrics.segregationIndex > 0.3 ? color(60, 80, 80) : 
                   color(120, 80, 80);
  fill(segColor);
  rect(barX, barY, barWidth * metrics.segregationIndex, barHeight);
  
  // State label
  const state = metrics.segregationIndex > 0.7 ? "Highly Segregated" : 
                metrics.segregationIndex > 0.4 ? "Moderately Segregated" : 
                metrics.segregationIndex > 0.2 ? "Mildly Segregated" : "Integrated";
  fill(metrics.segregationIndex > 0.5 ? 0 : metrics.segregationIndex > 0.3 ? 60 : 120, 80, 80);
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
    text("Segregation Analog", boxX + 15, boxY + 30);
    
    textStyle(NORMAL);
    textSize(11);
    fill(255);
    let textY = boxY + 55;
    const lineHeight = 15, margin = 15, textWidth = boxWidth - margin * 2;
    
    const desc = [
      "DESCRIPTION:",
      "A Schelling-like model showing how local preferences create segregation patterns. Agents are satisfied when enough neighbors share their group.",
      "",
      "RELATION TO FAIRNESS:",
      "Segregation demonstrates how even mild preferences can create unfair outcomes. The segregation index measures how much local neighborhoods differ from overall population mix. Fairness means integrated neighborhoods despite preferences.",
      "",
      "INTERPRETING METRICS:",
      "• Satisfaction Rate: Percentage of satisfied agents. High rates may indicate segregation.",
      "",
      "• Segregation Index: 0 (integrated) to 1 (fully segregated). Lower values mean fairer integration.",
      "",
      "• Avg Similarity: Average proportion of same-group neighbors. High similarity indicates segregation.",
      "",
      "OBSERVATIONS:",
      "Watch group clustering: satisfied agents (bright) cluster together. Segregation appears as distinct group regions. Fair integration shows mixed neighborhoods."
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
  let y = 60, spacing = 30; // Start below menu bar
  
  const labels = [
    { text: `Neighborhood Radius: ${neighborhoodRadiusSlider.value()}`, x: 220, y: y + 5, desc: "The distance within which agents check their neighbors' group composition. Larger radius means agents are aware of more distant neighbors when deciding satisfaction." },
    { text: `Intolerance: ${intoleranceSlider.value().toFixed(2)}`, x: 220, y: y + spacing + 5, desc: "The minimum proportion of same-group neighbors required for satisfaction. Lower values mean agents are more tolerant of diversity, higher values lead to stronger segregation." },
    { text: `Density: ${densitySlider.value().toFixed(2)}`, x: 220, y: y + spacing * 2 + 5, desc: "Overall population density. Higher density means more agents in the same space, creating more opportunities for segregation patterns to emerge." }
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

function getNeighbors(a, radius) {
  const out = [];
  for (let b of agents) {
    if (a === b) continue;
    const dx = a.x - b.x, dy = a.y - b.y;
    if (dx * dx + dy * dy < radius * radius) out.push(b);
  }
  return out;
}

