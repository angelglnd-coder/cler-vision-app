// src/renderer/src/models/calculators/scleral/formulas.js
// Scleral lens calculation formulas

/**
 * Design type offsets - maps design selection (1-4) to offset values
 * K=1: RHC, K=2: RHCA, K=3: RHCB, K=4: CLER
 */
export const DESIGN_TYPES = {
  1: "RHC",
  2: "RHCA",
  3: "RHCB",
  4: "CLER",
};

/**
 * P.C. base radius (constant)
 */
const PC_BASE = 13.0;

/**
 * Design constants for computing zone radii
 * Each design has increments for RC1 (from BC), AC1 (from RC1), AC2 (from AC1), and pcOffset (from PC_BASE)
 *
 * From Excel columns M, N, O, P (rows 2-4) and row 6:
 * - z1: offset added to BC to get RC 1 (M2/N2/O2/P2)
 * - z2: offset added to RC 1 to get AC 1 (M3/N3/O3/P3)
 * - z3: offset added to AC 1 to get AC 2 (M4/N4/O4/P4)
 * - pcOffset: offset added to PC_BASE (13) to get PC1 (M6/N6/O6/P6)
 */
const DESIGN_CONSTANTS = {
  1: { name: "RHC", z1: 1.5, z2: 1.25, z3: 1.0, pcOffset: 1.0 },   // RHC
  2: { name: "RHCA", z1: 1.5, z2: 1.25, z3: 0.75, pcOffset: 1.67 }, // RHCA
  3: { name: "RHCB", z1: 1.25, z2: 1.0, z3: 0.25, pcOffset: 2.0 },  // RHCB
  4: { name: "CLER", z1: 1.0, z2: 0.8, z3: 0.4, pcOffset: 1.0 },    // CLER
};

/**
 * Default zone width multipliers (S5-S8 from spreadsheet "3 ZONAS RADIALES")
 */
const DEFAULT_ZONE_MULTIPLIERS = {
  S5: 0.5, // Edge offset - fixed edge clearance
  S6: 0.46667, // W1 factor - first zone weight
  S7: 0.33333, // W2 factor - second zone weight
  S8: 0.2, // W3 factor - third zone weight
};

/**
 * Power-to-CT offset lookup table
 * Maps sphere power ranges to center thickness offset
 * Formula: C19 = IFS(C2<=threshold, Q2+offset, ...)
 */
function getPowerOffset(power) {
  const thresholds = [
    [-0.01, 0],
    [0.25, 0.01],
    [0.5, 0.02],
    [1, 0.03],
    [1.25, 0.04],
    [1.5, 0.05],
    [1.75, 0.06],
    [2, 0.07],
    [2.5, 0.08],
    [2.75, 0.09],
    [3, 0.1],
    [3.25, 0.11],
    [3.5, 0.12],
    [3.75, 0.13],
    [4, 0.14],
    [4.25, 0.15],
    [4.5, 0.16],
    [5, 0.17],
    [5.25, 0.18],
    [5.5, 0.19],
    [5.75, 0.2],
    [6, 0.21],
    [6.25, 0.22],
    [6.5, 0.23],
    [6.75, 0.24],
    [7, 0.25],
    [7.25, 0.26],
    [7.5, 0.27],
    [8, 0.28],
    [8.25, 0.29],
    [8.5, 0.3],
    [8.75, 0.31],
    [9, 0.32],
    [9.25, 0.33],
    [9.5, 0.34],
    [9.75, 0.35],
    [10, 0.36],
    [10.25, 0.37],
    [10.5, 0.38],
    [10.75, 0.39],
    [11, 0.4],
    [11.25, 0.41],
    [11.5, 0.42],
    [12, 0.43],
    [12.25, 0.44],
    [12.5, 0.45],
    [12.75, 0.46],
    [13, 0.47],
    [13.25, 0.48],
    [13.5, 0.49],
    [13.75, 0.5],
    [14, 0.51],
    [14.25, 0.52],
    [14.5, 0.53],
    [14.75, 0.54],
    [15, 0.55],
    [15.25, 0.56],
    [15.5, 0.57],
    [15.75, 0.58],
    [16, 0.59],
    [16.25, 0.6],
    [16.5, 0.61],
    [16.75, 0.62],
    [17, 0.63],
    [17.25, 0.65],
    [17.5, 0.66],
    [17.75, 0.67],
    [18, 0.68],
    [18.25, 0.69],
    [18.5, 0.7],
    [18.75, 0.71],
    [19, 0.72],
    [19.25, 0.73],
    [19.5, 0.74],
    [19.75, 0.75],
    [20, 0.76],
  ];

  for (const [threshold, offset] of thresholds) {
    if (power <= threshold) return offset;
  }
  return 0.76; // Max offset for power > 20
}

/**
 * Calculate sagitta (sag) value
 * Formula: (radius - sqrt(radius^2 - (diameter/2)^2)) / 0.01
 */
export function calculateSagitta(radius, diameter) {
  if (radius == null || diameter == null) return null;
  const halfDiam = diameter / 2;
  const radiusSq = radius * radius;
  const halfDiamSq = halfDiam * halfDiam;

  // Check if calculation is valid (radius must be >= halfDiam)
  if (radiusSq < halfDiamSq) return null;

  const sqrtTerm = Math.sqrt(radiusSq - halfDiamSq);
  return (radius - sqrtTerm) / 0.01;
}

/**
 * Calculate toricity-adjusted radius
 * Formula: 337.5 / ((337.5 / radius) + toricity)
 */
export function calculateToricRadius(radius, toricity) {
  if (radius == null) return null;
  if (toricity == null || toricity === 0) return radius;
  const denom = 337.5 / radius + toricity;
  if (Math.abs(denom) < 1e-12) return null;
  return 337.5 / denom;
}

/**
 * Compute zone radii from base curve and design type
 * Replicates Excel's C11, C13, C15, C17 calculations
 *
 * @param {number} baseCurve - B.C. value
 * @param {number} designType - 1=RHC, 2=RHCA, 3=RHCB, 4=CLER
 * @returns {Object} { RC1, AC1, AC2, PC1 }
 */
export function computeZoneRadii(baseCurve, designType) {
  const d = DESIGN_CONSTANTS[designType];
  if (!d) {
    return { RC1: null, AC1: null, AC2: null, PC1: null };
  }

  const RC1 = baseCurve + d.z1; // C11 - Reverse Curve 1
  const AC1 = RC1 + d.z2; // C13 - Alignment Curve 1
  const AC2 = AC1 + d.z3; // C15 - Alignment Curve 2
  const PC1 = PC_BASE + d.pcOffset; // C17 - Peripheral Curve 1

  return { RC1, AC1, AC2, PC1 };
}

/**
 * Calculate zone widths (W1-W4) from DIAM and OZ
 *
 * Formulas from Excel:
 * U3 = (DIAM - OZ) / 2
 * U4 = U3 - S5 (where S5 = 0.5 edge offset)
 * V6 = OZ + 2 * (S6 * U4)  -> W1
 * V7 = V6 + 2 * (S7 * U4)  -> W2
 * V8 = V7 + 2 * (S8 * U4)  -> W3
 * V9 = V8 + 2 * S5         -> W4
 */
export function calculateZoneWidths(diam, oz, multipliers = DEFAULT_ZONE_MULTIPLIERS) {
  const { S5, S6, S7, S8 } = multipliers;

  const U3 = (diam - oz) / 2;
  const U4 = U3 - S5;

  const U6 = S6 * U4;
  const U7 = S7 * U4;
  const U8 = S8 * U4;

  const W1 = oz + 2 * U6; // V6 = C12
  const W2 = W1 + 2 * U7; // V7 = C14
  const W3 = W2 + 2 * U8; // V8 = C16
  const W4 = W3 + 2 * S5; // V9 = C18

  return { W1, W2, W3, W4, U3, U4 };
}

/**
 * Calculate center thickness (CT)
 * C19 = IFS(sphere<=threshold, baseCT+offset, ...)
 */
export function calculateCenterThickness(sphere, baseCT) {
  const offset = getPowerOffset(sphere);
  return baseCT + offset;
}

/**
 * Calculate sag difference for final output
 * Formula: ((sagSum1 - sagSum2)) / 100 - 0.07
 * B19 = ((G28-G29))/100-0.07
 * C21 = ((G25-G26))/100-0.07
 */
export function calculateSagDifference(sagSum1, sagSum2) {
  return (sagSum1 - sagSum2) / 100 - 0.07;
}

/**
 * Main scleral lens calculation
 */
export function computeScleralLens(input) {
  const {
    eye, // "OD" or "OS"
    baseCurve, // B.C. (e.g., 7.40) - B2/B3
    sphere, // Sphere power (e.g., -6.00) - C2/C3
    cylinder, // Cyl (e.g., 0) - D2/D3
    axis, // Axis (e.g., 110) - E2/E3
    diam, // DIAM (e.g., 16.4) - F2/F3
    oz, // O.Z. (e.g., 9.4) - G2/G3
    designType, // 1=RHC, 2=RHCA, 3=RHCB, 4=CLER - K2/K3
    baseCT, // Base center thickness (e.g., 0.36) - Q2/R2
    // Toricity for toric calculations (A11, A13, A15, A17 or G11, G13, G15, G17)
    zone1Toricity = 0,
    zone2Toricity = 0,
    zone3Toricity = 0,
    pcToricity = 0,
    // Zone multipliers (optional override)
    zoneMultipliers,
  } = input;

  // Validate required inputs
  if (baseCurve == null || diam == null || oz == null || designType == null) {
    return { _error: "Missing required inputs (baseCurve, diam, oz, designType)" };
  }

  // Calculate zone widths (W1-W4)
  const widths = calculateZoneWidths(diam, oz, zoneMultipliers);

  // Calculate zone radii from design constants (C11, C13, C15, C17)
  const zoneRadii = computeZoneRadii(baseCurve, designType);
  const RC1_rad = zoneRadii.RC1;
  const AC1_rad = zoneRadii.AC1;
  const AC2_rad = zoneRadii.AC2;
  const PC1_rad = zoneRadii.PC1;

  // Calculate toric versions (B11, B13, B15, B17 for OD; F11, F13, F15, F17 for OS)
  // Formula: 337.5 / ((337.5 / radius) + toricity)
  const RC1_toric = calculateToricRadius(RC1_rad, zone1Toricity);
  const AC1_toric = calculateToricRadius(AC1_rad, zone2Toricity);
  const AC2_toric = calculateToricRadius(AC2_rad, zone3Toricity);
  const PC1_toric = calculateToricRadius(PC1_rad, pcToricity);

  // Calculate sagittas for spherical radii (rows 25-26, 31-32)
  // Row 25: Using C radii (spherical)
  const sag_BC_oz = calculateSagitta(baseCurve, oz); // B25: BC with OZ diameter
  const sag_RC1_W1 = calculateSagitta(RC1_rad, widths.W1); // C25: RC1 with W1
  const sag_AC1_W2 = calculateSagitta(AC1_rad, widths.W2); // D25: AC1 with W2
  const sag_AC2_W3 = calculateSagitta(AC2_rad, widths.W3); // E25: AC2 with W3
  const sag_PC1_W4 = calculateSagitta(PC1_rad, widths.W4); // F25: PC1 with W4

  // G25 = sum of row 25
  const sagSum25 =
    (sag_BC_oz || 0) + (sag_RC1_W1 || 0) + (sag_AC1_W2 || 0) + (sag_AC2_W3 || 0) + (sag_PC1_W4 || 0);

  // Row 26: Different diameter combinations
  const sag_RC1_oz = calculateSagitta(RC1_rad, oz); // B26: RC1 with OZ
  const sag_AC1_W1 = calculateSagitta(AC1_rad, widths.W1); // C26: AC1 with W1
  const sag_AC2_W2 = calculateSagitta(AC2_rad, widths.W2); // D26: AC2 with W2
  const sag_PC1_W3 = calculateSagitta(PC1_rad, widths.W3); // E26: PC1 with W3

  // G26 = sum of row 26
  const sagSum26 = (sag_RC1_oz || 0) + (sag_AC1_W1 || 0) + (sag_AC2_W2 || 0) + (sag_PC1_W3 || 0);

  // Calculate sagittas for toric radii (rows 28-29, 34-35)
  // Row 28: Using B radii (toric) with C diameters
  const sagT_BC_oz = calculateSagitta(baseCurve, oz); // B28
  const sagT_RC1_W1 = calculateSagitta(RC1_toric, widths.W1); // C28
  const sagT_AC1_W2 = calculateSagitta(AC1_toric, widths.W2); // D28
  const sagT_AC2_W3 = calculateSagitta(AC2_toric, widths.W3); // E28
  const sagT_PC1_W4 = calculateSagitta(PC1_toric, widths.W4); // F28

  // G28 = sum of row 28
  const sagSum28 =
    (sagT_BC_oz || 0) +
    (sagT_RC1_W1 || 0) +
    (sagT_AC1_W2 || 0) +
    (sagT_AC2_W3 || 0) +
    (sagT_PC1_W4 || 0);

  // Row 29: Toric radii with different diameters
  const sagT_RC1_oz = calculateSagitta(RC1_toric, oz); // B29
  const sagT_AC1_W1 = calculateSagitta(AC1_toric, widths.W1); // C29
  const sagT_AC2_W2 = calculateSagitta(AC2_toric, widths.W2); // D29
  const sagT_PC1_W3 = calculateSagitta(PC1_toric, widths.W3); // E29

  // G29 = sum of row 29
  const sagSum29 = (sagT_RC1_oz || 0) + (sagT_AC1_W1 || 0) + (sagT_AC2_W2 || 0) + (sagT_PC1_W3 || 0);

  // Calculate sag differences
  // C21 = ((G25-G26))/100-0.07 (spherical sag diff)
  const sagDiffSpherical = calculateSagDifference(sagSum25, sagSum26);

  // B19 = ((G28-G29))/100-0.07 (toric sag diff for OD)
  const sagDiffToric = calculateSagDifference(sagSum28, sagSum29);

  // Calculate center thickness
  // C19 = IFS(sphere<=..., baseCT+offset)
  const centerThickness = calculateCenterThickness(sphere, baseCT || 0.36);

  return {
    _inputs: {
      eye,
      baseCurve,
      sphere,
      cylinder,
      axis,
      diam,
      oz,
      designType,
      designName: DESIGN_TYPES[designType] || "Unknown",
    },

    // Zone radii (spherical) - C column
    zone1_radius: zone1Radius, // C11
    zone2_radius: z2Radius, // C13 (input)
    zone3_radius: z3Radius, // C15 (input)
    pc_radius: pcRad, // C17 (input)

    // Zone radii (toric) - B column for OD, F column for OS
    zone1_toric: zone1Toric, // B11 / F11
    zone2_toric: zone2Toric, // B13 / F13
    zone3_toric: zone3Toric, // B15 / F15
    pc_toric: pcToric, // B17 / F17

    // Zone widths/diameters - C12, C14, C16, C18
    W1: widths.W1, // C12 = V6
    W2: widths.W2, // C14 = V7
    W3: widths.W3, // C16 = V8
    W4: widths.W4, // C18 = V9

    // Sagitta sums
    sagSum_spherical: sagSum25, // G25
    sagSum_spherical2: sagSum26, // G26
    sagSum_toric: sagSum28, // G28
    sagSum_toric2: sagSum29, // G29

    // Sag differences
    sagDiff_spherical: sagDiffSpherical, // C21
    sagDiff_toric: sagDiffToric, // B19

    // Center thickness - C19
    centerThickness,

    // Output CYL/AXIS (pass through) - C22, C23
    outputCyl: cylinder,
    outputAxis: axis,
  };
}

/**
 * Calculator factory for scleral lenses
 */
export function createScleralCalculatorCore({ defaults = {} } = {}) {
  const defaultBaseCT = defaults.baseCT ?? 0.36;

  function computeRow(row) {
    return computeScleralLens({
      eye: row.eye ?? row.Eye ?? "OD",
      baseCurve: row.baseCurve ?? row["B.C."] ?? row.BC ?? row.bc,
      sphere: row.sphere ?? row.Sphere ?? row.SPH ?? row.sph,
      cylinder: row.cylinder ?? row.Cyl ?? row.CYL ?? row.cyl ?? 0,
      axis: row.axis ?? row.Axis ?? row.AXIS,
      diam: row.diam ?? row.DIAM ?? row.Diam,
      oz: row.oz ?? row.OZ ?? row["O.Z."],
      designType: row.designType ?? row.DESIGN ?? row.design ?? 1,
      baseCT: row.baseCT ?? defaultBaseCT,
      // Toricity values
      zone1Toricity: row.zone1Toricity ?? row.toricity ?? 0,
      zone2Toricity: row.zone2Toricity ?? row.toricity ?? 0,
      zone3Toricity: row.zone3Toricity ?? row.toricity ?? 0,
      pcToricity: row.pcToricity ?? row.toricity ?? 0,
    });
  }

  function computeAll(rows = []) {
    return rows.map((r) => ({ ...r, ...computeRow(r) }));
  }

  function computeFirst(rows = []) {
    const first = Array.isArray(rows) && rows.length ? rows[0] : null;
    if (!first) return null;
    return { ...first, ...computeRow(first) };
  }

  return { computeRow, computeAll, computeFirst };
}
