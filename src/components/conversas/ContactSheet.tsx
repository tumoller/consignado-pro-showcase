// src/components/conversas/ContactSheet.tsx — ficha rápida do contato dentro do chat (estilo WhatsApp)
import { Clock, ExternalLink, MessageSquare, Send, Calculator, AlarmClock, StickyNote, Wallet, AlertTriangle } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { fmtPhone, fmtDate } from '@/hooks/useCrmData';
import { useContactTimeline, TimelineItem } from '@/hooks/useHojeData';
import { ContactLite } from '@/hooks/useConversasData';

const TIPO_ICONS: Record<string, React.ElementType> = {
  msg_in: MessageSquare,
  msg_out: Send,
  simulacao: Calculator,
  followup: AlarmClock,
  nota: StickyNote,
  proposta_status: Wallet,
  erro_agente: AlertTriangle,
};

const TIPO_LABELS: Record<string, string> = {
  msg_in: 'Mensagem recebida',
  msg_out: 'Mensagem enviada',
  simulacao: 'Simulação',
  followup: 'Follow-up',
  nota: 'Nota',
  proposta_status: 'Status da proposta',
  erro_agente: 'Erro do agente',
};

const actorLabel = (actor: string | null) => {
  if (!actor) return null;
  if (actor === 'aurus') return 'IA';
  if (actor === 'system') return 'Sistema';
  if (actor.startsWith('user:')) return 'Você';
  return actor;
};

const timelineTimeAgo = (iso: string) => {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `há ${d}d`;
  return fmtDate(iso);
};

const Field = ({ label, value }: { label: string; value: string | null | undefined }) => (
  <div>
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className="text-sm font-medium break-words">{value || '—'}</div>
  </div>
);

const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('') || '?';

interface ContactSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: ContactLite | null;
  fallbackName: string;
  onOpenFullProfile: () => void;
}

export function ContactSheet({
  open,
  onOpenChange,
  contact,
  fallbackName,
  onOpenFullProfile,
}: ContactSheetProps) {
  const timeline = useContactTimeline(contact?.id ?? null);
  const items = (timeline.data ?? []).slice(0, 5);
  const name = contact?.nome || fallbackName;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm shrink-0">
              {initials(name)}
            </div>
            <div className="min-w-0">
              <SheetTitle className="truncate text-left">{name}</SheetTitle>
              <SheetDescription className="text-left">
                {fmtPhone(contact?.phone_number ?? '')}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-5 mt-5">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Convênio" value={contact?.convenio} />
            <Field label="Espécie benefício" value={contact?.esp_benef} />
            <Field label="Status" value={contact?.status} />
            <Field label="Departamento" value={contact?.departamento} />
          </div>

          {contact?.qualificacao && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Qualificação</span>
              <Badge variant="outline">{contact.qualificacao}</Badge>
            </div>
          )}

          <Separator />

          <div>
            <div className="flex items-center gap-2 mb-2 text-sm font-semibold text-foreground">
              <Clock className="h-4 w-4 text-primary" /> Histórico recente
            </div>

            {!contact?.id ? (
              <p className="text-sm text-muted-foreground">Contato sem ficha vinculada.</p>
            ) : timeline.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem eventos ainda.</p>
            ) : (
              <div className="space-y-2">
                {items.map((item: TimelineItem) => {
                  const Icon = TIPO_ICONS[item.tipo] || Clock;
                  const titulo = item.titulo || TIPO_LABELS[item.tipo] || item.tipo;
                  const actor = actorLabel(item.actor);
                  return (
                    <div key={item.id} className="flex gap-3 rounded-lg border p-2.5">
                      <div className="shrink-0 h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                        <Icon className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-foreground truncate">
                            {titulo}
                          </span>
                          {actor && (
                            <Badge variant="outline" className="text-[10px] shrink-0">
                              {actor}
                            </Badge>
                          )}
                        </div>
                        <span
                          className="text-[10px] text-muted-foreground mt-1 block"
                          title={fmtDate(item.created_at)}
                        >
                          {timelineTimeAgo(item.created_at)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {contact?.id && (
          <SheetFooter className="mt-6">
            <Button variant="secondary" className="w-full" onClick={onOpenFullProfile}>
              <ExternalLink className="h-3.5 w-3.5 mr-1" /> Abrir cadastro completo
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
