// src/pages/Conversas.tsx — conversas reais do WhatsApp (tabela chats via RPC)
import { useMemo, useState } from 'react';
import { MessageSquare, Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useConversations, chatMessageText, fmtDateTime, fmtPhone } from '@/hooks/useCrmData';

const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('') || '?';

const Conversas = () => {
  const { activeWorkspaceId } = useWorkspace();
  const conversations = useConversations(activeWorkspaceId);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const list = conversations.data ?? [];
    const s = search.trim().toLowerCase();
    if (!s) return list;
    return list.filter(
      (c) =>
        (c.contact_name ?? '').toLowerCase().includes(s) ||
        c.session_id.toLowerCase().includes(s)
    );
  }, [conversations.data, search]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Conversas</h1>
        <p className="text-muted-foreground mt-1">
          {conversations.data
            ? `${conversations.data.length} conversas no WhatsApp`
            : 'Histórico de conversas do WhatsApp'}
        </p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou telefone..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {conversations.isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : conversations.isError ? (
            <div className="p-6 text-sm text-destructive">
              Erro ao carregar conversas: {(conversations.error as Error).message}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              Nenhuma conversa encontrada.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((c) => {
                const name = c.contact_name || fmtPhone(c.session_id);
                return (
                  <li
                    key={c.session_id}
                    className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold shrink-0">
                      {initials(name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium truncate">{name}</span>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {fmtDateTime(c.last_message_time)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {chatMessageText(c.last_message) || '—'}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Conversas;
