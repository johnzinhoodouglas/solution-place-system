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
      acoes_corretivas: {
        Row: {
          created_at: string
          created_by: string | null
          eficacia_verificada: boolean
          how_como: string | null
          how_much: number | null
          id: string
          nc_id: string
          observacoes: string | null
          status: Database["public"]["Enums"]["acao_status"]
          updated_at: string
          what: string
          when_prazo: string | null
          where_local: string | null
          who: string | null
          why: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          eficacia_verificada?: boolean
          how_como?: string | null
          how_much?: number | null
          id?: string
          nc_id: string
          observacoes?: string | null
          status?: Database["public"]["Enums"]["acao_status"]
          updated_at?: string
          what: string
          when_prazo?: string | null
          where_local?: string | null
          who?: string | null
          why?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          eficacia_verificada?: boolean
          how_como?: string | null
          how_much?: number | null
          id?: string
          nc_id?: string
          observacoes?: string | null
          status?: Database["public"]["Enums"]["acao_status"]
          updated_at?: string
          what?: string
          when_prazo?: string | null
          where_local?: string | null
          who?: string | null
          why?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "acoes_corretivas_nc_id_fkey"
            columns: ["nc_id"]
            isOneToOne: false
            referencedRelation: "nao_conformidades"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          ativo: boolean
          cidade: string | null
          created_at: string
          created_by: string | null
          documento: string | null
          email: string | null
          endereco: string | null
          id: string
          nome: string
          observacoes: string | null
          telefone: string | null
          tipo_pessoa: string | null
          uf: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cidade?: string | null
          created_at?: string
          created_by?: string | null
          documento?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          telefone?: string | null
          tipo_pessoa?: string | null
          uf?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cidade?: string | null
          created_at?: string
          created_by?: string | null
          documento?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          telefone?: string | null
          tipo_pessoa?: string | null
          uf?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      colaboradores: {
        Row: {
          ativo: boolean
          cargo: string | null
          cpf: string | null
          created_at: string
          data_admissao: string | null
          data_demissao: string | null
          email: string | null
          id: string
          matricula: string | null
          nome: string
          observacoes: string | null
          setor: string | null
          telefone: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          ativo?: boolean
          cargo?: string | null
          cpf?: string | null
          created_at?: string
          data_admissao?: string | null
          data_demissao?: string | null
          email?: string | null
          id?: string
          matricula?: string | null
          nome: string
          observacoes?: string | null
          setor?: string | null
          telefone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          ativo?: boolean
          cargo?: string | null
          cpf?: string | null
          created_at?: string
          data_admissao?: string | null
          data_demissao?: string | null
          email?: string | null
          id?: string
          matricula?: string | null
          nome?: string
          observacoes?: string | null
          setor?: string | null
          telefone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      contas_pagar: {
        Row: {
          created_at: string
          created_by: string | null
          data_emissao: string
          data_pagamento: string | null
          data_vencimento: string
          descricao: string
          fornecedor_id: string | null
          id: string
          nota_fiscal_id: string | null
          observacoes: string | null
          pedido_compra_id: string | null
          status: Database["public"]["Enums"]["titulo_status"]
          updated_at: string
          valor: number
          valor_pago: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data_emissao?: string
          data_pagamento?: string | null
          data_vencimento: string
          descricao: string
          fornecedor_id?: string | null
          id?: string
          nota_fiscal_id?: string | null
          observacoes?: string | null
          pedido_compra_id?: string | null
          status?: Database["public"]["Enums"]["titulo_status"]
          updated_at?: string
          valor: number
          valor_pago?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data_emissao?: string
          data_pagamento?: string | null
          data_vencimento?: string
          descricao?: string
          fornecedor_id?: string | null
          id?: string
          nota_fiscal_id?: string | null
          observacoes?: string | null
          pedido_compra_id?: string | null
          status?: Database["public"]["Enums"]["titulo_status"]
          updated_at?: string
          valor?: number
          valor_pago?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contas_pagar_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_pagar_nota_fiscal_id_fkey"
            columns: ["nota_fiscal_id"]
            isOneToOne: false
            referencedRelation: "notas_fiscais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_pagar_pedido_compra_id_fkey"
            columns: ["pedido_compra_id"]
            isOneToOne: false
            referencedRelation: "pedidos_compra"
            referencedColumns: ["id"]
          },
        ]
      }
      contas_receber: {
        Row: {
          cliente_id: string | null
          contrato_id: string | null
          created_at: string
          created_by: string | null
          data_emissao: string
          data_recebimento: string | null
          data_vencimento: string
          descricao: string
          id: string
          nota_fiscal_id: string | null
          observacoes: string | null
          os_id: string | null
          status: Database["public"]["Enums"]["titulo_status"]
          updated_at: string
          valor: number
          valor_recebido: number | null
        }
        Insert: {
          cliente_id?: string | null
          contrato_id?: string | null
          created_at?: string
          created_by?: string | null
          data_emissao?: string
          data_recebimento?: string | null
          data_vencimento: string
          descricao: string
          id?: string
          nota_fiscal_id?: string | null
          observacoes?: string | null
          os_id?: string | null
          status?: Database["public"]["Enums"]["titulo_status"]
          updated_at?: string
          valor: number
          valor_recebido?: number | null
        }
        Update: {
          cliente_id?: string | null
          contrato_id?: string | null
          created_at?: string
          created_by?: string | null
          data_emissao?: string
          data_recebimento?: string | null
          data_vencimento?: string
          descricao?: string
          id?: string
          nota_fiscal_id?: string | null
          observacoes?: string | null
          os_id?: string | null
          status?: Database["public"]["Enums"]["titulo_status"]
          updated_at?: string
          valor?: number
          valor_recebido?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contas_receber_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_receber_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_receber_nota_fiscal_id_fkey"
            columns: ["nota_fiscal_id"]
            isOneToOne: false
            referencedRelation: "notas_fiscais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_receber_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
        ]
      }
      contratos: {
        Row: {
          cliente_id: string | null
          created_at: string
          created_by: string | null
          data_fim: string | null
          data_inicio: string | null
          id: string
          numero: string | null
          objeto: string
          observacoes: string | null
          orcamento_id: string | null
          os_id: string | null
          status: Database["public"]["Enums"]["contrato_status"]
          updated_at: string
          valor: number
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string
          created_by?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          id?: string
          numero?: string | null
          objeto: string
          observacoes?: string | null
          orcamento_id?: string | null
          os_id?: string | null
          status?: Database["public"]["Enums"]["contrato_status"]
          updated_at?: string
          valor?: number
        }
        Update: {
          cliente_id?: string | null
          created_at?: string
          created_by?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          id?: string
          numero?: string | null
          objeto?: string
          observacoes?: string | null
          orcamento_id?: string | null
          os_id?: string | null
          status?: Database["public"]["Enums"]["contrato_status"]
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "contratos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
        ]
      }
      dds: {
        Row: {
          conteudo: string | null
          created_at: string
          data: string
          id: string
          participantes: string | null
          qtd_participantes: number
          responsavel_id: string | null
          responsavel_nome: string | null
          setor: string | null
          tema: string
          updated_at: string
        }
        Insert: {
          conteudo?: string | null
          created_at?: string
          data?: string
          id?: string
          participantes?: string | null
          qtd_participantes?: number
          responsavel_id?: string | null
          responsavel_nome?: string | null
          setor?: string | null
          tema: string
          updated_at?: string
        }
        Update: {
          conteudo?: string | null
          created_at?: string
          data?: string
          id?: string
          participantes?: string | null
          qtd_participantes?: number
          responsavel_id?: string | null
          responsavel_nome?: string | null
          setor?: string | null
          tema?: string
          updated_at?: string
        }
        Relationships: []
      }
      economia_registros: {
        Row: {
          categoria: string
          created_at: string
          custo_evitado: number
          custo_unitario: number
          id: string
          item: string
          mes: string
          observacoes: string | null
          origem: string | null
          quantidade: number
          unidade: string
          updated_at: string
        }
        Insert: {
          categoria?: string
          created_at?: string
          custo_evitado?: number
          custo_unitario?: number
          id?: string
          item: string
          mes?: string
          observacoes?: string | null
          origem?: string | null
          quantidade?: number
          unidade?: string
          updated_at?: string
        }
        Update: {
          categoria?: string
          created_at?: string
          custo_evitado?: number
          custo_unitario?: number
          id?: string
          item?: string
          mes?: string
          observacoes?: string | null
          origem?: string | null
          quantidade?: number
          unidade?: string
          updated_at?: string
        }
        Relationships: []
      }
      entregas_epi: {
        Row: {
          assinado: boolean
          colaborador_id: string | null
          colaborador_nome: string
          created_at: string
          data_entrega: string
          epi_id: string
          id: string
          observacoes: string | null
          quantidade: number
          registrado_por: string | null
          updated_at: string
        }
        Insert: {
          assinado?: boolean
          colaborador_id?: string | null
          colaborador_nome: string
          created_at?: string
          data_entrega?: string
          epi_id: string
          id?: string
          observacoes?: string | null
          quantidade?: number
          registrado_por?: string | null
          updated_at?: string
        }
        Update: {
          assinado?: boolean
          colaborador_id?: string | null
          colaborador_nome?: string
          created_at?: string
          data_entrega?: string
          epi_id?: string
          id?: string
          observacoes?: string | null
          quantidade?: number
          registrado_por?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "entregas_epi_epi_id_fkey"
            columns: ["epi_id"]
            isOneToOne: false
            referencedRelation: "epis"
            referencedColumns: ["id"]
          },
        ]
      }
      epis: {
        Row: {
          ativo: boolean
          ca: string | null
          created_at: string
          estoque: number
          estoque_minimo: number
          id: string
          nome: string
          observacoes: string | null
          tamanho: string | null
          updated_at: string
          validade_ca: string | null
        }
        Insert: {
          ativo?: boolean
          ca?: string | null
          created_at?: string
          estoque?: number
          estoque_minimo?: number
          id?: string
          nome: string
          observacoes?: string | null
          tamanho?: string | null
          updated_at?: string
          validade_ca?: string | null
        }
        Update: {
          ativo?: boolean
          ca?: string | null
          created_at?: string
          estoque?: number
          estoque_minimo?: number
          id?: string
          nome?: string
          observacoes?: string | null
          tamanho?: string | null
          updated_at?: string
          validade_ca?: string | null
        }
        Relationships: []
      }
      fornecedores: {
        Row: {
          ativo: boolean
          categoria: string | null
          cidade: string | null
          contato: string | null
          created_at: string
          created_by: string | null
          documento: string | null
          email: string | null
          endereco: string | null
          id: string
          nome: string
          observacoes: string | null
          telefone: string | null
          uf: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          categoria?: string | null
          cidade?: string | null
          contato?: string | null
          created_at?: string
          created_by?: string | null
          documento?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          telefone?: string | null
          uf?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          categoria?: string | null
          cidade?: string | null
          contato?: string | null
          created_at?: string
          created_by?: string | null
          documento?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          telefone?: string | null
          uf?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      incidentes_seguranca: {
        Row: {
          created_at: string
          data_ocorrencia: string
          descricao: string
          dias_afastamento: number
          envolvidos: string | null
          gravidade: Database["public"]["Enums"]["incidente_gravidade"]
          id: string
          investigacao: string | null
          local: string | null
          medidas_imediatas: string | null
          nc_id: string | null
          os_id: string | null
          registrado_por: string | null
          setor: string | null
          tipo: Database["public"]["Enums"]["incidente_tipo"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_ocorrencia?: string
          descricao: string
          dias_afastamento?: number
          envolvidos?: string | null
          gravidade?: Database["public"]["Enums"]["incidente_gravidade"]
          id?: string
          investigacao?: string | null
          local?: string | null
          medidas_imediatas?: string | null
          nc_id?: string | null
          os_id?: string | null
          registrado_por?: string | null
          setor?: string | null
          tipo: Database["public"]["Enums"]["incidente_tipo"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_ocorrencia?: string
          descricao?: string
          dias_afastamento?: number
          envolvidos?: string | null
          gravidade?: Database["public"]["Enums"]["incidente_gravidade"]
          id?: string
          investigacao?: string | null
          local?: string | null
          medidas_imediatas?: string | null
          nc_id?: string | null
          os_id?: string | null
          registrado_por?: string | null
          setor?: string | null
          tipo?: Database["public"]["Enums"]["incidente_tipo"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "incidentes_seguranca_nc_id_fkey"
            columns: ["nc_id"]
            isOneToOne: false
            referencedRelation: "nao_conformidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidentes_seguranca_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
        ]
      }
      inspecoes: {
        Row: {
          checklist: Json
          combustivel: string | null
          created_at: string
          created_by: string | null
          data_inspecao: string
          fornecedor_id: string | null
          fotos: Json
          id: string
          inspetor_id: string | null
          inspetor_nome: string | null
          itens_recebidos: string | null
          km: number | null
          numero: string | null
          observacoes: string | null
          os_id: string | null
          resultado: Database["public"]["Enums"]["inspecao_resultado"]
          tipo: Database["public"]["Enums"]["inspecao_tipo"]
          updated_at: string
          veiculo_id: string | null
        }
        Insert: {
          checklist?: Json
          combustivel?: string | null
          created_at?: string
          created_by?: string | null
          data_inspecao?: string
          fornecedor_id?: string | null
          fotos?: Json
          id?: string
          inspetor_id?: string | null
          inspetor_nome?: string | null
          itens_recebidos?: string | null
          km?: number | null
          numero?: string | null
          observacoes?: string | null
          os_id?: string | null
          resultado?: Database["public"]["Enums"]["inspecao_resultado"]
          tipo?: Database["public"]["Enums"]["inspecao_tipo"]
          updated_at?: string
          veiculo_id?: string | null
        }
        Update: {
          checklist?: Json
          combustivel?: string | null
          created_at?: string
          created_by?: string | null
          data_inspecao?: string
          fornecedor_id?: string | null
          fotos?: Json
          id?: string
          inspetor_id?: string | null
          inspetor_nome?: string | null
          itens_recebidos?: string | null
          km?: number | null
          numero?: string | null
          observacoes?: string | null
          os_id?: string | null
          resultado?: Database["public"]["Enums"]["inspecao_resultado"]
          tipo?: Database["public"]["Enums"]["inspecao_tipo"]
          updated_at?: string
          veiculo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inspecoes_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspecoes_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspecoes_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      nao_conformidades: {
        Row: {
          aberta_por: string | null
          created_at: string
          data_abertura: string
          data_fechamento: string | null
          descricao: string | null
          etapa: Database["public"]["Enums"]["os_etapa"] | null
          evidencias: Json
          id: string
          numero: string
          origem: Database["public"]["Enums"]["nc_origem"]
          os_id: string | null
          responsavel_id: string | null
          setor: string | null
          severidade: Database["public"]["Enums"]["nc_severidade"]
          status: Database["public"]["Enums"]["nc_status"]
          titulo: string
          updated_at: string
        }
        Insert: {
          aberta_por?: string | null
          created_at?: string
          data_abertura?: string
          data_fechamento?: string | null
          descricao?: string | null
          etapa?: Database["public"]["Enums"]["os_etapa"] | null
          evidencias?: Json
          id?: string
          numero: string
          origem?: Database["public"]["Enums"]["nc_origem"]
          os_id?: string | null
          responsavel_id?: string | null
          setor?: string | null
          severidade?: Database["public"]["Enums"]["nc_severidade"]
          status?: Database["public"]["Enums"]["nc_status"]
          titulo: string
          updated_at?: string
        }
        Update: {
          aberta_por?: string | null
          created_at?: string
          data_abertura?: string
          data_fechamento?: string | null
          descricao?: string | null
          etapa?: Database["public"]["Enums"]["os_etapa"] | null
          evidencias?: Json
          id?: string
          numero?: string
          origem?: Database["public"]["Enums"]["nc_origem"]
          os_id?: string | null
          responsavel_id?: string | null
          setor?: string | null
          severidade?: Database["public"]["Enums"]["nc_severidade"]
          status?: Database["public"]["Enums"]["nc_status"]
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nao_conformidades_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
        ]
      }
      notas_fiscais: {
        Row: {
          chave: string | null
          cliente_id: string | null
          contrato_id: string | null
          created_at: string
          created_by: string | null
          data_emissao: string
          fornecedor_id: string | null
          id: string
          natureza: string | null
          numero: string
          observacoes: string | null
          os_id: string | null
          pedido_compra_id: string | null
          serie: string | null
          status: Database["public"]["Enums"]["nf_status"]
          tipo: Database["public"]["Enums"]["nf_tipo"]
          updated_at: string
          valor: number
        }
        Insert: {
          chave?: string | null
          cliente_id?: string | null
          contrato_id?: string | null
          created_at?: string
          created_by?: string | null
          data_emissao?: string
          fornecedor_id?: string | null
          id?: string
          natureza?: string | null
          numero: string
          observacoes?: string | null
          os_id?: string | null
          pedido_compra_id?: string | null
          serie?: string | null
          status?: Database["public"]["Enums"]["nf_status"]
          tipo: Database["public"]["Enums"]["nf_tipo"]
          updated_at?: string
          valor?: number
        }
        Update: {
          chave?: string | null
          cliente_id?: string | null
          contrato_id?: string | null
          created_at?: string
          created_by?: string | null
          data_emissao?: string
          fornecedor_id?: string | null
          id?: string
          natureza?: string | null
          numero?: string
          observacoes?: string | null
          os_id?: string | null
          pedido_compra_id?: string | null
          serie?: string | null
          status?: Database["public"]["Enums"]["nf_status"]
          tipo?: Database["public"]["Enums"]["nf_tipo"]
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "notas_fiscais_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notas_fiscais_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notas_fiscais_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notas_fiscais_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notas_fiscais_pedido_compra_id_fkey"
            columns: ["pedido_compra_id"]
            isOneToOne: false
            referencedRelation: "pedidos_compra"
            referencedColumns: ["id"]
          },
        ]
      }
      orcamentos: {
        Row: {
          cliente_id: string | null
          created_at: string
          created_by: string | null
          descricao: string | null
          id: string
          itens: Json
          numero: string | null
          observacoes: string | null
          os_id: string | null
          status: Database["public"]["Enums"]["orcamento_status"]
          updated_at: string
          validade: string | null
          valor_total: number
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          itens?: Json
          numero?: string | null
          observacoes?: string | null
          os_id?: string | null
          status?: Database["public"]["Enums"]["orcamento_status"]
          updated_at?: string
          validade?: string | null
          valor_total?: number
        }
        Update: {
          cliente_id?: string | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          itens?: Json
          numero?: string | null
          observacoes?: string | null
          os_id?: string | null
          status?: Database["public"]["Enums"]["orcamento_status"]
          updated_at?: string
          validade?: string | null
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "orcamentos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamentos_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
        ]
      }
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
      pedidos_compra: {
        Row: {
          created_at: string
          created_by: string | null
          data_pedido: string
          data_prev_entrega: string | null
          fornecedor_id: string | null
          id: string
          itens: Json
          numero: string | null
          observacoes: string | null
          os_id: string | null
          status: Database["public"]["Enums"]["pedido_compra_status"]
          updated_at: string
          valor_total: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data_pedido?: string
          data_prev_entrega?: string | null
          fornecedor_id?: string | null
          id?: string
          itens?: Json
          numero?: string | null
          observacoes?: string | null
          os_id?: string | null
          status?: Database["public"]["Enums"]["pedido_compra_status"]
          updated_at?: string
          valor_total?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data_pedido?: string
          data_prev_entrega?: string | null
          fornecedor_id?: string | null
          id?: string
          itens?: Json
          numero?: string | null
          observacoes?: string | null
          os_id?: string | null
          status?: Database["public"]["Enums"]["pedido_compra_status"]
          updated_at?: string
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_compra_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_compra_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
        ]
      }
      procedimentos: {
        Row: {
          ativo: boolean
          clausula_iso: string | null
          codigo: string
          created_at: string
          epis: string[]
          id: string
          objetivo: string | null
          passos: Json
          riscos: Json
          setor: string
          titulo: string
          updated_at: string
          versao: string
        }
        Insert: {
          ativo?: boolean
          clausula_iso?: string | null
          codigo: string
          created_at?: string
          epis?: string[]
          id?: string
          objetivo?: string | null
          passos?: Json
          riscos?: Json
          setor: string
          titulo: string
          updated_at?: string
          versao?: string
        }
        Update: {
          ativo?: boolean
          clausula_iso?: string | null
          codigo?: string
          created_at?: string
          epis?: string[]
          id?: string
          objetivo?: string | null
          passos?: Json
          riscos?: Json
          setor?: string
          titulo?: string
          updated_at?: string
          versao?: string
        }
        Relationships: []
      }
      producao_apontamentos: {
        Row: {
          assinado_em: string | null
          assinatura: string | null
          colaborador_id: string | null
          colaborador_nome: string
          created_at: string
          created_by: string | null
          data_execucao: string
          escopos: string[]
          horas: number | null
          id: string
          observacoes: string | null
          os_id: string | null
          setor: Database["public"]["Enums"]["setor_producao"]
          status: Database["public"]["Enums"]["apontamento_status"]
          updated_at: string
        }
        Insert: {
          assinado_em?: string | null
          assinatura?: string | null
          colaborador_id?: string | null
          colaborador_nome: string
          created_at?: string
          created_by?: string | null
          data_execucao?: string
          escopos?: string[]
          horas?: number | null
          id?: string
          observacoes?: string | null
          os_id?: string | null
          setor: Database["public"]["Enums"]["setor_producao"]
          status?: Database["public"]["Enums"]["apontamento_status"]
          updated_at?: string
        }
        Update: {
          assinado_em?: string | null
          assinatura?: string | null
          colaborador_id?: string | null
          colaborador_nome?: string
          created_at?: string
          created_by?: string | null
          data_execucao?: string
          escopos?: string[]
          horas?: number | null
          id?: string
          observacoes?: string | null
          os_id?: string | null
          setor?: Database["public"]["Enums"]["setor_producao"]
          status?: Database["public"]["Enums"]["apontamento_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "producao_apontamentos_os_id_fkey"
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
      sugestoes_melhoria: {
        Row: {
          autor_id: string | null
          autor_nome: string | null
          categoria: string
          conflito_com: string | null
          created_at: string
          descricao: string
          ganho_custo_mes: number
          ganho_papel_folhas: number
          ganho_tempo_min: number
          id: string
          nota_esforco: number
          nota_impacto: number
          nota_risco: number
          parecer: string | null
          score: number
          setor: string | null
          status: Database["public"]["Enums"]["sugestao_status"]
          titulo: string
          updated_at: string
        }
        Insert: {
          autor_id?: string | null
          autor_nome?: string | null
          categoria?: string
          conflito_com?: string | null
          created_at?: string
          descricao: string
          ganho_custo_mes?: number
          ganho_papel_folhas?: number
          ganho_tempo_min?: number
          id?: string
          nota_esforco?: number
          nota_impacto?: number
          nota_risco?: number
          parecer?: string | null
          score?: number
          setor?: string | null
          status?: Database["public"]["Enums"]["sugestao_status"]
          titulo: string
          updated_at?: string
        }
        Update: {
          autor_id?: string | null
          autor_nome?: string | null
          categoria?: string
          conflito_com?: string | null
          created_at?: string
          descricao?: string
          ganho_custo_mes?: number
          ganho_papel_folhas?: number
          ganho_tempo_min?: number
          id?: string
          nota_esforco?: number
          nota_impacto?: number
          nota_risco?: number
          parecer?: string | null
          score?: number
          setor?: string | null
          status?: Database["public"]["Enums"]["sugestao_status"]
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sugestoes_melhoria_conflito_com_fkey"
            columns: ["conflito_com"]
            isOneToOne: false
            referencedRelation: "sugestoes_melhoria"
            referencedColumns: ["id"]
          },
        ]
      }
      treinamento_participantes: {
        Row: {
          certificado: boolean
          colaborador_id: string | null
          colaborador_nome: string
          created_at: string
          id: string
          nota: number | null
          presente: boolean
          treinamento_id: string
        }
        Insert: {
          certificado?: boolean
          colaborador_id?: string | null
          colaborador_nome: string
          created_at?: string
          id?: string
          nota?: number | null
          presente?: boolean
          treinamento_id: string
        }
        Update: {
          certificado?: boolean
          colaborador_id?: string | null
          colaborador_nome?: string
          created_at?: string
          id?: string
          nota?: number | null
          presente?: boolean
          treinamento_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "treinamento_participantes_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treinamento_participantes_treinamento_id_fkey"
            columns: ["treinamento_id"]
            isOneToOne: false
            referencedRelation: "treinamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      treinamentos: {
        Row: {
          carga_horaria: number
          conteudo: Json
          created_at: string
          data_prevista: string | null
          data_realizada: string | null
          descricao: string | null
          id: string
          instrutor: string | null
          obrigatorio: boolean
          setor: string | null
          tipo: Database["public"]["Enums"]["treinamento_tipo"]
          titulo: string
          updated_at: string
        }
        Insert: {
          carga_horaria?: number
          conteudo?: Json
          created_at?: string
          data_prevista?: string | null
          data_realizada?: string | null
          descricao?: string | null
          id?: string
          instrutor?: string | null
          obrigatorio?: boolean
          setor?: string | null
          tipo?: Database["public"]["Enums"]["treinamento_tipo"]
          titulo: string
          updated_at?: string
        }
        Update: {
          carga_horaria?: number
          conteudo?: Json
          created_at?: string
          data_prevista?: string | null
          data_realizada?: string | null
          descricao?: string | null
          id?: string
          instrutor?: string | null
          obrigatorio?: boolean
          setor?: string | null
          tipo?: Database["public"]["Enums"]["treinamento_tipo"]
          titulo?: string
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
      acao_status:
        | "planejada"
        | "em_execucao"
        | "concluida"
        | "verificada"
        | "cancelada"
      apontamento_status:
        | "em_execucao"
        | "concluido"
        | "pronto_limpeza"
        | "reprovado"
        | "retrabalho"
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
      contrato_status: "ativo" | "concluido" | "cancelado" | "suspenso"
      incidente_gravidade: "leve" | "moderada" | "grave" | "gravissima"
      incidente_tipo:
        | "quase_acidente"
        | "primeiros_socorros"
        | "com_afastamento"
        | "sem_afastamento"
        | "ambiental"
        | "patrimonial"
      inspecao_resultado:
        | "pendente"
        | "aprovado"
        | "aprovado_condicional"
        | "reprovado"
      inspecao_tipo: "recebimento" | "entrada" | "saida" | "processo"
      nc_origem:
        | "auditoria_interna"
        | "auditoria_externa"
        | "producao"
        | "cliente"
        | "fornecedor"
        | "inspecao"
        | "outro"
      nc_severidade: "baixa" | "media" | "alta" | "critica"
      nc_status:
        | "aberta"
        | "em_analise"
        | "em_acao"
        | "resolvida"
        | "verificada"
        | "fechada"
      nf_status: "emitida" | "autorizada" | "cancelada" | "denegada"
      nf_tipo: "entrada" | "saida"
      orcamento_status:
        | "rascunho"
        | "enviado"
        | "aprovado"
        | "recusado"
        | "expirado"
        | "convertido"
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
      pedido_compra_status:
        | "rascunho"
        | "aprovado"
        | "enviado"
        | "parcial"
        | "recebido"
        | "cancelado"
      setor_producao:
        | "aco"
        | "manta"
        | "vidros"
        | "montagem"
        | "limpeza_envelopamento"
        | "acabamento"
      sugestao_status:
        | "nova"
        | "em_analise"
        | "aprovada"
        | "em_implantacao"
        | "implantada"
        | "recusada"
        | "duplicada"
      titulo_status: "aberto" | "pago" | "parcial" | "vencido" | "cancelado"
      treinamento_tipo:
        | "lideranca"
        | "gestao_pessoal"
        | "tecnico"
        | "seguranca"
        | "iso_9001"
        | "integracao"
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
      acao_status: [
        "planejada",
        "em_execucao",
        "concluida",
        "verificada",
        "cancelada",
      ],
      apontamento_status: [
        "em_execucao",
        "concluido",
        "pronto_limpeza",
        "reprovado",
        "retrabalho",
      ],
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
      contrato_status: ["ativo", "concluido", "cancelado", "suspenso"],
      incidente_gravidade: ["leve", "moderada", "grave", "gravissima"],
      incidente_tipo: [
        "quase_acidente",
        "primeiros_socorros",
        "com_afastamento",
        "sem_afastamento",
        "ambiental",
        "patrimonial",
      ],
      inspecao_resultado: [
        "pendente",
        "aprovado",
        "aprovado_condicional",
        "reprovado",
      ],
      inspecao_tipo: ["recebimento", "entrada", "saida", "processo"],
      nc_origem: [
        "auditoria_interna",
        "auditoria_externa",
        "producao",
        "cliente",
        "fornecedor",
        "inspecao",
        "outro",
      ],
      nc_severidade: ["baixa", "media", "alta", "critica"],
      nc_status: [
        "aberta",
        "em_analise",
        "em_acao",
        "resolvida",
        "verificada",
        "fechada",
      ],
      nf_status: ["emitida", "autorizada", "cancelada", "denegada"],
      nf_tipo: ["entrada", "saida"],
      orcamento_status: [
        "rascunho",
        "enviado",
        "aprovado",
        "recusado",
        "expirado",
        "convertido",
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
      pedido_compra_status: [
        "rascunho",
        "aprovado",
        "enviado",
        "parcial",
        "recebido",
        "cancelado",
      ],
      setor_producao: [
        "aco",
        "manta",
        "vidros",
        "montagem",
        "limpeza_envelopamento",
        "acabamento",
      ],
      sugestao_status: [
        "nova",
        "em_analise",
        "aprovada",
        "em_implantacao",
        "implantada",
        "recusada",
        "duplicada",
      ],
      titulo_status: ["aberto", "pago", "parcial", "vencido", "cancelado"],
      treinamento_tipo: [
        "lideranca",
        "gestao_pessoal",
        "tecnico",
        "seguranca",
        "iso_9001",
        "integracao",
      ],
    },
  },
} as const
