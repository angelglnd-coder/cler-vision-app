<!-- WorkOrderViewHeader.svelte -->
<script>
  import Barcode from "./Barcode.svelte";

  export let row = {};

  // safe getters
  const g = (k, fb = "") => row?.[k] ?? fb;

  // header data
  const data = {
    poDate: g("PO_date"),
    customerPO: g("PO"),
    woNumber: g("WO_Number", g("WO")),

    soldTo: g("Sold_To", g("Account_ID", g("Bill_To"))),
    cart: g("Shopping_Cart"),
    deviceText: g("Device", "OrthoK"),

    shipTo: g("Ship_Code"),
    patient: g("Patient_Name"),
    laserMark: g("Laser"),

    billTo: g("Bill_To"),
    doctor: g("Doctor_Name"),
    deviceType: g("Device_Type", g("Type")),

    prgm: g("cldfile"),

    cont1: g("Mat_Code"),
    cont2: g("Mat_Lot"),
    cont3: g("GTIN"),
    color: g("Color"),
    brand: g("Brand", g("Labeling")),
  };

  // computed helpers
  const pick = (v) => (v && typeof v === "object" ? (v.value ?? null) : v);
  const fmt = (v, digits = 2) => {
    const n = Number(v);
    return Number.isFinite(n) ? n.toFixed(digits) : (v ?? "") || "";
  };

  // calc rows
  const specRows = [
    { desc: "BC1", param: pick(row.BC1_BC2) },
    { desc: "BC2", param: pick(row.BC1_BC2) },
    { desc: "PW1", param: pick(row.PW1_PW2) },
    { desc: "PW2", param: pick(row.PW1_PW2) },
    { desc: "OZ1", param: pick(row.OZ1_OZ2) },
    { desc: "OZ2", param: pick(row.OZ1_OZ2) },
    { desc: "RC 1 Radius", param: pick(row.RC1_radius) },
    { desc: "RC 1 Tor", param: pick(row.RC1_tor) },
    { desc: "AC 1 Radius", param: pick(row.AC1_radius) },
    { desc: "AC 1 Tor", param: pick(row.AC1_tor) },
    { desc: "AC 2 Radius", param: pick(row.AC2_radius) },
    { desc: "AC 2 Tor", param: pick(row.AC2_tor) },
    { desc: "AC 3 Radius", param: pick(row.AC3_radius) },
    { desc: "AC 3 Tor", param: pick(row.AC3_tor) },
    { desc: "RC 1 Width", param: pick(row.RC1_width) },
    { desc: "AC 1 Width", param: pick(row.AC1_width) },
    { desc: "AC 2 Width", param: pick(row.AC2_width) },
    { desc: "AC 3 Width", param: pick(row.AC3_width) },
    { desc: "PC Width", param: pick(row.PC_width) },
    { desc: "PC 1", param: pick(row.PC1_Radius ?? row.PC_radius) },
    { desc: "PC 2", param: pick(row.PC2_Radius ?? row.PC_radius) },
    { desc: "Edge Thick", param: pick(row.Edge_Thick) },
    { desc: "Center Thick", param: pick(row.Center_Thick) },
  ];

  function openDeviceLink() {
    // optional: route to device docs
  }
</script>

<style>
  :root {
    --ink: #111827; /* text */
    --muted: #6b7280; /* gray-500 */
    --light: #f3f4f6; /* gray-100 */
    --line: #e5e7eb; /* gray-200 */
    --brand: #0ea5e9; /* sky-500 */
    --accent: #16a34a; /* green-600 */
    --label: #475569; /* slate-600 */
    --paper: #ffffff;
  }

  .sheet {
    background: var(--paper);
    border: 1px solid var(--line);
    border-radius: 10px;
    padding: 18px 18px 16px;
    box-shadow:
      0 1px 0 rgba(0, 0, 0, 0.02),
      0 8px 24px rgba(0, 0, 0, 0.04);
  }

  .titlebar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }
  .titlebar h2 {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 700;
    letter-spacing: 0.2px;
    color: var(--ink);
  }
  .badge {
    font:
      600 0.75rem/1 system-ui,
      sans-serif;
    padding: 0.25rem 0.5rem;
    border-radius: 999px;
    background: rgba(14, 165, 233, 0.12);
    color: var(--brand);
    border: 1px solid rgba(14, 165, 233, 0.3);
  }

  /* header grid (3 columns of key/value) */
  .kv {
    display: grid;
    grid-template-columns:
      minmax(100px, 140px) minmax(100px, 1fr) minmax(100px, 140px) minmax(100px, 1fr)
      minmax(100px, 140px) minmax(100px, 1fr);
    column-gap: 14px;
    row-gap: 8px;
    align-items: center;
  }
  .kv .label {
    color: var(--label);
    font-weight: 600;
    font-size: 0.82rem;
    justify-self: end;
    letter-spacing: 0.2px;
  }
  .kv .value {
    color: var(--ink);
    font-weight: 600;
    font-size: 0.92rem;
    overflow-wrap: break-word;
    word-break: break-word;
  }
  .input-field {
    width: 100%;
    padding: 4px 8px;
    border: 1px solid var(--line);
    border-radius: 4px;
    font-size: 0.92rem;
    font-weight: 600;
    color: var(--ink);
    background: var(--paper);
  }
  .input-field:focus {
    outline: none;
    border-color: var(--brand);
    box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.1);
  }
  .link {
    color: var(--brand);
    text-decoration: underline;
    cursor: pointer;
  }

  .rule {
    height: 1px;
    background: var(--line);
    margin: 14px 0;
  }

  /* content strip for CONT / Color / Brand aligned with PRGM */
  .grid-3 {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 14px;
  }
  .card {
    border: 1px dashed var(--line);
    border-radius: 10px;
    background: var(--light);
    padding: 10px 12px;
  }
  .card .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 6px;
  }
  .card .head .h {
    font-weight: 700;
    font-size: 0.85rem;
    color: var(--label);
    letter-spacing: 0.25px;
  }
  .code {
    font:
      600 0.9rem/1.2 ui-monospace,
      SFMono-Regular,
      Menlo,
      Monaco,
      Consolas,
      "Liberation Mono",
      "Courier New",
      monospace;
    letter-spacing: 0.2px;
    word-break: break-word;
    overflow-wrap: break-word;
  }
  .muted {
    color: var(--muted);
  }

  /* calc table (flex rows) */
  .flex-table {
    display: flex;
    flex-direction: column;
    border: 1px solid var(--line);
    border-radius: 10px;
    overflow: hidden;
    margin-top: 20px;
  }
  .t-head {
    display: grid;
    grid-template-columns:
      minmax(100px, 1fr) minmax(80px, 0.8fr) minmax(100px, 1fr) minmax(80px, 0.8fr)
      minmax(240px, 2.4fr);
    align-items: center;
    background: var(--light);
    border-bottom: 1px solid var(--line);
    font-weight: 700;
  }
  .t-row {
    display: grid;
    grid-template-columns:
      minmax(100px, 1fr) minmax(80px, 0.8fr) minmax(100px, 1fr) minmax(80px, 0.8fr)
      minmax(120px, 1.2fr) minmax(120px, 1.2fr);
    align-items: stretch;
  }
  .cell {
    padding: 12px;
    border-right: 1px solid var(--line);
    border-bottom: 1px solid var(--line);
    font-size: 0.92rem;
    overflow-wrap: break-word;
    word-break: break-word;
    min-height: 44px;
  }
  .t-row .cell {
    display: flex;
    align-items: center;
    justify-content: flex-start;
  }
  .cell:last-child {
    border-right: none;
  }
  .t-row .cell.num {
    justify-content: center;
    font-variant-numeric: tabular-nums;
  }
  .t-row:last-child .cell {
    border-bottom: none;
  }

  /* print tweaks */
  @media print {
    .sheet {
      box-shadow: none;
      border-color: #000;
      padding: 12px;
      page-break-inside: avoid;
    }
    .rule {
      background: #000;
      margin: 8px 0;
    }
    .flex-table,
    .t-head,
    .t-row,
    .cell {
      border-color: #000;
    }
    .cell {
      padding: 6px 8px;
      min-height: 32px;
      font-size: 0.85rem;
    }
    .kv {
      row-gap: 4px;
      font-size: 0.88rem;
    }
    .grid-3 {
      gap: 8px;
    }
    .card {
      padding: 6px 8px;
    }
  }
</style>

<div class="sheet">
  <!-- Top title -->
  <div class="titlebar">
    <div class="badge">PRGM: {data.prgm || "—"}</div>
  </div>

  <!-- Barcode Section -->
  {#if data.woNumber}
    <div style="display: flex; justify-content: center; margin: -17px 0 10px 0;">
      <Barcode value={data.woNumber} height={40} width={2} fontSize={12} margin={10} />
    </div>
  {/if}

  <!-- 3× key/value header grid -->
  <div class="kv">
    <!-- Row 1 -->
    <div class="label">PO Date:</div>
    <div class="value">{data.poDate || "—"}</div>
    <div class="label">Customer PO#:</div>
    <div class="value">{data.customerPO || "—"}</div>
    <div class="label">WO #</div>
    <div class="value">{data.woNumber || "—"}</div>

    <!-- Row 2 -->
    <div class="label">Sold To:</div>
    <div class="value">{data.soldTo || "—"}</div>
    <div class="label">Shopping Cart#</div>
    <div class="value">{data.cart || "—"}</div>
    <div class="label">Device:</div>
    <div class="value">
      <span class="link" on:click={openDeviceLink}>{data.deviceText || "—"}</span>
    </div>

    <!-- Row 3 -->
    <div class="label">Ship To:</div>
    <div class="value">{data.shipTo || "—"}</div>
    <div class="label">Patient Name</div>
    <div class="value">{data.patient || "—"}</div>
    <div class="label">Laser Mark:</div>
    <div class="value code">{data.laserMark || "—"}</div>

    <!-- Row 4 -->
    <div class="label">Bill To:</div>
    <div class="value">{data.billTo || "—"}</div>
    <div class="label">Doctor's Name</div>
    <div class="value">{data.doctor || "—"}</div>
    <div class="label">Device Type:</div>
    <div class="value">{data.deviceType || "—"}</div>

    <!-- Row 5 -->
    <div class="label"></div>
    <div class="value"></div>
    <div class="label"></div>
    <div class="value"></div>
    <div class="label">Blank THKN:</div>
    <div class="value"><input type="text" class="input-field" value="" placeholder="—" /></div>
  </div>

  <div class="rule"></div>

  <!-- CONT + COLOR + BRAND aligned visually with PRGM badge -->
  <div class="grid-3">
    <div class="card">
      <div class="head">
        <div class="h">CONT</div>
        <div class="muted">materials</div>
      </div>
      <div class="code">{data.cont1 || "—"}</div>
      <div class="code">{data.cont2 || "—"}</div>
    </div>

    <div class="card">
      <div class="head">
        <div class="h">GTIN / Color</div>
        <div class="muted">identifiers</div>
      </div>
      <div class="code">{data.cont3 || "—"}</div>
      <div class="code">{data.color || "—"}</div>
    </div>

    <div class="card">
      <div class="head">
        <div class="h" style="margin-left:auto;">Brand</div>
      </div>
      <div class="code" style="text-align:right;">{data.brand || "—"}</div>
    </div>
  </div>

  <!-- Calculations table -->
  <div class="flex-table">
    <div class="t-head">
      <div class="cell">Desc.</div>
      <div class="cell">Param.</div>
      <div class="cell">Desc.</div>
      <div class="cell">Param.</div>
      <div class="cell" style="justify-content: center; text-align:center;">QC</div>
    </div>

    {#each Array(Math.ceil(specRows.length / 2)) as _, i}
      <div class="t-row">
        <div class="cell">{specRows[i * 2]?.desc || ""}</div>
        <div class="cell num">{specRows[i * 2] ? fmt(specRows[i * 2].param) : ""}</div>
        <div class="cell">{specRows[i * 2 + 1]?.desc || ""}</div>
        <div class="cell num">{specRows[i * 2 + 1] ? fmt(specRows[i * 2 + 1].param) : ""}</div>
        <div class="cell"></div>
        <div class="cell"></div>
      </div>
    {/each}
  </div>
</div>
