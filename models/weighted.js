;(function () {
    let p5Instance = null;
    let ui = [];
    let agents = [];
    let fairnessSystem = null;

    let agentCountSlider, neighborhoodRadiusSlider, weightSkewSlider;

    function clearUI() {
        ui.forEach(el => { try { el.remove(); } catch (e) {} });
        ui = [];
    }

    function mount(container) {
        const sketch = (p) => {
            p.setup = function () {
                p.createCanvas(1000, 800);
                p.colorMode(p.HSB, 360, 100, 100, 1);
                fairnessSystem = new window.FairnessSystem();
                createControls(p);
                initializeAgents(p, agentCountSlider.value());
            };
            p.draw = function () {
                const fcWeighted = fairnessSystem.calculateWeightedFairness(agents);
                const bgHue = p.map(fcWeighted, 0, 1, 0, 120);
                const bgBrightness = p.map(fcWeighted, 0, 1, 5, 18);
                p.background(bgHue, 25, bgBrightness);

                // update weights dynamically based on skew slider
                const skew = weightSkewSlider.value();
                for (let i = 0; i < agents.length; i++) {
                    const t = i / (agents.length - 1 || 1);
                    // exponential skew of weights
                    agents[i].weight = Math.max(0.2, Math.pow(1 + t, skew));
                }

                // update using stronger sensitivity to emphasize weighted effects
                for (let a of agents) {
                    a.update(agents, neighborhoodRadiusSlider.value(), 0.3, 0.5);
                    // Boundary wrapping
                    if (a.pos.x < 0) a.pos.x = p.width;
                    if (a.pos.x > p.width) a.pos.x = 0;
                    if (a.pos.y < 0) a.pos.y = p.height;
                    if (a.pos.y > p.height) a.pos.y = 0;
                }

                // display agents using FairAgent display method
                for (let a of agents) {
                    a.display(fcWeighted);
                }

                displayPanel(p, fcWeighted);
            };
        };
        p5Instance = new p5(sketch, container);
    }

    function unmount() {
        if (p5Instance) { p5Instance.remove(); p5Instance = null; }
        clearUI();
        agents = [];
        fairnessSystem = null;
    }

    function createControls(p) {
        let y = 10, s = 30;
        agentCountSlider = p.createSlider(20, 250, 120, 5); agentCountSlider.position(10, y); agentCountSlider.style('width', '200px'); ui.push(agentCountSlider);
        neighborhoodRadiusSlider = p.createSlider(20, 220, 90, 5); neighborhoodRadiusSlider.position(10, y + s); neighborhoodRadiusSlider.style('width', '200px'); ui.push(neighborhoodRadiusSlider);
        weightSkewSlider = p.createSlider(0, 4, 2, 0.1); weightSkewSlider.position(10, y + s * 2); weightSkewSlider.style('width', '200px'); ui.push(weightSkewSlider);
        agentCountSlider.input(() => initializeAgents(p, agentCountSlider.value()));
    }

    function initializeAgents(p, count) {
        agents = [];
        for (let i = 0; i < count; i++) {
            const x = p.random(50, p.width - 50);
            const y = p.random(50, p.height - 50);
            const utility = p.random(0.2, 0.9);
            const weight = 1;
            agents.push(new window.FairAgent(p, x, y, utility, weight));
        }
    }

    function displayPanel(p, fcWeighted) {
        const metrics = fairnessSystem.calculateAllMetrics(agents);
        p.push();
        p.fill(0, 0, 100, 0.85);
        p.stroke(0, 0, 60, 0.5);
        p.rect(p.width - 260, 10, 250, 120);
        p.fill(0, 0, 0); p.textSize(13); p.textStyle(p.BOLD);
        p.text('Weighted Fairness', p.width - 250, 28);
        p.textStyle(p.NORMAL); p.textSize(11); p.fill(0, 0, 20);
        p.text(`Weighted FC: ${metrics.weightedFC.toFixed(3)}`, p.width - 250, 50);
        p.text(`Standard FC: ${metrics.fc.toFixed(3)}`, p.width - 250, 66);
        p.text(`Mean Utility: ${metrics.meanUtility.toFixed(3)}`, p.width - 250, 82);
        p.text(`Agents: ${agents.length}`, p.width - 250, 98);
        p.pop();
    }

    window.Models = window.Models || {};
    window.Models.weighted = { mount, unmount };
})();


