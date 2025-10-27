<!-- WorkOrderViewHeader.svelte -->
<script>
  import { onMount } from "svelte";

  export let row = {};

  const g = (k, fb = "") => row?.[k] ?? fb;

  const data = {
    poDate: g("PO_Date", ""),
    customerPO: g("PO", ""),
    woNumber: g("WO_Number", g("WO", "")),

    soldTo: g("Sold_To", g("Account_ID", g("Bill_To", ""))),
    cart: g("Shopping_Cart", ""),
    deviceText: g("Device", "OrthoK"),

    shipTo: g("Ship_Code", ""),
    patient: g("Patient_Name", ""),
    laserMark: g("Laser", ""),

    billTo: g("Bill_To", ""),
    doctor: g("Doctor_Name", ""),
    deviceType: g("Device_Type", g("Type", "")),

    prgm: g("cldfile", ""),

    cont1: g("Mat_Code", ""),
    cont2: g("Mat_Lot", ""),
    cont3: g("GTIN", ""),
    color: g("Color", ""),
    brand: g("Brand", g("Labeling", "")),
  };

  // Helper for computed values
  const pick = (v) => (v && typeof v === "object" ? v.value ?? null : v);
  const fmt = (v, digits = 2) => {
    const n = Number(v);
    return Number.isFinite(n) ? n.toFixed(digits) : "";
  };

  // Table rows
  const specRows = [
    { desc: "BC1_BC2", param: pick(row.BC1_BC2) },
    { desc: "PW1_PW2", param: pick(row.PW1_PW2) },
    { desc: "OZ1_OZ2", param: pick(row.OZ1_OZ2) },
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
    { desc: "Lens PWR 1", param: pick(row.LensPower) },
    { desc: "Lens PWR 2", param: pick(row.LensPower) },
    { desc: "Edge Thick", param: pick(row.Edge_Thick) },
    { desc: "Center Thick", param: pick(row.Center_Thick) },
  ];

  function openDeviceLink() {}

  onMount(() => {
    console.log("row =>", row);
  });
</script>

<style>
  .wo-header {
    --bg: #d6e5ed;
    --label: #c01616;
    --value: #0b0b0b;
    --link: #2f67b3;
    display: grid;
    grid-template-columns: max-content 1fr max-content 1fr max-content 1fr;
    gap: 0.45rem 1rem;
    align-items: center;
    background: var(--bg);
    padding: 0.6rem 0.8rem 0.75rem;
    border: 2px dashed #2f7d59;
    border-radius: 4px;
  }
  .lbl {
    color: var(--label);
    font-weight: 700;
    text-align: right;
    white-space: nowrap;
  }
  .val {
    color: var(--value);
    font-weight: 600;
    min-width: 6ch;
  }
  .link {
    color: var(--link);
    text-decoration: underline;
    cursor: pointer;
  }
  .muted {
    opacity: 0;
  }
  .stack {
    display: flex;
    flex-direction: column;
    row-gap: 0.15rem;
  }
  .center {
    text-align: center;
    font-weight: 600;
  }

  /* ---- calc table ---- */
  .flex-table {
    display: flex;
    flex-direction: column;
    border: 2px solid #000;
    background: #d6e5ed;
    margin-top: 1rem;
    width: 100%;
  }
  .row {
    display: flex;
    min-height: 34px;
    align-items: center;
    border-top: 1px solid #000;
  }
  .row:first-child {
    border-top: none;
  }
  .cell {
    padding: 6px 10px;
    border-left: 1px solid #000;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .cell:first-child {
    border-left: none;
  }
  .col-desc {
    flex: 0 0 220px;
    font-weight: 700;
  }
  .col-param {
    flex: 0 0 220px;
  }
  .col-qc {
    flex: 1 1 auto;
  }
  .header .cell {
    font-weight: 700;
  }
</style>

<!-- HEADER SECTION -->
<div class="wo-header">
  <!-- Row 1 -->
  <div class="lbl">PO Date:</div>
  <div class="val">{data.poDate}</div>
  <div class="lbl">Customer PO#:</div>
  <div class="val">{data.customerPO}</div>
  <div class="lbl">WO #</div>
  <div class="val">{data.woNumber}</div>

  <!-- Row 2 -->
  <div class="lbl">Sold To:</div>
  <div class="val">{data.soldTo}</div>
  <div class="lbl">Shopping Cart#</div>
  <div class="val">{data.cart}</div>
  <div class="lbl">Device:</div>
  <div class="val">
    <span class="link" on:click={openDeviceLink}>{data.deviceText}</span>
  </div>

  <!-- Row 3 -->
  <div class="lbl">Ship To:</div>
  <div class="val">{data.shipTo}</div>
  <div class="lbl">Patient Name</div>
  <div class="val">{data.patient}</div>
  <div class="lbl">Laser Mark:</div>
  <div class="val">{data.laserMark}</div>

  <!-- Row 4 -->
  <div class="lbl">Bill To:</div>
  <div class="val">{data.billTo}</div>
  <div class="lbl">Doctor's Name</div>
  <div class="val">{data.doctor}</div>
  <div class="lbl">Device Type:</div>
  <div class="val">{data.deviceType}</div>

  <!-- Row 5 -->
  <div class="lbl muted">•</div>
  <div class="val muted">•</div>
  <div class="lbl muted">•</div>
  <div class="val muted">•</div>
  <div class="lbl">PRGM:</div>
  <div class="val">{data.prgm}</div>

  <!-- Row 6 -->
  <div class="lbl" style="text-align:left;">CONT</div>
  <div class="val stack">
    <div>{data.cont1}</div>
    <div>{data.cont2}</div>
  </div>
  <div class="val stack">
    <div class="val center">{data.cont3}</div>
    <div class="val center">{data.color}</div>
  </div>
  <div class="lbl muted">•</div>
  <div class="lbl" style="text-align:right;">Brand:</div>
  <div class="val">{data.brand}</div>
  <div class="lbl muted">•</div>
  <div class="lbl muted">•</div>
  <div class="val center">OD</div>
</div>

<!-- CALCULATIONS TABLE -->
<div class="flex-table">
  <div class="row header">
    <div class="cell col-desc">Desc.</div>
    <div class="cell col-param">Param.</div>
    <div class="cell col-qc">QC</div>
  </div>

  {#each specRows as r}
    <div class="row">
      <div class="cell col-desc">{r.desc}</div>
      <div class="cell col-param">{fmt(r.param)}</div>
      <div class="cell col-qc"></div>
    </div>
  {/each}
</div>
