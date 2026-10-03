(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.TubularModel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const HBAR = 1.054571817e-34;
  const KB = 1.380649e-23;
  const MU0 = 1.25663706212e-6;
  const MU_B = 9.2740100783e-24;
  const C_LIGHT = 299792458;
  const ELECTRON_G = 2.002319304;
  const PROTOFILAMENTS = 13;
  const DIMER_LENGTH_NM = 8;
  const BASE_VISIBLE_DIMERS = 6;
  const VARIABLE_DIMERS_PER_PROTOFILAMENT = 34;

  function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
  }

  function mean(values) {
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  function standardDeviation(values) {
    const average = mean(values);
    const variance = values.reduce(
      (sum, value) => sum + (value - average) ** 2,
      0
    ) / values.length;
    return Math.sqrt(variance);
  }

  function coefficientOfVariation(values) {
    const average = mean(values);
    return average > 0 ? standardDeviation(values) / average : 0;
  }

  function giniCoefficient(values) {
    const nonnegative = values.map(value => Math.max(value, 0));
    const total = nonnegative.reduce((sum, value) => sum + value, 0);
    if (!(total > 0)) return 0;
    let pairwiseDifference = 0;
    for (const left of nonnegative) {
      for (const right of nonnegative) {
        pairwiseDifference += Math.abs(left - right);
      }
    }
    return pairwiseDifference / (2 * nonnegative.length * total);
  }

  function jainIndex(values) {
    const nonnegative = values.map(value => Math.max(value, 0));
    const total = nonnegative.reduce((sum, value) => sum + value, 0);
    const squaredTotal = nonnegative.reduce(
      (sum, value) => sum + value ** 2,
      0
    );
    if (!(squaredTotal > 0)) return 1;
    return total ** 2 / (nonnegative.length * squaredTotal);
  }

  function createRng(seed) {
    let state = seed >>> 0;
    return function random() {
      state += 0x6d2b79f5;
      let value = state;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
  }

  function planckOccupation(omega, temperatureK) {
    if (!(omega > 0) || !(temperatureK > 0)) return 0;
    const exponent = HBAR * omega / (KB * temperatureK);
    if (exponent > 700) return 0;
    if (exponent < 1e-6) return 1 / exponent - 0.5 + exponent / 12;
    return 1 / Math.expm1(exponent);
  }

  function spinAngularFrequency(fieldMilliTesla) {
    const fieldTesla = Math.max(fieldMilliTesla, 1e-9) * 1e-3;
    return ELECTRON_G * MU_B * fieldTesla / HBAR;
  }

  function electromagneticBath(fieldMilliTesla, temperatureK, log10Scale) {
    const omega = spinAngularFrequency(fieldMilliTesla);
    const scale = 10 ** (log10Scale || 0);
    const magneticMoment = ELECTRON_G * MU_B;
    const vacuumRate = scale * MU0 * magneticMoment ** 2 * omega ** 3 /
      (3 * Math.PI * HBAR * C_LIGHT ** 3);
    const occupation = planckOccupation(omega, temperatureK);
    const thermalRate = 2 * vacuumRate * occupation;

    return {
      omega,
      occupation,
      vacuumRate,
      thermalRate,
      downwardRate: vacuumRate * (occupation + 1),
      upwardRate: vacuumRate * occupation,
      totalRate: vacuumRate + thermalRate
    };
  }

  function isotopeSpinWeight(isotope) {
    if (isotope === '25Mg') return 1;
    if (isotope === 'natural') return 0.1;
    return 0;
  }

  function tripletYieldRatio(options) {
    const field = Math.max(options.fieldMilliTesla, 0);
    const gamma2 = Math.max(options.gamma2, 0);
    const coherence = 1 / (1 + gamma2 / 2e6);
    const hypomagneticResponse = Math.exp(-field / 0.012);
    const resonance = Math.exp(-0.5 * ((field - 3) / 1.15) ** 2);
    const isotopeWeight = isotopeSpinWeight(options.isotope);

    // Reduced response constrained to the qualitative relationships reported
    // for hypomagnetic, 3 mT 25Mg, and spinless-isotope conditions.
    return clamp(
      1 +
        0.24 * hypomagneticResponse * coherence -
        0.38 * isotopeWeight * resonance * coherence,
      0.45,
      1.35
    );
  }

  function targetVariableDimers(cMT, cTotal) {
    const fraction = cTotal > 0 ? clamp(cMT / cTotal, 0, 1) : 0;
    return Math.round(
      fraction * PROTOFILAMENTS * VARIABLE_DIMERS_PER_PROTOFILAMENT
    );
  }

  function weightedIndex(weights, random) {
    const total = weights.reduce((sum, value) => sum + Math.max(value, 0), 0);
    if (!(total > 0)) return Math.floor(random() * weights.length);
    let cursor = random() * total;
    for (let index = 0; index < weights.length; index++) {
      cursor -= Math.max(weights[index], 0);
      if (cursor <= 0) return index;
    }
    return weights.length - 1;
  }

  function createState(options) {
    const settings = options || {};
    const cTotal = settings.cTotal || 10;
    const cMT = clamp(settings.cMT == null ? 2.5 : settings.cMT, 0, cTotal);
    const rng = createRng(settings.seed == null ? 7321 : settings.seed);
    const lengths = new Array(PROTOFILAMENTS).fill(BASE_VISIBLE_DIMERS);
    const unitBias = lengths.map(() => (rng() + rng() + rng() - 1.5) / 1.5);
    let remaining = targetVariableDimers(cMT, cTotal);
    let cursor = 0;

    while (remaining > 0) {
      lengths[cursor % PROTOFILAMENTS] += 1;
      remaining -= 1;
      cursor += 1;
    }

    return {
      time: 0,
      cTotal,
      cMT,
      lengths,
      unitBias,
      events: [],
      last: null
    };
  }

  function calculateLocalHazards(state, options, effectiveKd) {
    const cFree = Math.max(state.cTotal - state.cMT, 0);
    const averageLength = mean(state.lengths);
    const correction = clamp(options.correctionStrength || 0, 0, 1);
    const heterogeneity = clamp(options.heterogeneity || 0, 0, 0.95);
    const attachment = [];
    const detachment = [];

    for (let index = 0; index < PROTOFILAMENTS; index++) {
      const lag = (averageLength - state.lengths[index]) /
        Math.max(averageLength, 1);
      const correctionFactor = clamp(1 + correction * lag * 4, 0.2, 2.5);
      const environmentFactor = Math.exp(heterogeneity * state.unitBias[index]);
      attachment.push(options.kp * cFree * correctionFactor);
      detachment.push(effectiveKd * environmentFactor);
    }

    return { attachment, detachment };
  }

  function updateVisibleGeometry(state, target, hazards, random) {
    let current = state.lengths.reduce(
      (sum, length) => sum + length - BASE_VISIBLE_DIMERS,
      0
    );
    let remaining = clamp(target - current, -24, 24);
    state.events = [];

    while (remaining > 0) {
      const index = weightedIndex(hazards.attachment, random);
      state.lengths[index] += 1;
      state.events.push({ type: 'attach', index });
      remaining -= 1;
      current += 1;
    }

    while (remaining < 0 && current > 0) {
      const removable = hazards.detachment.map((weight, index) =>
        state.lengths[index] > BASE_VISIBLE_DIMERS ? weight : 0
      );
      const index = weightedIndex(removable, random);
      if (state.lengths[index] <= BASE_VISIBLE_DIMERS) break;
      state.lengths[index] -= 1;
      state.events.push({ type: 'detach', index });
      remaining += 1;
      current -= 1;
    }
  }

  function step(state, options, dt, random) {
    const rng = random || Math.random;
    const molecularGamma = 10 ** options.log10MolecularGamma;
    const bath = electromagneticBath(
      options.fieldMilliTesla,
      options.temperatureK,
      options.log10EmScale
    );
    const appliedVacuumRate =
      options.includeVacuum === false ? 0 : bath.vacuumRate;
    const appliedEmRate = bath.thermalRate + appliedVacuumRate;
    const gamma1 = molecularGamma + appliedEmRate;
    const gamma2 = gamma1 / 2 + (options.pureDephasing || 0);
    const yieldRatio = tripletYieldRatio({
      fieldMilliTesla: options.fieldMilliTesla,
      isotope: options.isotope,
      gamma2
    });
    const effectiveKd = options.kd * yieldRatio;
    const derivative =
      options.kp * (state.cTotal - state.cMT) - effectiveKd * state.cMT;

    state.cMT = clamp(state.cMT + derivative * dt, 0, state.cTotal);
    state.time += dt;

    const hazards = calculateLocalHazards(state, options, effectiveKd);
    updateVisibleGeometry(
      state,
      targetVariableDimers(state.cMT, state.cTotal),
      hazards,
      rng
    );

    state.last = {
      derivative,
      effectiveKd,
      yieldRatio,
      gamma1,
      gamma2,
      molecularGamma,
      bath,
      appliedVacuumRate,
      appliedEmRate,
      hazards,
      metrics: ecologyMetrics(state.lengths, hazards)
    };
    return state.last;
  }

  function ecologyMetrics(lengths, hazards) {
    const roughnessDimers = standardDeviation(lengths);
    const shortest = Math.min(...lengths);
    const tipProfile = lengths.map(length => length - shortest);
    return {
      meanLengthDimers: mean(lengths),
      roughnessDimers,
      roughnessNm: roughnessDimers * DIMER_LENGTH_NM,
      tipSpreadDimers: Math.max(...lengths) - Math.min(...lengths),
      lengthCoefficientOfVariation: coefficientOfVariation(lengths),
      tipProfileGini: giniCoefficient(tipProfile),
      tipProfileJain: jainIndex(tipProfile),
      attachmentHazardDispersion: coefficientOfVariation(hazards.attachment),
      detachmentHazardDispersion: coefficientOfVariation(hazards.detachment)
    };
  }

  return {
    constants: {
      PROTOFILAMENTS,
      DIMER_LENGTH_NM,
      BASE_VISIBLE_DIMERS,
      VARIABLE_DIMERS_PER_PROTOFILAMENT
    },
    clamp,
    createRng,
    planckOccupation,
    spinAngularFrequency,
    electromagneticBath,
    isotopeSpinWeight,
    tripletYieldRatio,
    giniCoefficient,
    jainIndex,
    createState,
    ecologyMetrics,
    step
  };
});
