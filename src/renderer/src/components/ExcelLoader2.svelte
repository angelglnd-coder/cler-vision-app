<script>
  import { actor } from "../machines/woFileMachine";
  import { TabulatorFull as Tabulator } from "tabulator-tables";
  import "tabulator-tables/dist/css/tabulator.min.css";
  import { onDestroy, onMount } from "svelte";
  import { downloadAsZip } from "../utils/downloadZip";
  import { Button } from "$lib/components/ui/button";


  let tableDiv, table, state;
  let queName = "";
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
    // actor.send({ type: "GENERATE.QUE_DIF" });
    actor.send({ type: "GENERATE.QUE_DIF", name: queName });
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
  async function downloadZip() {
    const ctx = actor.getSnapshot().context;
    if (!ctx.queFile && (!ctx.difFiles || ctx.difFiles.length === 0)) {
      alert("No files to download yet. Generate QUE + DIF first.");
      return;
    }
    await downloadAsZip(ctx.queFile, ctx.difFiles, "batch-job.zip");
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
<Button class="m-4">Shadcn OK</Button>
  <!-- <input type="file" accept=".xlsx" on:change={onPick} />
  <button on:click={reset}>Reset</button> -->
  <!-- new -->
  <input id="file-input" type="file" accept=".xlsx" class="sr-only" on:change={onPick} />
  <label for="file-input" class="pretty-btn">Choose .xlsx</label>
  <!-- new -->
  <button class="pretty-btn" on:click={reset}>Reset</button>
{/if}

<!-- {#if state?.matches("parsing") || state?.matches("building")}Parsing…{/if} -->
{#if state?.matches("error")}<div class="text-red-600">{state.context.errors?.[0]}</div>{/if}
<div bind:this={tableDiv}></div>
{#if state?.matches("ready")}
  <!-- <div class="row" style="display:flex; gap:.5rem; align-items:center;">
    <label>Queue file name:</label>
    <input type="text" bind:value={queName} placeholder="QUE file name" style="width: 240px" />
    <button on:click={generate} disabled={!queName.trim()}>Generate QUE + DIFs</button>
  </div> -->
  <!-- new -->
  <div class="flex flex-wrap items-end gap-3">
    <div class="flex flex-col">
      <label for="que-name" class="text-sm font-medium text-slate-700"> Queue file name </label>
      <div class="relative mt-1">
        <input
          id="que-name"
          type="text"
          bind:value={queName}
          placeholder="QUE file name"
          class="w-64 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-slate-400
               focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
        />
        <!-- Optional suffix preview -->
        <span class="pointer-events-none absolute inset-y-0 right-3 my-auto text-xs text-slate-400"
          >.que</span
        >
      </div>
      <!-- {#if !canGenerate}
      <span class="mt-1 text-xs text-slate-400">Enter a name to enable generation</span>
    {/if} -->
    </div>

    <button
      type="button"
      on:click={generate}
      class="inline-flex items-center gap-2 rounded-xl border border-emerald-600 bg-emerald-600 px-4
              py-2 text-sm font-medium text-white shadow-sm
              transition hover:border-emerald-700
              hover:bg-emerald-700 active:scale-[.99]
              disabled:cursor-not-allowed disabled:opacity-50"
      disabled={!queName.trim()}
      aria-disabled={!queName.trim()}
      title="Generate QUE + DIF files"
    >
      <!-- sparkles icon -->
      <svg viewBox="0 0 24 24" class="h-4 w-4" fill="currentColor" aria-hidden="true">
        <path
          d="M9 4l1.2 2.8L13 8l-2.8 1.2L9 12l-1.2-2.8L5 8l2.8-1.2L9 4Zm9 2l1 2.3L21 9l-2.3 1-1 2.3-1-2.3L14 9l2.3-1L18 6Zm-6 7l1.6 3.6L17 18l-3.4 1.4L12 23l-1.6-3.6L7 18l3.4-1.4L12 13Z"
        />
      </svg>
      Generate QUE + DIFs
    </button>
  </div>
{/if}
{#if state?.matches("download")}
  <!-- <button on:click={downloadZip}> Download ZIP (QUE + DIFs) </button> -->
  <!-- new -->
  <div class="pt-6">
    <button
      type="button"
      on:click={downloadZip}
      class="inline-flex items-center gap-2 rounded-xl border border-indigo-600 bg-indigo-600 px-4
            py-2 text-sm font-medium text-white shadow-sm
            transition hover:border-indigo-700
            hover:bg-indigo-700 active:scale-[.99]
            disabled:cursor-not-allowed disabled:opacity-50"
      title="Download ZIP (QUE + DIFs)"
    >
      <!-- download icon -->
      <svg viewBox="0 0 24 24" class="h-4 w-4" fill="currentColor" aria-hidden="true">
        <path
          d="M12 3a1 1 0 011 1v8.59l2.3-2.3a1 1 0 111.4 1.42l-4.01 4a1 1 0 01-1.38 0l-4.01-4a1 1 0 111.4-1.42L11 12.59V4a1 1 0 011-1zm-7 14a1 1 0 011-1h12a1 1 0 011 1v2a2 2 0 01-2 2H7a2 2 0 01-2-2v-2z"
        />
      </svg>
      Download ZIP (QUE + DIFs)
    </button>
  </div>
{/if}
