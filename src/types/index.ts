import type { LucideIcon } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

// ---------- Database Row Types ----------

export type DbUnit = Database["public"]["Tables"]["units"]["Row"];
export type DbProfile = Database["public"]["Tables"]["profiles"]["Row"];
export type DbProperty = Database["public"]["Tables"]["properties"]["Row"];
export type DbTenantUnit = Database["public"]["Tables"]["tenant_units"]["Row"];
export type DbRentPayment = Database["public"]["Tables"]["rent_payments"]["Row"];
export type DbMaintenanceRequest = Database["public"]["Tables"]["maintenance_requests"]["Row"];

// ---------- Aliases for Backward Compatibility ----------

/** @deprecated Use DbUnit instead */
export type Unit = DbUnit;
/** @deprecated Use DbProfile instead */
export type Profile = DbProfile;
/** @deprecated Use DbProperty instead */
export type Property = DbProperty;
/** @deprecated Use DbTenantUnit instead */
export type TenantUnit = DbTenantUnit;
/** @deprecated Use DbRentPayment instead */
export type RentPayment = DbRentPayment;
/** @deprecated Use DbMaintenanceRequest instead */
export type MaintenanceRequest = DbMaintenanceRequest;

// ---------- Extended Types with Relationships ----------

export interface UnitWithTenant extends DbUnit {
  tenant_units?: (DbTenantUnit & {
    profiles?: DbProfile | null;
  })[];
}

export interface PropertyWithUnits extends DbProperty {
  units?: DbUnit[];
}

// ---------- Navigation Types ----------

export interface MenuItem {
  title: string;
  icon: LucideIcon;
  path: string;
  roles?: string[];
}

// ---------- Common Joined Data Shapes ----------

/** Common property shape returned in joined queries */
export interface JoinedProperty {
  id: string;
  name: string;
  address: string;
}

/** Common unit shape returned in joined queries */
export interface JoinedUnit {
  id: string;
  unit_number: string;
}

/** Common tenant/profile shape returned in joined queries */
export interface JoinedTenant {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

/** Extended tenant shape with avatar (used in messaging) */
export interface JoinedTenantWithAvatar extends JoinedTenant {
  avatar_url: string | null;
}

// ---------- Tenant Profile Type ----------

/** Profile shape used in property/unit management contexts */
export interface TenantProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

/** Format a tenant profile into a display label */
export function formatTenantLabel(tenant: TenantProfile): string {
  const name = [tenant.first_name, tenant.last_name].filter(Boolean).join(" ");
  if (name) return name;
  if (tenant.email) return tenant.email;
  return "Unknown Tenant";
}

// ---------- Configuration Map Type ----------

/** Reusable config type for status/category badge display */
export interface StatusConfig {
  label: string;
  color: string;
}
