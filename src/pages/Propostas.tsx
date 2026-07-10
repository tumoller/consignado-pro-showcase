// src/pages/Propostas.tsx — todas as vendas/propostas com filtros, totais e visão Kanban/Tabela
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

const isPaga = (s: string | null | undefined) => (s ?? '').toLowerCase().startsWith('pag');

const Propostas = () => {
  const { activeWorkspaceId } = useWorkspace();
  const propostas = usePropostas(activeWorkspaceId);
  const updateStatusMutation = useUpdatePropostaStatus(activeWorkspaceId);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedProposta, setSelectedProposta] = useState<Proposta | null>(null);

  // Obtém lista única de status existentes para o filtro da tabela
  const statuses = useMemo(() => {
    const set = new Set<string>();
    for (const p of propostas.data ?? []) if (p.status) set.add(p.status);
    return [...set].sort();
  }, [propostas.data]);

  const filtered = useMemo(() => {
    let list = propostas.data ?? [];
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
  }, [propostas.data, search, statusFilter, viewMode]);

  const totals = useMemo(() => {
    const pagas = filtered.filter((p) => isPaga(p.status));
    return {
      qtde: filtered.length,
      pagas: pagas.length,
      comissao: pagas.reduce((acc, p) => acc + (Number(p.comissao) || 0), 0),
      saldo: pagas.reduce((acc, p) => acc + (Number(p.saldo) || 0), 0),
    };
  }, [filtered]);

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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard title="Propostas (filtro)" value={totals.qtde} isLoading={propostas.isLoading} />
        <KpiCard title="Pagas" value={totals.pagas} isLoading={propostas.isLoading} />
        <KpiCard title="Comissão (pagas)" value={fmtBRL(totals.comissao)} isLoading={propostas.isLoading} />
        <KpiCard title="Volume operado (pagas)" value={fmtBRL(totals.saldo)} isLoading={propostas.isLoading} />
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
          {viewMode === 'table' && (
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
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
        <div className="flex items-center gap-1 bg-muted p-1 rounded-md border shrink-0 mt-3 sm:mt-0">
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
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="p-3 font-medium">Cliente</th>
                      <th className="p-3 font-medium">Operação</th>
                      <th className="p-3 font-medium">Banco</th>
                      <th className="p-3 font-medium">Saldo</th>
                      <th className="p-3 font-medium">CMS %</th>
                      <th className="p-3 font-medium">Comissão</th>
                      <th className="p-3 font-medium">Status</th>
                      <th className="p-3 font-medium">Data</th>
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
                          <div className="font-medium">{p.contacts?.nome || '—'}</div>
                          <div className="text-xs text-muted-foreground">{fmtCpf(p.contacts?.cpf)}</div>
                        </td>
                        <td className="p-3">{p.operacao || p.produto || '—'}</td>
                        <td className="p-3">
                          {p.bco_op || '—'}
                          {p.bco_port && (
                            <span className="text-xs text-muted-foreground"> → {p.bco_port}</span>
                          )}
                        </td>
                        <td className="p-3">{fmtBRL(p.saldo)}</td>
                        <td className="p-3">{p.cms_pct != null ? `${p.cms_pct}%` : '—'}</td>
                        <td className="p-3 font-medium">{fmtBRL(p.comissao)}</td>
                        <td className="p-3">
                          <Badge variant={isPaga(p.status) ? 'default' : 'secondary'}>
                            {p.status || '—'}
                          </Badge>
                        </td>
                        <td className="p-3 text-muted-foreground">{fmtDate(p.data_cip_averb)}</td>
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
