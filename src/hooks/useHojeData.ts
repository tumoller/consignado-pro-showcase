// src/hooks/useHojeData.ts
// Hooks para a seção "Hoje" (fila de trabalho) e Meta do mês no Index.
import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

const isPagaStatus = (s: string | null | undefined) => (s ?? '').toLowerCase().trim().startsWith('pag');
const isCanceladaStatus = (s: string | null | undefined) => (s ?? '').toLowerCase().trim().startsWith('canc');

// ---------- Follow-ups de hoje/vencidos ----------
export interface FollowUpHoje {
  id: number;
  titulo: string | null;
  due_at: string | null;
  vencido: boolean;
  contact_nome: string | null;
}

export function useFollowUpsHoje(workspaceId: string | null) {
  return useQuery({
    queryKey: ['hoje_follow_ups', workspaceId],
    queryFn: async (): Promise<FollowUpHoje[]> => {
      const fimDoDia = new Date();
      fimDoDia.setHours(23, 59, 59, 999);
      const agora = new Date();
      const { data, error } = await supabase
        .from('follow_ups')
        .select('id, titulo, due_at, status, contacts(nome)')
        .eq('workspace_id', workspaceId)
        .neq('status', 'done')
        .lte('due_at', fimDoDia.toISOString())
        .order('due_at', { ascending: true })
        .limit(50);
      if (error) throw error;
      return (data ?? []).map((f: any) => ({
        id: f.id,
        titulo: f.titulo,
        due_at: f.due_at,
        vencido: f.due_at ? new Date(f.due_at) < agora : false,
        contact_nome: f.contacts?.nome ?? null,
      }));
    },
    enabled: !!workspaceId,
  });
}

// ---------- Leads aguardando resposta ----------
export interface LeadAguardando {
  session_id: string;
  contact_nome: string | null;
  preview: string;
  created_at: string;
}

const chatMessagePreview = (m: unknown): string => {
  if (m == null) return '';
  if (typeof m === 'string') return m;
  if (typeof m === 'object') {
    const obj = m as Record<string, unknown>;
    if (typeof obj.content === 'string') return obj.content;
    if (typeof obj.text === 'string') return obj.text;
    if (typeof obj.message === 'string') return obj.message;
  }
  return '';
};

export function useLeadsAguardando(workspaceId: string | null) {
  return useQuery({
    queryKey: ['hoje_leads_aguardando', workspaceId],
    queryFn: async (): Promise<LeadAguardando[]> => {
      const { data, error } = await supabase
        .from('chats')
        .select('session_id, direction, created_at, message')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(300);
      if (error) throw error;

      const bySession = new Map<string, any>();
      for (const r of data ?? []) {
        if (!bySession.has(r.session_id)) bySession.set(r.session_id, r);
      }
      const limite48h = Date.now() - 48 * 60 * 60 * 1000;
      const sessoesAguardando: LeadAguardando[] = [];
      for (const [session_id, r] of bySession) {
        if (r.direction !== 'in') continue;
        const t = new Date(r.created_at).getTime();
        if (isNaN(t) || t < limite48h) continue;
        sessoesAguardando.push({
          session_id,
          contact_nome: null,
          preview: chatMessagePreview(r.message).slice(0, 100),
          created_at: r.created_at,
        });
      }
      sessoesAguardando.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      // Busca nomes dos contatos correspondentes (telefone = session_id)
      if (sessoesAguardando.length > 0) {
        const phones = sessoesAguardando.map((s) => s.session_id);
        const { data: contatos } = await supabase
          .from('contacts')
          .select('nome, phone_number')
          .eq('workspace_id', workspaceId)
          .in('phone_number', phones);
        const nomeByPhone = new Map((contatos ?? []).map((c: any) => [c.phone_number, c.nome]));
        for (const s of sessoesAguardando) {
          s.contact_nome = nomeByPhone.get(s.session_id) ?? null;
        }
      }

      return sessoesAguardando;
    },
    enabled: !!workspaceId,
  });
}

// ---------- Propostas paradas ----------
export interface PropostaParada {
  id: number;
  contact_nome: string | null;
  bco_op: string | null;
  status: string | null;
  dias_parado: number;
}

export function usePropostasParadas(workspaceId: string | null) {
  return useQuery({
    queryKey: ['hoje_propostas_paradas', workspaceId],
    queryFn: async (): Promise<PropostaParada[]> => {
      const seteDiasAtras = new Date();
      seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);
      const { data, error } = await supabase
        .from('propostas')
        .select('id, status, bco_op, updated_at, contacts(nome)')
        .eq('workspace_id', workspaceId)
        .lte('updated_at', seteDiasAtras.toISOString())
        .order('updated_at', { ascending: true })
        .limit(200);
      if (error) throw error;
      const agora = Date.now();
      return (data ?? [])
        .filter((p: any) => !isPagaStatus(p.status) && !isCanceladaStatus(p.status))
        .map((p: any) => ({
          id: p.id,
          contact_nome: p.contacts?.nome ?? null,
          bco_op: p.bco_op,
          status: p.status,
          dias_parado: p.updated_at ? Math.floor((agora - new Date(p.updated_at).getTime()) / (1000 * 60 * 60 * 24)) : 0,
        }));
    },
    enabled: !!workspaceId,
  });
}

// ---------- Aniversariantes do mês ----------
export interface AniversarianteMes {
  id: number;
  nome: string | null;
  dia: number;
}

export function useAniversariantesMes(workspaceId: string | null) {
  return useQuery({
    queryKey: ['hoje_aniversariantes', workspaceId],
    queryFn: async (): Promise<AniversarianteMes[]> => {
      const { data, error } = await supabase
        .from('contacts')
        .select('id, nome, data_nasc')
        .eq('workspace_id', workspaceId)
        .not('data_nasc', 'is', null)
        .limit(2000);
      if (error) throw error;
      const mesAtual = new Date().getMonth() + 1;
      return (data ?? [])
        .map((c: any) => {
          const d = new Date(c.data_nasc);
          return { id: c.id, nome: c.nome, mes: d.getMonth() + 1, dia: d.getDate() };
        })
        .filter((c) => c.mes === mesAtual)
        .sort((a, b) => a.dia - b.dia)
        .map((c) => ({ id: c.id, nome: c.nome, dia: c.dia }));
    },
    enabled: !!workspaceId,
  });
}

// ---------- Meta do mês ----------
export interface Meta {
  workspace_id: string;
  mes: string; // YYYY-MM-01
  meta_volume: number | null;
  meta_comissao: number | null;
  meta_fechamentos: number | null;
}

const primeiroDiaMesAtual = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};

export function useMetaMesAtual(workspaceId: string | null) {
  return useQuery({
    queryKey: ['meta_mes_atual', workspaceId],
    queryFn: async (): Promise<Meta | null> => {
      const { data, error } = await supabase
        .from('metas')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('mes', primeiroDiaMesAtual())
        .maybeSingle();
      if (error) throw error;
      return data as Meta | null;
    },
    enabled: !!workspaceId,
  });
}

export function useUpsertMeta(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vals: { meta_volume: number; meta_comissao: number; meta_fechamentos: number }) => {
      const { error } = await supabase
        .from('metas')
        .upsert(
          {
            workspace_id: workspaceId,
            mes: primeiroDiaMesAtual(),
            ...vals,
          },
          { onConflict: 'workspace_id,mes' }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meta_mes_atual', workspaceId] });
    },
  });
}

// ---------- Realizado do mês (para o MetaWidget) ----------
export interface RealizadoMes {
  comissao: number;
  volume: number;
  fechamentos: number;
}

export function useRealizadoMesAtual(workspaceId: string | null) {
  return useQuery({
    queryKey: ['realizado_mes_atual', workspaceId],
    queryFn: async (): Promise<RealizadoMes> => {
      const inicioMes = new Date();
      inicioMes.setDate(1);
      inicioMes.setHours(0, 0, 0, 0);
      const { data, error } = await supabase
        .from('propostas')
        .select('status, saldo, comissao, updated_at')
        .eq('workspace_id', workspaceId)
        .gte('updated_at', inicioMes.toISOString())
        .limit(2000);
      if (error) throw error;
      const pagas = (data ?? []).filter((p: any) => isPagaStatus(p.status));
      return {
        comissao: pagas.reduce((acc: number, p: any) => acc + (Number(p.comissao) || 0), 0),
        volume: pagas.reduce((acc: number, p: any) => acc + (Number(p.saldo) || 0), 0),
        fechamentos: pagas.length,
      };
    },
    enabled: !!workspaceId,
  });
}

// ---------- Timeline de um contato (timeline_events + simulations) ----------
export interface TimelineItem {
  id: string;
  tipo: string;
  titulo: string | null;
  payload: any;
  actor: string | null;
  created_at: string;
}

export function useContactTimeline(contactId: number | null) {
  return useQuery({
    queryKey: ['contact_timeline', contactId],
    queryFn: async (): Promise<TimelineItem[]> => {
      const [{ data: events, error: e1 }, { data: sims, error: e2 }] = await Promise.all([
        supabase
          .from('timeline_events')
          .select('*')
          .eq('contact_id', contactId)
          .order('created_at', { ascending: false })
          .limit(200),
        supabase
          .from('simulations')
          .select('*')
          .eq('contact_id', contactId)
          .order('created_at', { ascending: false })
          .limit(100),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;

      const eventItems: TimelineItem[] = (events ?? []).map((e: any) => ({
        id: `event-${e.id}`,
        tipo: e.tipo,
        titulo: e.titulo,
        payload: e.payload,
        actor: e.actor,
        created_at: e.created_at,
      }));

      // simulações já registradas como timeline_events (tipo 'simulacao') não duplicam
      const simIdsNoEvento = new Set(
        (events ?? [])
          .filter((e: any) => e.tipo === 'simulacao' && e.payload?.simulation_id != null)
          .map((e: any) => String(e.payload.simulation_id))
      );

      const simItems: TimelineItem[] = (sims ?? [])
        .filter((s: any) => !simIdsNoEvento.has(String(s.id)))
        .map((s: any) => ({
          id: `sim-${s.id}`,
          tipo: 'simulacao',
          titulo: null,
          payload: s.result_data ? { ...s.result_data, valor_total_disponivel: s.valor_total_disponivel } : { valor_total_disponivel: s.valor_total_disponivel },
          actor: 'aurus',
          created_at: s.created_at,
        }));

      return [...eventItems, ...simItems].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    },
    enabled: !!contactId,
  });
}
