// src/renderer/src/models/calculators/index.js
// Calculator registry with Device-based selection

import {
  orthoKCalc,
  createOrthoKCalculator,
  CALCULATOR_ID as ORTHO_K_ID,
  CALCULATOR_NAME as ORTHO_K_NAME,
} from "./orthoK/index.js";
import {
  expo1acCalc,
  createExpo1acCalculator,
  CALCULATOR_ID as EXPO1AC_ID,
  CALCULATOR_NAME as EXPO1AC_NAME,
} from "./expo1ac/index.js";
import {
  scleralCalc,
  createScleralCalculator,
  CALCULATOR_ID as SCLERAL_ID,
  CALCULATOR_NAME as SCLERAL_NAME,
} from "./scleral/index.js";
import { REQUIRED_OUTPUT_FIELDS, validateOutputShape } from "./baseCalculator.js";

// Registry of all available calculators
const CALCULATOR_REGISTRY = {
  [ORTHO_K_ID]: {
    id: ORTHO_K_ID,
    name: ORTHO_K_NAME,
    instance: orthoKCalc,
    factory: createOrthoKCalculator,
    deviceValues: ["ortho k", "orthok", "ortho-k"], // Case-insensitive (also used as default)
    isDefault: true,
  },
  [EXPO1AC_ID]: {
    id: EXPO1AC_ID,
    name: EXPO1AC_NAME,
    instance: expo1acCalc,
    factory: createExpo1acCalculator,
    deviceValues: ["expo1ac"], // Case-insensitive (normalized to lowercase in lookup)
  },
  [SCLERAL_ID]: {
    id: SCLERAL_ID,
    name: SCLERAL_NAME,
    instance: scleralCalc,
    factory: createScleralCalculator,
    deviceValues: ["scleral", "scl"], // Case-insensitive
  },
};

// Default calculator when Device is not specified or not matched
const DEFAULT_CALCULATOR_ID = ORTHO_K_ID;

/**
 * Get calculator instance by ID
 * @param {string} id - Calculator ID (e.g., "orthoK", "expo1ac")
 * @returns {Object|null} Calculator instance or null if not found
 */
export function getCalculatorById(id) {
  return CALCULATOR_REGISTRY[id]?.instance ?? null;
}

/**
 * Get calculator ID by Device value
 * @param {string|null} deviceValue - Value from Device column
 * @returns {string} Calculator ID
 */
export function getCalculatorIdByDevice(deviceValue) {
  if (!deviceValue) {
    return DEFAULT_CALCULATOR_ID;
  }

  const normalizedDevice = String(deviceValue).trim().toLowerCase();

  for (const calc of Object.values(CALCULATOR_REGISTRY)) {
    if (calc.deviceValues?.some((d) => d === normalizedDevice)) {
      return calc.id;
    }
  }

  // Default fallback
  return DEFAULT_CALCULATOR_ID;
}

/**
 * Get calculator by Device value from row data
 * @param {string|null} deviceValue - Value from Device column
 * @returns {Object} Calculator instance
 */
export function getCalculatorByDevice(deviceValue) {
  const id = getCalculatorIdByDevice(deviceValue);
  return CALCULATOR_REGISTRY[id].instance;
}

/**
 * Compute all rows, selecting calculator per-row based on Device column
 * @param {Array} rows - Array of row objects
 * @returns {Array} Computed rows with calculation results
 */
export function computeAllWithDeviceSelection(rows = []) {
  return rows.map((row) => {
    const deviceValue = row.Device ?? null;
    const calculatorId = getCalculatorIdByDevice(deviceValue);
    const calculator = CALCULATOR_REGISTRY[calculatorId].instance;
    const computed = calculator.computeRow(row);
    return { ...row, ...computed, _calculatorUsed: calculatorId };
  });
}

/**
 * List all registered calculators
 * @returns {Array} Array of calculator info objects
 */
export function listCalculators() {
  return Object.values(CALCULATOR_REGISTRY).map((c) => ({
    id: c.id,
    name: c.name,
    deviceValues: c.deviceValues,
    isDefault: c.id === DEFAULT_CALCULATOR_ID,
  }));
}

// Re-export for convenience
export {
  orthoKCalc,
  expo1acCalc,
  scleralCalc,
  createOrthoKCalculator,
  createExpo1acCalculator,
  createScleralCalculator,
  REQUIRED_OUTPUT_FIELDS,
  validateOutputShape,
  ORTHO_K_ID,
  EXPO1AC_ID,
  SCLERAL_ID,
};
