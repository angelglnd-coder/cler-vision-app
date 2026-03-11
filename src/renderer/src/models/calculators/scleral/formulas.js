// src/renderer/src/models/calculators/scleral/formulas.js
// Scleral lens calculation formulas

import { ok } from "../baseCalculator.js";
import zonesCtTable from "./lookups/zones-ct.lookup.json";
import widthsTable from "./lookups/widths.lookup.json";

/**
 * Design type names for 3-zone (8 designs) and 4-zone (9 designs).
 * Keyed by zone count.
 */
export const DESIGN_TYPES = {
  3: Object.fromEntries(
    Object.entries(zonesCtTable["3zone"].designs).map(([k, v]) => [k, v.name])
  ),
  4: Object.fromEntries(
    Object.entries(zonesCtTable["4zone"].designs).map(([k, v]) => [k, v.name])
  ),
};

/**
 * Resolve design type from name or number.
 * Accepts 1–9 numeric or known design name strings.
 */
export function resolveDesignType(value, zones = 3) {
  if (value == null) return 1;
  const n = Number(value);
  if (Number.isFinite(n) && n >= 1 && n <= 9) return n;
  const name = String(value).toUpperCase().trim();

  // 3-zone: CLER=4, no RHCBb, CLER variants at 5–8
  const nameMap3 = {
    RHC: 1, RHCA: 2, RHCB: 3, CLER: 4, ARGERIE: 4,
    "CLER(1-14)": 5, "1-14": 5,
    "CLER(15-28)": 6, "15-28": 6,
    "CLER(29-50)": 7, "29-50": 7,
    "CLER(51-72)": 8, "51-72": 8,
  };
  // 4-zone: CLER=4, CLER variants at 5–8, RHCBb=9 (key = pcOffset from last table row)
  const nameMap4 = {
    RHC: 1, RHCA: 2, RHCB: 3,
    CLER: 4,
    "CLER(1-14)": 5, "1-14": 5,
    "CLER(15-28)": 6, "15-28": 6,
    "CLER(29-50)": 7, "29-50": 7,
    "CLER(51-72)": 8, "51-72": 8,
    RHCBB: 9,
  };

  const nameMap = zones === 4 ? nameMap4 : nameMap3;
  return nameMap[name] ?? 1;
}

/**
 * Power-to-CT offset lookup table.
 * Matches Excel IFS formula exactly (including the 0.63→0.65 jump at 17.25).
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
    [17.25, 0.65], // Note: Excel skips 0.64 here
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
  return 0.76;
}

/**
 * Calculate sagitta (sag) value.
 * Formula: (R - sqrt(R^2 - (D/2)^2)) / 0.01
 * Result is in microns (mm × 100).
 */
export function calculateSagitta(radius, diameter) {
  if (radius == null || diameter == null) return null;
  const halfDiam = diameter / 2;
  const radiusSq = radius * radius;
  const halfDiamSq = halfDiam * halfDiam;
  if (radiusSq < halfDiamSq) return null;
  return (radius - Math.sqrt(radiusSq - halfDiamSq)) / 0.01;
}

/**
 * Apply toric offset to a spherical radius.
 * - mode 'diop':   337.5 / ((337.5 / R) + offset)  — diopter-based
 * - mode 'micron': R + offset / 1000                 — micron-based
 */
function applyToric(radius, offset, mode) {
  if (radius == null) return null;
  if (!offset) return radius;
  if (mode === "diop") {
    const denom = 337.5 / radius + offset;
    if (Math.abs(denom) < 1e-12) return null;
    return 337.5 / denom;
  }
  return radius + offset / 1000;
}

/**
 * Legacy diop-mode toric radius (kept for backwards compat with computeScleralLens).
 * Formula: 337.5 / ((337.5 / radius) + toricity)
 */
export function calculateToricRadius(radius, toricity) {
  return applyToric(radius, toricity, "diop");
}

/**
 * Compute zone radii from the JSON lookup table.
 *
 * @param {number} bc - base curve in mm
 * @param {number} designId - 1–8 (3-zone) or 1–9 (4-zone)
 * @param {3|4} zones - zone count
 * @returns {{ rc1, ac1, ac2, ac3?, pc1 } | null}
 */
export function computeZoneRadii(bc, designId, zones = 3) {
  const tableKey = zones === 4 ? "4zone" : "3zone";
  const entry = zonesCtTable[tableKey];
  const d = entry.designs[String(designId)];
  if (!d) return null;

  const rc1 = bc + d.z1;
  const ac1 = rc1 + d.z2;
  const ac2 = ac1 + d.z3;
  const ac3 = zones === 4 ? ac2 + d.z4 : undefined;
  const pc1 = entry.pcBase + d.pcOffset;

  return { rc1, ac1, ac2, ...(zones === 4 && { ac3 }), pc1 };
}

/**
 * Calculate zone widths from the JSON lookup table.
 *
 * 3-zone returns: { w1, w2, w3, totalW }
 * 4-zone returns: { w1, w2, w3, w4, totalW }
 *
 * totalW = outer edge diameter (used for PC1 sagitta).
 */
export function calculateZoneWidths(diam, oz, zones = 3) {
  const tableKey = zones === 4 ? "4zone" : "3zone";
  const { edgeReserve, ratios } = widthsTable[tableKey];

  const edgeBand = (diam - oz) / 2;
  const avail = edgeBand - edgeReserve;

  const names = ["w1", "w2", "w3", "w4"];
  const result = {};
  let current = oz;
  for (let i = 0; i < ratios.length; i++) {
    current = current + 2 * ratios[i] * avail;
    result[names[i]] = current;
  }
  result.totalW = current + 2 * edgeReserve;

  return result;
}

/**
 * Calculate center thickness.
 * CT = baseCT + powerOffset(sphere)
 */
export function calculateCenterThickness(sphere, baseCT) {
  return baseCT + getPowerOffset(sphere);
}

/**
 * Calculate sag difference.
 * Formula: (sumFull - sumShift) / 100 - 0.07
 * The -0.07 baseline subtraction is mandatory.
 */
export function calculateSagDifference(sumFull, sumShift) {
  return (sumFull - sumShift) / 100 - 0.07;
}

// ---------------------------------------------------------------------------
// New public API
// ---------------------------------------------------------------------------

/**
 * Calculate scleral lens parameters.
 *
 * @param {object} input
 * @param {number} input.bc       - base curve in mm
 * @param {number} input.diam     - total diameter in mm
 * @param {number} input.oz       - optical zone in mm
 * @param {number} input.design   - design ID (1–8 for 3-zone, 1–9 for 4-zone)
 * @param {number} input.sphere   - sphere power (for CT)
 * @param {number} [input.toricity=0]     - toric offset (µm or diop per mode)
 * @param {3|4}   [input.zones=3]         - zone count
 * @param {'micron'|'diop'} [input.mode='micron'] - toric unit mode
 *
 * @returns {{
 *   radii: { rc1, ac1, ac2, ac3?, pc1 },
 *   widths: { w1, w2, w3, w4? },
 *   sag: {
 *     principal: { sumFull, sumShift, difference },
 *     toric:     { sumFull, sumShift, difference }
 *   },
 *   centerThickness: number
 * }}
 */
export function calculateScleral({
  bc,
  diam,
  oz,
  design,
  sphere,
  toricity = 0,
  zones = 3,
  mode = "micron",
}) {
  const designId = resolveDesignType(design, zones);
  const tableKey = zones === 4 ? "4zone" : "3zone";
  const tableEntry = zonesCtTable[tableKey];
  const d = tableEntry.designs[String(designId)];
  if (!d) {
    return { _error: `Invalid design ${design} for ${zones}-zone mode` };
  }

  // 1. Spherical zone radii
  const rc1 = bc + d.z1;
  const ac1 = rc1 + d.z2;
  const ac2 = ac1 + d.z3;
  const ac3 = zones === 4 ? ac2 + d.z4 : undefined;
  const pc1 = tableEntry.pcBase + d.pcOffset;

  // 2. Toric zone radii (BC stays spherical)
  const rc1t = applyToric(rc1, toricity, mode);
  const ac1t = applyToric(ac1, toricity, mode);
  const ac2t = applyToric(ac2, toricity, mode);
  const ac3t = zones === 4 ? applyToric(ac3, toricity, mode) : undefined;
  const pc1t = applyToric(pc1, toricity, mode);

  // 3. Zone widths
  const widths = calculateZoneWidths(diam, oz, zones);

  // 4. Build ordered arrays for sag loop
  const spherRadii = zones === 4 ? [rc1, ac1, ac2, ac3, pc1] : [rc1, ac1, ac2, pc1];
  const toricRadii = zones === 4 ? [rc1t, ac1t, ac2t, ac3t, pc1t] : [rc1t, ac1t, ac2t, pc1t];

  const outerW = zones === 4
    ? [widths.w1, widths.w2, widths.w3, widths.w4, widths.totalW]
    : [widths.w1, widths.w2, widths.w3, widths.totalW];
  const shiftW = [oz, ...outerW.slice(0, -1)]; // [oz, w1, w2, w3, (w4)]

  // 5. Sag sums — principal (spherical) meridian
  const principalFull =
    (calculateSagitta(bc, oz) || 0) +
    spherRadii.reduce((s, r, i) => s + (calculateSagitta(r, outerW[i]) || 0), 0);
  const principalShift = spherRadii.reduce(
    (s, r, i) => s + (calculateSagitta(r, shiftW[i]) || 0),
    0
  );

  // 6. Sag sums — toric meridian
  const toricFull =
    (calculateSagitta(bc, oz) || 0) +
    toricRadii.reduce((s, r, i) => s + (calculateSagitta(r, outerW[i]) || 0), 0);
  const toricShift = toricRadii.reduce(
    (s, r, i) => s + (calculateSagitta(r, shiftW[i]) || 0),
    0
  );

  // 7. Center thickness
  const centerThickness = calculateCenterThickness(sphere, tableEntry.baseCT);

  return {
    radii: {
      rc1,
      ac1,
      ac2,
      ...(zones === 4 && { ac3 }),
      pc1,
    },
    widths: {
      w1: widths.w1,
      w2: widths.w2,
      w3: widths.w3,
      ...(zones === 4 && { w4: widths.w4 }),
    },
    sag: {
      principal: {
        sumFull: principalFull,
        sumShift: principalShift,
        difference: calculateSagDifference(principalFull, principalShift),
      },
      toric: {
        sumFull: toricFull,
        sumShift: toricShift,
        difference: calculateSagDifference(toricFull, toricShift),
      },
    },
    centerThickness,
  };
}

// ---------------------------------------------------------------------------
// Legacy API (computeScleralLens) — kept for backwards compatibility
// ---------------------------------------------------------------------------

/**
 * Main scleral lens calculation (legacy API, supports 3-zone and 4-zone).
 * Uses the same JSON-backed formulas as calculateScleral.
 */
export function computeScleralLens(input) {
  const {
    eye,
    baseCurve,
    sphere,
    cylinder,
    axis,
    diam,
    oz,
    designType,
    baseCT,
    zones = 3,
    zone1Toricity = 0,
    zone2Toricity = 0,
    zone3Toricity = 0,
    zone4Toricity = 0,
    pcToricity = 0,
    toricMode = "diop",
  } = input;

  if (baseCurve == null || diam == null || oz == null || designType == null) {
    return { _error: "Missing required inputs (baseCurve, diam, oz, designType)" };
  }

  const tableKey = zones === 4 ? "4zone" : "3zone";
  const designId = resolveDesignType(designType, zones);
  const tableEntry = zonesCtTable[tableKey];
  const d = tableEntry.designs[String(designId)];
  if (!d) {
    return { _error: `Unknown designType: ${designType}` };
  }

  // Zone radii (spherical)
  const RC1_rad = baseCurve + d.z1;
  const AC1_rad = RC1_rad + d.z2;
  const AC2_rad = AC1_rad + d.z3;
  const AC3_rad = zones === 4 ? AC2_rad + d.z4 : null;
  const PC1_rad = tableEntry.pcBase + d.pcOffset;

  // Zone radii (toric)
  const RC1_toric = applyToric(RC1_rad, zone1Toricity, toricMode);
  const AC1_toric = applyToric(AC1_rad, zone2Toricity, toricMode);
  const AC2_toric = applyToric(AC2_rad, zone3Toricity, toricMode);
  const AC3_toric = zones === 4 ? applyToric(AC3_rad, zone4Toricity, toricMode) : null;
  const PC1_toric = applyToric(PC1_rad, pcToricity, toricMode);

  // Zone widths
  const widths = calculateZoneWidths(diam, oz, zones);
  const { w1: W1, w2: W2, w3: W3, totalW } = widths;
  const W4 = zones === 4 ? widths.w4 : null;
  const PC_W = zones === 4 ? totalW : widths.totalW; // PC sag uses totalW in both cases

  // Sagitta sums — spherical
  const sag_BC_oz  = calculateSagitta(baseCurve, oz);
  const sag_RC1_W1 = calculateSagitta(RC1_rad, W1);
  const sag_AC1_W2 = calculateSagitta(AC1_rad, W2);
  const sag_AC2_W3 = calculateSagitta(AC2_rad, W3);
  const sag_AC3_W4 = zones === 4 ? calculateSagitta(AC3_rad, W4) : null;
  const sag_PC1_PCW = calculateSagitta(PC1_rad, PC_W);
  const sagSum25 = (sag_BC_oz || 0) + (sag_RC1_W1 || 0) + (sag_AC1_W2 || 0) + (sag_AC2_W3 || 0) + (sag_AC3_W4 || 0) + (sag_PC1_PCW || 0);

  const sag_RC1_oz  = calculateSagitta(RC1_rad, oz);
  const sag_AC1_W1  = calculateSagitta(AC1_rad, W1);
  const sag_AC2_W2  = calculateSagitta(AC2_rad, W2);
  const sag_AC3_W3  = zones === 4 ? calculateSagitta(AC3_rad, W3) : null;
  const sag_PC1_shift = zones === 4 ? calculateSagitta(PC1_rad, W4) : calculateSagitta(PC1_rad, W3);
  const sagSum26 = (sag_RC1_oz || 0) + (sag_AC1_W1 || 0) + (sag_AC2_W2 || 0) + (sag_AC3_W3 || 0) + (sag_PC1_shift || 0);

  // Sagitta sums — toric
  const sagT_BC_oz   = calculateSagitta(baseCurve, oz);
  const sagT_RC1_W1  = calculateSagitta(RC1_toric, W1);
  const sagT_AC1_W2  = calculateSagitta(AC1_toric, W2);
  const sagT_AC2_W3  = calculateSagitta(AC2_toric, W3);
  const sagT_AC3_W4  = zones === 4 ? calculateSagitta(AC3_toric, W4) : null;
  const sagT_PC1_PCW = calculateSagitta(PC1_toric, PC_W);
  const sagSum28 = (sagT_BC_oz || 0) + (sagT_RC1_W1 || 0) + (sagT_AC1_W2 || 0) + (sagT_AC2_W3 || 0) + (sagT_AC3_W4 || 0) + (sagT_PC1_PCW || 0);

  const sagT_RC1_oz  = calculateSagitta(RC1_toric, oz);
  const sagT_AC1_W1  = calculateSagitta(AC1_toric, W1);
  const sagT_AC2_W2  = calculateSagitta(AC2_toric, W2);
  const sagT_AC3_W3  = zones === 4 ? calculateSagitta(AC3_toric, W3) : null;
  const sagT_PC1_shift = zones === 4 ? calculateSagitta(PC1_toric, W4) : calculateSagitta(PC1_toric, W3);
  const sagSum29 = (sagT_RC1_oz || 0) + (sagT_AC1_W1 || 0) + (sagT_AC2_W2 || 0) + (sagT_AC3_W3 || 0) + (sagT_PC1_shift || 0);

  const sagDiffSpherical = calculateSagDifference(sagSum25, sagSum26);
  const sagDiffToric     = calculateSagDifference(sagSum28, sagSum29);

  const centerThickness = calculateCenterThickness(sphere, baseCT ?? tableEntry.baseCT);
  console.log('[Scleral CT]', { sphere, baseCT: baseCT ?? tableEntry.baseCT, powerOffset: getPowerOffset(sphere), centerThickness });

  const designNames = DESIGN_TYPES[zones === 4 ? 4 : 3];

  return {
    _inputs: { eye, baseCurve, sphere, cylinder, axis, diam, oz, designType, zones, designName: designNames[designId] ?? "Unknown" },

    BC1_BC2: ok(baseCurve),
    PW1_PW2: ok(sphere),
    OZ1_OZ2: ok(oz),

    RC1_radius: ok(RC1_rad),
    RC1_tor: ok(RC1_toric),
    RC1_width: ok(W1),

    AC1_radius: ok(AC1_rad),
    AC1_tor: ok(AC1_toric),
    AC1_width: ok(W2),

    AC2_radius: ok(AC2_rad),
    AC2_tor: ok(AC2_toric),
    AC2_width: ok(W3),

    AC3_radius: ok(AC3_rad),
    AC3_tor: ok(AC3_toric),
    AC3_width: ok(W4),

    PC_width: ok(PC_W),
    PC1_radius: ok(PC1_rad),
    PC2_radius: ok(PC1_rad),
    PC_radius: PC1_rad,

    LensPower: 1,

    sagSum_spherical: sagSum25,
    sagSum_spherical2: sagSum26,
    sagSum_toric: sagSum28,
    sagSum_toric2: sagSum29,

    sagDiff_spherical: sagDiffSpherical,
    sagDiff_toric: sagDiffToric,

    centerThickness,

    outputCyl: cylinder,
    outputAxis: axis,
  };
}

/**
 * Calculator factory for scleral lenses.
 */
export function createScleralCalculatorCore({ defaults = {} } = {}) {
  const defaultBaseCT = defaults.baseCT ?? zonesCtTable["3zone"].baseCT;
  const defaultZones  = defaults.zones  ?? 3;

  function computeRow(row) {
    const zones = row.zones ?? defaultZones;
    return computeScleralLens({
      eye: row["OD/OS"] ?? row.Eye ?? row.eye ?? "OD",
      baseCurve: row["B.C."] ?? row.BC ?? row.baseCurve ?? row.bc,
      sphere: row.Sphere ?? row.sphere ?? row.SPH ?? row.sph,
      cylinder: row.Cyl ?? row.cylinder ?? row.CYL ?? row.cyl ?? 0,
      axis: row.Axis ?? row.axis ?? row.AXIS,
      diam: row.DIAM ?? row.Diam ?? row.diam,
      oz: row.OZ ?? row.oz ?? row["O.Z."],
      designType: resolveDesignType(row.DESIGN ?? row.design ?? row.designType, zones),
      baseCT: row["Center Thick"] ?? row.baseCT ?? defaultBaseCT,
      zones,
      add: row.ADD ?? row.add,
      cnCd: row["CN/CD"] ?? row.cnCd,
      foz: row["F.O.Z."] ?? row.FOZ ?? row.foz,
      zone1Toricity: row.zone1Toricity ?? row.toricity ?? 0,
      zone2Toricity: row.zone2Toricity ?? row.toricity ?? 0,
      zone3Toricity: row.zone3Toricity ?? row.toricity ?? 0,
      zone4Toricity: row.zone4Toricity ?? row.toricity ?? 0,
      pcToricity: row.pcToricity ?? row.toricity ?? 0,
      toricMode: String(row["Toric Mode"] ?? row.toricMode ?? row.Toric_Mode ?? "diop").toLowerCase(),
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
