<script>
  import { actor } from "../machines/woExcelLoaderMachine";
  import { TabulatorFull as Tabulator } from "tabulator-tables";
  import "tabulator-tables/dist/css/tabulator.min.css";
  import { onMount } from "svelte";

  let state, tableDiv, table;
  actor.start();

  function onPick(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    console.log("onPick");
    actor.send({ type: "FILE.SELECT", file });
  }
  function reset() {
    actor.send({ type: "RESET" });
    //    table?.clearData?.();
  }
  // todo: move to a WorkOrdersTable component
  function render(ctx) {
    const { data, columns } = ctx;
    if (!table) {
      table = new Tabulator(tableDiv, {
        data,
        columns,
        // layout: "fitDataStretch",
        layout: "fitData",
        height: "80vh",
        pagination: true,
        // paginationSize: 25,
        movableColumns: true,
        clipboard: true,
        placeholder: "Choose a .xlsx to load WorkOrders",
      });
      return;
    }
    table.setColumns(columns);
    table.setData(data);
  }

  onMount(() => {
    state = actor.getSnapshot();
    const sub = actor.subscribe((s) => {
      state = s;
      if (s.matches("ready")) render(s.context);
      if (s.matches("error")) table?.clearData?.();
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
</style>

{#if state?.matches("idle")}
  <input id="file-input" type="file" accept=".xlsx" class="sr-only" on:change={onPick} />
  <label for="file-input" class="pretty-btn">Choose .xlsx</label>

  <button class="pretty-btn" on:click={reset}>Reset</button>
{/if}
<div bind:this={tableDiv} style="width: 1600px; overflow-x: auto; overflow-y: none;"></div>
{#if state?.matches("ready")}
  READY
{/if}
{#if state?.matches("error")}<div class="text-red-600">{state.context.errors?.[0]}</div>{/if}
