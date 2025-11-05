<script>
  import { actor } from "../machines/woExcelLoaderMachine";
  import { onMount } from "svelte";
  import WorkOrderView from "../components/WorkOrderView.svelte";

  import { Grid, Willow } from "@svar-ui/svelte-grid";
  import { Splitpanes, Pane } from "svelte-splitpanes";
  // REQUIRED: grid + theme styles
  // import "@svar-ui/svelte-grid/styles.css";
  // import "@svar-ui/svelte-grid/themes/willow.css";

  let state;
  let rows = [];
  let columns = [];
  let visiblePane = false;
  let selected = null;
  let woRef;

  // same safeKey you already use elsewhere
  const safeKey = (col) => col.replace(/[^\w$]/g, "_");

  // define desired sticky headers in human form…
  const PIN_LEFT_RAW = ["Patient Name", "PO", "SPEC"];

  // …then normalize to the actual column ids
  const PIN_LEFT = new Set(PIN_LEFT_RAW.map(safeKey));
  console.log("Pinned fields:", [...PIN_LEFT]);
  actor.start();

  function onPick(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    actor.send({ type: "FILE.SELECT", file });
  }
  function reset() {
    actor.send({ type: "RESET" });
    rows = [];
  }
  function calculate() {
    actor.send({ type: "APPLY.FORMULAS" });
  }
  function generateWorkOrders() {
    actor.send({ type: "GENERATE.WO" });
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
        pinned: PIN_LEFT.has(id) ? "left" : undefined, // 👈 now matches
      };
    });
  }

  function render(ctx) {
    // console.log("ctx =>", ctx);
    rows = ctx.data || [];
    columns = toSvarColumns(ctx.columns || []);
    console.log("columns => ", columns);
  }
  function onRowClick(event) {
    console.log("clicked row:", event.id);
    const currentContext = actor.getSnapshot().context.data;
    const index = currentContext.findIndex((r) => r.id === event.id);
    const row = index >= 0 ? rows[index] : null;

    if (row) {
      selected = { index, row };
      console.log("updated selection ", selected);
      visiblePane = true;
    }

    // console.log('data from table api =>', api.getState().selectedRows)
  }
  function onClick() {
    visiblePane = !visiblePane;
  }
  function printWO() {
    window.print();
  }

  onMount(() => {
    state = actor.getSnapshot();
    const sub = actor.subscribe((s) => {
      state = s;
      if (s.matches("ready")) render(s.context);
      if (s.matches("error")) {
        rows = [];
      }
      if (s.matches("readyCalculations")) render(s.context);
      if (s.matches("generatingWorkOrders")) {
        // Keep current display while generating
        console.log("Generating work orders...");
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
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
  .grid-wrap {
    height: 80vh;
    /* width: 100%; */
    min-width: 640px;
    overflow-x: auto; /* 👈 horizontal scrolling enabled */
  }
  /* We need :global so Svelte doesn’t scope it away */
  :global(.hover-highlight:hover) {
    background-color: rgba(180, 220, 255, 0.4) !important; /* soft blue highlight */
    transition: background-color 0.15s ease;
  }

  /* Optional: make it look crisp with pointer cursor */
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
    /* Hide splitpanes and other UI elements */
    :global(.splitpanes__splitter) {
      display: none !important;
    }
    /* Ensure WorkOrderView sheet fits on one page */
    :global(.sheet) {
      page-break-inside: avoid;
      box-shadow: none !important;
    }
  }
</style>

{#if state?.matches("idle")}
  <input id="file-input" type="file" accept=".xlsx" class="sr-only" on:change={onPick} />
  <label for="file-input" class="pretty-btn">Choose .xlsx</label>

  <button class="pretty-btn" on:click={reset}>Reset</button>
{/if}
<!-- <div bind:this={tableDiv} style="width: 1600px; overflow-x: auto; overflow-y: none;"></div> -->

{#if state?.matches("ready") || state?.matches("applyingFormulas") || state?.matches("readyCalculations") || state?.matches("generatingWorkOrders")}
  <Splitpanes style="height: 100%">
    <Pane>
      <div
        style="display: flex; gap: 0.5rem; margin-bottom: 0.5rem; flex-wrap: wrap; align-items: center;"
      >
        <button
          class="pretty-btn"
          on:click={generateWorkOrders}
          disabled={state?.matches("generatingWorkOrders") || state?.matches("applyingFormulas")}
        >
          📝 Generate WO Numbers
        </button>
        <button
          class="pretty-btn"
          on:click={calculate}
          disabled={state?.matches("generatingWorkOrders") || state?.matches("applyingFormulas")}
        >
          🧮 Calculate
        </button>
        <button class="pretty-btn" on:click={onClick}>
          {visiblePane ? "◀ Hide" : "▶ Show"} Preview
        </button>

        {#if state?.matches("generatingWorkOrders")}
          <span style="color: #3b82f6; font-size: 0.875rem;"> ⏳ Generating work orders... </span>
        {/if}
        {#if state?.matches("applyingFormulas")}
          <span style="color: #3b82f6; font-size: 0.875rem;"> ⏳ Calculating... </span>
        {/if}
        {#if state.context?.woGenerationErrors?.length > 0}
          <span style="color: #ef4444; font-size: 0.875rem;">
            ⚠️ {state.context.woGenerationErrors.length} WO generation warning(s)
          </span>
        {/if}
        {#if state.context?.sequenceCounters && Object.keys(state.context.sequenceCounters).length > 0}
          <span style="color: #10b981; font-size: 0.875rem;"> ✓ WO Numbers generated </span>
        {/if}
      </div>

      <Willow>
        <!-- <div class="grid-wrap"> -->
        <Grid data={rows} {columns} rowStyle={() => "hover-highlight"} onselectrow={onRowClick} />
        <!-- </div> -->
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
            <!-- <button class="pretty-btn" on:click={closeSidebar}>Close</button> -->
          </div>
          {#key selected?.row?.id ?? selected?.index}
            <div bind:this={woRef} class="print-area">
              <WorkOrderView row={selected.row}></WorkOrderView>
            </div>
          {/key}
          <!-- <WorkOrderPrint row={selected.row} onClose={closeSidebar} /> -->
        {:else}
          <div style="padding:1rem; color:#6b7280;">Select a row to preview the Work Order.</div>
        {/if}
      </Pane>
    {/if}
  </Splitpanes>
{/if}
{#if state?.matches("error")}<div class="text-red-600">{state.context.errors?.[0]}</div>{/if}
