// src/components/dashboard/HojePanel.tsx — Fila de trabalho "Hoje" no topo do dashboard
import { useNavigate } from 'react-router-dom';
import { AlarmClock, MessageCircle, Wallet, Cake, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { fmtDateTime } from '@/hooks/useCrmData';
import {
  useFollowUpsHoje,
  useLeadsAguardando,
  usePropostasParadas,
  useAniversariantesMes,
} from '@/hooks/useHojeData';

const MAX_ITEMS = 5;

const timeAgo = (iso: string) => {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 60) return `há ${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  return `há ${Math.floor(h / 24)}d`;
};

interface BlockProps {
  icon: React.ReactNode;
  title: string;
  count: number;
  isLoading: boolean;
  emptyLabel: string;
  onNavigate: () => void;
  children: React.ReactNode;
}

const HojeBlock = ({ icon, title, count, isLoading, emptyLabel, onNavigate, children }: BlockProps) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
      <CardTitle className="text-sm font-semibold flex items-center gap-2">
        {icon}
        {title}
      </CardTitle>
      {!isLoading && count > 0 && <Badge variant="secondary">{count}</Badge>}
    </CardHeader>
    <CardContent className="space-y-1.5">
      {isLoading ? (
        <>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </>
      ) : count === 0 ? (
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5 text-success" /> {emptyLabel}
        </p>
      ) : (
        <>
          {children}
          {count > MAX_ITEMS && (
            <button
              onClick={onNavigate}
              className="text-xs text-primary hover:underline mt-1"
            >
              Ver todos ({count})
            </button>
          )}
        </>
      )}
    </CardContent>
  </Card>
);

export function HojePanel() {
  const { activeWorkspaceId } = useWorkspace();
  const navigate = useNavigate();

  const followUps = useFollowUpsHoje(activeWorkspaceId);
  const leads = useLeadsAguardando(activeWorkspaceId);
  const propostas = usePropostasParadas(activeWorkspaceId);
  const aniversariantes = useAniversariantesMes(activeWorkspaceId);

  const fups = followUps.data ?? [];
  const leadsList = leads.data ?? [];
  const propostasList = propostas.data ?? [];
  const aniversariantesList = aniversariantes.data ?? [];

  return (
    <div>
      <h2 className="text-lg font-semibold text-foreground mb-3">Hoje</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <HojeBlock
          icon={<AlarmClock className="h-4 w-4 text-primary" />}
          title="Follow-ups"
          count={fups.length}
          isLoading={followUps.isLoading}
          emptyLabel="Nenhum follow-up pendente"
          onNavigate={() => navigate('/followups')}
        >
          {fups.slice(0, MAX_ITEMS).map((f) => (
            <button
              key={f.id}
              onClick={() => navigate('/followups')}
              className="block w-full text-left text-xs rounded px-1.5 py-1 -mx-1.5 hover:bg-muted/60 transition-colors"
            >
              <div className={`font-medium truncate ${f.vencido ? 'text-destructive' : 'text-foreground'}`}>
                {f.titulo || 'Follow-up'}
              </div>
              <div className="text-muted-foreground truncate">
                {f.contact_nome || 'Sem contato'} · {f.due_at ? fmtDateTime(f.due_at) : '—'}
              </div>
            </button>
          ))}
        </HojeBlock>

        <HojeBlock
          icon={<MessageCircle className="h-4 w-4 text-primary" />}
          title="Aguardando resposta"
          count={leadsList.length}
          isLoading={leads.isLoading}
          emptyLabel="Nenhum lead aguardando"
          onNavigate={() => navigate('/conversas')}
        >
          {leadsList.slice(0, MAX_ITEMS).map((l) => (
            <button
              key={l.session_id}
              onClick={() => navigate('/conversas')}
              className="block w-full text-left text-xs rounded px-1.5 py-1 -mx-1.5 hover:bg-muted/60 transition-colors"
            >
              <div className="font-medium truncate text-foreground">
                {l.contact_nome || l.session_id}
              </div>
              <div className="text-muted-foreground truncate">
                {l.preview || '—'} · {timeAgo(l.created_at)}
              </div>
            </button>
          ))}
        </HojeBlock>

        <HojeBlock
          icon={<Wallet className="h-4 w-4 text-primary" />}
          title="Propostas paradas"
          count={propostasList.length}
          isLoading={propostas.isLoading}
          emptyLabel="Nenhuma proposta parada"
          onNavigate={() => navigate('/propostas')}
        >
          {propostasList.slice(0, MAX_ITEMS).map((p) => (
            <button
              key={p.id}
              onClick={() => navigate('/propostas')}
              className="block w-full text-left text-xs rounded px-1.5 py-1 -mx-1.5 hover:bg-muted/60 transition-colors"
            >
              <div className="font-medium truncate text-foreground">
                {p.contact_nome || 'Sem contato'} · {p.bco_op || '—'}
              </div>
              <div className="text-muted-foreground truncate">
                {p.status || '—'} · {p.dias_parado}d parado
              </div>
            </button>
          ))}
        </HojeBlock>

        <HojeBlock
          icon={<Cake className="h-4 w-4 text-primary" />}
          title="Aniversariantes"
          count={aniversariantesList.length}
          isLoading={aniversariantes.isLoading}
          emptyLabel="Nenhum aniversariante este mês"
          onNavigate={() => navigate('/contatos')}
        >
          {aniversariantesList.slice(0, MAX_ITEMS).map((a) => (
            <button
              key={a.id}
              onClick={() => navigate('/contatos')}
              className="block w-full text-left text-xs rounded px-1.5 py-1 -mx-1.5 hover:bg-muted/60 transition-colors"
            >
              <div className="font-medium truncate text-foreground">{a.nome || 'Sem nome'}</div>
              <div className="text-muted-foreground truncate">Dia {a.dia}</div>
            </button>
          ))}
        </HojeBlock>
      </div>
    </div>
  );
}
