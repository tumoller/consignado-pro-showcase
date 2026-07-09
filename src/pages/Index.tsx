// src/pages/Index.tsx — Visão Geral com dados reais do Supabase
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Users, FileText, Wallet, AlarmClock } from 'lucide-react';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { KpiCard } from '@/components/ui/KpiCard';
import { ChartCard } from '@/components/ui/ChartCard';
import { DataTable } from '@/components/ui/DataTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import {
  useContacts,
  usePropostas,
  useFollowUps,
  useConversations,
  fmtBRL,
  fmtDateTime,
  chatMessageText,
} from '@/hooks/useCrmData';

const isPaga = (s: string | null | undefined) => (s ?? '').toLowerCase().startsWith('pag');

const Index = () => {
  const { activeWorkspaceId } = useWorkspace();
  const contacts = useContacts(activeWorkspaceId);
  const propostas = usePropostas(activeWorkspaceId);
  const followUps = useFollowUps(activeWorkspaceId);
  const conversations = useConversations(activeWorkspaceId);

  const stats = useMemo(() => {
    const props = propostas.data ?? [];
    const pagas = props.filter((p) => isPaga(p.status));
    const comissaoTotal = pagas.reduce((acc, p) => acc + (Number(p.comissao) || 0), 0);

    // comissão por mês (data_cip_averb)
    const porMes = new Map<string, number>();
    for (const p of pagas) {
      if (!p.data_cip_averb) continue;
      const mes = p.data_cip_averb.slice(0, 7); // YYYY-MM
      porMes.set(mes, (porMes.get(mes) ?? 0) + (Number(p.comissao) || 0));
    }
    const chart = [...porMes.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([mes, valor]) => ({
        mes: `${mes.slice(5)}/${mes.slice(2, 4)}`,
        valor: Math.round(valor * 100) / 100,
      }));

    // status das propostas
    const porStatus = new Map<string, number>();
    for (const p of props) {
      const s = p.status || 'Sem status';
      porStatus.set(s, (porStatus.get(s) ?? 0) + 1);
    }
    const statusList = [...porStatus.entries()].sort(([, a], [, b]) => b - a);

    const fups = followUps.data ?? [];
    const pendentes = fups.filter((f) => f.status !== 'done');

    return {
      totalPropostas: props.length,
      pagas: pagas.length,
      comissaoTotal,
      chart,
      statusList,
      followUpsPendentes: pendentes.length,
    };
  }, [propostas.data, followUps.data]);

  const conversasData = useMemo(
    () =>
      (conversations.data ?? []).slice(0, 8).map((c) => ({
        nome: c.contact_name || c.session_id,
        ultimaMensagem: chatMessageText(c.last_message),
        atualizadoEm: fmtDateTime(c.last_message_time),
      })),
    [conversations.data]
  );

  const isLoading = contacts.isLoading || propostas.isLoading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Visão Geral</h1>
        <p className="text-muted-foreground mt-1">
          Sua operação de consignado em números reais
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard
          title="Contatos"
          value={contacts.data?.length ?? 0}
          icon={<Users className="h-5 w-5" />}
          isLoading={contacts.isLoading}
        />
        <KpiCard
          title="Propostas"
          value={stats.totalPropostas}
          icon={<FileText className="h-5 w-5" />}
          isLoading={propostas.isLoading}
        />
        <KpiCard
          title="Comissão (pagas)"
          value={fmtBRL(stats.comissaoTotal)}
          icon={<Wallet className="h-5 w-5" />}
          isLoading={propostas.isLoading}
        />
        <KpiCard
          title="Follow-ups pendentes"
          value={stats.followUpsPendentes}
          icon={<AlarmClock className="h-5 w-5" />}
          isLoading={followUps.isLoading}
        />
      </div>

      {/* Gráfico + status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ChartCard title="Comissão paga por mês" isLoading={isLoading}>
            {stats.chart.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Sem dados de comissão ainda
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <RechartsBarChart data={stats.chart} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="mes" fontSize={12} className="text-muted-foreground" />
                  <YAxis
                    fontSize={12}
                    className="text-muted-foreground"
                    tickFormatter={(v: number) => `R$${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(value: number) => [fmtBRL(value), 'Comissão']}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                    }}
                  />
                  <Bar dataKey="valor" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </RechartsBarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Propostas por status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.statusList.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhuma proposta.</p>
            )}
            {stats.statusList.map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <Badge variant={isPaga(status) ? 'default' : 'secondary'}>{status}</Badge>
                <span className="text-sm font-medium">{count}</span>
              </div>
            ))}
            <Button asChild variant="outline" className="w-full mt-2">
              <Link to="/propostas">Ver todas as propostas</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Últimas conversas */}
      <DataTable
        title="Últimas conversas (WhatsApp)"
        isLoading={conversations.isLoading}
        columns={[
          { key: 'nome', title: 'Contato' },
          {
            key: 'ultimaMensagem',
            title: 'Última mensagem',
            render: (v: string) => (
              <div className="max-w-md truncate" title={v}>
                {v || '—'}
              </div>
            ),
          },
          {
            key: 'atualizadoEm',
            title: 'Atualizado',
            render: (v: string) => <span className="text-muted-foreground text-sm">{v}</span>,
          },
        ]}
        data={conversasData}
      />
    </div>
  );
};

export default Index;
