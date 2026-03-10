// Fairness Diffusion (Ripple Model) - Using global p5.js mode

let grid = [];
let gridNext = [];
let gridCols = 80;
let gridRows = 64;
let cellWidth, cellHeight;
let DSlider, kappaSlider, phiSourceSlider, visResolutionSlider;
let sources = [];

function setup() {
  createCanvas(1000, 800);
  colorMode(HSB, 360, 100, 100, 1);
  cellWidth = width / gridCols;
  cellHeight = height / gridRows;
  createControls();
  initializeGrid();
}

function createControls() {
  let y = 60, s = 30;
  DSlider = createSlider(0, 0.5, 0.1, 0.01);
  DSlider.position(10, y);
  DSlider.style('width', '200px');
  
  kappaSlider = createSlider(0, 0.1, 0.02, 0.01);
  kappaSlider.position(10, y + s);
  kappaSlider.style('width', '200px');
  
  phiSourceSlider = createSlider(0, 2, 0, 1); // 0=mouse, 1=random, 2=agent-driven
  phiSourceSlider.position(10, y + s * 2);
  phiSourceSlider.style('width', '200px');
  
  visResolutionSlider = createSlider(1, 4, 1, 1);
  visResolutionSlider.position(10, y + s * 3);
  visResolutionSlider.style('width', '200px');
}

function initializeGrid() {
  grid = [];
  gridNext = [];
  for (let y = 0; y < gridRows; y++) {
    grid[y] = [];
    gridNext[y] = [];
    for (let x = 0; x < gridCols; x++) {
      grid[y][x] = random(0.3, 0.7); // Initial fairness potential
      gridNext[y][x] = 0;
    }
  }
}

function draw() {
  // Elegant subtle background - optimized
  background(220, 18, 10);
  
  const D = DSlider.value();
  const kappa = kappaSlider.value();
  const phiSource = phiSourceSlider.value();
  const visRes = visResolutionSlider.value();
  
  // Update sources based on type
  updateSources(phiSource);
  
  // Diffusion equation: φ_i^{t+1} = φ_i^t + D*Σ(φ_j - φ_i) - κ(φ_i - φ*)
  for (let y = 1; y < gridRows - 1; y++) {
    for (let x = 1; x < gridCols - 1; x++) {
      const phi = grid[y][x];
      
      // Laplacian (diffusion term): D * ∇²φ
      const laplacian = D * (
        grid[y-1][x] + grid[y+1][x] + 
        grid[y][x-1] + grid[y][x+1] - 4 * phi
      );
      
      // Target fairness (from sources)
      let phiStar = 0.5; // Default target
      for (let source of sources) {
        const dx = x - source.x;
        const dy = y - source.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < source.radius) {
          phiStar = source.value;
          break;
        }
      }
      
      // Stiffness term: -κ(φ - φ*)
      const stiffness = -kappa * (phi - phiStar);
      
      // Update
      gridNext[y][x] = phi + laplacian + stiffness;
      gridNext[y][x] = constrain(gridNext[y][x], 0, 1);
    }
  }
  
  // Swap grids
  [grid, gridNext] = [gridNext, grid];
  
  // Draw field
  drawField(visRes);
  
  // Draw sources
  drawSources();
  
  // Calculate and display metrics
  const metrics = calculateMetrics();
  displayMetrics(metrics);
  displayInfoBox();
  displayControlLabels();
}

function updateSources(phiSource) {
  sources = [];
  
  if (phiSource < 0.5) {
    // Mouse source
    if (mouseX > 0 && mouseX < width && mouseY > 0 && mouseY < height) {
      const gx = floor(mouseX / cellWidth);
      const gy = floor(mouseY / cellHeight);
      if (gx >= 0 && gx < gridCols && gy >= 0 && gy < gridRows) {
        sources.push({
          x: gx,
          y: gy,
          value: 0.9,
          radius: 5
        });
      }
    }
  } else if (phiSource < 1.5) {
    // Random sources
    if (frameCount % 60 === 0) {
      sources.push({
        x: floor(random(gridCols)),
        y: floor(random(gridRows)),
        value: random(0.7, 1),
        radius: 8
      });
    }
  } else {
    // Agent-driven (simulated)
    for (let i = 0; i < 3; i++) {
      sources.push({
        x: floor(random(gridCols)),
        y: floor(random(gridRows)),
        value: 0.8,
        radius: 6
      });
    }
  }
  
  // Decay old sources
  sources = sources.filter(s => s.radius > 0);
  sources.forEach(s => s.radius *= 0.98);
}

function drawField(visRes) {
  // Smooth, elegant color rendering with interpolation
  for (let y = 0; y < gridRows - 1; y += visRes) {
    for (let x = 0; x < gridCols - 1; x += visRes) {
      // Get surrounding values for smooth interpolation
      const phi00 = grid[y][x];
      const phi01 = grid[y][x + 1];
      const phi10 = grid[y + 1][x];
      const phi11 = grid[y + 1][x + 1];
      
      const w = cellWidth * visRes;
      const h = cellHeight * visRes;
      const px = x * cellWidth;
      const py = y * cellHeight;
      
      // Draw with smooth color interpolation
      for (let sy = 0; sy < visRes; sy++) {
        for (let sx = 0; sx < visRes; sx++) {
          const fx = sx / visRes;
          const fy = sy / visRes;
          
          // Bilinear interpolation
          const phi = (1 - fx) * (1 - fy) * phi00 +
                     fx * (1 - fy) * phi01 +
                     (1 - fx) * fy * phi10 +
                     fx * fy * phi11;
          
          // Elegant color palette: deep purple to cyan to warm yellow
          const hue = map(phi, 0, 1, 280, 60);
          const sat = map(phi, 0, 1, 40, 80);
          const bright = map(phi, 0, 1, 30, 85);
          
          fill(hue, sat, bright, 0.85);
          noStroke();
          rect(px + sx * cellWidth, py + sy * cellHeight, cellWidth, cellHeight);
        }
      }
    }
  }
  
  // Elegant ripple visualization with subtle gradient lines
  if (visRes <= 2) {
    push();
    for (let y = 5; y < gridRows - 5; y += 8) {
      for (let x = 5; x < gridCols - 5; x += 8) {
        const phi = grid[y][x];
        const gradX = (grid[y][x+1] - grid[y][x-1]) / 2;
        const gradY = (grid[y+1][x] - grid[y-1][x]) / 2;
        const mag = Math.sqrt(gradX * gradX + gradY * gradY);
        if (mag > 0.01) {
          const len = mag * 15;
          const alpha = map(mag, 0, 0.2, 0.1, 0.4);
          const hue = map(phi, 0, 1, 280, 60);
          
          stroke(hue, 50, 90, alpha);
          strokeWeight(0.5);
          line(
            x * cellWidth, y * cellHeight,
            x * cellWidth + gradX * len, y * cellHeight + gradY * len
          );
        }
      }
    }
    pop();
  }
}

function drawSources() {
  for (let source of sources) {
    const x = source.x * cellWidth;
    const y = source.y * cellHeight;
    const radius = source.radius * cellWidth;
    
    // Elegant glowing source with multiple layers
    push();
    noStroke();
    
    // Outer glow layers (soft fade)
    for (let i = 4; i >= 1; i--) {
      const alpha = map(i, 1, 4, 0.25, 0.05);
      const size = radius * 2.2 * i;
      fill(60, 70, 95, alpha);
      ellipse(x, y, size, size);
    }
    
    // Mid glow
    fill(60, 80, 100, 0.4);
    ellipse(x, y, radius * 2.5, radius * 2.5);
    
    // Core glow
    fill(60, 90, 100, 0.7);
    ellipse(x, y, radius * 1.8, radius * 1.8);
    
    // Bright center
    fill(60, 100, 100, 1);
    ellipse(x, y, radius * 0.8, radius * 0.8);
    
    pop();
  }
}

function calculateMetrics() {
  let sumPhi = 0;
  let sumGrad = 0;
  let count = 0;
  
  for (let y = 1; y < gridRows - 1; y++) {
    for (let x = 1; x < gridCols - 1; x++) {
      const phi = grid[y][x];
      sumPhi += phi;
      
      // Gradient magnitude
      const gradX = (grid[y][x+1] - grid[y][x-1]) / 2;
      const gradY = (grid[y+1][x] - grid[y-1][x]) / 2;
      const gradMag = Math.sqrt(gradX * gradX + gradY * gradY);
      sumGrad += gradMag;
      count++;
    }
  }
  
  const meanPhi = sumPhi / count;
  const meanGrad = sumGrad / count;
  
  // Fairness = 1 - normalized gradient variance (smooth field = fair)
  const maxGrad = 1.0;
  const fairness = 1 - constrain(meanGrad / maxGrad, 0, 1);
  
  return {fairness, meanPhi, meanGrad};
}

function displayMetrics(metrics) {
  push();
  fill(0, 0, 100, 0.85);
  stroke(0, 0, 60, 0.5);
  rect(width - 260, 10, 250, 140);
  
  fill(0, 0, 0);
  textSize(13);
  textStyle(BOLD);
  text('Diffusion Metrics', width - 250, 28);
  textStyle(NORMAL);
  
  textSize(11);
  fill(0, 0, 20);
  text(`Fairness: ${metrics.fairness.toFixed(3)}`, width - 250, 50);
  text(`Mean φ: ${metrics.meanPhi.toFixed(3)}`, width - 250, 66);
  text(`Mean Gradient: ${metrics.meanGrad.toFixed(4)}`, width - 250, 82);
  text(`Grid: ${gridCols}×${gridRows}`, width - 250, 98);
  
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
  const state = metrics.fairness > 0.8 ? "Smooth" : 
                metrics.fairness > 0.5 ? "Rippling" : "Turbulent";
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
    text("Fairness Diffusion (Ripple Model)", boxX + 15, boxY + 30);
    
    textStyle(NORMAL);
    textSize(11);
    fill(255);
    let textY = boxY + 55;
    const lineHeight = 15, margin = 15, textWidth = boxWidth - margin * 2;
    
    const desc = [
      "DESCRIPTION:",
      "A continuous color field representing fairness potential (φ). Local imbalances create circular ripples that propagate and overlap until the surface becomes smooth.",
      "",
      "RELATION TO FAIRNESS:",
      "Fairness diffuses like waves. Low diffusion (D) creates sharp, slow waves; high diffusion enables fast, soft spreading. At equilibrium, gradient variance approaches zero—fairness is uniform across the field.",
      "",
      "INTERPRETING METRICS:",
      "• Fairness: 1 - normalized gradient variance. Higher values mean smoother field (fairer distribution).",
      "",
      "• Mean φ: Average fairness potential. Stable values indicate equilibrium.",
      "",
      "• Mean Gradient: Average field gradient. Lower gradients mean smoother, fairer distribution.",
      "",
      "OBSERVATIONS:",
      "Watch ripples propagate from sources (mouse, random, or agent-driven). Ripples overlap and smooth out. At equilibrium, the field becomes uniform—fairness achieved through diffusion."
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
  
  const sourceTypes = ["Mouse", "Random", "Agent-Driven"];
  const sourceIdx = Math.floor(phiSourceSlider.value());
  const sourceName = sourceTypes[constrain(sourceIdx, 0, 2)];
  
  const labels = [
    { text: `D (Diffusion): ${DSlider.value().toFixed(2)}`, x: 220, y: y + 5, desc: "Diffusion coefficient: ripple spread rate. Low D = sharp, slow waves; high D = fast, soft diffusion." },
    { text: `κ (Stiffness): ${kappaSlider.value().toFixed(2)}`, x: 220, y: y + spacing + 5, desc: "How strongly agents restore fairness target. Higher values create stronger restoring forces." },
    { text: `φ Source: ${sourceName}`, x: 220, y: y + spacing * 2 + 5, desc: "Dynamic target fairness generator. Mouse: follow cursor. Random: periodic sources. Agent-Driven: simulated agents." },
    { text: `Resolution: ${visResolutionSlider.value()}`, x: 220, y: y + spacing * 3 + 5, desc: "Grid resolution of field visualization. Lower values show more detail but may be slower." }
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

