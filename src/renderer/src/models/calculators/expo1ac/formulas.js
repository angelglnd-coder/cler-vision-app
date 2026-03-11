// src/renderer/src/models/calculators/expo1ac/formulas.js
// EXPO1AC lens calculation formulas
//
// PLACEHOLDER: This file currently mirrors Ortho K formulas.
// Replace with actual EXPO1AC-specific formulas when available.

import {
  toNum,
  cap2,
  ok,
  err,
  resolveToricity,
  pickFields,
  getRef2ByDiamOz,
} from "../baseCalculator.js";

/* ---------------- core formulas ---------------- */
// TODO: Replace these with EXPO1AC-specific formulas

// BC1_BC2 = 337.5 / ( K - JESSEN + P )
export function computeBC1BC2(K, P, JESSEN) {
  const k = toNum(K),
    p = toNum(P),
    j = toNum(JESSEN);
  if (k == null || p == null || j == null) return err("missing input");
  const denom = k - j + p;
  if (!Number.isFinite(denom) || Math.abs(denom) < 1e-12) return err("division by zero");
  return ok(337.5 / denom);
}

export const computePW1PW2 = (J) => {
  const n = toNum(J);
  return n == null ? err("missing JESSEN") : ok(n);
};

export const computeOZ1OZ2 = (OZ) => {
  const n = toNum(OZ);
  return n == null ? err("missing O.Z.") : ok(n);
};

// RC1_radius = 337.5 / ( K - P*FX + JESSEN - TORICITY_offset )
export function computeRC1Radius(K, P, FX, JESSEN, TORICITY_offset = 0) {
  const k = toNum(K),
    p = toNum(P),
    fx = toNum(FX),
    j = toNum(JESSEN),
    t = toNum(TORICITY_offset) ?? 0;
  if (k == null || p == null || fx == null || j == null) return err("missing input");
  const denom = k - p * fx + j - t;
  if (!Number.isFinite(denom) || Math.abs(denom) < 1e-12) return err("division by zero");
  const rawValue = 337.5 / denom;
  return { value: cap2(rawValue), _raw: rawValue };
}

// RC1_tor = 337.5 / ( 337.5 / RC1_radius_raw + TORICITY_value )
export function computeRC1Tor(RC1_radius_result, TORICITY_value) {
  if (RC1_radius_result?._error) {
    return err(RC1_radius_result._error);
  }

  const r = RC1_radius_result?._raw ?? toNum(RC1_radius_result?.value ?? RC1_radius_result);
  const t = toNum(TORICITY_value);

  if (r == null) return err("missing RC1_radius");
  if (t == null) return err("missing TORICITY_value");
  if (t < 0) return err("TORICITY_value must be non-negative");

  const denom = 337.5 / r + t;
  if (!Number.isFinite(denom) || Math.abs(denom) < 1e-12) return err("division by zero");
  return ok(337.5 / denom);
}

// AC1_radius = 337.5 / ( K + 0.12 + TORICITY_offset )
export function computeAC1Radius(K, TORICITY_offset = 0) {
  const k = toNum(K),
    t = toNum(TORICITY_offset) ?? 0;
  if (k == null) return err("missing K");
  const denom = k + 0.12 + t;
  if (!Number.isFinite(denom) || Math.abs(denom) < 1e-12) return err("division by zero");
  return ok(337.5 / denom);
}

// AC1_tor = 337.5 / ( K + 0.12 + TORICITY_value + TORICITY_offset )
export function computeAC1Tor(K, TORICITY_value, TORICITY_offset = 0) {
  const k = toNum(K),
    v = toNum(TORICITY_value),
    t = toNum(TORICITY_offset) ?? 0;
  if (k == null || v == null) return err("missing K or TORICITY_value");
  const denom = k + 0.12 + v + t;
  if (!Number.isFinite(denom) || Math.abs(denom) < 1e-12) return err("division by zero");
  return ok(337.5 / denom);
}

// AC2 offsets added on top of AC1
export function computeAC2RadiusTor(AC1_radius, AC1_tor, eValue) {
  const r1 = toNum(AC1_radius),
    t1 = toNum(AC1_tor),
    e = toNum(eValue);
  if (r1 == null || e == null)
    return {
      radius: err("missing AC1_radius or eValue"),
      tor: err("missing AC1_radius or eValue"),
    };
  if (t1 == null)
    return {
      radius: ok(r1 + 0),
      tor: err("missing AC1_tor"),
    };

  // TODO: Replace with EXPO1AC-specific eValue offset table
  let add = null;
  if (e <= 0.3) add = 0.12;
  else if (e <= 0.35) add = 0.13;
  else if (e <= 0.4) add = 0.16;
  else if (e <= 0.425) add = 0.17;
  else if (e <= 0.45) add = 0.18;
  else if (e <= 0.5) add = 0.22;
  else if (e <= 0.55) add = 0.23;
  else if (e <= 0.6) add = 0.29;
  else if (e <= 0.65) add = 0.3;
  else if (e <= 0.7) add = 0.36;
  else if (e <= 0.75) add = 0.38;
  else if (e <= 0.8) add = 0.46;
  else if (e <= 0.85) add = 0.48;
  else if (e <= 0.9) add = 0.5;
  else if (e <= 0.95) add = 0.52;
  else if (e <= 1.0) add = 0.54;
  else if (e <= 1.05) add = 0.56;
  else if (e <= 1.1) add = 0.58;
  else if (e <= 1.15) add = 0.6;
  else if (e <= 1.2) add = 0.62;
  else if (e <= 1.25) add = 0.64;
  else if (e <= 1.3) add = 0.66;
  else if (e <= 1.35) add = 0.68;
  else if (e <= 1.4) add = 0.7;
  else if (e <= 1.45) add = 0.72;
  else if (e <= 1.5) add = 0.74;
  else if (e <= 1.55) add = 0.76;
  else
    return {
      radius: err("eValue out of range (0.30–1.55)"),
      tor: err("eValue out of range (0.30–1.55)"),
    };

  return { radius: ok(r1 + add), tor: ok(t1 + add) };
}

// AC3 offsets added on top of AC1
export function computeAC3RadiusTor(AC1_radius, AC1_tor, eValue) {
  const r1 = toNum(AC1_radius),
    t1 = toNum(AC1_tor),
    e = toNum(eValue);
  if (r1 == null || e == null)
    return {
      radius: err("missing AC1_radius or eValue"),
      tor: err("missing AC1_radius or eValue"),
    };
  if (t1 == null)
    return {
      radius: ok(r1 + 0),
      tor: err("missing AC1_tor"),
    };

  // TODO: Replace with EXPO1AC-specific eValue offset table
  let add = null;
  if (e <= 0.3) add = 1.59;
  else if (e <= 0.35) add = 1.64;
  else if (e <= 0.4) add = 1.66;
  else if (e <= 0.425) add = 1.67;
  else if (e <= 0.45) add = 1.68;
  else if (e <= 0.5) add = 1.69;
  else if (e <= 0.55) add = 1.72;
  else if (e <= 0.6) add = 1.75;
  else if (e <= 0.65) add = 1.75;
  else if (e <= 0.7) add = 1.79;
  else if (e <= 0.75) add = 1.8;
  else if (e <= 0.8) add = 1.85;
  else if (e <= 0.85) add = 1.9;
  else
    return {
      radius: err("eValue out of range (0.30–0.85)"),
      tor: err("eValue out of range (0.30–0.85)"),
    };

  return { radius: ok(r1 + add), tor: ok(t1 + add) };
}

// widths from REF2 lookup
export function computeWidths(ref2Values) {
  const rc1 = ok(0.6);
  const pc = ok(0.2);
  const ac1 =
    ref2Values?.["AC1 W"] != null ? ok(ref2Values["AC1 W"]) : err("AC1 W not found in REF2");
  const ac2 =
    ref2Values?.["AC2 W"] != null ? ok(ref2Values["AC2 W"]) : err("AC2 W not found in REF2");
  const ac3 =
    ref2Values?.["AC3 W"] != null ? ok(ref2Values["AC3 W"]) : err("AC3 W not found in REF2");

  return {
    RC1_width: rc1,
    AC1_width: ac1,
    AC2_width: ac2,
    AC3_width: ac3,
    PC_width: pc,
  };
}

/* ---------------- calculator factory ---------------- */
export function createExpo1acCalculatorCore({
  typeLookup,
  refLookup,
  ref2Lookup = null,
  defaults = {},
}) {
  const PC_radius = defaults.PC_radius ?? 12;
  const LensPower = defaults.LensPower ?? 1;

  const getCodeByKP = (K, P) => typeLookup?.[String(K)]?.[String(P)] ?? null;
  const getRecordByCode = (code) => refLookup?.[String(code)] ?? null;

  function findKPByCode(code) {
    const target = String(code);
    for (const K of Object.keys(typeLookup || {})) {
      const row = typeLookup[K];
      for (const P of Object.keys(row || {})) {
        if (row[P] === target) return { K: Number(K), P: Number(P) };
      }
    }
    return { K: null, P: null };
  }

  function computeRow(row) {
    // Inputs
    const K = row["K-Code"] ?? row.K_Code ?? row.k_code ?? null;
    const P = row["P-Code"] ?? row.P_Code ?? row.p_code ?? null;
    const DIAM = row.Diam ?? row.DIAM ?? row.diam ?? null;
    const CODE_IN = row.CODE ?? row.Type ?? row["Design "] ?? null;
    const eValue = row.eValue ?? row.EValue ?? row["eValue"] ?? null;

    const e = toNum(eValue);
    if (e == null || e < 0.3 || e > 1.55) {
      return { _error: `Invalid eValue=${eValue}. Expected 0.30–1.55.` };
    }

    let code = CODE_IN ?? null,
      kEff = K,
      pEff = P;
    if (!code) {
      if (kEff != null && pEff != null) code = getCodeByKP(kEff, pEff);
    } else if (kEff == null || pEff == null) {
      const kp = findKPByCode(code);
      kEff = kEff ?? kp.K;
      pEff = pEff ?? kp.P;
    }

    const ref1Rec = code ? getRecordByCode(code) : null;
    const flds = pickFields(ref1Rec);

    // toricity from row (code/value/offset) or Cyl
    let toricity_code = row.toricity_code ?? null;
    let toricity_value = row.toricity_value ?? null;
    let toricity_offset = row.toricity_offset ?? null;
    if (toricity_code == null && toricity_value == null) {
      const cylRaw = row.Cyl ?? null;
      const n = toNum(cylRaw);
      if (n != null) toricity_value = n;
      else if (typeof cylRaw === "string") toricity_code = cylRaw.trim();
    }
    const toricity = resolveToricity({ toricity_code, toricity_value, toricity_offset });

    // compute
    const BC1_BC2 = computeBC1BC2(kEff, pEff, flds.JESSEN);
    const PW1_PW2 = computePW1PW2(flds.JESSEN);
    const OZ1_OZ2 = computeOZ1OZ2(flds.OZ);

    const rc1Radius = computeRC1Radius(kEff, pEff, flds.FX, flds.JESSEN, toricity.offset);
    const rc1Tor = computeRC1Tor(rc1Radius, toricity.value);

    const ac1Radius = computeAC1Radius(kEff, toricity.offset);
    const ac1Tor = computeAC1Tor(kEff, toricity.value, toricity.offset);

    const AC2 = computeAC2RadiusTor(ac1Radius.value, ac1Tor.value, e);
    const AC3 = computeAC3RadiusTor(ac1Radius.value, ac1Tor.value, e);

    // widths via REF2
    const ref2Vals = flds.OZ != null ? getRef2ByDiamOz(ref2Lookup, DIAM, flds.OZ) : null;
    const widths = computeWidths(ref2Vals);

    return {
      _inputs: { K: kEff ?? null, P: pEff ?? null, DIAM, CODE: code ?? null, eValue: e, toricity },
      _ref1: { JESSEN: flds.JESSEN, OZ: flds.OZ, FX: flds.FX },
      _ref2: ref2Vals,

      Cyl_v: toricity.value,
      BC1_BC2,
      PW1_PW2,
      OZ1_OZ2,
      RC1_radius: rc1Radius,
      RC1_tor: rc1Tor,
      AC1_radius: ac1Radius,
      AC1_tor: ac1Tor,
      AC2_radius: AC2.radius,
      AC2_tor: AC2.tor,
      AC3_radius: AC3.radius,
      AC3_tor: AC3.tor,

      ...widths,
      PC1_radius: ok(PC_radius),
      PC2_radius: ok(PC_radius),
      PC_radius,
      LensPower,
    };
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
