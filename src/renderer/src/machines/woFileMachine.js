import { assign, setup, fromPromise, createActor } from "xstate";
import { WO_COLUMNS, SHEET_NAME } from "../utils/woColumns.js";
import { makeWOStem } from "../utils/names.js";
import { formatDif } from "../utils/difSchema.js";
import * as XLSX from "xlsx";
import { notifyProgress } from "../utils/notify.js";

const NUMERIC_FIELDS = new Set([
  "diam",
  "cylValue",
  "edgeThick",
  "centerThick",
  "eValue",
  "bc1",
  "bc2",
  "pw1",
  "pw2",
  "oz1",
  "oz2",
  "rc1Radius",
  "ac1Radius",
  "ac2Radius",
  "ac3Radius",
  "rc1Tor",
  "ac1Tor",
  "ac2Tor",
  "ac3Tor",
  "rc1Width",
  "ac1Width",
  "ac2Width",
  "ac3Width",
  "pc1Radius",
  "pc2Radius",
  "pcwidth",
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
    frozen: ["WO_Number"].includes(col),
  }));
}

/* ======= NEW: helpers for QUE/DIF generation ======= */
const LS19_CODES = new Set(["B18", "C18", "F12", "F14", "F18"]);
const LS28_CODES = new Set(["PK29", "PL27", "PL29", "PM27"]);

// function inferMaterialNumber(row) {
//   // Prefer explicit mtnum if provided in Excel
//   if (row.mtnum != null) return Number(row.mtnum);
//   const color = String(row.Color || "").toLowerCase();
//   if (color.includes("red")) return 1;
//   if (color.includes("gray") || color.includes("grey")) return 2;
//   return 1; // default
// }
// function inferCutNumber(row, idx) {
//   if (row.ctnum != null) return Number(row.ctnum);
//   return idx + 1; // simple sequence
// }
// function safeName(s) {
//   return String(s ?? "").replace(/[<>:"/\\|?*]/g, "_");
// }
// function queLine(row, mtnum, ctnum, jobFileName, difFileName) {
//   const parts = [
//     `JOB=${row.WO_Number}`,
//     `CLDFILE=${row.cldfile ?? (LS19_CODES.has(row.Type_Code)?.toString() ? "LS19" : LS28_CODES.has(row.Type_Code) ? "LS28" : "")}`,
//     `J0=${jobFileName}`,
//     `DIF=${difFileName}`,
//     `MTNUM=${mtnum}`,
//     `CTNUM=${ctnum}`,
//   ];
//   return parts.join("|");
// }
// function buildDIF(row, mtnum, ctnum) {
//   const L = [];
//   const kv = (k, v) => L.push(`${k}=${v ?? ""}`);

//   kv("WO_NUMBER", row.WO_Number);
//   kv("CLDFILE", row.cldfile ?? "");
//   kv("PATIENT", row.Patient_Name ?? "");
//   kv("Type_Code", row.Type_Code ?? "");
//   kv("COLOR", row.Color ?? "");
//   kv("MTNUM", mtnum);
//   kv("CTNUM", ctnum);

//   // Common optics
//   kv("DIAM", row.DIAM);
//   kv("PW1", row.PW1_PW2);

//   kv("RC1", row.RC1_value);
//   kv("RC1_WIDTH", row.RC1_width);
//   kv("RC1_CYL", row.RC1_cyl);

//   kv("AC1", row.AC1_value);
//   kv("AC1_WIDTH", row.AC1_width);
//   kv("AC1_CYL", row.AC1_cyl);
//   kv("AC2", row.AC2_value);
//   kv("AC2_WIDTH", row.AC2_width);
//   kv("AC2_CYL", row.AC2_cyl);
//   kv("AC3", row.AC3_value);
//   kv("AC3_WIDTH", row.AC3_width);
//   kv("AC3_CYL", row.AC3_cyl);

//   kv("PC1", row.PC1_value);
//   kv("PC1_WIDTH", row.PC1_width);

//   kv("CT", row.CT);
//   kv("CT_WIDTH", row.CT_width);

//   // Optional extras
//   kv("OZ1", row.OZ1_OZ2);
//   kv("AXIS", row.AXIS);
//   kv("ADD", row.ADD);
//   kv("CYLINDER_NOTE", row.Cylinder_Note);
//   kv("INSPECTION_NOTE", row.Inspection_Note);

//   return L.join("\n") + "\n";
// }

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
      // const wb = await notifyProgressTemp(
      //   Promise.resolve().then(() => XLSX.read(buf, { type: "array" })),
      //   "parsing workbook",
      // );
      const wb = await notifyProgress(
        Promise.resolve().then(() => XLSX.read(buf, { type: "array" })),
        "parsing file",
      ).catch((error) => {
        console.log("error buffer =>", error);
      });

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
    ready: {
      on: {
        "FILE.SELECT": "reading",
        RESET: { target: "idle", actions: "clearAll" },
        "GENERATE.QUE_DIF": {
          target: "emitting",
          actions: "setQueueNameFromEvent",
        },
      },
    },
    download: {
      on: {
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

export const actor = createActor(woFileMachine);
