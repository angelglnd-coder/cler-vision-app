// src/renderer/src/models/calculators/expo1ac/index.js
// EXPO1AC calculator factory and pre-instantiated instance

import { createExpo1acCalculatorCore } from "./formulas.js";
import typeLookup from "./lookups/typeChart.lookup.json";
import refLookup from "./lookups/ref1.lookup.json";
import ref2Lookup from "./lookups/ref2.lookup.json";

export const CALCULATOR_ID = "expo1ac";
export const CALCULATOR_NAME = "EXPO1AC";

/**
 * Create an EXPO1AC calculator with optional lookup overrides
 * @param {Object} overrides - Optional overrides for lookups and defaults
 * @returns {Object} Calculator instance with computeRow, computeAll, computeFirst methods
 */
export function createExpo1acCalculator(overrides = {}) {
  return createExpo1acCalculatorCore({
    typeLookup: overrides.typeLookup ?? typeLookup,
    refLookup: overrides.refLookup ?? refLookup,
    ref2Lookup: overrides.ref2Lookup ?? ref2Lookup,
    defaults: { PC_radius: 12, LensPower: 1, ...overrides.defaults },
  });
}

// Pre-instantiated default calculator
export const expo1acCalc = createExpo1acCalculator();
