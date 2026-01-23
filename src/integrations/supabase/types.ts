export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      applicants: {
        Row: {
          application_data: Json | null
          application_submitted_at: string | null
          converted_at: string | null
          converted_tenant_id: string | null
          created_at: string | null
          decided_at: string | null
          decided_by: string | null
          decision_notes: string | null
          email: string
          first_name: string | null
          id: string
          invited_at: string | null
          invited_by: string | null
          last_name: string | null
          phone: string | null
          property_id: string
          screening_completed_at: string | null
          screening_order_id: string | null
          screening_provider: string | null
          screening_status: string | null
          status: string | null
          unit_id: string | null
          updated_at: string | null
        }
        Insert: {
          application_data?: Json | null
          application_submitted_at?: string | null
          converted_at?: string | null
          converted_tenant_id?: string | null
          created_at?: string | null
          decided_at?: string | null
          decided_by?: string | null
          decision_notes?: string | null
          email: string
          first_name?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          last_name?: string | null
          phone?: string | null
          property_id: string
          screening_completed_at?: string | null
          screening_order_id?: string | null
          screening_provider?: string | null
          screening_status?: string | null
          status?: string | null
          unit_id?: string | null
          updated_at?: string | null
        }
        Update: {
          application_data?: Json | null
          application_submitted_at?: string | null
          converted_at?: string | null
          converted_tenant_id?: string | null
          created_at?: string | null
          decided_at?: string | null
          decided_by?: string | null
          decision_notes?: string | null
          email?: string
          first_name?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          last_name?: string | null
          phone?: string | null
          property_id?: string
          screening_completed_at?: string | null
          screening_order_id?: string | null
          screening_provider?: string | null
          screening_status?: string | null
          status?: string | null
          unit_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "applicants_converted_tenant_id_fkey"
            columns: ["converted_tenant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applicants_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applicants_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applicants_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "payment_history_view"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "applicants_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applicants_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "property_manager_assignments"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "applicants_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "property_manager_assignments"
            referencedColumns: ["unit_id"]
          },
          {
            foreignKeyName: "applicants_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      application_forms: {
        Row: {
          application_fee: number | null
          created_at: string | null
          created_by: string | null
          form_schema: Json
          id: string
          is_default: boolean | null
          name: string
          property_id: string | null
          require_background_check: boolean | null
          require_credit_check: boolean | null
          require_eviction_check: boolean | null
          require_income_verification: boolean | null
          screening_fee: number | null
          updated_at: string | null
        }
        Insert: {
          application_fee?: number | null
          created_at?: string | null
          created_by?: string | null
          form_schema?: Json
          id?: string
          is_default?: boolean | null
          name?: string
          property_id?: string | null
          require_background_check?: boolean | null
          require_credit_check?: boolean | null
          require_eviction_check?: boolean | null
          require_income_verification?: boolean | null
          screening_fee?: number | null
          updated_at?: string | null
        }
        Update: {
          application_fee?: number | null
          created_at?: string | null
          created_by?: string | null
          form_schema?: Json
          id?: string
          is_default?: boolean | null
          name?: string
          property_id?: string | null
          require_background_check?: boolean | null
          require_credit_check?: boolean | null
          require_eviction_check?: boolean | null
          require_income_verification?: boolean | null
          screening_fee?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "application_forms_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_forms_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "payment_history_view"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "application_forms_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_forms_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "property_manager_assignments"
            referencedColumns: ["property_id"]
          },
        ]
      }
      automatic_payments: {
        Row: {
          created_at: string
          id: string
          is_enabled: boolean | null
          stripe_customer_id: string | null
          stripe_payment_method_id: string | null
          tenant_id: string
          unit_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_enabled?: boolean | null
          stripe_customer_id?: string | null
          stripe_payment_method_id?: string | null
          tenant_id: string
          unit_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_enabled?: boolean | null
          stripe_customer_id?: string | null
          stripe_payment_method_id?: string | null
          tenant_id?: string
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "automatic_payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automatic_payments_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "property_manager_assignments"
            referencedColumns: ["unit_id"]
          },
          {
            foreignKeyName: "automatic_payments_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      check_ins: {
        Row: {
          comment: string | null
          created_at: string | null
          id: string
          payment_id: string | null
          property_id: string
          rating: string
          tenant_id: string
          triggered_by: string | null
          unit_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id?: string
          payment_id?: string | null
          property_id: string
          rating: string
          tenant_id: string
          triggered_by?: string | null
          unit_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: string
          payment_id?: string | null
          property_id?: string
          rating?: string
          tenant_id?: string
          triggered_by?: string | null
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "check_ins_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payment_history_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_ins_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "rent_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_ins_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "payment_history_view"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "check_ins_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_ins_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "property_manager_assignments"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "check_ins_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_ins_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "property_manager_assignments"
            referencedColumns: ["unit_id"]
          },
          {
            foreignKeyName: "check_ins_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      company_stripe_accounts: {
        Row: {
          created_at: string | null
          id: string
          status: string | null
          stripe_connect_account_id: string | null
          termination_date: string | null
          updated_at: string | null
          verification_errors: Json | null
          verification_requirements: Json | null
          verification_status: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          status?: string | null
          stripe_connect_account_id?: string | null
          termination_date?: string | null
          updated_at?: string | null
          verification_errors?: Json | null
          verification_requirements?: Json | null
          verification_status?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          status?: string | null
          stripe_connect_account_id?: string | null
          termination_date?: string | null
          updated_at?: string | null
          verification_errors?: Json | null
          verification_requirements?: Json | null
          verification_status?: string | null
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string | null
          id: string
          is_archived: boolean | null
          landlord_id: string | null
          landlord_unread_count: number | null
          last_message_at: string | null
          last_message_preview: string | null
          property_id: string | null
          subject: string | null
          tenant_id: string | null
          tenant_unread_count: number | null
          unit_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_archived?: boolean | null
          landlord_id?: string | null
          landlord_unread_count?: number | null
          last_message_at?: string | null
          last_message_preview?: string | null
          property_id?: string | null
          subject?: string | null
          tenant_id?: string | null
          tenant_unread_count?: number | null
          unit_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_archived?: boolean | null
          landlord_id?: string | null
          landlord_unread_count?: number | null
          last_message_at?: string | null
          last_message_preview?: string | null
          property_id?: string | null
          subject?: string | null
          tenant_id?: string | null
          tenant_unread_count?: number | null
          unit_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "payment_history_view"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "conversations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "property_manager_assignments"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "conversations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "property_manager_assignments"
            referencedColumns: ["unit_id"]
          },
          {
            foreignKeyName: "conversations_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      deleted_tenant_units: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: string
          lease_end_date: string
          lease_start_date: string
          original_id: string | null
          status: string | null
          tenant_id: string | null
          unit_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id: string
          lease_end_date: string
          lease_start_date: string
          original_id?: string | null
          status?: string | null
          tenant_id?: string | null
          unit_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          lease_end_date?: string
          lease_start_date?: string
          original_id?: string | null
          status?: string | null
          tenant_id?: string | null
          unit_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deleted_tenant_units_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deleted_tenant_units_original_id_fkey"
            columns: ["original_id"]
            isOneToOne: false
            referencedRelation: "tenant_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deleted_tenant_units_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deleted_tenant_units_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "property_manager_assignments"
            referencedColumns: ["unit_id"]
          },
          {
            foreignKeyName: "deleted_tenant_units_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      dwolla_transfers: {
        Row: {
          amount: number
          completed_at: string | null
          correlation_id: string | null
          created_at: string | null
          destination_funding_source: string | null
          dwolla_transfer_id: string
          dwolla_transfer_url: string | null
          failure_reason: string | null
          fee: number | null
          id: string
          initiated_at: string | null
          landlord_id: string | null
          net_amount: number | null
          processed_at: string | null
          rent_payment_id: string | null
          source_funding_source: string | null
          status: string | null
          tenant_id: string | null
        }
        Insert: {
          amount: number
          completed_at?: string | null
          correlation_id?: string | null
          created_at?: string | null
          destination_funding_source?: string | null
          dwolla_transfer_id: string
          dwolla_transfer_url?: string | null
          failure_reason?: string | null
          fee?: number | null
          id?: string
          initiated_at?: string | null
          landlord_id?: string | null
          net_amount?: number | null
          processed_at?: string | null
          rent_payment_id?: string | null
          source_funding_source?: string | null
          status?: string | null
          tenant_id?: string | null
        }
        Update: {
          amount?: number
          completed_at?: string | null
          correlation_id?: string | null
          created_at?: string | null
          destination_funding_source?: string | null
          dwolla_transfer_id?: string
          dwolla_transfer_url?: string | null
          failure_reason?: string | null
          fee?: number | null
          id?: string
          initiated_at?: string | null
          landlord_id?: string | null
          net_amount?: number | null
          processed_at?: string | null
          rent_payment_id?: string | null
          source_funding_source?: string | null
          status?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dwolla_transfers_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dwolla_transfers_rent_payment_id_fkey"
            columns: ["rent_payment_id"]
            isOneToOne: false
            referencedRelation: "payment_history_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dwolla_transfers_rent_payment_id_fkey"
            columns: ["rent_payment_id"]
            isOneToOne: false
            referencedRelation: "rent_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dwolla_transfers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      dwolla_webhook_events: {
        Row: {
          created_at: string | null
          error: string | null
          event_id: string
          id: string
          payload: Json
          processed: boolean | null
          processed_at: string | null
          resource_id: string | null
          topic: string
        }
        Insert: {
          created_at?: string | null
          error?: string | null
          event_id: string
          id?: string
          payload: Json
          processed?: boolean | null
          processed_at?: string | null
          resource_id?: string | null
          topic: string
        }
        Update: {
          created_at?: string | null
          error?: string | null
          event_id?: string
          id?: string
          payload?: Json
          processed?: boolean | null
          processed_at?: string | null
          resource_id?: string | null
          topic?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string | null
          created_by: string | null
          description: string | null
          expense_date: string
          id: string
          is_recurring: boolean | null
          is_tax_deductible: boolean | null
          notes: string | null
          property_id: string
          receipt_path: string | null
          receipt_url: string | null
          recurring_frequency: string | null
          tax_category: string | null
          unit_id: string | null
          updated_at: string | null
          vendor: string | null
        }
        Insert: {
          amount: number
          category: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          expense_date: string
          id?: string
          is_recurring?: boolean | null
          is_tax_deductible?: boolean | null
          notes?: string | null
          property_id: string
          receipt_path?: string | null
          receipt_url?: string | null
          recurring_frequency?: string | null
          tax_category?: string | null
          unit_id?: string | null
          updated_at?: string | null
          vendor?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          expense_date?: string
          id?: string
          is_recurring?: boolean | null
          is_tax_deductible?: boolean | null
          notes?: string | null
          property_id?: string
          receipt_path?: string | null
          receipt_url?: string | null
          recurring_frequency?: string | null
          tax_category?: string | null
          unit_id?: string | null
          updated_at?: string | null
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "payment_history_view"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "expenses_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "property_manager_assignments"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "expenses_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "property_manager_assignments"
            referencedColumns: ["unit_id"]
          },
          {
            foreignKeyName: "expenses_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_items: {
        Row: {
          charge_to_tenant: boolean | null
          condition: string | null
          created_at: string | null
          estimated_repair_cost: number | null
          id: string
          inspection_id: string
          item: string
          notes: string | null
          room: string
        }
        Insert: {
          charge_to_tenant?: boolean | null
          condition?: string | null
          created_at?: string | null
          estimated_repair_cost?: number | null
          id?: string
          inspection_id: string
          item: string
          notes?: string | null
          room: string
        }
        Update: {
          charge_to_tenant?: boolean | null
          condition?: string | null
          created_at?: string | null
          estimated_repair_cost?: number | null
          id?: string
          inspection_id?: string
          item?: string
          notes?: string | null
          room?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspection_items_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "inspections"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_photos: {
        Row: {
          caption: string | null
          id: string
          inspection_id: string
          inspection_item_id: string | null
          room: string | null
          storage_path: string
          taken_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          caption?: string | null
          id?: string
          inspection_id: string
          inspection_item_id?: string | null
          room?: string | null
          storage_path: string
          taken_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          caption?: string | null
          id?: string
          inspection_id?: string
          inspection_item_id?: string | null
          room?: string | null
          storage_path?: string
          taken_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inspection_photos_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "inspections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_photos_inspection_item_id_fkey"
            columns: ["inspection_item_id"]
            isOneToOne: false
            referencedRelation: "inspection_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_photos_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      inspections: {
        Row: {
          completed_date: string | null
          created_at: string | null
          created_by: string | null
          id: string
          inspection_type: string
          inspector_notes: string | null
          inspector_signature_date: string | null
          overall_condition: string | null
          property_id: string
          scheduled_date: string | null
          status: string | null
          tenant_comments: string | null
          tenant_id: string | null
          tenant_signature_date: string | null
          unit_id: string
          updated_at: string | null
        }
        Insert: {
          completed_date?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          inspection_type: string
          inspector_notes?: string | null
          inspector_signature_date?: string | null
          overall_condition?: string | null
          property_id: string
          scheduled_date?: string | null
          status?: string | null
          tenant_comments?: string | null
          tenant_id?: string | null
          tenant_signature_date?: string | null
          unit_id: string
          updated_at?: string | null
        }
        Update: {
          completed_date?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          inspection_type?: string
          inspector_notes?: string | null
          inspector_signature_date?: string | null
          overall_condition?: string | null
          property_id?: string
          scheduled_date?: string | null
          status?: string | null
          tenant_comments?: string | null
          tenant_id?: string | null
          tenant_signature_date?: string | null
          unit_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inspections_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspections_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "payment_history_view"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "inspections_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspections_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "property_manager_assignments"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "inspections_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspections_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "property_manager_assignments"
            referencedColumns: ["unit_id"]
          },
          {
            foreignKeyName: "inspections_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      lease_documents: {
        Row: {
          created_at: string | null
          document_type: string | null
          file_size: number | null
          id: string
          lease_id: string
          mime_type: string | null
          name: string
          requires_signature: boolean | null
          signed_at: string | null
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string | null
          document_type?: string | null
          file_size?: number | null
          id?: string
          lease_id: string
          mime_type?: string | null
          name: string
          requires_signature?: boolean | null
          signed_at?: string | null
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string | null
          document_type?: string | null
          file_size?: number | null
          id?: string
          lease_id?: string
          mime_type?: string | null
          name?: string
          requires_signature?: boolean | null
          signed_at?: string | null
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lease_documents_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lease_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lease_templates: {
        Row: {
          content: string
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string
          state: string | null
          updated_at: string | null
          variables: Json | null
        }
        Insert: {
          content: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          state?: string | null
          updated_at?: string | null
          variables?: Json | null
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          state?: string | null
          updated_at?: string | null
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "lease_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      leases: {
        Row: {
          content: string | null
          created_at: string | null
          created_by: string | null
          grace_period_days: number | null
          id: string
          landlord_signature_ip: string | null
          landlord_signed_at: string | null
          late_fee: number | null
          lease_end: string
          lease_start: string
          monthly_rent: number
          pet_deposit: number | null
          pet_rent: number | null
          property_id: string
          renewed_from_lease_id: string | null
          renewed_to_lease_id: string | null
          security_deposit: number | null
          signature_provider: string | null
          signature_request_id: string | null
          signature_status: string | null
          signed_document_path: string | null
          signed_document_url: string | null
          status: string | null
          template_id: string | null
          tenant_id: string
          tenant_signature_ip: string | null
          tenant_signed_at: string | null
          terminated_at: string | null
          termination_notes: string | null
          termination_reason: string | null
          unit_id: string
          updated_at: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          grace_period_days?: number | null
          id?: string
          landlord_signature_ip?: string | null
          landlord_signed_at?: string | null
          late_fee?: number | null
          lease_end: string
          lease_start: string
          monthly_rent: number
          pet_deposit?: number | null
          pet_rent?: number | null
          property_id: string
          renewed_from_lease_id?: string | null
          renewed_to_lease_id?: string | null
          security_deposit?: number | null
          signature_provider?: string | null
          signature_request_id?: string | null
          signature_status?: string | null
          signed_document_path?: string | null
          signed_document_url?: string | null
          status?: string | null
          template_id?: string | null
          tenant_id: string
          tenant_signature_ip?: string | null
          tenant_signed_at?: string | null
          terminated_at?: string | null
          termination_notes?: string | null
          termination_reason?: string | null
          unit_id: string
          updated_at?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          grace_period_days?: number | null
          id?: string
          landlord_signature_ip?: string | null
          landlord_signed_at?: string | null
          late_fee?: number | null
          lease_end?: string
          lease_start?: string
          monthly_rent?: number
          pet_deposit?: number | null
          pet_rent?: number | null
          property_id?: string
          renewed_from_lease_id?: string | null
          renewed_to_lease_id?: string | null
          security_deposit?: number | null
          signature_provider?: string | null
          signature_request_id?: string | null
          signature_status?: string | null
          signed_document_path?: string | null
          signed_document_url?: string | null
          status?: string | null
          template_id?: string | null
          tenant_id?: string
          tenant_signature_ip?: string | null
          tenant_signed_at?: string | null
          terminated_at?: string | null
          termination_notes?: string | null
          termination_reason?: string | null
          unit_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leases_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leases_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "payment_history_view"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "leases_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leases_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "property_manager_assignments"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "leases_renewed_from_lease_id_fkey"
            columns: ["renewed_from_lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leases_renewed_to_lease_id_fkey"
            columns: ["renewed_to_lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leases_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "lease_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leases_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leases_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "property_manager_assignments"
            referencedColumns: ["unit_id"]
          },
          {
            foreignKeyName: "leases_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_requests: {
        Row: {
          created_at: string
          description: string
          id: string
          priority: string | null
          status: string | null
          tenant_id: string
          title: string
          unit_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          priority?: string | null
          status?: string | null
          tenant_id: string
          title: string
          unit_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          priority?: string | null
          status?: string | null
          tenant_id?: string
          title?: string
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "property_manager_assignments"
            referencedColumns: ["unit_id"]
          },
          {
            foreignKeyName: "maintenance_requests_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachment_name: string | null
          attachment_url: string | null
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          message_type: string | null
          read_at: string | null
          sender_id: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_url?: string | null
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          message_type?: string | null
          read_at?: string | null
          sender_id: string
        }
        Update: {
          attachment_name?: string | null
          attachment_url?: string | null
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          message_type?: string | null
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          created_at: string
          id: string
          message: string
          read: boolean
          related_entity_id: string | null
          related_entity_type: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          created_at?: string
          id?: string
          message: string
          read?: boolean
          related_entity_id?: string | null
          related_entity_type?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          related_entity_id?: string | null
          related_entity_type?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_audit_logs: {
        Row: {
          changes: Json | null
          created_at: string
          entity_id: string
          entity_type: string
          event_type: string
          id: string
          ip_address: string | null
          user_id: string | null
        }
        Insert: {
          changes?: Json | null
          created_at?: string
          entity_id: string
          entity_type: string
          event_type: string
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Update: {
          changes?: Json | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          event_type?: string
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_configs: {
        Row: {
          allow_partial_payments: boolean | null
          automatic_late_fees: boolean | null
          created_at: string
          due_day_of_month: number | null
          grace_period_days: number | null
          id: string
          late_fee_percentage: number | null
          minimum_payment_percentage: number | null
          payment_methods: Json | null
          platform_fee_visible: boolean | null
          property_id: string | null
          rent_due_day: number | null
          updated_at: string
        }
        Insert: {
          allow_partial_payments?: boolean | null
          automatic_late_fees?: boolean | null
          created_at?: string
          due_day_of_month?: number | null
          grace_period_days?: number | null
          id?: string
          late_fee_percentage?: number | null
          minimum_payment_percentage?: number | null
          payment_methods?: Json | null
          platform_fee_visible?: boolean | null
          property_id?: string | null
          rent_due_day?: number | null
          updated_at?: string
        }
        Update: {
          allow_partial_payments?: boolean | null
          automatic_late_fees?: boolean | null
          created_at?: string
          due_day_of_month?: number | null
          grace_period_days?: number | null
          id?: string
          late_fee_percentage?: number | null
          minimum_payment_percentage?: number | null
          payment_methods?: Json | null
          platform_fee_visible?: boolean | null
          property_id?: string | null
          rent_due_day?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_configs_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "payment_history_view"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "payment_configs_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_configs_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "property_manager_assignments"
            referencedColumns: ["property_id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          created_at: string
          id: string
          is_default: boolean | null
          last_four: string | null
          metadata: Json | null
          stripe_payment_method_id: string
          tenant_id: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean | null
          last_four?: string | null
          metadata?: Json | null
          stripe_payment_method_id: string
          tenant_id: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean | null
          last_four?: string | null
          metadata?: Json | null
          stripe_payment_method_id?: string
          tenant_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_methods_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_processors: {
        Row: {
          created_at: string | null
          dwolla_customer_id: string | null
          dwolla_customer_url: string | null
          dwolla_funding_source_id: string | null
          dwolla_funding_source_name: string | null
          dwolla_verified: boolean | null
          id: string
          is_primary: boolean | null
          processor: string
          status: string | null
          stripe_account_id: string | null
          stripe_onboarding_complete: boolean | null
          updated_at: string | null
          user_id: string
          verification_status: string | null
        }
        Insert: {
          created_at?: string | null
          dwolla_customer_id?: string | null
          dwolla_customer_url?: string | null
          dwolla_funding_source_id?: string | null
          dwolla_funding_source_name?: string | null
          dwolla_verified?: boolean | null
          id?: string
          is_primary?: boolean | null
          processor: string
          status?: string | null
          stripe_account_id?: string | null
          stripe_onboarding_complete?: boolean | null
          updated_at?: string | null
          user_id: string
          verification_status?: string | null
        }
        Update: {
          created_at?: string | null
          dwolla_customer_id?: string | null
          dwolla_customer_url?: string | null
          dwolla_funding_source_id?: string | null
          dwolla_funding_source_name?: string | null
          dwolla_verified?: boolean | null
          id?: string
          is_primary?: boolean | null
          processor?: string
          status?: string | null
          stripe_account_id?: string | null
          stripe_onboarding_complete?: boolean | null
          updated_at?: string | null
          user_id?: string
          verification_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_processors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_receipts: {
        Row: {
          created_at: string | null
          id: string
          payment_id: string
          receipt_number: string
          receipt_url: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          payment_id: string
          receipt_number: string
          receipt_url?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          payment_id?: string
          receipt_number?: string
          receipt_url?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_receipts_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payment_history_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_receipts_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "rent_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_routing_history: {
        Row: {
          created_at: string | null
          id: string
          new_manager_id: string | null
          new_stripe_account_id: string | null
          payment_transaction_id: string | null
          previous_manager_id: string | null
          previous_stripe_account_id: string | null
          routing_status: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          new_manager_id?: string | null
          new_stripe_account_id?: string | null
          payment_transaction_id?: string | null
          previous_manager_id?: string | null
          previous_stripe_account_id?: string | null
          routing_status?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          new_manager_id?: string | null
          new_stripe_account_id?: string | null
          payment_transaction_id?: string | null
          previous_manager_id?: string | null
          previous_stripe_account_id?: string | null
          routing_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_routing_history_payment_transaction_id_fkey"
            columns: ["payment_transaction_id"]
            isOneToOne: false
            referencedRelation: "payment_reports"
            referencedColumns: ["transaction_id"]
          },
          {
            foreignKeyName: "payment_routing_history_payment_transaction_id_fkey"
            columns: ["payment_transaction_id"]
            isOneToOne: false
            referencedRelation: "payment_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_transactions: {
        Row: {
          amount: number
          company_stripe_account_id: string | null
          created_at: string
          id: string
          payment_method: string | null
          processor: string | null
          property_manager_id: string | null
          rent_payment_id: string | null
          routing_attempts: number | null
          status: Database["public"]["Enums"]["payment_status"] | null
          stripe_customer_id: string | null
          stripe_payment_intent_id: string | null
          updated_at: string
          validation_details: Json | null
          validation_errors: Json | null
          validation_status: string | null
        }
        Insert: {
          amount: number
          company_stripe_account_id?: string | null
          created_at?: string
          id?: string
          payment_method?: string | null
          processor?: string | null
          property_manager_id?: string | null
          rent_payment_id?: string | null
          routing_attempts?: number | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          stripe_customer_id?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string
          validation_details?: Json | null
          validation_errors?: Json | null
          validation_status?: string | null
        }
        Update: {
          amount?: number
          company_stripe_account_id?: string | null
          created_at?: string
          id?: string
          payment_method?: string | null
          processor?: string | null
          property_manager_id?: string | null
          rent_payment_id?: string | null
          routing_attempts?: number | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          stripe_customer_id?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string
          validation_details?: Json | null
          validation_errors?: Json | null
          validation_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_company_stripe_account_id_fkey"
            columns: ["company_stripe_account_id"]
            isOneToOne: false
            referencedRelation: "company_stripe_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_property_manager_id_fkey"
            columns: ["property_manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_rent_payment_id_fkey"
            columns: ["rent_payment_id"]
            isOneToOne: false
            referencedRelation: "payment_history_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_rent_payment_id_fkey"
            columns: ["rent_payment_id"]
            isOneToOne: false
            referencedRelation: "rent_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address_line1: string | null
          city: string | null
          created_at: string
          default_payment_method_id: string | null
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          onboarding_completed_at: string | null
          onboarding_status: string | null
          phone_number: string | null
          postal_code: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          state: string | null
          stripe_customer_id: string | null
          updated_at: string
        }
        Insert: {
          address_line1?: string | null
          city?: string | null
          created_at?: string
          default_payment_method_id?: string | null
          email?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          onboarding_completed_at?: string | null
          onboarding_status?: string | null
          phone_number?: string | null
          postal_code?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          state?: string | null
          stripe_customer_id?: string | null
          updated_at?: string
        }
        Update: {
          address_line1?: string | null
          city?: string | null
          created_at?: string
          default_payment_method_id?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          onboarding_completed_at?: string | null
          onboarding_status?: string | null
          phone_number?: string | null
          postal_code?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          state?: string | null
          stripe_customer_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_default_payment_method_id_fkey"
            columns: ["default_payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          address: string
          created_at: string
          created_by: string
          id: string
          name: string
          property_manager_id: string | null
          property_type: string | null
          updated_at: string
        }
        Insert: {
          address: string
          created_at?: string
          created_by: string
          id?: string
          name: string
          property_manager_id?: string | null
          property_type?: string | null
          updated_at?: string
        }
        Update: {
          address?: string
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          property_manager_id?: string | null
          property_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "properties_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_property_manager_id_fkey"
            columns: ["property_manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      property_documents: {
        Row: {
          created_at: string
          document_type: string
          file_path: string
          filename: string
          id: string
          property_id: string
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          document_type: string
          file_path: string
          filename: string
          id?: string
          property_id: string
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          document_type?: string
          file_path?: string
          filename?: string
          id?: string
          property_id?: string
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_documents_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "payment_history_view"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "property_documents_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_documents_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "property_manager_assignments"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "property_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      property_images: {
        Row: {
          alt_text: string | null
          created_at: string | null
          created_by: string | null
          display_order: number | null
          file_name: string | null
          file_size: number | null
          id: string
          is_primary: boolean | null
          mime_type: string | null
          property_id: string
          storage_path: string
        }
        Insert: {
          alt_text?: string | null
          created_at?: string | null
          created_by?: string | null
          display_order?: number | null
          file_name?: string | null
          file_size?: number | null
          id?: string
          is_primary?: boolean | null
          mime_type?: string | null
          property_id: string
          storage_path: string
        }
        Update: {
          alt_text?: string | null
          created_at?: string | null
          created_by?: string | null
          display_order?: number | null
          file_name?: string | null
          file_size?: number | null
          id?: string
          is_primary?: boolean | null
          mime_type?: string | null
          property_id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_images_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_images_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "payment_history_view"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "property_images_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_images_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "property_manager_assignments"
            referencedColumns: ["property_id"]
          },
        ]
      }
      rent_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          invoice_date: string | null
          invoice_number: number
          payment_date: string
          payment_method: string | null
          status: string | null
          tenant_id: string
          unit_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          invoice_date?: string | null
          invoice_number?: number
          payment_date?: string
          payment_method?: string | null
          status?: string | null
          tenant_id: string
          unit_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          invoice_date?: string | null
          invoice_number?: number
          payment_date?: string
          payment_method?: string | null
          status?: string | null
          tenant_id?: string
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rent_payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rent_payments_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "property_manager_assignments"
            referencedColumns: ["unit_id"]
          },
          {
            foreignKeyName: "rent_payments_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      screening_reports: {
        Row: {
          applicant_id: string
          background_check: Json | null
          created_at: string | null
          credit_report: Json | null
          credit_score: number | null
          criminal_check: Json | null
          eviction_history: Json | null
          expires_at: string | null
          id: string
          income_verification: Json | null
          provider: string
          provider_order_id: string | null
          raw_response: Json | null
          recommendation: string | null
          recommendation_notes: string | null
          report_date: string | null
        }
        Insert: {
          applicant_id: string
          background_check?: Json | null
          created_at?: string | null
          credit_report?: Json | null
          credit_score?: number | null
          criminal_check?: Json | null
          eviction_history?: Json | null
          expires_at?: string | null
          id?: string
          income_verification?: Json | null
          provider: string
          provider_order_id?: string | null
          raw_response?: Json | null
          recommendation?: string | null
          recommendation_notes?: string | null
          report_date?: string | null
        }
        Update: {
          applicant_id?: string
          background_check?: Json | null
          created_at?: string | null
          credit_report?: Json | null
          credit_score?: number | null
          criminal_check?: Json | null
          eviction_history?: Json | null
          expires_at?: string | null
          id?: string
          income_verification?: Json | null
          provider?: string
          provider_order_id?: string | null
          raw_response?: Json | null
          recommendation?: string | null
          recommendation_notes?: string | null
          report_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "screening_reports_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: false
            referencedRelation: "applicants"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_configurations: {
        Row: {
          created_at: string
          id: string
          portal_configuration_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          portal_configuration_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          portal_configuration_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          type: Database["public"]["Enums"]["setting_type"]
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          type: Database["public"]["Enums"]["setting_type"]
          updated_at?: string
          value: Json
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          type?: Database["public"]["Enums"]["setting_type"]
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      tenant_payment_methods: {
        Row: {
          bank_account_type: string | null
          bank_last4: string | null
          bank_name: string | null
          bank_verified: boolean | null
          card_brand: string | null
          card_exp_month: number | null
          card_exp_year: number | null
          card_last4: string | null
          created_at: string | null
          dwolla_funding_source_id: string | null
          id: string
          is_default: boolean | null
          method_type: string
          nickname: string | null
          status: string | null
          stripe_payment_method_id: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          bank_account_type?: string | null
          bank_last4?: string | null
          bank_name?: string | null
          bank_verified?: boolean | null
          card_brand?: string | null
          card_exp_month?: number | null
          card_exp_year?: number | null
          card_last4?: string | null
          created_at?: string | null
          dwolla_funding_source_id?: string | null
          id?: string
          is_default?: boolean | null
          method_type: string
          nickname?: string | null
          status?: string | null
          stripe_payment_method_id?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          bank_account_type?: string | null
          bank_last4?: string | null
          bank_name?: string | null
          bank_verified?: boolean | null
          card_brand?: string | null
          card_exp_month?: number | null
          card_exp_year?: number | null
          card_last4?: string | null
          created_at?: string | null
          dwolla_funding_source_id?: string | null
          id?: string
          is_default?: boolean | null
          method_type?: string
          nickname?: string | null
          status?: string | null
          stripe_payment_method_id?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_payment_methods_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_units: {
        Row: {
          created_at: string
          id: string
          lease_end_date: string
          lease_start_date: string
          status: string | null
          tenant_id: string
          unit_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          lease_end_date: string
          lease_start_date: string
          status?: string | null
          tenant_id: string
          unit_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          lease_end_date?: string
          lease_start_date?: string
          status?: string | null
          tenant_id?: string
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_units_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_units_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "property_manager_assignments"
            referencedColumns: ["unit_id"]
          },
          {
            foreignKeyName: "tenant_units_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          created_at: string
          id: string
          monthly_rent: number
          property_id: string
          status: string | null
          unit_number: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          monthly_rent: number
          property_id: string
          status?: string | null
          unit_number: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          monthly_rent?: number
          property_id?: string
          status?: string | null
          unit_number?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "units_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "payment_history_view"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "units_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "units_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "property_manager_assignments"
            referencedColumns: ["property_id"]
          },
        ]
      }
      webhook_config: {
        Row: {
          created_at: string | null
          id: string
          key: string
          value: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          key: string
          value: string
        }
        Update: {
          created_at?: string | null
          id?: string
          key?: string
          value?: string
        }
        Relationships: []
      }
    }
    Views: {
      document_access_view: {
        Row: {
          created_at: string | null
          document_type: string | null
          file_path: string | null
          filename: string | null
          id: string | null
          property_id: string | null
          property_name: string | null
          uploaded_by: string | null
          uploader_first_name: string | null
          uploader_last_name: string | null
          uploader_role: Database["public"]["Enums"]["user_role"] | null
        }
        Relationships: [
          {
            foreignKeyName: "property_documents_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "payment_history_view"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "property_documents_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_documents_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "property_manager_assignments"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "property_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_history_view: {
        Row: {
          amount: number | null
          id: string | null
          invoice_number: number | null
          payment_date: string | null
          payment_method: string | null
          property_id: string | null
          property_name: string | null
          receipt_number: string | null
          receipt_url: string | null
          status: string | null
          tenant_id: string | null
          unit_number: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rent_payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_reports: {
        Row: {
          amount: number | null
          due_date: string | null
          payment_method: string | null
          payment_status: string | null
          property_name: string | null
          tenant_email: string | null
          tenant_name: string | null
          transaction_date: string | null
          transaction_id: string | null
          transaction_status:
            | Database["public"]["Enums"]["payment_status"]
            | null
          unit_number: string | null
        }
        Relationships: []
      }
      payment_settings_view: {
        Row: {
          allow_partial_payments: boolean | null
          automatic_late_fees: boolean | null
          created_at: string | null
          due_day_of_month: number | null
          grace_period_days: number | null
          id: string | null
          late_fee_percentage: number | null
          manager_email: string | null
          manager_first_name: string | null
          manager_last_name: string | null
          minimum_payment_percentage: number | null
          payment_methods: Json | null
          platform_fee_visible: boolean | null
          property_id: string | null
          property_manager_id: string | null
          property_name: string | null
          rent_due_day: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_configs_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "payment_history_view"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "payment_configs_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_configs_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "property_manager_assignments"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "properties_property_manager_id_fkey"
            columns: ["property_manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      property_manager_assignments: {
        Row: {
          lease_end_date: string | null
          lease_start_date: string | null
          manager_email: string | null
          manager_first_name: string | null
          manager_last_name: string | null
          property_id: string | null
          property_manager_id: string | null
          property_name: string | null
          tenant_email: string | null
          tenant_first_name: string | null
          tenant_id: string | null
          tenant_last_name: string | null
          unit_id: string | null
          unit_number: string | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_property_manager_id_fkey"
            columns: ["property_manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_units_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      calculate_late_fee:
        | {
            Args: {
              due_date: string
              payment_amount: number
              property_id: string
            }
            Returns: number
          }
        | { Args: { days_late: number; rent_amount: number }; Returns: number }
      create_notification: {
        Args: {
          p_action_url?: string
          p_message: string
          p_related_entity_id?: string
          p_related_entity_type?: string
          p_title: string
          p_type?: string
          p_user_id: string
        }
        Returns: string
      }
      get_user_role:
        | { Args: never; Returns: string }
        | {
            Args: { user_id: string }
            Returns: Database["public"]["Enums"]["user_role"]
          }
      is_admin: { Args: never; Returns: boolean }
      is_property_manager: { Args: never; Returns: boolean }
      log_payment_event:
        | {
            Args: {
              p_changes?: Json
              p_entity_id: string
              p_entity_type: string
              p_event_type: string
            }
            Returns: string
          }
        | {
            Args: {
              p_changes?: Json
              p_entity_id: string
              p_entity_type: string
              p_event_type: string
              p_ip_address?: string
            }
            Returns: string
          }
      mark_messages_read: {
        Args: { p_conversation_id: string; p_user_id: string }
        Returns: undefined
      }
      user_has_unit_access: { Args: { unit_uuid: string }; Returns: boolean }
      user_manages_property: {
        Args: { property_uuid: string }
        Returns: boolean
      }
    }
    Enums: {
      payment_status:
        | "pending"
        | "processing"
        | "completed"
        | "failed"
        | "refunded"
      setting_type: "boolean" | "number" | "string"
      user_role: "admin" | "property_manager" | "tenant"
      verification_status: "pending" | "verified" | "failed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      payment_status: [
        "pending",
        "processing",
        "completed",
        "failed",
        "refunded",
      ],
      setting_type: ["boolean", "number", "string"],
      user_role: ["admin", "property_manager", "tenant"],
      verification_status: ["pending", "verified", "failed"],
    },
  },
} as const
