<script>
  import * as XLSX from "xlsx";
  //   import Tabulator from "tabulator-tables";
  import { TabulatorFull as Tabulator } from "tabulator-tables";
  import "tabulator-tables/dist/css/tabulator.min.css";
  import { WO_COLUMNS, SHEET_NAME } from "../utils/woColumns";

  let tableDiv, table;
  let errors = [];
  let rows = [];

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

  function buildTable(data) {
    if (table) {
      table.setData(data);
      return;
    }
    table = new Tabulator(tableDiv, {
      data,
      columns: makeColumns(),
      layout: "fitDataStretch",
      height: "70vh",
      pagination: true,
      paginationSize: 25,
      movableColumns: true,
      clipboard: true,
      placeholder: "Choose a .xlsx to load WorkOrders",
    });
  }

  async function onPick(e) {
    errors = [];
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      errors = ["Please choose an .xlsx file"];
      return;
    }

    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });

    const sheet = wb.Sheets[SHEET_NAME];
    if (!sheet) {
      errors = [`Sheet "${SHEET_NAME}" not found. Available: ${wb.SheetNames.join(", ")}`];
      buildTable([]);
      return;
    }

    const raw = XLSX.utils.sheet_to_json(sheet, { defval: null, raw: true });
    const headerErrs = validateHeaders(raw[0]);
    if (headerErrs.length) errors = [...errors, headerErrs.join(" | ")];

    rows = normalizeRows(raw);
    buildTable(rows);
  }

  function downloadCSV() {
    if (!table) return;
    table.download("csv", "workorders.csv");
  }
  function downloadJSON() {
    if (!table) return;
    const data = table.getData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "workorders.json";
    a.click();
    URL.revokeObjectURL(url);
  }
</script>

<style>
  .max-w-\[95vw\] {
    max-width: 95vw;
  }
</style>

<div class="mx-auto max-w-[95vw] p-4">
  <h1 class="mb-3 text-xl font-bold">WorkOrders (.xlsx → Tabulator)</h1>

  <input type="file" accept=".xlsx" on:change={onPick} class="mb-3 rounded border p-2" />

  {#if errors.length}
    <div class="mb-3 rounded border border-red-200 bg-red-50 p-3 text-red-800">
      {#each errors as err}<div>• {err}</div>{/each}
    </div>
  {/if}

  <div class="mb-2 flex gap-2">
    <button class="rounded border px-3 py-1" on:click={downloadCSV} disabled={!rows.length}
      >CSV</button
    >
    <button class="rounded border px-3 py-1" on:click={downloadJSON} disabled={!rows.length}
      >JSON</button
    >
  </div>

  <div bind:this={tableDiv}></div>
</div>
