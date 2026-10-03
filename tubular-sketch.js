// Spin-Gated Microtubule Polymerization
// Reduced radical-pair response with separate molecular and EM bath rates.

let modelState;
let simulationRng;
let isotopeSelect;
let fieldSlider;
let temperatureSlider;
let molecularSlider;
let heterogeneitySlider;
let correctionSlider;
let emScaleSlider;
let exploratoryCheckbox;
let vacuumCheckbox;
let pauseButton;
let resetButton;
let seedButton;
let isPlaying = true;
let seed = 7321;
let cHistory = [];
let roughnessHistory = [];
let timeHistory = [];
let frameAccumulator = 0;
let infoBoxOpen = false;

const TM = window.TubularModel;
const PANEL = {
  controls: { x: 10, y: 54, w: 220, h: 690 },
  tube: { x: 245, y: 82, w: 500, h: 435 },
  chart: { x: 245, y: 530, w: 500, h: 214 },
  metrics: { x: 760, y: 82, w: 230, h: 662 }
};

function setup() {
  createCanvas(1000, 760);
  colorMode(HSB, 360, 100, 100, 1);
  textFont('Arial');
  createControls();
  resetSimulation();
}

function createControls() {
  isotopeSelect = createSelect();
  isotopeSelect.option('Natural Mg', 'natural');
  isotopeSelect.option('²⁵Mg (I = 5/2)', '25Mg');
  isotopeSelect.option('²⁶Mg (I = 0)', '26Mg');
  isotopeSelect.selected('25Mg');
  isotopeSelect.position(18, 94);
  isotopeSelect.style('width', '196px');

  fieldSlider = makeSlider(-3, 1, Math.log10(3), 0.01, 18, 145);
  temperatureSlider = makeSlider(260, 330, 298, 1, 18, 198);
  molecularSlider = makeSlider(4, 7, 5.7, 0.01, 18, 251);
  heterogeneitySlider = makeSlider(0, 0.8, 0, 0.01, 18, 326);
  correctionSlider = makeSlider(0, 1, 0, 0.01, 18, 369);

  exploratoryCheckbox = createCheckbox(' Exploratory EM boost', false);
  exploratoryCheckbox.position(18, 414);
  exploratoryCheckbox.style('color', '#d8dee8');
  exploratoryCheckbox.changed(updateExploratoryControl);

  vacuumCheckbox = createCheckbox(' Include vacuum +1 term', true);
  vacuumCheckbox.position(18, 438);
  vacuumCheckbox.style('color', '#d8dee8');

  emScaleSlider = makeSlider(0, 24, 0, 0.1, 18, 482);
  updateExploratoryControl();

  pauseButton = createButton('Pause');
  pauseButton.position(18, 520);
  pauseButton.mousePressed(togglePlaying);

  resetButton = createButton('Reset');
  resetButton.position(83, 520);
  resetButton.mousePressed(resetSimulation);

  seedButton = createButton('New seed');
  seedButton.position(137, 520);
  seedButton.mousePressed(newSeed);
}

function makeSlider(minimum, maximum, value, step, x, y) {
  const slider = createSlider(minimum, maximum, value, step);
  slider.position(x, y);
  slider.style('width', '196px');
  return slider;
}

function updateExploratoryControl() {
  if (exploratoryCheckbox.checked()) {
    emScaleSlider.removeAttribute('disabled');
    emScaleSlider.style('opacity', '1');
  } else {
    emScaleSlider.value(0);
    emScaleSlider.attribute('disabled', '');
    emScaleSlider.style('opacity', '0.35');
  }
}

function resetSimulation() {
  simulationRng = TM.createRng(seed);
  modelState = TM.createState({
    cTotal: 10,
    cMT: 2.5,
    seed
  });
  cHistory = [modelState.cMT];
  roughnessHistory = [0];
  timeHistory = [0];
  frameAccumulator = 0;
}

function newSeed() {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  resetSimulation();
}

function togglePlaying() {
  isPlaying = !isPlaying;
  pauseButton.html(isPlaying ? 'Pause' : 'Play');
}

function currentOptions() {
  return {
    fieldMilliTesla: 10 ** fieldSlider.value(),
    isotope: isotopeSelect.value(),
    temperatureK: temperatureSlider.value(),
    log10MolecularGamma: molecularSlider.value(),
    log10EmScale: exploratoryCheckbox.checked() ? emScaleSlider.value() : 0,
    includeVacuum: vacuumCheckbox.checked(),
    pureDephasing: 1e5,
    kp: 0.08,
    kd: 0.035,
    heterogeneity: heterogeneitySlider.value(),
    correctionStrength: correctionSlider.value()
  };
}

function draw() {
  background(215, 30, 7);
  drawTitle();
  drawPanels();
  drawControlLabels();

  if (isPlaying) {
    const options = currentOptions();
    for (let index = 0; index < 2; index++) {
      TM.step(modelState, options, 0.05, simulationRng);
    }
    frameAccumulator += 1;
    if (frameAccumulator % 3 === 0) recordHistory();
  } else if (!modelState.last) {
    TM.step(modelState, currentOptions(), 0, simulationRng);
  }

  drawMicrotubule();
  drawHistoryChart();
  drawMetrics();
  drawInfoBox();
}

function drawTitle() {
  noStroke();
  fill(190, 35, 96);
  textSize(22);
  textStyle(BOLD);
  text('Spin-Gated Microtubule Polymerization', 245, 39);
  textStyle(NORMAL);
  fill(210, 10, 62);
  textSize(11);
  text('Reduced response model · local rules, shared substrate, collective morphology', 246, 57);
}

function drawPanels() {
  for (const panel of Object.values(PANEL)) {
    fill(215, 24, 11, 0.96);
    stroke(210, 16, 26);
    strokeWeight(1);
    rect(panel.x, panel.y, panel.w, panel.h, 8);
  }
}

function drawControlLabels() {
  const field = 10 ** fieldSlider.value();
  fill(190, 16, 84);
  noStroke();
  textSize(12);
  textStyle(BOLD);
  text('CONDITIONS', 18, 78);
  textStyle(NORMAL);

  drawLabel('Magnesium isotope', '', 90);
  drawLabel('Magnetic field', formatField(field), 134);
  drawLabel('Temperature', `${temperatureSlider.value()} K`, 187);
  drawLabel(
    'Molecular relaxation',
    `${formatScientific(10 ** molecularSlider.value())} s⁻¹`,
    240
  );

  fill(190, 16, 84);
  textStyle(BOLD);
  text('ALGORITHMIC ECOLOGY', 18, 289);
  textStyle(NORMAL);
  drawLabel('Local environment heterogeneity', heterogeneitySlider.value().toFixed(2), 316);
  drawLabel('Adaptive tip feedback', correctionSlider.value().toFixed(2), 359);

  fill(36, 55, 88);
  textStyle(BOLD);
  text('EXPLORATORY BATH', 18, 406);
  textStyle(NORMAL);
  drawLabel(
    'EM coupling boost',
    exploratoryCheckbox.checked() ? `10^${emScaleSlider.value().toFixed(1)}×` : 'physical',
    472
  );

  fill(210, 10, 58);
  textSize(10);
  text(`seed ${seed}`, 18, 557);
  textLeading(15);
  text(
    'CMT is the authoritative state. The visible tube is a representative 13-protofilament geometry.',
    18,
    580,
    194
  );

  fill(36, 42, 92);
  text(
    'Vacuum fluctuations enter only as a spontaneous-transition rate. They do not supply growth energy.',
    18,
    643,
    194
  );

  fill(210, 8, 52);
  text(
    'Reduced triplet-yield response: qualitative calibration to hypomagnetic and 3 mT isotope conditions.',
    18,
    700,
    194
  );
}

function drawLabel(label, value, y) {
  fill(210, 9, 67);
  textSize(10);
  text(label, 18, y);
  if (value) {
    fill(190, 30, 90);
    textAlign(RIGHT);
    text(value, 212, y);
    textAlign(LEFT);
  }
}

function drawMicrotubule() {
  const panel = PANEL.tube;
  const originX = panel.x + 38;
  const originY = panel.y + 73;
  const dimerWidth = 10.2;
  const rowHeight = 20.5;
  const maxLength = Math.max(...modelState.lengths);

  fill(190, 15, 86);
  noStroke();
  textSize(13);
  textStyle(BOLD);
  text('REPRESENTATIVE MICROTUBULE', panel.x + 16, panel.y + 27);
  textStyle(NORMAL);
  fill(210, 8, 58);
  textSize(10);
  text('minus end', originX, originY - 17);
  textAlign(RIGHT);
  text('plus end →', panel.x + panel.w - 18, originY - 17);
  textAlign(LEFT);

  const eventMap = new Map();
  for (const event of modelState.events) eventMap.set(event.index, event.type);

  for (let row = 0; row < modelState.lengths.length; row++) {
    const y = originY + row * rowHeight;
    const depth = Math.sin((row / 13) * TWO_PI);
    const brightness = 66 + depth * 11;
    const saturation = 48 + Math.abs(depth) * 16;

    stroke(190, 30, 27, 0.55);
    line(originX - 5, y + 6, originX + maxLength * dimerWidth + 8, y + 6);

    for (let dimer = 0; dimer < modelState.lengths[row]; dimer++) {
      const hue = dimer % 2 === 0 ? 184 : 201;
      fill(hue, saturation, brightness);
      noStroke();
      rect(originX + dimer * dimerWidth, y, dimerWidth - 1, 12, 3);
    }

    const event = eventMap.get(row);
    if (event) {
      const x = originX + (modelState.lengths[row] - 1) * dimerWidth;
      noFill();
      stroke(event === 'attach' ? color(130, 65, 96) : color(8, 72, 98));
      strokeWeight(2);
      rect(x - 2, y - 2, dimerWidth + 3, 16, 4);
    }
  }

  drawFreeDimers(panel.x + panel.w - 58, panel.y + 70);
  drawSpinGate(panel.x + panel.w - 88, panel.y + panel.h - 75);
}

function drawFreeDimers(centerX, centerY) {
  for (let index = 0; index < 14; index++) {
    const angle = index * 2.399 + frameCount * 0.003;
    const radius = 18 + (index % 5) * 8;
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle * 1.3) * radius;
    noStroke();
    fill(index % 2 ? color(184, 48, 72, 0.7) : color(201, 50, 75, 0.7));
    ellipse(x, y, 7, 7);
  }
}

function drawSpinGate(x, y) {
  const ratio = modelState.last ? modelState.last.yieldRatio : 1;
  const singlet = TM.clamp(1 - (ratio - 0.45) / 0.9, 0, 1);

  fill(215, 20, 9, 0.92);
  stroke(210, 15, 30);
  rect(x - 72, y - 36, 148, 66, 6);
  noStroke();
  fill(210, 8, 62);
  textSize(9);
  text('REDUCED SPIN GATE', x - 62, y - 20);

  fill(202, 62, 86, 0.9);
  ellipse(x - 24, y + 4, 26 + 18 * singlet, 26 + 18 * singlet);
  fill(24, 70, 92, 0.8);
  ellipse(x + 25, y + 4, 26 + 18 * (1 - singlet), 26 + 18 * (1 - singlet));
  fill(0, 0, 96);
  textAlign(CENTER);
  text('S', x - 24, y + 7);
  text('T', x + 25, y + 7);
  textAlign(LEFT);
}

function recordHistory() {
  cHistory.push(modelState.cMT);
  roughnessHistory.push(modelState.last.metrics.roughnessDimers);
  timeHistory.push(modelState.time);
  if (cHistory.length > 180) {
    cHistory.shift();
    roughnessHistory.shift();
    timeHistory.shift();
  }
}

function drawHistoryChart() {
  const panel = PANEL.chart;
  const left = panel.x + 42;
  const top = panel.y + 43;
  const graphWidth = panel.w - 82;
  const graphHeight = panel.h - 70;

  fill(190, 15, 86);
  noStroke();
  textSize(13);
  textStyle(BOLD);
  text('HISTORY', panel.x + 16, panel.y + 25);
  textStyle(NORMAL);

  const roughnessStep = Math.max(
    1,
    Math.ceil(Math.max(4, ...roughnessHistory) / 4)
  );
  const roughnessMax = roughnessStep * 4;

  drawChartAxes(
    left,
    top,
    graphWidth,
    graphHeight,
    modelState.cTotal,
    roughnessMax
  );

  drawSeries(cHistory, 0, modelState.cTotal, color(185, 68, 92), left, top, graphWidth, graphHeight);
  drawSeries(
    roughnessHistory,
    0,
    roughnessMax,
    color(35, 72, 96),
    left,
    top,
    graphWidth,
    graphHeight
  );

  noStroke();
  fill(185, 68, 92);
  rect(panel.x + 295, panel.y + 17, 10, 3);
  fill(210, 8, 70);
  textSize(9);
  text('CMT (µM)', panel.x + 309, panel.y + 22);
  fill(35, 72, 96);
  rect(panel.x + 372, panel.y + 17, 10, 3);
  fill(210, 8, 70);
  text('tip roughness', panel.x + 386, panel.y + 22);
}

function drawChartAxes(x, y, w, h, concentrationMax, roughnessMax) {
  textSize(8);
  textStyle(NORMAL);

  for (let tick = 0; tick <= 5; tick++) {
    const fraction = tick / 5;
    const py = y + h - fraction * h;
    stroke(210, 10, 23);
    strokeWeight(1);
    line(x, py, x + w, py);

    noStroke();
    fill(185, 48, 82);
    textAlign(RIGHT, CENTER);
    text(String(Math.round(concentrationMax * fraction)), x - 7, py);
  }

  for (let tick = 0; tick <= 4; tick++) {
    const fraction = tick / 4;
    const py = y + h - fraction * h;
    noStroke();
    fill(35, 62, 90);
    textAlign(LEFT, CENTER);
    text(String(Math.round(roughnessMax * fraction)), x + w + 7, py);
  }

  stroke(210, 10, 38);
  line(x, y, x, y + h);
  line(x + w, y, x + w, y + h);
  line(x, y + h, x + w, y + h);

  const startTime = timeHistory.length ? timeHistory[0] : 0;
  const endTime = timeHistory.length ? timeHistory[timeHistory.length - 1] : 0;
  for (let tick = 0; tick <= 4; tick++) {
    const fraction = tick / 4;
    const px = x + fraction * w;
    const seconds = Math.round(startTime + (endTime - startTime) * fraction);
    noStroke();
    fill(210, 8, 57);
    textAlign(CENTER, TOP);
    text(`${seconds}s`, px, y + h + 7);
  }
  textAlign(LEFT);
}

function drawSeries(values, minimum, maximum, seriesColor, x, y, w, h) {
  if (values.length < 2 || maximum <= minimum) return;
  noFill();
  stroke(seriesColor);
  strokeWeight(1.6);
  beginShape();
  values.forEach((value, index) => {
    const px = x + map(index, 0, Math.max(values.length - 1, 1), 0, w);
    const py = y + h - map(value, minimum, maximum, 0, h);
    vertex(px, py);
  });
  endShape();
}

function drawMetrics() {
  const panel = PANEL.metrics;
  const last = modelState.last;
  if (!last) return;
  const metrics = last.metrics;
  const variableLength = Math.max(
    metrics.meanLengthDimers - TM.constants.BASE_VISIBLE_DIMERS,
    0
  );
  const representativeLengthNm = variableLength * TM.constants.DIMER_LENGTH_NM;

  fill(190, 15, 86);
  noStroke();
  textSize(13);
  textStyle(BOLD);
  text('PHYSICAL STATE', panel.x + 15, panel.y + 27);
  textStyle(NORMAL);

  let y = panel.y + 54;
  y = metricLine('CMT', `${modelState.cMT.toFixed(3)} µM`, y);
  y = metricLine('Polymerized fraction', `${(100 * modelState.cMT / modelState.cTotal).toFixed(1)}%`, y);
  y = metricLine('Representative length', `${representativeLengthNm.toFixed(0)} nm`, y);
  y = metricLine('Growth velocity', `${last.derivative.toFixed(4)} µM/s`, y);
  y = metricLine('Triplet-yield ratio', last.yieldRatio.toFixed(3), y);
  y = metricLine('Effective kd', `${last.effectiveKd.toFixed(4)} s⁻¹`, y);

  fill(190, 15, 86);
  textStyle(BOLD);
  text('RELAXATION CHANNELS', panel.x + 15, y + 16);
  textStyle(NORMAL);
  y += 41;
  y = metricLine('Molecular Γ', `${formatScientific(last.molecularGamma)} s⁻¹`, y);
  y = metricLine('EM thermal Γ', `${formatScientific(last.bath.thermalRate)} s⁻¹`, y);
  y = metricLine('Vacuum Γ', `${formatScientific(last.appliedVacuumRate)} s⁻¹`, y);

  const total = last.molecularGamma + last.appliedEmRate;
  const vacuumFraction = total > 0 ? last.appliedVacuumRate / total : 0;
  y = metricLine('Vacuum / total', formatScientific(vacuumFraction), y);
  drawRateBars(panel.x + 15, y + 7, panel.w - 30, last);
  y += 68;

  fill(190, 15, 86);
  textStyle(BOLD);
  text('ALGORITHMIC ECOLOGY METRICS', panel.x + 15, y);
  textStyle(NORMAL);
  y += 27;
  y = metricLine('Tip roughness', `${metrics.roughnessNm.toFixed(1)} nm`, y);
  y = metricLine('Tip spread', `${metrics.tipSpreadDimers} dimers`, y);
  y = metricGauge('Tip-profile Gini', metrics.tipProfileGini, y, 185);
  y = metricGauge('Tip-profile Jain', metrics.tipProfileJain, y, 42);
  y = metricLine('Attachment hazard CV', metrics.attachmentHazardDispersion.toFixed(3), y);
  y = metricLine('Detachment hazard CV', metrics.detachmentHazardDispersion.toFixed(3), y);

  fill(210, 7, 53);
  textSize(9);
  textLeading(13);
  text(
    'Gini and Jain use tip extension above the shortest protofilament. Read them with absolute roughness and growth.',
    panel.x + 15,
    y + 12,
    panel.w - 30
  );
}

function drawInfoBox() {
  const iconX = PANEL.metrics.x + PANEL.metrics.w - 38;
  const iconY = PANEL.metrics.y + 10;
  const iconSize = 22;
  const overIcon =
    mouseX >= iconX - 4 && mouseX <= iconX + iconSize + 4 &&
    mouseY >= iconY - 4 && mouseY <= iconY + iconSize + 4;

  push();
  noStroke();
  fill(185, 55, 88, overIcon || infoBoxOpen ? 1 : 0.72);
  ellipse(iconX + iconSize / 2, iconY + iconSize / 2, iconSize, iconSize);
  fill(215, 25, 10);
  textAlign(CENTER, CENTER);
  textSize(15);
  textStyle(BOLD);
  text('i', iconX + iconSize / 2, iconY + iconSize / 2 + 0.5);
  pop();

  if (!infoBoxOpen) return;

  const box = { x: 258, y: 90, w: 480, h: 620 };
  const close = { x: box.x + box.w - 34, y: box.y + 12, size: 20 };
  const content = [
    { heading: 'PHYSICAL CORE' },
    { text: 'A reduced radical-pair response changes bulk attachment and detachment kinetics. The model remains a qualitative bridge between spin dynamics and polymerization.' },
    { heading: 'ECOLOGICAL UNITS AND FLOWS' },
    { text: 'Thirteen protofilaments are local units drawing from a shared free-tubulin substrate. Their stochastic events combine into one tube geometry and a bulk polymerized concentration.' },
    { heading: 'EMERGENCE FROM LOCAL RULES' },
    { bullet: 'Noise creates unequal tip histories even when every protofilament follows identical rules.' },
    { bullet: 'Environmental heterogeneity creates persistent differences in local transition opportunities.' },
    { bullet: 'Adaptive tip feedback biases attachment toward shorter tips. It is an exploratory intervention, not an established microtubule mechanism.' },
    { heading: 'MOST RELEVANT METRICS' },
    { bullet: 'Tip roughness and spread measure collective morphology in physical units.' },
    { bullet: 'Tip-profile Gini and Jain indices show how protruding length is distributed above the shortest tip.' },
    { bullet: 'Attachment and detachment hazard CV expose heterogeneity in the local process.' },
    { heading: 'INTERPRET AS A METRIC ECOLOGY' },
    { text: 'No single score defines a preferred state. Normalized indices can hide physical scale, so compare them with roughness, polymerized concentration, and growth velocity.' },
    { heading: 'VACUUM TERM' },
    { text: 'Vacuum fluctuations are not a resource or adaptive force. They contribute only to spontaneous-transition rates and are negligible beside molecular relaxation at the physical default.' }
  ];

  push();
  fill(215, 28, 7, 0.985);
  stroke(185, 45, 76);
  strokeWeight(1.5);
  rect(box.x, box.y, box.w, box.h, 9);

  noStroke();
  fill(190, 20, 96);
  textAlign(LEFT, TOP);
  textSize(17);
  textStyle(BOLD);
  text('Algorithmic Ecology of the Model', box.x + 18, box.y + 18);
  textStyle(NORMAL);
  textSize(10);
  fill(210, 8, 58);
  text('Local rules · shared flows · heterogeneity · feedback · emergence', box.x + 18, box.y + 43);

  let textY = box.y + 72;
  const textX = box.x + 18;
  const textWidthValue = box.w - 42;
  for (const item of content) {
    if (item.heading) {
      textY += 6;
      fill(185, 40, 90);
      textSize(10);
      textStyle(BOLD);
      text(item.heading, textX, textY);
      textY += 19;
      continue;
    }

    fill(0, 0, 86);
    textSize(10);
    textStyle(NORMAL);
    const prefix = item.bullet ? '• ' : '';
    const lines = wrapInfoText(prefix + (item.bullet || item.text), textWidthValue);
    for (const line of lines) {
      text(line, textX, textY);
      textY += 14;
    }
    textY += item.bullet ? 3 : 7;
  }

  const overClose =
    mouseX >= close.x && mouseX <= close.x + close.size &&
    mouseY >= close.y && mouseY <= close.y + close.size;
  fill(185, 55, 90, overClose ? 1 : 0.7);
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(17);
  textStyle(BOLD);
  text('×', close.x + close.size / 2, close.y + close.size / 2);
  pop();
}

function wrapInfoText(value, maximumWidth) {
  const words = value.split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (textWidth(candidate) > maximumWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function mousePressed() {
  const iconX = PANEL.metrics.x + PANEL.metrics.w - 38;
  const iconY = PANEL.metrics.y + 10;
  const iconSize = 22;
  const overIcon =
    mouseX >= iconX - 4 && mouseX <= iconX + iconSize + 4 &&
    mouseY >= iconY - 4 && mouseY <= iconY + iconSize + 4;

  if (overIcon) {
    infoBoxOpen = !infoBoxOpen;
    return false;
  }

  if (infoBoxOpen) {
    const closeX = 258 + 480 - 34;
    const closeY = 90 + 12;
    if (
      mouseX >= closeX && mouseX <= closeX + 20 &&
      mouseY >= closeY && mouseY <= closeY + 20
    ) {
      infoBoxOpen = false;
      return false;
    }
  }
  return true;
}

function metricLine(label, value, y) {
  fill(210, 8, 61);
  textSize(10);
  text(label, PANEL.metrics.x + 15, y);
  fill(190, 25, 91);
  textAlign(RIGHT);
  text(value, PANEL.metrics.x + PANEL.metrics.w - 15, y);
  textAlign(LEFT);
  return y + 22;
}

function metricGauge(label, value, y, hue) {
  const panel = PANEL.metrics;
  const barX = panel.x + 120;
  const barWidth = 58;
  const bounded = constrain(value, 0, 1);
  fill(210, 8, 61);
  textSize(10);
  textAlign(LEFT);
  text(label, panel.x + 15, y);
  fill(210, 10, 18);
  rect(barX, y - 8, barWidth, 7, 3);
  fill(hue, 65, 88);
  rect(barX, y - 8, bounded * barWidth, 7, 3);
  fill(190, 25, 91);
  textAlign(RIGHT);
  text(value.toFixed(3), panel.x + panel.w - 15, y);
  textAlign(LEFT);
  return y + 22;
}

function drawRateBars(x, y, widthValue, last) {
  const rates = [
    { label: 'Molecular', value: last.molecularGamma, hue: 185 },
    { label: 'EM thermal', value: last.bath.thermalRate, hue: 42 },
    { label: 'Vacuum', value: last.appliedVacuumRate, hue: 285 }
  ];
  const logs = rates.map(rate => Math.log10(Math.max(rate.value, 1e-45)));
  const maximum = Math.max(...logs);
  const minimum = Math.min(-20, ...logs);
  const labelWidth = 58;
  const barX = x + labelWidth;
  const barWidth = widthValue - labelWidth;

  rates.forEach((rate, index) => {
    const normalized = (logs[index] - minimum) / Math.max(maximum - minimum, 1);
    fill(210, 8, 62);
    noStroke();
    textAlign(LEFT, CENTER);
    textSize(8);
    text(rate.label, x, y + index * 14 + 4);
    fill(210, 10, 18);
    rect(barX, y + index * 14, barWidth, 7, 3);
    fill(rate.hue, 65, 88);
    rect(barX, y + index * 14, Math.max(1, normalized * barWidth), 7, 3);
  });
  textAlign(LEFT);
}

function formatField(fieldMilliTesla) {
  if (fieldMilliTesla < 0.01) return `${(fieldMilliTesla * 1000).toFixed(2)} µT`;
  return `${fieldMilliTesla.toFixed(3)} mT`;
}

function formatScientific(value) {
  if (value === 0) return '0';
  if (!Number.isFinite(value)) return '—';
  return value.toExponential(2);
}
