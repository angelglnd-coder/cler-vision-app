import { assign, setup, fromPromise, createActor } from "xstate";
import {
  WO_COLUMNS_EXCEL,
  SHEET_NAME_TAB,
  EXPECTED_OPTIONAL,
  EXPECTED_REQUIRED,
} from "../utils/woColumns.js";
import { makeWOStem } from "../utils/names.js";
import { formatDif } from "../utils/difSchema.js";
import * as XLSX from "xlsx";
import { notifyProgress } from "../utils/notify.js";
import { lensCalc } from "../models/lensCalculations.js";

const NUMERIC_FIELDS = new Set([
  "PW1_PW2",
  "DIAM",
  "OZ1_OZ2",
  "SAG_HEIGHT",
  "CT_width",
  "RC1_value",
  "RC1_width",
  "RC1_cyl",
  "AC1_value",
  "AC1_width",
  "AC1_cyl",
  "AC2_value",
  "AC2_width",
  "AC2_cyl",
  "AC3_value",
  "AC3_width",
  "AC3_cyl",
  "PC1_value",
  "PC1_width",
  "Queue_Thickness",
  "mtnum",
  "ctnum",
]);

// core calc fields whose values we want to display
const CALC_FIELDS = [
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
  "PC_radius",
  "LensPower",
];

// pull numeric value from number or {value,_error|_why}
function getVal(v) {
  if (v && typeof v === "object" && "value" in v) return v.value;
  return typeof v === "number" ? v : (v ?? null);
}
// pull error text from {value,_error} or {value,_why}
function getErr(v) {
  if (v && typeof v === "object") return v._error ?? v._why ?? null;
  return null;
}

function flattenCalcRow(r) {
  const out = { ...r };
  for (const k of CALC_FIELDS) {
    out[k] = getVal(r[k]);
    const err = getErr(r[k]);
    if (err) out[`${k}_err`] = err;
  }
  return out;
}
// build value columns (right aligned) + error columns (narrow)
// build value columns (right aligned) + error columns (narrow)
function makeCalcColumns() {
  const valueCols = CALC_FIELDS.map((col) => ({
    title: col,
    field: col,
    headerFilter: "input",
    headerSort: true,
    hozAlign: "right",
  }));
  const errCols = CALC_FIELDS.map((col) => ({
    title: `${col}_err`,
    field: `${col}_err`,
    headerFilter: "input",
    headerSort: false,
    hozAlign: "left",
    width: 220, // tweak as you like
  }));
  return [...valueCols, ...errCols];
}
// 1) Normalize header text
const norm = (s) =>
  String(s ?? "")
    .trim()
    .toLowerCase()
    .replace(/[.\s_/#]+/g, ""); // remove . _ / # and collapse spaces

// 3) Aliases (all normalized) → canonical normalized header
// left side are possible normalized variants; right side is canonical normalized
// Aliases (all normalized) → canonical normalized header

// Map display → canonical normalized
const CANON_REQUIRED = EXPECTED_REQUIRED.map((d) => norm(d));
const CANON_OPTIONAL = EXPECTED_OPTIONAL.map((d) => norm(d));

/** Canonicalize a normalized header via aliases */
function canonical(n) {
  return n;
}

/** Pick the header row by scanning top N rows for best match */
function detectHeaderRow(aoa, maxScan = 5) {
  // aoa: Array of Arrays from XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true })
  let best = { idx: -1, score: -1, headers: [] };

  for (let i = 0; i < Math.min(maxScan, aoa.length); i++) {
    const row = aoa[i] ?? [];
    const foundNorm = row.map((c) => canonical(norm(c)));
    const set = new Set(foundNorm);

    // score = how many required canonical names we see
    let score = 0;
    for (const r of CANON_REQUIRED) if (set.has(r)) score++;

    // Bonus if optional present
    for (const o of CANON_OPTIONAL) if (set.has(o)) score += 0.25;

    if (score > best.score) best = { idx: i, score, headers: row };
  }
  return best; // { idx, score, headers[] }
}

/** Validate headers against expected with tolerance + optional */
function validateHeadersFlexible(foundRaw) {
  const foundCanon = foundRaw.map((h) => canonical(norm(h)));
  const msgs = [];
  const missing = [];
  const extra = [];

  // missing = required not present
  for (let i = 0; i < CANON_REQUIRED.length; i++) {
    const need = CANON_REQUIRED[i];
    if (!foundCanon.includes(need)) missing.push(EXPECTED_REQUIRED[i]);
  }

  // extra = any header not in required or optional
  const allAllowed = new Set([...CANON_REQUIRED, ...CANON_OPTIONAL]);
  foundCanon.forEach((h, i) => {
    if (h && !allAllowed.has(h)) extra.push(foundRaw[i] ?? String(foundRaw[i]));
  });

  if (missing.length) msgs.push(`Missing columns (${missing.length}): ${missing.join(", ")}`);
  if (extra.length) msgs.push(`Unexpected columns (${extra.length}): ${extra.join(", ")}`);

  return { missing, extra, msgs, foundCanon };
}

/** Build objects from rows using the detected header row */
function buildRowsFromAoA(aoa, headerRowIdx) {
  const headers = (aoa[headerRowIdx] ?? []).map((h) => String(h ?? "").trim());
  const rows = [];
  for (let r = headerRowIdx + 1; r < aoa.length; r++) {
    const line = aoa[r] ?? [];
    // stop at first fully-empty row (optional; comment out if not wanted)
    if (line.every((v) => v === null || v === undefined || v === "")) break;

    const obj = {};
    headers.forEach((h, cIdx) => {
      if (!h) return; // skip empty header cell
      obj[h] = line[cIdx] ?? null;
    });
    rows.push(obj);
  }
  return { headers, rows };
}

function normalizeRows(rows) {
  return rows.map((r) => {
    const o = {};
    for (const col of WO_COLUMNS_EXCEL) {
      const key = safeKey(col);
      let v = r[col] ?? null;
      // your numeric coercion here if needed…
      o[key] = typeof v === "string" ? v.trim() : v;
    }
    return o;
  });
}
const FIELD_OF = {
  "No.": "number",
  "OD/OS": "od_os",
  "K-Code": "k_code",
  "P-Code": "p_code",
  "Previous S.O#": "previous_so",
  // add others with punctuation if you like
};

function safeKey(col) {
  return FIELD_OF[col] || col.replace(/[^\w$]/g, "_"); // fallback: sanitize
}
function makeColumns() {
  return WO_COLUMNS_EXCEL.map((col) => ({
    title: col,
    field: safeKey(col),
    headerFilter: "input",
    headerSort: true,
    hozAlign: NUMERIC_FIELDS.has(col) ? "right" : "left",
    frozen: ["WO_Number"].includes(col),
  }));
}

/* ======= NEW: helpers for QUE/DIF generation ======= */
const LS19_CODES = new Set(["B18", "C18", "F12", "F14", "F18"]);
const LS28_CODES = new Set(["PK29", "PL27", "PL29", "PM27"]);

export const woExcelLoaderchine = setup({
  actions: {
    setFileMeta: assign({
      fileName: ({ event }) => event.input?.file?.name ?? null,
    }),
    setParsedResult: assign({
      sheetName: ({ event }) => event.output.sheetName,
      sheetNames: ({ event }) => event.output.sheetNames,
      errors: ({ event }) => event.output.errors ?? [],
      data: ({ event }) => event.output.data ?? [],
      columns: ({ event }) => event.output.columns ?? [],
    }),
    setError: assign({
      errors: ({ event }) => [event.error?.message ?? String(event.error || "Unknown error")],
    }),
    clearAll: assign({
      fileName: null,
      sheetName: null,
      sheetNames: () => [],
      errors: () => [],
      data: () => [],
      columns: () => [],
      queText: () => "",
      difFiles: () => [],
      emitErrors: () => [],
      queFileName: "",
    }),
    setEmitResult: assign({
      queText: ({ event }) => event.output.queText,
      difFiles: ({ event }) => event.output.difFiles,
      emitErrors: ({ event }) => event.output.errors ?? [],
      queFile: ({ event }) => event.output.queFile,
    }),
    setQueueNameFromEvent: assign({
      queFileName: ({ context, event }) => {
        const raw = (event?.name ?? "").trim();
        if (!raw) return context.queFileName ?? ""; // keep prior
        const withExt = raw.toUpperCase().endsWith(".QUE") ? raw : `${raw}.QUE`;
        return withExt;
      },
    }),
    setCalculated: assign({
      data: ({ event }) => event.output.rows, // flattened rows from calculate

      columns: ({ context, event }) => {
        const base = (context.columns ?? []).filter(Boolean);

        // Determine which *_err columns are actually needed
        const neededErr = new Set();
        for (const r of event.output.rows ?? []) {
          for (const k of Object.keys(r)) {
            if (k.endsWith("_err") && r[k]) neededErr.add(k);
          }
        }

        // Build calc columns, but include only needed *_err columns
        const calcAll = makeCalcColumns(); // returns value + *_err columns
        const extra = calcAll.filter((col) => {
          const f = col.field;
          return !f.endsWith("_err") || neededErr.has(f);
        });

        // Avoid duplicates if user recalculates
        const seen = new Set(base.map((c) => c.field));
        for (const col of extra) {
          if (!seen.has(col.field)) {
            base.push(col);
            seen.add(col.field);
          }
        }

        return base;
      },
    }),
  },
  actors: {
    // 1) read file → ArrayBuffer (small, keeps concerns clean)
    readArrayBuffer: fromPromise(async ({ input }) => {
      const { file } = input;
      if (!file) throw new Error("No file provided");
      if (!file.name.toLowerCase().endsWith(".xlsx")) {
        throw new Error("Please choose an .xlsx file");
      }
      const buf = await notifyProgress(file.arrayBuffer(), "reading file").catch((error) => {
        console.log("error buffer =>", error);
      });
      // const buf = await notifyProgress(file.arrayBuffer(), "reading file");
      return { buf, file };
    }),
    // 2) parse buffer → workbook + choose sheet
    parseWorkbook: fromPromise(async ({ input }) => {
      const { buf, file } = input;

      const wb = await notifyProgress(
        Promise.resolve().then(() => XLSX.read(buf, { type: "array" })),
        "parsing file",
      ).catch((error) => {
        console.log("error buffer =>", error);
      });

      const sheetName = SHEET_NAME_TAB ?? wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];

      if (!ws) {
        return {
          fileName: file.name,
          sheetName: null,
          sheetNames: wb.SheetNames,
          errors: [`Sheet "${sheetName}" not found. Available: ${wb.SheetNames.join(", ")}`],
          raw: [],
        };
      }

      // defval:null keeps columns aligned even when cells are empty
      //   const raw = XLSX.utils.sheet_to_json(ws, { defval: null, raw: true });
      const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true });
      // find the best header row among the first 5 rows
      const best = detectHeaderRow(aoa, 5);

      if (best.idx < 0 || best.score <= 0) {
        return {
          fileName: file.name,
          sheetName,
          sheetNames: wb.SheetNames,
          errors: [
            `Could not detect header row. First rows look like: ${JSON.stringify(aoa.slice(0, 3))}`,
          ],
          raw: [],
        };
      }
      // build rows from that header row
      const { headers, rows } = buildRowsFromAoA(aoa, best.idx);

      // validate (tolerant of punctuation/case/spacing; Note is optional)
      const { msgs } = validateHeadersFlexible(headers);
      return {
        fileName: file.name,
        sheetName,
        sheetNames: wb.SheetNames,
        errors: msgs, // e.g., ["Missing: …", "Unexpected: …"] or []
        raw: rows, // objects whose keys are EXACTLY the visible headers in Excel
      };
    }),
    // 3) transform raw rows → normalized data + Tabulator columns
    buildGrid: fromPromise(async ({ input }) => {
      const { parseOutput } = input; // from parseWorkbook
      console.log("parseOutput =>", parseOutput);
      const normalized = normalizeRows(parseOutput.raw);
      const errors = [];
      if (parseOutput.errors?.length) errors.push(parseOutput.errors.join(" | "));
      return {
        sheetName: parseOutput.sheetName,
        sheetNames: parseOutput.sheetNames,
        errors,
        data: normalized,
        columns: makeColumns(),
      };
    }),

    // UPDATE: emitQueDif actor to use name from context and return queFile
    emitQueDif: fromPromise(async ({ input }) => {
      const { rows, queFileName } = input; // <— include in input
      const errors = [];
      const queLines = [];
      const difFiles = [];

      const quote = (s) => `"${String(s).replace(/"/g, '""')}"`;
      const EOL = "\r\n";

      rows.forEach((r, idx) => {
        if (!r?.WO_Number) {
          errors.push(`Row ${idx + 1}: missing WO_Number — skipped`);
          return;
        }
        const stem = makeWOStem(r.WO_Number, r.WO_Line);
        const wo = String(r.WO_Number);
        const difName = `${stem}.DIF`;

        const mtnum = r.mtnum != null ? Number(r.mtnum) : undefined;
        const ctnum = r.ctnum != null ? Number(r.ctnum) : idx + 1;
        const difText = formatDif(r, { mtnum, ctnum });
        difFiles.push({ name: difName, text: difText });

        const position = idx + 1;
        const thickness =
          (r.Queue_Thickness != null ? Number(r.Queue_Thickness) : undefined) ??
          (r.CT_width != null ? Number(r.CT_width) : undefined) ??
          (r.CT != null ? Number(r.CT) : undefined);
        if (!Number.isFinite(thickness)) {
          errors.push(`Row ${idx + 1} (${wo}): missing thickness`);
          return;
        }

        queLines.push(`"${difName}" ${difName} ${position} ${thickness}`);
      });

      const queText = ["queue file", ...queLines].join(EOL) + EOL;
      console.log(" queFILE result =>", { name: queFileName, text: queText, difFiles, errors });
      // Return named QUE file object
      return { queFile: { name: queFileName || "batch.QUE", text: queText }, difFiles, errors };
    }),
    calculate: fromPromise(async ({ input }) => {
      const { rows } = input;
      // const one = lensCalc.computeFirst(rows);
      const computed = lensCalc.computeAll(rows); // adds computed fields (value/_error or value/_why)
      const flattened = computed.map(flattenCalcRow); // create <field> and <field>_err

      // (optional) collect which error columns actually have messages
      const neededErr = new Set();

      await notifyProgress(
        Promise.resolve().then(() => {
          for (const r of flattened) {
            for (const k of Object.keys(r)) {
              if (k.endsWith("_err") && r[k]) neededErr.add(k);
            }
          }
        }),
        "applying formulas",
      ).catch((error) => {
        console.log("error formulas =>", error);
      });

      console.log("calculate: flattened =>", flattened);
      return { rows: flattened, neededErr: Array.from(neededErr) };
    }),
  },
}).createMachine({
  id: "woFile",
  initial: "idle",
  context: {
    fileName: null,
    sheetName: null,
    sheetNames: [],
    errors: [],
    data: [],
    columns: [],
  },
  states: {
    idle: {
      on: {
        "FILE.SELECT": {
          target: "reading",
          actions: "setFileMeta", // stores fileName
        },
        RESET: { actions: "clearAll" },
      },
    },
    // FILE.SELECT → read buffer
    reading: {
      invoke: {
        src: "readArrayBuffer",
        input: ({ event }) => ({ file: event.file }),
        onDone: {
          target: "parsing",
          actions: assign({
            // carry forward buf + file for next actor
            _buf: ({ event }) => event.output.buf,
            _file: ({ event }) => event.output.file,
          }),
        },
        onError: { target: "error", actions: "setError" },
      },
    },
    // ArrayBuffer → workbook + raw rows
    parsing: {
      invoke: {
        src: "parseWorkbook",
        input: ({ context }) => ({ buf: context._buf, file: context._file }),
        onDone: {
          target: "building",
          actions: assign({
            _parseOutput: ({ event }) => event.output,
          }),
        },
        onError: { target: "error", actions: "setError" },
      },
    },
    // Raw rows → normalized data + tabulator columns
    building: {
      invoke: {
        src: "buildGrid",
        input: ({ context }) => ({ parseOutput: context._parseOutput }),
        onDone: {
          target: "ready",
          actions: "setParsedResult",
        },
        onError: { target: "error", actions: "setError" },
      },
    },
    /* =======  emitting state ======= */
    emitting: {
      invoke: {
        src: "emitQueDif",
        input: ({ context }) => ({ rows: context.data, queFileName: context.queFileName }),
        onDone: {
          target: "download",
          actions: "setEmitResult",
        },
        onError: { target: "error", actions: "setError" },
      },
    },
    applyingFormulas: {
      invoke: {
        src: "calculate",
        input: ({ context }) => ({ rows: context.data }),
        onDone: {
          target: "readyCalculations",
          actions: "setCalculated",
        },
        onError: { target: "error", actions: "setError" },
      },
    },
    ready: {
      on: {
        "FILE.SELECT": "reading",
        RESET: { target: "idle", actions: "clearAll" },
        "APPLY.FORMULAS": {
          target: "applyingFormulas",
          // actions: "setQueueNameFromEvent",
        },
      },
    },
    download: {
      on: {
        RESET: { target: "idle", actions: "clearAll" },
      },
    },
    readyCalculations: {},
    error: {
      on: {
        "FILE.SELECT": "reading",
        RESET: { target: "idle", actions: "clearAll" },
      },
    },
  },
});

export const actor = createActor(woExcelLoaderchine);
