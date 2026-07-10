// src/pages/Propostas.tsx — todas as vendas/propostas com filtros, gráficos do Recharts e visão Kanban/Tabela
import { useMemo, useState } from 'react';
import { Search, PlusCircle, Kanban, TableProperties } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { KpiCard } from '@/components/ui/KpiCard';
import { Button } from '@/components/ui/button';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import {
  usePropostas,
  useUpdatePropostaStatus,
  fmtBRL,
  fmtCpf,
  fmtDate,
  Proposta,
} from '@/hooks/useCrmData';
import { ProposalKanban } from '@/components/propostas/ProposalKanban';
import { ProposalFormDialog } from '@/components/propostas/ProposalFormDialog';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

const isPaga = (s: string | null | undefined) => (s ?? '').toLowerCase().startsWith('pag');

// Helper para filtrar períodos
const isInPeriod = (dateStr: string | null | undefined, period: string) => {
  if (period === 'todos') return true;
  if (!dateStr) return false;
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return false;
  
  const today = new Date();
  const diffTime = today.getTime() - date.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (period === '7d') return diffDays <= 7;
  if (period === '30d') return diffDays <= 30;
  if (period === 'mes') {
    return date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
  }
  return true;
};

const Propostas = () => {
  const { activeWorkspaceId } = useWorkspace();
  const propostas = usePropostas(activeWorkspaceId);
  const updateStatusMutation = useUpdatePropostaStatus(activeWorkspaceId);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [periodFilter, setPeriodFilter] = useState('todos');
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedProposta, setSelectedProposta] = useState<Proposta | null>(null);

  // Obtém lista única de status existentes para o filtro da tabela
  const statuses = useMemo(() => {
    const set = new Set<string>();
    for (const p of propostas.data ?? []) if (p.status) set.add(p.status);
    return [...set].sort();
  }, [propostas.data]);

  // Filtragem principal dos dados
  const filtered = useMemo(() => {
    let list = propostas.data ?? [];
    
    // Filtro de Período
    if (periodFilter !== 'todos') {
      list = list.filter((p) => isInPeriod(p.data_cip_averb || p.created_at, periodFilter));
    }
    
    // O filtro de status só afeta a listagem se não for a visão Kanban (que mostra tudo)
    if (viewMode === 'table' && statusFilter !== 'todos') {
      list = list.filter((p) => p.status === statusFilter);
    }

    const s = search.trim().toLowerCase();
    if (s) {
      list = list.filter(
        (p) =>
          (p.contacts?.nome ?? '').toLowerCase().includes(s) ||
          (p.contacts?.cpf ?? '').replace(/\D/g, '').includes(s.replace(/\D/g, '') || '§') ||
          (p.num_proposta ?? '').includes(s) ||
          (p.bco_op ?? '').toLowerCase().includes(s) ||
          (p.bco_port ?? '').toLowerCase().includes(s)
      );
    }
    return list;
  }, [propostas.data, search, statusFilter, periodFilter, viewMode]);

  // Totais calculados sobre as propostas filtradas
  const totals = useMemo(() => {
    const pagas = filtered.filter((p) => isPaga(p.status));
    return {
      qtde: filtered.length,
      pagas: pagas.length,
      comissao: pagas.reduce((acc, p) => acc + (Number(p.comissao) || 0), 0),
      saldo: pagas.reduce((acc, p) => acc + (Number(p.saldo) || 0), 0),
    };
  }, [filtered]);

  // Gráfico de Barras do Pipeline (Volume vs Comissão) por Status
  const chartData = useMemo(() => {
    const list = propostas.data ?? [];
    const statusMap: Record<string, { volume: number; comissao: number }> = {
      'Não iniciada': { volume: 0, comissao: 0 },
      'Digitada': { volume: 0, comissao: 0 },
      'REDIGITAR': { volume: 0, comissao: 0 },
      'Aprovada': { volume: 0, comissao: 0 },
      'Paga': { volume: 0, comissao: 0 },
      'Cancelada': { volume: 0, comissao: 0 },
    };

    const filteredList = list.filter((p) => isInPeriod(p.data_cip_averb || p.created_at, periodFilter));

    for (const p of filteredList) {
      let statusKey = p.status || 'Não iniciada';
      const low = statusKey.toLowerCase().trim();
      
      if (low.startsWith('pag')) statusKey = 'Paga';
      else if (low.startsWith('canc')) statusKey = 'Cancelada';
      else if (low.includes('pend') || low.includes('redig')) statusKey = 'REDIGITAR';
      else if (low === 'digitada') statusKey = 'Digitada';
      else if (low.startsWith('aprov')) statusKey = 'Aprovada';
      else statusKey = 'Não iniciada';

      if (!statusMap[statusKey]) {
        statusMap[statusKey] = { volume: 0, comissao: 0 };
      }
      statusMap[statusKey].volume += Number(p.saldo) || 0;
      statusMap[statusKey].comissao += Number(p.comissao) || 0;
    }

    return Object.entries(statusMap).map(([name, data]) => ({
      name,
      'Volume (R$)': Math.round(data.volume),
      'Comissão (R$)': Math.round(data.comissao),
    }));
  }, [propostas.data, periodFilter]);

  const handleEditProposta = (p: Proposta) => {
    setSelectedProposta(p);
    setIsFormOpen(true);
  };

  const handleCreateProposta = () => {
    setSelectedProposta(null);
    setIsFormOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Propostas</h1>
          <p className="text-muted-foreground mt-1">Suas vendas e operações</p>
        </div>
        <Button onClick={handleCreateProposta}>
          <PlusCircle className="h-4 w-4 mr-2" /> Nova Proposta
        </Button>
      </div>

      {/* KPIs & Gráficos Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4 lg:col-span-1">
          <KpiCard title="Propostas (filtro)" value={totals.qtde} isLoading={propostas.isLoading} />
          <KpiCard title="Pagas" value={totals.pagas} isLoading={propostas.isLoading} />
          <KpiCard title="Comissão (pagas)" value={fmtBRL(totals.comissao)} isLoading={propostas.isLoading} />
          <KpiCard title="Volume operado (pagas)" value={fmtBRL(totals.saldo)} isLoading={propostas.isLoading} />
        </div>

        {/* Gráfico de Barras do Pipeline */}
        <Card className="lg:col-span-2">
          <CardContent className="p-4 h-full min-h-[260px] flex flex-col justify-between">
            <div>
              <h3 className="font-semibold text-sm text-foreground mb-1">Pipeline de Vendas (Volume vs Comissão)</h3>
              <p className="text-xs text-muted-foreground mb-4">Volume financeiro total e estimativa de comissão por etapa da esteira</p>
            </div>
            <div className="w-full h-[200px]">
              {propostas.isLoading ? (
                <Skeleton className="h-[200px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={10}
                      tickLine={false}
                      tickFormatter={(v) => {
                        if (v >= 1000) return `R$ ${(v / 1000).toFixed(0)}k`;
                        return `R$ ${v}`;
                      }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        borderColor: 'hsl(var(--border))',
                        borderRadius: '6px',
                      }}
                      itemStyle={{ fontSize: '12px' }}
                      formatter={(value: any) => [fmtBRL(value)]}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Bar dataKey="Volume (R$)" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Comissão (R$)" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barra de Filtros e Alternador de Visão */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
        <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full sm:w-auto">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente, CPF, banco ou nº proposta..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Filtro de Período */}
          <Select value={periodFilter} onValueChange={setPeriodFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todo o período</SelectItem>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="mes">Este mês</SelectItem>
            </SelectContent>
          </Select>

          {viewMode === 'table' && (
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                {statuses.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Alternador Kanban / Tabela */}
        <div className="flex items-center gap-1 bg-muted p-1 rounded-md border shrink-0 mt-3 sm:mt-0 select-none">
          <Button
            variant={viewMode === 'kanban' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-8 px-3"
            onClick={() => setViewMode('kanban')}
          >
            <Kanban className="h-4 w-4 mr-1.5" /> Kanban
          </Button>
          <Button
            variant={viewMode === 'table' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-8 px-3"
            onClick={() => setViewMode('table')}
          >
            <TableProperties className="h-4 w-4 mr-1.5" /> Tabela
          </Button>
        </div>
      </div>

      {/* Visualização de Conteúdo */}
      {viewMode === 'kanban' ? (
        <ProposalKanban
          propostas={filtered}
          isLoading={propostas.isLoading}
          onCardClick={handleEditProposta}
          onStatusChange={(id, status) => updateStatusMutation.mutate({ id, status })}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            {propostas.isLoading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : propostas.isError ? (
              <div className="p-6 text-sm text-destructive">
                Erro ao carregar propostas: {(propostas.error as Error).message}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground select-none">
                      <th className="p-3 font-semibold text-foreground">Cliente</th>
                      <th className="p-3 font-semibold text-foreground">Operação</th>
                      <th className="p-3 font-semibold text-foreground">Banco</th>
                      <th className="p-3 font-semibold text-foreground">Saldo</th>
                      <th className="p-3 font-semibold text-foreground">CMS %</th>
                      <th className="p-3 font-semibold text-foreground">Comissão</th>
                      <th className="p-3 font-semibold text-foreground">Status</th>
                      <th className="p-3 font-semibold text-foreground">Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p) => (
                      <tr
                        key={p.id}
                        onClick={() => handleEditProposta(p)}
                        className="border-b border-border last:border-0 hover:bg-muted/50 cursor-pointer transition-colors"
                      >
                        <td className="p-3">
                          <div className="font-medium text-foreground">{p.contacts?.nome || '—'}</div>
                          <div className="text-xs text-muted-foreground font-mono">{fmtCpf(p.contacts?.cpf)}</div>
                        </td>
                        <td className="p-3 text-foreground">{p.operacao || p.produto || '—'}</td>
                        <td className="p-3 text-muted-foreground">
                          {p.bco_op || '—'}
                          {p.bco_port && (
                            <span className="text-xs text-muted-foreground"> → {p.bco_port}</span>
                          )}
                        </td>
                        <td className="p-3 text-foreground">{fmtBRL(p.saldo)}</td>
                        <td className="p-3 text-muted-foreground">{p.cms_pct != null ? `${p.cms_pct}%` : '—'}</td>
                        <td className="p-3 font-semibold text-foreground">{fmtBRL(p.comissao)}</td>
                        <td className="p-3">
                          <Badge variant={isPaga(p.status) ? 'default' : 'secondary'}>
                            {p.status || '—'}
                          </Badge>
                        </td>
                        <td className="p-3 text-muted-foreground">{fmtDate(p.data_cip_averb || p.created_at)}</td>
                      </tr>
                    ))}
                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={8} className="p-6 text-center text-muted-foreground">
                          Nenhuma proposta encontrada.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dialog Formulário (Novo / Edição) */}
      <ProposalFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        proposta={selectedProposta}
      />
    </div>
  );
};

export default Propostas;
