// src/utils/difSchema.js
// Emits DIF files from a normalized Excel row.
// Line endings default to CRLF to match your samples.

const EOL = "\r\n";
const sv = (v) => (v == null ? "" : Number.isFinite(Number(v)) ? String(Number(v)) : String(v));

/* ===================== LS19 ===================== */
// (unchanged; shown here for completeness)
function buildLS19(row, { mtnum, ctnum }) {
  const data = Array(81).fill(0);

  // Basic mapping from your LS19 orders
  data[0] = row.BC1_BC2 ?? 0; // BC
  data[2] = row.OZ1_OZ2 ?? 0; // OZ
  data[4] = row.RC1_value ?? 0;
  data[8] = row.AC1_value ?? 0;
  data[12] = row.AC2_value ?? 0;
  data[14] = row.AC3_value ?? 0;

  // Widths at tail
  data[74] = row.RC1_width ?? 0.6;
  data[75] = row.AC1_width ?? 0.8;
  data[76] = row.AC2_width ?? 0.4;
  data[77] = row.AC3_width ?? 0.3;
  data[78] = row.PC1_width ?? 0.2;

  // Constants seen in samples
  data[70] = 0.13;
  data[71] = 0.001;

  const L = [];
  L.push(`DIMC cldfile(9)`);
  L.push(`cldfile = "LS19"`);
  L.push(`jnum = 0`);
  L.push(`DIMN data(81)`);
  data.forEach((v, i) => L.push(`data(${i}) = ${sv(v)}`));
  L.push(`DIMN tordat(4)`);
  L.push(`tordat(0) = 0`);
  L.push(`tordat(1) = 0`);
  L.push(`tordat(2) = 0`);
  L.push(`tordat(3) = 0`);
  L.push(`side = 0`);
  L.push(`mtnum = ${sv(mtnum ?? 18)}`);
  L.push(`ctnum = ${sv(ctnum ?? 1)}`);
  L.push(`curtop = 0`);
  L.push(`cursel = 0`);
  L.push(`hcursel = 0`);
  L.push(`DIMC pfname(4,20)`);
  L.push(`pfname(0) = ""`);
  L.push(`pfname(1) = ""`);
  L.push(`pfname(2) = ""`);
  L.push(`pfname(3) = ""`);
  L.push(`jobs_curtop = 0`);
  L.push(`jobs_cursel = 0`);
  L.push(`bcis_curtop = 0`);
  L.push(`bcis_cursel = 0`);

  // Program code location for LS19
  L.push(`DIMC string_data_58(21)`);
  L.push(`string_data_58 = "${sv(row.Program_Code) || "."}"`);
  L.push(`DIMC string_data_63(21)`);
  L.push(`string_data_63 = "."`);
  L.push(`DIMC choices_32(3,21)`);
  L.push(`choices_32(0) = "NONE"`);
  L.push(`choices_32(1) = "SHOULDER"`);
  L.push(`choices_32(2) = "DIAMETER"`);
  L.push(`DIMC choices_58(1,21)`);
  L.push(`choices_58(0) = "${sv(row.Program_Code) || "."}"`);
  L.push(`DIMC choices_63(1,21)`);
  L.push(`choices_63(0) = "."`);
  return L.join(EOL) + EOL;
}

/* ===================== LS28 (UPDATED) ===================== */
// Matches your PK29 sample (003-125241-01.DIF) and family (PL27/PL29/PM27).
function buildLS28(row, { mtnum, ctnum }) {
  const data = Array(99).fill(0);

  // BC / OZ
  data[0] = row.BC1_BC2 ?? 0;
  data[1] = row.BC1_BC2 ?? 0;
  data[4] = row.OZ1_OZ2 ?? 0;

  // RC / AC / PC values + CYL
  data[7] = row.RC1_value ?? 0;
  data[8] = row.RC1_cyl ?? 0;
  data[14] = row.AC1_value ?? 0;
  data[15] = row.AC1_cyl ?? 0;
  data[21] = row.AC2_value ?? 0;
  data[22] = row.AC2_cyl ?? 0;
  data[28] = row.AC3_value ?? 0;
  data[29] = row.AC3_cyl ?? 0;
  data[35] = row.PC1_value ?? 0;
  data[36] = row.PC1_value ?? 0; // duplicated in samples

  // ---- NEW: mid-array constants from your LS28 DIF sample ----
  data[5] = 0.1;
  data[6] = 0.1;
  data[11] = 6.8;
  data[12] = 0.1;
  data[13] = 0.1;
  data[18] = 8.8;
  data[19] = 0.1;

  // Widths at the tail
  data[94] = row.RC1_width ?? 0.6;
  data[95] = row.AC1_width ?? 1.0;
  data[96] = row.AC2_width ?? 0.5;
  data[97] = row.AC3_width ?? 0.3;
  data[98] = row.PC1_width ?? 0.2;

  // Tail constants (as in your files)
  data[89] = 0.13;
  data[90] = 0.001;
  data[91] = 1.0;
  data[92] = 1.0;
  data[93] = 2.0;

  const L = [];
  L.push(`DIMC cldfile(9)`);
  L.push(`cldfile = "LS28"`);
  L.push(`jnum = 0`);
  L.push(`DIMN data(99)`);
  data.forEach((v, i) => L.push(`data(${i}) = ${sv(v)}`));
  L.push(`DIMN tordat(4)`);
  L.push(`tordat(0) = 0`);
  L.push(`tordat(1) = 0`);
  L.push(`tordat(2) = 0`);
  L.push(`tordat(3) = 0`);
  L.push(`side = 0`);
  L.push(`mtnum = ${sv(mtnum ?? 18)}`);
  L.push(`ctnum = ${sv(ctnum ?? 1)}`);
  L.push(`curtop = 0`);
  L.push(`cursel = 0`);
  L.push(`hcursel = 0`);
  L.push(`DIMC pfname(4,20)`);
  L.push(`pfname(0) = ""`);
  L.push(`pfname(1) = ""`);
  L.push(`pfname(2) = ""`);
  L.push(`pfname(3) = ""`);
  L.push(`jobs_curtop = 0`);
  L.push(`jobs_cursel = 0`);
  L.push(`bcis_curtop = 0`);
  L.push(`bcis_cursel = 2`);

  // Program code location for LS28
  L.push(`DIMC string_data_75(21)`);
  L.push(`string_data_75 = "${sv(row.Program_Code) || "."}"`);
  L.push(`DIMC string_data_80(21)`);
  L.push(`string_data_80 = "."`);
  L.push(`DIMC choices_41(3,21)`);
  L.push(`choices_41(0) = "NONE"`);
  L.push(`choices_41(1) = "SHOULDER"`);
  L.push(`choices_41(2) = "DIAMETER"`);
  L.push(`DIMC choices_75(1,21)`);
  L.push(`choices_75(0) = "${sv(row.Program_Code) || "."}"`);
  L.push(`DIMC choices_80(1,21)`);
  L.push(`choices_80(0) = "."`);

  return L.join(EOL) + EOL;
}

/* ===================== Public API ===================== */
export function formatDif(row, { mtnum, ctnum } = {}) {
  const cld = String(row.cldfile || "").toUpperCase();
  return cld === "LS28" ? buildLS28(row, { mtnum, ctnum }) : buildLS19(row, { mtnum, ctnum });
}
