// src/components/conversas/ConversationList.tsx
import { Bot, BotOff, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { chatMessageText, fmtPhone } from '@/hooks/useCrmData';
import { ContactLite } from '@/hooks/useConversasData';

export interface ConversationItem {
  session_id: string;
  last_message: unknown;
  last_message_time: string;
  contact_name: string | null;
  contact: ContactLite | null;
}

const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('') || '?';

const relativeTime = (iso: string | null | undefined) => {
  if (!iso) return '';
  const date = new Date(iso);
  if (isNaN(date.getTime())) return '';
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'agora';
  if (diffMin < 60) return `${diffMin}min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}d`;
  return date.toLocaleDateString('pt-BR');
};

const departamentoLabel = (dep: string | null | undefined) => {
  if (!dep) return null;
  const d = dep.toUpperCase().trim();
  if (['INICIAL', 'VENDAS', 'HUMANO'].includes(d)) return d;
  return dep;
};

interface ConversationListProps {
  items: ConversationItem[];
  isLoading: boolean;
  isError: boolean;
  error?: Error | null;
  search: string;
  onSearchChange: (v: string) => void;
  selectedSessionId: string | null;
  onSelect: (sessionId: string) => void;
  hasMore?: boolean;
  onLoadMore?: () => void;
}

export function ConversationList({
  items,
  isLoading,
  isError,
  error,
  search,
  onSearchChange,
  selectedSessionId,
  onSelect,
  hasMore,
  onLoadMore,
}: ConversationListProps) {
  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="p-3.5 border-b border-border shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou telefone..."
            className="pl-9"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label="Buscar conversa"
          />
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : isError ? (
          <div className="p-4 text-sm text-destructive">
            Erro ao carregar conversas: {error?.message}
          </div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            Nenhuma conversa encontrada.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((c) => {
              const name = c.contact_name || c.contact?.nome || fmtPhone(c.session_id);
              const dep = departamentoLabel(c.contact?.departamento);
              const aiPaused = !!c.contact?.pause_ai;
              const selected = selectedSessionId === c.session_id;
              return (
                <li key={c.session_id}>
                  <button
                    type="button"
                    onClick={() => onSelect(c.session_id)}
                    aria-label={`Abrir conversa com ${name}`}
                    className={`w-full text-left flex items-center gap-3 px-3.5 py-3.5 hover:bg-muted/50 transition-colors ${
                      selected ? 'bg-muted' : ''
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold shrink-0 text-sm">
                      {initials(name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium truncate text-sm">{name}</span>
                        <span className="text-[11px] text-muted-foreground shrink-0">
                          {relativeTime(c.last_message_time)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <p className="text-xs text-muted-foreground truncate">
                          {chatMessageText(c.last_message) || '—'}
                        </p>
                        <div className="flex items-center gap-1 shrink-0">
                          {dep && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                              {dep}
                            </Badge>
                          )}
                          {aiPaused ? (
                            <BotOff
                              className="h-3.5 w-3.5 text-muted-foreground"
                              aria-label="IA pausada"
                            />
                          ) : (
                            <Bot className="h-3.5 w-3.5 text-primary" aria-label="IA ativa" />
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {!isLoading && !isError && hasMore && (
          <div className="p-3 flex justify-center">
            <Button variant="ghost" size="sm" onClick={onLoadMore}>
              Carregar mais
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
