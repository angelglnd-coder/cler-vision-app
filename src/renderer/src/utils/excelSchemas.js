/**
 * Excel Schema Registry
 * Defines multiple file types with signature-based detection
 */

import {
  WO_COLUMNS_EXCEL,
  EXPECTED_REQUIRED,
  EXPECTED_OPTIONAL
} from "./woColumns.js";

import {
  TYPE2_COLUMNS_EXCEL,
  TYPE2_EXPECTED_REQUIRED,
  TYPE2_EXPECTED_OPTIONAL,
  TYPE2_FIELD_MAPPINGS,
  TYPE2_NUMERIC_FIELDS
} from "./excelColumns.type2.js";

// Type 1 field mappings (Excel display name → internal field name)
const TYPE1_FIELD_MAPPINGS = {
  "Patient Name": "Patient_Name",
  "Customer PO#": "PO",
  "PO Date": "PO_date",
  "No.": "No",
  "OD/OS": "od_os",
  "K-Code": "K_Code",
  "Sphr Pwr/P-Code": "P_Code",
  "Price Code": "Price_Code",
  "SPEC": "SPEC",
  "Cyl/TORIC": "Cyl",
  "Diam": "Diam",
  "Color": "Color",
  "Qty": "Qty",
  "Laser Mark": "Laser",
  "Design": "Design",
  "Viet Label": "Viet_Label",
  "Brand": "Labeling",
  "Addr To": "Ship_Code",
  "Previous S.O#": "Previous_SO",
  "Note": "Note",
  "Device": "Device",
  "Mfg": "Mfg",
  "Mat_Code": "Mat_Code",
  "Mat_Lot": "Mat_Lot",
  "GTIN": "GTIN",
  "Sold To": "Sold_To",
  "Bill To": "Bill_To",
  "cldfile": "cldfile",
  "Device Type": "Type",
  "Edge Thick": "Edge_Thick",
  "Center Thick": "Center_Thick",
  "eValue": "eValue",
  "Container Code": "Container_Code"
};

// Type 1 numeric fields (for column alignment)
const TYPE1_NUMERIC_FIELDS = new Set([
  "PW1_PW2",
  "DIAM",
  "OZ1_OZ2",
  "SAG_HEIGHT",
  "CT_width",
  "RC1_value",
  "RC1_width",
  "RC1_cyl",
  "AC1_value",
  "AC1_width",
  "AC1_cyl",
  "AC2_value",
  "AC2_width",
  "AC2_cyl",
  "AC3_value",
  "AC3_width",
  "AC3_cyl",
  "PC1_value",
  "PC1_width",
  "Queue_Thickness",
  "mtnum",
  "ctnum"
]);

/**
 * SCHEMA TYPE 1 - Current Work Order Format
 */
export const SCHEMA_TYPE1 = {
  id: "type1",
  name: "HAI ORDERS",
  version: "1.0",

  // Signature columns for deterministic detection
  signatures: {
    required: ["cldfile", "Container Code"], // Must have ALL these columns
    preferred: ["Patient Name", "Type", "Sphr Pwr/P-Code"] // Bonus points if present
  },

  // Column definitions
  columns: {
    excel: WO_COLUMNS_EXCEL, // Display names in Excel
    required: EXPECTED_REQUIRED, // Required columns
    optional: EXPECTED_OPTIONAL // Optional columns
  },

  // Field name mappings (Excel → internal)
  fieldMappings: TYPE1_FIELD_MAPPINGS,

  // Numeric fields (for right-alignment in table)
  numericFields: TYPE1_NUMERIC_FIELDS,

  // Date fields (need special handling)
  dateFields: ["PO Date"],

  // Processing configuration
  processing: {
    needsCalculation: true, // Apply lens calculations
    needsWOGeneration: true, // Generate work order numbers
    skipSteps: [] // No steps to skip
  },

  // Validation configuration
  validation: {
    strictColumns: false // Don't show warnings for missing/extra columns
  }
};

/**
 * SCHEMA TYPE 2 - Production Order Format
 */
export const SCHEMA_TYPE2 = {
  id: "type2",
  name: "GOB ORDERS",
  version: "1.0",

  // Signature columns for deterministic detection
  signatures: {
    required: ["ORDER_#", "SERIAL_#", "LENS_TYPE"], // Must have ALL these columns
    preferred: ["EYES", "KM-CODE", "POWER-CODE", "Sold_To"] // Bonus points if present
  },

  // Column definitions
  columns: {
    excel: TYPE2_COLUMNS_EXCEL, // Display names in Excel
    required: TYPE2_EXPECTED_REQUIRED, // All columns required
    optional: TYPE2_EXPECTED_OPTIONAL // No optional columns
  },

  // Field name mappings (Excel → internal)
  fieldMappings: TYPE2_FIELD_MAPPINGS,

  // Numeric fields (for right-alignment in table)
  numericFields: TYPE2_NUMERIC_FIELDS,

  // Date fields (need special handling)
  dateFields: ["PO date"],

  // Processing configuration
  processing: {
    needsCalculation: false, // SKIP lens calculations for Type 2
    needsWOGeneration: true, // Generate work order numbers
    skipSteps: ["calculate"] // Skip calculation step
  },

  // Validation configuration
  validation: {
    strictColumns: false // Don't show warnings for missing/extra columns
  }
};

/**
 * Registry of all supported schemas
 */
export const ALL_SCHEMAS = [SCHEMA_TYPE1, SCHEMA_TYPE2];

/**
 * Get schema by ID
 * @param {string} id - Schema ID ("type1" | "type2")
 * @returns {object|null} Schema object or null if not found
 */
export function getSchemaById(id) {
  return ALL_SCHEMAS.find((s) => s.id === id) || null;
}

/**
 * Get schema by name
 * @param {string} name - Schema name
 * @returns {object|null} Schema object or null if not found
 */
export function getSchemaByName(name) {
  return ALL_SCHEMAS.find((s) => s.name === name) || null;
}
