/**
 * Centralized query key factory for React Query.
 *
 * Using a factory pattern ensures:
 * - Consistent key structure across the app
 * - Type-safe invalidation
 * - Easy discovery of all query keys
 * - Hierarchical invalidation (e.g., invalidate all property queries)
 */

export const queryKeys = {
  // Auth & User
  userRole: (userId?: string) => ["userRole", userId] as const,

  // Properties
  properties: {
    all: (userId?: string) => ["properties", userId] as const,
    detail: (propertyId?: string) => ["property", propertyId] as const,
    images: (propertyId?: string) => ["property-images", propertyId] as const,
  },

  // Units
  units: {
    byProperty: (propertyId?: string) => ["units", propertyId] as const,
    detail: (unitId?: string) => ["unit", unitId] as const,
  },

  // Tenants
  tenants: {
    units: (userId?: string) => ["tenantUnits", userId] as const,
    maintenanceCount: (userId?: string) => ["tenantMaintenanceCount", userId] as const,
    documentsCount: (userId?: string) => ["tenantDocumentsCount", userId] as const,
  },

  // Leases
  leases: {
    all: (userId?: string, filters?: unknown) => ["leases", userId, filters] as const,
    detail: (leaseId?: string) => ["lease", leaseId] as const,
    templates: () => ["lease-templates"] as const,
    counts: (userId?: string, propertyId?: string) => ["lease-counts", userId, propertyId] as const,
  },

  // Applicants
  applicants: {
    all: (userId?: string, filters?: unknown) => ["applicants", userId, filters] as const,
    detail: (applicantId?: string) => ["applicant", applicantId] as const,
    counts: (userId?: string, propertyId?: string) => ["applicant-counts", userId, propertyId] as const,
  },

  // Expenses
  expenses: {
    all: (filters?: unknown) => ["expenses", filters] as const,
    detail: (expenseId?: string) => ["expense", expenseId] as const,
    summary: (propertyId?: string, year?: number) => ["expenseSummary", propertyId, year] as const,
  },

  // Inspections
  inspections: {
    all: (filters?: unknown) => ["inspections", filters] as const,
    detail: (inspectionId?: string) => ["inspection", inspectionId] as const,
    counts: (propertyId?: string) => ["inspectionCounts", propertyId] as const,
  },

  // Messaging
  conversations: {
    all: (userId?: string) => ["conversations", userId] as const,
    detail: (conversationId?: string) => ["conversation", conversationId] as const,
    unreadCount: (userId?: string) => ["unread-count", userId] as const,
  },

  messages: {
    byConversation: (conversationId?: string) => ["messages", conversationId] as const,
  },

  // Payments
  payments: {
    all: () => ["payments"] as const,
    rentRoll: () => ["rentRoll"] as const,
    incomeReport: () => ["incomeReport"] as const,
  },

  // Dashboard
  dashboard: {
    pmStats: (userId?: string) => ["pmDashboardStats", userId] as const,
    applicantStats: (userId?: string) => ["applicantStats", userId] as const,
    leaseStats: (userId?: string) => ["leaseStats", userId] as const,
  },

  // Notifications
  notifications: () => ["notifications"] as const,

  // Maintenance
  maintenance: {
    all: () => ["maintenanceRequests"] as const,
  },

  // Reports
  reports: {
    propertySummary: () => ["propertySummary"] as const,
  },

  // Stripe
  stripe: {
    accounts: () => ["stripeAccounts"] as const,
  },
} as const;
