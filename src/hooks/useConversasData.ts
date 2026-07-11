// src/hooks/useConversasData.ts
// Dados do cockpit de Conversas: lista (RPC), thread (query direta), realtime e envio.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Conversation } from './useCrmData';

export interface ChatRow {
  id: number;
  session_id: string;
  message: unknown;
  direction: 'in' | 'out' | null;
  status: string | null;
  created_at: string;
  workspace_id: string | number;
}

export interface ContactLite {
  id: number;
  phone_number: string | null;
  nome: string | null;
  departamento: string | null;
  status: string | null;
  pause_ai: boolean | null;
  workspace_id: string | number;
}

// ---------- Lista de conversas (RPC existente) + join manual com contacts ----------
export function useConversationsList(workspaceId: string | null) {
  const conversations = useQuery({
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

  const contacts = useQuery({
    queryKey: ['contacts_lite', workspaceId],
    queryFn: async (): Promise<ContactLite[]> => {
      const { data, error } = await supabase
        .from('contacts')
        .select('id, phone_number, nome, departamento, status, pause_ai, workspace_id')
        .eq('workspace_id', workspaceId);
      if (error) throw error;
      return (data ?? []) as ContactLite[];
    },
    enabled: !!workspaceId,
  });

  const contactsByPhone = useMemo(() => {
    const map = new Map<string, ContactLite>();
    for (const c of contacts.data ?? []) {
      if (c.phone_number) map.set(c.phone_number, c);
    }
    return map;
  }, [contacts.data]);

  const merged = useMemo(() => {
    return (conversations.data ?? []).map((c) => ({
      ...c,
      contact: contactsByPhone.get(c.session_id) ?? null,
    }));
  }, [conversations.data, contactsByPhone]);

  return {
    data: merged,
    isLoading: conversations.isLoading || contacts.isLoading,
    isError: conversations.isError || contacts.isError,
    error: conversations.error || contacts.error,
  };
}

// ---------- Thread de uma conversa (chats por session_id) ----------
export function useChatThread(workspaceId: string | null, sessionId: string | null) {
  return useQuery({
    queryKey: ['chat_thread', workspaceId, sessionId],
    queryFn: async (): Promise<ChatRow[]> => {
      const { data, error } = await supabase
        .from('chats')
        .select('id, session_id, message, direction, status, created_at, workspace_id')
        .eq('workspace_id', workspaceId)
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as ChatRow[];
    },
    enabled: !!workspaceId && !!sessionId,
  });
}

// ---------- Realtime: novas mensagens em chats ----------
export function useChatsRealtime(workspaceId: string | null, activeSessionId: string | null) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!workspaceId) return;
    const channel = supabase
      .channel('chats-rt')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chats' },
        (payload) => {
          const row = payload.new as ChatRow;
          if (String(row.workspace_id) !== String(workspaceId)) return;
          qc.invalidateQueries({ queryKey: ['conversations', workspaceId] });
          if (activeSessionId && row.session_id === activeSessionId) {
            qc.invalidateQueries({ queryKey: ['chat_thread', workspaceId, activeSessionId] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workspaceId, activeSessionId, qc]);
}

// ---------- Toggle "Aurus responde" (contacts.pause_ai) ----------
export function useTogglePauseAi(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ contactId, pauseAi }: { contactId: number; pauseAi: boolean }) => {
      const { error } = await supabase
        .from('contacts')
        .update({ pause_ai: pauseAi })
        .eq('id', contactId);
      if (error) throw error;
    },
    onMutate: async ({ contactId, pauseAi }) => {
      await qc.cancelQueries({ queryKey: ['contacts_lite', workspaceId] });
      const previous = qc.getQueryData<ContactLite[]>(['contacts_lite', workspaceId]);
      if (previous) {
        qc.setQueryData<ContactLite[]>(
          ['contacts_lite', workspaceId],
          previous.map((c) => (c.id === contactId ? { ...c, pause_ai: pauseAi } : c))
        );
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData(['contacts_lite', workspaceId], context.previous);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['contacts_lite', workspaceId] });
    },
  });
}

// ---------- Envio de mensagem (send-whatsapp function) com optimistic update ----------
export function useSendMessage(workspaceId: string | null, sessionId: string | null) {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (text: string) => {
      const { data, error } = await supabase.functions.invoke('send-whatsapp', {
        body: {
          workspace_id: workspaceId,
          phone: sessionId,
          body: text,
          actor: user ? `user:${user.id}` : 'user:unknown',
        },
      });
      if (error) throw error;
      return data;
    },
    onMutate: async (text: string) => {
      await qc.cancelQueries({ queryKey: ['chat_thread', workspaceId, sessionId] });
      const previous = qc.getQueryData<ChatRow[]>(['chat_thread', workspaceId, sessionId]);
      const optimisticRow: ChatRow = {
        id: -Date.now(),
        session_id: sessionId ?? '',
        message: { type: 'human', content: text },
        direction: 'out',
        status: 'sending',
        created_at: new Date().toISOString(),
        workspace_id: workspaceId ?? '',
      };
      qc.setQueryData<ChatRow[]>(['chat_thread', workspaceId, sessionId], [
        ...(previous ?? []),
        optimisticRow,
      ]);
      return { previous, optimisticId: optimisticRow.id };
    },
    onError: (_err, _text, context) => {
      if (!context) return;
      qc.setQueryData<ChatRow[]>(['chat_thread', workspaceId, sessionId], (curr) =>
        (curr ?? []).map((row) =>
          row.id === context.optimisticId ? { ...row, status: 'failed' } : row
        )
      );
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['chat_thread', workspaceId, sessionId] });
      qc.invalidateQueries({ queryKey: ['conversations', workspaceId] });
    },
  });
}

// ---------- Auto-scroll helper ----------
export function useAutoScrollToBottom<T>(dep: T) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollIntoView({ block: 'end' });
  }, [dep]);
  return ref;
}
