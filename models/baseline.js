;(function () {
    let p5Instance = null;
    let ui = [];
    let agents = [];
    let fairnessSystem = null;
    let entropyHistory = [];
    let maxEntropyHistory = 200;

    // controls
    let fairnessSensitivitySlider, neighborhoodRadiusSlider, noiseLevelSlider, agentCountSlider;
    let canvasWidthSlider, canvasHeightSlider, weightDistributionSlider;
    let lastWeightDistribution = 1.0;

    function clearUI() {
        ui.forEach(el => { try { el.remove(); } catch (e) {} });
        ui = [];
    }

    function mount(container) {
        const sketch = (p) => {
            p.setup = function () {
                const w = 1000, h = 800;
                p.createCanvas(w, h);
                p.colorMode(p.HSB, 360, 100, 100, 1);

                fairnessSystem = new window.FairnessSystem();
                createControls(p);
                initializeAgents(p, 50);
            };

            p.draw = function () {
                // resize
                const newW = canvasWidthSlider.value();
                const newH = canvasHeightSlider.value();
                if (newW !== p.width || newH !== p.height) {
                    p.resizeCanvas(newW, newH);
                }

                // agent count
                const target = agentCountSlider.value();
                if (agents.length !== target) {
                    if (agents.length < target) {
                        for (let i = agents.length; i < target; i++) {
                            let x = p.random(50, p.width - 50);
                            let y = p.random(50, p.height - 50);
                            let utility = p.random(0.3, 0.7);
                            let weight = p.random(0.5, 1.5) * weightDistributionSlider.value();
                            agents.push(new window.FairAgent(p, x, y, utility, weight));
                        }
                    } else {
                        agents = agents.slice(0, target);
                    }
                }

                // weights changed
                const currentWeightDist = weightDistributionSlider.value();
                if (Math.abs(currentWeightDist - lastWeightDistribution) > 0.05) {
                    for (let a of agents) {
                        a.weight = p.random(0.5, 1.5) * currentWeightDist;
                    }
                    lastWeightDistribution = currentWeightDist;
                }

                // background by fairness
                const fc = fairnessSystem.calculateFairnessCoefficient(agents);
                const bgBrightness = p.map(fc, 0, 1, 5, 15);
                const bgHue = p.map(fc, 0, 1, 0, 120);
                p.background(bgHue, 30, bgBrightness);

                // low-fairness noise
                if (fc < 0.4) {
                    p.push();
                    p.blendMode(p.OVERLAY);
                    for (let i = 0; i < 20; i++) {
                        p.fill(p.random(360), 50, p.random(10, 30), 0.1);
                        p.noStroke();
                        p.ellipse(p.random(p.width), p.random(p.height), p.random(5, 15), p.random(5, 15));
                    }
                    p.pop();
                }

                // update agents
                for (let a of agents) {
                    a.update(agents,
                        neighborhoodRadiusSlider.value(),
                        noiseLevelSlider.value(),
                        fairnessSensitivitySlider.value());
                    // Boundary wrapping
                    if (a.pos.x < 0) a.pos.x = p.width;
                    if (a.pos.x > p.width) a.pos.x = 0;
                    if (a.pos.y < 0) a.pos.y = p.height;
                    if (a.pos.y > p.height) a.pos.y = 0;
                }

                // metrics
                const metrics = fairnessSystem.calculateAllMetrics(agents);
                entropyHistory.push(metrics.entropy);
                if (entropyHistory.length > maxEntropyHistory) entropyHistory.shift();

                if (metrics.fc > 0.5) drawConnections(p, metrics.fc);
                for (let a of agents) a.display(metrics.fc);
                displayMetrics(p, metrics);
                displayEntropyGraph(p);
                displayControlLabels(p);
            };
        };
        p5Instance = new p5(sketch, container);
    }

    function unmount() {
        if (p5Instance) { p5Instance.remove(); p5Instance = null; }
        clearUI();
        agents = [];
        fairnessSystem = null;
        entropyHistory = [];
    }

    function createControls(p) {
        let controlY = 10;
        let controlSpacing = 30;
        fairnessSensitivitySlider = p.createSlider(0, 1, 0.3, 0.01);
        fairnessSensitivitySlider.position(10, controlY);
        fairnessSensitivitySlider.style('width', '200px'); ui.push(fairnessSensitivitySlider);

        neighborhoodRadiusSlider = p.createSlider(20, 200, 80, 5);
        neighborhoodRadiusSlider.position(10, controlY + controlSpacing);
        neighborhoodRadiusSlider.style('width', '200px'); ui.push(neighborhoodRadiusSlider);

        noiseLevelSlider = p.createSlider(0, 2, 0.5, 0.1);
        noiseLevelSlider.position(10, controlY + controlSpacing * 2);
        noiseLevelSlider.style('width', '200px'); ui.push(noiseLevelSlider);

        agentCountSlider = p.createSlider(10, 200, 50, 5);
        agentCountSlider.position(10, controlY + controlSpacing * 3);
        agentCountSlider.style('width', '200px'); ui.push(agentCountSlider);

        canvasWidthSlider = p.createSlider(400, 1600, 1000, 50);
        canvasWidthSlider.position(10, controlY + controlSpacing * 4);
        canvasWidthSlider.style('width', '200px'); ui.push(canvasWidthSlider);

        canvasHeightSlider = p.createSlider(300, 1200, 800, 50);
        canvasHeightSlider.position(10, controlY + controlSpacing * 5);
        canvasHeightSlider.style('width', '200px'); ui.push(canvasHeightSlider);

        weightDistributionSlider = p.createSlider(0.1, 3, 1, 0.1);
        weightDistributionSlider.position(10, controlY + controlSpacing * 6);
        weightDistributionSlider.style('width', '200px'); ui.push(weightDistributionSlider);
    }

    function initializeAgents(p, count) {
        agents = [];
        for (let i = 0; i < count; i++) {
            let x = p.random(50, p.width - 50);
            let y = p.random(50, p.height - 50);
            let utility = p.random(0.3, 0.7);
            let weight = p.random(0.5, 1.5) * (weightDistributionSlider ? weightDistributionSlider.value() : 1);
            agents.push(new window.FairAgent(p, x, y, utility, weight));
        }
        lastWeightDistribution = weightDistributionSlider ? weightDistributionSlider.value() : 1;
    }

    function displayMetrics(p, metrics) {
        p.push();
        p.fill(0, 0, 100, 0.85);
        p.stroke(0, 0, 60, 0.5);
        p.strokeWeight(1);
        p.rect(p.width - 250, 10, 240, 200);
        p.fill(0, 0, 0);
        p.textAlign(p.LEFT);
        p.textSize(13);
        p.textStyle(p.BOLD);
        p.text("System Metrics", p.width - 240, 28);
        p.textStyle(p.NORMAL);
        p.textSize(11);
        p.fill(0, 0, 20);
        p.text(`Fairness Coefficient: ${metrics.fc.toFixed(3)}`, p.width - 240, 48);
        p.text(`Weighted FC: ${metrics.weightedFC.toFixed(3)}`, p.width - 240, 65);
        p.text(`Mean Utility: ${metrics.meanUtility.toFixed(3)}`, p.width - 240, 82);
        p.text(`Variance: ${metrics.variance.toFixed(4)}`, p.width - 240, 99);
        p.text(`Entropy: ${metrics.entropy.toFixed(4)}`, p.width - 240, 116);
        // bar
        const barWidth = 200, barHeight = 8, barX = p.width - 240, barY = 135;
        p.fill(0, 0, 30); p.noStroke(); p.rect(barX, barY, barWidth, barHeight);
        const fcColor = metrics.fc > 0.6 ? p.color(120, 80, 80) : metrics.fc > 0.4 ? p.color(60, 80, 80) : p.color(0, 80, 80);
        p.fill(fcColor); p.rect(barX, barY, barWidth * metrics.fc, barHeight);
        const state = metrics.fc > 0.8 ? "Harmonious" : metrics.fc > 0.6 ? "Balanced" : metrics.fc > 0.4 ? "Turbulent" : "Chaotic";
        p.fill(metrics.fc > 0.6 ? 120 : metrics.fc > 0.4 ? 60 : 0, 80, 80);
        p.textSize(12); p.textStyle(p.BOLD);
        p.text(`State: ${state}`, p.width - 240, 160);
        p.textStyle(p.NORMAL);
        const mood = metrics.fc > 0.75 ? "😊 Content" : metrics.fc > 0.5 ? "😐 Neutral" : metrics.fc > 0.25 ? "😟 Stressed" : "😰 Distressed";
        p.textSize(11); p.fill(0, 0, 20);
        p.text(`Mood: ${mood}`, p.width - 240, 180);
        p.pop();
    }

    function displayEntropyGraph(p) {
        if (entropyHistory.length < 2) return;
        p.push();
        const graphWidth = 300, graphHeight = 150;
        const graphX = p.width - graphWidth - 10, graphY = p.height - graphHeight - 10;
        p.fill(0, 0, 20, 0.85); p.stroke(0, 0, 60, 0.5); p.strokeWeight(1);
        p.rect(graphX, graphY, graphWidth, graphHeight);
        p.fill(0, 0, 100); p.textSize(11); p.textAlign(p.LEFT); p.textStyle(p.BOLD);
        p.text("Entropy Over Time", graphX + 5, graphY + 15); p.textStyle(p.NORMAL);
        // bounds with padding
        let minEntropy = Math.min(...entropyHistory);
        let maxEntropy = Math.max(...entropyHistory);
        let entropyRange = maxEntropy - minEntropy;
        if (entropyRange < 0.01) {
            entropyRange = 0.1;
            const center = (minEntropy + maxEntropy) / 2;
            minEntropy = Math.max(0, center - entropyRange / 2);
            maxEntropy = Math.min(1, center + entropyRange / 2);
        }
        const padding = entropyRange * 0.15;
        minEntropy = Math.max(0, minEntropy - padding);
        maxEntropy = Math.min(1, maxEntropy + padding);
        entropyRange = maxEntropy - minEntropy;
        // grid
        p.stroke(0, 0, 40, 0.3); p.strokeWeight(1);
        for (let i = 0; i <= 4; i++) {
            const y = p.map(i / 4, 0, 1, graphY + graphHeight - 10, graphY + 30);
            p.line(graphX + 10, y, graphX + graphWidth - 10, y);
        }
        // line
        p.noFill(); p.strokeWeight(2); p.stroke(200, 80, 80); p.beginShape();
        for (let i = 0; i < entropyHistory.length; i++) {
            const x = p.map(i, 0, entropyHistory.length - 1, graphX + 10, graphX + graphWidth - 10);
            const y = p.map(entropyHistory[i], minEntropy, maxEntropy, graphY + graphHeight - 10, graphY + 30);
            p.vertex(x, y);
        }
        p.endShape();
        // fill
        p.fill(200, 80, 80, 0.2); p.noStroke(); p.beginShape();
        p.vertex(graphX + 10, graphY + graphHeight - 10);
        for (let i = 0; i < entropyHistory.length; i++) {
            const x = p.map(i, 0, entropyHistory.length - 1, graphX + 10, graphX + graphWidth - 10);
            const y = p.map(entropyHistory[i], minEntropy, maxEntropy, graphY + graphHeight - 10, graphY + 30);
            p.vertex(x, y);
        }
        p.vertex(graphX + graphWidth - 10, graphY + graphHeight - 10);
        p.endShape(p.CLOSE);
        // labels + current
        p.fill(0, 0, 60); p.textSize(8); p.textAlign(p.LEFT);
        p.text(`${minEntropy.toFixed(2)}`, graphX + 5, graphY + graphHeight - 5);
        p.text(`${maxEntropy.toFixed(2)}`, graphX + 5, graphY + 30);
        const currentEntropy = entropyHistory[entropyHistory.length - 1];
        const x = graphX + graphWidth - 10;
        const y = p.map(currentEntropy, minEntropy, maxEntropy, graphY + graphHeight - 10, graphY + 30);
        p.fill(200, 80, 80); p.noStroke(); p.ellipse(x, y, 6, 6);
        p.pop();
    }

    function displayControlLabels(p) {
        p.push(); p.fill(0, 0, 100, 0.9); p.textAlign(p.LEFT); p.textSize(10);
        let y = 10, spacing = 30;
        p.text(`Fairness Sensitivity: ${fairnessSensitivitySlider.value().toFixed(2)}`, 220, y + 5);
        p.text(`Neighborhood Radius: ${neighborhoodRadiusSlider.value()}`, 220, y + spacing + 5);
        p.text(`Noise Level: ${noiseLevelSlider.value().toFixed(1)}`, 220, y + spacing * 2 + 5);
        p.text(`Agent Count: ${agentCountSlider.value()}`, 220, y + spacing * 3 + 5);
        p.text(`Canvas: ${canvasWidthSlider.value()}×${canvasHeightSlider.value()}`, 220, y + spacing * 4 + 5);
        p.text(`Weight Distribution: ${weightDistributionSlider.value().toFixed(1)}`, 220, y + spacing * 5 + 5);
        p.pop();
    }

    function drawConnections(p, fc) {
        const radius = neighborhoodRadiusSlider.value();
        p.push(); p.stroke(200, 50, 80, p.map(fc, 0.5, 1, 0.1, 0.3)); p.strokeWeight(1); p.noFill();
        for (let i = 0; i < agents.length; i++) {
            for (let j = i + 1; j < agents.length; j++) {
                const dist = p.dist(agents[i].pos.x, agents[i].pos.y, agents[j].pos.x, agents[j].pos.y);
                if (dist < radius * 0.8) {
                    const alpha = p.map(dist, 0, radius * 0.8, 0.3, 0.05);
                    p.stroke(200, 50, 80, alpha);
                    p.line(agents[i].pos.x, agents[i].pos.y, agents[j].pos.x, agents[j].pos.y);
                }
            }
        }
        p.pop();
    }

    window.Models = window.Models || {};
    window.Models.baseline = { mount, unmount };
})();


