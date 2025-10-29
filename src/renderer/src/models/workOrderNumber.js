/**
 * Work Order Number Generation and Management
 *
 * Format: <SOLD_TO>-<sequence> <print_count>
 * Example: 003-000001 0 (first print), 003-000001 1 (second print of same WO)
 *
 * Components:
 * - SOLD_TO: 3-digit account code (e.g., 003)
 * - sequence: 6-digit zero-padded counter per SOLD_TO (000001-999999)
 * - print_count: single digit (0-9) with space before it
 *   - 0: New WO (initial issuance)
 *   - 1+: Reprints (PNR, RMA, etc.) - each reprint increments
 */

/**
 * Formats a work order number from its components
 * @param {string|number} soldTo - 3-digit account code
 * @param {string|number} sequence - 6-digit sequence number
 * @param {string|number} printCount - Print count (0-9)
 * @returns {string} Formatted work order number (e.g., "003-000001 0")
 */
export function formatWorkOrderNumber(soldTo, sequence, printCount = 0) {
  const soldToStr = String(soldTo).padStart(3, '0');
  const sequenceStr = String(sequence).padStart(6, '0');
  const printCountStr = String(printCount);

  // Validate components
  if (soldToStr.length !== 3 || isNaN(soldToStr)) {
    throw new Error(`Invalid SOLD_TO: ${soldTo}. Must be a 3-digit number.`);
  }

  if (sequenceStr.length !== 6 || isNaN(sequenceStr)) {
    throw new Error(`Invalid sequence: ${sequence}. Must be a 6-digit number (000001-999999).`);
  }

  if (printCountStr.length !== 1 || isNaN(printCountStr) || printCount < 0 || printCount > 9) {
    throw new Error(`Invalid print_count: ${printCount}. Must be a single digit (0-9).`);
  }

  return `${soldToStr}-${sequenceStr} ${printCountStr}`;
}

/**
 * Parses a work order number into its components
 * @param {string} workOrderNumber - Work order number (e.g., "003-000001 0")
 * @returns {{soldTo: string, sequence: string, printCount: string, baseNumber: string}}
 */
export function parseWorkOrderNumber(workOrderNumber) {
  if (!workOrderNumber || typeof workOrderNumber !== 'string') {
    throw new Error('Work order number must be a non-empty string');
  }

  // Expected format: XXX-YYYYYY Z where XXX is SOLD_TO, YYYYYY is sequence, Z is print_count (with space)
  const match = workOrderNumber.match(/^(\d{3})-(\d{6})\s(\d)$/);

  if (!match) {
    throw new Error(
      `Invalid work order format: ${workOrderNumber}. Expected format: XXX-YYYYYY Z (e.g., 003-000001 0)`
    );
  }

  const [, soldTo, sequence, printCount] = match;

  // Base number is the WO without print_count (for identifying reprints of the same WO)
  const baseNumber = `${soldTo}-${sequence}`;

  return {
    soldTo,
    sequence,
    printCount,
    baseNumber
  };
}

/**
 * Validates a work order number format
 * @param {string} workOrderNumber - Work order number to validate
 * @returns {boolean} True if valid, false otherwise
 */
export function isValidWorkOrderNumber(workOrderNumber) {
  try {
    parseWorkOrderNumber(workOrderNumber);
    return true;
  } catch {
    return false;
  }
}

/**
 * Generates a new work order number (initial issuance with print_count = 0)
 * @param {string|number} soldTo - 3-digit account code
 * @param {string|number} sequence - 6-digit sequence number
 * @returns {string} New work order number with print_count = 0
 */
export function generateNewWorkOrder(soldTo, sequence) {
  return formatWorkOrderNumber(soldTo, sequence, 0);
}

/**
 * Creates a reprint work order number by incrementing the print_count
 * @param {string} workOrderNumber - Original work order number
 * @returns {string} New work order number with incremented print_count
 * @throws {Error} If print_count would exceed 9
 */
export function generateReprintWorkOrder(workOrderNumber) {
  const { soldTo, sequence, printCount } = parseWorkOrderNumber(workOrderNumber);

  const currentPrintCount = parseInt(printCount, 10);
  const newPrintCount = currentPrintCount + 1;

  if (newPrintCount > 9) {
    throw new Error(
      `Cannot increment print_count beyond 9. Current: ${currentPrintCount}, WO: ${workOrderNumber}`
    );
  }

  return formatWorkOrderNumber(soldTo, sequence, newPrintCount);
}

/**
 * Gets the print count from a work order number
 * @param {string} workOrderNumber - Work order number
 * @returns {number} Print count (0-9)
 */
export function getPrintCount(workOrderNumber) {
  const { printCount } = parseWorkOrderNumber(workOrderNumber);
  return parseInt(printCount, 10);
}

/**
 * Checks if a work order is a reprint (print_count > 0)
 * @param {string} workOrderNumber - Work order number
 * @returns {boolean} True if reprint, false if original
 */
export function isReprint(workOrderNumber) {
  return getPrintCount(workOrderNumber) > 0;
}

/**
 * Gets the base work order number (without print_count for comparison)
 * Useful for identifying all prints of the same work order
 * @param {string} workOrderNumber - Work order number
 * @returns {string} Base number (e.g., "003-000001" from "003-000001 0")
 */
export function getBaseWorkOrderNumber(workOrderNumber) {
  const { baseNumber } = parseWorkOrderNumber(workOrderNumber);
  return baseNumber;
}

/**
 * Generates the next sequence number for a given SOLD_TO account
 * @param {string|number} soldTo - 3-digit account code
 * @param {number} currentSequence - Current sequence number
 * @returns {number} Next sequence number
 * @throws {Error} If sequence would exceed 999999
 */
export function getNextSequence(soldTo, currentSequence) {
  const nextSeq = currentSequence + 1;

  if (nextSeq > 999999) {
    throw new Error(
      `Sequence limit exceeded for SOLD_TO ${soldTo}. Maximum sequence is 999999.`
    );
  }

  return nextSeq;
}

/**
 * Gets the reprint reason description based on common scenarios
 * @param {number} printCount - Print count value
 * @returns {string} Description of the reprint
 */
export function getReprintReason(printCount) {
  if (printCount === 0) return 'Original Work Order';
  if (printCount === 1) return 'First Reprint (PNR/RMA)';
  return `Reprint #${printCount}`;
}

/**
 * Calculates total button/lens usage based on print count
 * Each print (including original) represents one button used
 * @param {string} workOrderNumber - Work order number
 * @returns {number} Total materials used (print_count + 1)
 */
export function calculateMaterialUsage(workOrderNumber) {
  const printCount = getPrintCount(workOrderNumber);
  return printCount + 1; // Original (0) = 1 button, reprint 1 = 2 buttons total, etc.
}
