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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      app_config: {
        Row: {
          ano: number
          id: string
          num_socios: number
          saldo_anterior: number
          updated_at: string
        }
        Insert: {
          ano?: number
          id?: string
          num_socios?: number
          saldo_anterior?: number
          updated_at?: string
        }
        Update: {
          ano?: number
          id?: string
          num_socios?: number
          saldo_anterior?: number
          updated_at?: string
        }
        Relationships: []
      }
      assets: {
        Row: {
          asset_group: string
          created_at: string
          description: string
          id: string
          notes: string | null
          plate: string | null
          value_fipe: number | null
          value_market: number
        }
        Insert: {
          asset_group: string
          created_at?: string
          description: string
          id?: string
          notes?: string | null
          plate?: string | null
          value_fipe?: number | null
          value_market?: number
        }
        Update: {
          asset_group?: string
          created_at?: string
          description?: string
          id?: string
          notes?: string | null
          plate?: string | null
          value_fipe?: number | null
          value_market?: number
        }
        Relationships: []
      }
      cash_entries: {
        Row: {
          balance: number
          created_at: string
          description: string
          id: string
          notes: string | null
          ref_date: string
        }
        Insert: {
          balance?: number
          created_at?: string
          description: string
          id?: string
          notes?: string | null
          ref_date: string
        }
        Update: {
          balance?: number
          created_at?: string
          description?: string
          id?: string
          notes?: string | null
          ref_date?: string
        }
        Relationships: []
      }
      doubtful_credits: {
        Row: {
          created_at: string
          description: string
          id: string
          notes: string | null
          responsible: string | null
          value: number
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          notes?: string | null
          responsible?: string | null
          value: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          notes?: string | null
          responsible?: string | null
          value?: number
        }
        Relationships: []
      }
      invoice_types: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          attachment_name: string | null
          attachment_url: string | null
          client_name: string
          created_at: string
          created_by: string | null
          id: string
          issue_date: string
          month: string
          notes: string | null
          number: string
          tax_rate: number
          type_id: string | null
          type_name: string
          updated_at: string
          value: number
        }
        Insert: {
          attachment_name?: string | null
          attachment_url?: string | null
          client_name: string
          created_at?: string
          created_by?: string | null
          id?: string
          issue_date?: string
          month: string
          notes?: string | null
          number: string
          tax_rate?: number
          type_id?: string | null
          type_name: string
          updated_at?: string
          value: number
        }
        Update: {
          attachment_name?: string | null
          attachment_url?: string | null
          client_name?: string
          created_at?: string
          created_by?: string | null
          id?: string
          issue_date?: string
          month?: string
          notes?: string | null
          number?: string
          tax_rate?: number
          type_id?: string | null
          type_name?: string
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoices_type_id_fkey"
            columns: ["type_id"]
            isOneToOne: false
            referencedRelation: "invoice_types"
            referencedColumns: ["id"]
          },
        ]
      }
      loans: {
        Row: {
          contract: string
          created_at: string
          id: string
          installment_value: number
          institution: string
          next_payment: string | null
          notes: string | null
          paid_installments: number
          total_installments: number
          type: string
        }
        Insert: {
          contract: string
          created_at?: string
          id?: string
          installment_value?: number
          institution?: string
          next_payment?: string | null
          notes?: string | null
          paid_installments?: number
          total_installments?: number
          type: string
        }
        Update: {
          contract?: string
          created_at?: string
          id?: string
          installment_value?: number
          institution?: string
          next_payment?: string | null
          notes?: string | null
          paid_installments?: number
          total_installments?: number
          type?: string
        }
        Relationships: []
      }
      payables: {
        Row: {
          created_at: string
          description: string
          due_date: string | null
          id: string
          notes: string | null
          responsible: string
          status: string
          value: number
        }
        Insert: {
          created_at?: string
          description: string
          due_date?: string | null
          id?: string
          notes?: string | null
          responsible?: string
          status?: string
          value: number
        }
        Update: {
          created_at?: string
          description?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          responsible?: string
          status?: string
          value?: number
        }
        Relationships: []
      }
      receivables: {
        Row: {
          created_at: string
          description: string
          due_date: string | null
          id: string
          notes: string | null
          responsible: string | null
          status: string
          type: string
          value: number
        }
        Insert: {
          created_at?: string
          description: string
          due_date?: string | null
          id?: string
          notes?: string | null
          responsible?: string | null
          status?: string
          type: string
          value: number
        }
        Update: {
          created_at?: string
          description?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          responsible?: string | null
          status?: string
          type?: string
          value?: number
        }
        Relationships: []
      }
      transactions: {
        Row: {
          category: string
          created_at: string
          date: string
          description: string
          id: string
          locked: boolean
          month: string
          notes: string | null
          type: string
          value: number
        }
        Insert: {
          category: string
          created_at?: string
          date: string
          description: string
          id?: string
          locked?: boolean
          month: string
          notes?: string | null
          type: string
          value: number
        }
        Update: {
          category?: string
          created_at?: string
          date?: string
          description?: string
          id?: string
          locked?: boolean
          month?: string
          notes?: string | null
          type?: string
          value?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "gerencia" | "lancamentos" | "nf_control"
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
      app_role: ["admin", "gerencia", "lancamentos", "nf_control"],
    },
  },
} as const
