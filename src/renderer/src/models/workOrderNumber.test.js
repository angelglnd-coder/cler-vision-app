import { describe, it, expect } from 'vitest';
import {
  formatWorkOrderNumber,
  parseWorkOrderNumber,
  generateNewWorkOrder,
  generateReprintWorkOrder,
  isReprint,
  getReprintReason,
  calculateMaterialUsage,
  isValidWorkOrderNumber,
  getPrintCount,
  getBaseWorkOrderNumber,
} from './workOrderNumber.js';

describe('Work Order Number System', () => {
  describe('formatWorkOrderNumber()', () => {
    describe('New Format (Two Digits)', () => {
      it('should format with two-digit print count', () => {
        expect(formatWorkOrderNumber('003', '000001', 1)).toBe('003-000001 01');
        expect(formatWorkOrderNumber('003', '000001', 2)).toBe('003-000001 02');
        expect(formatWorkOrderNumber('003', '000001', 99)).toBe('003-000001 99');
      });

      it('should pad soldTo and sequence with zeros', () => {
        expect(formatWorkOrderNumber('3', '1', 1)).toBe('003-000001 01');
        expect(formatWorkOrderNumber(5, 42, 10)).toBe('005-000042 10');
      });
    });

    describe('Validation', () => {
      it('should throw error for print_count < 1', () => {
        expect(() => formatWorkOrderNumber('003', '000001', 0)).toThrow(
          'Invalid print_count: 0. Must be 1-99'
        );
      });

      it('should throw error for print_count > 99', () => {
        expect(() => formatWorkOrderNumber('003', '000001', 100)).toThrow(
          'Invalid print_count: 100. Must be 1-99'
        );
      });

      it('should throw error for invalid soldTo', () => {
        expect(() => formatWorkOrderNumber('12345', '000001', 1)).toThrow('Invalid SOLD_TO');
      });

      it('should throw error for invalid sequence', () => {
        expect(() => formatWorkOrderNumber('003', '12345678', 1)).toThrow('Invalid sequence');
      });
    });
  });

  describe('parseWorkOrderNumber()', () => {
    describe('Old Format (Single Digit) - Backward Compatibility', () => {
      it('should parse old format with single digit', () => {
        const result = parseWorkOrderNumber('003-000001 0');
        expect(result).toEqual({
          soldTo: '003',
          sequence: '000001',
          printCount: '0',
          baseNumber: '003-000001',
        });
      });

      it('should parse old format with digit 9', () => {
        const result = parseWorkOrderNumber('003-000001 9');
        expect(result).toEqual({
          soldTo: '003',
          sequence: '000001',
          printCount: '9',
          baseNumber: '003-000001',
        });
      });

      it('should preserve printCount as string in old format', () => {
        const result = parseWorkOrderNumber('003-000001 1');
        expect(result.printCount).toBe('1');
        expect(typeof result.printCount).toBe('string');
      });
    });

    describe('New Format (Two Digits)', () => {
      it('should parse new format with two digits', () => {
        const result = parseWorkOrderNumber('003-000001 01');
        expect(result).toEqual({
          soldTo: '003',
          sequence: '000001',
          printCount: '01',
          baseNumber: '003-000001',
        });
      });

      it('should parse new format up to 99', () => {
        const result = parseWorkOrderNumber('003-000001 99');
        expect(result).toEqual({
          soldTo: '003',
          sequence: '000001',
          printCount: '99',
          baseNumber: '003-000001',
        });
      });

      it('should preserve printCount as string in new format', () => {
        const result = parseWorkOrderNumber('003-000001 01');
        expect(result.printCount).toBe('01');
        expect(typeof result.printCount).toBe('string');
      });
    });

    describe('Error Handling', () => {
      it('should throw error for invalid format', () => {
        expect(() => parseWorkOrderNumber('003-000001')).toThrow('Invalid work order format');
        expect(() => parseWorkOrderNumber('003-000001 100')).toThrow('Invalid work order format');
        expect(() => parseWorkOrderNumber('03-000001 01')).toThrow('Invalid work order format');
        expect(() => parseWorkOrderNumber('003-0001 01')).toThrow('Invalid work order format');
      });

      it('should throw error for empty string', () => {
        expect(() => parseWorkOrderNumber('')).toThrow('must be a non-empty string');
      });

      it('should throw error for non-string input', () => {
        expect(() => parseWorkOrderNumber(null)).toThrow('must be a non-empty string');
        expect(() => parseWorkOrderNumber(undefined)).toThrow('must be a non-empty string');
      });
    });
  });

  describe('generateNewWorkOrder()', () => {
    it('should generate new WO with print_count 01', () => {
      expect(generateNewWorkOrder('003', '000001')).toBe('003-000001 01');
      expect(generateNewWorkOrder('5', '1')).toBe('005-000001 01');
      expect(generateNewWorkOrder(7, 42)).toBe('007-000042 01');
    });
  });

  describe('generateReprintWorkOrder()', () => {
    describe('Old to New Format Migration', () => {
      it('should migrate old format 0 to new format 01', () => {
        expect(generateReprintWorkOrder('003-000001 0')).toBe('003-000001 01');
      });

      it('should migrate old format 1 to new format 02', () => {
        expect(generateReprintWorkOrder('003-000001 1')).toBe('003-000001 02');
      });

      it('should migrate old format 9 to new format 10', () => {
        expect(generateReprintWorkOrder('003-000001 9')).toBe('003-000001 10');
      });
    });

    describe('New Format Incrementing', () => {
      it('should increment new format 01 to 02', () => {
        expect(generateReprintWorkOrder('003-000001 01')).toBe('003-000001 02');
      });

      it('should increment new format 02 to 03', () => {
        expect(generateReprintWorkOrder('003-000001 02')).toBe('003-000001 03');
      });

      it('should increment new format 98 to 99', () => {
        expect(generateReprintWorkOrder('003-000001 98')).toBe('003-000001 99');
      });
    });

    describe('Limit Enforcement', () => {
      it('should throw error when incrementing beyond 99', () => {
        expect(() => generateReprintWorkOrder('003-000001 99')).toThrow(
          'Cannot increment print_count beyond 99'
        );
      });
    });
  });

  describe('isReprint()', () => {
    describe('Old Format Detection', () => {
      it('should return false for old format 0 (original)', () => {
        expect(isReprint('003-000001 0')).toBe(false);
      });

      it('should return true for old format 1 (first reprint)', () => {
        expect(isReprint('003-000001 1')).toBe(true);
      });

      it('should return true for old format 2+', () => {
        expect(isReprint('003-000001 2')).toBe(true);
        expect(isReprint('003-000001 9')).toBe(true);
      });
    });

    describe('New Format Detection', () => {
      it('should return false for new format 01 (original)', () => {
        expect(isReprint('003-000001 01')).toBe(false);
      });

      it('should return true for new format 02 (first RMA)', () => {
        expect(isReprint('003-000001 02')).toBe(true);
      });

      it('should return true for new format 03+', () => {
        expect(isReprint('003-000001 03')).toBe(true);
        expect(isReprint('003-000001 10')).toBe(true);
        expect(isReprint('003-000001 99')).toBe(true);
      });
    });
  });

  describe('getReprintReason()', () => {
    describe('Old Format Reasons', () => {
      it('should return "Original Work Order" for 0', () => {
        expect(getReprintReason('0')).toBe('Original Work Order');
      });

      it('should return "First Reprint (PNR/RMA)" for 1', () => {
        expect(getReprintReason('1')).toBe('First Reprint (PNR/RMA)');
      });

      it('should return "Reprint #N" for 2+', () => {
        expect(getReprintReason('2')).toBe('Reprint #2');
        expect(getReprintReason('3')).toBe('Reprint #3');
        expect(getReprintReason('9')).toBe('Reprint #9');
      });
    });

    describe('New Format Reasons', () => {
      it('should return "Original Work Order" for 01', () => {
        expect(getReprintReason('01')).toBe('Original Work Order');
      });

      it('should return "First Reprint (PNR/RMA)" for 02', () => {
        expect(getReprintReason('02')).toBe('First Reprint (PNR/RMA)');
      });

      it('should return "Reprint #N" for 03+ (counting from original)', () => {
        expect(getReprintReason('03')).toBe('Reprint #2');
        expect(getReprintReason('04')).toBe('Reprint #3');
        expect(getReprintReason('10')).toBe('Reprint #9');
        expect(getReprintReason('99')).toBe('Reprint #98');
      });
    });
  });

  describe('calculateMaterialUsage()', () => {
    describe('Old Format Material Calculation', () => {
      it('should calculate 1 material for print_count 0', () => {
        expect(calculateMaterialUsage('003-000001 0')).toBe(1);
      });

      it('should calculate 2 materials for print_count 1', () => {
        expect(calculateMaterialUsage('003-000001 1')).toBe(2);
      });

      it('should calculate N+1 materials for print_count N', () => {
        expect(calculateMaterialUsage('003-000001 2')).toBe(3);
        expect(calculateMaterialUsage('003-000001 5')).toBe(6);
        expect(calculateMaterialUsage('003-000001 9')).toBe(10);
      });
    });

    describe('New Format Material Calculation', () => {
      it('should calculate 1 material for print_count 01', () => {
        expect(calculateMaterialUsage('003-000001 01')).toBe(1);
      });

      it('should calculate 2 materials for print_count 02', () => {
        expect(calculateMaterialUsage('003-000001 02')).toBe(2);
      });

      it('should calculate N materials for print_count N', () => {
        expect(calculateMaterialUsage('003-000001 03')).toBe(3);
        expect(calculateMaterialUsage('003-000001 10')).toBe(10);
        expect(calculateMaterialUsage('003-000001 99')).toBe(99);
      });
    });
  });

  describe('isValidWorkOrderNumber()', () => {
    it('should validate old format WO numbers', () => {
      expect(isValidWorkOrderNumber('003-000001 0')).toBe(true);
      expect(isValidWorkOrderNumber('003-000001 9')).toBe(true);
    });

    it('should validate new format WO numbers', () => {
      expect(isValidWorkOrderNumber('003-000001 01')).toBe(true);
      expect(isValidWorkOrderNumber('003-000001 99')).toBe(true);
    });

    it('should return false for invalid formats', () => {
      expect(isValidWorkOrderNumber('003-000001')).toBe(false);
      expect(isValidWorkOrderNumber('003-000001 100')).toBe(false);
      expect(isValidWorkOrderNumber('invalid')).toBe(false);
      expect(isValidWorkOrderNumber('')).toBe(false);
    });
  });

  describe('getPrintCount()', () => {
    it('should get print count from old format', () => {
      expect(getPrintCount('003-000001 0')).toBe(0);
      expect(getPrintCount('003-000001 5')).toBe(5);
      expect(getPrintCount('003-000001 9')).toBe(9);
    });

    it('should get print count from new format', () => {
      expect(getPrintCount('003-000001 01')).toBe(1);
      expect(getPrintCount('003-000001 05')).toBe(5);
      expect(getPrintCount('003-000001 99')).toBe(99);
    });
  });

  describe('getBaseWorkOrderNumber()', () => {
    it('should get base number from old format', () => {
      expect(getBaseWorkOrderNumber('003-000001 0')).toBe('003-000001');
      expect(getBaseWorkOrderNumber('003-000001 5')).toBe('003-000001');
    });

    it('should get base number from new format', () => {
      expect(getBaseWorkOrderNumber('003-000001 01')).toBe('003-000001');
      expect(getBaseWorkOrderNumber('003-000001 99')).toBe('003-000001');
    });
  });

  describe('Integration: Complete Workflow', () => {
    it('should handle new WO creation and reprinting workflow', () => {
      // Generate new WO
      const newWO = generateNewWorkOrder('003', '000001');
      expect(newWO).toBe('003-000001 01');
      expect(isReprint(newWO)).toBe(false);
      expect(getReprintReason('01')).toBe('Original Work Order');
      expect(calculateMaterialUsage(newWO)).toBe(1);

      // First reprint
      const firstReprint = generateReprintWorkOrder(newWO);
      expect(firstReprint).toBe('003-000001 02');
      expect(isReprint(firstReprint)).toBe(true);
      expect(getReprintReason('02')).toBe('First Reprint (PNR/RMA)');
      expect(calculateMaterialUsage(firstReprint)).toBe(2);

      // Second reprint
      const secondReprint = generateReprintWorkOrder(firstReprint);
      expect(secondReprint).toBe('003-000001 03');
      expect(isReprint(secondReprint)).toBe(true);
      expect(getReprintReason('03')).toBe('Reprint #2');
      expect(calculateMaterialUsage(secondReprint)).toBe(3);
    });

    it('should handle old WO migration to new format', () => {
      // Old format WO
      const oldWO = '003-000001 0';
      expect(isReprint(oldWO)).toBe(false);
      expect(calculateMaterialUsage(oldWO)).toBe(1);

      // Reprint migrates to new format
      const migrated = generateReprintWorkOrder(oldWO);
      expect(migrated).toBe('003-000001 01');
      expect(isReprint(migrated)).toBe(false); // 01 is considered original in new format
      expect(calculateMaterialUsage(migrated)).toBe(1);

      // Second reprint
      const secondReprint = generateReprintWorkOrder(migrated);
      expect(secondReprint).toBe('003-000001 02');
      expect(isReprint(secondReprint)).toBe(true);
      expect(calculateMaterialUsage(secondReprint)).toBe(2);
    });

    it('should maintain same base number across all reprints', () => {
      const newWO = generateNewWorkOrder('003', '000001');
      const reprint1 = generateReprintWorkOrder(newWO);
      const reprint2 = generateReprintWorkOrder(reprint1);

      expect(getBaseWorkOrderNumber(newWO)).toBe('003-000001');
      expect(getBaseWorkOrderNumber(reprint1)).toBe('003-000001');
      expect(getBaseWorkOrderNumber(reprint2)).toBe('003-000001');
    });
  });
});
