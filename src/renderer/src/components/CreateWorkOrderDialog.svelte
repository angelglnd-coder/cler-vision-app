<script>
  import * as Dialog from "$lib/components/ui/dialog";
  import { Button } from "$lib/components/ui/button";
  import { createWoExcelLoaderActor } from "../machines/woExcelLoaderMachine.js";
  import { onMount } from "svelte";
  import { createWorkOrdersBatch } from "../api/workOrderApi.js";
  import { Grid, Willow } from "@svar-ui/svelte-grid";
  import { Splitpanes, Pane } from "svelte-splitpanes";

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
      transformed.po = toStringOrEmpty(row.po);
      transformed.no = toStringOrEmpty(row.no);
      transformed.kCode = toStringOrEmpty(row.kCode);
      transformed.pCode = toStringOrEmpty(row.pCode);
      transformed.poDate = toStringOrUndefined(row.PO_date);

      // Type 2 specific fields
      transformed.brand = toStringOrEmpty(row.brand);
      transformed.pcs = toStringOrEmpty(row.pcs);
      transformed.material = toStringOrEmpty(row.material);
      transformed.color = toStringOrEmpty(row.color);
      transformed.bc1 = toStringOrEmpty(row.bc1);
      transformed.ctDry = toStringOrEmpty(row.ctDry);
      transformed.pw1 = toStringOrEmpty(row.pw1);
      transformed.add = toStringOrEmpty(row.add);
      transformed.sagHeight = toStringOrEmpty(row.sagHeight);
      transformed.defocus = toStringOrEmpty(row.defocus);
      transformed.direction = toStringOrEmpty(row.direction);
      transformed.ballast = toStringOrEmpty(row.ballast);
      transformed.diam = toStringOrEmpty(row.diam);
      transformed.oz1 = toStringOrEmpty(row.oz1);
      transformed.cylToric = toStringOrEmpty(row.toric);
      transformed.shoppingCart = toStringOrEmpty(row.shoppingNumber);
      transformed.patientName = toStringOrEmpty(row.Patient_Name);
      transformed.shipTo = toStringOrEmpty(row.Ship_To);
      transformed.priceCode = toStringOrEmpty(row.Price_Code);
      transformed.shipCode = toStringOrEmpty(row.Ship_Code);
      transformed.centerThick = toStringOrEmpty(row.Center_Thick);
      transformed.edgeThick = toStringOrEmpty(row.Edge_Thick);
      transformed.containerCode = toStringOrEmpty(row.Container_Code);
    } else {
      // Type 1 (HAI ORDERS) specific mappings
      transformed.patientName = toStringOrEmpty(row.Patient_Name);
      transformed.po = toStringOrEmpty(row.PO);
      transformed.poDate = toStringOrUndefined(row.PO_date); // Date field - omit if empty
      transformed.no = toStringOrEmpty(row.No);
      transformed.kCode = toStringOrEmpty(row.K_Code);
      transformed.pCode = toStringOrEmpty(row.P_Code);
      transformed.priceCode = toStringOrEmpty(row.Price_Code);
      transformed.spec = toStringOrEmpty(row.SPEC);
      transformed.cylToric = toStringOrEmpty(row.Cyl); // Backend expects cylToric
      transformed.diam = toStringOrEmpty(row.Diam);
      transformed.color = toStringOrEmpty(row.Color);
      transformed.laser = toStringOrEmpty(row.Laser);
      transformed.design = toStringOrEmpty(row.Design);
      transformed.vietLabel = toStringOrEmpty(row.Viet_Label);
      transformed.brand = toStringOrEmpty(row.Brand);
      transformed.shipCode = toStringOrEmpty(row.Ship_Code);
      transformed.previousSO = toStringOrEmpty(row.previous_so);
      transformed.note = toStringOrEmpty(row.Note);
      transformed.cldfile = toStringOrEmpty(row.cldfile);
      transformed.cylValue = toStringOrEmpty(row.Cyl_v); // Backend expects cylValue
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
      transformed.pc1Radius = toStringOrEmpty(row.PC1_radius);
      transformed.pc2Radius = toStringOrEmpty(row.PC2_radius);
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
      const createdCount = result.count || 0;

      submitSuccess = true;
      console.log(`Successfully created ${createdCount} work orders`);
      console.log("Batch create result:", result);

      // Log validation errors if any
      if (result.errors && result.errors.length > 0) {
        console.error("Validation errors from backend:", result.errors);
        result.errors.forEach((err, idx) => {
          console.error(`Error ${idx + 1}:`, err.error, "Data:", err.data);
        });
      }

      // Warn if fewer work orders were created than expected
      if (createdCount < transformedRows.length) {
        console.warn(
          `Warning: Only ${createdCount} of ${transformedRows.length} work orders were created`,
        );

        // Show specific error messages if available
        let errorMsg = `Warning: Only ${createdCount} of ${transformedRows.length} work orders were created.`;
        if (result.errors && result.errors.length > 0) {
          const firstErrors = result.errors
            .slice(0, 3)
            .map((e) => e.error)
            .join("; ");
          errorMsg += ` Errors: ${firstErrors}`;
          if (result.errors.length > 3) {
            errorMsg += ` (and ${result.errors.length - 3} more...)`;
          }
        }
        submitError = errorMsg;
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

      // Parse validation errors if available
      const errorData = error.response?.data;
      if (errorData?.errors && Array.isArray(errorData.errors)) {
        validationErrors = parseValidationErrors(errorData);
        submitError = errorData.message || "Validation failed";
      } else {
        // Try to get a more specific error message from the backend
        const backendMessage = errorData?.message || errorData?.error;
        submitError = backendMessage || error.message || "Failed to create work orders";
      }

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
    overflow-y: hidden;
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

  .splitpane-content {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
  }

  .splitpane-header {
    padding: 0.75rem 1rem;
    border-bottom: 1px solid #e5e7eb;
    background: #f9fafb;
    flex-shrink: 0;
  }

  .splitpane-header.error-header {
    background: #fef2f2;
    border-bottom: 1px solid #fca5a5;
    color: #dc2626;
  }

  .grid-wrapper-split {
    flex: 1;
    overflow: auto;
    border: 1px solid #e5e7eb;
    border-top: none;
  }

  .validation-errors-pane {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
    background: #fef2f2;
  }

  .validation-error-item {
    background: white;
    border: 1px solid #fecaca;
    border-radius: 0.375rem;
    padding: 0.75rem;
    margin-bottom: 0.75rem;
  }

  .validation-error-item:last-child {
    margin-bottom: 0;
  }

  .validation-error-row-header {
    font-weight: 600;
    color: #991b1b;
    margin-bottom: 0.5rem;
    font-size: 0.875rem;
  }

  .validation-error-fields {
    margin: 0;
    padding-left: 1.25rem;
    list-style-type: disc;
  }

  .validation-error-fields li {
    font-size: 0.875rem;
    color: #7f1d1d;
    margin-bottom: 0.25rem;
    line-height: 1.5;
  }

  .validation-error-fields strong {
    color: #991b1b;
  }

  .validation-error-fields code {
    background: #fee2e2;
    padding: 0.125rem 0.375rem;
    border-radius: 0.25rem;
    font-size: 0.8125rem;
    font-family: monospace;
    color: #7f1d1d;
  }
</style>

<Dialog.Root bind:open>
  <Dialog.Content
    interactOutsideBehavior="ignore"
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

          {#if submitError && validationErrors.length === 0}
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

          {#if validationErrors.length > 0}
            <Splitpanes style="height: 60vh">
              <Pane>
                <div class="splitpane-content">
                  <div class="splitpane-header">
                    <strong>Data Preview</strong>
                  </div>
                  <div class="grid-wrapper-split">
                    <Willow>
                      <Grid data={rows} {columns} />
                    </Willow>
                  </div>
                </div>
              </Pane>
              <Pane maxSize={45} minSize={35}>
                <div class="splitpane-content">
                  <div class="splitpane-header error-header">
                    <strong
                      >⚠️ Validation Errors ({validationErrors.length} row{validationErrors.length !==
                      1
                        ? "s"
                        : ""})</strong
                    >
                  </div>
                  <div class="validation-errors-pane">
                    {#each validationErrors as rowError (rowError.rowIndex)}
                      <div class="validation-error-item">
                        <div class="validation-error-row-header">Row {rowError.rowNumber}</div>
                        <ul class="validation-error-fields">
                          {#each rowError.fields as fieldError (fieldError.field)}
                            <li>
                              <strong>{fieldError.field}:</strong>
                              {fieldError.message}
                              {#if fieldError.value}
                                (value: <code>{fieldError.value}</code>)
                              {/if}
                            </li>
                          {/each}
                        </ul>
                      </div>
                    {/each}
                  </div>
                </div>
              </Pane>
            </Splitpanes>
          {:else}
            <div class="grid-wrapper">
              <Willow>
                <Grid data={rows} {columns} />
              </Willow>
            </div>
          {/if}
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
