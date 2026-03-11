// src/renderer/src/models/calculators/baseCalculator.js
// Shared utilities and contracts for all lens calculators

/* ----------------- value conversion helpers ----------------- */
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

// Fixed: Use Math.round to match Excel ROUND() function behavior
export const cap2 = (v) => {
  if (v == null || !Number.isFinite(v)) return v;
  return Math.round(v * 100) / 100;
};

/* ----------------- result wrappers ----------------- */
export const ok = (value) => ({ value: cap2(value) });
export const err = (_error) => ({ value: null, _error });

/* --------------- toricity map --------------- */
export const TORICITY_CODE = {
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

/* --------------- toricity resolver --------------- */
export function resolveToricity({ toricity_code, toricity_value, toricity_offset }) {
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

/* --------------- ref1 field picker --------------- */
export function pickFields(ref1Rec) {
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

/* --------------- ref2 lookup helper --------------- */
export const getRef2ByDiamOz = (ref2, diam, oz) =>
  ref2 ? (ref2?.[toKey(diam)]?.[toKey(oz)] ?? null) : null;

/* --------------- output shape contract --------------- */
export const REQUIRED_OUTPUT_FIELDS = [
  "BC1_BC2",
  "PW1_PW2",
  "OZ1_OZ2",
  "RC1_radius",
  "RC1_tor",
  "AC1_radius",
  "AC1_tor",
  "AC2_radius",
  "AC2_tor",
  "AC3_radius",
  "AC3_tor",
  "RC1_width",
  "AC1_width",
  "AC2_width",
  "AC3_width",
  "PC_width",
  "PC1_radius",
  "PC2_radius",
  "PC_radius",
  "LensPower",
];

export function validateOutputShape(result, calculatorId) {
  const missing = REQUIRED_OUTPUT_FIELDS.filter((f) => !(f in result));
  if (missing.length > 0) {
    console.warn(`Calculator ${calculatorId} missing fields: ${missing.join(", ")}`);
  }
  return result;
}
