<script>
  import { actor } from "../machines/woMachine.js";
  import { onMount } from "svelte";
  import WorkOrderView from "../components/WorkOrderView.svelte";

  import { Grid, Willow } from "@svar-ui/svelte-grid";
  import { Splitpanes, Pane } from "svelte-splitpanes";

  let state;
  let rows = [];
  let columns = [];
  let visiblePane = false;
  let selected = null;
  let woRef;

  // same safeKey you already use elsewhere
  const safeKey = (col) => col.replace(/[^\w$]/g, "_");

  // define desired sticky headers in human form
  const PIN_LEFT_RAW = ["WO_Number", "Patient_Name", "PO"];

  // …then normalize to the actual column ids
  const PIN_LEFT = new Set(PIN_LEFT_RAW.map(safeKey));
  console.log("Pinned fields:", [...PIN_LEFT]);

  actor.start();

  function loadWorkOrders() {
    actor.send({ type: "LOAD" });
  }

  function refresh() {
    actor.send({ type: "REFRESH" });
  }

  function reset() {
    actor.send({ type: "RESET" });
    rows = [];
    selected = null;
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
      console.log("updated selection", selected);
      visiblePane = true;
    }
  }

  function onClick() {
    visiblePane = !visiblePane;
  }

  function printWO() {
    window.print();
  }

  function createWorkOrder() {
    console.log("Create new work order");
    // TODO: Implement create work order functionality
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
    return () => {
      sub.unsubscribe?.();
      actor.stop();
    };
  });
</script>

<style>
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
    :global(.print-area *) {
      visibility: visible;
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
    :global(.splitpanes__splitter) {
      display: none !important;
    }
    :global(.sheet) {
      page-break-inside: avoid;
      box-shadow: none !important;
    }
  }
</style>

{#if state?.matches("idle")}
  <div style="padding: 2rem;">
    <h1 style="margin-bottom: 1rem;">Work Orders from Database</h1>
    <button class="pretty-btn" on:click={loadWorkOrders}>📋 Load Work Orders</button>
    <p style="margin-top: 1rem; color: #6b7280;">Click to load work orders from the database</p>
  </div>
{/if}

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
      <div
        style="display: flex; gap: 0.5rem; margin-bottom: 0.5rem; flex-wrap: wrap; align-items: center;"
      >
        <button class="pretty-btn" on:click={createWorkOrder}> ➕ Create </button>
        <button class="pretty-btn" on:click={refresh}> 🔄 Refresh </button>
        <button class="pretty-btn" on:click={reset}> ↩️ Reset </button>
        <button class="pretty-btn" on:click={onClick}>
          {visiblePane ? "◀ Hide" : "▶ Show"} Preview
        </button>

        {#if state.context?.total}
          <span style="color: #10b981; font-size: 0.875rem;">
            ✓ {state.context.total} work order{state.context.total !== 1 ? "s" : ""} loaded
          </span>
        {/if}
      </div>

      <Willow>
        <Grid data={rows} {columns} rowStyle={() => "hover-highlight"} onselectrow={onRowClick} />
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
            <div bind:this={woRef} class="print-area">
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
