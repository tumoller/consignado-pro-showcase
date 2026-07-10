// src/hooks/useCrmData.ts
// Hooks de dados reais do CRM (Supabase + TanStack Query)
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

// ---------- Tipos ----------
export interface Contact {
  id: number;
  nome: string | null;
  cpf: string | null;
  phone_number: string | null;
  email: string | null;
  status: string | null;
  qualificacao: string | null;
  convenio: string | null;
  aquisicao: string | null;
  esp_benef: string | null;
  nb_mat: string | null;
  orgao_siape: string | null;
  recebimento_beneficio: string | null;
  banco: string | null;
  agencia: string | null;
  conta: string | null;
  rg: string | null;
  data_nasc: string | null;
  nome_mae: string | null;
  nome_pai: string | null;
  nome_rep_legal: string | null;
  cpf_rep_legal: string | null;
  rua: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  cep: string | null;
  lembrete_op: string | null;
  contexto_conversa: string | null;
  resumo_emprestimos: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface Proposta {
  id: number;
  contact_id: number | null;
  produto: string | null;
  operacao: string | null;
  bco_op: string | null;
  bco_port: string | null;
  status: string | null;
  sub_status: string | null;
  saldo: number | null;
  cms_pct: number | null;
  comissao: number | null;
  parcela: number | null;
  parcela_reduzida: number | null;
  qtde_parc: number | null;
  taxa: number | null;
  num_proposta: string | null;
  num_contrato: string | null;
  data_cip_averb: string | null;
  promotora: string | null;
  created_at: string;
  updated_at: string | null;
  contacts?: { nome: string | null; cpf: string | null } | null;
}

export interface FollowUp {
  id: number;
  contact_id: number | null;
  proposta_id: number | null;
  tipo: string | null;
  titulo: string | null;
  mensagem: string | null;
  due_at: string | null;
  status: string | null;
  canal: string | null;
  regra: string | null;
  done_at: string | null;
  created_at: string;
  contacts?: { nome: string | null; phone_number: string | null } | null;
}

export interface Conversation {
  session_id: string;
  last_message: unknown;
  last_message_time: string;
  contact_name: string | null;
}

// ---------- Contatos ----------
export function useContacts(workspaceId: string | null, search = '') {
  return useQuery({
    queryKey: ['contacts', workspaceId, search],
    queryFn: async (): Promise<Contact[]> => {
      let q = supabase
        .from('contacts')
        .select('id, nome, cpf, phone_number, email, status, qualificacao, convenio, aquisicao, cidade, uf, lembrete_op, created_at')
        .eq('workspace_id', workspaceId)
        .order('nome', { ascending: true, nullsFirst: false })
        .limit(500);
      if (search.trim()) {
        const s = search.trim();
        q = q.or(`nome.ilike.%${s}%,cpf.ilike.%${s}%,phone_number.ilike.%${s}%`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data as Contact[];
    },
    enabled: !!workspaceId,
  });
}

export function useContactDetail(contactId: number | null) {
  return useQuery({
    queryKey: ['contact', contactId],
    queryFn: async () => {
      const [{ data: contact, error: e1 }, { data: propostas, error: e2 }] = await Promise.all([
        supabase.from('contacts').select('*').eq('id', contactId).single(),
        supabase
          .from('propostas')
          .select('*')
          .eq('contact_id', contactId)
          .order('data_cip_averb', { ascending: false, nullsFirst: false }),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      return { contact: contact as Contact, propostas: (propostas ?? []) as Proposta[] };
    },
    enabled: !!contactId,
  });
}

// ---------- Propostas ----------
export function usePropostas(workspaceId: string | null) {
  return useQuery({
    queryKey: ['propostas', workspaceId],
    queryFn: async (): Promise<Proposta[]> => {
      const { data, error } = await supabase
        .from('propostas')
        .select('*, contacts(nome, cpf)')
        .eq('workspace_id', workspaceId)
        .order('data_cip_averb', { ascending: false, nullsFirst: false })
        .limit(1000);
      if (error) throw error;
      return data as Proposta[];
    },
    enabled: !!workspaceId,
  });
}

// ---------- Follow-ups ----------
export function useFollowUps(workspaceId: string | null) {
  return useQuery({
    queryKey: ['follow_ups', workspaceId],
    queryFn: async (): Promise<FollowUp[]> => {
      const { data, error } = await supabase
        .from('follow_ups')
        .select('*, contacts(nome, phone_number)')
        .eq('workspace_id', workspaceId)
        .order('due_at', { ascending: true, nullsFirst: false })
        .limit(500);
      if (error) throw error;
      return data as FollowUp[];
    },
    enabled: !!workspaceId,
  });
}

export function useToggleFollowUp(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, done }: { id: number; done: boolean }) => {
      const { error } = await supabase
        .from('follow_ups')
        .update({
          status: done ? 'done' : 'pending',
          done_at: done ? new Date().toISOString() : null,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['follow_ups', workspaceId] });
    },
  });
}

// ---------- Conversas (RPC existente) ----------
export function useConversations(workspaceId: string | null) {
  return useQuery({
    queryKey: ['conversations', workspaceId],
    queryFn: async (): Promise<Conversation[]> => {
      const { data, error } = await supabase.rpc('get_workspace_conversations', {
        p_workspace_id: Number(workspaceId),
      });
      if (error) throw error;
      return (data ?? []) as Conversation[];
    },
    enabled: !!workspaceId,
  });
}

// ---------- Mutações CRUD de Contatos ----------
export function useCreateContact(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (contact: Omit<Contact, 'id' | 'created_at'>) => {
      const { error } = await supabase
        .from('contacts')
        .insert({ ...contact, workspace_id: workspaceId });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contacts', workspaceId] });
    },
  });
}

export function useUpdateContact(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Contact> & { id: number }) => {
      const { error } = await supabase
        .from('contacts')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['contacts', workspaceId] });
      qc.invalidateQueries({ queryKey: ['contact', variables.id] });
    },
  });
}

// ---------- Mutações CRUD de Propostas ----------
export function useCreateProposta(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (proposta: Omit<Proposta, 'id' | 'created_at' | 'comissao'>) => {
      const { error } = await supabase
        .from('propostas')
        .insert({ ...proposta, workspace_id: workspaceId });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['propostas', workspaceId] });
    },
  });
}

export function useUpdateProposta(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Proposta> & { id: number }) => {
      const { comissao, contacts, ...cleanUpdates } = updates as any;
      const { error } = await supabase
        .from('propostas')
        .update(cleanUpdates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['propostas', workspaceId] });
      if (variables.contact_id) {
        qc.invalidateQueries({ queryKey: ['contact', variables.contact_id] });
      }
    },
  });
}

export function useUpdatePropostaStatus(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const { error } = await supabase
        .from('propostas')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: ['propostas', workspaceId] });
      const previousPropostas = qc.getQueryData<Proposta[]>(['propostas', workspaceId]);

      if (previousPropostas) {
        qc.setQueryData<Proposta[]>(
          ['propostas', workspaceId],
          previousPropostas.map((p) => (p.id === id ? { ...p, status } : p))
        );
      }
      return { previousPropostas };
    },
    onError: (err, variables, context) => {
      if (context?.previousPropostas) {
        qc.setQueryData(['propostas', workspaceId], context.previousPropostas);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['propostas', workspaceId] });
      qc.invalidateQueries({ queryKey: ['contact'] });
    },
  });
}

export function useDeleteProposta(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('propostas')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['propostas', workspaceId] });
      qc.invalidateQueries({ queryKey: ['contact'] });
    },
  });
}

// ---------- Configurações (Bancos, Espécies, Convênios) ----------
export interface BancoAtivo {
  id: number;
  nome: string;
  ativo: boolean;
  created_at: string;
}

export function useBancosAtivos() {
  return useQuery({
    queryKey: ['bancos_ativos'],
    queryFn: async (): Promise<BancoAtivo[]> => {
      const { data, error } = await supabase
        .from('bancos_ativos')
        .select('*')
        .order('nome', { ascending: true });
      if (error) throw error;
      return data as BancoAtivo[];
    },
  });
}

export function useMutationBanco() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, nome, ativo, action }: { id?: number; nome?: string; ativo?: boolean; action: 'create' | 'update' | 'delete' }) => {
      if (action === 'create') {
        const { error } = await supabase.from('bancos_ativos').insert([{ nome, ativo: true }]);
        if (error) throw error;
      } else if (action === 'update') {
        const { error } = await supabase.from('bancos_ativos').update({ nome, ativo }).eq('id', id);
        if (error) throw error;
      } else if (action === 'delete') {
        const { error } = await supabase.from('bancos_ativos').delete().eq('id', id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bancos_ativos'] });
    },
  });
}

export interface EspecieAtiva {
  id: number;
  codigo: string;
  descricao: string;
  ativo: boolean;
  created_at: string;
}

export function useEspeciesAtivas() {
  return useQuery({
    queryKey: ['especies_ativas'],
    queryFn: async (): Promise<EspecieAtiva[]> => {
      const { data, error } = await supabase
        .from('especies_ativas')
        .select('*')
        .order('codigo', { ascending: true });
      if (error) throw error;
      return data as EspecieAtiva[];
    },
  });
}

export function useMutationEspecie() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, codigo, descricao, ativo, action }: { id?: number; codigo?: string; descricao?: string; ativo?: boolean; action: 'create' | 'update' | 'delete' }) => {
      if (action === 'create') {
        const { error } = await supabase.from('especies_ativas').insert([{ codigo, descricao, ativo: true }]);
        if (error) throw error;
      } else if (action === 'update') {
        const { error } = await supabase.from('especies_ativas').update({ codigo, descricao, ativo }).eq('id', id);
        if (error) throw error;
      } else if (action === 'delete') {
        const { error } = await supabase.from('especies_ativas').delete().eq('id', id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['especies_ativas'] });
    },
  });
}

export interface ConvenioAtivo {
  id: number;
  convenio: string;
  ativo: boolean;
  observacao: string | null;
  created_at: string;
}

export function useConveniosAtivos() {
  return useQuery({
    queryKey: ['convenios_ativos'],
    queryFn: async (): Promise<ConvenioAtivo[]> => {
      const { data, error } = await supabase
        .from('convenios_ativos')
        .select('*')
        .order('convenio', { ascending: true });
      if (error) throw error;
      return data as ConvenioAtivo[];
    },
  });
}

export function useMutationConvenio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, convenio, ativo, observacao, action }: { id?: number; convenio?: string; ativo?: boolean; observacao?: string | null; action: 'create' | 'update' | 'delete' }) => {
      if (action === 'create') {
        const { error } = await supabase.from('convenios_ativos').insert([{ convenio, ativo: true, observacao }]);
        if (error) throw error;
      } else if (action === 'update') {
        const { error } = await supabase.from('convenios_ativos').update({ convenio, ativo, observacao }).eq('id', id);
        if (error) throw error;
      } else if (action === 'delete') {
        const { error } = await supabase.from('convenios_ativos').delete().eq('id', id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['convenios_ativos'] });
    },
  });
}

// ---------- Helpers de formatação ----------
export const fmtBRL = (v: number | null | undefined) =>
  v == null
    ? '—'
    : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

export const fmtDate = (d: string | null | undefined) => {
  if (!d) return '—';
  const date = new Date(d.length === 10 ? d + 'T00:00:00' : d);
  return isNaN(date.getTime()) ? '—' : date.toLocaleDateString('pt-BR');
};

export const fmtDateTime = (d: string | null | undefined) => {
  if (!d) return '—';
  const date = new Date(d);
  return isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString('pt-BR') + ' ' + date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

export const fmtCpf = (c: string | null | undefined) => {
  if (!c) return '—';
  const d = c.replace(/\D/g, '');
  if (d.length !== 11) return c;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
};

export const fmtPhone = (p: string | null | undefined) => {
  if (!p) return '—';
  if (p.startsWith('notion:') || p.startsWith('venda:')) return 'sem telefone';
  const d = p.replace(/\D/g, '');
  const local = d.startsWith('55') ? d.slice(2) : d;
  if (local.length === 11) return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
  if (local.length === 10) return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
  return p;
};

// texto da última mensagem do chat (message é jsonb, formato n8n/langchain)
export const chatMessageText = (m: unknown): string => {
  if (m == null) return '';
  if (typeof m === 'string') return m;
  if (typeof m === 'object') {
    const obj = m as Record<string, unknown>;
    if (typeof obj.content === 'string') return obj.content;
    if (typeof obj.text === 'string') return obj.text;
    if (typeof obj.message === 'string') return obj.message;
  }
  return JSON.stringify(m).slice(0, 120);
};
