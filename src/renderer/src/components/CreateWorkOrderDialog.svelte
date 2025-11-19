<script>
  import * as Dialog from "$lib/components/ui/dialog";
  import { Button } from "$lib/components/ui/button";
  import { createWoExcelLoaderActor } from "../machines/woExcelLoaderMachine.js";
  import { onMount } from "svelte";
  import { createWorkOrdersBatch } from "../api/workOrderApi.js";
  import { Grid, Willow } from "@svar-ui/svelte-grid";

  let { open = $bindable(false), onSuccess = () => {} } = $props();

  // Create a new actor instance for this component
  const actorExcel = createWoExcelLoaderActor();

  // State - using $state() for proper reactivity in Svelte 5
  let state = $state(actorExcel.getSnapshot());
  let columns = $state([]);
  let rows = $state([]);
  let errors = $state([]);
  let fileName = $state("");
  let isSubmitting = $state(false);
  let submitError = $state(null);
  let submitSuccess = $state(false);

  // Transform columns to SVAR Grid format
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
      };
    });
  }

  function updateFromContext(ctx) {
    columns = toSvarColumns(ctx.columns || []);
    rows = ctx.data || [];
    errors = ctx.errors || [];
    fileName = ctx.fileName || "";
  }

  // Helper to convert value to string, empty string if null/undefined
  function toStringOrEmpty(value) {
    if (value === null || value === undefined) return "";
    return String(value);
  }

  // Helper for optional fields - return undefined if null/undefined/empty
  function toStringOrUndefined(value) {
    if (value === null || value === undefined || value === "") return undefined;
    return String(value);
  }

  // Transform Excel row data to API format (camelCase)
  function transformRowForAPI(row) {
    const transformed = {
      woNumber: toStringOrEmpty(row.WO_Number),
      patientName: toStringOrEmpty(row.Patient_Name),
      po: toStringOrEmpty(row.PO),
      poDate: toStringOrUndefined(row.PO_date), // Date field - omit if empty
      no: toStringOrEmpty(row.number),
      odOs: toStringOrEmpty(row.od_os),
      kCode: toStringOrEmpty(row.k_code),
      pCode: toStringOrEmpty(row.p_code),
      spec: toStringOrEmpty(row.SPEC),
      cyl: toStringOrEmpty(row.Cyl),
      diam: toStringOrEmpty(row.Diam),
      color: toStringOrEmpty(row.Color),
      laser: toStringOrEmpty(row.Laser),
      design: toStringOrEmpty(row.Design),
      vietLabel: toStringOrEmpty(row.Viet_Label),
      labeling: toStringOrEmpty(row.Labeling),
      shipCode: toStringOrEmpty(row.Ship_Code),
      previousSO: toStringOrEmpty(row.previous_so),
      note: toStringOrEmpty(row.Note),
      device: toStringOrEmpty(row.Device),
      mfg: toStringOrEmpty(row.Mfg),
      matCode: toStringOrEmpty(row.Mat_Code),
      matLot: toStringOrEmpty(row.Mat_Lot),
      gtin: toStringOrEmpty(row.GTIN),
      soldTo: toStringOrEmpty(row.Sold_To),
      billTo: toStringOrEmpty(row.Bill_To),
      cldfile: toStringOrEmpty(row.cldfile),
      type: toStringOrEmpty(row.Type),
      cylP: toStringOrEmpty(row.Cyl_p),
      edgeThick: toStringOrEmpty(row.Edge_Thick),
      centerThick: toStringOrEmpty(row.Center_Thick),
      eValue: toStringOrEmpty(row.eValue),
      containerCode: toStringOrEmpty(row.Container_Code),
      // Calculated fields (already in correct format or need mapping)
      bc1: toStringOrEmpty(row.BC1_BC2 || row.bc1),
      bc2: toStringOrEmpty(row.BC1_BC2 || row.bc2),
      pw1: toStringOrEmpty(row.PW1_PW2 || row.pw1),
      pw2: toStringOrEmpty(row.PW1_PW2 || row.pw2),
      oz1: toStringOrEmpty(row.OZ1_OZ2 || row.oz1),
      oz2: toStringOrEmpty(row.OZ1_OZ2 || row.oz2),
      rc1Radius: toStringOrEmpty(row.RC1_radius),
      ac1Radius: toStringOrEmpty(row.AC1_radius),
      ac2Radius: toStringOrEmpty(row.AC2_radius),
      ac3Radius: toStringOrEmpty(row.AC3_radius),
      rc1Tor: toStringOrEmpty(row.RC1_tor),
      ac1Tor: toStringOrEmpty(row.AC1_tor),
      ac2Tor: toStringOrEmpty(row.AC2_tor),
      ac3Tor: toStringOrEmpty(row.AC3_tor),
      rc1Width: toStringOrEmpty(row.RC1_width),
      ac1Width: toStringOrEmpty(row.AC1_width),
      ac2Width: toStringOrEmpty(row.AC2_width),
      ac3Width: toStringOrEmpty(row.AC3_width),
      pc1Radius: toStringOrEmpty(row.PC1_Radius || row.PC_radius),
      pc2Radius: toStringOrEmpty(row.PC2_Radius),
      pcwidth: toStringOrEmpty(row.PC_width),
    };

    // Filter out only undefined values
    // Keep empty strings for now to match .http file format
    return Object.fromEntries(
      Object.entries(transformed).filter(([, value]) => value !== undefined),
    );
  }

  function handleFileSelect(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    console.log("1) Selected file:", file.name);
    actorExcel.send({ type: "FILE.SELECT", file });
    submitError = null;
    submitSuccess = false;
  }

  function handleCancel() {
    actorExcel.send({ type: "RESET" });
    open = false;
    submitError = null;
    submitSuccess = false;
  }

  function handleGenerateWorkOrders() {
    console.log("handleGenerateWorkOrders called");
    console.log("Current state:", state?.value);
    console.log("isSubmitting:", isSubmitting);
    console.log("rows[0]?.WO_Number:", rows[0]?.WO_Number);
    actorExcel.send({ type: "GENERATE.WO" });
  }

  async function handleSubmit() {
    isSubmitting = true;
    submitError = null;
    submitSuccess = false;

    try {
      // Transform all rows to API format (camelCase, filter out error columns)
      const transformedRows = rows
        .map(transformRowForAPI)
        .filter((row) => row.woNumber && row.woNumber.trim() !== ""); // Filter out rows without WO number

      console.log("Sending batch create request:", {
        count: transformedRows.length,
        sample: transformedRows[0],
      });

      const result = await createWorkOrdersBatch(transformedRows);
      const createdCount = result.data.count || 0;

      submitSuccess = true;
      console.log(`Successfully created ${createdCount} work orders`);

      // Warn if fewer work orders were created than expected
      if (createdCount < transformedRows.length) {
        console.warn(
          `Warning: Only ${createdCount} of ${transformedRows.length} work orders were created`,
        );
        submitError = `Warning: Only ${createdCount} of ${transformedRows.length} work orders were created. Check backend logs for validation errors.`;
      }

      // Call success callback to refresh parent component
      onSuccess();

      // Close dialog after brief delay to show success
      setTimeout(() => {
        actorExcel.send({ type: "RESET" });
        open = false;
        isSubmitting = false;
      }, 1000);
    } catch (error) {
      console.error("Error creating work orders:", error);
      console.error("Error response data:", error.response?.data);
      console.error("Error response status:", error.response?.status);

      // Try to get a more specific error message from the backend
      const backendMessage = error.response?.data?.message || error.response?.data?.error;
      submitError = backendMessage || error.message || "Failed to create work orders";
      isSubmitting = false;
    }
  }

  onMount(() => {
    // Start the actor when component mounts
    actorExcel.start();
    console.log("onMOUNT: createWorkORDER Dialog", actorExcel.getSnapshot());

    const sub = actorExcel.subscribe((s) => {
      state = s;
      updateFromContext(s.context);
      console.log("State:", state);
    });

    return () => {
      sub.unsubscribe?.();
      // Safe to stop since this is a per-component instance
      actorExcel.stop();
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
    width: 100%;
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

  .grid-wrapper {
    height: 60vh;
    width: 100%;
    overflow-x: auto;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
  }

  .mt-4 {
    margin-top: 1rem;
  }
</style>

<Dialog.Root bind:open>
  <Dialog.Content
    class={(state?.matches("ready") || state?.matches("readyCalculations")) && rows.length > 0
      ? "!w-[95vw] !max-w-[95vw]"
      : "!max-w-[600px]"}
  >
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
        <div class="loading-message">
          🔢 Fetching sequences and generating work order numbers...
        </div>
      {:else if state?.matches("applyingFormulas")}
        <div class="loading-message">🧮 Applying lens formulas and calculations...</div>
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
      {:else if (state?.matches("ready") || state?.matches("readyCalculations")) && rows.length > 0}
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

          <div class="grid-wrapper">
            <Willow>
              <Grid data={rows} {columns} />
            </Willow>
          </div>
        </div>
      {/if}
    </div>

    <Dialog.Footer>
      {#if (state?.matches("ready") || state?.matches("readyCalculations")) && rows.length > 0}
        <Button variant="outline" onclick={handleCancel} disabled={isSubmitting}>Cancel</Button>
        {#if !rows[0]?.WO_Number}
          <Button onclick={handleGenerateWorkOrders} disabled={isSubmitting}>
            Generate Work Orders
          </Button>
        {:else}
          <Button onclick={handleSubmit} disabled={isSubmitting}>
            {#if isSubmitting}
              Creating...
            {:else}
              Create {rows.length} Work Order{rows.length !== 1 ? "s" : ""}
            {/if}
          </Button>
        {/if}
      {:else if state?.matches("error")}
        <Button variant="outline" onclick={handleCancel}>Close</Button>
      {:else}
        <Button variant="outline" onclick={handleCancel}>Cancel</Button>
      {/if}
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
