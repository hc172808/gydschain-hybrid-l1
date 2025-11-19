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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      encrypted_wallets: {
        Row: {
          created_at: string
          encrypted_data: string
          encryption_salt: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          encrypted_data: string
          encryption_salt: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          encrypted_data?: string
          encryption_salt?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      nodes: {
        Row: {
          country: string
          created_at: string
          id: string
          ip_address: string
          last_seen: string
          node_id: string
          node_type: string
          port: number
          public_key: string
          region: string
          status: string
          version: string
          wallet_address: string
        }
        Insert: {
          country: string
          created_at?: string
          id?: string
          ip_address: string
          last_seen?: string
          node_id: string
          node_type: string
          port: number
          public_key: string
          region: string
          status: string
          version: string
          wallet_address: string
        }
        Update: {
          country?: string
          created_at?: string
          id?: string
          ip_address?: string
          last_seen?: string
          node_id?: string
          node_type?: string
          port?: number
          public_key?: string
          region?: string
          status?: string
          version?: string
          wallet_address?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          logo_url: string | null
          pin_hash: string
          updated_at: string
          user_id: string
          username: string
          wallet_address: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id?: string
          logo_url?: string | null
          pin_hash: string
          updated_at?: string
          user_id: string
          username: string
          wallet_address: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          logo_url?: string | null
          pin_hash?: string
          updated_at?: string
          user_id?: string
          username?: string
          wallet_address?: string
        }
        Relationships: []
      }
      swaps: {
        Row: {
          completed_at: string | null
          created_at: string
          exchange_rate: number
          from_amount: number
          from_token_id: string
          from_wallet: string
          id: string
          status: string
          swap_hash: string
          to_amount: number
          to_token_id: string
          to_wallet: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          exchange_rate: number
          from_amount: number
          from_token_id: string
          from_wallet: string
          id?: string
          status: string
          swap_hash: string
          to_amount: number
          to_token_id: string
          to_wallet: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          exchange_rate?: number
          from_amount?: number
          from_token_id?: string
          from_wallet?: string
          id?: string
          status?: string
          swap_hash?: string
          to_amount?: number
          to_token_id?: string
          to_wallet?: string
        }
        Relationships: [
          {
            foreignKeyName: "swaps_from_token_id_fkey"
            columns: ["from_token_id"]
            isOneToOne: false
            referencedRelation: "tokens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "swaps_to_token_id_fkey"
            columns: ["to_token_id"]
            isOneToOne: false
            referencedRelation: "tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      system_admin: {
        Row: {
          created_at: string
          id: string
          public_key: string
          wallet_address: string
        }
        Insert: {
          created_at?: string
          id?: string
          public_key: string
          wallet_address: string
        }
        Update: {
          created_at?: string
          id?: string
          public_key?: string
          wallet_address?: string
        }
        Relationships: []
      }
      tokens: {
        Row: {
          created_at: string
          decimals: number
          id: string
          is_stable: boolean | null
          name: string
          symbol: string
          total_supply: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          decimals?: number
          id?: string
          is_stable?: boolean | null
          name: string
          symbol: string
          total_supply?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          decimals?: number
          id?: string
          is_stable?: boolean | null
          name?: string
          symbol?: string
          total_supply?: number
          updated_at?: string
        }
        Relationships: []
      }
      transaction_rules: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          rule_name: string
          rule_type: string
          token_id: string | null
          updated_at: string
          value: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          rule_name: string
          rule_type: string
          token_id?: string | null
          updated_at?: string
          value: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          rule_name?: string
          rule_type?: string
          token_id?: string | null
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "transaction_rules_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          block_number: number | null
          confirmed_at: string | null
          created_at: string
          fee: number
          from_address: string
          id: string
          nonce: number
          signature: string
          status: string
          to_address: string
          token_id: string
          tx_hash: string
        }
        Insert: {
          amount: number
          block_number?: number | null
          confirmed_at?: string | null
          created_at?: string
          fee?: number
          from_address: string
          id?: string
          nonce: number
          signature: string
          status: string
          to_address: string
          token_id: string
          tx_hash: string
        }
        Update: {
          amount?: number
          block_number?: number | null
          confirmed_at?: string | null
          created_at?: string
          fee?: number
          from_address?: string
          id?: string
          nonce?: number
          signature?: string
          status?: string
          to_address?: string
          token_id?: string
          tx_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_balances: {
        Row: {
          balance: number
          created_at: string
          id: string
          locked_balance: number
          token_id: string
          updated_at: string
          wallet_address: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          locked_balance?: number
          token_id: string
          updated_at?: string
          wallet_address: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          locked_balance?: number
          token_id?: string
          updated_at?: string
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_balances_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "tokens"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
