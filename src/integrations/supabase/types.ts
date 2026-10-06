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
      audit_log: {
        Row: {
          action: string
          created_at: string
          description: string | null
          entity: string
          entity_id: string | null
          id: string
          metadata: Json | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          description?: string | null
          entity: string
          entity_id?: string | null
          id?: string
          metadata?: Json | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          description?: string | null
          entity?: string
          entity_id?: string | null
          id?: string
          metadata?: Json | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      auto_transactions: {
        Row: {
          created_at: string
          description: string
          generated_date: string
          id: string
          loan_id: string
          month: string
          reversed: boolean
          transaction_id: string | null
          value: number
        }
        Insert: {
          created_at?: string
          description: string
          generated_date: string
          id?: string
          loan_id: string
          month: string
          reversed?: boolean
          transaction_id?: string | null
          value: number
        }
        Update: {
          created_at?: string
          description?: string
          generated_date?: string
          id?: string
          loan_id?: string
          month?: string
          reversed?: boolean
          transaction_id?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "auto_transactions_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auto_transactions_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
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
      conciliacoes: {
        Row: {
          ajuste_transaction_id: string | null
          conta_id: string
          created_at: string
          created_by: string | null
          data: string
          diferenca: number
          id: string
          saldo_banco: number
          saldo_sistema: number
        }
        Insert: {
          ajuste_transaction_id?: string | null
          conta_id: string
          created_at?: string
          created_by?: string | null
          data: string
          diferenca: number
          id?: string
          saldo_banco: number
          saldo_sistema: number
        }
        Update: {
          ajuste_transaction_id?: string | null
          conta_id?: string
          created_at?: string
          created_by?: string | null
          data?: string
          diferenca?: number
          id?: string
          saldo_banco?: number
          saldo_sistema?: number
        }
        Relationships: [
          {
            foreignKeyName: "conciliacoes_conta_id_fkey"
            columns: ["conta_id"]
            isOneToOne: false
            referencedRelation: "contas_bancarias"
            referencedColumns: ["id"]
          },
        ]
      }
      contas_bancarias: {
        Row: {
          ativo: boolean
          banco: string | null
          created_at: string
          data_abertura: string | null
          historico: boolean
          id: string
          nome: string
          saldo_abertura: number
          tipo: string
        }
        Insert: {
          ativo?: boolean
          banco?: string | null
          created_at?: string
          data_abertura?: string | null
          historico?: boolean
          id?: string
          nome: string
          saldo_abertura?: number
          tipo?: string
        }
        Update: {
          ativo?: boolean
          banco?: string | null
          created_at?: string
          data_abertura?: string | null
          historico?: boolean
          id?: string
          nome?: string
          saldo_abertura?: number
          tipo?: string
        }
        Relationships: []
      }
      custom_categories: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
          type: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          type: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          type?: string
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
      fechamentos_mensais: {
        Row: {
          fechado_em: string
          fechado_por: string | null
          month: string
        }
        Insert: {
          fechado_em?: string
          fechado_por?: string | null
          month: string
        }
        Update: {
          fechado_em?: string
          fechado_por?: string | null
          month?: string
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
          auto_debit: boolean
          bank_account: string | null
          contract: string
          created_at: string
          debit_category: string | null
          debit_day: number | null
          debit_end_date: string | null
          debit_start_date: string | null
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
          auto_debit?: boolean
          bank_account?: string | null
          contract: string
          created_at?: string
          debit_category?: string | null
          debit_day?: number | null
          debit_end_date?: string | null
          debit_start_date?: string | null
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
          auto_debit?: boolean
          bank_account?: string | null
          contract?: string
          created_at?: string
          debit_category?: string | null
          debit_day?: number | null
          debit_end_date?: string | null
          debit_start_date?: string | null
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
      patrimony_snapshots: {
        Row: {
          created_at: string
          gross_patrimony: number
          id: string
          month: string
          net_equity_per_partner: number
          notes: string | null
          total_debt: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          gross_patrimony?: number
          id?: string
          month: string
          net_equity_per_partner?: number
          notes?: string | null
          total_debt?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          gross_patrimony?: number
          id?: string
          month?: string
          net_equity_per_partner?: number
          notes?: string | null
          total_debt?: number
          updated_at?: string
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
          scheduled_date: string | null
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
          scheduled_date?: string | null
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
          scheduled_date?: string | null
          status?: string
          value?: number
        }
        Relationships: []
      }
      pending_boletos: {
        Row: {
          area: string | null
          category: string
          client_name: string | null
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          description: string
          due_date: string | null
          entry_date: string
          id: string
          notes: string | null
          os_number: string | null
          payment_method: string | null
          status: string
          transaction_id: string | null
          updated_at: string
          value: number
        }
        Insert: {
          area?: string | null
          category?: string
          client_name?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          description: string
          due_date?: string | null
          entry_date?: string
          id?: string
          notes?: string | null
          os_number?: string | null
          payment_method?: string | null
          status?: string
          transaction_id?: string | null
          updated_at?: string
          value: number
        }
        Update: {
          area?: string | null
          category?: string
          client_name?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          description?: string
          due_date?: string | null
          entry_date?: string
          id?: string
          notes?: string | null
          os_number?: string | null
          payment_method?: string | null
          status?: string
          transaction_id?: string | null
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "pending_boletos_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      receivables: {
        Row: {
          created_at: string
          description: string
          due_date: string | null
          id: string
          notes: string | null
          paid_value: number
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
          paid_value?: number
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
          paid_value?: number
          responsible?: string | null
          status?: string
          type?: string
          value?: number
        }
        Relationships: []
      }
      regras_categoria: {
        Row: {
          categoria: string
          categoria_origem: string | null
          created_at: string
          created_by: string | null
          forma_pagamento: string | null
          id: string
          modo: string
          prioridade: number
          texto_contem: string
          tipo: string
        }
        Insert: {
          categoria: string
          categoria_origem?: string | null
          created_at?: string
          created_by?: string | null
          forma_pagamento?: string | null
          id?: string
          modo?: string
          prioridade?: number
          texto_contem: string
          tipo: string
        }
        Update: {
          categoria?: string
          categoria_origem?: string | null
          created_at?: string
          created_by?: string | null
          forma_pagamento?: string | null
          id?: string
          modo?: string
          prioridade?: number
          texto_contem?: string
          tipo?: string
        }
        Relationships: []
      }
      stock_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          id: string
          new_quantity: number
          old_quantity: number
          stock_item_id: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_quantity: number
          old_quantity: number
          stock_item_id: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_quantity?: number
          old_quantity?: number
          stock_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_history_stock_item_id_fkey"
            columns: ["stock_item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_items: {
        Row: {
          created_at: string
          id: string
          name: string
          notes: string | null
          quantity: number
          unit_value: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          quantity?: number
          unit_value?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          quantity?: number
          unit_value?: number
          updated_at?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          categoria_original: string | null
          category: string
          cliente: string | null
          conta_id: string | null
          created_at: string
          created_by: string | null
          date: string
          description: string
          fitid: string | null
          forma_pagamento: string | null
          id: string
          import_key: string | null
          locked: boolean
          month: string
          notes: string | null
          regra_aplicada: string | null
          type: string
          value: number
        }
        Insert: {
          categoria_original?: string | null
          category: string
          cliente?: string | null
          conta_id?: string | null
          created_at?: string
          created_by?: string | null
          date: string
          description: string
          fitid?: string | null
          forma_pagamento?: string | null
          id?: string
          import_key?: string | null
          locked?: boolean
          month: string
          notes?: string | null
          regra_aplicada?: string | null
          type: string
          value: number
        }
        Update: {
          categoria_original?: string | null
          category?: string
          cliente?: string | null
          conta_id?: string | null
          created_at?: string
          created_by?: string | null
          date?: string
          description?: string
          fitid?: string | null
          forma_pagamento?: string | null
          id?: string
          import_key?: string | null
          locked?: boolean
          month?: string
          notes?: string | null
          regra_aplicada?: string | null
          type?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "transactions_conta_id_fkey"
            columns: ["conta_id"]
            isOneToOne: false
            referencedRelation: "contas_bancarias"
            referencedColumns: ["id"]
          },
        ]
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
      aplicar_conciliacao: {
        Args: { _data: string; _diferenca: number; _saldos: Json }
        Returns: string
      }
      fechar_mes: { Args: { _month: string }; Returns: undefined }
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
      norm_txt: { Args: { t: string }; Returns: string }
      reabrir_mes: { Args: { _month: string }; Returns: undefined }
    }
    Enums: {
      app_role:
        | "admin"
        | "gerencia"
        | "lancamentos"
        | "nf_control"
        | "lancador"
        | "contabilidade"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: [
        "admin",
        "gerencia",
        "lancamentos",
        "nf_control",
        "lancador",
        "contabilidade",
      ],
    },
  },
} as const
