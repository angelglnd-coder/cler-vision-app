<script>
  import * as Dialog from "$lib/components/ui/dialog";
  import { Button } from "$lib/components/ui/button";
  import { actor } from "../machines/woExcelLoaderMachine.js";
  import { onMount } from "svelte";
  import { createWorkOrder } from "../api/workOrderApi.js";

  let { open = $bindable(false), onSuccess = () => {} } = $props();

  // State
  let state = actor.getSnapshot();
  let columns = [];
  let rows = [];
  let errors = [];
  let fileName = "";
  let isSubmitting = false;
  let submitError = null;
  let submitSuccess = false;

  actor.start();

  function updateFromContext(ctx) {
    columns = ctx.columns || [];
    rows = ctx.data || [];
    errors = ctx.errors || [];
    fileName = ctx.fileName || "";
  }

  function handleFileSelect(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    console.log("1) Selected file:", file.name);
    actor.send({ type: "FILE.SELECT", file });
    submitError = null;
    submitSuccess = false;
  }

  function handleCancel() {
    actor.send({ type: "RESET" });
    open = false;
    submitError = null;
    submitSuccess = false;
  }

  function handleGenerateWorkOrders() {
    actor.send({ type: "GENERATE.WO" });
  }

  async function handleSubmit() {
    isSubmitting = true;
    submitError = null;
    submitSuccess = false;

    try {
      // Create each work order via API
      const promises = rows.map((row) => createWorkOrder(row));
      await Promise.all(promises);

      submitSuccess = true;
      console.log(`Successfully created ${rows.length} work orders`);

      // Reload the work orders in the main grid
      // woMachineActor.send({ type: "LOAD" });

      // Close dialog after brief delay to show success
      setTimeout(() => {
        actor.send({ type: "RESET" });
        open = false;
        isSubmitting = false;
      }, 1000);
    } catch (error) {
      console.error("Error creating work orders:", error);
      submitError = error.message || "Failed to create work orders";
      isSubmitting = false;
    }
  }

  // Safe key for column field access
  function getSafeValue(row, field) {
    return row?.[field] ?? "";
  }

  onMount(() => {
    console.log("onMOUNT: createWorkORDER Dialog", state);
    const sub = actor.subscribe((s) => {
      state = s;
      // if (s.matches("ready")) {
      //   updateFromContext(s.context);
      // }
      // if (s.matches("error")) {
      //   updateFromContext(s.context);
      //   rows = [];
      //   columns = [];
      // }
      // if (s.matches("generatingWorkOrders")) {
      //   console.log("Generating work orders...");
      // }
      console.log("State:", state);
    });

    return () => {
      sub.unsubscribe?.();
      actor.stop();
    };
  });
</script>

<style>
  .file-input {
    display: block;
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    cursor: pointer;
    transition: border-color 0.15s;
  }

  .file-input:hover {
    border-color: #9ca3af;
  }

  .file-input:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .dialog-content {
    max-height: 70vh;
    overflow-y: auto;
  }

  .loading-message {
    padding: 2rem;
    text-align: center;
    color: #3b82f6;
    font-size: 1rem;
  }

  .error-container {
    padding: 1.5rem;
  }

  .error-title {
    color: #ef4444;
    font-weight: 600;
    font-size: 1.125rem;
    margin-bottom: 0.75rem;
  }

  .error-message {
    color: #dc2626;
    background: #fee2e2;
    padding: 0.75rem;
    border-radius: 0.375rem;
    margin-bottom: 0.5rem;
    font-size: 0.875rem;
  }

  .success-message {
    color: #16a34a;
    background: #dcfce7;
    padding: 0.75rem;
    border-radius: 0.375rem;
    margin-bottom: 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
  }

  .warning-container {
    margin-bottom: 1rem;
  }

  .warning-message {
    color: #d97706;
    background: #fef3c7;
    padding: 0.75rem;
    border-radius: 0.375rem;
    margin-bottom: 0.5rem;
    font-size: 0.875rem;
  }

  .data-preview {
    padding: 1rem;
  }

  .table-wrapper {
    overflow-x: auto;
    max-height: 60vh;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    margin-bottom: 0.75rem;
  }

  .data-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
  }

  .data-table thead {
    background: #f9fafb;
    position: sticky;
    top: 0;
    z-index: 10;
  }

  .data-table th {
    padding: 0.75rem 1rem;
    text-align: left;
    font-weight: 600;
    color: #374151;
    border-bottom: 2px solid #e5e7eb;
    white-space: nowrap;
  }

  .data-table td {
    padding: 0.75rem 1rem;
    border-bottom: 1px solid #f3f4f6;
    color: #1f2937;
    white-space: nowrap;
  }

  .data-table tbody tr:hover {
    background: #f9fafb;
  }

  .info-message {
    color: #6b7280;
    font-size: 0.875rem;
    text-align: center;
    padding: 0.5rem;
  }

  .mt-4 {
    margin-top: 1rem;
  }
</style>

<Dialog.Root bind:open>
  <Dialog.Content class={rows.length > 0 ? "max-w-[90vw]" : "sm:max-w-[425px]"}>
    <Dialog.Header>
      <Dialog.Title>Create Work Order</Dialog.Title>
      <Dialog.Description>
        {#if rows.length === 0}
          Upload an Excel file (.xlsx) to create new work orders.
        {:else}
          {fileName} - {rows.length} row{rows.length !== 1 ? "s" : ""} loaded
        {/if}
      </Dialog.Description>
    </Dialog.Header>

    <div class="dialog-content">
      {#if state?.matches("idle")}
        <div class="grid gap-4 py-4">
          <div class="grid gap-2">
            <label for="file-upload" class="text-sm font-medium">Select Excel File</label>
            <input
              id="file-upload"
              type="file"
              accept=".xlsx"
              class="file-input"
              on:change={handleFileSelect}
            />
          </div>
        </div>
      {:else if state?.matches("reading")}
        <div class="loading-message">📖 Reading file...</div>
      {:else if state?.matches("parsing")}
        <div class="loading-message">🔍 Parsing Excel workbook...</div>
      {:else if state?.matches("building")}
        <div class="loading-message">🏗️ Building data grid...</div>
      {:else if state?.matches("generatingWorkOrders")}
        <div class="loading-message">🔢 Generating work order numbers...</div>
      {:else if state?.matches("error")}
        <div class="error-container">
          <div class="error-title">❌ Error</div>
          {#each errors as error, i (i)}
            <div class="error-message">{error}</div>
          {/each}
          <div class="mt-4">
            <input
              id="file-upload-retry"
              type="file"
              accept=".xlsx"
              class="file-input"
              on:change={handleFileSelect}
            />
          </div>
        </div>
      {:else if state?.matches("ready") && rows.length > 0}
        <div class="data-preview">
          {#if submitSuccess}
            <div class="success-message">
              ✅ Successfully created {rows.length} work order{rows.length !== 1 ? "s" : ""}!
            </div>
          {/if}

          {#if submitError}
            <div class="error-message">
              ❌ {submitError}
            </div>
          {/if}

          {#if errors.length > 0}
            <div class="warning-container">
              {#each errors as error, i (i)}
                <div class="warning-message">⚠️ {error}</div>
              {/each}
            </div>
          {/if}

          <div class="table-wrapper">
            <table class="data-table">
              <thead>
                <tr>
                  {#each columns.slice(0, 10) as column, i (column.field || i)}
                    <th>{column.title}</th>
                  {/each}
                </tr>
              </thead>
              <tbody>
                {#each rows as row, rowIdx (rowIdx)}
                  <tr>
                    {#each columns.slice(0, 10) as column, colIdx (column.field || colIdx)}
                      <td>{getSafeValue(row, column.field)}</td>
                    {/each}
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>

          <div class="info-message">
            Showing first 10 columns of {columns.length} total columns
          </div>
        </div>
      {/if}
    </div>

    <Dialog.Footer>
      {#if state?.matches("ready") && rows.length > 0}
        <Button variant="outline" on:click={handleCancel} disabled={isSubmitting}>Cancel</Button>
        {#if !rows[0]?.WO_Number}
          <Button on:click={handleGenerateWorkOrders} disabled={isSubmitting}>
            Generate Work Orders
          </Button>
        {:else}
          <Button on:click={handleSubmit} disabled={isSubmitting}>
            {#if isSubmitting}
              Creating...
            {:else}
              Create {rows.length} Work Order{rows.length !== 1 ? "s" : ""}
            {/if}
          </Button>
        {/if}
      {:else if state?.matches("error")}
        <Button variant="outline" on:click={handleCancel}>Close</Button>
      {:else}
        <Button variant="outline" on:click={handleCancel}>Cancel</Button>
      {/if}
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
