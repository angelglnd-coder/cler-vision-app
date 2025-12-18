import type { AxiosResponse } from "axios";
import config from "./config";
import type {
  WorkOrder,
  WorkOrderFilters,
  WorkOrderSequence,
  WorkOrderSequenceMap,
  CreateWorkOrderFormData,
  BatchCreateResponse,
  ApiSuccessResponse,
} from "$lib/types";

/**
 * Work Order API
 * Handles all work order related API calls
 */

/**
 * Fetch next work order number
 * @returns Promise resolving to next work order sequence data
 */
export const getWorkOrderNextNumber = async (): Promise<WorkOrderSequence> => {
  const response: AxiosResponse<WorkOrderSequence> = await config.get("/workorders/next-number");
  return response.data;
};

/**
 * Fetch next sequence numbers for multiple SOLD_TO accounts
 * @param soldToAccounts - Array of 3-digit SOLD_TO account codes
 * @returns Promise resolving to map of soldTo -> sequence data
 * Example response:
 * {
 *   "003": { prefix: "003", sequentialNumber: 3, suffix: "0", latestWoNumber: "003-000003 0", nextNumber: 4 },
 *   "005": { prefix: "005", sequentialNumber: 12, suffix: "0", latestWoNumber: "005-000012 0", nextNumber: 13 }
 * }
 */
export const getWorkOrderNextNumbers = async (
  soldToAccounts: string[]
): Promise<WorkOrderSequenceMap> => {
  if (!soldToAccounts || soldToAccounts.length === 0) {
    return {};
  }

  // Make parallel requests for each SOLD_TO account
  const promises = soldToAccounts.map(async (soldTo) => {
    try {
      const response: AxiosResponse<WorkOrderSequence> = await config.get(
        `/workorders/next-number`,
        { params: { prefix: soldTo } }
      );
      return { soldTo, data: response.data };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      // console.error(`Failed to fetch sequence for SOLD_TO ${soldTo}:`, error);
      return { soldTo, data: null, error: errorMessage };
    }
  });

  const results = await Promise.all(promises);

  // Convert array to map
  const sequenceMap: WorkOrderSequenceMap = {};
  results.forEach(({ soldTo, data, error }) => {
    if (data) {
      sequenceMap[soldTo] = data;
    } else {
      sequenceMap[soldTo] = { error: error || "Unknown error" };
    }
  });

  return sequenceMap;
};

/**
 * Fetch all work orders from the database
 * @returns Promise resolving to work orders array
 */
export const getWorkOrders = async (): Promise<WorkOrder[]> => {
  const response: AxiosResponse<ApiSuccessResponse<WorkOrder[]>> = await config.get("/workorders/all/recent");
  return response.data.data;
};

/**
 * Fetch a single work order by ID
 * @param id - Work order ID
 * @returns Promise resolving to work order object
 */
export const getWorkOrderById = async (id: string | number): Promise<WorkOrder> => {
  const response: AxiosResponse<WorkOrder> = await config.get(`/workorders/${id}`);
  return response.data;
};

/**
 * Fetch work orders with filters
 * @param filters - Query parameters for filtering
 * @returns Promise resolving to filtered work orders
 */
export const getWorkOrdersFiltered = async (filters: WorkOrderFilters): Promise<WorkOrder[]> => {
  const response: AxiosResponse<WorkOrder[]> = await config.get("/workorders", { params: filters });
  return response.data;
};

/**
 * Create a new work order
 * @param workOrderData - Work order data
 * @returns Promise resolving to created work order
 */
export const createWorkOrder = async (
  workOrderData: CreateWorkOrderFormData
): Promise<WorkOrder> => {
  const response: AxiosResponse<WorkOrder> = await config.post("/workorders", workOrderData);
  return response.data;
};

/**
 * Create multiple work orders in batch
 * @param workOrdersArray - Array of work order data objects
 * @returns Promise resolving to batch creation response
 */
export const createWorkOrdersBatch = async (
  workOrdersArray: CreateWorkOrderFormData[]
): Promise<BatchCreateResponse> => {
  // console.log("testint =>", workOrdersArray);
  const response: AxiosResponse<BatchCreateResponse> = await config.post("/workorders/batch", {
    workOrders: workOrdersArray,
  });
  return response.data;
};

/**
 * Update an existing work order
 * @param id - Work order ID
 * @param workOrderData - Updated work order data
 * @returns Promise resolving to updated work order
 */
export const updateWorkOrder = async (
  id: string | number,
  workOrderData: Partial<WorkOrder>
): Promise<WorkOrder> => {
  const response: AxiosResponse<WorkOrder> = await config.put(
    `/work-orders/${id}`,
    workOrderData
  );
  return response.data;
};

/**
 * Delete a work order
 * @param id - Work order ID
 * @returns Promise resolving to deletion confirmation
 */
export const deleteWorkOrder = async (id: string | number): Promise<void> => {
  await config.delete(`/workorders/${id}`);
};
