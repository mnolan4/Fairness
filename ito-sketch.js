// Dual Itô Fairness Model - Forward and Reverse SDE Visualization
// Using global p5.js mode

let forwardParticles = [];
let reverseParticles = [];
let t = 0; // Simulation time
let isPlaying = true;
let iterationCount = 0;

// Info box state
let infoBoxOpen = false;
let infoBoxScrollOffset = 0;
const INFO_BOX_SCROLL_SPEED = 20;
let cachedWrappedText = null; // Cache wrapped text to avoid recalculating every frame

// UI Controls
let driftStrengthSlider, diffusionCoeffSlider, fairnessCouplingSlider;
let timeStepSlider, iterationSpeedSlider, particleCountSlider;
let resetButton, playPauseButton, stepButton, clearButton;

// Metrics history
let fefHistory = [];
let bcdHistory = [];
let crHistory = [];
let tsHistory = [];
let maxHistoryLength = 200;
let efficiencyIndex = 0;
let stableIteration = -1;

// Kernel bandwidth for gradient estimation
const KERNEL_BANDWIDTH = 50;

function setup() {
  createCanvas(1000, 800);
  colorMode(HSB, 360, 100, 100, 1);
  createControls();
  initializeParticles();
}

function createControls() {
  let y = 95, s = 30;
  
  driftStrengthSlider = createSlider(-2.0, 2.0, 0.5, 0.01);
  driftStrengthSlider.position(10, y);
  driftStrengthSlider.style('width', '200px');
  
  diffusionCoeffSlider = createSlider(0.0, 1.0, 0.3, 0.01);
  diffusionCoeffSlider.position(10, y + s);
  diffusionCoeffSlider.style('width', '200px');
  
  fairnessCouplingSlider = createSlider(0.0, 2.0, 1.0, 0.01);
  fairnessCouplingSlider.position(10, y + s * 2);
  fairnessCouplingSlider.style('width', '200px');
  
  timeStepSlider = createSlider(0.001, 0.05, 0.01, 0.001);
  timeStepSlider.position(10, y + s * 3);
  timeStepSlider.style('width', '200px');
  
  iterationSpeedSlider = createSlider(1, 10, 1, 1);
  iterationSpeedSlider.position(10, y + s * 4);
  iterationSpeedSlider.style('width', '200px');
  
  particleCountSlider = createSlider(50, 500, 200, 10);
  particleCountSlider.position(10, y + s * 5);
  particleCountSlider.style('width', '200px');
  
  // Buttons
  resetButton = createButton('Reset');
  resetButton.position(10, y + s * 6);
  resetButton.mousePressed(resetSimulation);
  
  playPauseButton = createButton('Pause');
  playPauseButton.position(80, y + s * 6);
  playPauseButton.mousePressed(togglePlayPause);
  
  stepButton = createButton('Step');
  stepButton.position(150, y + s * 6);
  stepButton.mousePressed(stepForward);
  
  clearButton = createButton('Clear');
  clearButton.position(200, y + s * 6);
  clearButton.mousePressed(clearParticles);
}

function initializeParticles() {
  forwardParticles = [];
  reverseParticles = [];
  const count = particleCountSlider ? particleCountSlider.value() : 200;
  
  for (let i = 0; i < count; i++) {
    let x = random(50, width - 50);
    let y = random(50, height - 50);
    forwardParticles.push(new ForwardSDEParticle(x, y));
    
    x = random(50, width - 50);
    y = random(50, height - 50);
    reverseParticles.push(new ReverseSDEParticle(x, y));
  }
  
  t = 0;
  iterationCount = 0;
  stableIteration = -1;
  efficiencyIndex = 0;
  fefHistory = [];
  bcdHistory = [];
  crHistory = [];
  tsHistory = [];
}

function resetSimulation() {
  initializeParticles();
  cachedWrappedText = null; // Reset cache on reset
}

function togglePlayPause() {
  isPlaying = !isPlaying;
  playPauseButton.html(isPlaying ? 'Pause' : 'Play');
}

function stepForward() {
  if (!isPlaying) {
    updateSimulation();
  }
}

function clearParticles() {
  forwardParticles = [];
  reverseParticles = [];
  fefHistory = [];
  bcdHistory = [];
  crHistory = [];
  tsHistory = [];
}

function draw() {
  // Dark background
  background(220, 15, 8);
  
  // Adjust particle count if slider changed
  const targetCount = particleCountSlider.value();
  adjustParticleCount(forwardParticles, targetCount, 'forward');
  adjustParticleCount(reverseParticles, targetCount, 'reverse');
  
  // Update simulation
  if (isPlaying) {
    const speed = iterationSpeedSlider.value();
    for (let i = 0; i < speed; i++) {
      updateSimulation();
    }
  }
  
  // Draw equilibrium zones (where particles cluster together)
  drawEquilibriumZones();
  
  // Draw particles
  for (let p of forwardParticles) {
    p.display();
  }
  
  for (let p of reverseParticles) {
    p.display();
  }
  
  // Display UI
  displayFormula();
  displayMetrics();
  displayInfoBox();
  displayControlLabels();
}

function adjustParticleCount(particles, targetCount, type) {
  if (particles.length < targetCount) {
    for (let i = particles.length; i < targetCount; i++) {
      let x = random(50, width - 50);
      let y = random(50, height - 50);
      if (type === 'forward') {
        particles.push(new ForwardSDEParticle(x, y));
      } else {
        particles.push(new ReverseSDEParticle(x, y));
      }
    }
  } else if (particles.length > targetCount) {
    particles.splice(targetCount);
  }
}

function updateSimulation() {
  const dt = timeStepSlider.value();
  const driftStrength = driftStrengthSlider.value();
  const diffusionCoeff = diffusionCoeffSlider.value();
  const fairnessCoupling = fairnessCouplingSlider.value();
  
  t += dt;
  iterationCount++;
  
  // Update forward particles
  for (let p of forwardParticles) {
    p.update(dt, driftStrength, diffusionCoeff, t);
  }
  
  // Compute gradients for reverse particles (using all particles for density estimate)
  const allParticles = [...forwardParticles, ...reverseParticles];
  
  // Update reverse particles
  for (let p of reverseParticles) {
    const gradient = computeGradientLogDensity(p, allParticles, KERNEL_BANDWIDTH);
    p.update(dt, driftStrength, diffusionCoeff, fairnessCoupling, gradient, t);
  }
  
  // Calculate and store metrics
  const metrics = calculateMetrics();
  fefHistory.push(metrics.fef);
  bcdHistory.push(metrics.bcd);
  crHistory.push(metrics.cr);
  tsHistory.push(metrics.ts);
  
  if (fefHistory.length > maxHistoryLength) {
    fefHistory.shift();
    bcdHistory.shift();
    crHistory.shift();
    tsHistory.shift();
  }
  
  // Update efficiency index
  if (stableIteration === -1 && metrics.cr > 0.9 && metrics.ts < 0.01) {
    stableIteration = iterationCount;
    efficiencyIndex = iterationCount;
  }
}

// Kernel-based gradient estimation for ∇_x log p_t(x)
function computeGradientLogDensity(particle, allParticles, bandwidth) {
  let numeratorX = 0, numeratorY = 0;
  let denominator = 0;
  
  for (let other of allParticles) {
    if (other === particle) continue;
    
    const dx = particle.x - other.x;
    const dy = particle.y - other.y;
    const distSq = dx * dx + dy * dy;
    
    // Gaussian kernel
    const kernel = exp(-distSq / (2 * bandwidth * bandwidth));
    
    numeratorX += dx * kernel;
    numeratorY += dy * kernel;
    denominator += kernel;
  }
  
  if (denominator < 1e-10) {
    return {x: 0, y: 0};
  }
  
  // Gradient: ∇_x log p(x) ≈ Σ_i (x - x_i) * K(x, x_i) / (σ^2 * Σ_j K(x, x_j))
  const scale = 1.0 / (bandwidth * bandwidth * denominator);
  return {
    x: numeratorX * scale,
    y: numeratorY * scale
  };
}

// Forward SDE Particle Class
class ForwardSDEParticle {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.trail = [];
    this.maxTrailLength = 40;
    this.hue = random(0, 30); // Red-orange range
  }

  update(dt, driftStrength, diffusionCoeff, t) {
    // Drift function f(x, t) - sinusoidal field
    const k = 0.02;
    const omega = 0.03;
    const amplitude = 30;

    const vx_drift = driftStrength * 1.5;
    const vy_drift = amplitude * driftStrength * sin(k * this.x - omega * t);

    // Stochastic term: g(t) * dW_t
    const vx_noise = diffusionCoeff * sqrt(dt) * randomGaussian() * 3;
    const vy_noise = diffusionCoeff * sqrt(dt) * randomGaussian() * 3;

    // Forward SDE: dx_t = f(x_t, t)dt + g(t)dW_t
    this.x += (vx_drift * dt) + vx_noise;
    this.y += (vy_drift * dt) + vy_noise;

    // Boundary wrapping
    if (this.x > width - 20) this.x = 20;
    if (this.x < 20) this.x = width - 20;
    if (this.y > height - 20) this.y = 20;
    if (this.y < 20) this.y = height - 20;

    // Update trail
    this.trail.push({x: this.x, y: this.y});
    if (this.trail.length > this.maxTrailLength) {
      this.trail.shift();
    }

    this.vx = vx_drift;
    this.vy = vy_drift;
  }

  display() {
    // Draw trail with motion blur
    for (let i = 0; i < this.trail.length - 1; i++) {
      const alpha = map(i, 0, this.trail.length, 0.2, 0.8);
      stroke(this.hue, 80, 90, alpha);
      strokeWeight(2);

      // Check for wrap-around (if distance is too large, particle wrapped)
      const dx = abs(this.trail[i+1].x - this.trail[i].x);
      const dy = abs(this.trail[i+1].y - this.trail[i].y);
      const maxDist = 100; // If movement is larger than this, it's a wrap

      if (dx < maxDist && dy < maxDist) {
        line(this.trail[i].x, this.trail[i].y,
             this.trail[i+1].x, this.trail[i+1].y);
      }
    }

    // Draw particle
    noStroke();
    fill(this.hue, 85, 95, 0.9);
    ellipse(this.x, this.y, 6, 6);
  }
}

// Reverse SDE Particle Class
class ReverseSDEParticle {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.trail = [];
    this.maxTrailLength = 40;
    this.hue = random(180, 220); // Blue-teal range
  }

  update(dt, driftStrength, diffusionCoeff, fairnessCoupling, gradient, t) {
    // Same drift function as forward
    const k = 0.02;
    const omega = 0.03;
    const amplitude = 30;

    const vx_drift = driftStrength * 1.5;
    const vy_drift = amplitude * driftStrength * sin(k * this.x - omega * t);

    // Correction term: -g(t)^2 * λ * ∇_x log p_t(x)
    const correctionX = -diffusionCoeff * diffusionCoeff * fairnessCoupling * gradient.x;
    const correctionY = -diffusionCoeff * diffusionCoeff * fairnessCoupling * gradient.y;

    // Stochastic term: g(t) * dW̄_t (same as forward)
    const vx_noise = diffusionCoeff * sqrt(dt) * randomGaussian() * 3;
    const vy_noise = diffusionCoeff * sqrt(dt) * randomGaussian() * 3;

    // Reverse SDE: dx_t = [f(x_t, t) - g(t)^2 * λ * ∇_x log p_t(x)]dt + g(t)dW̄_t
    this.x += (vx_drift * dt) + (correctionX * dt) + vx_noise;
    this.y += (vy_drift * dt) + (correctionY * dt) + vy_noise;

    // Boundary wrapping
    if (this.x > width - 20) this.x = 20;
    if (this.x < 20) this.x = width - 20;
    if (this.y > height - 20) this.y = 20;
    if (this.y < 20) this.y = height - 20;

    // Update trail
    this.trail.push({x: this.x, y: this.y});
    if (this.trail.length > this.maxTrailLength) {
      this.trail.shift();
    }

    this.vx = vx_drift + correctionX;
    this.vy = vy_drift + correctionY;
  }

  display() {
    // Draw trail with motion blur
    for (let i = 0; i < this.trail.length - 1; i++) {
      const alpha = map(i, 0, this.trail.length, 0.2, 0.8);
      stroke(this.hue, 80, 90, alpha);
      strokeWeight(2);

      // Check for wrap-around (if distance is too large, particle wrapped)
      const dx = abs(this.trail[i+1].x - this.trail[i].x);
      const dy = abs(this.trail[i+1].y - this.trail[i].y);
      const maxDist = 100; // If movement is larger than this, it's a wrap

      if (dx < maxDist && dy < maxDist) {
        line(this.trail[i].x, this.trail[i].y,
             this.trail[i+1].x, this.trail[i+1].y);
      }
    }

    // Draw particle
    noStroke();
    fill(this.hue, 85, 95, 0.9);
    ellipse(this.x, this.y, 6, 6);
  }
}

function drawEquilibriumZones() {
  // Find regions where forward and reverse particles cluster together
  const gridSize = 40;
  const gridCols = floor(width / gridSize);
  const gridRows = floor(height / gridSize);
  const forwardGrid = Array(gridRows).fill(0).map(() => Array(gridCols).fill(0));
  const reverseGrid = Array(gridRows).fill(0).map(() => Array(gridCols).fill(0));
  
  // Count particles in each grid cell
  for (let p of forwardParticles) {
    const gx = constrain(floor(p.x / gridSize), 0, gridCols - 1);
    const gy = constrain(floor(p.y / gridSize), 0, gridRows - 1);
    forwardGrid[gy][gx]++;
  }
  
  for (let p of reverseParticles) {
    const gx = constrain(floor(p.x / gridSize), 0, gridCols - 1);
    const gy = constrain(floor(p.y / gridSize), 0, gridRows - 1);
    reverseGrid[gy][gx]++;
  }
  
  // Draw equilibrium zones (where both have particles)
  push();
  noStroke();
  for (let y = 0; y < gridRows; y++) {
    for (let x = 0; x < gridCols; x++) {
      const forwardCount = forwardGrid[y][x];
      const reverseCount = reverseGrid[y][x];
      const overlap = min(forwardCount, reverseCount);
      
      if (overlap > 0) {
        // Equilibrium zone - white/gray overlay
        const alpha = map(overlap, 0, 5, 0.1, 0.3);
        fill(0, 0, 100, alpha);
        rect(x * gridSize, y * gridSize, gridSize, gridSize);
      }
    }
  }
  pop();
}

function calculateMetrics() {
  if (forwardParticles.length === 0 || reverseParticles.length === 0) {
    return {
      fef: 0,
      bcd: 0,
      cr: 0,
      ts: 0,
      ei: 0
    };
  }
  
  // FEF: Fairness Energy - variance of gradient norms
  const allParticles = [...forwardParticles, ...reverseParticles];
  const gradientNorms = [];
  
  for (let p of allParticles) {
    const gradient = computeGradientLogDensity(p, allParticles, KERNEL_BANDWIDTH);
    const norm = sqrt(gradient.x * gradient.x + gradient.y * gradient.y);
    gradientNorms.push(norm);
  }
  
  const meanNorm = gradientNorms.reduce((a, b) => a + b, 0) / gradientNorms.length;
  const variance = gradientNorms.reduce((sum, n) => sum + (n - meanNorm) * (n - meanNorm), 0) / gradientNorms.length;
  const fef = variance;
  
  // BCD: Bias-Correction Delta - difference in drift magnitudes
  let forwardDriftSum = 0;
  let reverseDriftSum = 0;
  
  for (let p of forwardParticles) {
    forwardDriftSum += sqrt(p.vx * p.vx + p.vy * p.vy);
  }
  
  for (let p of reverseParticles) {
    reverseDriftSum += sqrt(p.vx * p.vx + p.vy * p.vy);
  }
  
  const meanForwardDrift = forwardDriftSum / forwardParticles.length;
  const meanReverseDrift = reverseDriftSum / reverseParticles.length;
  const bcd = abs(meanForwardDrift - meanReverseDrift);
  
  // CR: Convergence Ratio - trajectory alignment (cosine similarity)
  let alignmentSum = 0;
  let count = 0;
  
  for (let i = 0; i < min(forwardParticles.length, reverseParticles.length); i++) {
    const fp = forwardParticles[i];
    const rp = reverseParticles[i];
    
    const forwardVel = sqrt(fp.vx * fp.vx + fp.vy * fp.vy);
    const reverseVel = sqrt(rp.vx * rp.vx + rp.vy * rp.vy);
    
    if (forwardVel > 0.01 && reverseVel > 0.01) {
      // Cosine similarity
      const dot = fp.vx * rp.vx + fp.vy * rp.vy;
      const similarity = dot / (forwardVel * reverseVel);
      alignmentSum += (similarity + 1) / 2; // Normalize to 0-1
      count++;
    }
  }
  
  const cr = count > 0 ? alignmentSum / count : 0;
  
  // TS: Temporal Stability - rate of FEF change
  let ts = 0;
  if (fefHistory.length >= 2) {
    const recentFef = fefHistory.slice(-10);
    if (recentFef.length >= 2) {
      const change = abs(recentFef[recentFef.length - 1] - recentFef[0]);
      ts = change / recentFef.length;
    }
  }
  
  // EI: Efficiency Index (already computed in updateSimulation)
  const ei = efficiencyIndex;
  
  return { fef, bcd, cr, ts, ei };
}

function displayFormula() {
  push();
  fill(0, 0, 15, 0.92);
  stroke(200, 50, 70, 0.8);
  strokeWeight(2);
  rect(10, 10, 500, 80, 5);
  
  fill(255);
  noStroke();
  textAlign(LEFT);
  textSize(13);
  textStyle(BOLD);
  text("Dual Itô Fairness SDEs:", 20, 32);
  
  textSize(11);
  textStyle(NORMAL);
  fill(15, 70, 95); // Red for forward
  text("Forward: dX_t = f(x,t)dt + g(t)dW_t", 20, 50);
  
  fill(200, 70, 95); // Blue for reverse
  text("Reverse: dX_t = [f(x,t) - g(t)²λ∇log p_t(x)]dt + g(t)dW̄_t", 20, 68);
  
  fill(255);
  textSize(10);
  text(`λ = ${fairnessCouplingSlider.value().toFixed(2)} (fairness coupling)`, 20, 84);
  pop();
}

function displayMetrics() {
  const metrics = calculateMetrics();
  
  push();
  fill(0, 0, 100, 0.85);
  stroke(0, 0, 60, 0.5);
  rect(width - 280, 10, 270, 380);
  
  fill(0, 0, 0);
  textSize(13);
  textStyle(BOLD);
  text('Dual Itô Metrics', width - 270, 28);
  textStyle(NORMAL);
  
  textSize(11);
  fill(0, 0, 20);
  
  // FEF
  text(`Fairness Energy (FEF): ${metrics.fef.toFixed(4)}`, width - 270, 50);
  drawFEFGraph(width - 270, 60, 250, 60);
  
  // BCD
  text(`Bias-Correction Delta (BCD): ${metrics.bcd.toFixed(4)}`, width - 270, 135);
  drawBCDBars(width - 270, 145, 250, 30);
  
  // CR
  text(`Convergence Ratio (CR): ${metrics.cr.toFixed(3)}`, width - 270, 190);
  drawCRGauge(width - 270, 200, 60);
  
  // TS
  text(`Temporal Stability (TS): ${metrics.ts.toFixed(4)}`, width - 270, 275);
  drawTSSparkline(width - 270, 285, 250, 40);
  
  // EI
  text(`Efficiency Index (EI): ${metrics.ei > 0 ? metrics.ei : 'N/A'}`, width - 270, 340);
  text(`Iterations: ${iterationCount}`, width - 270, 360);
  
  pop();
}

function drawFEFGraph(x, y, w, h) {
  if (fefHistory.length < 2) return;
  
  push();
  // Background
  fill(0, 0, 20, 0.5);
  noStroke();
  rect(x, y, w, h);
  
  // Calculate bounds
  let minFef = min(fefHistory);
  let maxFef = max(fefHistory);
  let range = maxFef - minFef;
  if (range < 0.001) {
    range = 0.1;
    const center = (minFef + maxFef) / 2;
    minFef = max(0, center - range / 2);
    maxFef = min(1, center + range / 2);
  }
  
  // Draw line
  noFill();
  stroke(200, 80, 80);
  strokeWeight(2);
  beginShape();
  for (let i = 0; i < fefHistory.length; i++) {
    const px = map(i, 0, fefHistory.length - 1, x + 5, x + w - 5);
    const py = map(fefHistory[i], minFef, maxFef, y + h - 5, y + 5);
    vertex(px, py);
  }
  endShape();
  
  pop();
}

function drawBCDBars(x, y, w, h) {
  const metrics = calculateMetrics();
  const forwardDrift = forwardParticles.length > 0 ? 
    forwardParticles.reduce((sum, p) => sum + sqrt(p.vx*p.vx + p.vy*p.vy), 0) / forwardParticles.length : 0;
  const reverseDrift = reverseParticles.length > 0 ?
    reverseParticles.reduce((sum, p) => sum + sqrt(p.vx*p.vx + p.vy*p.vy), 0) / reverseParticles.length : 0;
  const maxDrift = max(forwardDrift, reverseDrift, 1);
  
  push();
  // Forward bar (red)
  fill(15, 80, 80);
  noStroke();
  rect(x, y, w * (forwardDrift / maxDrift), h / 2);
  
  // Reverse bar (blue)
  fill(200, 80, 80);
  rect(x, y + h / 2, w * (reverseDrift / maxDrift), h / 2);
  
  // Labels
  fill(0, 0, 100);
  textSize(9);
  textAlign(LEFT);
  text('Forward', x + 5, y + h / 4 + 3);
  text('Reverse', x + 5, y + 3 * h / 4 + 3);
  pop();
}

function drawCRGauge(x, y, size) {
  const metrics = calculateMetrics();
  const cr = metrics.cr;
  
  push();
  translate(x + size/2, y + size/2);
  
  // Background circle
  fill(0, 0, 20);
  noStroke();
  ellipse(0, 0, size, size);
  
  // Gauge arc
  noFill();
  strokeWeight(4);
  stroke(200, 80, 80);
  arc(0, 0, size - 10, size - 10, -PI/2, -PI/2 + TWO_PI * cr);
  
  // Center text
  fill(0, 0, 100);
  textAlign(CENTER, CENTER);
  textSize(12);
  textStyle(BOLD);
  text(cr.toFixed(2), 0, 0);
  
  pop();
}

function drawTSSparkline(x, y, w, h) {
  if (tsHistory.length < 2) return;
  
  push();
  // Background
  fill(0, 0, 20, 0.5);
  noStroke();
  rect(x, y, w, h);
  
  // Calculate bounds
  let minTS = min(tsHistory);
  let maxTS = max(tsHistory);
  let range = maxTS - minTS;
  if (range < 0.001) {
    range = 0.1;
    const center = (minTS + maxTS) / 2;
    minTS = max(0, center - range / 2);
    maxTS = min(1, center + range / 2);
  }
  
  // Draw line
  noFill();
  stroke(60, 80, 80);
  strokeWeight(1.5);
  beginShape();
  for (let i = 0; i < tsHistory.length; i++) {
    const px = map(i, 0, tsHistory.length - 1, x + 5, x + w - 5);
    const py = map(tsHistory[i], minTS, maxTS, y + h - 5, y + 5);
    vertex(px, py);
  }
  endShape();
  
  pop();
}

function displayInfoBox() {
  const infoX = width - 40;
  const metricsPanelHeight = 380;
  const infoY = 10 + metricsPanelHeight - 25;
  const infoSize = 20;
  const mouseOverInfo = mouseX >= infoX - 5 && mouseX <= infoX + infoSize + 5 &&
                        mouseY >= infoY - 5 && mouseY <= infoY + infoSize + 5;
  
  push();
  fill(200, 50, 80, (mouseOverInfo || infoBoxOpen) ? 1 : 0.7);
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(16);
  textStyle(BOLD);
  text("ℹ", infoX + infoSize/2, infoY + infoSize/2);
  pop();
  
  // Only show box when explicitly opened, not on hover
  if (infoBoxOpen) {
    push();
    const boxWidth = 450, boxHeight = 600;
    // Move box up and to the left - position it higher and more centered
    const boxX = width - boxWidth - 20; // Moved left (was -50)
    const boxY = 100; // Moved up significantly (was infoY + infoSize + 10)
    
    // Draw box background
    fill(0, 0, 0, 0.95);
    stroke(200, 50, 80, 0.8);
    strokeWeight(2);
    rect(boxX, boxY, boxWidth, boxHeight, 8);
    
    const lineHeight = 15, margin = 15, maxTextWidth = boxWidth - margin * 2 - 20;
    const headerY = boxY + 30;
    const contentStartY = boxY + 60; // More space after header
    const contentEndY = boxY + boxHeight - 10;
    
    // Cache wrapped text on first render or if not cached
    if (!cachedWrappedText) {
      const desc = [
        "OVERVIEW:",
        "The Dual Itô Fairness Model demonstrates fairness as a dynamic equilibrium between two coupled stochastic differential equations. The forward SDE represents bias diffusion, while the reverse SDE represents fairness correction through gradient-based attraction toward equilibrium regions.",
        "",
        "MATHEMATICAL MODEL:",
        "Forward SDE: dX_t = f(x_t, t)dt + g(t)dW_t",
        "",
        "Reverse SDE: dX_t = [f(x_t, t) - g(t)²λ∇_x log p_t(x)]dt + g(t)dW̄_t",
        "",
        "The gradient term ∇_x log p_t(x) is approximated using kernel density estimation:",
        "∇_x log p_t(x) ≈ Σ_i (x - x_i) · K(x, x_i) / (σ² · Σ_j K(x, x_j))",
        "",
        "where K(x, x_i) = exp(-||x - x_i||² / (2σ²)) is a Gaussian kernel. This gradient attracts particles toward high-density (fair) regions.",
        "",
        "FAIRNESS METRICS:",
        "• Fairness Energy (FEF): Variance of gradient norms over time. Measures how uniformly fairness gradients are distributed. Lower values indicate more stable fairness.",
        "",
        "• Bias-Correction Delta (BCD): Difference in drift magnitude between forward and reverse SDEs. Shows the strength of fairness correction relative to bias propagation.",
        "",
        "• Convergence Ratio (CR): Trajectory alignment between forward and reverse particles (0-1). Values near 1.0 indicate the system has reached equilibrium.",
        "",
        "• Temporal Stability (TS): Rate of change of fairness energy. Lower values indicate the system is stabilizing.",
        "",
        "• Efficiency Index (EI): Approximate number of iterations until stable fairness (CR > 0.9 and TS < 0.01).",
        "",
        "THEORETICAL CONTEXT:",
        "This model relates to FairDiffusion, FairGen, and Invdiff frameworks, which use reverse diffusion processes to generate fair distributions. The dual SDE structure mirrors how bias naturally diffuses forward in time, while fairness corrections can be applied through reverse-time processes.",
        "",
        "USER GUIDE:",
        "• Adjust Drift Strength to control deterministic flow patterns",
        "• Diffusion Coefficient controls noise magnitude",
        "• Fairness Coupling (λ) balances correction strength",
        "• Time Step controls temporal resolution",
        "• Iteration Speed multiplies update frequency",
        "• Use Play/Pause, Step, and Clear buttons to control simulation",
        "",
        "OBSERVATIONS:",
        "Watch how red/orange forward particles (bias) and blue/teal reverse particles (correction) interact. Equilibrium zones appear as white/gray overlays where both populations converge. As fairness coupling increases, reverse particles are more strongly attracted toward equilibrium regions."
      ];
      
      cachedWrappedText = [];
      for (let line of desc) {
        const wrapped = wrapTextForInfo(line, maxTextWidth);
        cachedWrappedText.push({
          text: line,
          wrapped: wrapped,
          isBold: line.startsWith("•") || (line === line.toUpperCase() && line.length > 0 && !line.includes(":"))
        });
      }
    }
    
    // Calculate total content height
    let totalHeight = 60; // Header space + spacing
    for (let item of cachedWrappedText) {
      totalHeight += item.wrapped.length * lineHeight;
    }
    
    // Clamp scroll offset
    const maxScroll = max(0, totalHeight - boxHeight + 20);
    infoBoxScrollOffset = constrain(infoBoxScrollOffset, 0, maxScroll);
    
    // Draw header (fixed position, doesn't scroll)
    noStroke();
    fill(255);
    textSize(16);
    textStyle(BOLD);
    textAlign(LEFT);
    text("Dual Itô Fairness Model", boxX + 15, headerY);
    
    // Draw scrollable content (only visible lines)
    textSize(11);
    let textY = contentStartY - infoBoxScrollOffset;
    
    for (let item of cachedWrappedText) {
      // Skip if this line is completely above or below visible area
      const lineBottom = textY + item.wrapped.length * lineHeight;
      if (lineBottom < boxY || textY > contentEndY) {
        textY += item.wrapped.length * lineHeight;
        continue;
      }
      
      // Set text style
      if (item.isBold) {
        textStyle(BOLD);
      } else {
        textStyle(NORMAL);
      }
      fill(255);
      
      // Draw each wrapped line
      for (let w of item.wrapped) {
        // Only draw if line is in visible range
        if (textY >= boxY - 5 && textY <= contentEndY + 5) {
          text(w, boxX + margin, textY);
        }
        textY += lineHeight;
      }
    }
    
    // Draw scrollbar if content overflows
    if (totalHeight > boxHeight) {
      const scrollbarWidth = 8;
      const scrollbarX = boxX + boxWidth - scrollbarWidth - 5;
      const scrollbarHeight = boxHeight - 20;
      const scrollbarY = boxY + 10;
      const thumbHeight = max(10, (boxHeight / totalHeight) * scrollbarHeight);
      const thumbY = maxScroll > 0 ? scrollbarY + (infoBoxScrollOffset / maxScroll) * (scrollbarHeight - thumbHeight) : scrollbarY;
      
      // Scrollbar track
      fill(0, 0, 30, 0.5);
      noStroke();
      rect(scrollbarX, scrollbarY, scrollbarWidth, scrollbarHeight, 4);
      
      // Scrollbar thumb
      fill(200, 50, 80, 0.8);
      rect(scrollbarX, thumbY, scrollbarWidth, thumbHeight, 4);
    }
    
    // Draw close button (X) in top right
    const closeButtonSize = 20;
    const closeButtonX = boxX + boxWidth - closeButtonSize - 10;
    const closeButtonY = boxY + 10;
    const mouseOverClose = mouseX >= closeButtonX && mouseX <= closeButtonX + closeButtonSize &&
                          mouseY >= closeButtonY && mouseY <= closeButtonY + closeButtonSize;
    
    fill(200, 50, 80, mouseOverClose ? 1 : 0.7);
    noStroke();
    textAlign(CENTER, CENTER);
    textSize(14);
    textStyle(BOLD);
    text("×", closeButtonX + closeButtonSize/2, closeButtonY + closeButtonSize/2);
    
    pop();
  }
}

function mousePressed() {
  const infoX = width - 40;
  const metricsPanelHeight = 380;
  const infoY = 10 + metricsPanelHeight - 25;
  const infoSize = 20;
  const mouseOverInfo = mouseX >= infoX - 5 && mouseX <= infoX + infoSize + 5 &&
                        mouseY >= infoY - 5 && mouseY <= infoY + infoSize + 5;
  
  if (mouseOverInfo) {
    infoBoxOpen = !infoBoxOpen;
    if (!infoBoxOpen) {
      infoBoxScrollOffset = 0; // Reset scroll when closing
    }
    return false;
  }
  
  // Check for close button click
  if (infoBoxOpen) {
    const boxWidth = 450;
    const boxX = width - boxWidth - 20;
    const boxY = 100;
    const closeButtonSize = 20;
    const closeButtonX = boxX + boxWidth - closeButtonSize - 10;
    const closeButtonY = boxY + 10;
    const mouseOverClose = mouseX >= closeButtonX && mouseX <= closeButtonX + closeButtonSize &&
                          mouseY >= closeButtonY && mouseY <= closeButtonY + closeButtonSize;
    
    if (mouseOverClose) {
      infoBoxOpen = false;
      infoBoxScrollOffset = 0;
      return false;
    }
  }
  return true;
}

function mouseWheel(event) {
  // Only scroll if info box is open and mouse is over it
  if (infoBoxOpen) {
    const boxWidth = 450;
    const boxX = width - boxWidth - 20;
    const boxY = 100;
    const boxHeight = 600;
    
    // Check if mouse is over info box
    if (mouseX >= boxX && mouseX <= boxX + boxWidth &&
        mouseY >= boxY && mouseY <= boxY + boxHeight) {
      infoBoxScrollOffset -= event.delta;
      return false; // Prevent default scrolling
    }
  }
  return true;
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
    { text: `Drift Strength f(x,t): ${driftStrengthSlider.value().toFixed(2)}`, x: 220, y: y + 5, desc: "Controls deterministic flow of bias/fairness. Positive values create rightward drift with sinusoidal vertical component. Range: -2.0 to 2.0." },
    { text: `Diffusion Coefficient g(t): ${diffusionCoeffSlider.value().toFixed(2)}`, x: 220, y: y + spacing + 5, desc: "Controls noise magnitude in Brownian motion. Higher values add more randomness to particle paths. Range: 0.0 to 1.0." },
    { text: `Fairness Coupling λ: ${fairnessCouplingSlider.value().toFixed(2)}`, x: 220, y: y + spacing * 2 + 5, desc: "Scales the fairness correction term in reverse SDE. Higher values create stronger attraction toward equilibrium regions. Range: 0.0 to 2.0." },
    { text: `Time Step Δt: ${timeStepSlider.value().toFixed(3)}`, x: 220, y: y + spacing * 3 + 5, desc: "Controls temporal resolution of SDE integration. Smaller values are more accurate but slower. Range: 0.001 to 0.05." },
    { text: `Iteration Speed: ${iterationSpeedSlider.value()}x`, x: 220, y: y + spacing * 4 + 5, desc: "Animation update multiplier. Higher values run simulation faster but may reduce visual smoothness. Range: 1x to 10x." },
    { text: `Particle Count: ${particleCountSlider.value()}`, x: 220, y: y + spacing * 5 + 5, desc: "Number of particles per SDE type (forward and reverse). More particles show clearer patterns but may reduce performance. Range: 50 to 500." }
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

