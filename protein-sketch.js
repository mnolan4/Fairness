// Protein Folding Fairness Model - Using global p5.js mode
// Agents fold like amino acids to minimize "unfairness energy"

let chain = [];
let temperatureSlider, foldingRateSlider, bondStrengthSlider, chainLengthSlider, targetFairnessSlider;
let hydrogenBonds = []; // Non-adjacent bonds formed between fair neighbors

function setup() {
  createCanvas(1000, 800);
  colorMode(HSB, 360, 100, 100, 1);
  createControls();
  initializeChain();
}

function createControls() {
  let y = 95, s = 30;
  
  temperatureSlider = createSlider(0, 2, 0.5, 0.01);
  temperatureSlider.position(10, y);
  temperatureSlider.style('width', '200px');
  
  foldingRateSlider = createSlider(0, 1, 0.3, 0.01);
  foldingRateSlider.position(10, y + s);
  foldingRateSlider.style('width', '200px');
  
  bondStrengthSlider = createSlider(0, 1, 0.5, 0.01);
  bondStrengthSlider.position(10, y + s * 2);
  bondStrengthSlider.style('width', '200px');
  
  chainLengthSlider = createSlider(20, 100, 40, 1);
  chainLengthSlider.position(10, y + s * 3);
  chainLengthSlider.style('width', '200px');
  
  targetFairnessSlider = createSlider(0, 1, 0.8, 0.01);
  targetFairnessSlider.position(10, y + s * 4);
  targetFairnessSlider.style('width', '200px');
}

function initializeChain() {
  chain = [];
  hydrogenBonds = [];
  const count = chainLengthSlider ? chainLengthSlider.value() : 40;
  const startX = width / 2 - count * 5;
  const startY = height / 2;
  
  // Initialize chain in extended (unfolded) configuration
  for (let i = 0; i < count; i++) {
    chain.push(new AminoAcid(
      startX + i * 15 + random(-5, 5),
      startY + random(-20, 20),
      i,
      random(0.2, 0.8) // Initial utility
    ));
  }
}

function draw() {
  // Dark background with subtle gradient
  background(240, 15, 8);
  
  // Adjust chain length if slider changed
  const targetLength = chainLengthSlider.value();
  if (chain.length !== targetLength) {
    initializeChain();
  }
  
  // Get parameters
  const temperature = temperatureSlider.value();
  const foldingRate = foldingRateSlider.value();
  const bondStrength = bondStrengthSlider.value();
  const targetFairness = targetFairnessSlider.value();
  
  // Update hydrogen bonds (non-adjacent fair attractions)
  updateHydrogenBonds(bondStrength);
  
  // Update all amino acids
  for (let aa of chain) {
    aa.update(temperature, foldingRate, bondStrength, targetFairness);
  }
  
  // Draw hydrogen bonds first (behind chain)
  drawHydrogenBonds();
  
  // Draw backbone bonds
  drawBackbone();
  
  // Draw amino acids
  for (let aa of chain) {
    aa.display();
  }
  
  // Display UI elements
  displayFormula();
  displayMetrics();
  displayInfoBox();
  displayControlLabels();
}

function updateHydrogenBonds(bondStrength) {
  hydrogenBonds = [];
  if (bondStrength < 0.1) return;
  
  // Find non-adjacent pairs with similar utility (fair bonds)
  for (let i = 0; i < chain.length; i++) {
    for (let j = i + 3; j < chain.length; j++) { // Skip adjacent (i+1, i+2)
      const aa1 = chain[i];
      const aa2 = chain[j];
      const dx = aa2.x - aa1.x;
      const dy = aa2.y - aa1.y;
      const dist = sqrt(dx * dx + dy * dy);
      
      // Form hydrogen bond if close enough and utilities are similar (fair)
      const utilityDiff = abs(aa1.utility - aa2.utility);
      if (dist < 60 && utilityDiff < 0.3) {
        hydrogenBonds.push({
          i: i,
          j: j,
          strength: (1 - utilityDiff / 0.3) * bondStrength,
          dist: dist
        });
      }
    }
  }
}

function drawHydrogenBonds() {
  for (let bond of hydrogenBonds) {
    const aa1 = chain[bond.i];
    const aa2 = chain[bond.j];
    const alpha = bond.strength * 0.5;
    
    // Dashed line for hydrogen bonds
    stroke(180, 50, 80, alpha);
    strokeWeight(1);
    drawingContext.setLineDash([4, 4]);
    line(aa1.x, aa1.y, aa2.x, aa2.y);
    drawingContext.setLineDash([]);
  }
}

function drawBackbone() {
  // Draw backbone as smooth curve
  stroke(60, 30, 70, 0.8);
  strokeWeight(3);
  noFill();
  
  beginShape();
  for (let aa of chain) {
    curveVertex(aa.x, aa.y);
  }
  endShape();
  
  // Draw backbone bonds between adjacent amino acids
  for (let i = 0; i < chain.length - 1; i++) {
    const aa1 = chain[i];
    const aa2 = chain[i + 1];
    stroke(60, 40, 60, 0.6);
    strokeWeight(2);
    line(aa1.x, aa1.y, aa2.x, aa2.y);
  }
}

class AminoAcid {
  constructor(x, y, index, utility) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.index = index;
    this.utility = utility;
    this.localFairness = 0.5;
  }
  
  update(temperature, foldingRate, bondStrength, targetFairness) {
    // Calculate forces
    let fx = 0, fy = 0;
    
    // 1. Backbone spring forces (keep chain connected)
    if (this.index > 0) {
      const prev = chain[this.index - 1];
      const springForce = this.springForce(prev, 25); // Rest length 25
      fx += springForce.x * 2;
      fy += springForce.y * 2;
    }
    if (this.index < chain.length - 1) {
      const next = chain[this.index + 1];
      const springForce = this.springForce(next, 25);
      fx += springForce.x * 2;
      fy += springForce.y * 2;
    }
    
    // 2. Fairness gradient force (move toward fair neighbors)
    const fairnessGradient = this.calculateFairnessGradient(targetFairness);
    fx += fairnessGradient.x * foldingRate * 50;
    fy += fairnessGradient.y * foldingRate * 50;
    
    // 3. Hydrogen bond forces (attraction to fair non-adjacent)
    for (let bond of hydrogenBonds) {
      if (bond.i === this.index || bond.j === this.index) {
        const other = bond.i === this.index ? chain[bond.j] : chain[bond.i];
        const springForce = this.springForce(other, 40); // Optimal hydrogen bond distance
        fx += springForce.x * bondStrength * 0.5;
        fy += springForce.y * bondStrength * 0.5;
      }
    }
    
    // 4. Repulsion from very close non-bonded atoms (steric hindrance)
    for (let other of chain) {
      if (abs(other.index - this.index) > 2) {
        const dx = other.x - this.x;
        const dy = other.y - this.y;
        const dist = sqrt(dx * dx + dy * dy);
        if (dist < 20 && dist > 0) {
          const repulsion = (20 - dist) / 20;
          fx -= (dx / dist) * repulsion * 30;
          fy -= (dy / dist) * repulsion * 30;
        }
      }
    }
    
    // 5. Thermal noise (Brownian motion)
    fx += randomGaussian() * temperature * 20;
    fy += randomGaussian() * temperature * 20;
    
    // 6. Center attraction (keep chain on screen)
    const centerX = width / 2;
    const centerY = height / 2;
    fx += (centerX - this.x) * 0.001;
    fy += (centerY - this.y) * 0.001;
    
    // Update velocity with damping
    this.vx = (this.vx + fx * 0.1) * 0.9;
    this.vy = (this.vy + fy * 0.1) * 0.9;
    
    // Update position
    this.x += this.vx;
    this.y += this.vy;
    
    // Boundary constraints
    this.x = constrain(this.x, 50, width - 50);
    this.y = constrain(this.y, 50, height - 50);
    
    // Update utility based on local fairness pressure
    this.updateUtility(targetFairness, foldingRate);
    
    // Calculate local fairness
    this.localFairness = this.calculateLocalFairness();
  }
  
  springForce(other, restLength) {
    const dx = other.x - this.x;
    const dy = other.y - this.y;
    const dist = sqrt(dx * dx + dy * dy);
    if (dist === 0) return {x: 0, y: 0};
    
    const displacement = dist - restLength;
    const force = displacement * 0.1;
    
    return {
      x: (dx / dist) * force,
      y: (dy / dist) * force
    };
  }
  
  calculateFairnessGradient(targetFairness) {
    // Calculate gradient direction toward fairer configuration
    let gx = 0, gy = 0;
    let count = 0;
    
    for (let other of chain) {
      if (other === this) continue;
      const dx = other.x - this.x;
      const dy = other.y - this.y;
      const dist = sqrt(dx * dx + dy * dy);
      
      if (dist < 100 && dist > 0) {
        // Move toward agents with similar utility (fair clustering)
        const utilityDiff = abs(other.utility - this.utility);
        const attraction = (1 - utilityDiff) * (1 - dist / 100);
        
        gx += (dx / dist) * attraction;
        gy += (dy / dist) * attraction;
        count++;
      }
    }
    
    if (count > 0) {
      gx /= count;
      gy /= count;
    }
    
    return {x: gx, y: gy};
  }
  
  updateUtility(targetFairness, rate) {
    // Calculate average utility of neighbors
    let sumUtil = 0;
    let count = 0;
    
    for (let other of chain) {
      if (other === this) continue;
      const dx = other.x - this.x;
      const dy = other.y - this.y;
      const dist = sqrt(dx * dx + dy * dy);
      
      if (dist < 80) {
        sumUtil += other.utility;
        count++;
      }
    }
    
    if (count > 0) {
      const avgUtil = sumUtil / count;
      // Move utility toward neighborhood average (fairness pressure)
      this.utility += (avgUtil - this.utility) * rate * 0.1;
      // Also move toward target fairness
      this.utility += (targetFairness - this.utility) * rate * 0.02;
      this.utility = constrain(this.utility, 0.1, 0.9);
    }
  }
  
  calculateLocalFairness() {
    let sumDiff = 0;
    let count = 0;
    
    for (let other of chain) {
      if (other === this) continue;
      const dx = other.x - this.x;
      const dy = other.y - this.y;
      const dist = sqrt(dx * dx + dy * dy);
      
      if (dist < 60) {
        sumDiff += abs(other.utility - this.utility);
        count++;
      }
    }
    
    if (count === 0) return 0.5;
    return 1 - constrain(sumDiff / count, 0, 1);
  }
  
  display() {
    // Size based on local fairness
    const size = map(this.localFairness, 0, 1, 8, 16);
    
    // Color based on utility (red = low, blue = high)
    const hue = map(this.utility, 0, 1, 0, 240);
    
    // Glow based on local fairness
    const glowAlpha = map(this.localFairness, 0, 1, 0.2, 0.8);
    
    // Draw glow
    noStroke();
    for (let i = 3; i >= 1; i--) {
      fill(hue, 60, 90, glowAlpha / i);
      ellipse(this.x, this.y, size + i * 6, size + i * 6);
    }
    
    // Draw amino acid
    fill(hue, 70, 95);
    stroke(hue, 80, 60);
    strokeWeight(1);
    ellipse(this.x, this.y, size, size);
    
    // Inner highlight
    fill(hue, 40, 100, 0.8);
    noStroke();
    ellipse(this.x - size * 0.15, this.y - size * 0.15, size * 0.3, size * 0.3);
  }
}

function calculateMetrics() {
  if (chain.length === 0) {
    return {
      energy: 0, foldingProgress: 0, compactness: 0,
      localFairness: 0, temperature: 0
    };
  }
  
  // 1. Unfairness Energy (lower = fairer)
  let localEnergy = 0;
  let globalEnergy = 0;
  
  const meanUtil = chain.reduce((sum, aa) => sum + aa.utility, 0) / chain.length;
  
  for (let aa of chain) {
    // Global variance energy
    globalEnergy += (aa.utility - meanUtil) * (aa.utility - meanUtil);
    
    // Local energy (difference from neighbors)
    for (let other of chain) {
      if (other === aa) continue;
      const dx = other.x - aa.x;
      const dy = other.y - aa.y;
      const dist = sqrt(dx * dx + dy * dy);
      if (dist < 60) {
        localEnergy += (aa.utility - other.utility) * (aa.utility - other.utility);
      }
    }
  }
  
  const energy = (localEnergy + globalEnergy) / chain.length;
  
  // 2. Compactness (radius of gyration)
  const centerX = chain.reduce((sum, aa) => sum + aa.x, 0) / chain.length;
  const centerY = chain.reduce((sum, aa) => sum + aa.y, 0) / chain.length;
  let radiusGyration = 0;
  for (let aa of chain) {
    radiusGyration += (aa.x - centerX) ** 2 + (aa.y - centerY) ** 2;
  }
  radiusGyration = sqrt(radiusGyration / chain.length);
  
  // Normalize compactness (smaller = more compact)
  const maxRadius = chain.length * 8; // Extended chain
  const compactness = 1 - constrain(radiusGyration / maxRadius, 0, 1);
  
  // 3. Folding Progress (based on hydrogen bonds and compactness)
  const maxBonds = chain.length / 3; // Rough estimate
  const bondProgress = constrain(hydrogenBonds.length / maxBonds, 0, 1);
  const foldingProgress = (compactness + bondProgress) / 2;
  
  // 4. Average local fairness
  const localFairness = chain.reduce((sum, aa) => sum + aa.localFairness, 0) / chain.length;
  
  return {
    energy: energy,
    foldingProgress: foldingProgress,
    compactness: compactness,
    localFairness: localFairness,
    temperature: temperatureSlider.value(),
    hydrogenBonds: hydrogenBonds.length
  };
}

function displayFormula() {
  push();
  fill(0, 0, 15, 0.92);
  stroke(280, 50, 70, 0.8);
  strokeWeight(2);
  rect(10, 10, 480, 80, 5);
  
  fill(255);
  noStroke();
  textAlign(LEFT);
  textSize(13);
  textStyle(BOLD);
  text("Protein Folding Fairness:", 20, 32);
  
  textSize(11);
  textStyle(NORMAL);
  fill(280, 70, 95);
  text("E_total = E_local + E_global + E_bonding", 20, 50);
  
  fill(200, 70, 95);
  text("dx/dt = -∇E + η(T)  [Langevin dynamics]", 20, 68);
  
  fill(255);
  textSize(10);
  text(`T = ${temperatureSlider.value().toFixed(2)}  |  H-bonds: ${hydrogenBonds.length}`, 20, 84);
  pop();
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
  text('Folding Metrics', width - 250, 28);
  textStyle(NORMAL);
  
  textSize(11);
  fill(0, 0, 20);
  text(`Unfairness Energy: ${metrics.energy.toFixed(3)}`, width - 250, 50);
  text(`Folding Progress: ${(metrics.foldingProgress * 100).toFixed(1)}%`, width - 250, 66);
  text(`Compactness: ${(metrics.compactness * 100).toFixed(1)}%`, width - 250, 82);
  text(`Local Fairness: ${metrics.localFairness.toFixed(3)}`, width - 250, 98);
  text(`Hydrogen Bonds: ${metrics.hydrogenBonds}`, width - 250, 114);
  text(`Chain Length: ${chain.length}`, width - 250, 130);
  text(`Temperature: ${metrics.temperature.toFixed(2)}`, width - 250, 146);
  
  // Folding progress bar
  const barWidth = 200, barHeight = 8, barX = width - 250, barY = 160;
  fill(0, 0, 30);
  noStroke();
  rect(barX, barY, barWidth, barHeight);
  
  const progressColor = metrics.foldingProgress > 0.6 ? color(280, 70, 80) : 
                        metrics.foldingProgress > 0.3 ? color(60, 70, 80) : 
                        color(0, 70, 80);
  fill(progressColor);
  rect(barX, barY, barWidth * metrics.foldingProgress, barHeight);
  
  // State indicator
  const state = metrics.foldingProgress > 0.7 ? "Folded" : 
                metrics.foldingProgress > 0.4 ? "Folding" : "Unfolded";
  fill(metrics.foldingProgress > 0.6 ? 120 : metrics.foldingProgress > 0.3 ? 60 : 0, 80, 80);
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
  fill(280, 50, 80, mouseOverInfo ? 1 : 0.7);
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(16);
  textStyle(BOLD);
  text("ℹ", infoX + infoSize/2, infoY + infoSize/2);
  pop();
  
  if (mouseOverInfo) {
    push();
    const boxWidth = 400, boxHeight = 580, boxX = width - boxWidth - 50;
    const boxY = infoY + infoSize + 10;
    fill(0);
    stroke(280, 50, 80, 0.8);
    strokeWeight(2);
    rect(boxX, boxY, boxWidth, boxHeight, 8);
    
    noStroke();
    fill(255);
    textSize(16);
    textStyle(BOLD);
    textAlign(LEFT);
    text("Protein Folding Fairness", boxX + 15, boxY + 30);
    
    textStyle(NORMAL);
    textSize(11);
    fill(255);
    let textY = boxY + 55;
    const lineHeight = 15, margin = 15, textWidth = boxWidth - margin * 2;
    
    const desc = [
      "DESCRIPTION:",
      "Agents (amino acids) are connected in a chain that folds to minimize 'unfairness energy'. Like proteins finding their native structure, the system seeks a stable, fair configuration.",
      "",
      "PROTEIN-FAIRNESS ANALOGY:",
      "• Amino acids → Agents with utility values",
      "• Free energy → Unfairness energy",
      "• Native state → Fair equilibrium",
      "• Hydrogen bonds → Fair neighbor attractions",
      "• Misfolding → Stuck in unfair local minima",
      "",
      "MATHEMATICAL MODEL:",
      "E_total = E_local + E_global + E_bonding",
      "dx/dt = -∇E + η(T) [Langevin dynamics]",
      "",
      "The system follows energy gradient descent with thermal noise allowing escape from local minima.",
      "",
      "RELATION TO FAIRNESS:",
      "Protein folding shows how complex fair structures can emerge from simple local rules. Temperature controls exploration vs exploitation. Higher temp explores more configurations; lower temp refines toward the nearest fair state.",
      "",
      "INTERPRETING METRICS:",
      "• Unfairness Energy: Lower values mean fairer distribution.",
      "",
      "• Folding Progress: How close to stable fair configuration.",
      "",
      "• Compactness: How tightly folded (more compact = more interactions = more fairness pressure).",
      "",
      "• Hydrogen Bonds: Non-adjacent fair connections stabilizing the structure.",
      "",
      "OBSERVATIONS:",
      "Watch the chain fold from extended to compact. Hydrogen bonds (dashed lines) form between agents with similar utilities. Color shows utility (red=low, blue=high). Glow intensity shows local fairness."
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
    { text: `Temperature (T): ${temperatureSlider.value().toFixed(2)}`, x: 220, y: y + 5, desc: "Thermal noise level. High temp = more exploration, escapes local minima. Low temp = exploitation, refines current state." },
    { text: `Folding Rate: ${foldingRateSlider.value().toFixed(2)}`, x: 220, y: y + spacing + 5, desc: "Speed of energy minimization. Higher values cause faster folding toward fair configuration." },
    { text: `Bond Strength: ${bondStrengthSlider.value().toFixed(2)}`, x: 220, y: y + spacing * 2 + 5, desc: "Strength of hydrogen bonds between fair neighbors. Stronger bonds create more stable folded structures." },
    { text: `Chain Length: ${chainLengthSlider.value()}`, x: 220, y: y + spacing * 3 + 5, desc: "Number of amino acids (agents) in the chain. Longer chains create more complex folding dynamics." },
    { text: `Target Fairness: ${targetFairnessSlider.value().toFixed(2)}`, x: 220, y: y + spacing * 4 + 5, desc: "The 'native' fair state the system tries to fold toward. Higher values push utilities toward uniformity." }
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





