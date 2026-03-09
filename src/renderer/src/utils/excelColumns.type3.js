/**
 * Excel Column Definitions for Type 3 - Scleral Orders
 */

// Excel column display names (must match exact Excel headers)
export const TYPE3_COLUMNS_EXCEL = [
  // Work order fields
  "Patient Name",
  "Sold To",
  "Customer PO#",
  "No.",
  "PO Date",
  // Scleral calculation inputs
  "OD/OS",
  "BC",
  "Sphere",
  "Cyl",
  "Axis",
  "Diam",
  "OZ",
  "ADD",
  "CN/CD",
  "F.O.Z.",
  "DESIGN",
  "Device",
  // Pass-through / production columns
  "Base Clearance",
  "Limbal",
  "End Limbal Zone",
  "Middle landing(MLZ)",
  "Landing Zone(LZ)",
  "PC",
  "Color",
  "Qty",
  "Brand",
  "Laser",
  "Mfg",
  "Mat_Code",
  "Mat_Lot",
  "GTIN",
  "Price Code",
  "Device Type",
  "Ship To",
  "Bill To",
  "Edge Thick",
  "CNTR Code",
  "cldfile",
  "eValue",
  "ADD(Optional)",
  "AXIS(Optional)",
  "Calculation",
  "Toric Mode",
];

// Required columns for scleral orders
export const TYPE3_EXPECTED_REQUIRED = [
  // Work order fields
  "Patient Name",
  "Sold To",
  "Customer PO#",
  "No.",
  // Scleral-specific fields
  "OD/OS",
  "BC",
  "Sphere",
  "Diam",
  "OZ",
  "DESIGN",
  "Device"
];

// Optional columns
export const TYPE3_EXPECTED_OPTIONAL = [
  "Cyl",
  "Axis",
  "ADD",
  "CN/CD",
  "F.O.Z.",
  "PO Date",
  // Pass-through / production columns
  "Base Clearance",
  "Limbal",
  "End Limbal Zone",
  "Middle landing(MLZ)",
  "Landing Zone(LZ)",
  "PC",
  "Color",
  "Qty",
  "Brand",
  "Laser",
  "Mfg",
  "Mat_Code",
  "Mat_Lot",
  "GTIN",
  "Price Code",
  "Device Type",
  "Ship To",
  "Bill To",
  "Edge Thick",
  "CNTR Code",
  "cldfile",
  "eValue",
  "ADD(Optional)",
  "AXIS(Optional)",
  "Calculation",
  "Toric Mode",
];

// Field name mappings (Excel display name -> internal field name)
export const TYPE3_FIELD_MAPPINGS = {
  // Work order fields
  "Patient Name": "Patient_Name",
  "Sold To": "Sold_To",
  "Customer PO#": "PO",
  "No.": "No",
  "PO Date": "PO_date",
  // Scleral-specific fields
  "OD/OS": "Eye",
  "BC": "BC",
  "Sphere": "Sphere",
  "Cyl": "Cyl",
  "Axis": "Axis",
  "Diam": "Diam",
  "OZ": "OZ",
  "ADD": "ADD",
  "CN/CD": "CN_CD",
  "F.O.Z.": "FOZ",
  "DESIGN": "DESIGN",
  "Device": "Device",
  // Pass-through / production columns
  "Base Clearance": "Base_Clearance",
  "Limbal": "Limbal",
  "End Limbal Zone": "End_Limbal_Zone",
  "Middle landing(MLZ)": "MLZ",
  "Landing Zone(LZ)": "LZ",
  "PC": "PC",
  "Color": "Color",
  "Qty": "Qty",
  "Brand": "Brand",
  "Laser": "Laser",
  "Mfg": "Mfg",
  "Mat_Code": "Mat_Code",
  "Mat_Lot": "Mat_Lot",
  "GTIN": "GTIN",
  "Price Code": "Price_Code",
  "Device Type": "Device_Type",
  "Ship To": "Ship_To",
  "Bill To": "Bill_To",
  "Edge Thick": "Edge_Thick",
  "CNTR Code": "CNTR_Code",
  "cldfile": "cldfile",
  "eValue": "eValue",
  "ADD(Optional)": "ADD_Optional",
  "AXIS(Optional)": "AXIS_Optional",
  "Calculation": "Calculation",
  "Toric Mode": "Toric_Mode",
};

// Numeric fields (for right-alignment in table) — use Excel display names
export const TYPE3_NUMERIC_FIELDS = new Set([
  "BC",
  "Sphere",
  "Cyl",
  "Axis",
  "Diam",
  "OZ",
  "ADD",
  "FOZ",
  "DESIGN"
]);
