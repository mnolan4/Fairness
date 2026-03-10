// FairAgent Class
// Represents an autonomous agent in the fairness ecosystem

class FairAgent {
  constructor(p, x, y, utility, weight) {
    this.p = p; // Store p5 instance
    this.pos = p.createVector(x, y);
    this.vel = p.createVector(p.random(-1, 1), p.random(-1, 1));
    this.vel.normalize();
    this.vel.mult(p.random(0.5, 2));
    
    this.utility = utility; // U_i
    this.weight = weight;    // W_i
    this.baseUtility = utility; // For reference
    
    // Emotional state
    this.happiness = 0.5;
    this.happinessVelocity = 0;
    this.lastLocalFairness = 0.5;
    
    // Visual effects
    this.pulsePhase = p.random(p.TWO_PI);
    this.pulseAmplitude = 0;
    this.glowIntensity = 0;
    
    // Steering behavior
    this.wanderAngle = p.random(p.TWO_PI);
    this.wanderRadius = 25;
    this.wanderDistance = 50;
  }
  
  update(agents, neighborhoodRadius, noiseLevel, fairnessSensitivity) {
    // Find neighbors
    let neighbors = this.findNeighbors(agents, neighborhoodRadius);
    
    // Apply fairness correction (micro-fairness)
    this.applyFairnessCorrection(neighbors, fairnessSensitivity);
    
    // Update emotional state
    this.updateEmotionalState(neighbors);
    
    // Steering behaviors
    this.applySteering(neighbors, noiseLevel);
    
    // Update position
    this.pos.add(this.vel);
    
    // Boundary wrapping (need p5 instance for width/height)
    // Note: width/height will be passed or accessed via this.p
    // For now, we'll handle this in the calling code
    
    // Decay visual effects
    this.pulseAmplitude *= 0.95;
    this.glowIntensity *= 0.95;
  }
  
  findNeighbors(agents, radius) {
    let neighbors = [];
    for (let agent of agents) {
      if (agent === this) continue;
      let dist = this.p.dist(this.pos.x, this.pos.y, agent.pos.x, agent.pos.y);
      if (dist < radius) {
        neighbors.push({agent: agent, distance: dist});
      }
    }
    return neighbors;
  }
  
  applyFairnessCorrection(neighbors, sensitivity) {
    if (neighbors.length === 0) return;
    
    // Calculate weighted utility ratio for this agent
    let myRatio = this.utility / this.weight;
    
    // Calculate average weighted utility ratio of neighbors
    let neighborRatios = [];
    for (let n of neighbors) {
      neighborRatios.push(n.agent.utility / n.agent.weight);
    }
    let avgNeighborRatio = neighborRatios.reduce((a, b) => a + b, 0) / neighborRatios.length;
    
    // Calculate deviation
    let deviation = myRatio - avgNeighborRatio;
    
    // Apply fairness correction
    if (Math.abs(deviation) > 0.01) {
      // Transfer energy to/from neighbors
      let correctionAmount = deviation * sensitivity * 0.1;
      
      // Distribute correction among neighbors
      let totalWeight = neighbors.reduce((sum, n) => sum + n.agent.weight, 0);
      
      for (let n of neighbors) {
        let transfer = correctionAmount * (n.agent.weight / totalWeight);
        this.utility -= transfer;
        n.agent.utility += transfer;
      }
      
      // Clamp utility to reasonable bounds
      this.utility = this.p.constrain(this.utility, 0.1, 1.0);
      
      // Also clamp neighbor utilities
      for (let n of neighbors) {
        n.agent.utility = this.p.constrain(n.agent.utility, 0.1, 1.0);
      }
    }
    
    // Also adjust velocity based on fairness (agents slow down when unfair)
    if (Math.abs(deviation) > 0.05) {
      this.vel.mult(0.98); // Slow down when unfair
    } else {
      this.vel.mult(1.01); // Speed up slightly when fair
      this.vel.limit(3);
    }
  }
  
  updateEmotionalState(neighbors) {
    if (neighbors.length === 0) {
      this.happiness = this.p.lerp(this.happiness, 0.5, 0.1);
      return;
    }
    
    // Calculate local fairness
    let myRatio = this.utility / this.weight;
    let neighborRatios = neighbors.map(n => n.agent.utility / n.agent.weight);
    let avgRatio = neighborRatios.reduce((a, b) => a + b, 0) / neighborRatios.length;
    let localFairness = 1 - Math.abs(myRatio - avgRatio) / (avgRatio + 0.1);
    localFairness = this.p.constrain(localFairness, 0, 1);
    
    // Update happiness based on local fairness
    let targetHappiness = localFairness;
    this.happiness = this.p.lerp(this.happiness, targetHappiness, 0.1);
    
    // Detect improvement in fairness (emotional equilibrium)
    if (localFairness > this.lastLocalFairness + 0.1) {
      // Fairness improved! Trigger visual feedback
      this.pulseAmplitude = 1.0;
      this.glowIntensity = 1.0;
    }
    
    this.lastLocalFairness = localFairness;
  }
  
  applySteering(neighbors, noiseLevel) {
    let steering = this.p.createVector(0, 0);
    
    // Wander behavior
    this.wanderAngle += this.p.random(-0.3, 0.3);
    let wanderOffset = this.p.createVector(
      this.p.cos(this.wanderAngle) * this.wanderRadius,
      this.p.sin(this.wanderAngle) * this.wanderRadius
    );
    let wanderTarget = p5.Vector.add(this.pos, this.vel.copy().normalize().mult(this.wanderDistance));
    wanderTarget.add(wanderOffset);
    let wanderForce = p5.Vector.sub(wanderTarget, this.pos);
    wanderForce.normalize();
    wanderForce.mult(0.5);
    steering.add(wanderForce);
    
    // Cohesion (toward neighbors)
    if (neighbors.length > 0) {
      let cohesion = this.p.createVector(0, 0);
      for (let n of neighbors) {
        cohesion.add(n.agent.pos);
      }
      cohesion.div(neighbors.length);
      cohesion.sub(this.pos);
      cohesion.normalize();
      cohesion.mult(0.3);
      steering.add(cohesion);
    }
    
    // Separation (avoid crowding)
    if (neighbors.length > 0) {
      let separation = this.p.createVector(0, 0);
      for (let n of neighbors) {
        if (n.distance < 30) {
          let diff = p5.Vector.sub(this.pos, n.agent.pos);
          diff.normalize();
          diff.div(n.distance);
          separation.add(diff);
        }
      }
      if (separation.mag() > 0) {
        separation.normalize();
        separation.mult(0.8);
        steering.add(separation);
      }
    }
    
    // Random noise
    steering.add(p5.Vector.random2D().mult(noiseLevel * 0.5));
    
    // Apply steering
    this.vel.add(steering);
    this.vel.limit(3);
  }
  
  display(globalFC) {
    this.p.push();
    
    // Calculate visual properties based on utility
    let normalizedUtility = this.utility;
    let size = this.p.map(normalizedUtility, 0.1, 1.0, 5, 20);
    
    // Color based on utility (hue) and happiness (brightness)
    // High utility = warm colors (yellow/orange), low utility = cool colors (blue)
    let hue = this.p.map(normalizedUtility, 0.1, 1.0, 240, 60); // Blue to yellow
    let saturation = 70 + this.happiness * 30;
    let brightness = 50 + this.happiness * 50;
    
    // Adjust color based on global fairness (system mood affects individual appearance)
    if (globalFC > 0.7) {
      // High fairness: more harmonious, warmer tones
      hue = this.p.lerp(hue, 60, 0.2);
      saturation = this.p.lerp(saturation, 80, 0.2);
    } else if (globalFC < 0.3) {
      // Low fairness: more chaotic, cooler tones
      hue = this.p.lerp(hue, 240, 0.2);
      saturation = this.p.lerp(saturation, 90, 0.2);
    }
    
    // Pulse effect when fairness improves
    this.pulsePhase += 0.2;
    let pulse = 1 + this.p.sin(this.pulsePhase) * this.pulseAmplitude * 0.3;
    size *= pulse;
    
    // Glow effect (emotional equilibrium feedback)
    if (this.glowIntensity > 0.1) {
      this.p.drawingContext.shadowBlur = 20 * this.glowIntensity;
      this.p.drawingContext.shadowColor = `hsla(${hue}, ${saturation}%, ${brightness}%, ${this.glowIntensity})`;
    }
    
    // Draw outer glow ring when happy
    if (this.happiness > 0.7) {
      this.p.noFill();
      this.p.stroke(hue, saturation, brightness, 0.3);
      this.p.strokeWeight(2);
      this.p.ellipse(this.pos.x, this.pos.y, size * 1.5, size * 1.5);
    }
    
    // Draw agent
    this.p.fill(hue, saturation, brightness, 0.9);
    this.p.noStroke();
    this.p.ellipse(this.pos.x, this.pos.y, size, size);
    
    // Reset shadow
    this.p.drawingContext.shadowBlur = 0;
    
    // Draw weight indicator (small inner circle)
    this.p.fill(hue, saturation, brightness * 0.7, 0.6);
    let weightSize = this.p.map(this.weight, 0.5, 3, 2, size * 0.6);
    this.p.ellipse(this.pos.x, this.pos.y, weightSize, weightSize);
    
    this.p.pop();
  }
}

// Expose globally for models
if (typeof window !== 'undefined') {
  window.FairAgent = FairAgent;
}

