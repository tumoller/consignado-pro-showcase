// src/pages/Contatos.tsx — Ficha do Cliente, KPIs, Gráfico de Convênios, Filtros e Lista Premium
import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  PlusCircle,
  Pencil,
  Eye,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useContacts, fmtCpf, fmtPhone, Contact } from '@/hooks/useCrmData';
import { Button } from '@/components/ui/button';
import { ContactFormDialog } from '@/components/contatos/ContactFormDialog';
import { ContactSheet } from '@/components/contatos/ContactSheet';
import { KpiCard } from '@/components/ui/KpiCard';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const Contatos = () => {
  const { activeWorkspaceId } = useWorkspace();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editContact, setEditContact] = useState<Contact | null>(null);

  // Filtros e paginação
  const [convenioFilter, setConvenioFilter] = useState('todos');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Lê o query param `open` e abre a ficha do cliente automaticamente
  useEffect(() => {
    const openId = searchParams.get('open');
    if (openId && !isNaN(Number(openId))) {
      const id = Number(openId);
      setSelectedId(id);
      // Limpa o param da URL para não reabrir em navegações futuras
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete('open');
        return next;
      });
    }
  }, [searchParams, setSearchParams]);

  const contacts = useContacts(activeWorkspaceId, search);

  // 1. KPIs
  const kpiData = useMemo(() => {
    const list = contacts.data ?? [];
    const total = list.length;
    const leads = list.filter((c) => (c.status || '').toLowerCase() === 'lead').length;
    const clientes = list.filter((c) => (c.status || '').toLowerCase() === 'cliente').length;
    return { total, leads, clientes };
  }, [contacts.data]);

  // 2. Gráfico de Convênios
  const chartData = useMemo(() => {
    const list = contacts.data ?? [];
    const groups: Record<string, number> = {};
    for (const c of list) {
      const conv = (c.convenio || 'NÃO INFORMADO').toUpperCase().trim();
      groups[conv] = (groups[conv] || 0) + 1;
    }
    const sorted = Object.entries(groups).sort((a, b) => b[1] - a[1]);
    const top = sorted.slice(0, 4);
    const othersVal = sorted.slice(4).reduce((acc, curr) => acc + curr[1], 0);

    const result = top.map(([name, value]) => ({ name, value }));
    if (othersVal > 0) {
      result.push({ name: 'OUTROS', value: othersVal });
    }
    return result;
  }, [contacts.data]);

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  // 3. Lista única de Convênios para filtro
  const uniqueConvenios = useMemo(() => {
    const set = new Set<string>();
    for (const c of contacts.data ?? []) {
      if (c.convenio) set.add(c.convenio.toUpperCase().trim());
    }
    return [...set].sort();
  }, [contacts.data]);

  // 4. Filtragem & Busca
  const filtered = useMemo(() => {
    let list = contacts.data ?? [];

    if (convenioFilter !== 'todos') {
      list = list.filter(
        (c) => (c.convenio || '').toUpperCase().trim() === convenioFilter.toUpperCase().trim()
      );
    }

    const s = search.trim().toLowerCase();
    if (s) {
      list = list.filter(
        (c) =>
          (c.nome ?? '').toLowerCase().includes(s) ||
          (c.cpf ?? '').replace(/\D/g, '').includes(s.replace(/\D/g, '') || '§') ||
          (c.phone_number ?? '').replace(/\D/g, '').includes(s.replace(/\D/g, '') || '§')
      );
    }

    return list;
  }, [contacts.data, search, convenioFilter]);

  // 5. Paginação
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;

  const handleEditClick = (e: React.MouseEvent, c: Contact) => {
    e.stopPropagation(); // Evita abrir o Sheet lateral simultaneamente
    setEditContact(c);
    setIsEditOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Contatos</h1>
          <p className="text-muted-foreground mt-1">Sua base de clientes e leads</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <PlusCircle className="h-4 w-4 mr-2" /> Novo Contato
        </Button>
      </div>

      {/* Grid de Dashboard no topo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-1 gap-4 md:col-span-1">
          <KpiCard title="Total de Contatos" value={kpiData.total} isLoading={contacts.isLoading} />
          <KpiCard title="Leads Ativos" value={kpiData.leads} isLoading={contacts.isLoading} />
          <KpiCard title="Clientes Mapeados" value={kpiData.clientes} isLoading={contacts.isLoading} />
        </div>

        {/* Gráfico de Convênios */}
        <Card className="md:col-span-2">
          <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between h-full min-h-[220px]">
            <div className="w-full sm:w-1/2">
              <h3 className="font-semibold text-sm text-foreground mb-1">Distribuição por Convênio</h3>
              <p className="text-xs text-muted-foreground mb-4 font-normal">Proporção dos convênios da carteira de clientes</p>
              <div className="space-y-2 max-h-[140px] overflow-y-auto pr-2 scrollbar-thin">
                {chartData.map((item, index) => (
                  <div key={item.name} className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="truncate max-w-[120px] font-medium text-foreground">{item.name}</span>
                    </div>
                    <span>{item.value} ({Math.round((item.value / (kpiData.total || 1)) * 100)}%)</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="w-full sm:w-1/2 h-[180px] flex items-center justify-center relative">
              {contacts.isLoading ? (
                <Skeleton className="h-[130px] w-[130px] rounded-full" />
              ) : chartData.length === 0 ? (
                <div className="text-xs text-muted-foreground">Sem convênios cadastrados</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        borderColor: 'hsl(var(--border))',
                        borderRadius: '6px',
                      }}
                      itemStyle={{ color: 'hsl(var(--foreground))', fontSize: '12px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros e Busca */}
      <div className="flex flex-col sm:flex-row gap-3 items-center">
        <div className="relative max-w-md flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, CPF ou telefone..."
            className="pl-9"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1); // Reseta para primeira página
            }}
          />
        </div>

        {/* Filtro por Convênio */}
        <Select
          value={convenioFilter}
          onValueChange={(val) => {
            setConvenioFilter(val);
            setCurrentPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-[220px]">
            <SelectValue placeholder="Filtrar por Convênio" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os convênios</SelectItem>
            {uniqueConvenios.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Tamanho da Página */}
        <Select
          value={pageSize.toString()}
          onValueChange={(val) => {
            setPageSize(Number(val));
            setCurrentPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-[120px]">
            <SelectValue placeholder="Itens por pág." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10 itens</SelectItem>
            <SelectItem value="25">25 itens</SelectItem>
            <SelectItem value="50">50 itens</SelectItem>
            <SelectItem value="100">100 itens</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Diálogos CRUD */}
      <ContactFormDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
      <ContactFormDialog open={isEditOpen} onOpenChange={setIsEditOpen} contact={editContact} />

      {/* Tabela de Contatos */}
      <Card>
        <CardContent className="p-0">
          {contacts.isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : contacts.isError ? (
            <div className="p-6 text-sm text-destructive">
              Erro ao carregar contatos: {(contacts.error as Error).message}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground select-none">
                    <th className="p-4 font-semibold text-foreground">Nome</th>
                    <th className="p-4 font-semibold text-foreground">CPF</th>
                    <th className="p-4 font-semibold text-foreground">Convênio</th>
                    <th className="p-4 font-semibold text-foreground text-right pr-6">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => setSelectedId(c.id)}
                      className="border-b border-border last:border-0 hover:bg-muted/40 cursor-pointer transition-colors"
                    >
                      <td className="p-4 font-medium text-foreground">
                        <div className="flex flex-col">
                          <span>{c.nome || 'Sem nome'}</span>
                          <span className="text-[10px] text-muted-foreground font-normal">
                            {c.phone_number ? fmtPhone(c.phone_number) : 'Sem telefone'}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-muted-foreground font-mono">{fmtCpf(c.cpf)}</td>
                      <td className="p-4">
                        {c.convenio ? (
                          <Badge variant="secondary" className="font-semibold">
                            {c.convenio}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                      <td className="p-4 text-right pr-6 space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedId(c.id);
                          }}
                          title="Visualizar ficha"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={(e) => handleEditClick(e, c)}
                          title="Editar cadastro"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-12 text-center text-muted-foreground">
                        Nenhum contato encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Controles de Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between select-none">
          <div className="text-xs text-muted-foreground font-medium">
            Exibindo {paginated.length} de {filtered.length} contatos
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground font-semibold px-2">
              Página {currentPage} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Ficha Lateral de Detalhes */}
      <ContactSheet contactId={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
};

export default Contatos;
