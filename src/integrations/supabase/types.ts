export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
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
            referencedRelation: "units"
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
          updated_at: string
        }
        Insert: {
          address: string
          created_at?: string
          created_by: string
          id?: string
          name: string
          property_manager_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          property_manager_id?: string | null
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
            referencedRelation: "units"
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
          {
            foreignKeyName: "tenant_units_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      calculate_late_fee: {
        Args: {
          payment_amount: number
          due_date: string
          property_id: string
        }
        Returns: number
      }
      cleanup_deleted_tenant_units: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      get_user_role: {
        Args: {
          user_id: string
        }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      log_payment_event: {
        Args: {
          p_event_type: string
          p_entity_type: string
          p_entity_id: string
          p_changes?: Json
        }
        Returns: string
      }
      process_automatic_payments: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      reset_tenant_lease_history: {
        Args: {
          tenant_id_param: string
        }
        Returns: undefined
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

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
