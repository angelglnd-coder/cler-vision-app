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
  let validationErrors = $state([]);

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
  // Handles both Type 1 (HAI ORDERS) and Type 2 (GOV ORDERS)
  function transformRowForAPI(row, fileType) {
    // Common fields present in both Type 1 and Type 2
    const transformed = {
      woNumber: toStringOrEmpty(row.WO_Number),
      odOs: toStringOrEmpty(row.od_os),
      device: toStringOrEmpty(row.Device),
      mfg: toStringOrEmpty(row.Mfg),
      matCode: toStringOrEmpty(row.Mat_Code),
      matLot: toStringOrEmpty(row.Mat_Lot),
      gtin: toStringOrEmpty(row.GTIN),
      soldTo: toStringOrEmpty(row.Sold_To),
      billTo: toStringOrEmpty(row.Bill_To),
      type: toStringOrEmpty(row.Type),
    };

    if (fileType === "type2") {
      // Type 2 (GOV ORDERS) specific mappings
      transformed.po = toStringOrEmpty(row.order_number); // ORDER_# → po
      transformed.no = toStringOrEmpty(row.serial_number); // SERIAL_# → no
      transformed.kCode = toStringOrEmpty(row.km_code); // KM-CODE → kCode
      transformed.pCode = toStringOrEmpty(row.power_code); // POWER-CODE → pCode
      transformed.poDate = toStringOrUndefined(row.PO_date); // PO date → poDate (omit if empty)

      // Type 2 specific fields
      transformed.brand = toStringOrEmpty(row.brand);
      transformed.pcs = toStringOrEmpty(row.pcs);
      transformed.material = toStringOrEmpty(row.material);
      transformed.color = toStringOrEmpty(row.color);
      transformed.baseCurveDry = toStringOrEmpty(row.base_curve_dry);
      transformed.ctDry = toStringOrEmpty(row.ct_dry);
      transformed.lensPower = toStringOrEmpty(row.lens_power);
      transformed.shoppingNumber = toStringOrEmpty(row.shopping_number);
      transformed.shipTo = toStringOrEmpty(row.Ship_To);
    } else {
      // Type 1 (HAI ORDERS) specific mappings
      transformed.patientName = toStringOrEmpty(row.Patient_Name);
      transformed.po = toStringOrEmpty(row.PO);
      transformed.poDate = toStringOrUndefined(row.PO_date); // Date field - omit if empty
      transformed.no = toStringOrEmpty(row.number);
      transformed.kCode = toStringOrEmpty(row.k_code);
      transformed.pCode = toStringOrEmpty(row.p_code);
      transformed.spec = toStringOrEmpty(row.SPEC);
      transformed.cyl = toStringOrEmpty(row.Cyl);
      transformed.diam = toStringOrEmpty(row.Diam);
      transformed.color = toStringOrEmpty(row.Color);
      transformed.laser = toStringOrEmpty(row.Laser);
      transformed.design = toStringOrEmpty(row.Design);
      transformed.vietLabel = toStringOrEmpty(row.Viet_Label);
      transformed.labeling = toStringOrEmpty(row.Labeling);
      transformed.shipCode = toStringOrEmpty(row.Ship_Code);
      transformed.previousSO = toStringOrEmpty(row.previous_so);
      transformed.note = toStringOrEmpty(row.Note);
      transformed.cldfile = toStringOrEmpty(row.cldfile);
      transformed.cylP = toStringOrEmpty(row.Cyl_p);
      transformed.edgeThick = toStringOrEmpty(row.Edge_Thick);
      transformed.centerThick = toStringOrEmpty(row.Center_Thick);
      transformed.eValue = toStringOrEmpty(row.eValue);
      transformed.containerCode = toStringOrEmpty(row.Container_Code);

      // Calculated fields (Type 1 only)
      transformed.bc1 = toStringOrEmpty(row.BC1_BC2 || row.bc1);
      transformed.bc2 = toStringOrEmpty(row.BC1_BC2 || row.bc2);
      transformed.pw1 = toStringOrEmpty(row.PW1_PW2 || row.pw1);
      transformed.pw2 = toStringOrEmpty(row.PW1_PW2 || row.pw2);
      transformed.oz1 = toStringOrEmpty(row.OZ1_OZ2 || row.oz1);
      transformed.oz2 = toStringOrEmpty(row.OZ1_OZ2 || row.oz2);
      transformed.rc1Radius = toStringOrEmpty(row.RC1_radius);
      transformed.ac1Radius = toStringOrEmpty(row.AC1_radius);
      transformed.ac2Radius = toStringOrEmpty(row.AC2_radius);
      transformed.ac3Radius = toStringOrEmpty(row.AC3_radius);
      transformed.rc1Tor = toStringOrEmpty(row.RC1_tor);
      transformed.ac1Tor = toStringOrEmpty(row.AC1_tor);
      transformed.ac2Tor = toStringOrEmpty(row.AC2_tor);
      transformed.ac3Tor = toStringOrEmpty(row.AC3_tor);
      transformed.rc1Width = toStringOrEmpty(row.RC1_width);
      transformed.ac1Width = toStringOrEmpty(row.AC1_width);
      transformed.ac2Width = toStringOrEmpty(row.AC2_width);
      transformed.ac3Width = toStringOrEmpty(row.AC3_width);
      transformed.pc1Radius = toStringOrEmpty(row.PC1_Radius || row.PC_radius);
      transformed.pc2Radius = toStringOrEmpty(row.PC2_Radius);
      transformed.pcwidth = toStringOrEmpty(row.PC_width);
    }

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
    validationErrors = [];
  }

  // Parse validation errors from backend response
  function parseValidationErrors(errorData) {
    if (!errorData?.errors || !Array.isArray(errorData.errors)) {
      return [];
    }

    // Group errors by row index and field
    const errorMap = {};

    errorData.errors.forEach((error) => {
      // Extract row index from path like "workOrders[0].poDate"
      const match = error.path?.match(/workOrders\[(\d+)\]\.(.+)/);
      if (match) {
        const rowIndex = parseInt(match[1], 10);
        const fieldName = match[2];
        const key = `${rowIndex}`;

        if (!errorMap[key]) {
          errorMap[key] = {
            rowIndex,
            rowNumber: rowIndex + 1, // Display as 1-based
            fields: [],
          };
        }

        errorMap[key].fields.push({
          field: fieldName,
          message: error.msg,
          value: error.value,
        });
      }
    });

    return Object.values(errorMap).sort((a, b) => a.rowIndex - b.rowIndex);
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
    validationErrors = [];

    try {
      // Get fileType from state context (defaults to "type1" for backward compatibility)
      const fileType = state.context?.fileType || "type1";

      // Transform all rows to API format (camelCase, filter out error columns)
      const transformedRows = rows
        .map((row) => transformRowForAPI(row, fileType))
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

  .info-message {
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
    overflow: hidden;
  }

  .mt-4 {
    margin-top: 1rem;
  }

  .file-type-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.5rem;
    border-radius: 0.375rem;
    font-size: 0.75rem;
    font-weight: 600;
    margin-left: 0.5rem;
  }

  .file-type-badge.type1 {
    background: #dcfce7;
    border: 1px solid #86efac;
    color: #166534;
  }

  .file-type-badge.type2 {
    background: #f3e8ff;
    border: 1px solid #c084fc;
    color: #6b21a8;
  }

  .badge-icon {
    font-size: 0.875rem;
  }

  .badge-text {
    font-size: 0.75rem;
  }
</style>

<Dialog.Root bind:open>
  <Dialog.Content
    class={(state?.matches("ready") || state?.matches("readyCalculations")) && rows.length > 0
      ? "!w-[95vw] !max-w-[95vw]"
      : "!max-w-[600px]"}
  >
    <Dialog.Header>
      <Dialog.Title>
        Create Work Order
        {#if state.context?.fileType}
          <span class="file-type-badge {state.context.fileType}">
            <span class="badge-icon">
              {state.context.fileType === "type1" ? "📋" : "🏭"}
            </span>
            <span class="badge-text">
              {state.context.detectedSchema?.name || "Unknown"}
            </span>
          </span>
        {/if}
      </Dialog.Title>
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
                <div class={error.startsWith("ℹ️") ? "info-message" : "warning-message"}>
                  {error}
                </div>
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
          <Button
            onclick={handleGenerateWorkOrders}
            disabled={isSubmitting || state.context?.hasMissingColumns}
          >
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
