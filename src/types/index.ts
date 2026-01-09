import type { LucideIcon } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

// Database table types
export type Unit = Database["public"]["Tables"]["units"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Property = Database["public"]["Tables"]["properties"]["Row"];
export type TenantUnit = Database["public"]["Tables"]["tenant_units"]["Row"];
export type RentPayment = Database["public"]["Tables"]["rent_payments"]["Row"];
export type MaintenanceRequest = Database["public"]["Tables"]["maintenance_requests"]["Row"];
export type PropertyDocument = Database["public"]["Tables"]["property_documents"]["Row"];

// Extended types with relationships
export interface UnitWithTenant extends Unit {
    tenant_units?: (TenantUnit & {
        profiles?: Profile | null;
    })[];
}

export interface PropertyWithUnits extends Property {
    units?: Unit[];
}

// Menu item type for sidebar navigation
export interface MenuItem {
    title: string;
    icon: LucideIcon;
    path: string;
    roles?: string[];
}

// Tenant profile for display
export interface TenantProfile {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
}

// Format tenant name from profile
export function formatTenantLabel(tenant: TenantProfile | null | undefined): string {
    if (!tenant) return "-";
    const name = [tenant.first_name, tenant.last_name]
        .filter(Boolean)
        .join(" ")
        .trim();
    return name || tenant.email || "-";
}
