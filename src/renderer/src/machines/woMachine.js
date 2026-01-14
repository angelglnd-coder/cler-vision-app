import { assign, setup, fromPromise, createActor } from "xstate";
import { getWorkOrders, getWorkOrderById, getWorkOrdersFiltered } from "../api/workOrderApi.js";
import { WO_COLUMNS, COLUMN_DISPLAY_NAMES } from "../utils/woColumns.js";

/**
 * Work Order Machine
 * Manages the workflow for displaying work orders from the database via API
 *
 * States:
 * - idle: Initial state, no data loaded
 * - loading: Fetching work orders from API
 * - loadingOne: Fetching a single work order by ID
 * - ready: Work orders successfully loaded
 * - refreshing: Reloading work orders while maintaining current state
 * - error: Error occurred during API call
 *
 * Events:
 * - LOAD: Trigger loading all work orders
 * - LOAD_ONE: Load a specific work order by ID
 * - LOAD_FILTERED: Load work orders with filters
 * - REFRESH: Reload current work orders
 * - RESET: Clear all data and return to idle
 * - RETRY: Retry after error
 */

// Define numeric fields for proper alignment in UI
const NUMERIC_FIELDS = new Set([
  "diam",
  "cylValue",
  "edgeThick",
  "centerThick",
  "eValue",
  "blankThickness",
  "bc1",
  "bc2",
  "pw1",
  "pw2",
  "oz1",
  "oz2",
  "rc1Radius",
  "ac1Radius",
  "ac2Radius",
  "ac3Radius",
  "rc1Tor",
  "ac1Tor",
  "ac2Tor",
  "ac3Tor",
  "rc1Width",
  "ac1Width",
  "ac2Width",
  "ac3Width",
  "pc1Radius",
  "pc2Radius",
  "pcwidth",
]);

/**
 * Generate Tabulator column definitions
 * @returns {Array} Tabulator column configuration
 */
function makeColumns() {
  return WO_COLUMNS.map((col) => ({
    title: COLUMN_DISPLAY_NAMES[col] || col,
    field: col,
    headerFilter: "input",
    headerSort: true,
    hozAlign: NUMERIC_FIELDS.has(col) ? "right" : "left",
    frozen: ["woNumber"].includes(col),
  }));
}

/**
 * Format date to YYYY/MM/DD
 * @param {string|Date} date - Date to format
 * @returns {string|null} Formatted date or null
 */
function formatDate(date) {
  if (!date) return null;
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return null;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}/${month}/${day}`;
  } catch {
    return null;
  }
}

/**
 * Extract numeric value from WO Number for sorting
 * @param {string} woNumber - WO Number (e.g., "003-000237 0")
 * @returns {number} Numeric value for comparison
 */
function parseWoNumber(woNumber) {
  if (!woNumber) return 0;
  // Extract the numeric portion from format like "003-000237 0"
  const match = String(woNumber).match(/(\d+)-(\d+)/);
  if (match) {
    // Combine prefix and sequential number for sorting
    // e.g., "003-000237" -> 3000237
    return parseInt(match[1]) * 1000000 + parseInt(match[2]);
  }
  return 0;
}

/**
 * Normalize work order data to ensure consistent structure
 * @param {Array} workOrders - Raw work orders from API
 * @returns {Array} Normalized and sorted work orders
 */
function normalizeWorkOrders(workOrders) {
  if (!Array.isArray(workOrders)) return [];

  const normalized = workOrders.map((wo) => {
    const normalizedWo = {};
    for (const col of WO_COLUMNS) {
      let value = wo[col] ?? null;
      // Convert numeric fields to numbers
      if (value !== null && NUMERIC_FIELDS.has(col)) {
        const num = Number(value);
        value = Number.isFinite(num) ? num : null;
      }
      // Format date fields
      if (col === "poDate" && value !== null) {
        value = formatDate(value);
      }
      normalizedWo[col] = value;
    }
    return normalizedWo;
  });

  // Sort by Batch No (descending) then WO Number (descending)
  return normalized.sort((a, b) => {
    // Primary sort: Batch No (descending - latest batches first)
    const batchA = Number(a.batchNo) || 0;
    const batchB = Number(b.batchNo) || 0;
    if (batchA !== batchB) {
      return batchB - batchA; // Descending order
    }

    // Secondary sort: WO Number (descending - latest WO numbers first)
    const woA = parseWoNumber(a.woNumber);
    const woB = parseWoNumber(b.woNumber);
    return woB - woA; // Descending order
  });
}

export const woMachine = setup({
  actions: {
    setWorkOrders: assign({
      workOrders: ({ event }) => event.output.data ?? [],
      columns: ({ event }) => event.output.columns ?? [],
      total: ({ event }) => event.output.total ?? 0,
      error: null,
    }),
    setSingleWorkOrder: assign({
      selectedWorkOrder: ({ event }) => event.output,
      error: null,
    }),
    setError: assign({
      error: ({ event }) => event.error?.message ?? String(event.error || "Unknown error"),
    }),
    clearError: assign({
      error: null,
    }),
    clearAll: assign({
      workOrders: () => [],
      selectedWorkOrder: null,
      columns: () => [],
      total: 0,
      error: null,
    }),
  },
  actors: {
    // Fetch all work orders from API
    fetchWorkOrders: fromPromise(async () => {
      try {
        const workOrders = await getWorkOrders();
        console.log("Fetched work orders:", workOrders.length);
        const data = normalizeWorkOrders(workOrders);
        return {
          data,
          columns: makeColumns(),
          total: data.length,
        };
      } catch (error) {
        console.error("Error fetching work orders:", error);
        throw new Error(
          error.response?.data?.message || error.message || "Failed to fetch work orders",
        );
      }
    }),
  },
}).createMachine({
  id: "workOrder",
  initial: "idle",
  context: {
    workOrders: [],
    selectedWorkOrder: null,
    columns: [],
    total: 0,
    error: null,
  },
  states: {
    idle: {
      on: {
        LOAD: {
          target: "loading",
          actions: "clearError",
        },
      },
    },

    // Loading all work orders
    loading: {
      invoke: {
        src: "fetchWorkOrders",
        onDone: {
          target: "ready",
          actions: "setWorkOrders",
        },
        onError: {
          target: "error",
          actions: "setError",
        },
      },
    },

    // Work orders successfully loaded
    ready: {
      on: {
        LOAD: {
          target: "loading",
          actions: "clearError",
        },
        REFRESH: {
          target: "refreshing",
          actions: "clearError",
        },
        RESET: {
          target: "idle",
          actions: "clearAll",
        },
      },
    },

    // Refreshing current data
    refreshing: {
      invoke: {
        src: "fetchWorkOrders",
        onDone: {
          target: "ready",
          actions: "setWorkOrders",
        },
        onError: {
          target: "error",
          actions: "setError",
        },
      },
    },

    // Error state
    error: {
      on: {
        RETRY: {
          target: "loading",
          actions: "clearError",
        },
        LOAD: {
          target: "loading",
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

// Export the machine definition for component-scoped actor creation
// Components should create their own actors using createActor(woMachine)
