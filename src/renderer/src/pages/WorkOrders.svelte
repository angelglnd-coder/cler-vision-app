<script>
  import { actor } from "../machines/woMachine.js";
  import { onMount } from "svelte";
  import WorkOrderView from "../components/WorkOrderView.svelte";
  import CreateWorkOrderDialog from "../components/CreateWorkOrderDialog.svelte";
  import { ChevronRight, PackagePlus } from "@lucide/svelte";

  import { Grid, Willow } from "@svar-ui/svelte-grid";
  import { Splitpanes, Pane } from "svelte-splitpanes";

  let state;
  let rows = [];
  let columns = [];
  let visiblePane = false;
  let selected = null;
  let selectedBatchNo = null;
  let woRef;
  let dialogOpen = false;
  let batchPrintData = [];
  let isBatchPrinting = false;

  // same safeKey you already use elsewhere
  const safeKey = (col) => col.replace(/[^\w$]/g, "_");

  // define desired sticky headers in human form
  const PIN_LEFT_RAW = ["WO_Number", "Patient_Name", "PO", "Container_Code"];

  // …then normalize to the actual column ids
  const PIN_LEFT = new Set(PIN_LEFT_RAW.map(safeKey));
  console.log("Pinned fields:", [...PIN_LEFT]);

  actor.start();

  function loadWorkOrders() {
    actor.send({ type: "LOAD" });
  }

  function reset() {
    actor.send({ type: "RESET" });
    rows = [];
    selected = null;
    selectedBatchNo = null;
    visiblePane = false;
  }

  function toSvarColumns(tabCols = []) {
    return tabCols.map((c) => {
      const id = c.field || c.title || Math.random().toString(36).slice(2);
      return {
        id, // Grid uses this as the field key
        header: c.title || id, // what you see in the header
        width: 150,
        sortable: true,
        filter: true,
        align: c.hozAlign === "right" ? "right" : "left",
        pinned: PIN_LEFT.has(id) ? "left" : undefined,
      };
    });
  }

  function getRowStyle(row) {
    const baseClass = "hover-highlight";
    // Highlight rows with the same batch number as the selected row
    if (selectedBatchNo && row.batchNo && row.batchNo === selectedBatchNo) {
      console.log(`Highlighting row with batchNo: ${row.batchNo}`);
      return `${baseClass} batch-highlight`;
    }
    return baseClass;
  }

  // Force grid to re-render when selectedBatchNo changes
  $: if (selectedBatchNo !== null) {
    rows = [...rows];
  }

  function render(ctx) {
    rows = ctx.workOrders || [];
    columns = toSvarColumns(ctx.columns || []);
    console.log("Work Orders loaded:", rows.length);
    console.log("columns =>", columns);
  }

  function onRowClick(event) {
    console.log("clicked row:", event.id);
    const currentContext = actor.getSnapshot().context.workOrders;
    const index = currentContext.findIndex((r) => r.id === event.id);
    const row = index >= 0 ? rows[index] : null;

    if (row) {
      selected = { index, row };
      selectedBatchNo = row.batchNo || null;
      console.log("updated selection", selected);
      console.log("selected batch number:", selectedBatchNo);
      visiblePane = true;
    }
  }

  function onClick() {
    visiblePane = !visiblePane;
  }

  function printWO() {
    window.print();
  }

  function printBatch() {
    if (!selectedBatchNo) return;

    // Get all work orders with the selected batch number
    const batchWorkOrders = rows.filter((row) => row.batchNo === selectedBatchNo);

    if (batchWorkOrders.length === 0) {
      alert("No work orders found for this batch.");
      return;
    }

    console.log(`Printing ${batchWorkOrders.length} work orders for batch ${selectedBatchNo}`);
    console.log(
      "Batch work orders:",
      batchWorkOrders.map((wo) => ({
        woNumber: wo.woNumber,
        patient: wo.patientName,
        id: wo.id,
      })),
    );

    // Set batch printing mode and store the batch work orders
    isBatchPrinting = true;
    batchPrintData = batchWorkOrders;

    // Longer delay to ensure DOM fully renders all components
    setTimeout(() => {
      window.print();
      // Clear batch print data after printing
      setTimeout(() => {
        batchPrintData = [];
        isBatchPrinting = false;
      }, 500);
    }, 300);
  }

  function openCreateDialog() {
    dialogOpen = true;
  }

  function handleWorkOrdersCreated() {
    // Reload work orders after successful creation
    loadWorkOrders();
  }

  onMount(() => {
    state = actor.getSnapshot();
    const sub = actor.subscribe((s) => {
      state = s;
      if (s.matches("ready")) {
        render(s.context);
      }
      if (s.matches("error")) {
        rows = [];
      }
      console.log("state mch =>", state);
    });

    // Automatically load work orders on mount
    loadWorkOrders();

    return () => {
      console.log("woMachine stopped");
      sub.unsubscribe?.();
      actor.stop();
    };
  });
</script>

<style>
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
  }
  .breadcrumb {
    padding: 1rem 0;
    font-size: 0.875rem;
    color: #6b7280;
  }
  .breadcrumb-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    list-style: none;
    padding: 0;
    margin: 0;
  }
  .breadcrumb-item li {
    display: flex;
    align-items: center;
  }
  .breadcrumb-link {
    color: #6b7280;
    text-decoration: none;
    transition: color 0.15s;
  }
  .breadcrumb-link:hover {
    color: #3b82f6;
  }
  .breadcrumb-current {
    color: #111827;
    font-weight: 500;
  }
  .pretty-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.9rem;
    border: 1px solid #d1d5db;
    border-radius: 0.75rem;
    background: #fff;
    font:
      500 0.9rem/1.2 system-ui,
      sans-serif;
    box-shadow: 0 1px 0 rgba(0, 0, 0, 0.05);
    cursor: pointer;
    transition: 0.15s;
  }
  .pretty-btn:hover {
    background: #f8fafc;
    border-color: #cbd5e1;
  }
  .pretty-btn:active {
    transform: scale(0.99);
  }
  .pretty-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background: #f3f4f6;
  }
  .pretty-btn:disabled:hover {
    background: #f3f4f6;
    border-color: #d1d5db;
  }
  .grid-wrap {
    height: 80vh;
    min-width: 640px;
    overflow-x: auto;
  }
  :global(.hover-highlight:hover) {
    background-color: rgba(180, 220, 255, 0.4) !important;
    transition: background-color 0.15s ease;
  }
  :global(.hover-highlight) {
    cursor: pointer;
  }
  :global(.batch-highlight) {
    background-color: rgba(255, 235, 59, 0.3) !important;
    border-left: 3px solid #f9a825 !important;
  }
  :global(.batch-highlight:hover) {
    background-color: rgba(255, 235, 59, 0.5) !important;
  }

  /* Hide batch print area on screen, show only when printing */
  :global(.batch-print-area) {
    position: absolute;
    left: -9999px;
    visibility: hidden;
  }

  /* Print styles - hide everything except WorkOrderView */
  @media print {
    @page {
      size: auto;
      margin: 10mm;
    }
    :global(*) {
      visibility: hidden;
    }
    :global(.print-area),
    :global(.print-area *),
    :global(.batch-print-area),
    :global(.batch-print-area *) {
      visibility: visible;
    }
    /* Hide single print area when batch printing is active */
    :global(.print-area.hide-for-batch),
    :global(.print-area.hide-for-batch *) {
      visibility: hidden !important;
      display: none !important;
    }
    :global(.print-area) {
      position: absolute;
      left: 0;
      top: 0;
      width: 100%;
      page-break-inside: avoid;
      page-break-after: avoid;
      page-break-before: avoid;
    }
    :global(.batch-print-area) {
      position: absolute;
      left: 0 !important;
      top: 0;
      width: 100%;
      visibility: visible !important;
    }
    :global(.batch-print-item) {
      page-break-after: always;
      page-break-inside: avoid;
    }
    :global(.batch-print-item:last-child) {
      page-break-after: auto;
    }
    :global(.splitpanes__splitter) {
      display: none !important;
    }
    :global(.sheet) {
      page-break-inside: avoid;
      box-shadow: none !important;
    }
  }
</style>

{#if state?.matches("loading") || state?.matches("refreshing")}
  <div style="padding: 2rem;">
    <span style="color: #3b82f6; font-size: 1rem;">
      ⏳ {state?.matches("refreshing") ? "Refreshing" : "Loading"} work orders...
    </span>
  </div>
{/if}

{#if state?.matches("ready")}
  <Splitpanes style="height: 100%">
    <Pane>
      <nav class="breadcrumb" aria-label="Breadcrumb">
        <ol class="breadcrumb-item">
          <li>
            <PackagePlus class="size-4" />
            <span class="breadcrumb-current">Work Orders</span>
          </li>
        </ol>
      </nav>

      <div
        style="display: flex; gap: 0.5rem; margin-bottom: 0.5rem; flex-wrap: wrap; align-items: center;"
      >
        <button class="pretty-btn" on:click={openCreateDialog}>➕ Create</button>
        <button class="pretty-btn" on:click={onClick}>
          {visiblePane ? "◀ Hide" : "▶ Show"} Preview
        </button>

        {#if state.context?.total}
          <span style="color: #10b981; font-size: 0.875rem;">
            ✓ {state.context.total} work order{state.context.total !== 1 ? "s" : ""} loaded
          </span>
        {/if}

        {#if selectedBatchNo}
          <span
            style="color: #f9a825; font-size: 0.875rem; background: rgba(255, 235, 59, 0.2); padding: 0.25rem 0.5rem; border-radius: 0.25rem;"
          >
            📦 Batch: {selectedBatchNo}
          </span>
          <button class="pretty-btn" on:click={printBatch}>
            🖨️ Print Batch {selectedBatchNo}
          </button>
        {/if}
      </div>

      <Willow>
        <Grid data={rows} {columns} rowStyle={getRowStyle} onselectrow={onRowClick} />
      </Willow>
    </Pane>
    {#if visiblePane}
      <Pane maxSize={35}>
        {#if selected}
          <div
            style="display:flex; justify-content: space-between; align-items:center; padding:.5rem 1rem; border-bottom:1px solid #eee;"
          >
            <strong>WO Preview</strong>
            <div style="display:flex; gap:.5rem;">
              <button class="pretty-btn" on:click={printWO}>Print</button>
            </div>
          </div>
          {#key selected?.row?.id ?? selected?.index}
            <div bind:this={woRef} class="print-area {isBatchPrinting ? 'hide-for-batch' : ''}">
              <WorkOrderView row={selected.row}></WorkOrderView>
            </div>
          {/key}
        {:else}
          <div style="padding:1rem; color:#6b7280;">Select a row to preview the Work Order.</div>
        {/if}
      </Pane>
    {/if}
  </Splitpanes>
{/if}

{#if state?.matches("error")}
  <div style="padding: 2rem;">
    <div style="color: #ef4444; margin-bottom: 1rem;">
      ❌ Error: {state.context.error}
    </div>
    <button class="pretty-btn" on:click={loadWorkOrders}>🔄 Retry</button>
    <button class="pretty-btn" on:click={reset}>↩️ Reset</button>
  </div>
{/if}
{#if dialogOpen}
  <CreateWorkOrderDialog bind:open={dialogOpen} onSuccess={handleWorkOrdersCreated} />
{/if}

<!-- Hidden batch print area -->
{#if batchPrintData.length > 0}
  <div class="batch-print-area">
    {#each batchPrintData as woData, index (woData.id || woData.woNumber || index)}
      <div class="batch-print-item">
        <WorkOrderView row={woData}></WorkOrderView>
      </div>
    {/each}
  </div>
{/if}
