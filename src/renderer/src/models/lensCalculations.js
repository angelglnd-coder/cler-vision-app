// src/utils/lensCalculations.js
// Browser-ready calculators + static JSON imports

/* --------- static JSON imports (Vite/SvelteKit OK) --------- */
import typeLookup from "./lookups/typeChart.lookup.json";
import refLookup from "./lookups/ref1.lookup.json";
import ref2Lookup from "./lookups/ref2.lookup.json";

/* ----------------- helpers ----------------- */
export const toKey = (v) => {
  const s = String(v ?? "").trim();
  if (!s) return "";
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? String(+n) : s;
};
export const toNum = (v) => {
  if (v == null || v === "") return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
};
// unified output helper
const cap2 = (v) => (v != null && Number.isFinite(v) ? Math.floor(v * 100) / 100 : v);
const ok = (value) => ({ value: cap2(value) });
const err = (_error) => ({ value: null, _error });

/* --------------- toricity map --------------- */
const TORICITY_CODE = {
  pj: { value: 0.75, offset: 0.0 },
  tor: { value: 1.25, offset: 0.0 },
  x: { value: 1.75, offset: 0.5 },
  s: { value: 0.0, offset: 0.0 },
  p: { value: 1.0, offset: 0.0 },
  t: { value: 1.5, offset: 0.0 },
  ti: { value: 1.75, offset: 0.0 },
  to: { value: 2.0, offset: 0.0 },
  ty: { value: 2.25, offset: 0.0 },
  sx: { value: 2.5, offset: 0.0 },
  xs: { value: 2.75, offset: 0.0 },
  xx: { value: 3.0, offset: 0.0 },
  x1: { value: 3.25, offset: 0.0 },
  x2: { value: 3.5, offset: 0.0 },
  x3: { value: 3.75, offset: 0.0 },
  x4: { value: 4.0, offset: 0.0 },
};

/* -------- pickers / lookups (REF1/REF2) -------- */
function pickFields(ref1Rec) {
  if (!ref1Rec) return { JESSEN: null, OZ: null, FX: null };
  const norm = (s) =>
    String(s || "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
  const want = { JESSEN: ["jessen"], OZ: ["oz", "o.z"], FX: ["fx"] };
  const index = {};
  Object.keys(ref1Rec).forEach((k) => (index[norm(k)] = k));
  const out = {};
  for (const lbl of Object.keys(want)) {
    let v = null;
    for (const alias of want[lbl]) {
      const actual = index[norm(alias)];
      if (actual && actual in ref1Rec) {
        v = ref1Rec[actual];
        break;
      }
    }
    if (v == null) {
      const actual = index[norm(lbl)];
      if (actual && actual in ref1Rec) v = ref1Rec[actual];
    }
    out[lbl] = v ?? null;
  }
  return out;
}
const getRef2ByDiamOz = (ref2, diam, oz) =>
  ref2 ? (ref2?.[toKey(diam)]?.[toKey(oz)] ?? null) : null;

/* ---------------- formulas ---------------- */
function computeBC1BC2(K, P, JESSEN) {
  const k = toNum(K),
    p = toNum(P),
    j = toNum(JESSEN);
  if (k == null || p == null || j == null) return err("missing input");
  const denom = k - j + p;
  if (!Number.isFinite(denom) || Math.abs(denom) < 1e-12) return err("division by zero");
  return ok(337.5 / denom);
}
const computePW1PW2 = (J) => {
  const n = toNum(J);
  return n == null ? err("missing JESSEN") : ok(n);
};
const computeOZ1OZ2 = (OZ) => {
  const n = toNum(OZ);
  return n == null ? err("missing O.Z.") : ok(n);
};

// RC1_radius = 337.5 / ( K - P*FX + JESSEN - TORICITY_offset )
function computeRC1Radius(K, P, FX, JESSEN, TORICITY_offset = 0) {
  const k = toNum(K),
    p = toNum(P),
    fx = toNum(FX),
    j = toNum(JESSEN),
    t = toNum(TORICITY_offset) ?? 0;
  if (k == null || p == null || fx == null || j == null) return err("missing input");
  const denom = k - p * fx + j - t;
  if (!Number.isFinite(denom) || Math.abs(denom) < 1e-12) return err("division by zero");
  return ok(337.5 / denom);
}

// RC1_tor = 337.5 / ( 337.5 / RC1_radius + TORICITY_value )
function computeRC1Tor(RC1_radius, TORICITY_value) {
  const r = toNum(RC1_radius),
    t = toNum(TORICITY_value);
  if (r == null || t == null) return err("missing RC1_radius or TORICITY_value");
  const denom = 337.5 / r + t;
  if (!Number.isFinite(denom) || Math.abs(denom) < 1e-12) return err("division by zero");
  return ok(337.5 / denom);
}

// AC1_radius = 337.5 / ( K + 0.12 + TORICITY_offset )
function computeAC1Radius(K, TORICITY_offset = 0) {
  const k = toNum(K),
    t = toNum(TORICITY_offset) ?? 0;
  if (k == null) return err("missing K");
  const denom = k + 0.12 + t;
  if (!Number.isFinite(denom) || Math.abs(denom) < 1e-12) return err("division by zero");
  return ok(337.5 / denom);
}

// AC1_tor = 337.5 / ( K + 0.12 + TORICITY_value + TORICITY_offset )
function computeAC1Tor(K, TORICITY_value, TORICITY_offset = 0) {
  const k = toNum(K),
    v = toNum(TORICITY_value),
    t = toNum(TORICITY_offset) ?? 0;
  if (k == null || v == null) return err("missing K or TORICITY_value");
  const denom = k + 0.12 + v + t;
  if (!Number.isFinite(denom) || Math.abs(denom) < 1e-12) return err("division by zero");
  return ok(337.5 / denom);
}

// AC2 offsets added on top of AC1 → return { radius:{value,_error}, tor:{value,_error} }
function computeAC2RadiusTor(AC1_radius, eValue) {
  const r1 = toNum(AC1_radius),
    e = toNum(eValue);
  if (r1 == null || e == null)
    return {
      radius: err("missing AC1_radius or eValue"),
      tor: err("missing AC1_radius or eValue"),
    };

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

  const v = r1 + add;
  return { radius: ok(v), tor: ok(v) };
}
function computeAC3RadiusTor(AC1_radius, eValue) {
  const r1 = toNum(AC1_radius),
    e = toNum(eValue);
  if (r1 == null || e == null)
    return {
      radius: err("missing AC1_radius or eValue"),
      tor: err("missing AC1_radius or eValue"),
    };

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

  const v = r1 + add;
  return { radius: ok(v), tor: ok(v) };
}

// widths (also normalized to {value,_error})
function computeWidths(ref2Values) {
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
/* ---------------- factory ---------------- */
export function createLensCalculator({ typeLookup, refLookup, ref2Lookup = null, defaults = {} }) {
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

  function resolveToricity({ toricity_code, toricity_value, toricity_offset }) {
    const valNum = toNum(toricity_value);
    if (valNum != null) {
      const offNum = toNum(toricity_offset) ?? 0.0;
      return { source: "value", code: null, value: valNum, offset: offNum };
    }
    const key = (toricity_code ?? "").toString().trim().toLowerCase();
    if (key && TORICITY_CODE[key]) {
      const info = TORICITY_CODE[key];
      return { source: "code", code: key, value: info.value, offset: info.offset };
    }
    return { source: "none", code: null, value: null, offset: 0.0 };
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
    const flds = pickFields(ref1Rec); // {JESSEN, OZ, FX}

    // toricity from row (code/value/offset) or Cyl
    let toricity_code = row.toricity_code ?? null;
    let toricity_value = row.toricity_value ?? null;
    let toricity_offset = row.toricity_offset ?? null;
    if (toricity_code == null && toricity_value == null) {
      const cylRaw = row.Cyl ?? null;  // Read from Cyl/TORIC column only
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
    const rc1Tor = computeRC1Tor(rc1Radius.value, toricity.value);

    const ac1Radius = computeAC1Radius(kEff, toricity.offset);
    const ac1Tor = computeAC1Tor(kEff, toricity.value, toricity.offset);

    const AC2 = computeAC2RadiusTor(ac1Radius.value, e);
    const AC3 = computeAC3RadiusTor(ac1Radius.value, e);

    // widths via REF2
    const ref2Vals = flds.OZ != null ? getRef2ByDiamOz(ref2Lookup, DIAM, flds.OZ) : null;
    const widths = computeWidths(ref2Vals);

    return {
      _inputs: { K: kEff ?? null, P: pEff ?? null, DIAM, CODE: code ?? null, eValue: e, toricity },
      _ref1: { JESSEN: flds.JESSEN, OZ: flds.OZ, FX: flds.FX },
      _ref2: ref2Vals,

      Cyl_v: toricity.value,  // Calculated toricity value from lookup
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
      PC1_radius: ok(PC_radius),  // Constant 12.0
      PC2_radius: ok(PC_radius),  // Constant 12.0
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

/* --------- ready-to-use instance with static JSONs --------- */
export const lensCalc = createLensCalculator({
  typeLookup,
  refLookup,
  ref2Lookup, // keep or set to null if you don’t use REF2
  defaults: { PC_radius: 12, LensPower: 1 },
});
