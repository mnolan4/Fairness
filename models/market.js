;(function () {
    let p5Instance = null;
    let ui = [];
    let agents = [];
    let tradeRateSlider, agentCountSlider, volatilitySlider;
    let fairnessSystem = null;

    function clearUI() { ui.forEach(el => { try { el.remove(); } catch (e) {} }); ui = []; }

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
                const fc = fairnessSystem.calculateFairnessCoefficient(agents);
                const hue = p.map(fc, 0, 1, 0, 120);
                p.background(hue, 20, 14);

                // random pairing trades
                const trades = Math.floor(agents.length * tradeRateSlider.value());
                for (let i = 0; i < trades; i++) {
                    const a = agents[Math.floor(Math.random() * agents.length)];
                    const b = agents[Math.floor(Math.random() * agents.length)];
                    if (a === b) continue;
                    trade(a, b, p);
                }

                // drift positions
                for (let a of agents) {
                    a.x += p.random(-1, 1);
                    a.y += p.random(-1, 1);
                    if (a.x < 0) a.x = p.width; if (a.x > p.width) a.x = 0;
                    if (a.y < 0) a.y = p.height; if (a.y > p.height) a.y = 0;
                }

                // draw links showing trades propensity
                p.push(); p.stroke(40, 10, 60, 0.2);
                for (let i = 0; i < agents.length; i++) {
                    for (let j = i + 1; j < agents.length; j++) {
                        const d = p.dist(agents[i].x, agents[i].y, agents[j].x, agents[j].y);
                        if (d < 60) {
                            p.line(agents[i].x, agents[i].y, agents[j].x, agents[j].y);
                        }
                    }
                }
                p.pop();

                // draw agents (wealth ~ size, utility ~ hue)
                for (let a of agents) {
                    const size = p.map(a.wealth, 0.1, 5, 6, 24);
                    const uh = p.map(a.utility, 0.1, 1, 240, 60);
                    p.noStroke(); p.fill(uh, 70, 70, 0.95);
                    p.ellipse(a.x, a.y, size, size);
                }

                // panel
                const metrics = fairnessSystem.calculateAllMetrics(agents);
                displayPanel(p, metrics);
            };
        };
        p5Instance = new p5(sketch, container);
    }

    function unmount() {
        if (p5Instance) { p5Instance.remove(); p5Instance = null; }
        clearUI(); agents = []; fairnessSystem = null;
    }

    function createControls(p) {
        let y = 10, s = 30;
        agentCountSlider = p.createSlider(20, 200, 80, 5); agentCountSlider.position(10, y); agentCountSlider.style('width', '200px'); ui.push(agentCountSlider);
        tradeRateSlider = p.createSlider(0, 5, 1.2, 0.1); tradeRateSlider.position(10, y + s); tradeRateSlider.style('width', '200px'); ui.push(tradeRateSlider);
        volatilitySlider = p.createSlider(0, 1, 0.3, 0.01); volatilitySlider.position(10, y + s * 2); volatilitySlider.style('width', '200px'); ui.push(volatilitySlider);
        agentCountSlider.input(() => initializeAgents(p, agentCountSlider.value()));
    }

    function initializeAgents(p, count) {
        agents = [];
        for (let i = 0; i < count; i++) {
            agents.push({
                x: p.random(30, p.width - 30),
                y: p.random(30, p.height - 30),
                utility: p.random(0.2, 0.9),
                weight: p.random(0.6, 1.4),
                wealth: p.random(0.2, 2)
            });
        }
    }

    function trade(a, b, p) {
        // price fluctuation
        const price = 1 + (p.random(-volatilitySlider.value(), volatilitySlider.value()) * 0.2);
        // trade size scaled by mismatch of utility/weight ratios
        const ra = a.utility / a.weight;
        const rb = b.utility / b.weight;
        const gap = Math.abs(ra - rb);
        const flow = Math.min(a.wealth, 0.05 + gap * 0.1);
        if (ra > rb) {
            a.wealth -= flow; b.wealth += flow * price;
            a.utility -= flow * 0.02; b.utility += flow * 0.02;
        } else if (rb > ra) {
            b.wealth -= flow; a.wealth += flow * price;
            b.utility -= flow * 0.02; a.utility += flow * 0.02;
        }
        a.utility = Math.max(0.1, Math.min(1, a.utility));
        b.utility = Math.max(0.1, Math.min(1, b.utility));
    }

    function displayPanel(p, metrics) {
        p.push();
        p.fill(0, 0, 100, 0.85);
        p.stroke(0, 0, 60, 0.5);
        p.rect(p.width - 260, 10, 250, 120);
        p.fill(0, 0, 0); p.textSize(13); p.textStyle(p.BOLD);
        p.text('Market Exchange', p.width - 250, 28);
        p.textStyle(p.NORMAL); p.textSize(11); p.fill(0, 0, 20);
        p.text(`FC: ${metrics.fc.toFixed(3)}`, p.width - 250, 50);
        p.text(`Mean Utility: ${metrics.meanUtility.toFixed(3)}`, p.width - 250, 66);
        p.text(`Variance: ${metrics.variance.toFixed(4)}`, p.width - 250, 82);
        p.text(`Agents: ${agents.length}`, p.width - 250, 98);
        p.pop();
    }

    window.Models = window.Models || {};
    window.Models.market = { mount, unmount };
})();


