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
      bot_runs: {
        Row: {
          bot_id: string
          cadence: Database["public"]["Enums"]["cadence_type"]
          company_id: string
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          started_at: string | null
          status: Database["public"]["Enums"]["bot_run_status"] | null
          summary: Json | null
        }
        Insert: {
          bot_id: string
          cadence: Database["public"]["Enums"]["cadence_type"]
          company_id: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["bot_run_status"] | null
          summary?: Json | null
        }
        Update: {
          bot_id?: string
          cadence?: Database["public"]["Enums"]["cadence_type"]
          company_id?: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["bot_run_status"] | null
          summary?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "bot_runs_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bot_runs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      bot_schedules: {
        Row: {
          bot_id: string
          cadence: Database["public"]["Enums"]["cadence_type"]
          company_id: string
          created_at: string
          id: string
          is_enabled: boolean | null
          last_run_at: string | null
          next_run_at: string | null
          schedule_time: string
          timezone: string | null
          updated_at: string
        }
        Insert: {
          bot_id: string
          cadence: Database["public"]["Enums"]["cadence_type"]
          company_id: string
          created_at?: string
          id?: string
          is_enabled?: boolean | null
          last_run_at?: string | null
          next_run_at?: string | null
          schedule_time?: string
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          bot_id?: string
          cadence?: Database["public"]["Enums"]["cadence_type"]
          company_id?: string
          created_at?: string
          id?: string
          is_enabled?: boolean | null
          last_run_at?: string | null
          next_run_at?: string | null
          schedule_time?: string
          timezone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bot_schedules_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bot_schedules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      bots: {
        Row: {
          bot_type: Database["public"]["Enums"]["bot_type"]
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          bot_type: Database["public"]["Enums"]["bot_type"]
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          bot_type?: Database["public"]["Enums"]["bot_type"]
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          company_type: Database["public"]["Enums"]["company_type"]
          created_at: string
          id: string
          logo_url: string | null
          name: string
          primary_color: string | null
          updated_at: string
        }
        Insert: {
          company_type: Database["public"]["Enums"]["company_type"]
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          primary_color?: string | null
          updated_at?: string
        }
        Update: {
          company_type?: Database["public"]["Enums"]["company_type"]
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          primary_color?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      email_logs: {
        Row: {
          bot_id: string
          bot_run_id: string | null
          cadence: Database["public"]["Enums"]["cadence_type"]
          company_id: string
          created_at: string
          delivery_status: string | null
          html_content: string | null
          id: string
          recipients: Json
          resend_id: string | null
          sent_at: string | null
          subject: string
        }
        Insert: {
          bot_id: string
          bot_run_id?: string | null
          cadence: Database["public"]["Enums"]["cadence_type"]
          company_id: string
          created_at?: string
          delivery_status?: string | null
          html_content?: string | null
          id?: string
          recipients: Json
          resend_id?: string | null
          sent_at?: string | null
          subject: string
        }
        Update: {
          bot_id?: string
          bot_run_id?: string | null
          cadence?: Database["public"]["Enums"]["cadence_type"]
          company_id?: string
          created_at?: string
          delivery_status?: string | null
          html_content?: string | null
          id?: string
          recipients?: Json
          resend_id?: string | null
          sent_at?: string | null
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_logs_bot_run_id_fkey"
            columns: ["bot_run_id"]
            isOneToOne: false
            referencedRelation: "bot_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      email_recipients: {
        Row: {
          bot_id: string
          cadence: Database["public"]["Enums"]["cadence_type"]
          company_id: string
          created_at: string
          email: string
          id: string
          is_active: boolean | null
          recipient_type: string | null
          updated_at: string
        }
        Insert: {
          bot_id: string
          cadence: Database["public"]["Enums"]["cadence_type"]
          company_id: string
          created_at?: string
          email: string
          id?: string
          is_active?: boolean | null
          recipient_type?: string | null
          updated_at?: string
        }
        Update: {
          bot_id?: string
          cadence?: Database["public"]["Enums"]["cadence_type"]
          company_id?: string
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean | null
          recipient_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_recipients_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_recipients_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      exception_thresholds: {
        Row: {
          bot_id: string
          company_id: string
          created_at: string
          exception_type: string
          id: string
          severity: Database["public"]["Enums"]["exception_severity"] | null
          threshold_value: number
          updated_at: string
        }
        Insert: {
          bot_id: string
          company_id: string
          created_at?: string
          exception_type: string
          id?: string
          severity?: Database["public"]["Enums"]["exception_severity"] | null
          threshold_value: number
          updated_at?: string
        }
        Update: {
          bot_id?: string
          company_id?: string
          created_at?: string
          exception_type?: string
          id?: string
          severity?: Database["public"]["Enums"]["exception_severity"] | null
          threshold_value?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exception_thresholds_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exception_thresholds_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      exceptions: {
        Row: {
          assigned_to: string | null
          bot_id: string
          company_id: string
          created_at: string
          data: Json | null
          description: string | null
          exception_type: string
          id: string
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: Database["public"]["Enums"]["exception_severity"] | null
          status: Database["public"]["Enums"]["exception_status"] | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          bot_id: string
          company_id: string
          created_at?: string
          data?: Json | null
          description?: string | null
          exception_type: string
          id?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: Database["public"]["Enums"]["exception_severity"] | null
          status?: Database["public"]["Enums"]["exception_status"] | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          bot_id?: string
          company_id?: string
          created_at?: string
          data?: Json | null
          description?: string | null
          exception_type?: string
          id?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: Database["public"]["Enums"]["exception_severity"] | null
          status?: Database["public"]["Enums"]["exception_status"] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exceptions_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exceptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      integrations: {
        Row: {
          company_id: string
          config: Json | null
          created_at: string
          id: string
          integration_type: Database["public"]["Enums"]["integration_type"]
          is_connected: boolean | null
          last_sync_at: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          config?: Json | null
          created_at?: string
          id?: string
          integration_type: Database["public"]["Enums"]["integration_type"]
          is_connected?: boolean | null
          last_sync_at?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          config?: Json | null
          created_at?: string
          id?: string
          integration_type?: Database["public"]["Enums"]["integration_type"]
          is_connected?: boolean | null
          last_sync_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integrations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_history: {
        Row: {
          bot_id: string
          cadence: Database["public"]["Enums"]["cadence_type"]
          company_id: string
          created_at: string
          id: string
          kpi_name: string
          kpi_status: Database["public"]["Enums"]["kpi_status"] | null
          kpi_value: number | null
          metadata: Json | null
          period_end: string
          period_start: string
        }
        Insert: {
          bot_id: string
          cadence: Database["public"]["Enums"]["cadence_type"]
          company_id: string
          created_at?: string
          id?: string
          kpi_name: string
          kpi_status?: Database["public"]["Enums"]["kpi_status"] | null
          kpi_value?: number | null
          metadata?: Json | null
          period_end: string
          period_start: string
        }
        Update: {
          bot_id?: string
          cadence?: Database["public"]["Enums"]["cadence_type"]
          company_id?: string
          created_at?: string
          id?: string
          kpi_name?: string
          kpi_status?: Database["public"]["Enums"]["kpi_status"] | null
          kpi_value?: number | null
          metadata?: Json | null
          period_end?: string
          period_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "kpi_history_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_history_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_thresholds: {
        Row: {
          bot_id: string
          company_id: string
          created_at: string
          critical_threshold: number | null
          id: string
          kpi_name: string
          threshold_direction: string | null
          updated_at: string
          warning_threshold: number | null
        }
        Insert: {
          bot_id: string
          company_id: string
          created_at?: string
          critical_threshold?: number | null
          id?: string
          kpi_name: string
          threshold_direction?: string | null
          updated_at?: string
          warning_threshold?: number | null
        }
        Update: {
          bot_id?: string
          company_id?: string
          created_at?: string
          critical_threshold?: number | null
          id?: string
          kpi_name?: string
          threshold_direction?: string | null
          updated_at?: string
          warning_threshold?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "kpi_thresholds_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_thresholds_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          account_name: string | null
          amount: number
          category: string | null
          classification_status: string | null
          company_id: string
          created_at: string
          external_id: string | null
          id: string
          is_categorized: boolean | null
          is_duplicate: boolean | null
          memo: string | null
          needs_clarification: boolean | null
          transaction_date: string
          updated_at: string
          vendor: string | null
        }
        Insert: {
          account_name?: string | null
          amount: number
          category?: string | null
          classification_status?: string | null
          company_id: string
          created_at?: string
          external_id?: string | null
          id?: string
          is_categorized?: boolean | null
          is_duplicate?: boolean | null
          memo?: string | null
          needs_clarification?: boolean | null
          transaction_date: string
          updated_at?: string
          vendor?: string | null
        }
        Update: {
          account_name?: string | null
          amount?: number
          category?: string | null
          classification_status?: string | null
          company_id?: string
          created_at?: string
          external_id?: string | null
          id?: string
          is_categorized?: boolean | null
          is_duplicate?: boolean | null
          memo?: string | null
          needs_clarification?: boolean | null
          transaction_date?: string
          updated_at?: string
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_companies: {
        Row: {
          company_id: string
          created_at: string
          id: string
          is_company_admin: boolean | null
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          is_company_admin?: boolean | null
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          is_company_admin?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_companies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_company_ids: { Args: { _user_id: string }; Returns: string[] }
      has_company_access: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_company_admin: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "super_admin" | "company_admin" | "team_member"
      bot_run_status: "pending" | "running" | "completed" | "failed"
      bot_type:
        | "financial_control"
        | "property_halo"
        | "unique_painting"
        | "ati_security"
      cadence_type: "daily" | "weekly" | "monthly" | "quarterly"
      company_type: "property_halo" | "unique_painting" | "ati_security"
      exception_severity: "low" | "medium" | "high" | "critical"
      exception_status: "open" | "in_progress" | "resolved" | "dismissed"
      integration_type: "quickbooks" | "pete_crm" | "labortech" | "jobber"
      kpi_status: "on_track" | "warning" | "critical"
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
      app_role: ["super_admin", "company_admin", "team_member"],
      bot_run_status: ["pending", "running", "completed", "failed"],
      bot_type: [
        "financial_control",
        "property_halo",
        "unique_painting",
        "ati_security",
      ],
      cadence_type: ["daily", "weekly", "monthly", "quarterly"],
      company_type: ["property_halo", "unique_painting", "ati_security"],
      exception_severity: ["low", "medium", "high", "critical"],
      exception_status: ["open", "in_progress", "resolved", "dismissed"],
      integration_type: ["quickbooks", "pete_crm", "labortech", "jobber"],
      kpi_status: ["on_track", "warning", "critical"],
    },
  },
} as const
