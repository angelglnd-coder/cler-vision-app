import { assign, setup, fromPromise, createActor } from "xstate";
import {
  WO_COLUMNS_EXCEL,
  SHEET_NAME_TAB,
  EXPECTED_OPTIONAL,
  EXPECTED_REQUIRED,
} from "../utils/woColumns.js";
import { ALL_SCHEMAS } from "../utils/excelSchemas.js";
import { makeWOStem } from "../utils/names.js";
import { formatDif } from "../utils/difSchema.js";
import * as XLSX from "xlsx";
import { notifyProgress } from "../utils/notify.js";
import { lensCalc } from "../models/lensCalculations.js";
import * as WO from "../models/workOrderNumber.js";
import { getWorkOrderNextNumbers } from "../api/workOrderApi.js";

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
  "PC1_radius",
  "PC2_radius",
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

/**
 * Pick the header row by scanning top N rows for best match across all schemas
 * @param {Array} aoa - Array of Arrays from XLSX
 * @param {Array} schemas - Array of schema objects to test against
 * @param {number} maxScan - Maximum number of rows to scan
 * @returns {object} - { idx, score, headers[], schema }
 */
function detectHeaderRow(aoa, schemas, maxScan = 5) {
  // aoa: Array of Arrays from XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true })
  let best = { idx: -1, score: -1, headers: [], schema: null };

  for (let i = 0; i < Math.min(maxScan, aoa.length); i++) {
    const row = aoa[i] ?? [];
    const foundNorm = row.map((c) => norm(c));
    const set = new Set(foundNorm);

    // Try each schema
    for (const schema of schemas) {
      let score = 0;

      // SIGNATURE MATCHING (highest priority - use scoring instead of strict matching)
      const sigRequired = schema.signatures.required.map(norm);
      const sigPreferred = schema.signatures.preferred.map(norm);

      // Count how many required signatures are present
      let foundSigCount = 0;
      sigRequired.forEach((sig) => {
        if (set.has(sig)) {
          foundSigCount++;
          score += 10; // 10 points per signature found
        }
      });

      // Require at least ONE signature column to consider this schema
      if (foundSigCount === 0) continue;

      // Award bonus points for preferred signatures (5 points each)
      sigPreferred.forEach((sig) => {
        if (set.has(sig)) score += 5;
      });

      // COLUMN MATCHING (secondary validation)
      const canonRequired = schema.columns.required.map(norm);
      const canonOptional = schema.columns.optional.map(norm);

      // Award points for matching required columns (1 point each)
      canonRequired.forEach((col) => {
        if (set.has(col)) score += 1;
      });

      // Award bonus for matching optional columns (0.25 points each)
      canonOptional.forEach((col) => {
        if (set.has(col)) score += 0.25;
      });

      // Update best if this schema scores higher
      if (score > best.score) {
        best = { idx: i, score, headers: row, schema };
      }
    }
  }

  return best; // { idx, score, headers[], schema }
}

/**
 * Validate headers against expected schema with tolerance + optional
 * @param {Array} foundRaw - Raw header values from Excel
 * @param {object} schema - Schema object to validate against
 * @returns {object} - { missing, extra, msgs, foundCanon }
 */
function validateHeadersFlexible(foundRaw, schema) {
  const foundCanon = foundRaw.map((h) => norm(h));
  const msgs = [];
  const missing = [];
  const extra = [];

  const canonRequired = schema.columns.required.map(norm);
  const canonOptional = schema.columns.optional.map(norm);

  console.log(`[Validation] Schema: ${schema.name} (${schema.id})`);
  console.log(`[Validation] Found ${foundRaw.length} columns in file`);
  console.log(`[Validation] Expected ${canonRequired.length} required + ${canonOptional.length} optional`);

  // missing = required not present
  for (let i = 0; i < canonRequired.length; i++) {
    const need = canonRequired[i];
    if (!foundCanon.includes(need)) missing.push(schema.columns.required[i]);
  }

  // extra = any header not in required or optional
  const allAllowed = new Set([...canonRequired, ...canonOptional]);
  foundCanon.forEach((h, i) => {
    if (h && !allAllowed.has(h)) extra.push(foundRaw[i] ?? String(foundRaw[i]));
  });

  // Always inform user about column differences, but format as info rather than errors
  const strictColumns = schema.validation?.strictColumns !== false;

  if (missing.length) {
    console.log(`[Validation] Missing:`, missing);
    // Always show missing columns as informational message
    msgs.push(`ℹ️ Missing ${missing.length} column${missing.length !== 1 ? 's' : ''}: ${missing.join(", ")}`);
  }

  if (extra.length) {
    console.log(`[Validation] Unexpected:`, extra);
    // Always show extra columns as informational message
    msgs.push(`ℹ️ Found ${extra.length} additional column${extra.length !== 1 ? 's' : ''}: ${extra.join(", ")}`);
  }

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

function excelDateToJSDate(serial) {
  // Excel stores dates as days since 1900-01-01 (with leap year bug)
  const utc_days = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;
  const date_info = new Date(utc_value * 1000);
  return date_info;
}

function formatDate(date) {
  if (!date) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Normalize rows based on schema
 * @param {Array} rows - Raw rows from Excel
 * @param {object} schema - Schema object defining columns and mappings
 * @returns {Array} - Normalized row objects
 */
function normalizeRows(rows, schema) {
  return rows.map((r) => {
    const o = {};
    for (const col of schema.columns.excel) {
      // Use schema-specific field mappings
      const key = schema.fieldMappings[col] || safeKey(col);
      let v = r[col] ?? null;

      // Handle date columns (schema-specific)
      if (schema.dateFields.includes(col) && v !== null) {
        if (typeof v === "number") {
          // Excel serial date number
          v = formatDate(excelDateToJSDate(v));
        } else if (v instanceof Date) {
          v = formatDate(v);
        } else if (typeof v === "string") {
          v = v.trim();
        }
      } else {
        // Trim string values
        v = typeof v === "string" ? v.trim() : v;
      }

      o[key] = v;
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
/**
 * Make column definitions based on schema
 * @param {object} schema - Schema object defining columns
 * @returns {Array} - Column definition objects for grid
 */
function makeColumns(schema) {
  const numericFields = schema.numericFields || NUMERIC_FIELDS;

  return schema.columns.excel.map((col) => ({
    title: col,
    field: schema.fieldMappings[col] || safeKey(col),
    headerFilter: "input",
    headerSort: true,
    hozAlign: numericFields.has(col) ? "right" : "left",
    frozen: ["WO_Number"].includes(col),
  }));
}

/* ======= NEW: helpers for QUE/DIF generation ======= */
const LS19_CODES = new Set(["B18", "C18", "F12", "F14", "F18"]);
const LS28_CODES = new Set(["PK29", "PL27", "PL29", "PM27"]);

export const woExcelLoaderMachine = setup({
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
      detectedSchema: ({ event }) => event.output.detectedSchema,
      fileType: ({ event }) => event.output.fileType,
      processingConfig: ({ event }) => event.output.processingConfig,
      hasMissingColumns: ({ event }) => event.output.hasMissingColumns ?? false,
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
      detectedSchema: null,
      fileType: null,
      processingConfig: null,
      hasMissingColumns: false,
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

        // Only add calculation columns if schema needs calculations
        if (!context.processingConfig?.needsCalculation) {
          console.log("Skipping calculation columns (not needed by schema)");
          return base;
        }

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
      // Preserve WO generation data if it exists
      sequenceCounters: ({ context }) => context.sequenceCounters ?? {},
      apiSequenceData: ({ context }) => context.apiSequenceData ?? {},
      woGenerationErrors: ({ context }) => context.woGenerationErrors ?? [],
    }),
    setGeneratedWorkOrders: assign({
      data: ({ event }) => event.output.rows,
      sequenceCounters: ({ event }) => event.output.sequenceCounters,
      apiSequenceData: ({ event }) => event.output.apiSequenceData ?? {},
      woGenerationErrors: ({ event }) => event.output.errors ?? [],
      columns: ({ context }) => {
        const base = (context.columns ?? []).filter(Boolean);
        const seen = new Set(base.map((c) => c.field));

        // Add WO_Number and Account_ID columns if not present
        const woColumns = [
          {
            title: "WO_Number",
            field: "WO_Number",
            headerFilter: "input",
            headerSort: true,
            hozAlign: "left",
            frozen: true,
            width: 150,
          },
        ];

        // Add new columns if not already present
        const newCols = [];
        for (const col of woColumns) {
          if (!seen.has(col.field)) {
            newCols.push(col);
            seen.add(col.field);
          }
        }

        // Insert WO columns at the beginning
        return [...newCols, ...base];
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

      // MULTI-SCHEMA DETECTION: find the best header row and matching schema
      const best = detectHeaderRow(aoa, ALL_SCHEMAS, 5);

      if (best.idx < 0 || best.score < 10) {
        const schemaNames = ALL_SCHEMAS.map((s) => s.name).join(", ");
        return {
          fileName: file.name,
          sheetName,
          sheetNames: wb.SheetNames,
          errors: [
            `Could not detect file type. Tried schemas: ${schemaNames}`,
            `Need at least one signature column. First rows: ${JSON.stringify(aoa.slice(0, 3))}`,
          ],
          raw: [],
          detectedSchema: null,
          fileType: null,
        };
      }

      // build rows from that header row
      const { headers, rows } = buildRowsFromAoA(aoa, best.idx);

      // validate against the detected schema
      const { msgs, missing } = validateHeadersFlexible(headers, best.schema);

      return {
        fileName: file.name,
        sheetName,
        sheetNames: wb.SheetNames,
        errors: msgs, // e.g., ["Missing: …", "Unexpected: …"] or []
        missingColumns: missing, // Array of missing column names
        raw: rows, // objects whose keys are EXACTLY the visible headers in Excel
        detectedSchema: best.schema, // The matched schema object
        fileType: best.schema.id, // "type1" or "type2"
      };
    }),
    // 3) transform raw rows → normalized data + Tabulator columns
    buildGrid: fromPromise(async ({ input }) => {
      const { parseOutput } = input; // from parseWorkbook
      console.log("parseOutput =>", parseOutput);

      const schema = parseOutput.detectedSchema;
      if (!schema) {
        throw new Error("No schema detected - cannot build grid");
      }

      // Use schema-specific normalization and column generation
      const normalized = normalizeRows(parseOutput.raw, schema);
      const columns = makeColumns(schema);

      // Pass through validation messages (missing/extra columns) as-is
      const errors = parseOutput.errors || [];

      return {
        sheetName: parseOutput.sheetName,
        sheetNames: parseOutput.sheetNames,
        errors,
        data: normalized,
        columns: columns,
        detectedSchema: schema,
        fileType: schema.id,
        processingConfig: schema.processing,
        hasMissingColumns: parseOutput.missingColumns?.length > 0,
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
      const { rows, schema } = input;

      // SKIP calculations if schema doesn't need them (e.g., Type 2)
      if (schema && !schema.processing.needsCalculation) {
        console.log(`Skipping calculations for ${schema.name} (not required)`);
        return {
          rows: rows, // Return rows unchanged
          neededErr: [],
        };
      }

      // Perform calculations for schemas that need them (e.g., Type 1)
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
    generateWorkOrders: fromPromise(async ({ input }) => {
      const { rows, soldToField = "Ship_Code" } = input;

      if (!rows || rows.length === 0) {
        throw new Error("No rows to generate work orders for");
      }

      const errors = [];
      const sequenceCounters = {};

      // Step 1: Extract unique SOLD_TO accounts from rows
      const soldToAccounts = new Set();
      rows.forEach((row, idx) => {
        let soldTo = row.Sold_To;
        if (!soldTo) {
          errors.push(`Row ${idx + 1}: Missing SOLD_TO field - will be skipped`);
          return;
        }
        // Convert to 3-digit format (pad or truncate)
        soldTo = String(soldTo).replace(/[^\d]/g, "").slice(0, 3).padStart(3, "0");
        soldToAccounts.add(soldTo);
      });

      const uniqueSoldTos = Array.from(soldToAccounts);
      console.log("Unique SOLD_TO accounts:", uniqueSoldTos);

      // Step 2: Fetch latest sequence numbers from API for all SOLD_TO accounts
      let apiSequenceData = {};
      try {
        apiSequenceData = await notifyProgress(
          getWorkOrderNextNumbers(uniqueSoldTos),
          "fetching latest sequence numbers",
        );
        console.log("API sequence data:", apiSequenceData);
      } catch (error) {
        console.error("Failed to fetch sequence numbers from API:", error);
        errors.push(
          `API Error: ${error.message}. Cannot generate work orders without sequence data.`,
        );
        throw new Error(`Failed to fetch sequence numbers: ${error.message}`);
      }

      // Step 3: Initialize sequence counters from API data
      for (const soldTo of uniqueSoldTos) {
        const apiData = apiSequenceData[soldTo];

        console.log("INSIDE =>", apiData);
        if (apiData && apiData.error) {
          errors.push(`SOLD_TO ${soldTo}: API error - ${apiData.error}`);
          throw new Error(`Failed to get sequence for SOLD_TO ${soldTo}: ${apiData.error}`);
        }

        if (!apiData || apiData.nextNumber === undefined) {
          errors.push(`SOLD_TO ${soldTo}: No sequence data from API`);
          throw new Error(`No sequence data available for SOLD_TO ${soldTo}`);
        }

        // Use the next sequence number from API
        const nextSequence = apiData.nextNumber;

        // Validate against max limit (999999)
        if (nextSequence > 999999) {
          errors.push(`SOLD_TO ${soldTo}: Sequence limit exceeded (max 999999)`);
          throw new Error(`SOLD_TO ${soldTo} has reached maximum sequence number (999999)`);
        }

        sequenceCounters[soldTo] = nextSequence;
        console.log(
          `SOLD_TO ${soldTo}: Starting at sequence ${nextSequence} (API current: ${apiData.sequentialNumber})`,
        );
      }

      // Step 4: Generate work order numbers for each row
      const updatedRows = await notifyProgress(
        Promise.resolve().then(() => {
          return rows.map((row, idx) => {
            try {
              // Get SOLD_TO from the specified field
              let soldTo = row.Sold_To;

              if (!soldTo) {
                errors.push(`Row ${idx + 1}: Missing SOLD_TO - skipped`);
                return { ...row, WO_Number: null };
              }

              // Convert to 3-digit format (pad or truncate)
              soldTo = String(soldTo).replace(/[^\d]/g, "").slice(0, 3).padStart(3, "0");

              // Get current sequence for this SOLD_TO
              if (!(soldTo in sequenceCounters)) {
                errors.push(`Row ${idx + 1}: No sequence counter for SOLD_TO ${soldTo}`);
                return { ...row, WO_Number: null };
              }

              const sequence = sequenceCounters[soldTo];

              // Validate sequence before generating
              if (sequence > 999999) {
                errors.push(
                  `Row ${idx + 1}: Sequence ${sequence} exceeds limit for SOLD_TO ${soldTo}`,
                );
                return { ...row, WO_Number: null };
              }

              // Generate work order number
              const woNumber = WO.generateNewWorkOrder(soldTo, sequence);

              // Increment sequence for next row with same SOLD_TO
              sequenceCounters[soldTo] = sequence + 1;

              return {
                ...row,
                WO_Number: woNumber,
                Account_ID: soldTo,
                print_count: 0,
              };
            } catch (error) {
              errors.push(`Row ${idx + 1}: ${error.message}`);
              return { ...row, WO_Number: null };
            }
          });
        }),
        "generating work orders",
      ).catch((error) => {
        console.log("error generating work orders =>", error);
        throw error;
      });

      console.log("Generated work orders:", {
        total: updatedRows.length,
        sequences: sequenceCounters,
        errors,
      });

      return {
        rows: updatedRows,
        sequenceCounters,
        errors,
        apiSequenceData, // Include API data for debugging/display
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
    sequenceCounters: {},
    apiSequenceData: {},
    woGenerationErrors: [],
    // Multi-schema support
    detectedSchema: null, // The matched schema object
    fileType: null, // "type1" | "type2"
    processingConfig: null, // Schema processing flags
    hasMissingColumns: false, // Track if required columns are missing
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
        input: ({ context }) => ({
          rows: context.data,
          schema: context.detectedSchema,
        }),
        onDone: {
          target: "readyCalculations",
          actions: "setCalculated",
        },
        onError: { target: "error", actions: "setError" },
      },
    },
    generatingWorkOrders: {
      invoke: {
        src: "generateWorkOrders",
        input: ({ context, event }) => ({
          rows: context.data,
          soldToField: event.soldToField || "Ship_Code",
          startingSequence: event.startingSequence || 1,
        }),
        onDone: {
          target: "applyingFormulas",
          actions: "setGeneratedWorkOrders",
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
        "GENERATE.WO": {
          target: "generatingWorkOrders",
        },
      },
    },
    download: {
      on: {
        RESET: { target: "idle", actions: "clearAll" },
      },
    },
    readyCalculations: {
      on: {
        "FILE.SELECT": "reading",
        RESET: { target: "idle", actions: "clearAll" },
        "GENERATE.WO": {
          target: "generatingWorkOrders",
        },
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

// Export the machine for creating actor instances per component
// Don't export a singleton actor to avoid sharing state between components
export function createWoExcelLoaderActor() {
  return createActor(woExcelLoaderMachine);
}
