// src/renderer/src/models/calculators/scleral/index.js
// Scleral calculator factory and pre-instantiated instance

import { createScleralCalculatorCore, DESIGN_TYPES, resolveDesignType } from "./formulas.js";

export const CALCULATOR_ID = "scleral";
export const CALCULATOR_NAME = "Scleral";

// Re-export design types and resolver for external use
export { DESIGN_TYPES, resolveDesignType };

/**
 * Default offset values for each design type
 */
export const DEFAULT_OFFSETS = {
  RHC: 1.50,
  RHCA: 1.50,
  RHCB: 1.25,
  CLER: 1.00,
};

/**
 * Create a Scleral calculator with optional defaults overrides
 * @param {Object} overrides - Optional overrides for defaults
 * @returns {Object} Calculator instance with computeRow, computeAll, computeFirst methods
 */
export function createScleralCalculator(overrides = {}) {
  return createScleralCalculatorCore({
    defaults: {
      baseCT: 0.36,
      PC_radius: 14,    // default PC radius
      LensPower: 1,     // default lens power
      offsets: DEFAULT_OFFSETS,
      ...overrides.defaults,
    },
  });
}

// Pre-instantiated default calculator
export const scleralCalc = createScleralCalculator();
