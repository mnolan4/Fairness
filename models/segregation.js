;(function () {
    let p5Instance = null;
    let ui = [];
    let agents = [];
    let neighborhoodRadiusSlider, intoleranceSlider, densitySlider;

    function clearUI() { ui.forEach(el => { try { el.remove(); } catch (e) {} }); ui = []; }

    function mount(container) {
        const sketch = (p) => {
            p.setup = function () {
                p.createCanvas(1000, 800);
                p.colorMode(p.HSB, 360, 100, 100, 1);
                createControls(p);
                initializeAgents(p);
            };
            p.draw = function () {
                p.background(210, 10, 12);
                const radius = neighborhoodRadiusSlider.value();
                const intolerance = intoleranceSlider.value();
                // Move unsatisfied agents toward less dense regions
                const grid = Math.max(10, Math.floor(radius / 2));
                for (let a of agents) {
                    const neighbors = getNeighbors(a, radius);
                    const myGroup = a.group;
                    const same = neighbors.filter(n => n.group === myGroup).length;
                    const propSame = neighbors.length ? same / neighbors.length : 1;
                    a.satisfied = propSame >= (1 - intolerance);
                    // drift
                    if (!a.satisfied) {
                        const angle = p.random(p.TWO_PI);
                        a.x += Math.cos(angle) * 2;
                        a.y += Math.sin(angle) * 2;
                    } else {
                        a.x += p.random(-0.5, 0.5);
                        a.y += p.random(-0.5, 0.5);
                    }
                    // wrap
                    if (a.x < 0) a.x = p.width;
                    if (a.x > p.width) a.x = 0;
                    if (a.y < 0) a.y = p.height;
                    if (a.y > p.height) a.y = 0;
                }
                // draw connections to same-group neighbors
                p.push();
                for (let i = 0; i < agents.length; i++) {
                    for (let j = i + 1; j < agents.length; j++) {
                        const ai = agents[i], aj = agents[j];
                        const d = p.dist(ai.x, ai.y, aj.x, aj.y);
                        if (d < radius * 0.6 && ai.group === aj.group) {
                            const hue = ai.group === 0 ? 200 : 20;
                            p.stroke(hue, 60, 60, p.map(d, 0, radius * 0.6, 0.4, 0.05));
                            p.line(ai.x, ai.y, aj.x, aj.y);
                        }
                    }
                }
                p.pop();
                // draw agents
                for (let a of agents) {
                    const hue = a.group === 0 ? 200 : 20;
                    const br = a.satisfied ? 80 : 40;
                    p.noStroke();
                    p.fill(hue, 70, br, 0.95);
                    p.ellipse(a.x, a.y, 10, 10);
                }
            };
        };
        p5Instance = new p5(sketch, container);
    }

    function unmount() {
        if (p5Instance) { p5Instance.remove(); p5Instance = null; }
        clearUI();
        agents = [];
    }

    function createControls(p) {
        let y = 10, s = 30;
        neighborhoodRadiusSlider = p.createSlider(20, 200, 80, 5); neighborhoodRadiusSlider.position(10, y); neighborhoodRadiusSlider.style('width', '200px'); ui.push(neighborhoodRadiusSlider);
        intoleranceSlider = p.createSlider(0, 0.9, 0.3, 0.01); intoleranceSlider.position(10, y + s); intoleranceSlider.style('width', '200px'); ui.push(intoleranceSlider);
        densitySlider = p.createSlider(0.2, 1, 0.6, 0.05); densitySlider.position(10, y + s * 2); densitySlider.style('width', '200px'); ui.push(densitySlider);
        densitySlider.input(() => initializeAgents(p));
    }

    function initializeAgents(p) {
        const count = Math.floor(600 * densitySlider.value());
        agents = [];
        for (let i = 0; i < count; i++) {
            agents.push({
                x: p.random(30, p.width - 30),
                y: p.random(30, p.height - 30),
                group: Math.random() < 0.5 ? 0 : 1,
                satisfied: true
            });
        }
    }

    function getNeighbors(a, radius) {
        const out = [];
        for (let b of agents) {
            if (a === b) continue;
            const dx = a.x - b.x, dy = a.y - b.y;
            if (dx * dx + dy * dy < radius * radius) out.push(b);
        }
        return out;
    }

    window.Models = window.Models || {};
    window.Models.segregation = { mount, unmount };
})();


