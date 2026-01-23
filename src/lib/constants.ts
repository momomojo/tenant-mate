// Application-wide constants

// ---------- Query Configuration ----------

/** Default stale time for React Query (5 minutes) */
export const QUERY_STALE_TIME_MS = 1000 * 60 * 5;

/** Polling interval for unread message counts (30 seconds) */
export const UNREAD_COUNT_REFETCH_INTERVAL_MS = 30_000;

/** Default retry count for failed queries */
export const QUERY_RETRY_COUNT = 1;

// ---------- UI Constants ----------

/** Mobile breakpoint in pixels */
export const MOBILE_BREAKPOINT_PX = 768;

/** Occupancy rate threshold for "healthy" indicator */
export const HEALTHY_OCCUPANCY_THRESHOLD = 80;

/** Number of skeleton rows to show while loading tables */
export const TABLE_SKELETON_ROWS = 5;

/** Top categories to show in expense summary */
export const EXPENSE_SUMMARY_TOP_CATEGORIES = 4;

// ---------- Theme Colors ----------

export const THEME = {
  background: "#1A1F2C",
  cardBackground: "#403E43",
  accent: "#9b87f5",
} as const;

// ---------- Supabase Storage Buckets ----------

export const STORAGE_BUCKETS = {
  propertyImages: "property-images",
  documents: "documents",
} as const;

// ---------- Cache Control ----------

export const CACHE_CONTROL_1H = "3600";

// ---------- User Roles ----------

export const USER_ROLES = {
  admin: "admin",
  propertyManager: "property_manager",
  tenant: "tenant",
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

/** Roles that have property management permissions */
export const MANAGER_ROLES: UserRole[] = [USER_ROLES.admin, USER_ROLES.propertyManager];

// ---------- Status Types ----------

export const UNIT_STATUS = {
  available: "available",
  occupied: "occupied",
  maintenance: "maintenance",
} as const;

export type UnitStatus = (typeof UNIT_STATUS)[keyof typeof UNIT_STATUS];

export const LEASE_STATUS = {
  draft: "draft",
  pending: "pending",
  signed: "signed",
  active: "active",
  expired: "expired",
  terminated: "terminated",
  renewed: "renewed",
} as const;

export type LeaseStatus = (typeof LEASE_STATUS)[keyof typeof LEASE_STATUS];

export const APPLICANT_STATUS = {
  invited: "invited",
  started: "started",
  submitted: "submitted",
  screening: "screening",
  approved: "approved",
  rejected: "rejected",
  converted: "converted",
  withdrawn: "withdrawn",
} as const;

export type ApplicantStatus = (typeof APPLICANT_STATUS)[keyof typeof APPLICANT_STATUS];

/** Applicant statuses that count as "pending review" */
export const PENDING_APPLICANT_STATUSES: ApplicantStatus[] = [
  APPLICANT_STATUS.invited,
  APPLICANT_STATUS.started,
  APPLICANT_STATUS.submitted,
  APPLICANT_STATUS.screening,
];

export const MAINTENANCE_STATUS = {
  pending: "pending",
  inProgress: "in_progress",
  completed: "completed",
  cancelled: "cancelled",
} as const;

export type MaintenanceStatus = (typeof MAINTENANCE_STATUS)[keyof typeof MAINTENANCE_STATUS];

/** Maintenance statuses that count as "open" */
export const OPEN_MAINTENANCE_STATUSES = [
  MAINTENANCE_STATUS.pending,
  MAINTENANCE_STATUS.inProgress,
];

export const INSPECTION_STATUS = {
  scheduled: "scheduled",
  inProgress: "in_progress",
  completed: "completed",
  cancelled: "cancelled",
} as const;

export const INSPECTION_TYPE = {
  moveIn: "move_in",
  moveOut: "move_out",
  routine: "routine",
  maintenance: "maintenance",
  annual: "annual",
} as const;

export const MESSAGE_TYPE = {
  text: "text",
  image: "image",
  file: "file",
  system: "system",
} as const;

export type MessageType = (typeof MESSAGE_TYPE)[keyof typeof MESSAGE_TYPE];

// ---------- Lease Defaults ----------

export const LEASE_DEFAULTS = {
  lateFee: 50,
  gracePeriodDays: 5,
  securityDeposit: 0,
  petDeposit: 0,
  petRent: 0,
} as const;
