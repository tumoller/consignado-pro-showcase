// src/hooks/useConfigNegocio.ts
// Hooks de dados para Configurações estendidas (Promotoras, Usuários de Banco,
// Parâmetros de Simulação por banco, Config de Crédito global) e Config do Agente IA.
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

// ---------- Bancos (campos extras: febraban, switches, observações) ----------
export interface BancoExtra {
  id: number;
  nome: string;
  ativo: boolean;
  codigo_febraban: string | null;
  opera_margem_livre: boolean;
  opera_portabilidade: boolean;
  opera_refin: boolean;
  opera_cartao: boolean;
  observacoes: string | null;
  created_at: string;
}

export function useBancosExtra() {
  return useQuery({
    queryKey: ['bancos_ativos_extra'],
    queryFn: async (): Promise<BancoExtra[]> => {
      const { data, error } = await supabase
        .from('bancos_ativos')
        .select('*')
        .order('nome', { ascending: true });
      if (error) throw error;
      return data as BancoExtra[];
    },
  });
}

export function useMutationBancoExtra() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: {
      id: number;
      codigo_febraban?: string | null;
      opera_margem_livre?: boolean;
      opera_portabilidade?: boolean;
      opera_refin?: boolean;
      opera_cartao?: boolean;
      observacoes?: string | null;
    }) => {
      const { error } = await supabase.from('bancos_ativos').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bancos_ativos_extra'] });
      qc.invalidateQueries({ queryKey: ['bancos_ativos'] });
    },
  });
}

// ---------- Promotoras ----------
export interface Promotora {
  id: number;
  workspace_id: number;
  nome: string;
  cnpj: string | null;
  ativo: boolean;
  observacoes: string | null;
  created_at: string;
}

export function usePromotoras(workspaceId: string | null) {
  return useQuery({
    queryKey: ['promotoras', workspaceId],
    queryFn: async (): Promise<Promotora[]> => {
      const { data, error } = await supabase
        .from('promotoras')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('nome', { ascending: true });
      if (error) throw error;
      return data as Promotora[];
    },
    enabled: !!workspaceId,
  });
}

export function useMutationPromotora(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      nome,
      cnpj,
      ativo,
      observacoes,
      action,
    }: {
      id?: number;
      nome?: string;
      cnpj?: string | null;
      ativo?: boolean;
      observacoes?: string | null;
      action: 'create' | 'update';
    }) => {
      if (action === 'create') {
        const { error } = await supabase
          .from('promotoras')
          .insert([{ workspace_id: workspaceId, nome, cnpj, observacoes, ativo: true }]);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('promotoras')
          .update({ nome, cnpj, ativo, observacoes, updated_at: new Date().toISOString() })
          .eq('id', id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['promotoras', workspaceId] });
    },
  });
}

export function useDeletePromotora(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from('promotoras').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['promotoras', workspaceId] });
    },
  });
}

// ---------- Usuários de Banco ----------
export interface UsuarioBanco {
  id: number;
  workspace_id: number;
  banco_id: number;
  promotora_id: number | null;
  login: string;
  senha_ref: string | null;
  ativo: boolean;
  observacoes: string | null;
  created_at: string;
  bancos_ativos?: { nome: string } | null;
  promotoras?: { nome: string } | null;
}

export function useUsuariosBanco(workspaceId: string | null) {
  return useQuery({
    queryKey: ['usuarios_banco', workspaceId],
    queryFn: async (): Promise<UsuarioBanco[]> => {
      const { data, error } = await supabase
        .from('usuarios_banco')
        .select('*, bancos_ativos(nome), promotoras(nome)')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as UsuarioBanco[];
    },
    enabled: !!workspaceId,
  });
}

export function useMutationUsuarioBanco(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      banco_id,
      promotora_id,
      login,
      senha_ref,
      ativo,
      observacoes,
      action,
    }: {
      id?: number;
      banco_id?: number;
      promotora_id?: number | null;
      login?: string;
      senha_ref?: string | null;
      ativo?: boolean;
      observacoes?: string | null;
      action: 'create' | 'update';
    }) => {
      if (action === 'create') {
        const { error } = await supabase.from('usuarios_banco').insert([
          {
            workspace_id: workspaceId,
            banco_id,
            promotora_id: promotora_id ?? null,
            login,
            senha_ref,
            observacoes,
            ativo: true,
          },
        ]);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('usuarios_banco')
          .update({ banco_id, promotora_id, login, senha_ref, ativo, observacoes, updated_at: new Date().toISOString() })
          .eq('id', id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['usuarios_banco', workspaceId] });
    },
  });
}

export function useDeleteUsuarioBanco(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from('usuarios_banco').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['usuarios_banco', workspaceId] });
    },
  });
}

// ---------- Produtos ----------
export interface Produto {
  id: number;
  workspace_id: number;
  nome: string;
  ativo: boolean;
  observacoes: string | null;
  created_at: string;
}

export function useProdutos(workspaceId: string | null) {
  return useQuery({
    queryKey: ['produtos', workspaceId],
    queryFn: async (): Promise<Produto[]> => {
      const { data, error } = await supabase
        .from('produtos')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('nome', { ascending: true });
      if (error) throw error;
      return data as Produto[];
    },
    enabled: !!workspaceId,
  });
}

export function useProdutosAtivos(workspaceId: string | null) {
  return useQuery({
    queryKey: ['produtos_ativos', workspaceId],
    queryFn: async (): Promise<Produto[]> => {
      const { data, error } = await supabase
        .from('produtos')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('ativo', true)
        .order('nome', { ascending: true });
      if (error) throw error;
      return data as Produto[];
    },
    enabled: !!workspaceId,
  });
}

export function useMutationProduto(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      nome,
      ativo,
      observacoes,
      action,
    }: {
      id?: number;
      nome?: string;
      ativo?: boolean;
      observacoes?: string | null;
      action: 'create' | 'update' | 'delete';
    }) => {
      if (action === 'create') {
        const { error } = await supabase
          .from('produtos')
          .insert([{ workspace_id: workspaceId, nome, observacoes, ativo: true }]);
        if (error) throw error;
      } else if (action === 'update') {
        const { error } = await supabase
          .from('produtos')
          .update({ nome, ativo, observacoes, updated_at: new Date().toISOString() })
          .eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('produtos').delete().eq('id', id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['produtos', workspaceId] });
      qc.invalidateQueries({ queryKey: ['produtos_ativos', workspaceId] });
    },
  });
}

// ---------- Convênios (com prazo máximo, usado no cadastro de proposta) ----------
export interface ConvenioNegocio {
  id: number;
  workspace_id: number;
  nome: string;
  ativo: boolean;
  motivo_inativo: string | null;
  prazo_maximo_meses: number | null;
  created_at: string;
}

export function useConveniosNegocio(workspaceId: string | null) {
  return useQuery({
    queryKey: ['convenios_negocio', workspaceId],
    queryFn: async (): Promise<ConvenioNegocio[]> => {
      const { data, error } = await supabase
        .from('convenios')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('nome', { ascending: true });
      if (error) throw error;
      return data as ConvenioNegocio[];
    },
    enabled: !!workspaceId,
  });
}

export function useConveniosNegocioAtivos(workspaceId: string | null) {
  return useQuery({
    queryKey: ['convenios_negocio_ativos', workspaceId],
    queryFn: async (): Promise<ConvenioNegocio[]> => {
      const { data, error } = await supabase
        .from('convenios')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('ativo', true)
        .order('nome', { ascending: true });
      if (error) throw error;
      return data as ConvenioNegocio[];
    },
    enabled: !!workspaceId,
  });
}

export function useMutationConvenioNegocio(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      nome,
      ativo,
      motivo_inativo,
      prazo_maximo_meses,
      action,
    }: {
      id?: number;
      nome?: string;
      ativo?: boolean;
      motivo_inativo?: string | null;
      prazo_maximo_meses?: number | null;
      action: 'create' | 'update' | 'delete';
    }) => {
      if (action === 'create') {
        const { error } = await supabase
          .from('convenios')
          .insert([{ workspace_id: workspaceId, nome, prazo_maximo_meses: prazo_maximo_meses ?? null, ativo: true }]);
        if (error) throw error;
      } else if (action === 'update') {
        const { error } = await supabase
          .from('convenios')
          .update({
            nome,
            ativo,
            motivo_inativo: ativo ? null : motivo_inativo,
            prazo_maximo_meses,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('convenios').delete().eq('id', id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['convenios_negocio', workspaceId] });
      qc.invalidateQueries({ queryKey: ['convenios_negocio_ativos', workspaceId] });
    },
  });
}

// ---------- Parâmetros de Simulação (versionado por banco) ----------
export interface ParametroSimulacao {
  id: number;
  workspace_id: number;
  banco_id: number;
  coef_emprestimo: number | null;
  coef_cartao: number | null;
  taxa_portabilidade_perc: number | null;
  taxa_refin_perc: number | null;
  prazo_maximo_meses: number | null;
  vigente_desde: string;
  ativo: boolean;
  created_at: string;
}

export function useParametrosSimulacao(workspaceId: string | null) {
  return useQuery({
    queryKey: ['parametros_simulacao', workspaceId],
    queryFn: async (): Promise<ParametroSimulacao[]> => {
      const { data, error } = await supabase
        .from('parametros_simulacao')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('banco_id', { ascending: true })
        .order('vigente_desde', { ascending: false });
      if (error) throw error;
      return data as ParametroSimulacao[];
    },
    enabled: !!workspaceId,
  });
}

// Versionamento: cria novo registro vigente e desativa o(s) anterior(es) do mesmo banco.
export function useMutationParametroSimulacao(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      banco_id: number;
      coef_emprestimo: number | null;
      coef_cartao: number | null;
      taxa_portabilidade_perc: number | null;
      taxa_refin_perc: number | null;
      prazo_maximo_meses: number | null;
    }) => {
      const { error: deactivateError } = await supabase
        .from('parametros_simulacao')
        .update({ ativo: false })
        .eq('workspace_id', workspaceId)
        .eq('banco_id', params.banco_id)
        .eq('ativo', true);
      if (deactivateError) throw deactivateError;

      const { error } = await supabase.from('parametros_simulacao').insert([
        {
          workspace_id: workspaceId,
          banco_id: params.banco_id,
          coef_emprestimo: params.coef_emprestimo,
          coef_cartao: params.coef_cartao,
          taxa_portabilidade_perc: params.taxa_portabilidade_perc,
          taxa_refin_perc: params.taxa_refin_perc,
          prazo_maximo_meses: params.prazo_maximo_meses,
          vigente_desde: new Date().toISOString().slice(0, 10),
          ativo: true,
        },
      ]);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['parametros_simulacao', workspaceId] });
    },
  });
}

// ---------- Config de Crédito (defaults globais por workspace) ----------
export interface ConfigCredito {
  id: number;
  workspace_id: number;
  coef_emprestimo: number;
  coef_cartao: number;
  taxa_refin_nova_perc: number;
  prazo_refin_novo_meses: number;
  percentual_variacao_troco: number;
  limite_minimo_valor_contrato: number;
  limite_minimo_parcela: number;
  limite_minimo_prazo: number;
  min_valor_emprestimo_novo: number;
  min_valor_cartao: number;
  min_valor_novo_contrato_portabilidade: number;
  troco_minimo_multiplo: number;
  updated_at: string;
}

export function useConfigCredito(workspaceId: string | null) {
  return useQuery({
    queryKey: ['config_credito', workspaceId],
    queryFn: async (): Promise<ConfigCredito | null> => {
      const { data, error } = await supabase
        .from('config_credito')
        .select('*')
        .eq('workspace_id', workspaceId)
        .maybeSingle();
      if (error) throw error;
      return data as ConfigCredito | null;
    },
    enabled: !!workspaceId,
  });
}

export function useMutationConfigCredito(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (updates: Partial<ConfigCredito>) => {
      const { error } = await supabase
        .from('config_credito')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('workspace_id', workspaceId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['config_credito', workspaceId] });
    },
  });
}

// ---------- Config do Agente IA ----------
export interface ConfigAgente {
  id: number;
  workspace_id: number;
  enabled: boolean;
  nome_agente: string;
  assinatura: string;
  persona_prompt: string | null;
  provider: string;
  modelo: string;
  max_chamadas_dia: number;
  max_chamadas_conversa: number;
  debounce_segundos: number;
  horario_inicio: string | null;
  horario_fim: string | null;
  updated_at: string;
}

export function useConfigAgente(workspaceId: string | null) {
  return useQuery({
    queryKey: ['config_agente', workspaceId],
    queryFn: async (): Promise<ConfigAgente | null> => {
      const { data, error } = await supabase
        .from('config_agente')
        .select('*')
        .eq('workspace_id', workspaceId)
        .maybeSingle();
      if (error) throw error;
      return data as ConfigAgente | null;
    },
    enabled: !!workspaceId,
  });
}

export function useMutationConfigAgente(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (updates: Partial<ConfigAgente>) => {
      const { error } = await supabase
        .from('config_agente')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('workspace_id', workspaceId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['config_agente', workspaceId] });
    },
  });
}

// ---------- Atividade do Agente Hoje (timeline_events) ----------
export interface AtividadeAgenteHoje {
  chamadasIa: number;
  msgIn: number;
  erros: { id: number; titulo: string | null; payload: unknown; created_at: string }[];
}

export function useAtividadeAgenteHoje(workspaceId: string | null) {
  return useQuery({
    queryKey: ['atividade_agente_hoje', workspaceId],
    queryFn: async (): Promise<AtividadeAgenteHoje> => {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const isoStart = startOfDay.toISOString();

      const [{ count: chamadasIa, error: e1 }, { count: msgIn, error: e2 }, { data: errosData, error: e3 }] =
        await Promise.all([
          supabase
            .from('timeline_events')
            .select('id', { count: 'exact', head: true })
            .eq('workspace_id', workspaceId)
            .eq('tipo', 'chamada_ia')
            .gte('created_at', isoStart),
          supabase
            .from('timeline_events')
            .select('id', { count: 'exact', head: true })
            .eq('workspace_id', workspaceId)
            .eq('tipo', 'msg_in')
            .gte('created_at', isoStart),
          supabase
            .from('timeline_events')
            .select('id, titulo, payload, created_at')
            .eq('workspace_id', workspaceId)
            .eq('tipo', 'erro_agente')
            .gte('created_at', isoStart)
            .order('created_at', { ascending: false })
            .limit(3),
        ]);
      if (e1) throw e1;
      if (e2) throw e2;
      if (e3) throw e3;

      return {
        chamadasIa: chamadasIa ?? 0,
        msgIn: msgIn ?? 0,
        erros: (errosData ?? []) as AtividadeAgenteHoje['erros'],
      };
    },
    enabled: !!workspaceId,
    refetchInterval: 60_000,
  });
}
