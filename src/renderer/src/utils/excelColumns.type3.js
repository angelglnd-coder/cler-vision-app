/**
 * Excel Column Definitions for Type 3 - Scleral Orders
 */

// Excel column display names
export const TYPE3_COLUMNS_EXCEL = [
  // Work order fields
  "Patient Name",
  "Sold To",
  "Customer PO#",
  "No.",
  "PO Date",
  // Scleral-specific fields
  "Eye",
  "B.C.",
  "Sphere",
  "Cyl",
  "Axis",
  "DIAM",
  "OZ",
  "SAG HEIGHT",  // Use space version (matches user's Excel)
  "ADD",
  "CN/CD",
  "F.O.Z.",
  "DESIGN",
  "Device"
];

// Required columns for scleral orders
export const TYPE3_EXPECTED_REQUIRED = [
  // Work order fields
  "Patient Name",
  "Sold To",
  "Customer PO#",
  "No.",
  // Scleral-specific fields
  "Eye",
  "B.C.",
  "Sphere",
  "DIAM",
  "OZ",
  "DESIGN",
  "Device"
];

// Optional columns
export const TYPE3_EXPECTED_OPTIONAL = [
  "Cyl",
  "Axis",
  "SAG_HEIGHT",
  "SAG HEIGHT",  // Alternative with space
  "ADD",
  "CN/CD",
  "F.O.Z.",
  "PO Date"
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
  "Eye": "Eye",
  "B.C.": "BC",
  "Sphere": "Sphere",
  "Cyl": "Cyl",
  "Axis": "Axis",
  "DIAM": "DIAM",
  "OZ": "OZ",
  "SAG_HEIGHT": "SAG_HEIGHT",
  "SAG HEIGHT": "SAG_HEIGHT",  // Alternative with space
  "ADD": "ADD",
  "CN/CD": "CN_CD",
  "F.O.Z.": "FOZ",
  "DESIGN": "DESIGN",
  "Device": "Device"
};

// Numeric fields (for right-alignment in table)
export const TYPE3_NUMERIC_FIELDS = new Set([
  "BC",
  "Sphere",
  "Cyl",
  "Axis",
  "DIAM",
  "OZ",
  "SAG_HEIGHT",
  "ADD",
  "FOZ",
  "DESIGN"
]);
