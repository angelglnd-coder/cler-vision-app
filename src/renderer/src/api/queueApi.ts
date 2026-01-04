import type { AxiosResponse } from "axios";
import config from "./config";
import type { QueueFile, CreateQueueFileData } from "$lib/types";

/**
 * Queue File API
 * Handles all queue file related API calls
 */

/**
 * Fetch all queue files from the database
 * @returns Promise resolving to queue files array
 */
export const getQueues = async (): Promise<QueueFile[]> => {
  const response: AxiosResponse<QueueFile[]> = await config.get("/queues/all/recent");
  return response.data;
};

/**
 * Fetch a single queue file by ID
 * @param id - Queue file ID
 * @returns Promise resolving to queue file object
 */
export const getQueueById = async (id: string | number): Promise<QueueFile> => {
  const response: AxiosResponse<QueueFile> = await config.get(`/queues/${id}`);
  return response.data;
};

/**
 * Create a new queue file
 * @param queueData - Queue file data
 * @returns Promise resolving to created queue file
 */
export const createQueue = async (queueData: CreateQueueFileData): Promise<QueueFile> => {
  const response: AxiosResponse<QueueFile> = await config.post("/queues", queueData);
  return response.data;
};

/**
 * Create a new queue file with groups and work orders in bulk
 * @param queueData - Queue file data with groups and work orders
 * @returns Promise resolving to created queue file with all relations
 */
export const createQueueBulk = async (queueData: any): Promise<QueueFile> => {
  const response: AxiosResponse<QueueFile> = await config.post("/queues/bulk", queueData);
  return response.data;
};

/**
 * Update an existing queue file
 * @param id - Queue file ID
 * @param queueData - Updated queue file data
 * @returns Promise resolving to updated queue file
 */
export const updateQueue = async (
  id: string | number,
  queueData: Partial<QueueFile>
): Promise<QueueFile> => {
  const response: AxiosResponse<QueueFile> = await config.put(`/queues/${id}`, queueData);
  return response.data;
};

/**
 * Delete a queue file
 * @param id - Queue file ID
 * @returns Promise resolving to deletion confirmation
 */
export const deleteQueue = async (id: string | number): Promise<void> => {
  await config.delete(`/queues/${id}`);
};
