// src/pages/Conversas.tsx — cockpit estilo WhatsApp com takeover humano
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { fmtPhone } from '@/hooks/useCrmData';
import {
  useConversationsList,
  useChatThread,
  useChatsRealtime,
  useTogglePauseAi,
  useSendMessage,
  CONVERSATIONS_PAGE_SIZE,
} from '@/hooks/useConversasData';
import { useToast } from '@/hooks/use-toast';
import { ConversationList } from '@/components/conversas/ConversationList';
import { ChatThread } from '@/components/conversas/ChatThread';
import { ChatComposer } from '@/components/conversas/ChatComposer';
import { ContactSheet } from '@/components/conversas/ContactSheet';

const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('') || '?';

const Conversas = () => {
  const { activeWorkspaceId } = useWorkspace();
  const navigate = useNavigate();
  const { toast } = useToast();

  const conversations = useConversationsList(activeWorkspaceId);
  const [search, setSearch] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(CONVERSATIONS_PAGE_SIZE);
  const [contactSheetOpen, setContactSheetOpen] = useState(false);

  useChatsRealtime(activeWorkspaceId, selectedSessionId);

  const thread = useChatThread(activeWorkspaceId, selectedSessionId);
  const togglePauseAi = useTogglePauseAi(activeWorkspaceId);
  const sendMessage = useSendMessage(activeWorkspaceId, selectedSessionId);

  const filtered = useMemo(() => {
    const list = conversations.data ?? [];
    const s = search.trim().toLowerCase();
    if (!s) return list;
    return list.filter(
      (c) =>
        (c.contact_name ?? '').toLowerCase().includes(s) ||
        (c.contact?.nome ?? '').toLowerCase().includes(s) ||
        c.session_id.toLowerCase().includes(s)
    );
  }, [conversations.data, search]);

  // Renderização incremental (25/50/75...) sem re-fetch — reseta ao trocar a busca.
  const visibleItems = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);
  const hasMore = visibleCount < filtered.length;

  const handleSearchChange = (v: string) => {
    setSearch(v);
    setVisibleCount(CONVERSATIONS_PAGE_SIZE);
  };

  const handleLoadMore = () => {
    setVisibleCount((v) => v + CONVERSATIONS_PAGE_SIZE);
  };

  const selected = useMemo(
    () => filtered.find((c) => c.session_id === selectedSessionId) ?? null,
    [filtered, selectedSessionId]
  );

  const selectedName = selected
    ? selected.contact_name || selected.contact?.nome || fmtPhone(selected.session_id)
    : '';

  const handleTogglePauseAi = (checked: boolean) => {
    if (!selected?.contact?.id) {
      toast({
        title: 'Contato não vinculado',
        description: 'Este número ainda não possui ficha de contato para controlar a IA.',
        variant: 'destructive',
      });
      return;
    }
    // Switch representa "Aurus responde": checked = IA ativa => pause_ai = !checked
    togglePauseAi.mutate(
      { contactId: selected.contact.id, pauseAi: !checked },
      {
        onSuccess: () => {
          toast({
            title: checked ? 'Aurus reativado' : 'Aurus pausado',
            description: checked
              ? 'A IA voltará a responder este contato.'
              : 'Você assumiu a conversa. A IA não vai responder.',
          });
        },
        onError: () => {
          toast({
            title: 'Erro ao atualizar',
            description: 'Não foi possível alterar o controle da IA.',
            variant: 'destructive',
          });
        },
      }
    );
  };

  const handleSend = (text: string) => {
    if (!activeWorkspaceId || !selectedSessionId) return;
    sendMessage.mutate(text, {
      onError: () => {
        toast({
          title: 'Envio indisponível',
          description: 'Não foi possível enviar a mensagem. Tente novamente em instantes.',
          variant: 'destructive',
        });
      },
    });
  };

  return (
    <div className="space-y-4 h-[calc(100vh-8rem)] flex flex-col">
      <div className="shrink-0">
        <h1 className="text-3xl font-bold text-foreground">Conversas</h1>
        <p className="text-muted-foreground mt-1">
          {conversations.data
            ? `${filtered.length} conversas no WhatsApp`
            : 'Histórico de conversas do WhatsApp'}
        </p>
      </div>

      <Card className="flex-1 min-h-0 overflow-hidden">
        <div className="h-full flex">
          {/* Coluna esquerda: lista */}
          <div
            className={`w-full md:w-[340px] shrink-0 border-r border-border h-full ${
              selectedSessionId ? 'hidden md:block' : 'block'
            }`}
          >
            <ConversationList
              items={visibleItems}
              isLoading={conversations.isLoading}
              isError={conversations.isError}
              error={conversations.error as Error | null}
              search={search}
              onSearchChange={handleSearchChange}
              selectedSessionId={selectedSessionId}
              onSelect={setSelectedSessionId}
              hasMore={hasMore}
              onLoadMore={handleLoadMore}
            />
          </div>

          {/* Coluna direita: thread */}
          <div
            className={`flex-1 h-full flex flex-col min-h-0 ${
              selectedSessionId ? 'flex' : 'hidden md:flex'
            }`}
          >
            {!selectedSessionId || !selected ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                Selecione uma conversa para visualizar as mensagens.
              </div>
            ) : (
              <>
                <div className="border-b border-border p-3 flex items-center gap-3 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden h-8 w-8"
                    onClick={() => setSelectedSessionId(null)}
                    aria-label="Voltar para a lista de conversas"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold shrink-0 text-sm">
                    {initials(selectedName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate text-sm">{selectedName}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {fmtPhone(selected.session_id)}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                      Aurus responde
                    </span>
                    <Switch
                      checked={!selected.contact?.pause_ai}
                      onCheckedChange={handleTogglePauseAi}
                      disabled={togglePauseAi.isPending}
                      aria-label="Aurus responde a este contato"
                    />
                  </div>

                  {selected.contact?.id && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setContactSheetOpen(true)}
                      className="shrink-0"
                    >
                      <ExternalLink className="h-3.5 w-3.5 mr-1" /> Ver ficha
                    </Button>
                  )}
                </div>

                <ChatThread
                  messages={thread.data ?? []}
                  isLoading={thread.isLoading}
                  isError={thread.isError}
                  error={thread.error as Error | null}
                />

                <ChatComposer onSend={handleSend} disabled={sendMessage.isPending} />

                <ContactSheet
                  open={contactSheetOpen}
                  onOpenChange={setContactSheetOpen}
                  contact={selected.contact}
                  fallbackName={selectedName}
                  onOpenFullProfile={() => {
                    setContactSheetOpen(false);
                    navigate(`/contatos?open=${selected.contact!.id}`);
                  }}
                />
              </>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Conversas;
