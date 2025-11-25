import config from "./config";

/**
 * Work Order API
 * Handles all work order related API calls
 */

export const getWorkOrderNextNumber = () => config.get("/workorders/next-number");
// {

/**
 * Fetch next sequence numbers for multiple SOLD_TO accounts
 * @param {string[]} soldToAccounts - Array of 3-digit SOLD_TO account codes
 * @returns {Promise<Object>} Promise resolving to map of soldTo -> sequence data
 * Example response:
 * {
 *   "003": { prefix: "003", sequentialNumber: 3, suffix: "0", latestWoNumber: "003-000003 0", nextNumber: 4 },
 *   "005": { prefix: "005", sequentialNumber: 12, suffix: "0", latestWoNumber: "005-000012 0", nextNumber: 13 }
 * }
 */
export const getWorkOrderNextNumbers = async (soldToAccounts) => {
  if (!soldToAccounts || soldToAccounts.length === 0) {
    return {};
  }

  // Make parallel requests for each SOLD_TO account
  const promises = soldToAccounts.map(async (soldTo) => {
    try {
      const response = await config.get(`/workorders/next-number`, { params: { prefix: soldTo } });
      return { soldTo, data: response };
    } catch (error) {
      // console.error(`Failed to fetch sequence for SOLD_TO ${soldTo}:`, error);
      return { soldTo, data: null, error: error.message };
    }
  });

  const results = await Promise.all(promises);

  // Convert array to map
  const sequenceMap = {};
  results.forEach(({ soldTo, data, error }) => {
    if (data) {
      sequenceMap[soldTo] = data;
    } else {
      sequenceMap[soldTo] = { error };
    }
  });

  return sequenceMap;
};

/**
 * Fetch all work orders from the database
 * @returns {Promise} Promise resolving to work orders array
 */
export const getWorkOrders = () => config.get("/workorders/all/recent");

/**
 * Fetch a single work order by ID
 * @param {string|number} id - Work order ID
 * @returns {Promise} Promise resolving to work order object
 */
export const getWorkOrderById = (id) => config.get(`/workorders/${id}`);

/**
 * Fetch work orders with filters
 * @param {Object} filters - Query parameters for filtering
 * @returns {Promise} Promise resolving to filtered work orders
 */
export const getWorkOrdersFiltered = (filters) => config.get("/workorders", { params: filters });

/**
 * Create a new work order
 * @param {Object} workOrderData - Work order data
 * @returns {Promise} Promise resolving to created work order
 */
export const createWorkOrder = (workOrderData) => config.post("/workorders", workOrderData);

/**
 * Create multiple work orders in batch
 * @param {Array<Object>} workOrdersArray - Array of work order data objects
 * @returns {Promise} Promise resolving to created work orders
 */
export const createWorkOrdersBatch = (workOrdersArray) => {
  // console.log("testint =>", workOrdersArray);
  return config.post("/workorders/batch", { workOrders: workOrdersArray });
};

/**
 * Update an existing work order
 * @param {string|number} id - Work order ID
 * @param {Object} workOrderData - Updated work order data
 * @returns {Promise} Promise resolving to updated work order
 */
export const updateWorkOrder = (id, workOrderData) =>
  config.put(`/work-orders/${id}`, workOrderData);

/**
 * Delete a work order
 * @param {string|number} id - Work order ID
 * @returns {Promise} Promise resolving to deletion confirmation
 */
export const deleteWorkOrder = (id) => config.delete(`/workorders/${id}`);
