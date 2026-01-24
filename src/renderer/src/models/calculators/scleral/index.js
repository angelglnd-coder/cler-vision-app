// src/renderer/src/models/calculators/scleral/index.js
// Scleral calculator factory and pre-instantiated instance

import { createScleralCalculatorCore, DESIGN_TYPES } from "./formulas.js";

export const CALCULATOR_ID = "scleral";
export const CALCULATOR_NAME = "Scleral";

// Re-export design types for external use
export { DESIGN_TYPES };

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
      offsets: DEFAULT_OFFSETS,
      ...overrides.defaults,
    },
  });
}

// Pre-instantiated default calculator
export const scleralCalc = createScleralCalculator();
