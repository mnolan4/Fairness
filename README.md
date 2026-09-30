# AE Labs

**Algorithmic Ecologies Laboratory**

*Interactive models of emergence, allocation, adaptation, and collective behavior.*

**Live site:** [https://mnolan4.github.io/Fairness/](https://mnolan4.github.io/Fairness/)

AE Labs is an evolving collection of interactive computational experiments exploring how simple rules, local interactions, constraints, and feedback produce complex collective behavior. The project began as an exploration of computational fairness and has expanded into a broader study of emergent systems, allocation, adaptation, and collective dynamics.

Fairness Systems remains the origin and first major research thread. The original model names are kept as a record of that genealogy.

## 🌟 Overview

AE Labs explores how local rules, constraints, incentives, and flows produce larger patterns of collective behavior — across fairness and inequality, allocation, redistribution, adaptation, equilibrium, cooperation, competition, segregation, consensus, information flow, stochastic processes, diffusion, networks, ecological dynamics, game theory, and multi-agent systems.

**Core Principle:** Complex collective outcomes can arise from simple local rules. Fairness is one important lens: not a static state, but a dynamic equilibrium achieved through continuous local adjustments.

## 🎯 Features

- **19 Interactive Models** - Fairness, diffusion, networks, ecology, game theory, and related systems
- **Real-time Visualizations** - Watch fairness patterns emerge dynamically
- **Interactive Controls** - Adjust parameters and observe system behavior
- **Comprehensive Metrics** - Track fairness coefficients, entropy, variance, and more
- **Elegant UI** - Hover-based navigation with bracket-style menu
- **Detailed Documentation** - Info boxes with model descriptions and interpretations

## 📋 Models

### 1. Baseline Model
**Standard fairness coefficient with full metrics and entropy tracking**

The fundamental fairness coefficient calculation. Agents continuously adjust their utility based on local neighborhood fairness, creating emergent patterns of equity through decentralized interactions.

**Key Metrics:**
- Fairness Coefficient (FC)
- Weighted FC
- Entropy
- Variance
- Mean Utility

### 2. Weighted Fairness
**Emphasizes weighted fairness dynamics with adjustable weight distribution**

Recognizes that agents may have different significance. Fairness means equal utility per unit weight, not equal utility. This model shows how fairness adapts when agents have varying importance.

**Key Metrics:**
- Weighted FC
- Standard FC
- Weight Skew

### 3. Segregation Analog
**Schelling-like model showing local segregation patterns with fairness overlays**

A Schelling-like model demonstrating how local preferences create segregation patterns. Agents are satisfied when enough neighbors share their group, revealing how micro-preferences lead to macro-segregation.

**Key Metrics:**
- Segregation Index
- Satisfaction Rate
- Group Mixing

### 4. Market Exchange
**Resource exchange analog with trading dynamics and wealth distribution**

Agents trade resources based on utility/weight ratio mismatches. Wealth (size) and utility (color) change through exchanges. Fair markets redistribute wealth through voluntary exchange.

**Key Metrics:**
- Fairness Coefficient
- Mean Utility
- Variance
- Trade Rate

### 5. Temporal Fairness (Memory Model)
**Memory-based model with glowing orbs and fading trails showing fairness memory**

Agents maintain a memory of past fairness experiences, blending real-time fairness with historical memory. Glowing orbs leave fading trails showing their fairness memory over time.

**Key Metrics:**
- Memory-weighted FC
- Temporal Variance
- Stability Index

### 6. Energy Redistribution (Thermodynamic)
**Thermodynamic analog with heat map visualization and temperature diffusion**

Agents carry energy (temperature) that diffuses through the system like heat. The heat map visualization shows how energy spreads from hot (red) to cold (blue) regions until equilibrium.

**Key Metrics:**
- Energy Entropy
- Temperature Variance
- Diffusion Rate

### 7. Information Fairness (Network Influence)
**Dynamic graph network where node brightness and edge thickness show influence**

A dynamic network where nodes represent agents and edges show influence connections. Node brightness indicates information access; edge thickness shows connection strength.

**Key Metrics:**
- Network Fairness
- Centrality Variance
- Information Entropy

### 8. Ecological Fairness (Resource-Population)
**Living terrain grid with resource-population feedback and sustainability**

A living terrain grid where agents harvest resources. Cell color shows resource health: green (lush) to brown (depleted). Agents consume resources, which regenerate based on ecosystem carrying capacity.

**Key Metrics:**
- Resource Fairness
- Sustainability Index
- Carrying Capacity

### 9. Quantum Symmetry Fairness
**Probability clouds with JS divergence showing superposition fairness**

Agents exist as probability clouds (superpositions) rather than fixed states. Fairness increases when neighboring clouds overlap smoothly. High uncertainty creates shimmering effects.

**Key Metrics:**
- Quantum Fairness
- Uncertainty Measure
- Symmetry Index

### 10. Consensus Fairness (Voting/Opinion)
**Opinion dynamics in 2D space with color blending toward consensus**

Agents have opinions (colors) in 2D space. Similar opinions influence each other, creating consensus. Fairness increases as colors blend toward uniform consensus.

**Key Metrics:**
- Consensus Index
- Opinion Variance
- Convergence Rate

### 11. Cooperative Game Theory (Coalitions)
**Coalition formation with Shapley values and Nash bargaining solutions**

Agents form coalitions (clusters) to maximize collective payoff. Coalition boundaries show fairness of payoff distribution. Stable coalitions have steady colors; unstable ones pulse or fragment.

**Key Metrics:**
- Coalition Fairness
- Shapley Value Variance
- Stability Index

### 12. Fairness Diffusion (Ripple Model)
**Continuous color field with ripple propagation showing fairness potential**

A continuous color field representing fairness potential (φ). Local imbalances create circular ripples that propagate and overlap until the surface becomes smooth.

**Key Metrics:**
- Diffusion Fairness
- Mean φ
- Gradient Variance

### 13. Stochastic Ito SDE
**Particles flow through sinusoidal waves with Brownian motion jitter**

Agents evolve according to Itô stochastic differential equations: deterministic drift (e.g., along wave-like flows) plus Brownian diffusion. Fairness emerges from the balance between drift and noise.

**Key Metrics:**
- Fairness Coefficient
- Drift vs. diffusion balance
- Spatial variance

### 14. Dual Itô Fairness
**Forward and reverse SDEs showing bias diffusion and fairness correction equilibrium**

Two coupled processes: a forward SDE that spreads bias and a reverse SDE that corrects toward fairness. The equilibrium between them illustrates how fairness can be achieved by reversing bias diffusion.

**Key Metrics:**
- Forward/reverse balance
- Bias diffusion rate
- Fairness equilibrium

### 15. Cytoneme-Constrained Diffusion
**Directed graph conduits constrain resource diffusion with adaptive fairness control**

Resources diffuse only along directed edges (cytoneme-like conduits). Fairness is controlled by how flow is routed through the network, with adaptive weights on edges.

**Key Metrics:**
- Network fairness
- Flow balance
- Conduit utilization

### 16. Advanced Cytoneme Circuitry
**Fair signal flow through fixed networks with organic circuitry visualization**

A fixed network topology (circuitry) through which fairness signals flow. Visualization emphasizes organic, circuit-like structure and how fair allocation is achieved at nodes.

**Key Metrics:**
- Signal fairness
- Node balance
- Path diversity

### 17. Coupled Diffusion
**Two competitive particle populations with coupled SDEs pushing each other apart**

Two agent populations, each following SDEs that depend on the other. Populations repel or compete in state space, showing how fairness can involve multiple groups in dynamic opposition.

**Key Metrics:**
- Cross-population fairness
- Separation index
- Coupling strength

### 18. Protein Folding Fairness
**Chain of agents fold to minimize unfairness energy like proteins finding native structure**

A chain of agents (like amino acids) that can fold in space. The system minimizes an “unfairness energy” so that the chain finds a fair configuration, analogous to protein folding to a native state.

**Key Metrics:**
- Unfairness energy
- Folding stability
- Contact fairness

### 19. Residual Prior Diffusion (RPD)
**Two-stage fairness: coarse prior captures large-scale structure; diffusion refines the residual toward target**

Inspired by arXiv:2512.21593. A coarse prior (e.g., low-resolution fairness) is combined with a diffusion process that refines the residual toward a target fair distribution. Demonstrates hierarchical fairness correction.

**Key Metrics:**
- Prior vs. residual contribution
- Refinement rate
- Target fairness

## 🚀 Getting Started

### Prerequisites

- A modern web browser (Chrome, Firefox, Safari, Edge)
- A local web server (Python's http.server, Node.js http-server, or similar)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/mnolan4/Fairness.git
cd Fairness
```

Or open the live site at [https://mnolan4.github.io/Fairness/](https://mnolan4.github.io/Fairness/).

2. Start a local web server:

**Using Python 3:**
```bash
python3 -m http.server 8000
```

**Using Python 2:**
```bash
python -m SimpleHTTPServer 8000
```

**Using Node.js (if you have http-server installed):**
```bash
npx http-server -p 8000
```

3. Open your browser and navigate to:
```
http://localhost:8000
```

### Usage

1. **Navigate Models**: Hover over the top of the page to reveal the menu bar. Click on any model name to explore it.

2. **Interact with Controls**: Each model has sliders to adjust parameters. Hover over slider labels for detailed descriptions.

3. **View Information**: Click the ℹ icon at the bottom of the metrics panel to see detailed information about the model.

4. **Observe Patterns**: Watch how agents self-organize and how fairness metrics evolve over time.

## 📁 Project Structure

```
Fairness-Models/
├── index.html              # Home page with project overview
├── menu.css                # Navigation menu styles
├── FairAgent.js            # Core agent class
├── FairnessSystem.js       # Fairness calculation utilities
│
├── baseline.html           # Baseline model page
├── baseline-sketch.js      # Baseline model visualization
│
├── weighted.html           # Weighted fairness model
├── weighted-sketch.js      # Weighted model visualization
│
├── segregation.html        # Segregation model
├── segregation-sketch.js   # Segregation visualization
│
├── market.html            # Market exchange model
├── market-sketch.js       # Market visualization
│
├── temporal.html          # Temporal fairness model
├── temporal-sketch.js     # Temporal visualization
│
├── energy.html           # Energy redistribution model
├── energy-sketch.js      # Energy visualization
│
├── network.html          # Network influence model
├── network-sketch.js     # Network visualization
│
├── ecological.html       # Ecological fairness model
├── ecological-sketch.js  # Ecological visualization
│
├── quantum.html          # Quantum symmetry model
├── quantum-sketch.js     # Quantum visualization
│
├── consensus.html        # Consensus model
├── consensus-sketch.js   # Consensus visualization
│
├── coalitions.html       # Cooperative game theory model
├── coalitions-sketch.js  # Coalitions visualization
│
├── diffusion.html        # Fairness diffusion model
├── diffusion-sketch.js   # Diffusion visualization
│
├── stochastic.html       # Stochastic Ito SDE model
├── stochastic-sketch.js  # Stochastic visualization
│
├── ito.html              # Dual Itô fairness model
├── ito-sketch.js         # Dual Itô visualization
│
├── cytoneme.html         # Cytoneme-constrained diffusion model
├── cytoneme-sketch.js    # Cytoneme visualization
│
├── cytoneme-circuitry.html    # Advanced cytoneme circuitry model
├── cytoneme-circuitry-sketch.js  # Circuitry visualization
│
├── coupled.html          # Coupled diffusion model
├── coupled-sketch.js     # Coupled visualization
│
├── protein.html          # Protein folding fairness model
├── protein-sketch.js     # Protein visualization
│
├── rpd.html              # Residual Prior Diffusion (RPD) model
├── rpd-sketch.js         # RPD visualization
│
└── models/               # Legacy model files (for reference)
    ├── baseline.js
    ├── weighted.js
    ├── segregation.js
    └── market.js
```

## 🎨 Technical Details

### Technologies Used

- **p5.js** - JavaScript library for creative coding and visualization
- **HTML5/CSS3** - Modern web standards
- **Vanilla JavaScript** - No frameworks, pure JS for performance

### Architecture

- **Global p5.js Mode** - Each model runs in its own standalone HTML page
- **Modular Design** - Core agent class (`FairAgent.js`) shared across models
- **Responsive UI** - Hover-based navigation that doesn't interfere with visualizations

### Key Concepts

- **Fairness Coefficient (FC)**: Measures how equitably utility is distributed among agents
- **Weighted Fairness**: Considers agent importance (weights) in fairness calculations
- **Entropy**: Measures system disorder and diversity
- **Variance**: Indicates uniformity of utility distribution
- **Local Interactions**: Agents only interact with nearby neighbors
- **Emergent Behavior**: Global patterns arise from local rules

## 📊 Interpreting Metrics

### Fairness Coefficient (FC)
- **Range**: 0 to 1
- **0.7+**: Stable fairness achieved
- **0.4-0.7**: Transitional state
- **<0.4**: Unfair distribution

### Entropy
- **High**: Diverse utilities, active system
- **Low**: Converged utilities, stable system
- Typically decreases as fairness increases

### Variance
- **Low**: Uniform utility distribution
- **High**: Unequal distribution
- Watch it decrease as system self-organizes

## 🔬 Model Parameters

Each model has unique parameters that control behavior:

- **Interaction Radius**: How far agents can "see" their neighbors
- **Transfer Rate**: How quickly resources/utility transfer between agents
- **Weight Distribution**: How agent importance varies
- **Diffusion Coefficient**: How quickly fairness spreads (diffusion model)
- **Memory Decay**: How quickly agents forget past experiences (temporal model)

Hover over parameter labels for detailed descriptions.

## 🎯 Use Cases

- **Education**: Understanding fairness principles through visualization
- **Research**: Exploring different fairness models and their behaviors
- **Demonstration**: Showing how decentralized systems can achieve fairness
- **Experimentation**: Testing how parameters affect fairness outcomes

## 🤝 Contributing

Contributions are welcome! Areas for potential contribution:

- Additional fairness models
- Improved visualizations
- Performance optimizations
- Documentation improvements
- Bug fixes

## 📝 License

This project is open source. Please check the repository for license details.

## 🙏 Acknowledgments

This project explores fairness through the lens of self-organizing systems, demonstrating that complex, just systems can arise from simple, local rules.

## 📧 Contact

For questions, issues, or contributions, please open an issue on the GitHub repository.

---

**Note**: This project is a visualization and educational tool. The models are simplified representations of complex fairness concepts and should not be used as the sole basis for real-world fairness decisions.

