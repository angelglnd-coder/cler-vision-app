<script>
  import { createActor } from "xstate";
  import { woFileMachine } from "../machines/woFileMachine";
  import { TabulatorFull as Tabulator } from "tabulator-tables";
  import "tabulator-tables/dist/css/tabulator.min.css";
  import { onDestroy, onMount } from "svelte";

  let tableDiv, table, state;
  const actor = createActor(woFileMachine);

  function onPick(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    actor.send({ type: "FILE.SELECT", file });
  }

  function reset() {
    actor.send({ type: "RESET" });
    table?.clearData?.();
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
    actor.start();
    const sub = actor.subscribe((s) => {
      state = s;
      if (s.matches("ready")) render(s.context);
      if (s.matches("error")) table?.clearData?.();
    });
    return () => sub.unsubscribe?.();
  });
</script>

<style>
  @import "tabulator-tables/dist/css/tabulator.min.css";
</style>

<input type="file" accept=".xlsx" on:change={onPick} />
<button on:click={reset}>Reset</button>
{#if state?.matches("parsing") || state?.matches("building")}Parsing…{/if}
{#if state?.matches("error")}<div class="text-red-600">{state.context.errors?.[0]}</div>{/if}
<div bind:this={tableDiv}></div>
