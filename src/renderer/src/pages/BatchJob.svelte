<script>
  import { actor } from "../machines/woExcelLoaderMachine";
  import { onMount } from "svelte";

  import { Grid, Willow } from "@svar-ui/svelte-grid";
  // REQUIRED: grid + theme styles
  // import "@svar-ui/svelte-grid/styles.css";
  // import "@svar-ui/svelte-grid/themes/willow.css";

  let state;
  let rows = [];
  let columns = [];
  const PIN_LEFT = new Set(["WO_Number", "WO_Line", "Type_Code"]);

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
  // Convert Tabulator-style columns to SVAR format
  function toSvarColumns(tabCols = []) {
    return tabCols.map((c) => {
      const id = c.field || c.title || Math.random().toString(36).slice(2);
      return {
        id,
        header: c.title || c.field || id,
        width: 150,
        sortable: true,
        filter: true,
        align: c.hozAlign === "right" ? "right" : "left",
        pinned: PIN_LEFT.has(id) ? "left" : undefined,
      };
    });
  }

  function render(ctx) {
    // console.log("ctx =>", ctx);
    rows = ctx.data || [];
    columns = toSvarColumns(ctx.columns || []);
  }

  onMount(() => {
    state = actor.getSnapshot();
    const sub = actor.subscribe((s) => {
      state = s;
      if (s.matches("ready")) render(s.context);
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
  }
</style>

{#if state?.matches("idle")}
  <input id="file-input" type="file" accept=".xlsx" class="sr-only" on:change={onPick} />
  <label for="file-input" class="pretty-btn">Choose .xlsx</label>

  <button class="pretty-btn" on:click={reset}>Reset</button>
{/if}
<!-- <div bind:this={tableDiv} style="width: 1600px; overflow-x: auto; overflow-y: none;"></div> -->

{#if state?.matches("ready") || state?.matches("applyingFormulas") || state?.matches("readyCalculations")}
  <button class="pretty-btn" on:click={calculate}>CALCULATE</button>
  <Willow>
    <div class="grid-wrap">
      <Grid data={rows} {columns} />
    </div>
  </Willow>
{/if}
{#if state?.matches("error")}<div class="text-red-600">{state.context.errors?.[0]}</div>{/if}
