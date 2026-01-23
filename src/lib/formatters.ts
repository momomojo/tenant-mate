/**
 * Formatting utilities for consistent display across the app.
 */

/**
 * Format a number as USD currency.
 * @example formatCurrency(1234.5) => "$1,234.50"
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format a number with locale-appropriate separators.
 * @example formatNumber(1234567) => "1,234,567"
 */
export function formatNumber(value: number): string {
  return value.toLocaleString("en-US");
}

/**
 * Format a percentage value.
 * @example formatPercent(85.5) => "86%"
 */
export function formatPercent(value: number, decimals = 0): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Build a full name from first and last name parts.
 * Returns fallback if both parts are empty.
 */
export function formatFullName(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  fallback = "-"
): string {
  const name = [firstName, lastName].filter(Boolean).join(" ").trim();
  return name || fallback;
}

/**
 * Format a tenant label from profile data.
 * Shows name if available, otherwise email, otherwise fallback.
 */
export function formatTenantLabel(
  tenant: { first_name?: string | null; last_name?: string | null; email?: string | null } | null | undefined,
  fallback = "-"
): string {
  if (!tenant) return fallback;
  const name = formatFullName(tenant.first_name, tenant.last_name, "");
  return name || tenant.email || fallback;
}

/**
 * Truncate a string to a max length with ellipsis.
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

/**
 * Format a file size in bytes to human-readable format.
 * @example formatFileSize(1024) => "1 KB"
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

/**
 * Generate unique file name with UUID prefix.
 */
export function generateUniqueFileName(originalName: string): string {
  const ext = originalName.split(".").pop() || "";
  const uuid = crypto.randomUUID();
  return ext ? `${uuid}.${ext}` : uuid;
}

/**
 * Generate a storage path for property images.
 */
export function generatePropertyImagePath(propertyId: string, fileName: string): string {
  return `property-images/${propertyId}/${generateUniqueFileName(fileName)}`;
}

/**
 * Generate a storage path for message attachments.
 */
export function generateMessageAttachmentPath(fileName: string): string {
  const ext = fileName.split(".").pop() || "";
  const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
  return `message-attachments/${uniqueId}.${ext}`;
}
