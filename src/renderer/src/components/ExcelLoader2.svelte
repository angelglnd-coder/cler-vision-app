<script>
  import { actor } from "../machines/woFileMachine";
  import { TabulatorFull as Tabulator } from "tabulator-tables";
  import "tabulator-tables/dist/css/tabulator.min.css";
  import { onDestroy, onMount } from "svelte";

  let tableDiv, table, state;
  actor.start();

  function onPick(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    actor.send({ type: "FILE.SELECT", file });
  }

  function reset() {
    actor.send({ type: "RESET" });
    table?.clearData?.();
  }
  function generate() {
    actor.send({ type: "GENERATE.QUE_DIF" });
  }

  function render(ctx) {
    const { data, columns } = ctx;
    if (!table) {
      table = new Tabulator(tableDiv, {
        data,
        columns,
        layout: "fitDataStretch",
        height: "70vh",
        pagination: true,
        paginationSize: 25,
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
    });
    return () => {
      sub.unsubscribe?.();
      actor.stop();
    };
  });
</script>

{#if state?.matches("idle")}
  <input type="file" accept=".xlsx" on:change={onPick} />
  <button on:click={reset}>Reset</button>
{/if}

<!-- {#if state?.matches("parsing") || state?.matches("building")}Parsing…{/if} -->
{#if state?.matches("error")}<div class="text-red-600">{state.context.errors?.[0]}</div>{/if}
<div bind:this={tableDiv}></div>
{#if state?.matches("ready")}ready
  <div class="row" style="display:flex; gap:.5rem; align-items:center;">
    <label>Queue file name:</label>
    <input
      type="text"
      bind:value={queName}
      on:input={onNameChange}
      placeholder="batch.QUE"
      style="width: 240px"
    />
    <button on:click={generate}>Generate QUE + DIFs</button>
  </div>
{/if}
