// Stochastic Ito SDE Model - Using global p5.js mode

let particles = [];
let driftStrengthSlider, noiseStrengthSlider, waveFreqSlider, 
    waveSpeedSlider, particleCountSlider, balanceSlider;
let t = 0; // Time for wave animation

function setup() {
  createCanvas(1000, 800);
  colorMode(HSB, 360, 100, 100, 1);
  createControls();
  initializeParticles();
}

function createControls() {
  let y = 95, s = 30;
  driftStrengthSlider = createSlider(0, 2, 1, 0.01);
  driftStrengthSlider.position(10, y);
  driftStrengthSlider.style('width', '200px');
  
  noiseStrengthSlider = createSlider(0, 1, 0.3, 0.01);
  noiseStrengthSlider.position(10, y + s);
  noiseStrengthSlider.style('width', '200px');
  
  waveFreqSlider = createSlider(0.01, 0.1, 0.03, 0.001);
  waveFreqSlider.position(10, y + s * 2);
  waveFreqSlider.style('width', '200px');
  
  waveSpeedSlider = createSlider(0.01, 0.2, 0.05, 0.001);
  waveSpeedSlider.position(10, y + s * 3);
  waveSpeedSlider.style('width', '200px');
  
  particleCountSlider = createSlider(50, 500, 200, 10);
  particleCountSlider.position(10, y + s * 4);
  particleCountSlider.style('width', '200px');
  
  balanceSlider = createSlider(0, 1, 0.5, 0.01);
  balanceSlider.position(10, y + s * 5);
  balanceSlider.style('width', '200px');
}

function initializeParticles() {
  particles = [];
  const count = particleCountSlider ? particleCountSlider.value() : 200;
  for (let i = 0; i < count; i++) {
    particles.push(new StochasticParticle(
      random(0, width),
      random(0, height)
    ));
  }
}

function draw() {
  // Water-like background
  background(200, 20, 10);
  
  const dt = 0.1; // Time step
  
  // Update time for wave animation
  t += dt;
  
  // Adjust particle count if slider changed
  const targetCount = particleCountSlider.value();
  if (particles.length !== targetCount) {
    if (particles.length < targetCount) {
      // Add particles
      for (let i = particles.length; i < targetCount; i++) {
        particles.push(new StochasticParticle(
          random(0, width),
          random(0, height)
        ));
      }
    } else {
      // Remove particles
      particles = particles.slice(0, targetCount);
    }
  }
  
  // Get slider values
  const driftStrength = driftStrengthSlider.value();
  const noiseStrength = noiseStrengthSlider.value();
  const balance = balanceSlider.value();
  const waveFreq = waveFreqSlider.value();
  const waveSpeed = waveSpeedSlider.value();
  
  // Calculate effective parameters based on balance
  const effectiveDrift = driftStrength * (1 - balance);
  const effectiveNoise = noiseStrength * balance;
  
  // Update particles
  for (let particle of particles) {
    particle.update(dt, {
      v0: effectiveDrift * 2,
      A: effectiveDrift * 30,
      k: waveFreq,
      omega: waveSpeed,
      phi: 0
    }, effectiveNoise, t);
    particle.display();
  }
  
  // Display formula
  displayFormula();
  
  // Display metrics
  displayMetrics();
  
  // Display info box
  displayInfoBox();
  
  // Display control labels
  displayControlLabels();
}

class StochasticParticle {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.trail = [];
    this.maxTrailLength = 30;
    this.hue = map(y, 0, height, 180, 240); // Blue-cyan range
  }
  
  update(dt, driftParams, sigma, t) {
    // Store previous position before update
    const prevX = this.x;
    const prevY = this.y;
    
    // Deterministic drift: sinusoidal field
    const vx_drift = driftParams.v0;
    const vy_drift = driftParams.A * sin(
      driftParams.k * this.x - driftParams.omega * t + driftParams.phi
    );
    
    // Stochastic jitter: Brownian motion
    const vx_noise = sigma * sqrt(dt) * randomGaussian();
    const vy_noise = sigma * sqrt(dt) * randomGaussian();
    
    // Update position
    this.x += (vx_drift * dt) + vx_noise;
    this.y += (vy_drift * dt) + vy_noise;
    
    // Check for wrapping before applying it
    const wrappedX = this.x > width || this.x < 0;
    const wrappedY = this.y > height || this.y < 0;
    
    // Boundary wrapping
    if (this.x > width) this.x = 0;
    if (this.x < 0) this.x = width;
    if (this.y > height) this.y = 0;
    if (this.y < 0) this.y = height;
    
    // If wrapping occurred, clear trail to prevent streaks
    if (wrappedX || wrappedY) {
      this.trail = [];
    }
    
    // Update trail
    this.trail.push({x: this.x, y: this.y});
    if (this.trail.length > this.maxTrailLength) {
      this.trail.shift();
    }
    
    // Update velocity for visualization
    this.vx = vx_drift + vx_noise / dt;
    this.vy = vy_drift + vy_noise / dt;
  }
  
  display() {
    // Draw trail (wave-like)
    for (let i = 0; i < this.trail.length - 1; i++) {
      const alpha = map(i, 0, this.trail.length, 0.3, 1);
      const trailHue = this.hue;
      stroke(trailHue, 70, 90, alpha);
      strokeWeight(2);
      line(this.trail[i].x, this.trail[i].y, 
           this.trail[i+1].x, this.trail[i+1].y);
    }
    
    // Draw particle
    fill(this.hue, 80, 100);
    noStroke();
    ellipse(this.x, this.y, 6, 6);
  }
}

function displayFormula() {
  // Always visible formula display
  push();
  fill(0, 0, 20, 0.9);
  stroke(200, 50, 80, 0.8);
  strokeWeight(2);
  rect(10, 10, 450, 80, 5);
  
  fill(255);
  textAlign(LEFT);
  textSize(14);
  textStyle(BOLD);
  text("Ito SDE: dX_t = μ(X_t, t)dt + σ(X_t, t)dW_t", 20, 35);
  
  textSize(11);
  textStyle(NORMAL);
  const driftVal = driftStrengthSlider.value().toFixed(2);
  const noiseVal = noiseStrengthSlider.value().toFixed(2);
  text(`μ = ${driftVal}  |  σ = ${noiseVal}`, 20, 55);
  text("μ: Sinusoidal drift (wave field)  |  σ: Brownian motion (jitter)", 20, 70);
  pop();
}

function calculateMetrics() {
  if (particles.length === 0) {
    return {
      meanVelocity: 0,
      velocityVariance: 0,
      fieldCoherence: 0,
      noiseToDriftRatio: 0,
      fairness: 0.5
    };
  }
  
  let sumVel = 0;
  let sumVelSq = 0;
  let sumCoherence = 0;
  
  const driftStrength = driftStrengthSlider.value();
  const noiseStrength = noiseStrengthSlider.value();
  const balance = balanceSlider.value();
  const effectiveDrift = driftStrength * (1 - balance);
  const effectiveNoise = noiseStrength * balance;
  
  for (let particle of particles) {
    const speed = sqrt(particle.vx * particle.vx + particle.vy * particle.vy);
    sumVel += speed;
    sumVelSq += speed * speed;
    
    // Coherence: how well particle follows expected wave pattern
    const expectedVy = effectiveDrift * 30 * sin(
      waveFreqSlider.value() * particle.x - waveSpeedSlider.value() * t
    );
    const coherence = 1 - abs(particle.vy - expectedVy) / (abs(expectedVy) + 1);
    sumCoherence += max(0, coherence);
  }
  
  const meanVelocity = sumVel / particles.length;
  const meanVelSq = sumVelSq / particles.length;
  const velocityVariance = meanVelSq - meanVelocity * meanVelocity;
  const fieldCoherence = sumCoherence / particles.length;
  
  const noiseToDriftRatio = effectiveNoise > 0 ? effectiveNoise / (effectiveDrift + 0.001) : 0;
  
  // Fairness: based on how uniformly particles are distributed
  // Divide canvas into grid cells and measure distribution uniformity
  const gridSize = 10;
  const gridCols = floor(width / gridSize);
  const gridRows = floor(height / gridSize);
  const grid = Array(gridRows).fill(0).map(() => Array(gridCols).fill(0));
  
  for (let particle of particles) {
    const gx = constrain(floor(particle.x / gridSize), 0, gridCols - 1);
    const gy = constrain(floor(particle.y / gridSize), 0, gridRows - 1);
    grid[gy][gx]++;
  }
  
  const expectedPerCell = particles.length / (gridCols * gridRows);
  let sumSqDiff = 0;
  for (let row of grid) {
    for (let count of row) {
      sumSqDiff += (count - expectedPerCell) * (count - expectedPerCell);
    }
  }
  const variance = sumSqDiff / (gridCols * gridRows);
  const maxVariance = expectedPerCell * expectedPerCell * 2; // Rough estimate
  const fairness = 1 - constrain(variance / maxVariance, 0, 1);
  
  return {
    meanVelocity,
    velocityVariance,
    fieldCoherence,
    noiseToDriftRatio,
    fairness
  };
}

function displayMetrics() {
  const metrics = calculateMetrics();
  
  push();
  fill(0, 0, 100, 0.85);
  stroke(0, 0, 60, 0.5);
  rect(width - 260, 10, 250, 180);
  
  fill(0, 0, 0);
  textSize(13);
  textStyle(BOLD);
  text('SDE Metrics', width - 250, 28);
  textStyle(NORMAL);
  
  textSize(11);
  fill(0, 0, 20);
  text(`Mean Velocity: ${metrics.meanVelocity.toFixed(2)}`, width - 250, 50);
  text(`Velocity Variance: ${metrics.velocityVariance.toFixed(3)}`, width - 250, 66);
  text(`Field Coherence: ${metrics.fieldCoherence.toFixed(3)}`, width - 250, 82);
  text(`Noise/Drift: ${metrics.noiseToDriftRatio.toFixed(3)}`, width - 250, 98);
  text(`Fairness: ${metrics.fairness.toFixed(3)}`, width - 250, 114);
  text(`Particles: ${particles.length}`, width - 250, 130);
  
  // Fairness bar
  const barWidth = 200, barHeight = 8, barX = width - 250, barY = 145;
  fill(0, 0, 30);
  noStroke();
  rect(barX, barY, barWidth, barHeight);
  
  const fcColor = metrics.fairness > 0.6 ? color(120, 80, 80) : 
                  metrics.fairness > 0.4 ? color(60, 80, 80) : 
                  color(0, 80, 80);
  fill(fcColor);
  rect(barX, barY, barWidth * metrics.fairness, barHeight);
  
  // State indicator
  const state = metrics.fieldCoherence > 0.7 ? "Coherent" : 
                metrics.fieldCoherence > 0.4 ? "Mixed" : "Turbulent";
  fill(metrics.fieldCoherence > 0.6 ? 120 : metrics.fieldCoherence > 0.3 ? 60 : 0, 80, 80);
  textSize(12);
  textStyle(BOLD);
  text(`State: ${state}`, width - 250, 165);
  textStyle(NORMAL);
  
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
    const boxWidth = 400, boxHeight = 550, boxX = width - boxWidth - 50;
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
    text("Stochastic Ito SDE Model", boxX + 15, boxY + 30);
    
    textStyle(NORMAL);
    textSize(11);
    fill(255);
    let textY = boxY + 55;
    const lineHeight = 15, margin = 15, textWidth = boxWidth - margin * 2;
    
    const desc = [
      "DESCRIPTION:",
      "Particles flow through a sinusoidal field (mimicking water waves/ripples) with Brownian motion jitter. The deterministic component creates wave-like drift, while the stochastic component adds random jitter.",
      "",
      "MATHEMATICAL MODEL:",
      "Ito SDE: dX_t = μ(X_t, t)dt + σ(X_t, t)dW_t",
      "",
      "• μ(X_t, t): Deterministic drift (sinusoidal field)",
      "  - Horizontal: constant velocity left-to-right",
      "  - Vertical: A × sin(k × x - ω × t + φ)",
      "",
      "• σ(X_t, t): Diffusion coefficient (controls randomness)",
      "",
      "• dW_t: Wiener process (standard Brownian motion)",
      "",
      "RELATION TO FAIRNESS:",
      "Stochastic processes model uncertainty and randomness in resource distribution. The balance between deterministic drift (predictable patterns) and stochastic noise (randomness) determines how uniformly resources are distributed. High coherence means particles follow predictable patterns (fair distribution), while high noise creates more random, potentially unfair distributions.",
      "",
      "INTERPRETING METRICS:",
      "• Mean Velocity: Average particle speed. Higher values indicate stronger drift.",
      "",
      "• Velocity Variance: Measure of randomness. Higher variance means more stochastic behavior.",
      "",
      "• Field Coherence: How well particles follow the wave pattern. High coherence (near 1) means particles follow predictable waves; low coherence means more random motion.",
      "",
      "• Noise-to-Drift Ratio: σ/μ ratio. Values > 1 mean noise dominates; < 1 means drift dominates.",
      "",
      "• Fairness: Based on uniform distribution across the field. Higher values mean more even particle distribution.",
      "",
      "OBSERVATIONS:",
      "Watch particles flow left-to-right like water. With low noise, particles follow smooth wave patterns. As noise increases, paths become more erratic. The balance slider smoothly transitions between pure deterministic drift and pure stochastic motion."
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
    { text: `Drift Strength (μ): ${driftStrengthSlider.value().toFixed(2)}`, x: 220, y: y + 5, desc: "Controls amplitude of sinusoidal drift. Higher values create stronger wave patterns. Range: 0-2." },
    { text: `Noise Strength (σ): ${noiseStrengthSlider.value().toFixed(2)}`, x: 220, y: y + spacing + 5, desc: "Controls Brownian motion magnitude. Higher values add more random jitter to particle paths. Range: 0-1." },
    { text: `Wave Frequency (k): ${waveFreqSlider.value().toFixed(3)}`, x: 220, y: y + spacing * 2 + 5, desc: "Spatial frequency of waves. Higher values create more waves across the canvas. Range: 0.01-0.1." },
    { text: `Wave Speed (ω): ${waveSpeedSlider.value().toFixed(3)}`, x: 220, y: y + spacing * 3 + 5, desc: "Temporal frequency (wave animation speed). Higher values make waves move faster. Range: 0.01-0.2." },
    { text: `Particle Count: ${particleCountSlider.value()}`, x: 220, y: y + spacing * 4 + 5, desc: "Number of particles in the simulation. More particles show clearer patterns but may reduce performance. Range: 50-500." },
    { text: `Balance: ${balanceSlider.value().toFixed(2)}`, x: 220, y: y + spacing * 5 + 5, desc: "Overall balance between drift and noise. 0 = pure deterministic (no noise), 1 = maximum noise relative to drift. Range: 0-1." }
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

