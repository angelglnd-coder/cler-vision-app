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
  data[3] = row.AC3_width ?? 0;
  data[4] = row.RC1_value ?? 0;
  data[8] = row.AC1_value ?? 0;
  data[12] = row.AC2_value ?? 0;
  data[14] = row.AC3_value ?? 0;

  data[7] = row.AC3_width ?? 0;
  data[11] = row.AC3_width ?? 0;
  data[15] = row.AC3_width ?? 0;
  data[16] = row.AC3_value ?? 0;
  data[19] = row.AC3_width ?? 0;
  data[23] = row.AC3_width ?? 0;
  data[47] = row.PC1_width ?? 0;
  data[49] = row.CT_width ?? 0 ;
  data[61] = row.CT_width ?? 0 ;
  data[66] = row.PC1_width ?? 0 ;


  // Widths at tail
  data[74] = row.RC1_width ?? 0.6;
  data[75] = row.AC1_width ?? 0.8;
  data[76] = row.AC2_width ?? 0.4;
  data[77] = row.AC3_width ?? 0.3;
  data[78] = row.PC1_width ?? 0.2;

  // Constants seen in samples
  data[14] = 10.2;
  data[18] = 10.8;
  data[20] = 12;
  data[22] = 11.2;
  data[26] = 11.2;
  data[30] = 11.2;
  data[31] = 0.0632559776306152;
  data[38] = 9.4114102621422;
  data[40] = 7.2;
  data[41] = 0.5;
  data[42] = 7.76623141893172;
  data[44]= 11.2;
  data[50]= 1.8;
  data[52]=270;
  data[53]=10;
  data[54]=0.3;
  data[55]=0.15;
  data[56]=0.15;
  data[59]=4.15;
  data[60]=270;
  data[64]=4.3;
  data[65]=270;
  data[67]=2;
  data[68]=0.185;
  data[69]=0.185;
  data[70] = 0.13;
  data[71] = 0.001;
  data[72] = 1;
  data[73] = 2;


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
  L.push(`string_data_58 = "${sv(row.Type_Code) || "."}"`);
  L.push(`DIMC string_data_63(21)`);
  L.push(`string_data_63 = "."`);
  L.push(`DIMC choices_32(3,21)`);
  L.push(`choices_32(0) = "NONE"`);
  L.push(`choices_32(1) = "SHOULDER"`);
  L.push(`choices_32(2) = "DIAMETER"`);
  L.push(`DIMC choices_58(1,21)`);
  L.push(`choices_58(0) = "${sv(row.Type_Code) || "."}"`);
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

  // ---- NEW: constants from your LS28 DIF sample ----
  data[5] = 0.1;
  data[6] = 0.1;
  data[11] = 6.8;
  data[12] = 0.1;
  data[13] = 0.1;
  data[18] = 8.8;
  data[19] = 0.1;
  data[25] = 27.34;
  data[26] = 0.1;
  data[27] = 0.1;
  data[32] = 27.94;
  data[33] = 0.1;
  data[34] = 0.1;
  data[39] = 28.34;
  data[41] = 2;
  data[42] = -0.3;
  data[43] = 1.5;
  data[51] = 7.2;
  data[52] = 1;
  data[53] = 1;
  data[59] = 1;
  data[60] = 1;
  data[66] = 0.28;
  data[67] = 1.8;
  data[68] = 0;
  data[69] = 270;
  data[70] = 10;
  data[71] = 0.3;
  data[72] = 0.15;
  data[73] = 0.15;
  data[76] = 4.15;
  data[77] = 270;
  data[78] = 0.25;
  data[82] = 270;
  data[83] = 0.2;
  data[84] = 2;
  data[85] = 0.2;
  data[86] = 0.2;
  data[87] = 0.2;
  data[88] = 0.2;


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
  L.push(`string_data_75 = "${sv(row.Type_Code) || "."}"`);
  L.push(`DIMC string_data_80(21)`);
  L.push(`string_data_80 = "."`);
  L.push(`DIMC choices_41(3,21)`);
  L.push(`choices_41(0) = "NONE"`);
  L.push(`choices_41(1) = "SHOULDER"`);
  L.push(`choices_41(2) = "DIAMETER"`);
  L.push(`DIMC choices_75(1,21)`);
  L.push(`choices_75(0) = "${sv(row.Type_Code) || "."}"`);
  L.push(`DIMC choices_80(1,21)`);
  L.push(`choices_80(0) = "."`);

  return L.join(EOL) + EOL;
}

/* ===================== Public API ===================== */
export function formatDif(row, { mtnum, ctnum } = {}) {
  const cld = String(row.cldfile || "").toUpperCase();
  return cld === "LS28" ? buildLS28(row, { mtnum, ctnum }) : buildLS19(row, { mtnum, ctnum });
}
