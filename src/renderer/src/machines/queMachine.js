import { assign, setup, fromPromise, createActor } from "xstate";
import { getWorkOrderById, getWorkOrders } from "../api/workOrderApi.js";
import { createQueueBulk, getQueues } from "../api/queueApi.js";
import { makeWOStem } from "../utils/names.js";
import { formatDif } from "../utils/difSchema.js";

/**
 * Queue Machine
 * Manages the workflow for creating QUEUE files by scanning work orders
 * and grouping them by thickness
 *
 * States:
 * - idle: Initial state, no queue file created
 * - loadingWorkOrders: Preloading all work orders for local validation (after CREATE_QUEUE)
 * - scanning: Scanning work order barcodes to add to current thickness group
 * - validatingWorkOrder: Validating scanned barcode against preloaded work orders
 * - loadingWorkOrder: Fetching work order details from API (legacy/fallback)
 * - ready: Queue file active with groups, can add more groups or finalize
 * - finalizing: Generating final queue file with all groups
 * - savingToDatabase: Saving queue data to database
 * - complete: Queue file ready for download/save
 * - error: Error occurred during workflow
 *
 * Workflow:
 * 1. CREATE_QUEUE: idle -> loadingWorkOrders (preload all work orders)
 * 2. Success: loadingWorkOrders -> scanning (ready to scan barcodes)
 * 3. SCAN_BARCODE: scanning -> validatingWorkOrder (local validation)
 * 4. Success: validatingWorkOrder -> scanning (work order added to group)
 * 5. CONFIRM_GROUP: scanning -> ready (group confirmed)
 * 6. FINALIZE: ready -> finalizing -> savingToDatabase -> complete
 *
 * Events:
 * - CREATE_QUEUE: Start creating a new queue file (provide name)
 * - SCAN_BARCODE: Scan a work order barcode (provide woNumber)
 * - CONFIRM_GROUP: Confirm current thickness group and add to queue
 * - CONFIRM_GROUP_WITH_THICKNESS: Confirm group with custom thickness (provide thickness)
 * - CANCEL_GROUP: Cancel current group and return to scanning
 * - ADD_ANOTHER_GROUP: Start scanning for another thickness group
 * - FINALIZE: Generate final queue file and save to database
 * - RESET: Clear all data and return to idle
 * - RETRY: Retry after error
 */

/**
 * Check if work order already exists in any group
 */
function isWorkOrderDuplicate(groups, currentGroup, woNumber) {
  // Check in confirmed groups
  const inGroups = groups.some((group) => group.workOrders.some((wo) => wo.woNumber === woNumber));

  // Check in current group
  const inCurrentGroup = currentGroup.some((wo) => wo.woNumber === woNumber);

  return inGroups || inCurrentGroup;
}

export const queMachine = setup({
  actions: {
    setQueueName: assign({
      queueFileName: ({ event }) => {
        const raw = (event.name ?? "").trim();
        if (!raw) throw new Error("Queue file name is required");
        const withExt = raw.toUpperCase().endsWith(".QUE") ? raw : `${raw}.QUE`;
        return withExt;
      },
      error: null,
    }),

    setScannedBarcode: assign({
      scannedBarcode: ({ event }) => event.woNumber,
    }),

    addWorkOrderToCurrentGroup: assign({
      currentGroup: ({ context, event }) => {
        const workOrder = event.output;

        // Assign default thickness of 0.24 to all work orders
        const thickness = 0.24;

        return [...context.currentGroup, { ...workOrder, thickness }];
      },
      scannedBarcode: null,
      error: null,
    }),

    setBatchWorkOrders: assign({
      batchWorkOrders: ({ event }) => event.output.batchWorkOrders || [],
      currentBatchNo: ({ event }) => event.output.batchNo || null,
      // DO NOT add work order to currentGroup - grouping handled separately
      scannedBarcode: null,
      error: null,
    }),

    confirmCurrentGroup: assign({
      groups: ({ context }) => {
        if (context.currentGroup.length === 0) {
          throw new Error("Cannot confirm empty group");
        }

        const thickness = context.currentGroup[0].thickness;
        const group = {
          thickness,
          workOrders: [...context.currentGroup],
          confirmedAt: new Date().toISOString(),
        };

        return [...context.groups, group];
      },
      assignedWorkOrders: ({ context }) => [
        ...context.assignedWorkOrders,
        ...context.currentGroup.map((wo) => wo.woNumber),
      ],
      currentGroup: () => [],
      // Keep batchWorkOrders and currentBatchNo - don't clear them!
      error: null,
    }),

    confirmCurrentGroupWithThickness: assign({
      groups: ({ context, event }) => {
        if (context.currentGroup.length === 0) {
          throw new Error("Cannot confirm empty group");
        }

        const thickness = Number(event.thickness);

        // Update all work orders with the confirmed thickness
        const updatedWorkOrders = context.currentGroup.map((wo) => ({
          ...wo,
          thickness,
        }));

        const group = {
          thickness,
          workOrders: updatedWorkOrders,
          confirmedAt: new Date().toISOString(),
        };

        return [...context.groups, group];
      },
      assignedWorkOrders: ({ context }) => [
        ...context.assignedWorkOrders,
        ...context.currentGroup.map((wo) => wo.woNumber),
      ],
      currentGroup: () => [],
      // Keep batchWorkOrders and currentBatchNo - don't clear them!
      error: null,
    }),

    cancelCurrentGroup: assign({
      currentGroup: () => [],
      error: null,
    }),

    setFinalQueueFile: assign({
      queFile: ({ event }) => event.output.queFile,
      difFiles: ({ event }) => event.output.difFiles,
      emitErrors: ({ event }) => event.output.errors ?? [],
      dbPayload: ({ event }) => event.output.dbPayload,
      error: null,
    }),

    setSavedQueueId: assign({
      savedQueueId: ({ event }) => event.output?.id || event.output?.queueId || null,
    }),

    setError: assign({
      error: ({ event }) => event.error?.message ?? String(event.error || "Unknown error"),
    }),

    clearError: assign({
      error: null,
    }),

    buildWorkOrderLookup: assign({
      workOrdersById: ({ event }) => {
        const workOrders = event.output;
        const lookup = {};

        if (Array.isArray(workOrders)) {
          workOrders.forEach((wo) => {
            if (wo?.woNumber) {
              lookup[wo.woNumber] = wo;
            }
          });
        }

        return lookup;
      },
      workOrdersLoadedAt: () => new Date().toISOString(),
      error: null,
    }),

    setQueues: assign({
      queues: ({ event }) => {
        const response = event.output;
        // Handle axios response wrapper
        let queues = response?.data || response;

        // Check if data is nested (response.data.data)
        if (queues?.data && Array.isArray(queues.data)) {
          queues = queues.data;
        }

        return Array.isArray(queues) ? queues : [];
      },
      error: null,
    }),

    clearAll: assign({
      queueFileName: "",
      groups: () => [],
      currentGroup: () => [],
      scannedBarcode: null,
      queFile: null,
      difFiles: () => [],
      emitErrors: () => [],
      dbPayload: null,
      savedQueueId: null,
      error: null,
      workOrdersById: () => ({}),
      workOrdersLoadedAt: null,
      batchWorkOrders: () => [],
      currentBatchNo: null,
      assignedWorkOrders: () => [],
      groupingMode: false,
    }),
  },

  actors: {
    // Fetch all queues from the database
    fetchQueues: fromPromise(async () => {
      try {
        const response = await getQueues();
        console.log("fetchQueues response =>", response);
        return response;
      } catch (error) {
        console.error("Error fetching queues:", error);
        throw new Error(error.response?.data?.message || error.message || "Failed to fetch queues");
      }
    }),

    // Preload all work orders for local validation
    preloadWorkOrders: fromPromise(async () => {
      try {
        const response = await getWorkOrders();
        console.log("response =>", response);

        // Handle different response formats
        // Axios wraps response in { data: ... }
        let workOrders = response?.data || response;

        // Check if data is nested (response.data.data)
        if (workOrders?.data && Array.isArray(workOrders.data)) {
          workOrders = workOrders.data;
        }

        if (!Array.isArray(workOrders)) {
          throw new Error("Invalid work orders response format - expected array");
        }

        return workOrders;
      } catch (error) {
        console.error("Error preloading work orders:", error);
        throw new Error(
          error.response?.data?.message || error.message || "Failed to preload work orders",
        );
      }
    }),

    // Validate work order using preloaded data
    validateWorkOrder: fromPromise(async ({ input }) => {
      const { woNumber, workOrdersById, groups, currentGroup } = input;
      console.log("validateWorkOrder => input", input);

      if (!woNumber || typeof woNumber !== "string") {
        throw new Error("Invalid work order number");
      }

      // Check for duplicates before looking up
      if (isWorkOrderDuplicate(groups, currentGroup, woNumber)) {
        throw new Error(`Work order ${woNumber} is already in the queue`);
      }

      // Lookup from preloaded map
      const workOrder = workOrdersById[woNumber];

      if (!workOrder) {
        throw new Error(`Work order ${woNumber} not found`);
      }

      // Get the batch number from the found work order
      const batchNo = workOrder.batchNo;

      // Filter all work orders with the same batch number
      const batchWorkOrders = Object.values(workOrdersById).filter(
        (wo) => wo.batchNo && wo.batchNo === batchNo
      );

      console.log(`Found ${batchWorkOrders.length} work orders in batch ${batchNo}`);

      return {
        workOrder,
        batchNo,
        batchWorkOrders,
      };
    }),

    // Fetch work order by barcode/woNumber (kept for backward compatibility)
    fetchWorkOrder: fromPromise(async ({ input }) => {
      const { woNumber } = input;

      if (!woNumber || typeof woNumber !== "string") {
        throw new Error("Invalid work order number");
      }

      try {
        const response = await getWorkOrderById(woNumber);

        if (!response || !response.data) {
          throw new Error(`Work order ${woNumber} not found`);
        }

        return response.data;
      } catch (error) {
        console.error("Error fetching work order:", error);
        throw new Error(
          error.response?.data?.message ||
            error.message ||
            `Failed to fetch work order ${woNumber}`,
        );
      }
    }),

    // Generate final queue and DIF files
    generateQueueFile: fromPromise(async ({ input }) => {
      const { groups, queueFileName } = input;

      if (!groups || groups.length === 0) {
        throw new Error("No groups to generate queue file");
      }

      const errors = [];
      const queLines = [];
      const difFiles = [];
      const EOL = "\r\n";

      let position = 1;

      // Prepare database payload
      const dbPayload = {
        name: queueFileName || "queue.QUE",
        status: "idle",
        groups: [],
      };

      // Process each group
      groups.forEach((group, groupIdx) => {
        // Use the group's thickness for all work orders in this group
        const groupThickness = group.thickness;
        if (!Number.isFinite(groupThickness)) {
          errors.push(`Group ${groupIdx + 1}: missing thickness — skipped`);
          return;
        }

        const dbGroup = {
          thickness: groupThickness,
          groupOrder: groupIdx,
          workOrders: [],
        };

        group.workOrders.forEach((wo, woIdx) => {
          if (!wo?.woNumber) {
            errors.push(`Group ${groupIdx + 1}, WO ${woIdx + 1}: missing woNumber — skipped`);
            return;
          }

          const stem = makeWOStem(wo.woNumber, wo.no);
          const difName = `${stem}.DIF`;

          // Generate DIF file
          const mtnum = wo.mtnum != null ? Number(wo.mtnum) : undefined;
          const ctnum = wo.ctnum != null ? Number(wo.ctnum) : position;
          const difText = formatDif(wo, { mtnum, ctnum });
          difFiles.push({ name: difName, text: difText });

          // Add line to queue file using the group's thickness
          queLines.push(`"${difName}" ${difName} ${position} ${groupThickness}`);

          // Add work order to DB payload
          dbGroup.workOrders.push({
            woNumber: wo.woNumber,
            position: position,
            orderInGroup: woIdx,
          });

          position++;
        });

        // Add group to DB payload if it has work orders
        if (dbGroup.workOrders.length > 0) {
          dbPayload.groups.push(dbGroup);
        }
      });

      const queText = ["queue file", ...queLines].join(EOL) + EOL;
      console.log("generateQueueFile =>", {
        queFile: { name: queueFileName || "queue.QUE", text: queText },
        difFiles,
        errors,
        dbPayload,
      });

      return {
        queFile: { name: queueFileName || "queue.QUE", text: queText },
        difFiles,
        errors,
        dbPayload,
      };
    }),

    // Save queue to database
    saveQueueToDatabase: fromPromise(async ({ input }) => {
      const { dbPayload } = input;

      if (!dbPayload) {
        throw new Error("No queue data to save");
      }

      try {
        const response = await createQueueBulk(dbPayload);
        console.log("Queue saved to database:", response);
        return response.data || response;
      } catch (error) {
        console.error("Error saving queue to database:", error);
        throw new Error(
          error.response?.data?.message || error.message || "Failed to save queue to database",
        );
      }
    }),
  },
}).createMachine({
  id: "queue",
  initial: "loadingQueues",
  context: {
    queueFileName: "",
    groups: [], // Confirmed groups: [{ thickness, workOrders, confirmedAt }]
    currentGroup: [], // Current group being built: [{ ...workOrder, thickness }]
    scannedBarcode: null,
    queFile: null,
    difFiles: [],
    emitErrors: [],
    dbPayload: null, // Database-ready payload for saving queue
    savedQueueId: null, // ID of the saved queue in database
    error: null,
    workOrdersById: {}, // Fast lookup map: { [woNumber]: workOrder }
    workOrdersLoadedAt: null, // Timestamp when work orders were preloaded
    queues: [], // List of existing queues from database
    batchWorkOrders: [], // All work orders in the current batch
    currentBatchNo: null, // The batch number being processed
    assignedWorkOrders: [], // Track which work orders are assigned to groups (woNumbers)
    groupingMode: false, // Whether user is in grouping mode
  },
  states: {
    // Loading existing queues from database
    loadingQueues: {
      invoke: {
        src: "fetchQueues",
        onDone: {
          target: "idle",
          actions: "setQueues",
        },
        onError: {
          target: "idle",
          actions: "setError",
        },
      },
    },

    idle: {
      on: {
        CREATE_QUEUE: {
          target: "loadingWorkOrders",
          actions: "setQueueName",
        },
        REFRESH_QUEUES: {
          target: "loadingQueues",
        },
      },
    },

    // Loading all work orders for local validation
    loadingWorkOrders: {
      invoke: {
        src: "preloadWorkOrders",
        onDone: {
          target: "scanning",
          actions: "buildWorkOrderLookup",
        },
        onError: {
          target: "error",
          actions: "setError",
        },
      },
    },

    // Scanning work order barcodes
    scanning: {
      on: {
        SCAN_BARCODE: {
          target: "validatingWorkOrder",
          actions: "setScannedBarcode",
        },
        ADD_WORK_ORDERS_TO_GROUP: {
          actions: assign({
            currentGroup: ({ context, event }) => [...context.currentGroup, ...event.workOrders],
          }),
        },
        CONFIRM_GROUP: {
          target: "ready",
          actions: "confirmCurrentGroup",
          guard: ({ context }) => context.currentGroup.length > 0,
        },
        CONFIRM_GROUP_WITH_THICKNESS: {
          target: "ready",
          actions: "confirmCurrentGroupWithThickness",
          guard: ({ context }) => context.currentGroup.length > 0,
        },
        CANCEL_GROUP: {
          target: "scanning",
          actions: "cancelCurrentGroup",
        },
        RESET: {
          target: "idle",
          actions: "clearAll",
        },
      },
    },

    // Validating work order using preloaded data
    validatingWorkOrder: {
      invoke: {
        src: "validateWorkOrder",
        input: ({ context }) => ({
          woNumber: context.scannedBarcode,
          workOrdersById: context.workOrdersById,
          groups: context.groups,
          currentGroup: context.currentGroup,
        }),
        onDone: {
          target: "scanning",
          actions: "setBatchWorkOrders",
        },
        onError: {
          target: "scanning",
          actions: "setError",
        },
      },
    },

    // Loading work order details from API
    loadingWorkOrder: {
      invoke: {
        src: "fetchWorkOrder",
        input: ({ context }) => ({ woNumber: context.scannedBarcode }),
        onDone: {
          target: "scanning",
          actions: "addWorkOrderToCurrentGroup",
        },
        onError: {
          target: "scanning",
          actions: "setError",
        },
      },
    },

    // Queue file ready with confirmed groups
    ready: {
      on: {
        ADD_ANOTHER_GROUP: {
          target: "scanning",
          actions: "clearError",
        },
        FINALIZE: {
          target: "finalizing",
          actions: "clearError",
        },
        RESET: {
          target: "idle",
          actions: "clearAll",
        },
      },
    },

    // Generating final queue file
    finalizing: {
      invoke: {
        src: "generateQueueFile",
        input: ({ context }) => ({
          groups: context.groups,
          queueFileName: context.queueFileName,
        }),
        onDone: {
          target: "savingToDatabase",
          actions: "setFinalQueueFile",
        },
        onError: {
          target: "error",
          actions: "setError",
        },
      },
    },

    // Saving queue to database
    savingToDatabase: {
      invoke: {
        src: "saveQueueToDatabase",
        input: ({ context }) => ({
          dbPayload: context.dbPayload,
        }),
        onDone: {
          target: "complete",
          actions: "setSavedQueueId",
        },
        onError: {
          target: "complete",
          actions: "setError",
        },
      },
    },

    // Queue file complete and ready for download
    complete: {
      on: {
        RESET: {
          target: "loadingQueues",
          actions: "clearAll",
        },
      },
    },

    // Error state
    error: {
      on: {
        RETRY: {
          target: "scanning",
          actions: "clearError",
        },
        RESET: {
          target: "idle",
          actions: "clearAll",
        },
      },
    },
  },
});

// Create and export the actor
export const actor = createActor(queMachine);
