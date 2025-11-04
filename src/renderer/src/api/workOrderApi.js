import config from './config'

/**
 * Work Order API
 * Handles all work order related API calls
 */

/**
 * Fetch all work orders from the database
 * @returns {Promise} Promise resolving to work orders array
 */
export const getWorkOrders = () => config.get('/work-orders');

/**
 * Fetch a single work order by ID
 * @param {string|number} id - Work order ID
 * @returns {Promise} Promise resolving to work order object
 */
export const getWorkOrderById = (id) => config.get(`/work-orders/${id}`);

/**
 * Fetch work orders with filters
 * @param {Object} filters - Query parameters for filtering
 * @returns {Promise} Promise resolving to filtered work orders
 */
export const getWorkOrdersFiltered = (filters) => config.get('/work-orders', { params: filters });

/**
 * Create a new work order
 * @param {Object} workOrderData - Work order data
 * @returns {Promise} Promise resolving to created work order
 */
export const createWorkOrder = (workOrderData) => config.post('/work-orders', workOrderData);

/**
 * Update an existing work order
 * @param {string|number} id - Work order ID
 * @param {Object} workOrderData - Updated work order data
 * @returns {Promise} Promise resolving to updated work order
 */
export const updateWorkOrder = (id, workOrderData) => config.put(`/work-orders/${id}`, workOrderData);

/**
 * Delete a work order
 * @param {string|number} id - Work order ID
 * @returns {Promise} Promise resolving to deletion confirmation
 */
export const deleteWorkOrder = (id) => config.delete(`/work-orders/${id}`);
