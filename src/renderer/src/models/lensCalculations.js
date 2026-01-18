// src/renderer/src/models/lensCalculations.js
// BACKWARD COMPATIBILITY LAYER
//
// This file delegates to the new calculator registry system.
// For new code, prefer importing directly from ./calculators/index.js

import {
  computeAllWithDeviceSelection,
  orthoKCalc,
  createOrthoKCalculator,
} from "./calculators/index.js";

// Re-export utilities for any external consumers
export { toKey, toNum } from "./calculators/baseCalculator.js";

/**
 * Legacy lens calculator export
 * - computeAll: Now Device-aware (selects calculator per-row based on Device column)
 * - computeRow: Uses Ortho K calculator (legacy behavior)
 * - computeFirst: Uses Ortho K calculator (legacy behavior)
 */
export const lensCalc = {
  computeRow: (row) => orthoKCalc.computeRow(row),
  computeAll: (rows) => computeAllWithDeviceSelection(rows),
  computeFirst: (rows) => orthoKCalc.computeFirst(rows),
};

/**
 * Legacy factory export - creates Ortho K calculator
 * For new code, use createOrthoKCalculator or createExpo1acCalculator from ./calculators/index.js
 */
export { createOrthoKCalculator as createLensCalculator };
