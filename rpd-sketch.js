// Residual Prior Diffusion (RPD) - Fairness as two-stage prior + residual
// Based on: Residual Prior Diffusion (arXiv:2512.21593v1)
// Coarse prior captures large-scale structure; diffusion refines the residual toward target.

let gridCols = 64;
let gridRows = 48;
let cellWidth, cellHeight;
let priorGrid = [];
let residualGrid = [];
let targetGrid = [];
let sources = [];

// Parameters (RPD-specific)
let priorBlurRadius = 3;      // How coarse the prior is (kernel size)
let priorStrength = 0.7;      // Weight of prior in prior update (smoothing toward target)
let residualStep = 0.08;     // Step size for residual diffusion update
let residualDiffusion = 0.2; // Diffusion coefficient for residual
let residualPull = 0.15;      // Pull residual toward (target - prior)
let noiseLevel = 0.02;       // Noise injected into residual (denoising difficulty)
let inferenceSteps = 4;      // Residual update steps per frame
let visMode = 'reconstructed'; // 'prior' | 'residual' | 'reconstructed' | 'target'

// UI
let priorBlurSlider, priorStrengthSlider, residualStepSlider, residualDiffSlider;
let residualPullSlider, noiseSlider, stepsSlider;
let visModeSelect, playPauseButton, resetButton;
let isPlaying = true;
let stepCount = 0;

// Metrics
let priorFit = 0;
let residualMagnitude = 0;
let reconError = 0;

// Info box
let infoBoxOpen = false;
let infoBoxScrollOffset = 0;
let cachedWrappedText = null;

function setup() {
  createCanvas(1000, 800);
  colorMode(HSB, 360, 100, 100, 1);
  cellWidth = width / gridCols;
  cellHeight = height / gridRows;
  createControls();
  initializeGrids();
}

function createControls() {
  // Wrapper div over left panel so sliders/dropdown capture clicks (canvas was eating them)
  const controlPanelW = 220;
  const controlPanel = createDiv();
  controlPanel.position(0, 0);
  controlPanel.size(controlPanelW, height);
  controlPanel.style('z-index', '100');
  controlPanel.style('pointer-events', 'auto'); // block canvas in this area so controls receive clicks

  let y = 60, s = 28;

  function addControl(el) {
    el.parent(controlPanel);
  }

  priorBlurSlider = createSlider(1, 8, 3, 1);
  priorBlurSlider.position(10, y);
  priorBlurSlider.style('width', '180px');
  addControl(priorBlurSlider);

  priorStrengthSlider = createSlider(0, 1, 0.7, 0.05);
  priorStrengthSlider.position(10, y + s);
  priorStrengthSlider.style('width', '180px');
  addControl(priorStrengthSlider);

  residualStepSlider = createSlider(0.01, 0.2, 0.08, 0.01);
  residualStepSlider.position(10, y + s * 2);
  residualStepSlider.style('width', '180px');
  addControl(residualStepSlider);

  residualDiffSlider = createSlider(0, 0.5, 0.2, 0.02);
  residualDiffSlider.position(10, y + s * 3);
  residualDiffSlider.style('width', '180px');
  addControl(residualDiffSlider);

  residualPullSlider = createSlider(0, 0.5, 0.15, 0.02);
  residualPullSlider.position(10, y + s * 4);
  residualPullSlider.style('width', '180px');
  addControl(residualPullSlider);

  noiseSlider = createSlider(0, 0.1, 0.02, 0.005);
  noiseSlider.position(10, y + s * 5);
  noiseSlider.style('width', '180px');
  addControl(noiseSlider);

  stepsSlider = createSlider(1, 10, 4, 1);
  stepsSlider.position(10, y + s * 6);
  stepsSlider.style('width', '180px');
  addControl(stepsSlider);

  visModeSelect = createSelect();
  visModeSelect.position(10, y + s * 7);
  visModeSelect.option('Reconstructed');
  visModeSelect.option('Prior');
  visModeSelect.option('Residual');
  visModeSelect.option('Target');
  visModeSelect.style('width', '180px');
  visModeSelect.changed(() => { visMode = visModeSelect.value().toLowerCase(); });
  addControl(visModeSelect);

  playPauseButton = createButton('Pause');
  playPauseButton.position(10, y + s * 8);
  playPauseButton.mousePressed(togglePlayPause);
  addControl(playPauseButton);

  resetButton = createButton('Reset');
  resetButton.position(80, y + s * 8);
  resetButton.mousePressed(resetSimulation);
  addControl(resetButton);
}

function togglePlayPause() {
  isPlaying = !isPlaying;
  playPauseButton.html(isPlaying ? 'Pause' : 'Play');
}

function resetSimulation() {
  initializeGrids();
  stepCount = 0;
}

function initializeGrids() {
  priorGrid = [];
  residualGrid = [];
  targetGrid = [];
  for (let y = 0; y < gridRows; y++) {
    priorGrid[y] = [];
    residualGrid[y] = [];
    targetGrid[y] = [];
    for (let x = 0; x < gridCols; x++) {
      priorGrid[y][x] = random(0.3, 0.7);
      residualGrid[y][x] = 0;
      targetGrid[y][x] = 0.5;
    }
  }
  // Initialize target with gradient + spots
  for (let y = 0; y < gridRows; y++) {
    for (let x = 0; x < gridCols; x++) {
      const nx = x / gridCols;
      const ny = y / gridRows;
      targetGrid[y][x] = 0.4 + 0.3 * sin(nx * PI * 2) * cos(ny * PI * 2) + 0.1 * noise(nx * 4, ny * 4);
      targetGrid[y][x] = constrain(targetGrid[y][x], 0, 1);
    }
  }
  // Prior = blurred target initially
  updatePriorFromTarget();
  sources = [];
}

function updatePriorFromTarget() {
  const r = priorBlurRadius;
  const kernel = [];
  let sum = 0;
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      const w = exp(-(dx * dx + dy * dy) / (2 * (r * 0.5) * (r * 0.5)));
      kernel.push({ dx, dy, w });
      sum += w;
    }
  }
  kernel.forEach(k => k.w /= sum);

  const nextPrior = [];
  for (let y = 0; y < gridRows; y++) {
    nextPrior[y] = [];
    for (let x = 0; x < gridCols; x++) {
      let v = 0;
      for (const k of kernel) {
        const nx = constrain(x + k.dx, 0, gridCols - 1);
        const ny = constrain(y + k.dy, 0, gridRows - 1);
        v += targetGrid[ny][nx] * k.w;
      }
      nextPrior[y][x] = priorStrength * priorGrid[y][x] + (1 - priorStrength) * v;
    }
  }
  for (let y = 0; y < gridRows; y++) {
    for (let x = 0; x < gridCols; x++) {
      priorGrid[y][x] = nextPrior[y][x];
    }
  }
}

function updateTargetWithSources() {
  for (const s of sources) {
    const gx = floor(s.x);
    const gy = floor(s.y);
    const r = floor(s.radius);
    if (gx >= 0 && gx < gridCols && gy >= 0 && gy < gridRows) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const nx = gx + dx;
          const ny = gy + dy;
          if (nx >= 0 && nx < gridCols && ny >= 0 && ny < gridRows && targetGrid[ny] != null) {
            const d = sqrt(dx * dx + dy * dy);
            const falloff = max(0, 1 - d / (r + 1));
            targetGrid[ny][nx] = lerp(targetGrid[ny][nx], s.value, 0.15 * falloff);
            targetGrid[ny][nx] = constrain(targetGrid[ny][nx], 0, 1);
          }
        }
      }
    }
  }
}

function updateResidual() {
  const step = residualStepSlider.value();
  const D = residualDiffSlider.value();
  const pull = residualPullSlider.value();
  const noiseAmt = noiseSlider.value();
  const steps = stepsSlider.value();

  for (let iter = 0; iter < steps; iter++) {
    const nextRes = [];
    for (let y = 0; y < gridRows; y++) {
      nextRes[y] = [];
      for (let x = 0; x < gridCols; x++) {
        const gap = targetGrid[y][x] - priorGrid[y][x];
        const lap = getLaplacian(residualGrid, x, y);
        let r = residualGrid[y][x];
        r += step * (D * lap + pull * (gap - r));
        r += random(-noiseAmt, noiseAmt);
        nextRes[y][x] = r;
      }
    }
    for (let y = 0; y < gridRows; y++) {
      for (let x = 0; x < gridCols; x++) {
        residualGrid[y][x] = nextRes[y][x];
      }
    }
  }
}

function getLaplacian(grid, x, y) {
  const v = grid[y][x];
  const left = x > 0 ? grid[y][x - 1] : v;
  const right = x < gridCols - 1 ? grid[y][x + 1] : v;
  const up = y > 0 ? grid[y - 1][x] : v;
  const down = y < gridRows - 1 ? grid[y + 1][x] : v;
  return (left + right + up + down) / 4 - v;
}

function computeMetrics() {
  let sumPriorErr = 0, sumResMag = 0, sumReconErr = 0;
  let n = 0;
  for (let y = 0; y < gridRows; y++) {
    for (let x = 0; x < gridCols; x++) {
      const prior = priorGrid[y][x];
      const res = residualGrid[y][x];
      const recon = constrain(prior + res, 0, 1);
      const target = targetGrid[y][x];
      sumPriorErr += (prior - target) * (prior - target);
      sumResMag += abs(res);
      sumReconErr += (recon - target) * (recon - target);
      n++;
    }
  }
  priorFit = 1 - min(1, sqrt(sumPriorErr / n));
  residualMagnitude = sumResMag / n;
  reconError = sqrt(sumReconErr / n);
}

function draw() {
  background(220, 18, 10);

  priorBlurRadius = priorBlurSlider.value();
  priorStrength = priorStrengthSlider.value();

  if (isPlaying) {
    updateSources();
    updateTargetWithSources();
    updatePriorFromTarget();
    updateResidual();
    computeMetrics();
    stepCount++;
  }

  drawField();
  drawSources();
  displayFormula();
  displayMetrics();
  displayInfoBox();
  displayControlLabels();
}

function drawField() {
  const mode = visModeSelect.value().toLowerCase();
  for (let y = 0; y < gridRows; y++) {
    for (let x = 0; x < gridCols; x++) {
      let v = 0.5;
      if (mode === 'prior') {
        v = priorGrid[y][x];
      } else if (mode === 'residual') {
        v = 0.5 + residualGrid[y][x] * 2;
        v = constrain(v, 0, 1);
      } else if (mode === 'reconstructed') {
        v = constrain(priorGrid[y][x] + residualGrid[y][x], 0, 1);
      } else {
        v = targetGrid[y][x];
      }

      const hue = map(v, 0, 1, 280, 60);
      const sat = map(v, 0, 1, 40, 80);
      const bright = map(v, 0, 1, 35, 88);
      fill(hue, sat, bright, 0.9);
      noStroke();
      rect(x * cellWidth, y * cellHeight, cellWidth + 0.5, cellHeight + 0.5);
    }
  }

  if (mode === 'residual') {
    push();
    noFill();
    stroke(0, 0, 100, 0.6);
    strokeWeight(1);
    const midX = (gridCols / 2) * cellWidth;
    line(midX, 0, midX, height);
    textSize(10);
    fill(255);
    textAlign(CENTER);
    text('0 (prior) ← residual → +', midX, 20);
    pop();
  }
}

function drawSources() {
  for (const s of sources) {
    const px = s.x * cellWidth;
    const py = s.y * cellHeight;
    const rad = (s.radius + 2) * cellWidth;
    fill(60, 70, 100, 0.5);
    noStroke();
    ellipse(px, py, rad * 2, rad * 2);
    fill(60, 90, 100, 0.9);
    ellipse(px, py, rad * 0.6, rad * 0.6);
  }
}

function updateSources() {
  if (frameCount % 90 === 0 && random() < 0.3) {
    sources.push({
      x: random(gridCols),
      y: random(gridRows),
      value: random(0.6, 1),
      radius: 4
    });
  }
  sources = sources.filter(s => s.radius > 0);
  sources.forEach(s => s.radius *= 0.995);
}

function mousePressed() {
  const infoX = width - 40;
  const metricsH = 150;
  const infoY = 10 + metricsH - 25;
  const infoSize = 20;
  const overInfo = mouseX >= infoX - 5 && mouseX <= infoX + infoSize + 5 &&
                   mouseY >= infoY - 5 && mouseY <= infoY + infoSize + 5;

  if (overInfo) {
    infoBoxOpen = !infoBoxOpen;
    if (!infoBoxOpen) infoBoxScrollOffset = 0;
    return false;
  }

  if (infoBoxOpen) {
    const boxWidth = 450, boxX = width - boxWidth - 20, boxY = 100;
    const closeX = boxX + boxWidth - 30, closeY = boxY + 10;
    if (mouseX >= closeX && mouseX <= closeX + 20 && mouseY >= closeY && mouseY <= closeY + 20) {
      infoBoxOpen = false;
      infoBoxScrollOffset = 0;
      return false;
    }
  }

  // Only add source when click is on canvas (not on left control panel)
  const controlPanelW = 220;
  if (mouseX >= controlPanelW && mouseX < width - 280 && mouseY > 50) {
    const gx = floor(mouseX / cellWidth);
    const gy = floor(mouseY / cellHeight);
    if (gx >= 0 && gx < gridCols && gy >= 0 && gy < gridRows) {
      sources.push({ x: gx + 0.5, y: gy + 0.5, value: 0.9, radius: 6 });
      return false;
    }
  }
  return true;
}

function displayFormula() {
  push();
  fill(0, 0, 15, 0.92);
  stroke(200, 50, 70, 0.8);
  strokeWeight(2);
  rect(10, 10, 520, 48, 5);
  fill(255);
  noStroke();
  textAlign(LEFT);
  textSize(13);
  textStyle(BOLD);
  text('Residual Prior Diffusion (RPD): prior + residual → target', 20, 30);
  textSize(11);
  textStyle(NORMAL);
  fill(200, 70, 95);
  text(`View: ${visModeSelect.value()}  |  Prior fit: ${priorFit.toFixed(3)}  |  Recon error: ${reconError.toFixed(4)}`, 20, 48);
  pop();
}

function displayMetrics() {
  push();
  fill(0, 0, 100, 0.85);
  stroke(0, 0, 60, 0.5);
  rect(width - 270, 10, 260, 150);
  fill(0, 0, 0);
  textSize(13);
  textStyle(BOLD);
  text('RPD Metrics', width - 260, 28);
  textStyle(NORMAL);
  textSize(11);
  fill(0, 0, 20);
  text(`Prior fit: ${priorFit.toFixed(4)}`, width - 260, 50);
  text(`Residual magnitude: ${residualMagnitude.toFixed(4)}`, width - 260, 68);
  text(`Recon error: ${reconError.toFixed(4)}`, width - 260, 86);
  text(`Inference steps/frame: ${stepsSlider.value()}`, width - 260, 104);
  text(`Grid: ${gridCols}×${gridRows}`, width - 260, 122);
  fill(120, 80, 80);
  text('Paper: arXiv:2512.21593v1', width - 260, 140);
  pop();
}

function displayInfoBox() {
  const infoX = width - 40;
  const metricsH = 150;
  const infoY = 10 + metricsH - 25;
  const infoSize = 20;
  const overInfo = mouseX >= infoX - 5 && mouseX <= infoX + infoSize + 5 &&
                   mouseY >= infoY - 5 && mouseY <= infoY + infoSize + 5;

  push();
  fill(200, 50, 80, (overInfo || infoBoxOpen) ? 1 : 0.7);
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(16);
  textStyle(BOLD);
  text("ℹ", infoX + infoSize / 2, infoY + infoSize / 2);
  pop();

  if (infoBoxOpen) {
    push();
    const boxWidth = 450, boxHeight = 520, boxX = width - boxWidth - 20, boxY = 100;
    const margin = 15, maxTextWidth = boxWidth - margin * 2 - 20;
    const lineHeight = 15;

    fill(0, 0, 0, 0.95);
    stroke(200, 50, 80, 0.8);
    strokeWeight(2);
    rect(boxX, boxY, boxWidth, boxHeight, 8);

    if (!cachedWrappedText) {
      const desc = [
        "RESIDUAL PRIOR DIFFUSION (RPD)",
        "Model based on arXiv:2512.21593v1. Two-stage framework: a coarse prior captures large-scale structure; a diffusion process refines the residual between prior and target.",
        "",
        "FAIRNESS INTERPRETATION:",
        "• Target = desired fairness distribution (click to add goal regions).",
        "• Prior = coarse approximation (blurred, low-frequency fairness).",
        "• Residual = fine-scale correction learned by diffusion.",
        "• Reconstructed = prior + residual; should match target.",
        "",
        "PARAMETERS:",
        "• Prior blur: kernel size for coarse prior (larger = coarser).",
        "• Prior strength: how much prior tracks target (smoothing).",
        "• Residual step: learning rate for residual updates.",
        "• Residual diffusion: smoothing of residual field.",
        "• Residual pull: strength pulling residual toward (target − prior).",
        "• Noise: injected noise (simulates denoising difficulty).",
        "• Inference steps: residual update steps per frame.",
        "",
        "METRICS:",
        "• Prior fit: 1 − normalized L2(prior − target). Higher = prior matches target better.",
        "• Residual magnitude: mean |residual|. Shows refinement effort.",
        "• Recon error: L2(reconstructed − target). Lower = better match.",
        "",
        "VIEW MODES:",
        "Prior = coarse field only. Residual = signed correction (0 = prior). Reconstructed = prior + residual. Target = goal field.",
        "",
        "REFERENCE:",
        "Residual Prior Diffusion: A Probabilistic Framework Integrating Coarse Latent Priors with Diffusion Models. arXiv:2512.21593. Use the 'Paper (PDF)' link (bottom-right) to open https://arxiv.org/pdf/2512.21593"
      ];
      cachedWrappedText = [];
      for (const line of desc) {
        cachedWrappedText.push({
          wrapped: wrapTextForInfo(line, maxTextWidth),
          bold: line.startsWith("•") || (line === line.toUpperCase() && line.length > 2 && !line.includes(":"))
        });
      }
    }

    const topPadding = 28;
    let totalHeight = topPadding;
    for (const item of cachedWrappedText) totalHeight += item.wrapped.length * lineHeight;
    const maxScroll = max(0, totalHeight - boxHeight + 20);
    infoBoxScrollOffset = constrain(infoBoxScrollOffset, 0, maxScroll);

    textAlign(LEFT, BASELINE);
    textSize(11);
    let textY = boxY + topPadding - infoBoxScrollOffset;
    const contentEndY = boxY + boxHeight - 10;

    for (const item of cachedWrappedText) {
      if (item.bold) textStyle(BOLD);
      else textStyle(NORMAL);
      fill(255);
      for (const w of item.wrapped) {
        if (textY >= boxY - 5 && textY <= contentEndY + 5) text(w, boxX + margin, textY);
        textY += lineHeight;
      }
    }

    if (maxScroll > 0) {
      const sbW = 8, sbX = boxX + boxWidth - sbW - 5, sbH = boxHeight - 20, sbY = boxY + 10;
      const thumbH = max(10, (boxHeight / totalHeight) * sbH);
      const thumbY = sbY + (infoBoxScrollOffset / maxScroll) * (sbH - thumbH);
      fill(0, 0, 30, 0.5);
      noStroke();
      rect(sbX, sbY, sbW, sbH, 4);
      fill(200, 50, 80, 0.8);
      rect(sbX, thumbY, sbW, thumbH, 4);
    }

    const closeX = boxX + boxWidth - 30, closeY = boxY + 10;
    fill(200, 50, 80, 0.9);
    noStroke();
    textAlign(CENTER, CENTER);
    textSize(14);
    text("×", closeX + 10, closeY + 10);
    pop();
  }
}

function wrapTextForInfo(text, maxWidth) {
  if (!text) return [""];
  const words = text.split(' ');
  const lines = [];
  let current = '';
  for (const word of words) {
    const test = current + (current ? ' ' : '') + word;
    if (textWidth(test) > maxWidth && current) {
      lines.push(current);
      current = word;
    } else current = test;
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

function mouseWheel(event) {
  if (infoBoxOpen && cachedWrappedText) {
    const boxWidth = 450, boxX = width - boxWidth - 20, boxY = 100, boxHeight = 520;
    if (mouseX >= boxX && mouseX <= boxX + boxWidth && mouseY >= boxY && mouseY <= boxY + boxHeight) {
      const lineHeight = 15;
      let totalHeight = 50;
      for (const item of cachedWrappedText) totalHeight += item.wrapped.length * lineHeight;
      const maxScroll = max(0, totalHeight - boxHeight + 20);
      infoBoxScrollOffset -= event.delta * 0.5;
      infoBoxScrollOffset = constrain(infoBoxScrollOffset, 0, maxScroll);
      return false;
    }
  }
  return true;
}

function displayControlLabels() {
  push();
  fill(0, 0, 100, 0.9);
  textAlign(LEFT);
  textSize(10);
  let y = 60, s = 28;
  const labels = [
    `Prior blur: ${priorBlurSlider.value()}`,
    `Prior strength: ${priorStrengthSlider.value().toFixed(2)}`,
    `Residual step: ${residualStepSlider.value().toFixed(2)}`,
    `Residual diffusion: ${residualDiffSlider.value().toFixed(2)}`,
    `Residual pull: ${residualPullSlider.value().toFixed(2)}`,
    `Noise: ${noiseSlider.value().toFixed(3)}`,
    `Steps/frame: ${stepsSlider.value()}`,
    `View: ${visModeSelect.value()}`
  ];
  for (let i = 0; i < labels.length; i++) {
    text(labels[i], 200, y + s * i + 5);
  }
  pop();
}
