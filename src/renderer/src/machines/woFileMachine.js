import { assign, setup, fromPromise, createActor } from "xstate";
import { WO_COLUMNS, SHEET_NAME } from "../utils/woColumns.js";
import * as XLSX from "xlsx";
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

async function notifyProgress(promise, _label) {
  return promise;
}
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
      const buf = await notifyProgress(file.arrayBuffer(), "reading file");
      return { buf, file };
    }),
    // 2) parse buffer → workbook + choose sheet
    parseWorkbook: fromPromise(async ({ input }) => {
      const { buf, file } = input;
      const wb = await notifyProgress(
        Promise.resolve().then(() => XLSX.read(buf, { type: "array" })),
        "parsing workbook",
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
    ready: {
      on: {
        "FILE.SELECT": "reading",
        RESET: { target: "idle", actions: "clearAll" },
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

export const woFileActor = createActor(woFileMachine);
