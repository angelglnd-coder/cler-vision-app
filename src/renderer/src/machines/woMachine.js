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
  "cyl",
  "diam",
  "cylP",
  "edgeThick",
  "centerThick",
  "eValue",
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
 * Normalize work order data to ensure consistent structure
 * @param {Array} workOrders - Raw work orders from API
 * @returns {Array} Normalized work orders
 */
function normalizeWorkOrders(workOrders) {
  if (!Array.isArray(workOrders)) return [];

  return workOrders.map((wo) => {
    const normalized = {};
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
      normalized[col] = value;
    }
    return normalized;
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
        const response = await getWorkOrders();
        console.log("API response =>", response);
        const data = normalizeWorkOrders(response.data.data);
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

// Create and export the actor
export const actor = createActor(woMachine);
