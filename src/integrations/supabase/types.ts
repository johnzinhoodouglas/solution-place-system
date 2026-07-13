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
      ordens_servico: {
        Row: {
          created_at: string
          created_by: string
          data_entrada: string
          data_prevista_entrega: string | null
          data_saida: string | null
          etapa_atual: Database["public"]["Enums"]["os_etapa"]
          id: string
          nivel_blindagem: string | null
          numero: string
          observacoes: string | null
          prioridade: string
          responsavel_id: string | null
          status: Database["public"]["Enums"]["os_status"]
          updated_at: string
          veiculo_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          data_entrada?: string
          data_prevista_entrega?: string | null
          data_saida?: string | null
          etapa_atual?: Database["public"]["Enums"]["os_etapa"]
          id?: string
          nivel_blindagem?: string | null
          numero?: string
          observacoes?: string | null
          prioridade?: string
          responsavel_id?: string | null
          status?: Database["public"]["Enums"]["os_status"]
          updated_at?: string
          veiculo_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          data_entrada?: string
          data_prevista_entrega?: string | null
          data_saida?: string | null
          etapa_atual?: Database["public"]["Enums"]["os_etapa"]
          id?: string
          nivel_blindagem?: string | null
          numero?: string
          observacoes?: string | null
          prioridade?: string
          responsavel_id?: string | null
          status?: Database["public"]["Enums"]["os_status"]
          updated_at?: string
          veiculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ordens_servico_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      os_timeline: {
        Row: {
          autor_id: string
          autor_nome: string | null
          created_at: string
          descricao: string | null
          etapa_de: Database["public"]["Enums"]["os_etapa"] | null
          etapa_para: Database["public"]["Enums"]["os_etapa"] | null
          evento: Database["public"]["Enums"]["os_evento"]
          id: string
          metadata: Json
          os_id: string
        }
        Insert: {
          autor_id?: string
          autor_nome?: string | null
          created_at?: string
          descricao?: string | null
          etapa_de?: Database["public"]["Enums"]["os_etapa"] | null
          etapa_para?: Database["public"]["Enums"]["os_etapa"] | null
          evento: Database["public"]["Enums"]["os_evento"]
          id?: string
          metadata?: Json
          os_id: string
        }
        Update: {
          autor_id?: string
          autor_nome?: string | null
          created_at?: string
          descricao?: string | null
          etapa_de?: Database["public"]["Enums"]["os_etapa"] | null
          etapa_para?: Database["public"]["Enums"]["os_etapa"] | null
          evento?: Database["public"]["Enums"]["os_evento"]
          id?: string
          metadata?: Json
          os_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "os_timeline_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          ativo: boolean
          cargo: string | null
          created_at: string
          email: string
          id: string
          nome: string
          setor: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cargo?: string | null
          created_at?: string
          email?: string
          id: string
          nome?: string
          setor?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cargo?: string | null
          created_at?: string
          email?: string
          id?: string
          nome?: string
          setor?: string | null
          updated_at?: string
        }
        Relationships: []
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
          role: Database["public"]["Enums"]["app_role"]
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
      veiculos: {
        Row: {
          ano: number | null
          chassi: string | null
          cliente_contato: string | null
          cliente_documento: string | null
          cliente_nome: string
          cor: string | null
          created_at: string
          id: string
          marca: string
          modelo: string
          observacoes: string | null
          placa: string
          updated_at: string
        }
        Insert: {
          ano?: number | null
          chassi?: string | null
          cliente_contato?: string | null
          cliente_documento?: string | null
          cliente_nome: string
          cor?: string | null
          created_at?: string
          id?: string
          marca: string
          modelo: string
          observacoes?: string | null
          placa: string
          updated_at?: string
        }
        Update: {
          ano?: number | null
          chassi?: string | null
          cliente_contato?: string | null
          cliente_documento?: string | null
          cliente_nome?: string
          cor?: string | null
          created_at?: string
          id?: string
          marca?: string
          modelo?: string
          observacoes?: string | null
          placa?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "master"
        | "diretoria"
        | "qualidade"
        | "engenharia"
        | "vendas"
        | "compras"
        | "financeiro"
        | "producao"
        | "seguranca"
        | "fiscal"
        | "recepcao"
      os_etapa:
        | "recepcao"
        | "engenharia"
        | "desmontagem"
        | "blindagem"
        | "montagem"
        | "acabamento"
        | "qualidade"
        | "entrega"
        | "concluida"
      os_evento:
        | "criacao"
        | "avanco_etapa"
        | "retorno_etapa"
        | "nota"
        | "intervencao_diretoria"
        | "nao_conformidade"
        | "anexo"
        | "pausa"
        | "retomada"
        | "conclusao"
        | "cancelamento"
      os_status:
        | "aberta"
        | "em_andamento"
        | "pausada"
        | "concluida"
        | "cancelada"
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
      app_role: [
        "master",
        "diretoria",
        "qualidade",
        "engenharia",
        "vendas",
        "compras",
        "financeiro",
        "producao",
        "seguranca",
        "fiscal",
        "recepcao",
      ],
      os_etapa: [
        "recepcao",
        "engenharia",
        "desmontagem",
        "blindagem",
        "montagem",
        "acabamento",
        "qualidade",
        "entrega",
        "concluida",
      ],
      os_evento: [
        "criacao",
        "avanco_etapa",
        "retorno_etapa",
        "nota",
        "intervencao_diretoria",
        "nao_conformidade",
        "anexo",
        "pausa",
        "retomada",
        "conclusao",
        "cancelamento",
      ],
      os_status: [
        "aberta",
        "em_andamento",
        "pausada",
        "concluida",
        "cancelada",
      ],
    },
  },
} as const
