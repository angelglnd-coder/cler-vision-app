<!-- WorkOrderViewHeader.svelte -->
<script>
  import Barcode from "./Barcode.svelte";
  import SmallBarcode from "./SmallBarcode.svelte";

  let { row = {}, enableResponsive = true } = $props();

  let flexTableElement = $state(null);
  let isOverflowing = $state(false);

  // Detect if flex-table is overflowing (only in responsive mode)
  $effect(() => {
    if (!flexTableElement || !enableResponsive) {
      isOverflowing = false;
      return;
    }

    const checkOverflow = () => {
      const hasOverflow = flexTableElement.scrollHeight > flexTableElement.clientHeight;
      isOverflowing = hasOverflow;

      if (hasOverflow) {
        console.log('Flex-table overflow detected:', {
          scrollHeight: flexTableElement.scrollHeight,
          clientHeight: flexTableElement.clientHeight,
          overflow: flexTableElement.scrollHeight - flexTableElement.clientHeight,
        });
      }
    };

    // Initial check
    checkOverflow();

    // Watch for size changes
    const resizeObserver = new ResizeObserver(checkOverflow);
    resizeObserver.observe(flexTableElement);

    return () => {
      resizeObserver.disconnect();
    };
  });

  // safe getters
  const g = (k, fb = "") => row?.[k] ?? fb;

  // Format date to YYYY-MM-DD
  const formatDate = (dateValue) => {
    if (!dateValue) return "—";

    try {
      let date;
      if (dateValue instanceof Date) {
        date = dateValue;
      } else if (typeof dateValue === "string") {
        date = new Date(dateValue);
      } else {
        return "—";
      }

      if (isNaN(date.getTime())) return "—";

      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    } catch (error) {
      return "—";
    }
  };

  // header data - using camelCase field names from API
  const data = {
    poDate: formatDate(g("poDate")),
    customerPO: g("po"),
    woNumber: g("woNumber"),

    soldTo: g("soldTo"),
    cart: g("shoppingCart"),
    deviceText: g("device", "OrthoK"),

    shipTo: g("shipCode"),
    patient: g("patientName"),
    laserMark: g("laser"),

    billTo: g("billTo"),
    doctor: g("doctorName"),
    deviceType: g("deviceType", g("type")),

    prgm: g("cldfile"),

    cont1: g("matCode"),
    cont2: g("matLot"),
    cont3: g("gtin"),
    color: g("color"),
    odOs: g("odOs"),
    brand: g("brand", g("labeling")),
    containerCode: g("containerCode"),
    mfg: g("mfg"),
    cylToric: g("cylToric"),
    priceCode: g("priceCode"),
  };

  // computed helpers
  const pick = (v) => {
    const val = v && typeof v === "object" ? (v.value ?? null) : v;
    // Only treat null, undefined, and empty string as empty (keep zero values)
    if (val === null || val === undefined || val === "") return "";
    return val;
  };
  const fmt = (v, digits = 2) => {
    // Return empty string if value is null, undefined, or empty string
    if (v === null || v === undefined || v === "") return "";
    const n = Number(v);
    return Number.isFinite(n) ? n.toFixed(digits) : (v ?? "") || "";
  };

  // calc rows - using camelCase field names from API
  // Priority parameters first - each on its own row (8 rows total)
  // Empty items are inserted to force each parameter to occupy left column only
  const specRows = [
    { desc: "BC 1", param: pick(row.bc1) },
    { desc: "RC 1 Width", param: pick(row.rc1Width) }, // RC 1 Width in first row right column
    { desc: "BC 2", param: pick(row.bc2) },
    { desc: "AC 1 Width", param: pick(row.ac1Width) }, // AC 1 Width in second row right column
    { desc: "PWR 1", param: pick(row.pw1) },
    { desc: "AC 2 Width", param: pick(row.ac2Width) }, // AC 2 Width in third row right column
    { desc: "PWR 2", param: pick(row.pw2) },
    { desc: "AC 3 Width", param: pick(row.ac3Width) }, // AC 3 Width in fourth row right column
    { desc: "DIAM", param: pick(row.diam) },
    { desc: "PC Width", param: pick(row.pcwidth) },
    { desc: "OZ 1", param: pick(row.oz1) },
    { desc: "PC 1 Radius", param: pick(row.pc1Radius) },
    { desc: "OZ 2", param: pick(row.oz2) },
    { desc: "PC 2 Radius", param: pick(row.pc2Radius) },
    { desc: "Center Thick", param: pick(row.centerThick) },
    { desc: "Edge Thick", param: pick(row.edgeThick) },
    // Remaining parameters
    { desc: "RC 1 Radius", param: pick(row.rc1Radius) },
    { desc: "RC 1 Tor", param: pick(row.rc1Tor) },
    { desc: "AC 1 Radius", param: pick(row.ac1Radius) },
    { desc: "AC 1 Tor", param: pick(row.ac1Tor) },
    { desc: "AC 2 Radius", param: pick(row.ac2Radius) },
    { desc: "AC 2 Tor", param: pick(row.ac2Tor) },
    { desc: "AC 3 Radius", param: pick(row.ac3Radius) },
    { desc: "AC 3 Tor", param: pick(row.ac3Tor) },
    { desc: "SAG HEIGH", param: pick("") },
    { desc: "ADD", param: pick("") },
    { desc: "AXIS", param: pick("") },
    { desc: "CD/CN", param: pick("") },
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

  /* Make sheet a flex container in responsive mode to enable height-based layout */
  .sheet.responsive {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
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

  .barcode-label {
    font-weight: 700;
    font-size: 1.05rem;
    color: var(--label);
    text-transform: uppercase;
    letter-spacing: 0.8px;
    margin-bottom: 6px;
    opacity: 0.9;
  }

  .barcode-container {
    display: flex;
    justify-content: flex-start;
    margin-bottom: 10px;
  }

  /* header grid (3 columns of key/value) */
  .kv {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    column-gap: 14px;
    row-gap: 8px;
    align-items: start;
  }
  .kv-col {
    display: grid;
    grid-template-columns: auto 1fr;
    column-gap: 12px;
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
  .kv .value.highlight {
    background-color: #fef08a;
    padding: 2px 6px;
    border-radius: 3px;
    display: inline-block;
    width: fit-content;
    border: 1px solid #ca8a04;
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
      minmax(50px, 0.5fr) minmax(100px, 1fr) minmax(80px, 0.8fr) minmax(100px, 1fr)
      minmax(80px, 0.8fr);
    align-items: center;
    background: var(--light);
    border-bottom: 1px solid var(--line);
    font-weight: 700;
  }
  .t-row {
    display: grid;
    grid-template-columns:
      minmax(50px, 0.5fr) minmax(100px, 1fr) minmax(80px, 0.8fr) minmax(100px, 1fr)
      minmax(80px, 0.8fr);
    align-items: stretch;
  }
  .t-row-with-qc {
    display: grid;
    grid-template-columns:
      minmax(50px, 0.5fr) minmax(100px, 1fr) minmax(80px, 0.8fr) minmax(100px, 1fr)
      minmax(80px, 0.8fr);
    align-items: stretch;
  }
  .cell {
    padding: 8px 12px;
    border-right: 1px solid var(--line);
    border-bottom: 1px solid var(--line);
    font-size: 0.92rem;
    overflow-wrap: break-word;
    word-break: break-word;
    min-height: 36px;
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
    /* justify-content: center;
    font-variant-numeric: tabular-nums; */
  }
  .t-row:last-child .cell {
    border-bottom: none;
  }
  .cell.qc-hidden {
    border-bottom: none;
    border-left: none;
    padding: 0;
  }

  /* Container queries for responsive layout (not applied to print) */
  @media not print {
    .sheet.responsive {
      container-type: inline-size;
      container-name: work-order;
    }

    /* Make cards smaller in responsive mode */
    .sheet.responsive .card {
      padding: 8px 10px;
    }
    .sheet.responsive .card .head {
      margin-bottom: 4px;
    }
    .sheet.responsive .card .head .h {
      font-size: 0.75rem;
    }
    .sheet.responsive .card .code {
      font-size: 0.8rem;
    }

    /* Header grid: Reduce to 2 columns on small screens */
    @container work-order (max-width: 400px) {
      .sheet.responsive .kv {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    /* Header grid: Reduce to 1 column for very narrow containers */
    @container work-order (max-width: 300px) {
      .sheet.responsive .kv {
        grid-template-columns: 1fr;
      }
    }

    /* Content cards: Stack from 3 to 2 columns */
    @container work-order (max-width: 400px) {
      .sheet.responsive .grid-3 {
        grid-template-columns: 1fr 1fr;
      }
    }

    /* Content cards: Stack to single column */
    @container work-order (max-width: 300px) {
      .sheet.responsive .grid-3 {
        grid-template-columns: 1fr;
      }
    }

    /* Spec table: Adjust column widths for better fit */
    @container work-order (max-width: 400px) {
      .sheet.responsive .t-head,
      .sheet.responsive .t-row,
      .sheet.responsive .t-row-with-qc {
        grid-template-columns:
          minmax(40px, 0.5fr) minmax(80px, 1fr) minmax(70px, 0.8fr) minmax(80px, 1fr)
          minmax(70px, 0.8fr);
      }
    }

    /* Spec table: Further reduce for very narrow containers */
    @container work-order (max-width: 300px) {
      .sheet.responsive .t-head,
      .sheet.responsive .t-row,
      .sheet.responsive .t-row-with-qc {
        grid-template-columns: 40px 1fr 70px 1fr 70px;
      }
    }

    /* Make flex-table a flex container to properly contain header + body */
    .sheet.responsive .flex-table {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }

    /* Table body wrapper for scrolling */
    .table-body {
      display: flex;
      flex-direction: column;
    }

    /* Scrollable table-body in responsive mode - fills remaining space */
    .sheet.responsive .table-body {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      overflow-x: hidden;
    }

    /* Custom scrollbar for table-body */
    .sheet.responsive .table-body::-webkit-scrollbar {
      width: 8px;
    }
    .sheet.responsive .table-body::-webkit-scrollbar-track {
      background: transparent;
      border-radius: 0 10px 10px 0;
    }
    .sheet.responsive .table-body::-webkit-scrollbar-thumb {
      background: #cbd5e0;
      border-radius: 4px;
    }
    .sheet.responsive .table-body::-webkit-scrollbar-thumb:hover {
      background: #a0aec0;
    }

    /* Firefox scrollbar */
    .sheet.responsive .table-body {
      scrollbar-width: thin;
      scrollbar-color: #cbd5e0 transparent;
    }
  }

  /* Height-based responsive using viewport height (not container query) */
  @media not print and (max-height: 900px) {
    .sheet.responsive .cell {
      padding: 6px 10px;
      min-height: 32px;
      font-size: 0.88rem;
    }
    .sheet.responsive .t-head .cell {
      padding: 6px 10px;
      font-size: 0.88rem;
    }
  }

  /* Even more compact for very limited viewport height */
  @media not print and (max-height: 700px) {
    .sheet.responsive .cell {
      padding: 4px 8px;
      min-height: 28px;
      font-size: 0.85rem;
    }
    .sheet.responsive .t-head .cell {
      padding: 4px 8px;
      font-size: 0.85rem;
    }
    .sheet.responsive .kv {
      row-gap: 6px;
    }
    .sheet.responsive .kv-col {
      row-gap: 6px;
    }
    .sheet.responsive .barcode-container {
      margin: -12px auto 8px auto;
    }
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

<div class="sheet {enableResponsive ? 'responsive' : ''}">
  <!-- Top title -->
  <!-- <div class="titlebar">
    <div class="badge">PRGM: {data.prgm || "—"}</div>
  </div> -->

  <!-- Barcode Section -->
  {#if data.woNumber}
    <div class="barcode-label">Work Order</div>
    <div class="barcode-container">
      <Barcode value={data.woNumber} height={35} width={1.5} fontSize={11} margin={8} />
    </div>
  {/if}

  <!-- 3-column layout -->
  <div class="kv">
    <!-- Column 1 -->
    <div class="kv-col">
      <div class="label">PO Date:</div>
      <div class="value">{data.poDate || "—"}</div>

      <div class="label">Sold To:</div>
      <div class="value">{data.soldTo || "—"}</div>

      <div class="label">Addr To:</div>
      <div class="value">{data.shipTo || "—"}</div>

      <div class="label">Bill To:</div>
      <div class="value">{data.billTo || "—"}</div>

      <div class="label">Price Code:</div>
      <div class="value">{data.priceCode || "—"}</div>
    </div>

    <!-- Column 2 -->
    <div class="kv-col">
      <div class="label">Customer PO#:</div>
      <div class="value">{data.customerPO || "—"}</div>

      <div class="label">Shopping Cart#:</div>
      <div class="value">{data.cart || "—"}</div>

      <div class="label">Patient Name:</div>
      <div class="value">{data.patient || "—"}</div>

      <div class="label">Doctor's Name:</div>
      <div class="value">{data.doctor || "—"}</div>

      <div class="label">Blank THKN:</div>
      <div class="value"><input type="text" class="input-field" value="" placeholder="—" /></div>
    </div>

    <!-- Column 3 -->
    <div class="kv-col">
      <div class="label">WO #</div>
      <div class="value">{data.woNumber || "—"}</div>

      <div class="label">Device:</div>
      <div class="value">
        <span class="link" on:click={openDeviceLink}>{data.deviceText || "—"}</span>
      </div>

      <div class="label">Device Type:</div>
      <div class="value">{data.deviceType || "—"}</div>

      <div class="label">Laser Mark:</div>
      <div class="value code highlight">{data.laserMark || "—"}</div>

      <div class="label">PRG:</div>
      <div class="value code">{data.prgm || "—"}</div>

      <div class="label">TORIC:</div>
      <div class="value code">{data.cylToric || "—"}</div>
    </div>
  </div>

  <div class="rule"></div>

  <!-- CONT + COLOR + BRAND aligned visually with PRGM badge -->
  <div class="grid-3">
    <div class="card">
      <div class="head">
        <div class="h">{data.mfg || "—"}</div>
      </div>
      <div class="code">{data.cont1 || "—"}</div>
      <div class="code">{data.cont2 || "—"}</div>
      {#if data.odOs && data.odOs !== "—"}
        <div class="code" style="font-size: 1.1rem; font-weight: 700;">OD/OS {data.odOs}</div>
      {/if}
    </div>

    <div class="card" style="display: flex; flex-direction: column; justify-content: center;">
      <!-- <div class="head">
        <div class="h">GTIN / Color</div>
      </div> -->
      {#if data.cont3 && data.cont3 !== "—"}
        <div class="head" style="display: flex; justify-content: center; align-items: center;">
          <div class="h" style="margin-right: 0.5rem;">GTIN</div>
          <div class="code" style="text-align:right;">
            <SmallBarcode
              value={data.cont3}
              width={1}
              height={enableResponsive ? 16 : 20}
              margin={1}
            />
          </div>
        </div>
      {:else}
        <div class="code">—</div>
      {/if}

      <div class="head" style="display: flex; justify-content: center; align-items: center;">
        <div class="h" style="margin-right: 0.5rem;">COLOR</div>
        <div class="code" style="text-align:right;">
          {data.color || "—"}
        </div>
      </div>
    </div>

    <div class="card">
      <div class="head" style="display: flex; justify-content: flex-end; align-items: center;">
        <div class="h" style="margin-right: 0.5rem;">Brand</div>
        <div class="code" style="text-align:right;">{data.brand || "—"}</div>
      </div>
      {#if data.containerCode && data.containerCode !== "—"}
        <div class="head" style="display: flex; justify-content: flex-end; align-items: center;">
          <div class="h" style="margin-right: 0.5rem;">CNTR Code</div>
          <div class="code" style="text-align:right;">{data.containerCode || "—"}</div>
        </div>
      {/if}
    </div>
  </div>

  <!-- Calculations table -->
  <div class="flex-table">
    <div class="t-head">
      <div class="cell">QC</div>
      <div class="cell">Desc.</div>
      <div class="cell">Param.</div>
      <div class="cell">Desc.</div>
      <div class="cell">Param.</div>
    </div>
    <div class="table-body" bind:this={flexTableElement}>
      {#each Array(Math.ceil(specRows.length / 2)) as _, i}
      {#if i < 8}
        <!-- First 8 rows with QC column -->
        <div class="t-row-with-qc">
          <div class="cell"></div>
          <div class="cell">{specRows[i * 2]?.desc || ""}</div>
          <div class="cell num">{specRows[i * 2] ? fmt(specRows[i * 2].param) : ""}</div>
          <div class="cell">{specRows[i * 2 + 1]?.desc || ""}</div>
          <div class="cell num">{specRows[i * 2 + 1] ? fmt(specRows[i * 2 + 1].param) : ""}</div>
        </div>
      {:else}
        <!-- Remaining rows without QC column (hidden QC cell for alignment) -->
        <div class="t-row">
          <div class="cell qc-hidden"></div>
          <div class="cell">{specRows[i * 2]?.desc || ""}</div>
          <div class="cell num">{specRows[i * 2] ? fmt(specRows[i * 2].param) : ""}</div>
          <div class="cell">{specRows[i * 2 + 1]?.desc || ""}</div>
          <div class="cell num">{specRows[i * 2 + 1] ? fmt(specRows[i * 2 + 1].param) : ""}</div>
        </div>
      {/if}
    {/each}
    </div>
  </div>
</div>
