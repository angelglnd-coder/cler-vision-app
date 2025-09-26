import { assign, setup, fromPromise, createActor } from "xstate";
import { WO_COLUMNS, SHEET_NAME } from "../utils/woColumns.js";
import * as XLSX from "xlsx";
import { notifyProgress } from "../utils/notify.js";

const NUMERIC_FIELDS = new Set([
  "PW1_PW2",
  "DIAM",
  "OZ1_OZ2",
  "SAG_HEIGHT",
  "CT",
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
  "mtnum",
  "ctnum",
]);
// Optional progress helper (noop if you don't have one)


function validateHeaders(row0) {
  const found = Object.keys(row0 ?? {});
  const missing = WO_COLUMNS.filter((c) => !found.includes(c));
  const extra = found.filter((c) => !WO_COLUMNS.includes(c));
  const msgs = [];
  if (missing.length) msgs.push(`Missing: ${missing.join(", ")}`);
  if (extra.length) msgs.push(`Unexpected: ${extra.join(", ")}`);
  return msgs;
}
function normalizeRows(rows) {
  return rows.map((r) => {
    const o = {};
    for (const col of WO_COLUMNS) {
      let v = r[col] ?? null;
      if (v !== null && NUMERIC_FIELDS.has(col)) {
        const n = Number(v);
        v = Number.isFinite(n) ? n : null;
      }
      o[col] = v;
    }
    return o;
  });
}

function makeColumns() {
  return WO_COLUMNS.map((col) => ({
    title: col,
    field: col,
    headerFilter: "input",
    headerSort: true,
    hozAlign: NUMERIC_FIELDS.has(col) ? "right" : "left",
    frozen: ["WO_Number", "Eye", "Program_Code"].includes(col),
  }));
}

/* ======= NEW: helpers for QUE/DIF generation ======= */
const LS19_CODES = new Set(["B18","C18","F12","F14","F18"]);
const LS28_CODES = new Set(["PK29","PL27","PL29","PM27"]);

function inferMaterialNumber(row) {
  // Prefer explicit mtnum if provided in Excel
  if (row.mtnum != null) return Number(row.mtnum);
  const color = String(row.Color || "").toLowerCase();
  if (color.includes("red")) return 1;
  if (color.includes("gray") || color.includes("grey")) return 2;
  return 1; // default
}
function inferCutNumber(row, idx) {
  if (row.ctnum != null) return Number(row.ctnum);
  return idx + 1; // simple sequence
}
function safeName(s) {
  return String(s ?? "").replace(/[<>:"/\\|?*]/g, "_");
}
function queLine(row, mtnum, ctnum, jobFileName, difFileName) {
  const parts = [
    `JOB=${row.WO_Number}`,
    `CLDFILE=${row.cldfile ?? (LS19_CODES.has(row.Program_Code)?.toString() ? "LS19" : LS28_CODES.has(row.Program_Code) ? "LS28" : "")}`,
    `J0=${jobFileName}`,
    `DIF=${difFileName}`,
    `MTNUM=${mtnum}`,
    `CTNUM=${ctnum}`,
  ];
  return parts.join("|");
}
function buildDIF(row, mtnum, ctnum) {
  const L = [];
  const kv = (k, v) => L.push(`${k}=${v ?? ""}`);

  kv("WO_NUMBER", row.WO_Number);
  kv("CLDFILE", row.cldfile ?? "");
  kv("PATIENT", row.Patient_Name ?? "");
  kv("PROGRAM_CODE", row.Program_Code ?? "");
  kv("COLOR", row.Color ?? "");
  kv("MTNUM", mtnum);
  kv("CTNUM", ctnum);

  // Common optics
  kv("DIAM", row.DIAM);
  kv("PW1", row.PW1_PW2);

  kv("RC1", row.RC1_value);
  kv("RC1_WIDTH", row.RC1_width);
  kv("RC1_CYL", row.RC1_cyl);

  kv("AC1", row.AC1_value); kv("AC1_WIDTH", row.AC1_width); kv("AC1_CYL", row.AC1_cyl);
  kv("AC2", row.AC2_value); kv("AC2_WIDTH", row.AC2_width); kv("AC2_CYL", row.AC2_cyl);
  kv("AC3", row.AC3_value); kv("AC3_WIDTH", row.AC3_width); kv("AC3_CYL", row.AC3_cyl);

  kv("PC1", row.PC1_value);
  kv("PC1_WIDTH", row.PC1_width);

  kv("CT", row.CT);
  kv("CT_WIDTH", row.CT_width);

  // Optional extras
  kv("OZ1", row.OZ1_OZ2);
  kv("AXIS", row.AXIS);
  kv("ADD", row.ADD);
  kv("CYLINDER_NOTE", row.Cylinder_Note);
  kv("INSPECTION_NOTE", row.Inspection_Note);

  return L.join("\n") + "\n";
}

export const woFileMachine = setup({
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
    }),
    setEmitResult: assign({
      queText: ({ event }) => event.output.queText,
      difFiles: ({ event }) => event.output.difFiles,
      emitErrors: ({ event }) => event.output.errors ?? [],
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
      const buf = await notifyProgress(file.arrayBuffer(),'reading file').catch(
        (error) => {
          console.log('error buffer =>', error);
        }
      );
      // const buf = await notifyProgress(file.arrayBuffer(), "reading file");
      return { buf, file };
    }),
    // 2) parse buffer → workbook + choose sheet
    parseWorkbook: fromPromise(async ({ input }) => {
      const { buf, file } = input;
      // const wb = await notifyProgressTemp(
      //   Promise.resolve().then(() => XLSX.read(buf, { type: "array" })),
      //   "parsing workbook",
      // );
      const wb = await notifyProgress(Promise.resolve().then(() => XLSX.read(buf, { type: "array" })),'parsing file').catch(
        (error) => {
          console.log('error buffer =>', error);
        }
      );

      const sheetName = SHEET_NAME ?? wb.SheetNames[0];
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
      const raw = XLSX.utils.sheet_to_json(ws, { defval: null, raw: true });
      return {
        fileName: file.name,
        sheetName,
        sheetNames: wb.SheetNames,
        errors: validateHeaders(raw[0]),
        raw,
      };
    }),
    // 3) transform raw rows → normalized data + Tabulator columns
    buildGrid: fromPromise(async ({ input }) => {
      const { parseOutput } = input; // from parseWorkbook
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
    emitQueDif: fromPromise(async ({ input }) => {
      const { rows } = input; // normalized rows from context.data
      const errors = [];
      const queLines = [];
      const difFiles = [];

      // Iterate in order; you can sort rows here if needed.
      rows.forEach((r, idx) => {
        if (!r?.WO_Number) {
          errors.push(`Row ${idx + 1}: missing WO_Number — skipped`);
          return;
        }
        const jobFileName = `${safeName(r.WO_Number)}.J0`;
        const difFileName = `${safeName(r.WO_Number)}.DIF`;

        const mtnum = inferMaterialNumber(r);
        const ctnum = inferCutNumber(r, idx);

        const difText = buildDIF(r, mtnum, ctnum);
        difFiles.push({ name: difFileName, text: difText });

        queLines.push(queLine(r, mtnum, ctnum, jobFileName, difFileName));
      });

      const queText = [
        "# DAC Autoloader Queue",
        `# COUNT=${queLines.length}`,
        ...queLines
      ].join("\n") + "\n";
      console.log('RESULTS => ',{ queText, difFiles, errors })
      return { queText, difFiles, errors };
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
        input: ({ context }) => ({ rows: context.data }),
        onDone: {
          target: "ready",
          actions: "setEmitResult",
        },
        onError: { target: "error", actions: "setError" },
      },
    },
    ready: {
      on: {
        "FILE.SELECT": "reading",
        RESET: { target: "idle", actions: "clearAll" },
        "GENERATE.QUE_DIF": "emitting",
      },
    },

    error: {
      on: {
        "FILE.SELECT": "reading",
        RESET: { target: "idle", actions: "clearAll" },
      },
    },
  },
});

export const actor = createActor(woFileMachine);
