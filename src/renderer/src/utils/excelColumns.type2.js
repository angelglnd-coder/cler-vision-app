/**
 * Type 2 Excel Schema - Production Order Format
 * Column definitions for the new production order file type
 */

export const TYPE2_COLUMNS_EXCEL = [
  "ORDER_#",
  "SERIAL_#",
  "BRAND",
  "PCS",
  "MATERIAL",
  "COLOR",
  "LENS_TYPE",
  "EYES",
  "KM-CODE",
  "POWER-CODE",
  "Base curve (dry)",
  "C.T. (dry)",
  "Lens Power",
  "shopping #",
  "DEVICE",
  "MFG",
  "Mat_Code",
  "Mat_Lot",
  "GTIN",
  "Sold_To",
  "Bill_To",
  "Ship_To",
  "PO date"
];

// All columns are required for Type 2
export const TYPE2_EXPECTED_REQUIRED = TYPE2_COLUMNS_EXCEL;

// No optional columns for Type 2
export const TYPE2_EXPECTED_OPTIONAL = [];

// Field mappings for normalizing Type 2 columns to internal schema
export const TYPE2_FIELD_MAPPINGS = {
  "ORDER_#": "order_number",
  "SERIAL_#": "serial_number",
  "BRAND": "brand",
  "PCS": "pcs",
  "MATERIAL": "material",
  "COLOR": "color",
  "LENS_TYPE": "Type", // Maps to same field as Type 1
  "EYES": "od_os", // Maps to same field as Type 1 "OD/OS"
  "KM-CODE": "km_code",
  "POWER-CODE": "power_code",
  "Base curve (dry)": "base_curve_dry",
  "C.T. (dry)": "ct_dry",
  "Lens Power": "lens_power",
  "shopping #": "shopping_number",
  "DEVICE": "Device", // Maps to same field as Type 1
  "MFG": "Mfg", // Maps to same field as Type 1
  "Mat_Code": "Mat_Code", // Maps to same field as Type 1
  "Mat_Lot": "Mat_Lot", // Maps to same field as Type 1
  "GTIN": "GTIN", // Maps to same field as Type 1
  "Sold_To": "Sold_To", // Maps to same field as Type 1
  "Bill_To": "Bill_To", // Maps to same field as Type 1
  "Ship_To": "Ship_To",
  "PO date": "PO_date" // Maps to same field as Type 1
};

// Numeric fields for Type 2 (for column alignment)
export const TYPE2_NUMERIC_FIELDS = new Set([
  "PCS",
  "Base curve (dry)",
  "C.T. (dry)",
  "Lens Power"
]);
