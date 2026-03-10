// FairnessSystem
// Calculates fairness metrics and system-wide statistics

class FairnessSystem {
  constructor() {
    this.historyLength = 100;
  }
  
  // Calculate standard Fairness Coefficient
  // FC = (ΣU_i)² / (n·ΣU_i²)
  calculateFairnessCoefficient(agents) {
    if (agents.length === 0) return 0;
    
    let sumUtility = 0;
    let sumUtilitySquared = 0;
    let n = agents.length;
    
    for (let agent of agents) {
      sumUtility += agent.utility;
      sumUtilitySquared += agent.utility * agent.utility;
    }
    
    if (sumUtilitySquared === 0) return 0;
    
    let fc = (sumUtility * sumUtility) / (n * sumUtilitySquared);
    return constrain(fc, 0, 1);
  }
  
  // Calculate weighted fairness coefficient
  // Uses U_i/W_i ratios instead of raw utilities
  calculateWeightedFairness(agents) {
    if (agents.length === 0) return 0;
    
    let ratios = agents.map(a => a.utility / a.weight);
    let n = ratios.length;
    
    let sumRatio = ratios.reduce((a, b) => a + b, 0);
    let sumRatioSquared = ratios.reduce((a, b) => a + b * b, 0);
    
    if (sumRatioSquared === 0) return 0;
    
    let weightedFC = (sumRatio * sumRatio) / (n * sumRatioSquared);
    return constrain(weightedFC, 0, 1);
  }
  
  // Calculate mean utility
  calculateMeanUtility(agents) {
    if (agents.length === 0) return 0;
    let sum = agents.reduce((sum, a) => sum + a.utility, 0);
    return sum / agents.length;
  }
  
  // Calculate variance
  calculateVariance(agents) {
    if (agents.length === 0) return 0;
    let mean = this.calculateMeanUtility(agents);
    let sumSquaredDiff = agents.reduce((sum, a) => {
      let diff = a.utility - mean;
      return sum + diff * diff;
    }, 0);
    return sumSquaredDiff / agents.length;
  }
  
  // Calculate entropy (variance-based measure)
  // Higher variance = higher entropy = lower fairness
  calculateEntropy(agents) {
    let variance = this.calculateVariance(agents);
    // Normalize entropy to 0-1 range (approximate)
    // Using a scaling factor based on maximum possible variance
    let maxVariance = 0.25; // For utilities in [0,1], max variance is 0.25
    let normalizedEntropy = variance / maxVariance;
    return constrain(normalizedEntropy, 0, 1);
  }
  
  // Calculate all metrics at once (for efficiency)
  calculateAllMetrics(agents) {
    return {
      fc: this.calculateFairnessCoefficient(agents),
      weightedFC: this.calculateWeightedFairness(agents),
      meanUtility: this.calculateMeanUtility(agents),
      variance: this.calculateVariance(agents),
      entropy: this.calculateEntropy(agents)
    };
  }
}

// Expose globally for models
if (typeof window !== 'undefined') {
  window.FairnessSystem = FairnessSystem;
}

