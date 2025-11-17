<script>
  import { onMount, onDestroy } from "svelte";
  import { queMachine } from "../machines/queMachine.js";
  import { createActor } from "xstate";
  import { Button } from "$lib/components/ui/button";
  import * as Dialog from "$lib/components/ui/dialog";
  import { Input } from "$lib/components/ui/input";
  import { downloadAsZip } from "../utils/downloadZip.js";
  import { Splitpanes, Pane } from "svelte-splitpanes";
  import { Grid, Willow } from "@svar-ui/svelte-grid";

  // Create actor instance
  const actor = createActor(queMachine);

  // Reactive state
  let state = $state(actor.getSnapshot());
  let queueFileName = $state("");
  let scannedBarcode = $state("");
  let showCreateDialog = $state(false);
  let showThicknessDialog = $state(false);
  let adjustedThickness = $state(0.26);
  let barcodeInput;

  // Computed values
  let currentStateName = $derived(state.value);
  let isLoadingQueues = $derived(currentStateName === "loadingQueues");
  let isIdle = $derived(currentStateName === "idle");
  let isScanning = $derived(currentStateName === "scanning");
  let isReady = $derived(currentStateName === "ready");
  let isComplete = $derived(currentStateName === "complete");
  let isLoading = $derived(
    currentStateName === "loadingWorkOrder" || currentStateName === "finalizing",
  );
  let hasError = $derived(state.context.error !== null);

  // Context values
  let groups = $derived(state.context.groups || []);
  let currentGroup = $derived(state.context.currentGroup || []);
  let queFile = $derived(state.context.queFile);
  let difFiles = $derived(state.context.difFiles || []);
  let error = $derived(state.context.error);
  let emitErrors = $derived(state.context.emitErrors || []);
  let currentQueueFileName = $derived(state.context.queueFileName);
  let queues = $derived(state.context.queues || []);

  // Statistics
  let totalGroups = $derived(groups.length);
  let totalWorkOrders = $derived(
    groups.reduce((sum, group) => sum + group.workOrders.length, 0) + currentGroup.length,
  );
  let currentGroupThickness = $derived(currentGroup.length > 0 ? currentGroup[0].thickness : null);

  // Grid configuration for current group table
  const columns = [
    {
      id: "woNumber",
      header: "Work Order",
      width: 150,
      sortable: true,
      filter: false,
      align: "left",
      pinned: "left",
    },
    {
      id: "patientName",
      header: "Patient Name",
      width: 200,
      sortable: true,
      filter: false,
      align: "left",
    },
    {
      id: "type",
      header: "Type",
      width: 120,
      sortable: true,
      filter: false,
      align: "left",
    },
    {
      id: "thickness",
      header: "Thickness",
      width: 100,
      sortable: true,
      filter: false,
      align: "right",
    },
  ];

  // Derived state for table rows
  let tableRows = $derived(
    currentGroup.map((wo) => ({
      id: wo.woNumber,
      woNumber: wo.woNumber,
      patientName: wo.patientName || "N/A",
      type: wo.type || "N/A",
      thickness: wo.thickness,
    })),
  );

  // Transform queues to tree data structure for Grid
  // Following the official example format from TreeTable.svelte
  function getTreeData(queues) {
    if (!queues || queues.length === 0) return [];

    return queues.map((queue) => {
      // Create base queue row with all properties
      const queueRow = {
        id: queue._id,
        name: queue.name,
        status: queue.status,
        info: `${queue.groups?.length || 0} Groups, ${queue.groups?.reduce((sum, g) => sum + (g.workOrders?.length || 0), 0) || 0} WOs`,
        created: formatDate(queue.createdAt),
      };

      // Add nested groups if they exist
      if (queue.groups && queue.groups.length > 0) {
        queueRow.open = false; // Start collapsed
        queueRow.data = queue.groups.map((group, groupIdx) => {
          // Create group row with all properties
          const groupRow = {
            id: `${queue._id}-${group._id}`,
            name: `Group ${groupIdx + 1} (${formatThickness(group.thickness)} mm)`,
            status: "",
            info: `${group.workOrders?.length || 0} work orders`,
            created: "",
          };

          // Add nested work orders if they exist
          if (group.workOrders && group.workOrders.length > 0) {
            groupRow.open = false; // Start collapsed
            groupRow.data = group.workOrders.map((woItem) => {
              const wo = woItem.workOrder || {};
              // Work order rows (leaf nodes) - no nested data
              return {
                id: woItem._id,
                name: woItem.woNumber || wo.woNumber || "N/A",
                status: wo.patientName || "N/A",
                info: `${wo.po || "N/A"} | ${wo.spec || "N/A"}`,
                created: `${wo.color || "N/A"} | ${wo.design || "N/A"}`,
              };
            });
          }

          return groupRow;
        });
      }

      return queueRow;
    });
  }

  // Tree grid columns following the official example pattern
  const treeColumns = [
    {
      id: "name",
      header: "Queue / Group / Work Order",
      flexgrow: 1,
      treetoggle: true,
    },
    {
      id: "status",
      header: "Status / Patient",
      width: 200,
    },
    {
      id: "info",
      header: "Info / PO & Spec",
      width: 250,
    },
    {
      id: "created",
      header: "Created / Color & Design",
      width: 250,
    },
  ];

  // Responsive configuration to help with animation issues
  const responsive = {
    "800": {
      columns: treeColumns,
    },
  };

  let treeData = $derived(getTreeData(queues));
  let api = $state();

  onMount(() => {
    actor.start();
    actor.subscribe((newState) => {
      state = newState;
    });
  });

  onDestroy(() => {
    actor.stop();
  });

  function handleCreateQueue() {
    if (queueFileName.trim()) {
      actor.send({ type: "CREATE_QUEUE", name: queueFileName });
      showCreateDialog = false;
      queueFileName = "";
      // Focus on barcode input after creating queue
      setTimeout(() => barcodeInput?.focus(), 100);
    }
  }

  function handleScanBarcode() {
    if (scannedBarcode.trim()) {
      actor.send({ type: "SCAN_BARCODE", woNumber: scannedBarcode.trim() });
      scannedBarcode = "";
      // Keep focus on input for rapid scanning
      setTimeout(() => barcodeInput?.focus(), 100);
    }
  }

  function handleConfirmGroup() {
    // Open dialog instead of confirming immediately
    adjustedThickness = currentGroupThickness || 0.24;
    showThicknessDialog = true;
  }

  function handleThicknessConfirm() {
    if (adjustedThickness && adjustedThickness > 0) {
      actor.send({
        type: "CONFIRM_GROUP_WITH_THICKNESS",
        thickness: Number(adjustedThickness),
      });
      showThicknessDialog = false;
      setTimeout(() => barcodeInput?.focus(), 100);
    }
  }

  function handleThicknessCancel() {
    showThicknessDialog = false;
    setTimeout(() => barcodeInput?.focus(), 100);
  }

  function handleCancelGroup() {
    actor.send({ type: "CANCEL_GROUP" });
    setTimeout(() => barcodeInput?.focus(), 100);
  }

  function handleAddAnotherGroup() {
    actor.send({ type: "ADD_ANOTHER_GROUP" });
    setTimeout(() => barcodeInput?.focus(), 100);
  }

  function handleFinalize() {
    actor.send({ type: "FINALIZE" });
  }

  function handleReset() {
    actor.send({ type: "RESET" });
  }

  function handleDownload() {
    if (queFile && difFiles) {
      const zipName = queFile.name.replace(".QUE", ".zip");
      downloadAsZip(queFile, difFiles, zipName);
    }
  }

  function handleKeyPress(event) {
    if (event.key === "Enter") {
      handleScanBarcode();
    }
  }

  function formatDate(dateString) {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleString();
  }

  function formatThickness(thickness) {
    if (!thickness) return "N/A";
    // Handle MongoDB $numberDecimal format
    if (thickness.$numberDecimal) {
      return parseFloat(thickness.$numberDecimal).toFixed(2);
    }
    return parseFloat(thickness).toFixed(2);
  }
</script>

<style>
  .queue-container {
    padding: 2rem;
    width: 100%;
    max-width: none;
  }

  .queue-header {
    margin-bottom: 2rem;
  }

  .queue-header h1 {
    font-size: 2rem;
    font-weight: 700;
    margin-bottom: 0.5rem;
  }

  .subtitle {
    color: #6b7280;
    font-size: 1rem;
  }

  .state-card {
    background: white;
    border-radius: 8px;
    padding: 2rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .state-card.centered {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 1.5rem;
  }

  .state-card.success {
    border: 2px solid #10b981;
  }

  .success-icon {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: #10b981;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 3rem;
    font-weight: bold;
  }

  .instruction {
    color: #6b7280;
    margin-bottom: 1rem;
  }

  .queue-info {
    margin-bottom: 2rem;
  }

  .queue-info h2 {
    font-size: 1.5rem;
    font-weight: 600;
    margin-bottom: 1rem;
  }

  .stats {
    display: flex;
    gap: 2rem;
    flex-wrap: wrap;
  }

  .stat-item {
    padding: 0.5rem 1rem;
    background: #f3f4f6;
    border-radius: 6px;
    font-size: 0.875rem;
  }

  .thickness-badge {
    background: #dbeafe;
    color: #1e40af;
  }

  .scanner-section {
    margin-bottom: 2rem;
    padding: 1.5rem;
    background: #f9fafb;
    border-radius: 8px;
  }

  .scanner-section h3 {
    font-size: 1.25rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
  }

  .barcode-input-group {
    display: flex;
    gap: 0.75rem;
    margin-top: 1rem;
  }

  .barcode-input-group :global(input) {
    flex: 1;
  }

  .error-message {
    margin-top: 1rem;
    padding: 0.75rem;
    background: #fef2f2;
    color: #991b1b;
    border-radius: 6px;
    border: 1px solid #fecaca;
  }

  .current-group {
    margin-bottom: 2rem;
    padding: 1.5rem;
    background: #f0f9ff;
    border: 2px solid #3b82f6;
    border-radius: 8px;
  }

  .current-group h3 {
    font-size: 1.25rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
    color: #1e40af;
  }

  .group-instruction {
    color: #1e40af;
    font-size: 0.875rem;
    margin-bottom: 1rem;
  }

  .work-order-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .work-order-card {
    background: white;
    padding: 1rem;
    border-radius: 6px;
    border: 1px solid #e5e7eb;
  }

  .wo-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
  }

  .wo-number {
    font-weight: 600;
    font-size: 1rem;
  }

  .wo-index {
    background: #3b82f6;
    color: white;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
  }

  .wo-details {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: 0.875rem;
    color: #4b5563;
    margin-bottom: 0.75rem;
  }

  .wo-barcode {
    margin-top: 0.5rem;
    display: flex;
    justify-content: center;
  }

  .group-actions {
    display: flex;
    gap: 1rem;
    justify-content: center;
  }

  .group-summary {
    display: flex;
    gap: 1rem;
    padding: 0.75rem;
    background: white;
    border-radius: 6px;
    margin-bottom: 0.5rem;
    border: 1px solid #e5e7eb;
  }

  .group-number {
    font-weight: 600;
  }

  .group-thickness {
    color: #1e40af;
    font-weight: 500;
  }

  .group-count {
    color: #6b7280;
  }

  .main-actions {
    display: flex;
    gap: 1rem;
    justify-content: center;
    flex-wrap: wrap;
    margin-top: 2rem;
  }

  .file-info {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
    margin: 2rem 0;
    padding: 1.5rem;
    background: #f9fafb;
    border-radius: 8px;
  }

  .file-item {
    font-size: 0.875rem;
  }

  .emit-errors {
    margin-top: 1.5rem;
    padding: 1rem;
    background: #fef3c7;
    border: 1px solid #fbbf24;
    border-radius: 6px;
  }

  .emit-errors h4 {
    font-weight: 600;
    margin-bottom: 0.5rem;
    color: #92400e;
  }

  .emit-errors p {
    font-size: 0.875rem;
    color: #78350f;
    margin-bottom: 0.25rem;
  }

  .dialog-body {
    padding: 1.5rem 0;
  }

  .table-pane {
    height: 100%;
    display: flex;
    flex-direction: column;
    padding: 1rem;
    background: #f9fafb;
  }

  .table-header {
    margin-bottom: 1rem;
  }

  .table-header h3 {
    font-size: 1.25rem;
    font-weight: 600;
    color: #1e40af;
    margin-bottom: 0.25rem;
  }

  .table-subtitle {
    font-size: 0.875rem;
    color: #6b7280;
  }

  .table-container {
    flex: 1;
    min-height: 0;
    background: white;
    border-radius: 6px;
    overflow: hidden;
    border: 1px solid #e5e7eb;
  }

  .confirmed-groups-pane {
    height: 100%;
    display: flex;
    flex-direction: column;
    padding: 1rem;
    background: #f9fafb;
  }

  .confirmed-groups-content {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  :global(.splitpanes__pane) {
    overflow-y: auto;
  }

  .queue-list-container {
    margin-top: 1.5rem;
  }

  .queue-list-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .queue-list-header h2 {
    font-size: 1.5rem;
    font-weight: 600;
  }

  /* Queue List Styles */
  .queue-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .queue-item {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    overflow: hidden;
  }

  .queue-row {
    display: flex;
    align-items: center;
    padding: 1rem;
    cursor: pointer;
    transition: background-color 0.15s;
  }

  .queue-row:hover {
    background-color: #f9fafb;
  }

  .queue-row-icon {
    flex-shrink: 0;
    margin-right: 0.75rem;
    color: #6b7280;
  }

  .queue-row-content {
    flex: 1;
    display: grid;
    grid-template-columns: 2fr 1fr 1fr 1fr 2fr;
    gap: 1rem;
    align-items: center;
  }

  .queue-name {
    font-weight: 600;
    font-size: 1rem;
  }

  .queue-status {
    padding: 0.25rem 0.75rem;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 500;
    display: inline-block;
    width: fit-content;
  }

  .queue-status.idle {
    background-color: #dbeafe;
    color: #1e40af;
  }

  .queue-status.exported {
    background-color: #d1fae5;
    color: #065f46;
  }

  .queue-info-item {
    font-size: 0.875rem;
    color: #6b7280;
  }

  .queue-date {
    font-size: 0.875rem;
    color: #6b7280;
  }

  .group-list {
    background-color: #f9fafb;
    border-top: 1px solid #e5e7eb;
  }

  .group-item {
    border-bottom: 1px solid #e5e7eb;
  }

  .group-item:last-child {
    border-bottom: none;
  }

  .group-row {
    display: flex;
    align-items: center;
    padding: 0.75rem 1rem 0.75rem 3rem;
    cursor: pointer;
    transition: background-color 0.15s;
  }

  .group-row:hover {
    background-color: #f3f4f6;
  }

  .group-row-icon {
    flex-shrink: 0;
    margin-right: 0.75rem;
    color: #6b7280;
  }

  .group-row-content {
    flex: 1;
    display: flex;
    gap: 2rem;
    align-items: center;
  }

  .group-label {
    font-weight: 500;
    font-size: 0.875rem;
    color: #1e40af;
  }

  .group-thickness {
    font-size: 0.875rem;
    color: #4b5563;
  }

  .group-wo-count {
    font-size: 0.875rem;
    color: #6b7280;
  }

  .work-order-list {
    background-color: #ffffff;
    padding: 0.5rem 1rem 0.5rem 5rem;
    max-height: 400px;
    overflow: hidden;
  }

  /* Grid hover effect styling */
  .work-order-list :global(.wx-grid) {
    height: 350px;
    font-size: 0.875rem;
  }

  .work-order-list :global(.wx-grid .wx-row.hover-highlight:hover) {
    background-color: #f9fafb !important;
  }

  .work-order-list :global(.wx-grid .wx-header) {
    background-color: #f9fafb;
    font-weight: 600;
    font-size: 0.8rem;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.025em;
  }

  .work-order-list :global(.wx-grid .wx-cell) {
    padding: 0.75rem 1rem;
    color: #1f2937;
  }

  /* Work order number cell styling */
  .work-order-list :global(.wx-grid .wx-cell[data-col-id="woNumber"]) {
    font-weight: 500;
    color: #1e40af;
  }

  .loading-state {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 3rem;
    color: #6b7280;
  }

  /* Disable ALL Grid animations and transitions */
  :global(.wx-grid),
  :global(.wx-grid *),
  :global(.wx-grid .wx-row),
  :global(.wx-grid .wx-cell),
  :global(.wx-grid-header),
  :global([class*="wx-"]) {
    transition: none !important;
    animation: none !important;
    transition-property: none !important;
    transition-duration: 0s !important;
    transition-delay: 0s !important;
    animation-duration: 0s !important;
    animation-delay: 0s !important;
    will-change: auto !important;
  }

  /* Override any motion-related CSS variables */
  :global(.wx-grid) {
    --wx-transition-duration: 0s !important;
    --wx-animation-duration: 0s !important;
  }
</style>

<div class="queue-container">
  <header class="queue-header">
    <h1>Queue File Builder</h1>
    <p class="subtitle">Create queue files by scanning work order barcodes</p>
  </header>

  <!-- Loading Queues State -->
  {#if isLoadingQueues}
    <div class="state-card">
      <div class="loading-state">
        <p>Loading queues...</p>
      </div>
    </div>
  {/if}

  <!-- Idle State: Create New Queue + Queue List -->
  {#if isIdle}
    <div class="state-card">
      <div class="queue-list-container">
        <div class="queue-list-header">
          <h2>Queue Files</h2>
          <Button onclick={() => (showCreateDialog = true)}>Create New Queue</Button>
        </div>

        {#if queues.length === 0}
          <div style="text-align: center; padding: 3rem; color: #6b7280;">
            <p>No queue files yet. Create your first queue file to get started.</p>
          </div>
        {:else}
          <div style="width: 1000px; padding: 20px; margin-top: 10px;">
            <Willow>
              <Grid
                bind:this={api}
                tree={true}
                data={treeData}
                columns={treeColumns}
                {responsive}
              />
            </Willow>
          </div>
        {/if}
      </div>
    </div>

    <!-- Create Queue Dialog -->
    <Dialog.Root bind:open={showCreateDialog}>
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>Create Queue File</Dialog.Title>
          <Dialog.Description>
            Enter a name for your queue file. The .QUE extension will be added automatically.
          </Dialog.Description>
        </Dialog.Header>

        <div class="dialog-body">
          <Input
            type="text"
            placeholder="Enter queue file name"
            bind:value={queueFileName}
            onkeypress={(e) => e.key === "Enter" && handleCreateQueue()}
          />
        </div>

        <Dialog.Footer>
          <Button variant="outline" onclick={() => (showCreateDialog = false)}>Cancel</Button>
          <Button onclick={handleCreateQueue} disabled={!queueFileName.trim()}>Create</Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  {/if}

  <!-- Scanning State -->
  {#if isScanning || isLoading}
    <div class="state-card">
      <Splitpanes style="height: 600px;">
        <Pane>
          <!-- Queue Info -->
          <div class="queue-info">
            <h2>{currentQueueFileName}</h2>
            <div class="stats">
              <span class="stat-item">
                <strong>Groups:</strong>
                {totalGroups}
              </span>
              <span class="stat-item">
                <strong>Total WOs:</strong>
                {totalWorkOrders}
              </span>
              {#if currentGroupThickness !== null}
                <span class="stat-item thickness-badge">
                  <strong>Default Thickness:</strong>
                  {currentGroupThickness} (adjustable)
                </span>
              {/if}
            </div>
          </div>

          <!-- Barcode Scanner -->
          <div class="scanner-section">
            <h3>Scan Work Orders</h3>
            <p class="instruction">
              Scan work order barcodes to add them to the current thickness group
            </p>

            <div class="barcode-input-group">
              <Input
                type="text"
                placeholder="Scan or enter work order number"
                bind:value={scannedBarcode}
                bind:this={barcodeInput}
                onkeypress={handleKeyPress}
                disabled={isLoading}
              />
              <Button onclick={handleScanBarcode} disabled={!scannedBarcode.trim() || isLoading}>
                {isLoading ? "Loading..." : "Add"}
              </Button>
            </div>

            {#if hasError}
              <div class="error-message">
                {error}
              </div>
            {/if}
          </div>

          <!-- Group Actions -->
          {#if currentGroup.length > 0}
            <div class="group-actions" style="margin-top: 1rem;">
              <Button variant="outline" onclick={handleCancelGroup} disabled={isLoading}>
                Cancel Group
              </Button>
              <Button onclick={handleConfirmGroup} disabled={isLoading}>
                Confirm Group ({currentGroup.length} WOs)
              </Button>
            </div>
          {/if}
        </Pane>

        {#if currentGroup.length > 0}
          <Pane>
            <div class="table-pane">
              <div class="table-header">
                <h3>Current Group (Thickness: {currentGroupThickness})</h3>
                <p class="table-subtitle">
                  {currentGroup.length} work order{currentGroup.length !== 1 ? "s" : ""} added
                </p>
              </div>
              <div class="table-container">
                <Willow>
                  <Grid data={tableRows} {columns} rowStyle={() => "hover-highlight"} />
                </Willow>
              </div>
            </div>
          </Pane>
        {/if}

        <!-- Right Pane: Confirmed Groups Summary -->
        {#if groups.length > 0}
          <Pane>
            <div class="confirmed-groups-pane">
              <div class="table-header">
                <h3>Confirmed Groups</h3>
                <p class="table-subtitle">
                  {groups.length} group{groups.length !== 1 ? "s" : ""} confirmed
                </p>
              </div>
              <div class="confirmed-groups-content">
                {#each groups as group, idx (idx)}
                  <div class="group-summary">
                    <span class="group-number">Group {idx + 1}</span>
                    <span class="group-thickness">Thickness: {group.thickness}</span>
                    <span class="group-count">{group.workOrders.length} work orders</span>
                  </div>
                {/each}
              </div>
            </div>
          </Pane>
        {/if}
      </Splitpanes>

      <!-- Action Buttons -->
      <div class="main-actions">
        {#if groups.length > 0}
          <Button size="lg" onclick={handleFinalize}>Finalize Queue File</Button>
        {/if}
        <Button variant="outline" onclick={handleReset}>Cancel & Reset</Button>
      </div>
    </div>
  {/if}

  <!-- Ready State: Can add more groups or finalize -->
  {#if isReady}
    <div class="state-card">
      <Splitpanes style="height: 600px;">
        <Pane>
          <!-- Queue Info -->
          <div class="queue-info">
            <h2>{currentQueueFileName}</h2>
            <div class="stats">
              <span class="stat-item">
                <strong>Groups:</strong>
                {totalGroups}
              </span>
              <span class="stat-item">
                <strong>Total WOs:</strong>
                {totalWorkOrders}
              </span>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="main-actions">
            <Button size="lg" onclick={handleAddAnotherGroup}>Add Another Group</Button>
            <Button size="lg" variant="default" onclick={handleFinalize}>
              Finalize Queue File
            </Button>
            <Button variant="outline" onclick={handleReset}>Cancel & Reset</Button>
          </div>
        </Pane>

        <!-- Right Pane: Confirmed Groups Summary -->
        {#if groups.length > 0}
          <Pane>
            <div class="confirmed-groups-pane">
              <div class="table-header">
                <h3>Confirmed Groups</h3>
                <p class="table-subtitle">
                  {groups.length} group{groups.length !== 1 ? "s" : ""} confirmed
                </p>
              </div>
              <div class="confirmed-groups-content">
                {#each groups as group, idx (idx)}
                  <div class="group-summary">
                    <span class="group-number">Group {idx + 1}</span>
                    <span class="group-thickness">Thickness: {group.thickness}</span>
                    <span class="group-count">{group.workOrders.length} work orders</span>
                  </div>
                {/each}
              </div>
            </div>
          </Pane>
        {/if}
      </Splitpanes>
    </div>
  {/if}

  <!-- Complete State: Download -->
  {#if isComplete}
    <div class="state-card centered success">
      <div class="success-icon">✓</div>
      <h2>Queue File Ready!</h2>
      <p class="instruction">Your queue file has been generated successfully</p>

      <div class="file-info">
        <div class="file-item">
          <strong>Queue File:</strong>
          {queFile?.name}
        </div>
        <div class="file-item">
          <strong>DIF Files:</strong>
          {difFiles.length}
        </div>
        <div class="file-item">
          <strong>Total Groups:</strong>
          {totalGroups}
        </div>
        <div class="file-item">
          <strong>Total Work Orders:</strong>
          {totalWorkOrders}
        </div>
      </div>

      {#if emitErrors.length > 0}
        <div class="emit-errors">
          <h4>Warnings:</h4>
          {#each emitErrors as err, errIdx (errIdx)}
            <p>{err}</p>
          {/each}
        </div>
      {/if}

      <div class="main-actions">
        <Button size="lg" onclick={handleDownload}>Download Queue Files</Button>
        <Button variant="outline" onclick={handleReset}>Create Another Queue</Button>
      </div>
    </div>
  {/if}

  <!-- Thickness Adjustment Dialog -->
  <Dialog.Root bind:open={showThicknessDialog}>
    <Dialog.Content>
      <Dialog.Header>
        <Dialog.Title>Confirm Group Thickness</Dialog.Title>
        <Dialog.Description>
          Adjust the thickness for this group of {currentGroup.length} work order{currentGroup.length !==
          1
            ? "s"
            : ""}
        </Dialog.Description>
      </Dialog.Header>

      <div class="dialog-body">
        <label
          for="thickness-input"
          style="display: block; margin-bottom: 0.5rem; font-weight: 500;"
        >
          Thickness (mm)
        </label>
        <Input
          id="thickness-input"
          type="number"
          step="0.01"
          min="0"
          placeholder="Enter thickness"
          bind:value={adjustedThickness}
          onkeypress={(e) => e.key === "Enter" && handleThicknessConfirm()}
        />
      </div>

      <Dialog.Footer>
        <Button variant="outline" onclick={handleThicknessCancel}>Cancel</Button>
        <Button
          onclick={handleThicknessConfirm}
          disabled={!adjustedThickness || adjustedThickness <= 0}
        >
          Confirm Group
        </Button>
      </Dialog.Footer>
    </Dialog.Content>
  </Dialog.Root>
</div>
