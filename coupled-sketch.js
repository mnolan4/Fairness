// Coupled Diffusion Model - Two competitive particle populations
// Using global p5.js mode

let particlesA = [];
let particlesB = [];
let driftASlider, driftBSlider, couplingSlider, noiseASlider, noiseBSlider, particleCountSlider;
let t = 0; // Time for wave animation
const NEIGHBORHOOD_RADIUS = 80; // Radius for computing local density

function setup() {
  createCanvas(1000, 800);
  colorMode(HSB, 360, 100, 100, 1);
  createControls();
  initializeParticles();
}

function createControls() {
  let y = 95, s = 30;
  
  driftASlider = createSlider(0, 2, 1, 0.01);
  driftASlider.position(10, y);
  driftASlider.style('width', '200px');
  
  driftBSlider = createSlider(0, 2, 1, 0.01);
  driftBSlider.position(10, y + s);
  driftBSlider.style('width', '200px');
  
  couplingSlider = createSlider(0, 1, 0.3, 0.01);
  couplingSlider.position(10, y + s * 2);
  couplingSlider.style('width', '200px');
  
  noiseASlider = createSlider(0, 1, 0.2, 0.01);
  noiseASlider.position(10, y + s * 3);
  noiseASlider.style('width', '200px');
  
  noiseBSlider = createSlider(0, 1, 0.2, 0.01);
  noiseBSlider.position(10, y + s * 4);
  noiseBSlider.style('width', '200px');
  
  particleCountSlider = createSlider(50, 300, 150, 10);
  particleCountSlider.position(10, y + s * 5);
  particleCountSlider.style('width', '200px');
}

function initializeParticles() {
  particlesA = [];
  particlesB = [];
  const count = particleCountSlider ? particleCountSlider.value() : 150;
  
  // Population A starts on left side
  for (let i = 0; i < count; i++) {
    particlesA.push(new CoupledParticle(
      random(50, width / 2),
      random(50, height - 50),
      'A'
    ));
  }
  
  // Population B starts on right side
  for (let i = 0; i < count; i++) {
    particlesB.push(new CoupledParticle(
      random(width / 2, width - 50),
      random(50, height - 50),
      'B'
    ));
  }
}

function draw() {
  // Dark background
  background(220, 15, 8);
  
  const dt = 0.1;
  t += dt;
  
  // Adjust particle count if slider changed
  const targetCount = particleCountSlider.value();
  adjustParticleCount(particlesA, targetCount, 'A');
  adjustParticleCount(particlesB, targetCount, 'B');
  
  // Get slider values
  const driftA = driftASlider.value();
  const driftB = driftBSlider.value();
  const coupling = couplingSlider.value();
  const noiseA = noiseASlider.value();
  const noiseB = noiseBSlider.value();
  
  // Compute local densities for all particles
  computeDensities();
  
  // Update all particles
  for (let p of particlesA) {
    p.update(dt, driftA, noiseA, coupling, t);
    p.display();
  }
  
  for (let p of particlesB) {
    p.update(dt, driftB, noiseB, coupling, t);
    p.display();
  }
  
  // Display UI elements
  displayFormula();
  displayMetrics();
  displayInfoBox();
  displayControlLabels();
}

function adjustParticleCount(particles, targetCount, type) {
  if (particles.length < targetCount) {
    for (let i = particles.length; i < targetCount; i++) {
      const startX = type === 'A' ? random(50, width / 2) : random(width / 2, width - 50);
      particles.push(new CoupledParticle(startX, random(50, height - 50), type));
    }
  } else if (particles.length > targetCount) {
    particles.splice(targetCount);
  }
}

function computeDensities() {
  // Compute local density of opposing population for each particle
  for (let p of particlesA) {
    p.localDensitySelf = countNearby(p, particlesA);
    p.localDensityOther = countNearby(p, particlesB);
  }
  
  for (let p of particlesB) {
    p.localDensitySelf = countNearby(p, particlesB);
    p.localDensityOther = countNearby(p, particlesA);
  }
}

function countNearby(particle, population) {
  let count = 0;
  for (let other of population) {
    if (other === particle) continue;
    const dx = other.x - particle.x;
    const dy = other.y - particle.y;
    const dist = sqrt(dx * dx + dy * dy);
    if (dist < NEIGHBORHOOD_RADIUS) {
      count++;
    }
  }
  return count;
}

class CoupledParticle {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type; // 'A' or 'B'
    this.vx = 0;
    this.vy = 0;
    this.trail = [];
    this.maxTrailLength = 25;
    this.localDensitySelf = 0;
    this.localDensityOther = 0;
    
    // Color based on type
    if (type === 'A') {
      this.hue = 200; // Blue/cyan
    } else {
      this.hue = 15; // Red/orange
    }
  }
  
  update(dt, drift, noise, coupling, t) {
    // Wave parameters
    const k = 0.02;
    const omega = 0.03;
    const amplitude = 25;
    
    // Deterministic drift with sinusoidal component
    let vx_drift, vy_drift;
    
    if (this.type === 'A') {
      // Population A drifts right with sine wave
      vx_drift = drift * 1.5;
      vy_drift = amplitude * drift * sin(k * this.x - omega * t);
    } else {
      // Population B drifts left with cosine wave (phase shifted)
      vx_drift = -drift * 1.5;
      vy_drift = amplitude * drift * cos(k * this.x + omega * t);
    }
    
    // Competitive coupling: move away from regions dominated by other population
    const densityDiff = this.localDensityOther - this.localDensitySelf;
    const maxDensity = 20; // Normalize
    const normalizedDiff = densityDiff / maxDensity;
    
    // Coupling force pushes particle away from other population's concentration
    // Calculate direction to escape (toward lower density of other population)
    let escapeX = 0, escapeY = 0;
    
    if (coupling > 0 && this.localDensityOther > 0) {
      // Find center of mass of nearby opposing particles and move away
      let cmX = 0, cmY = 0, count = 0;
      const others = this.type === 'A' ? particlesB : particlesA;
      
      for (let other of others) {
        const dx = other.x - this.x;
        const dy = other.y - this.y;
        const dist = sqrt(dx * dx + dy * dy);
        if (dist < NEIGHBORHOOD_RADIUS && dist > 0) {
          cmX += dx / dist;
          cmY += dy / dist;
          count++;
        }
      }
      
      if (count > 0) {
        cmX /= count;
        cmY /= count;
        // Move away from center of mass of opposing population
        escapeX = -cmX * coupling * 50 * normalizedDiff;
        escapeY = -cmY * coupling * 50 * normalizedDiff;
      }
    }
    
    // Stochastic jitter: Brownian motion
    const vx_noise = noise * sqrt(dt) * randomGaussian() * 3;
    const vy_noise = noise * sqrt(dt) * randomGaussian() * 3;
    
    // Update position
    this.x += (vx_drift * dt) + escapeX * dt + vx_noise;
    this.y += (vy_drift * dt) + escapeY * dt + vy_noise;
    
    // Check for wrapping
    const willWrap = this.x > width - 20 || this.x < 20 || this.y > height - 20 || this.y < 20;
    
    // Boundary wrapping
    if (this.x > width - 20) this.x = 20;
    if (this.x < 20) this.x = width - 20;
    if (this.y > height - 20) this.y = 20;
    if (this.y < 20) this.y = height - 20;
    
    // Clear trail if wrapped
    if (willWrap) {
      this.trail = [];
    }
    
    // Update trail
    this.trail.push({x: this.x, y: this.y});
    if (this.trail.length > this.maxTrailLength) {
      this.trail.shift();
    }
    
    // Update velocity for visualization
    this.vx = vx_drift + escapeX;
    this.vy = vy_drift + escapeY;
  }
  
  display() {
    // Draw trail
    for (let i = 0; i < this.trail.length - 1; i++) {
      const alpha = map(i, 0, this.trail.length, 0.2, 0.7);
      stroke(this.hue, 70, 85, alpha);
      strokeWeight(1.5);
      line(this.trail[i].x, this.trail[i].y, 
           this.trail[i+1].x, this.trail[i+1].y);
    }
    
    // Draw particle
    noStroke();
    fill(this.hue, 75, 95, 0.9);
    ellipse(this.x, this.y, 6, 6);
  }
}

function displayFormula() {
  push();
  fill(0, 0, 15, 0.92);
  stroke(200, 50, 70, 0.8);
  strokeWeight(2);
  rect(10, 10, 480, 80, 5);
  
  fill(255);
  noStroke();
  textAlign(LEFT);
  textSize(13);
  textStyle(BOLD);
  text("Coupled Diffusion SDEs:", 20, 32);
  
  textSize(11);
  textStyle(NORMAL);
  fill(200, 70, 95); // Blue for A
  text("dX_A = [v_A + A·sin(kx - ωt) - γ(ρ_B - ρ_A)]dt + σ_A·dW_A", 20, 50);
  
  fill(15, 70, 95); // Red for B
  text("dX_B = [-v_B + A·cos(kx + ωt) - γ(ρ_A - ρ_B)]dt + σ_B·dW_B", 20, 68);
  
  fill(255);
  textSize(10);
  text(`γ = ${couplingSlider.value().toFixed(2)} (coupling strength)`, 20, 84);
  pop();
}

function calculateMetrics() {
  if (particlesA.length === 0 || particlesB.length === 0) {
    return {
      meanPosA: 0, meanPosB: 0,
      overlap: 0, segregation: 1,
      couplingForce: 0, fairness: 0.5
    };
  }
  
  // Mean positions
  const meanPosA = particlesA.reduce((sum, p) => sum + p.x, 0) / particlesA.length;
  const meanPosB = particlesB.reduce((sum, p) => sum + p.x, 0) / particlesB.length;
  
  // Compute overlap: count how many particles are in shared regions
  const gridSize = 50;
  const gridCols = Math.ceil(width / gridSize);
  const gridRows = Math.ceil(height / gridSize);
  const gridA = Array(gridRows).fill(0).map(() => Array(gridCols).fill(0));
  const gridB = Array(gridRows).fill(0).map(() => Array(gridCols).fill(0));
  
  for (let p of particlesA) {
    const gx = constrain(floor(p.x / gridSize), 0, gridCols - 1);
    const gy = constrain(floor(p.y / gridSize), 0, gridRows - 1);
    gridA[gy][gx]++;
  }
  
  for (let p of particlesB) {
    const gx = constrain(floor(p.x / gridSize), 0, gridCols - 1);
    const gy = constrain(floor(p.y / gridSize), 0, gridRows - 1);
    gridB[gy][gx]++;
  }
  
  // Overlap: sum of min(A, B) in each cell / total particles
  let overlapCount = 0;
  let totalCells = 0;
  for (let y = 0; y < gridRows; y++) {
    for (let x = 0; x < gridCols; x++) {
      if (gridA[y][x] > 0 || gridB[y][x] > 0) {
        overlapCount += min(gridA[y][x], gridB[y][x]);
        totalCells++;
      }
    }
  }
  const overlap = overlapCount / (particlesA.length + particlesB.length) * 2;
  const segregation = 1 - overlap;
  
  // Average coupling force
  let totalCoupling = 0;
  for (let p of particlesA) {
    totalCoupling += abs(p.localDensityOther - p.localDensitySelf);
  }
  for (let p of particlesB) {
    totalCoupling += abs(p.localDensityOther - p.localDensitySelf);
  }
  const couplingForce = totalCoupling / (particlesA.length + particlesB.length);
  
  // Fairness: based on how evenly distributed each population is
  const expectedPerCell = (particlesA.length + particlesB.length) / (gridCols * gridRows);
  let sumSqDiff = 0;
  for (let y = 0; y < gridRows; y++) {
    for (let x = 0; x < gridCols; x++) {
      const total = gridA[y][x] + gridB[y][x];
      sumSqDiff += (total - expectedPerCell) * (total - expectedPerCell);
    }
  }
  const variance = sumSqDiff / (gridCols * gridRows);
  const maxVariance = expectedPerCell * expectedPerCell * 3;
  const fairness = 1 - constrain(variance / maxVariance, 0, 1);
  
  return {
    meanPosA, meanPosB,
    overlap, segregation,
    couplingForce, fairness
  };
}

function displayMetrics() {
  const metrics = calculateMetrics();
  
  push();
  fill(0, 0, 100, 0.85);
  stroke(0, 0, 60, 0.5);
  rect(width - 260, 10, 250, 200);
  
  fill(0, 0, 0);
  textSize(13);
  textStyle(BOLD);
  text('Coupled Diffusion Metrics', width - 250, 28);
  textStyle(NORMAL);
  
  textSize(11);
  fill(0, 0, 20);
  text(`Mean X (Pop A): ${metrics.meanPosA.toFixed(1)}`, width - 250, 50);
  text(`Mean X (Pop B): ${metrics.meanPosB.toFixed(1)}`, width - 250, 66);
  text(`Population Overlap: ${(metrics.overlap * 100).toFixed(1)}%`, width - 250, 82);
  text(`Segregation Index: ${metrics.segregation.toFixed(3)}`, width - 250, 98);
  text(`Avg Coupling Force: ${metrics.couplingForce.toFixed(2)}`, width - 250, 114);
  text(`Fairness: ${metrics.fairness.toFixed(3)}`, width - 250, 130);
  text(`Particles: ${particlesA.length} + ${particlesB.length}`, width - 250, 146);
  
  // Overlap bar (shows mixing)
  const barWidth = 200, barHeight = 8, barX = width - 250, barY = 160;
  fill(0, 0, 30);
  noStroke();
  rect(barX, barY, barWidth, barHeight);
  
  // Gradient bar showing A vs B distribution
  fill(200, 70, 80); // Blue for A
  rect(barX, barY, barWidth * (1 - metrics.segregation) * 0.5, barHeight);
  fill(15, 70, 80); // Red for B
  rect(barX + barWidth * 0.5, barY, barWidth * (1 - metrics.segregation) * 0.5, barHeight);
  
  // State indicator
  const state = metrics.segregation > 0.7 ? "Segregated" : 
                metrics.segregation > 0.4 ? "Competing" : "Mixed";
  fill(metrics.segregation > 0.6 ? 0 : metrics.segregation > 0.3 ? 60 : 120, 80, 80);
  textSize(12);
  textStyle(BOLD);
  text(`State: ${state}`, width - 250, 185);
  textStyle(NORMAL);
  
  pop();
}

function displayInfoBox() {
  const infoX = width - 40;
  const metricsPanelHeight = 200;
  const infoY = 10 + metricsPanelHeight - 25;
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
    const boxWidth = 400, boxHeight = 550, boxX = width - boxWidth - 50;
    const boxY = infoY + infoSize + 10;
    fill(0);
    stroke(200, 50, 80, 0.8);
    strokeWeight(2);
    rect(boxX, boxY, boxWidth, boxHeight, 8);
    
    noStroke();
    fill(255);
    textSize(16);
    textStyle(BOLD);
    textAlign(LEFT);
    text("Coupled Diffusion Model", boxX + 15, boxY + 30);
    
    textStyle(NORMAL);
    textSize(11);
    fill(255);
    let textY = boxY + 55;
    const lineHeight = 15, margin = 15, textWidth = boxWidth - margin * 2;
    
    const desc = [
      "DESCRIPTION:",
      "Two particle populations (blue and red) flow through the space with competitive coupling. Each population follows its own sinusoidal drift pattern, but they push each other away when they get too close.",
      "",
      "MATHEMATICAL MODEL:",
      "Population A (Blue): dX_A = [v_A + A·sin(kx-ωt) - γ(ρ_B-ρ_A)]dt + σ_A·dW_A",
      "",
      "Population B (Red): dX_B = [-v_B + A·cos(kx+ωt) - γ(ρ_A-ρ_B)]dt + σ_B·dW_B",
      "",
      "The coupling term γ(ρ_other - ρ_self) creates competition: particles move away from regions dominated by the opposing population.",
      "",
      "RELATION TO FAIRNESS:",
      "This model demonstrates competitive resource allocation. When coupling is low, populations mix freely (high overlap). As coupling increases, populations segregate into distinct regions—mimicking how competing groups may claim exclusive territories.",
      "",
      "INTERPRETING METRICS:",
      "• Mean X: Average horizontal position of each population. Shows overall drift direction.",
      "",
      "• Overlap: Percentage of shared space. High overlap means populations coexist; low means segregation.",
      "",
      "• Segregation Index: 1 - Overlap. Higher values indicate stronger territorial separation.",
      "",
      "• Coupling Force: Average competitive pressure between populations.",
      "",
      "• Fairness: Based on uniform spatial distribution. High fairness means both populations spread evenly.",
      "",
      "OBSERVATIONS:",
      "Watch how increasing coupling strength causes populations to separate. Drift controls flow direction. Noise adds randomness that can break segregation patterns."
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
  let y = 95, spacing = 30;
  
  const labels = [
    { text: `Drift A (v_A): ${driftASlider.value().toFixed(2)}`, x: 220, y: y + 5, desc: "Base drift strength for Population A (blue). Higher values increase rightward flow and wave amplitude." },
    { text: `Drift B (v_B): ${driftBSlider.value().toFixed(2)}`, x: 220, y: y + spacing + 5, desc: "Base drift strength for Population B (red). Higher values increase leftward flow and wave amplitude." },
    { text: `Coupling (γ): ${couplingSlider.value().toFixed(2)}`, x: 220, y: y + spacing * 2 + 5, desc: "Competitive coupling strength. Higher values cause populations to push each other apart more strongly." },
    { text: `Noise A (σ_A): ${noiseASlider.value().toFixed(2)}`, x: 220, y: y + spacing * 3 + 5, desc: "Brownian motion strength for Population A. Adds random jitter to blue particle paths." },
    { text: `Noise B (σ_B): ${noiseBSlider.value().toFixed(2)}`, x: 220, y: y + spacing * 4 + 5, desc: "Brownian motion strength for Population B. Adds random jitter to red particle paths." },
    { text: `Particles: ${particleCountSlider.value()}`, x: 220, y: y + spacing * 5 + 5, desc: "Number of particles per population. More particles show clearer patterns but may reduce performance." }
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

