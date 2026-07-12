// src/components/conversas/ChatThread.tsx
import { useMemo } from 'react';
import { MessageSquare, AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { chatMessageText } from '@/hooks/useCrmData';
import { ChatRow, useAutoScrollToBottom } from '@/hooks/useConversasData';

interface ChatThreadProps {
  messages: ChatRow[];
  isLoading: boolean;
  isError: boolean;
  error?: Error | null;
}

const dayLabel = (iso: string) => {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (sameDay(date, today)) return 'Hoje';
  if (sameDay(date, yesterday)) return 'Ontem';
  return date.toLocaleDateString('pt-BR');
};

const timeLabel = (iso: string) => {
  const date = new Date(iso);
  return isNaN(date.getTime())
    ? ''
    : date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

const isOutbound = (row: ChatRow) => {
  if (row.direction) return row.direction === 'out';
  const msg = row.message as Record<string, unknown> | null;
  return (msg as any)?.type === 'ai' || (msg as any)?.type === 'human';
};

export function ChatThread({ messages, isLoading, isError, error }: ChatThreadProps) {
  const bottomRef = useAutoScrollToBottom(messages.length);

  const grouped = useMemo(() => {
    const groups: { day: string; rows: ChatRow[] }[] = [];
    for (const row of messages) {
      const day = dayLabel(row.created_at);
      const last = groups[groups.length - 1];
      if (last && last.day === day) {
        last.rows.push(row);
      } else {
        groups.push({ day, rows: [row] });
      }
    }
    return groups;
  }, [messages]);

  if (isLoading) {
    return (
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton
            key={i}
            className={`h-12 w-2/3 rounded-lg ${i % 2 === 0 ? '' : 'ml-auto'}`}
          />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-sm text-destructive">
        Erro ao carregar mensagens: {error?.message}
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground text-sm gap-2">
        <MessageSquare className="h-8 w-8 opacity-50" />
        Nenhuma mensagem ainda.
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-5">
      {grouped.map((group) => (
        <div key={group.day} className="space-y-2.5">
          <div className="flex justify-center">
            <span className="text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {group.day}
            </span>
          </div>
          {group.rows.map((row) => {
            const outbound = isOutbound(row);
            const failed = row.status === 'failed';
            const sending = row.status === 'sending';
            return (
              <div
                key={row.id}
                className={`flex ${outbound ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[75%] rounded-lg px-3 py-2 text-sm break-words ${
                    outbound
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground'
                  } ${failed ? 'opacity-60 border border-destructive' : ''}`}
                >
                  <p className="whitespace-pre-wrap">{chatMessageText(row.message)}</p>
                  <div className="flex items-center justify-end gap-1 mt-1">
                    {failed && <AlertCircle className="h-3 w-3 text-destructive" />}
                    <span
                      className={`text-[10px] ${
                        outbound ? 'text-primary-foreground/70' : 'text-muted-foreground'
                      }`}
                    >
                      {sending ? 'enviando...' : failed ? 'falha ao enviar' : timeLabel(row.created_at)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
