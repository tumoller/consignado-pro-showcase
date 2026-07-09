// src/pages/FollowUps.tsx — motor de follow-up: pendentes, vencidos e concluídos
import { useMemo } from 'react';
import { AlarmClock, CheckCircle2, Undo2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { KpiCard } from '@/components/ui/KpiCard';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import {
  useFollowUps,
  useToggleFollowUp,
  fmtDateTime,
  fmtPhone,
  FollowUp,
} from '@/hooks/useCrmData';

const FollowUpRow = ({
  f,
  onToggle,
  toggling,
}: {
  f: FollowUp;
  onToggle: (id: number, done: boolean) => void;
  toggling: boolean;
}) => {
  const done = f.status === 'done';
  const overdue = !done && f.due_at != null && new Date(f.due_at) < new Date();
  return (
    <Card className={overdue ? 'border-destructive/50' : undefined}>
      <CardContent className="p-4 flex items-start justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium">{f.titulo || f.tipo || 'Follow-up'}</span>
            {f.regra && <Badge variant="outline">{f.regra}</Badge>}
            {f.canal && <Badge variant="secondary">{f.canal}</Badge>}
            {overdue && <Badge variant="destructive">vencido</Badge>}
          </div>
          <div className="text-sm text-muted-foreground">
            {f.contacts?.nome || 'Sem contato'} · {fmtPhone(f.contacts?.phone_number)}
          </div>
          {f.mensagem && (
            <p className="text-sm text-muted-foreground line-clamp-2">{f.mensagem}</p>
          )}
          <div className="text-xs text-muted-foreground">
            {done ? `Concluído em ${fmtDateTime(f.done_at)}` : `Vence em ${fmtDateTime(f.due_at)}`}
          </div>
        </div>
        <Button
          variant={done ? 'outline' : 'default'}
          size="sm"
          disabled={toggling}
          onClick={() => onToggle(f.id, !done)}
          className="shrink-0"
        >
          {done ? (
            <>
              <Undo2 className="h-4 w-4 mr-1" /> Reabrir
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 mr-1" /> Concluir
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

const FollowUps = () => {
  const { activeWorkspaceId } = useWorkspace();
  const followUps = useFollowUps(activeWorkspaceId);
  const toggle = useToggleFollowUp(activeWorkspaceId);

  const { pendentes, vencidos, concluidos } = useMemo(() => {
    const all = followUps.data ?? [];
    const done = all.filter((f) => f.status === 'done');
    const open = all.filter((f) => f.status !== 'done');
    const now = new Date();
    return {
      pendentes: open,
      vencidos: open.filter((f) => f.due_at != null && new Date(f.due_at) < now),
      concluidos: done,
    };
  }, [followUps.data]);

  const onToggle = (id: number, done: boolean) => toggle.mutate({ id, done });

  const renderList = (list: FollowUp[], empty: string) =>
    followUps.isLoading ? (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    ) : list.length === 0 ? (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          <AlarmClock className="h-8 w-8 mx-auto mb-2 opacity-50" />
          {empty}
        </CardContent>
      </Card>
    ) : (
      <div className="space-y-3">
        {list.map((f) => (
          <FollowUpRow key={f.id} f={f} onToggle={onToggle} toggling={toggle.isPending} />
        ))}
      </div>
    );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Follow-ups</h1>
        <p className="text-muted-foreground mt-1">
          O motor de acompanhamento que nunca esquece um cliente
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KpiCard title="Pendentes" value={pendentes.length} isLoading={followUps.isLoading} />
        <KpiCard title="Vencidos" value={vencidos.length} isLoading={followUps.isLoading} />
        <KpiCard title="Concluídos" value={concluidos.length} isLoading={followUps.isLoading} />
      </div>

      <Tabs defaultValue="pendentes">
        <TabsList>
          <TabsTrigger value="pendentes">Pendentes ({pendentes.length})</TabsTrigger>
          <TabsTrigger value="vencidos">Vencidos ({vencidos.length})</TabsTrigger>
          <TabsTrigger value="concluidos">Concluídos ({concluidos.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="pendentes" className="mt-4">
          {renderList(pendentes, 'Nenhum follow-up pendente. Quando a automação (Fase 3) entrar, eles serão criados aqui automaticamente.')}
        </TabsContent>
        <TabsContent value="vencidos" className="mt-4">
          {renderList(vencidos, 'Nenhum follow-up vencido. 👏')}
        </TabsContent>
        <TabsContent value="concluidos" className="mt-4">
          {renderList(concluidos, 'Nenhum follow-up concluído ainda.')}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FollowUps;
