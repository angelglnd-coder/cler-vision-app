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
  import { ChevronRight, ChevronDown } from "@lucide/svelte";

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
  let expandedQueueIds = $state(new Set());
  let expandedGroupIds = $state(new Set());

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

  function toggleQueueExpansion(queueId) {
    const newSet = new Set(expandedQueueIds);
    if (newSet.has(queueId)) {
      newSet.delete(queueId);
      // Clear all expanded groups for this queue
      const groupsToRemove = Array.from(expandedGroupIds).filter((id) => id.startsWith(queueId));
      groupsToRemove.forEach((id) => expandedGroupIds.delete(id));
    } else {
      newSet.add(queueId);
    }
    expandedQueueIds = newSet;
  }

  function toggleGroupExpansion(queueId, groupId) {
    const fullId = `${queueId}-${groupId}`;
    const newSet = new Set(expandedGroupIds);
    if (newSet.has(fullId)) {
      newSet.delete(fullId);
    } else {
      newSet.add(fullId);
    }
    expandedGroupIds = newSet;
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
    overflow-x: auto;
    overflow-y: auto;
  }

  .wo-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
  }

  .wo-table thead {
    position: sticky;
    top: 0;
    background-color: #f9fafb;
    z-index: 1;
  }

  .wo-table th {
    padding: 0.75rem 1rem;
    text-align: left;
    font-weight: 600;
    font-size: 0.8rem;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.025em;
    border-bottom: 2px solid #e5e7eb;
    white-space: nowrap;
  }

  .wo-table th:nth-child(1) { width: 60px; } /* Pos */
  .wo-table th:nth-child(2) { width: 80px; } /* Order */
  .wo-table th:nth-child(3) { width: 220px; } /* Work Order */
  .wo-table th:nth-child(4) { min-width: 200px; } /* Patient */
  .wo-table th:nth-child(5) { min-width: 150px; } /* PO */
  .wo-table th:nth-child(6) { min-width: 200px; } /* Spec */
  .wo-table th:nth-child(7) { min-width: 120px; } /* Color */
  .wo-table th:nth-child(8) { min-width: 120px; } /* Design */

  .wo-table tbody tr {
    border-bottom: 1px solid #f3f4f6;
    transition: background-color 0.1s;
  }

  .wo-table tbody tr:hover {
    background-color: #f9fafb;
  }

  .wo-table tbody tr:last-child {
    border-bottom: none;
  }

  .wo-table td {
    padding: 0.75rem 1rem;
    color: #1f2937;
    white-space: nowrap;
  }

  .wo-table td.wo-number {
    font-weight: 500;
    color: #1e40af;
  }

  .wo-table td.wo-position {
    text-align: center;
    font-weight: 600;
  }

  .wo-table td.wo-order {
    text-align: center;
  }

  .loading-state {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 3rem;
    color: #6b7280;
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
          <div class="queue-list">
            {#each queues as queue (queue._id)}
              <div class="queue-item">
                <!-- Queue Row -->
                <div class="queue-row" onclick={() => toggleQueueExpansion(queue._id)}>
                  <div class="queue-row-icon">
                    {#if expandedQueueIds.has(queue._id)}
                      <ChevronDown size={20} />
                    {:else}
                      <ChevronRight size={20} />
                    {/if}
                  </div>
                  <div class="queue-row-content">
                    <div class="queue-name">{queue.name}</div>
                    <div>
                      <span class="queue-status {queue.status}">{queue.status}</span>
                    </div>
                    <div class="queue-info-item">{queue.groups?.length || 0} Groups</div>
                    <div class="queue-info-item">
                      {queue.groups?.reduce((sum, g) => sum + (g.workOrders?.length || 0), 0) || 0} WOs
                    </div>
                    <div class="queue-date">Created: {formatDate(queue.createdAt)}</div>
                  </div>
                </div>

                <!-- Expanded Groups -->
                {#if expandedQueueIds.has(queue._id) && queue.groups && queue.groups.length > 0}
                  <div class="group-list">
                    {#each queue.groups as group, groupIdx (group._id)}
                      <div class="group-item">
                        <!-- Group Row -->
                        <div
                          class="group-row"
                          onclick={() => toggleGroupExpansion(queue._id, group._id)}
                        >
                          <div class="group-row-icon">
                            {#if expandedGroupIds.has(`${queue._id}-${group._id}`)}
                              <ChevronDown size={16} />
                            {:else}
                              <ChevronRight size={16} />
                            {/if}
                          </div>
                          <div class="group-row-content">
                            <span class="group-label">Group {groupIdx + 1}</span>
                            <span class="group-thickness">
                              Thickness: {formatThickness(group.thickness)} mm
                            </span>
                            <span class="group-wo-count">
                              {group.workOrders?.length || 0} work orders
                            </span>
                          </div>
                        </div>

                        <!-- Expanded Work Orders -->
                        {#if expandedGroupIds.has(`${queue._id}-${group._id}`) && group.workOrders && group.workOrders.length > 0}
                          <div class="work-order-list">
                            <table class="wo-table">
                              <thead>
                                <tr>
                                  <th>Pos</th>
                                  <th>Order</th>
                                  <th>Work Order</th>
                                  <th>Patient</th>
                                  <th>PO</th>
                                  <th>Spec</th>
                                  <th>Color</th>
                                  <th>Design</th>
                                </tr>
                              </thead>
                              <tbody>
                                {#each group.workOrders as woItem (woItem._id)}
                                  {@const wo = woItem.workOrder}
                                  <tr>
                                    <td class="wo-position">{woItem.position}</td>
                                    <td class="wo-order">{wo?.no || woItem.orderInGroup}</td>
                                    <td class="wo-number">{woItem.woNumber || wo?.woNumber || "N/A"}</td>
                                    <td>{wo?.patientName || "N/A"}</td>
                                    <td>{wo?.po || "N/A"}</td>
                                    <td>{wo?.spec || "N/A"}</td>
                                    <td>{wo?.color || "N/A"}</td>
                                    <td>{wo?.design || "N/A"}</td>
                                  </tr>
                                {/each}
                              </tbody>
                            </table>
                          </div>
                        {/if}
                      </div>
                    {/each}
                  </div>
                {/if}
              </div>
            {/each}
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
