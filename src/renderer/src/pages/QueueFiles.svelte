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
  import { getQueueById } from "../api/queueApi.js";
  import { generateQueueFiles } from "../utils/generateQueueFiles.js";

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
  let isDownloading = $state(false);
  let downloadQueueId = $state(null);

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
  let batchWorkOrders = $derived(state.context.batchWorkOrders || []);
  let currentBatchNo = $derived(state.context.currentBatchNo);
  let assignedWorkOrders = $derived(state.context.assignedWorkOrders || []);
  let groupingMode = $derived(state.context.groupingMode || false);

  // Local state for grouping interface
  let groupThickness = $state(0.24);
  let numberOfRows = $state(1);

  // Computed values for grouping
  let availableWorkOrders = $derived(
    batchWorkOrders.filter((wo) => !assignedWorkOrders.includes(wo.woNumber)),
  );
  let assignedCount = $derived(assignedWorkOrders.length);
  let totalBatchCount = $derived(batchWorkOrders.length);
  let allAssigned = $derived(assignedCount >= totalBatchCount && totalBatchCount > 0);

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
        print: isDownloading && downloadQueueId === queue._id
          ? "🖨️ ⏳"
          : "🖨️ ⬇️", // Print and Download icons (or loading state)
        status: queue.status,
        info: `${queue.groups?.length || 0} Groups, ${queue.groups?.reduce((sum, g) => sum + (g.workOrders?.length || 0), 0) || 0} WOs`,
        created: formatDate(queue.createdAt),
        queueId: queue._id, // Store queue ID for print functionality
      };

      // Add nested groups if they exist
      if (queue.groups && queue.groups.length > 0) {
        queueRow.open = false; // Start collapsed
        queueRow.data = queue.groups.map((group, groupIdx) => {
          // Create group row with all properties
          const groupRow = {
            id: `${queue._id}-${group._id}`,
            name: `Group ${groupIdx + 1} (${formatThickness(group.thickness)} mm)`,
            print: "", // Empty for group rows
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
                print: "", // Empty for work order rows
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

  // same safeKey you already use elsewhere
  const safeKey = (col) => col.replace(/[^\w$]/g, "_");

  // define desired sticky headers in human form
  const PIN_LEFT_RAW = ["name", "print"];

  // …then normalize to the actual column ids
  const PIN_LEFT = new Set(PIN_LEFT_RAW.map(safeKey));
  console.log("Pinned fields:", [...PIN_LEFT]);

  // Tree grid columns following the official example pattern
  const treeColumns = [
    {
      id: "name",
      header: "Queue / Group / Work Order",
      flexgrow: 1,
      treetoggle: true,
      pinned: PIN_LEFT.has("name") ? "left" : undefined,
    },
    {
      id: "print",
      header: "Actions",
      width: 100,
      align: "center",
      pinned: PIN_LEFT.has("print") ? "left" : undefined,
    },
    {
      id: "status",
      header: "Status / Patient",
      width: 200,
      pinned: PIN_LEFT.has("status") ? "left" : undefined,
    },
    {
      id: "info",
      header: "Info / PO & Spec",
      width: 250,
      pinned: PIN_LEFT.has("info") ? "left" : undefined,
    },
    {
      id: "created",
      header: "Created / Color & Design",
      width: 250,
      pinned: PIN_LEFT.has("created") ? "left" : undefined,
    },
  ];

  // Responsive configuration to help with animation issues
  const responsive = {
    "800": {
      columns: treeColumns,
    },
  };

  let isPrinting = $state(false);
  let printQueueId = $state(null);

  let treeData = $derived(getTreeData(queues));

  let api = $state();

  onMount(() => {
    actor.start();
    actor.subscribe((newState) => {
      state = newState;
    });

    // Add event listener for grid cell clicks to detect print and download actions
    document.addEventListener("click", (e) => {
      // Check if click is on the print/actions column cell
      const cell = e.target.closest(".wx-cell");
      if (cell && cell.getAttribute("data-col-id") === "print") {
        // Prevent action if already downloading
        if (isDownloading) {
          e.preventDefault();
          return;
        }

        const cellText = cell.textContent?.trim();
        const row = e.target.closest(".wx-row");

        if (row) {
          const rowId = row.getAttribute("data-id");

          // Check if cell contains icons (not empty like group/wo rows)
          if (cellText && (cellText.includes("🖨️") || cellText.includes("⬇️"))) {
            // Get click position to determine which icon was clicked
            const cellRect = cell.getBoundingClientRect();
            const clickX = e.clientX - cellRect.left;
            const cellWidth = cellRect.width;

            // If clicked on left half, it's print; if right half, it's download
            if (clickX < cellWidth / 2) {
              handlePrintQueue(rowId);
            } else {
              handleDownloadQueue(rowId);
            }
          }
        }
      }
    });

    // Debug: Log grid container dimensions after mount
    // setTimeout(() => {
    //   const gridContainer = document.querySelector('.grid-container');
    //   const willow = document.querySelector('.wx-willow');
    //   const grid = document.querySelector('.wx-grid');
    //   const scroll = document.querySelector('.wx-scroll');
    //   console.log('Grid container dimensions:', {
    //     container: gridContainer?.getBoundingClientRect(),
    //     willow: willow?.getBoundingClientRect(),
    //     grid: grid?.getBoundingClientRect(),
    //     scroll: scroll?.getBoundingClientRect(),
    //   });
    // }, 1000);
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

  function handlePrintQueue(queueId) {
    // Set the queue ID to print
    printQueueId = queueId;
    isPrinting = true;

    // Wait for content to render, then print
    setTimeout(() => {
      window.print();

      // Restore original state after printing
      setTimeout(() => {
        isPrinting = false;
        printQueueId = null;
      }, 500);
    }, 300);
  }

  async function handleDownloadQueue(queueId) {
    try {
      isDownloading = true;
      downloadQueueId = queueId;

      // Fetch full queue data from backend
      const response = await getQueueById(queueId);
      let queue = response?.data || response;

      // Handle nested data structure
      if (queue?.data) {
        queue = queue.data;
      }

      if (!queue || !queue._id) {
        throw new Error("Invalid queue data received from server");
      }

      // Generate files using utility
      const { queFile, difFiles, errors } = generateQueueFiles(queue);

      // Log warnings if any
      if (errors.length > 0) {
        console.warn("File generation warnings:", errors);
      }

      // Check if any files were generated
      if (difFiles.length === 0) {
        throw new Error("No files could be generated. Check queue data.");
      }

      // Download as ZIP
      const zipName = queFile.name.replace(".QUE", ".zip");
      await downloadAsZip(queFile, difFiles, zipName);

      console.log(`Downloaded ${difFiles.length} DIF files + 1 QUE file`);

    } catch (error) {
      console.error("Error downloading queue files:", error);

      // User-friendly error messages
      let errorMessage = "Failed to download queue files";
      if (error.code === "ECONNABORTED") {
        errorMessage = "Request timeout. Please try again.";
      } else if (error.response?.status === 404) {
        errorMessage = "Queue not found in database.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      alert(errorMessage);

    } finally {
      isDownloading = false;
      downloadQueueId = null;
    }
  }

  // Get the queue data for printing
  let printQueueData = $derived.by(() => {
    if (!isPrinting || !printQueueId) return null;

    const queue = queues.find((q) => q._id === printQueueId);
    if (!queue) return null;

    return queue;
  });
</script>

<style>
  .queue-container {
    padding: 2rem;
    width: 100%;
    max-width: none;
    height: 100vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .queue-header {
    margin-bottom: 2rem;
    flex-shrink: 0;
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
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
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
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  .queue-list-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    flex-shrink: 0;
  }

  .queue-list-header h2 {
    font-size: 1.5rem;
    font-weight: 600;
  }

  /* Grid container for proper scrolling */
  .grid-container {
    flex: 1;
    min-height: 0;
    height: 0; /* Force flex item to respect container height */
    overflow: hidden !important;
    width: 1000px;
  }

  /* Make Willow fill the container */
  .grid-container :global(.wx-willow) {
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden !important;
  }

  /* Grid should fill Willow */
  .grid-container :global(.wx-grid) {
    height: 100% !important;
    display: flex !important;
    flex-direction: column !important;
    overflow: hidden !important;
  }

  /* The scroll container inside Grid - this is where scrolling happens */
  .grid-container :global(.wx-scroll) {
    flex: 1 !important;
    overflow: auto !important;
    min-height: 0 !important;
  }

  /* Prevent scrolling on any other nested divs */
  .grid-container :global(.wx-grid > div:not(.wx-scroll)) {
    overflow: visible !important;
  }

  /* Target all possible scroll containers and force only the right one */
  .grid-container :global(*) {
    overflow: visible !important;
  }

  .grid-container :global(.wx-scroll) {
    overflow: auto !important;
  }

  /* Tree grid specific styles */
  .grid-container :global(.wx-data-tree) {
    overflow: auto !important;
    flex: 1 !important;
    min-height: 0 !important;
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

  /* Style for print column */
  :global(.wx-grid .wx-cell[data-col-id="print"]) {
    cursor: pointer;
    font-size: 1.2rem;
    text-align: center;
  }

  :global(.wx-grid .wx-cell[data-col-id="print"]:hover) {
    background-color: #f0f9ff;
    transform: scale(1.1);
  }

  /* Add transition for print icon hover */
  :global(.wx-grid .wx-cell[data-col-id="print"]) {
    transition:
      background-color 0.15s,
      transform 0.15s !important;
  }

  /* Hide print area on screen */
  .print-area {
    display: none;
  }

  /* Print-specific styles */
  @media print {
    /* Hide everything by default */
    * {
      visibility: hidden;
    }

    /* Show only print area */
    .print-area,
    .print-area * {
      visibility: visible !important;
    }

    /* Hide the grid completely */
    .queue-list-container,
    .queue-list-header,
    .state-card {
      display: none !important;
    }

    body {
      margin: 0 !important;
      padding: 0 !important;
    }

    .queue-container {
      position: absolute;
      left: 0;
      top: 0;
      width: 100%;
      padding: 0 !important;
    }

    /* Style the print area */
    .print-area {
      display: block !important;
      position: absolute;
      left: 0;
      top: 0;
      width: 100%;
      padding: 1cm;
      background: white;
    }

    .print-area h1 {
      font-size: 18pt;
      margin-bottom: 0.5cm;
      color: black;
    }

    .print-area h2 {
      font-size: 14pt;
      margin-top: 0.5cm;
      margin-bottom: 0.3cm;
      color: black;
      border-bottom: 2px solid #333;
      padding-bottom: 0.2cm;
    }

    .print-area p {
      margin: 0.2cm 0;
      font-size: 10pt;
      color: black;
    }

    .print-group {
      margin-bottom: 1cm;
      page-break-inside: avoid;
    }

    .print-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 0.3cm;
      font-size: 9pt;
    }

    .print-table th,
    .print-table td {
      border: 1px solid #333;
      padding: 0.2cm;
      text-align: left;
      color: black;
    }

    .print-table th {
      background-color: #e5e5e5;
      font-weight: bold;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .print-table tr {
      page-break-inside: avoid;
    }
  }

  /* Actions column (print/download) styling */
  :global(.wx-grid .wx-cell[data-col-id="print"]) {
    cursor: pointer;
    font-size: 1.2rem;
    user-select: none;
  }

  :global(.wx-grid .wx-cell[data-col-id="print"]:hover) {
    background-color: rgba(59, 130, 246, 0.1);
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
          <div class="grid-container">
            <Willow>
              <Grid
                bind:this={api}
                tree={true}
                data={treeData}
                columns={treeColumns}
                autoHeight={false}
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

  <!-- Print Area - Only visible when printing -->
  {#if printQueueData}
    <div class="print-area">
      <h1>Queue File: {printQueueData.name}</h1>
      <p>Created: {formatDate(printQueueData.createdAt)}</p>
      <p>Status: {printQueueData.status}</p>
      <p>Total Groups: {printQueueData.groups?.length || 0}</p>
      <p>
        Total Work Orders: {printQueueData.groups?.reduce(
          (sum, g) => sum + (g.workOrders?.length || 0),
          0,
        ) || 0}
      </p>

      {#if printQueueData.groups && printQueueData.groups.length > 0}
        {@const allWorkOrders = printQueueData.groups.flatMap((group) =>
          (group.workOrders || []).map((woItem) => ({
            ...woItem,
            thickness: group.thickness,
          })),
        )}
        <table class="print-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Thickness</th>
              <th>WO Number</th>
              <th>Patient Name</th>
              <th>PO</th>
              <th>Spec</th>
              <th>Color</th>
              <th>Design</th>
            </tr>
          </thead>
          <tbody>
            {#each allWorkOrders as woItem, index (woItem._id)}
              {@const wo = woItem.workOrder || {}}
              <tr>
                <td>{index + 1}</td>
                <td>{formatThickness(woItem.thickness)} mm</td>
                <td>{woItem.woNumber || wo.woNumber || "N/A"}</td>
                <td>{wo.patientName || "N/A"}</td>
                <td>{wo.po || "N/A"}</td>
                <td>{wo.spec || "N/A"}</td>
                <td>{wo.color || "N/A"}</td>
                <td>{wo.design || "N/A"}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      {/if}
    </div>
  {/if}
</div>
