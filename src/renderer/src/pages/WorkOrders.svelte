<script>
  import { woMachine } from "../machines/woMachine.js";
  import { createActor } from "xstate";
  import { onMount } from "svelte";
  import WorkOrderView from "../components/WorkOrderView.svelte";
  import CreateWorkOrderDialog from "../components/CreateWorkOrderDialog.svelte";
  import CheckboxCell from "../components/CheckboxCell.svelte";
  import SelectAllHeader from "../components/SelectAllHeader.svelte";
  import { PackagePlus } from "@lucide/svelte";

  import { Grid, Willow } from "@svar-ui/svelte-grid";
  import { Splitpanes, Pane } from "svelte-splitpanes";

  const actor = createActor(woMachine);

  // Reactive state
  let state = $state(actor.getSnapshot());

  // Derived values from state context
  let rows = $derived(state.context?.workOrders || []);

  // Component state
  let visiblePane = $state(false);
  let selected = $state(null);
  let selectedBatchNo = $state(null);
  let woRef;
  let dialogOpen = $state(false);
  let batchPrintData = $state([]);
  let isBatchPrinting = $state(false);
  let selectedRowIds = $state([]); // Track selected row IDs for checkboxes

  // Responsive pane sizing based on window width
  let windowWidth = $state(0);
  const HD_WIDTH = 1920;

  // Compute pane sizes based on window width
  let paneConfig = $derived({
    maxSize: windowWidth > HD_WIDTH ? 45 : 55,
    minSize: windowWidth > HD_WIDTH ? 45 : 45,
  });

  // same safeKey you already use elsewhere
  const safeKey = (col) => col.replace(/[^\w$]/g, "_");

  // define desired sticky headers in human form
  const PIN_LEFT_RAW = ["WO_Number", "Patient_Name", "PO", "Container_Code"];

  // …then normalize to the actual column ids
  const PIN_LEFT = new Set(PIN_LEFT_RAW.map(safeKey));
  console.log("Pinned fields:", [...PIN_LEFT]);

  function loadWorkOrders() {
    actor.send({ type: "LOAD" });
  }

  function reset() {
    actor.send({ type: "RESET" });
    selected = null;
    selectedBatchNo = null;
    selectedRowIds = [];
    visiblePane = false;
  }

  // Handle checkbox toggle
  function handleToggle(rowId, shouldSelect) {
    if (shouldSelect) {
      selectedRowIds = [...selectedRowIds, rowId];
    } else {
      selectedRowIds = selectedRowIds.filter((id) => id !== rowId);
    }
  }

  // Handle select all toggle
  function handleToggleAll(shouldSelectAll) {
    if (shouldSelectAll) {
      selectedRowIds = rows.map((r) => r.id);
    } else {
      selectedRowIds = [];
    }
  }

  // Derived computed columns
  let svarColumns = $derived([
    // Checkbox column (first, pinned left)
    {
      id: "selected",
      header: SelectAllHeader,
      cell: CheckboxCell,
      width: 50,
      sortable: false,
      filter: false,
      align: "center",
      pinned: "left",
      // Pass data and callbacks to custom components
      selectedRowIds,
      rows,
      onToggle: handleToggle,
      onToggleAll: handleToggleAll,
    },
    // Existing columns (spread)
    ...(state.context?.columns || []).map((c) => {
      const id = c.field || c.title || Math.random().toString(36).slice(2);
      // Custom width for Patient Name column
      const customWidth = id === "patientName" ? 250 : 150;
      return {
        id, // Grid uses this as the field key
        header: c.title || id, // what you see in the header
        width: customWidth,
        sortable: true,
        filter: true,
        align: c.hozAlign === "right" ? "right" : "left",
        pinned: PIN_LEFT.has(id) ? "left" : undefined,
      };
    }),
  ]);

  function getRowStyle(row) {
    const baseClass = "hover-highlight";

    // Highlight selected rows (via checkbox)
    if (selectedRowIds.includes(row.id)) {
      return `${baseClass} checkbox-selected`;
    }

    // Highlight rows with the same batch number as the selected row
    if (selectedBatchNo && row.batchNo && row.batchNo === selectedBatchNo) {
      console.log(`Highlighting row with batchNo: ${row.batchNo}`);
      return `${baseClass} batch-highlight`;
    }

    return baseClass;
  }

  // Log when rows are loaded
  $effect(() => {
    console.log("Work Orders loaded:", rows.length);
    console.log("columns =>", svarColumns);
  });

  function onRowClick(event) {
    console.log("clicked row:", event.id);
    const index = rows.findIndex((r) => r.id === event.id);
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
    console.log("onCLickkk");
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

  function printSelected() {
    if (selectedRowIds.length === 0) return;

    // Get selected work orders by ID
    const selectedWorkOrders = rows.filter((row) => selectedRowIds.includes(row.id));

    if (selectedWorkOrders.length === 0) {
      alert("No work orders selected.");
      return;
    }

    console.log(`Printing ${selectedWorkOrders.length} selected work orders`);
    console.log(
      "Selected work orders:",
      selectedWorkOrders.map((wo) => ({
        woNumber: wo.woNumber,
        patient: wo.patientName,
        id: wo.id,
      })),
    );

    // Reuse batch printing infrastructure
    isBatchPrinting = true;
    batchPrintData = selectedWorkOrders;

    setTimeout(() => {
      window.print();
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
    actor.start();
    const sub = actor.subscribe((newState) => {
      state = newState;
      console.log("state mch =>", newState);
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
  .pretty-btn.teal {
    background: #f0fdfa;
    border-color: #14b8a6;
    color: #0f766e;
  }
  .pretty-btn.teal:hover {
    background: #ccfbf1;
    border-color: #0d9488;
  }
  .pretty-btn.teal:disabled {
    background: #f3f4f6;
    border-color: #d1d5db;
    color: #9ca3af;
  }
  /* Empty state styles */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: 3rem;
    text-align: center;
    color: #6b7280;
  }
  .empty-state-icon {
    font-size: 4rem;
    margin-bottom: 1rem;
    opacity: 0.5;
  }
  .empty-state-title {
    font-size: 1.5rem;
    font-weight: 600;
    color: #111827;
    margin: 0 0 0.5rem 0;
  }
  .empty-state-description {
    font-size: 1rem;
    color: #6b7280;
    margin: 0 0 1.5rem 0;
    max-width: 400px;
  }
  /* Grid container for proper scrolling within Splitpanes */
  .pane-content {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
  }

  .pane-content .print-area {
    flex: 1;
    overflow: visible;
    min-height: 0;
  }

  .grid-container {
    flex: 1;
    min-height: 0;
    height: 0; /* Force flex item to respect container height */
    overflow: hidden !important;
  }

  /* Make Willow fill the container */
  .grid-container :global(.wx-willow) {
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden !important;
  }

  /* Grid should fill Willow */
  .grid-container :global(.wx-grid) {
    height: 100% !important;
    display: flex !important;
    flex-direction: column !important;
    overflow: hidden !important;
  }

  /* The scroll container inside Grid - this is where scrolling happens */
  .grid-container :global(.wx-scroll) {
    flex: 1 !important;
    overflow: auto !important;
    min-height: 0 !important;
  }

  /* Prevent scrolling on any other nested divs */
  .grid-container :global(.wx-grid > div:not(.wx-scroll)) {
    overflow: visible !important;
  }

  /* Target all possible scroll containers and force only the right one */
  .grid-container :global(*) {
    overflow: visible !important;
  }

  .grid-container :global(.wx-scroll) {
    overflow: auto !important;
  }

  /* Grid cell text overflow handling */
  :global(.wx-grid .wx-cell) {
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
  }

  :global(.hover-highlight:hover) {
    background-color: rgba(180, 220, 255, 0.4) !important;
    transition: background-color 0.15s ease;
  }
  :global(.hover-highlight) {
    cursor: pointer;
  }
  :global(.batch-highlight) {
    background-color: rgba(204, 251, 241, 0.15) !important;
    border-left: 3px solid #5eead4 !important;
  }
  :global(.batch-highlight:hover) {
    background-color: rgba(204, 251, 241, 0.3) !important;
  }

  :global(.checkbox-selected) {
    background-color: rgba(59, 130, 246, 0.15) !important;
    border-left: 3px solid #3b82f6 !important;
  }
  :global(.checkbox-selected:hover) {
    background-color: rgba(59, 130, 246, 0.25) !important;
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

<!-- Window width binding for responsive pane sizing -->
<svelte:window bind:innerWidth={windowWidth} />

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
      <div class="pane-content">
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
          <button class="pretty-btn teal" onclick={openCreateDialog}>➕ Create</button>
          <button class="pretty-btn" onclick={onClick}>
            {visiblePane ? "◀ Hide" : "▶ Show"} Preview
          </button>

          {#if selectedBatchNo}
            <button class="pretty-btn teal" onclick={printBatch}>
              🖨️ Print Batch {selectedBatchNo}
            </button>
          {/if}

          {#if selectedRowIds.length > 0}
            <button class="pretty-btn teal" onclick={printSelected}>
              🖨️ Print Selected ({selectedRowIds.length})
            </button>
          {/if}
        </div>

        <div class="grid-container">
          {#if rows.length === 0}
            <div class="empty-state">
              <div class="empty-state-icon">📦</div>
              <h3 class="empty-state-title">No Work Orders Yet</h3>
              <p class="empty-state-description">
                Get started by creating your first work order using the Create button above.
              </p>
            </div>
          {:else}
            <Willow>
              <Grid
                data={rows}
                columns={svarColumns}
                rowStyle={getRowStyle}
                onselectrow={onRowClick}
                autoHeight={false}
              />
            </Willow>
          {/if}
        </div>
      </div>
    </Pane>
    {#if visiblePane}
      <Pane maxSize={paneConfig.maxSize} minSize={paneConfig.minSize}>
        <div class="pane-content">
          {#if selected}
            <div
              style="display:flex; justify-content: space-between; align-items:center; padding:.5rem 1rem; border-bottom:1px solid #eee;"
            >
              <strong>WO Preview</strong>
              <div style="display:flex; gap:.5rem;">
                <button class="pretty-btn teal" onclick={printWO}>Print</button>
              </div>
            </div>
            {#key selected?.row?.id ?? selected?.index}
              <div
                bind:this={woRef}
                class="print-area {isBatchPrinting ? 'hide-for-batch' : ''}"
              >
                <WorkOrderView row={selected.row}></WorkOrderView>
              </div>
            {/key}
          {:else}
            <div style="padding:1rem; color:#6b7280;">Select a row to preview the Work Order.</div>
          {/if}
        </div>
      </Pane>
    {/if}
  </Splitpanes>
{/if}

{#if state?.matches("error")}
  <div style="padding: 2rem;">
    <div style="color: #ef4444; margin-bottom: 1rem;">
      ❌ Error: {state.context.error}
    </div>
    <button class="pretty-btn" onclick={loadWorkOrders}>🔄 Retry</button>
    <button class="pretty-btn" onclick={reset}>↩️ Reset</button>
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
        <WorkOrderView row={woData} enableResponsive={false}></WorkOrderView>
      </div>
    {/each}
  </div>
{/if}
