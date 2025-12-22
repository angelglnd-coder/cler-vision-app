/**
 * Core Type Definitions for Cler Vision App
 * Following best practices from triad-job-time-tracker
 */

// ============================================================================
// Re-export shared types
// ============================================================================
export type {
  AppSettings,
  TraySettings,
  PrintSettings,
  NotificationSettings
} from '../../../../shared/types';

// ============================================================================
// Work Order Domain Types
// ============================================================================

/**
 * Work Order entity representing a customer lens order
 */
export type WorkOrder = {
  id: number;
  woNumber: string;
  patientName: string;
  po: string;
  poDate: string;
  batchNo?: string;
  no: string;
  odOs: 'OD' | 'OS';
  kCode: string;
  pCode: string;
  priceCode: string;
  spec: string;
  cylToric: string;
  diam: string;
  color: string;
  laser: string;
  design: string;
  vietLabel: string;
  labeling: string;
  shipCode: string;
  previousSO?: string;
  note?: string;
  device: string;
  mfg: string;
  matCode: string;
  matLot: string;
  gtin: string;
  soldTo: string;
  billTo: string;
  cldfile: string;
  type: string;
  cylValue: string;
  edgeThick: string;
  centerThick: string;
  eValue: string;
  containerCode: string;
  bc1?: string;
  bc2?: string;
  pw1?: string;
  pw2?: string;
  oz1?: string;
  oz2?: string;
  rc1Radius?: string;
  ac1Radius?: string;
  ac2Radius?: string;
  ac3Radius?: string;
  rc1Tor?: string;
  ac1Tor?: string;
  ac2Tor?: string;
  ac3Tor?: string;
  rc1Width?: string;
  ac1Width?: string;
  ac2Width?: string;
  ac3Width?: string;
  pc1Radius?: string;
  pc2Radius?: string;
  pcwidth?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

/**
 * Form data for creating a new work order
 */
export type CreateWorkOrderFormData = Omit<WorkOrder, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * Filters for querying work orders
 */
export type WorkOrderFilters = {
  woNumber?: string;
  patientName?: string;
  po?: string;
  batchNo?: string;
  soldTo?: string;
  dateFrom?: string;
  dateTo?: string;
};

/**
 * Work order sequence number data
 */
export type WorkOrderSequence = {
  prefix: string;
  sequentialNumber: number;
  suffix: string;
  latestWoNumber: string;
  nextNumber: number;
};

/**
 * Map of SOLD_TO account codes to sequence data
 */
export type WorkOrderSequenceMap = Record<string, WorkOrderSequence | { error: string }>;

// ============================================================================
// Queue File Domain Types
// ============================================================================

/**
 * Queue file for batch processing
 */
export type QueueFile = {
  id: number;
  fileName: string;
  workOrders: WorkOrder[];
  createdAt: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
};

/**
 * Queue file creation data
 */
export type CreateQueueFileData = {
  fileName: string;
  workOrderIds: number[];
};

// ============================================================================
// Excel Import/Export Types
// ============================================================================

/**
 * Excel column mapping for work order import
 */
export type ExcelColumnMapping = {
  excelColumn: string;
  workOrderField: keyof WorkOrder;
  required: boolean;
};

/**
 * Excel import validation result
 */
export type ExcelValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
  data?: WorkOrder[];
};

/**
 * Excel sheet configuration
 */
export type ExcelSheetConfig = {
  sheetName: string;
  startRow: number;
  columnMappings: ExcelColumnMapping[];
};

// ============================================================================
// Application Settings Types
// ============================================================================
// UI Component Types
// ============================================================================

/**
 * Grid/Table column definition
 */
export type GridColumn = {
  id: string;
  header: string | any; // Can be string or Svelte component
  cell?: any; // Optional Svelte component for custom cells
  field?: string;
  width?: number;
  sortable?: boolean;
  filter?: boolean;
  align?: 'left' | 'center' | 'right';
  pinned?: 'left' | 'right';
};

/**
 * Grid row selection data
 */
export type GridSelection = {
  index: number;
  row: WorkOrder;
};

/**
 * Pagination state
 */
export type PaginationState = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

// ============================================================================
// Navigation & Routing Types
// ============================================================================

/**
 * Application page identifiers
 */
export type PageId =
  | 'work-orders'
  | 'queue-files'
  | 'batch-job'
  | 'preferences';

/**
 * Navigation menu item
 */
export type NavigationItem = {
  id: PageId;
  label: string;
  icon?: any; // Lucide icon component
  route: string;
};

// ============================================================================
// API Response Types
// ============================================================================

/**
 * Generic API success response
 */
export type ApiSuccessResponse<T> = {
  success: true;
  data: T;
  message?: string;
};

/**
 * Generic API error response
 */
export type ApiErrorResponse = {
  success: false;
  error: string;
  code?: string;
  details?: Record<string, unknown>;
};

/**
 * Combined API response type
 */
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Batch creation response
 */
export type BatchCreateResponse = {
  created: number;
  failed: number;
  errors: Array<{
    index: number;
    error: string;
    data: Partial<WorkOrder>;
  }>;
  workOrders: WorkOrder[];
};

// ============================================================================
// Lens Calculation Types
// ============================================================================

/**
 * Lens specification for calculations
 */
export type LensSpec = {
  baseCurve: number;
  diameter: number;
  power: number;
  cylinder?: number;
  axis?: number;
  addPower?: number;
};

/**
 * Calculated lens parameters
 */
export type LensCalculationResult = {
  centerThickness: number;
  edgeThickness: number;
  sagittalDepth: number;
  volume: number;
  mass: number;
};

// ============================================================================
// Barcode Types
// ============================================================================

/**
 * Barcode generation options
 */
export type BarcodeOptions = {
  format: 'CODE128' | 'CODE39' | 'EAN13' | 'UPC';
  width: number;
  height: number;
  displayValue: boolean;
  fontSize?: number;
  margin?: number;
};

/**
 * Barcode data for work order
 */
export type WorkOrderBarcodeData = {
  woNumber: string;
  containerCode: string;
  gtin: string;
};

// ============================================================================
// State Machine Context Types (XState)
// ============================================================================

/**
 * Work order machine context
 */
export type WorkOrderMachineContext = {
  workOrders: WorkOrder[];
  columns: GridColumn[];
  selectedWorkOrder: WorkOrder | null;
  filters: WorkOrderFilters;
  error: string | null;
  loading: boolean;
};

/**
 * Queue machine context
 */
export type QueueMachineContext = {
  workOrders: WorkOrder[];
  scannedBarcodes: string[];
  currentWorkOrder: WorkOrder | null;
  groupName: string | null;
  error: string | null;
};

/**
 * Excel loader machine context
 */
export type ExcelLoaderMachineContext = {
  file: File | null;
  validationResult: ExcelValidationResult | null;
  workOrders: WorkOrder[];
  error: string | null;
};

// ============================================================================
// Electron IPC Types (Window API)
// ============================================================================

/**
 * Settings API exposed to renderer
 */
export type SettingsAPI = {
  get: () => Promise<AppSettings>;
  update: (settings: Partial<AppSettings>) => Promise<void>;
  onChange: (callback: (settings: AppSettings) => void) => void;
};

/**
 * App info API exposed to renderer
 */
export type AppAPI = {
  version: string;
  platform: NodeJS.Platform;
};

/**
 * Window API extensions (available via window.api)
 */
export type WindowAPI = {
  settings: SettingsAPI;
  app: AppAPI;
};

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Make specific properties optional
 */
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Make specific properties required
 */
export type Required<T, K extends keyof T> = T & { [P in K]-?: T[P] };

/**
 * Deep partial type
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Enum-like type for work order status
 */
export type WorkOrderStatus = 'draft' | 'pending' | 'in-production' | 'completed' | 'cancelled';

/**
 * Timestamp fields
 */
export type Timestamps = {
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Entity with ID and timestamps
 */
export type Entity = {
  id: number;
} & Timestamps;
