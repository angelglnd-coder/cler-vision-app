// src/renderer/src/models/calculators/orthoK/index.js
// Ortho K calculator factory and pre-instantiated instance

import { createOrthoKCalculatorCore } from "./formulas.js";
import typeLookup from "./lookups/typeChart.lookup.json";
import refLookup from "./lookups/ref1.lookup.json";
import ref2Lookup from "./lookups/ref2.lookup.json";

export const CALCULATOR_ID = "orthoK";
export const CALCULATOR_NAME = "Ortho K";

/**
 * Create an Ortho K calculator with optional lookup overrides
 * @param {Object} overrides - Optional overrides for lookups and defaults
 * @returns {Object} Calculator instance with computeRow, computeAll, computeFirst methods
 */
export function createOrthoKCalculator(overrides = {}) {
  return createOrthoKCalculatorCore({
    typeLookup: overrides.typeLookup ?? typeLookup,
    refLookup: overrides.refLookup ?? refLookup,
    ref2Lookup: overrides.ref2Lookup ?? ref2Lookup,
    defaults: { PC_radius: 12, LensPower: 1, ...overrides.defaults },
  });
}

// Pre-instantiated default calculator
export const orthoKCalc = createOrthoKCalculator();
