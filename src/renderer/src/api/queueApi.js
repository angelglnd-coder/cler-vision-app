import config from "./config";

/**
 * Queue File API
 * Handles all queue file related API calls
 */

/**
 * Fetch all queue files from the database
 * @returns {Promise} Promise resolving to queue files array
 */
export const getQueues = () => config.get("/queues");

/**
 * Fetch a single queue file by ID
 * @param {string|number} id - Queue file ID
 * @returns {Promise} Promise resolving to queue file object
 */
export const getQueueById = (id) => config.get(`/queues/${id}`);

/**
 * Create a new queue file
 * @param {Object} queueData - Queue file data
 * @returns {Promise} Promise resolving to created queue file
 */
export const createQueue = (queueData) => config.post("/queues", queueData);

/**
 * Create a new queue file with groups and work orders in bulk
 * @param {Object} queueData - Queue file data with groups and work orders
 * @returns {Promise} Promise resolving to created queue file with all relations
 */
export const createQueueBulk = (queueData) => config.post("/queues/bulk", queueData);

/**
 * Update an existing queue file
 * @param {string|number} id - Queue file ID
 * @param {Object} queueData - Updated queue file data
 * @returns {Promise} Promise resolving to updated queue file
 */
export const updateQueue = (id, queueData) => config.put(`/queues/${id}`, queueData);

/**
 * Delete a queue file
 * @param {string|number} id - Queue file ID
 * @returns {Promise} Promise resolving to deletion confirmation
 */
export const deleteQueue = (id) => config.delete(`/queues/${id}`);
