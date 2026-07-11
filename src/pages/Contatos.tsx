// src/pages/Contatos.tsx — Ficha do Cliente, KPIs, Gráfico de Convênios, Filtros e Lista Premium
import { useState, useMemo } from 'react';
import {
  Search,
  Users,
  Phone,
  MapPin,
  Landmark,
  FileText,
  PlusCircle,
  Pencil,
  Eye,
  ChevronLeft,
  ChevronRight,
  History,
  MessageSquare,
  Send,
  Calculator,
  AlarmClock,
  StickyNote,
  Wallet,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import {
  useContacts,
  useContactDetail,
  fmtBRL,
  fmtCpf,
  fmtDate,
  fmtPhone,
  Contact,
} from '@/hooks/useCrmData';
import { Button } from '@/components/ui/button';
import { ContactFormDialog } from '@/components/contatos/ContactFormDialog';
import { useContactTimeline, TimelineItem } from '@/hooks/useHojeData';
import { KpiCard } from '@/components/ui/KpiCard';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const isPaga = (s: string | null | undefined) => (s ?? '').toLowerCase().startsWith('pag');

const Field = ({ label, value }: { label: string; value: string | null | undefined }) => (
  <div>
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className="text-sm font-medium break-words">{value || '—'}</div>
  </div>
);

// Idade calculada dinamicamente
const calculateAge = (birthDateString: string | null | undefined) => {
  if (!birthDateString) return '';
  const birth = new Date(birthDateString);
  if (isNaN(birth.getTime())) return '';
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return ` (${age} anos)`;
};

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

const timelinePayloadSummary = (item: TimelineItem): string | null => {
  if (item.tipo === 'simulacao' && item.payload) {
    const valor = item.payload.valor_total_disponivel;
    if (valor != null) return `Disponível: ${fmtBRL(Number(valor))}`;
  }
  if (item.payload && typeof item.payload === 'object') {
    if (typeof item.payload.resumo === 'string') return item.payload.resumo;
    if (typeof item.payload.mensagem === 'string') return item.payload.mensagem;
  }
  return null;
};

const ContactTimelineTab = ({ contactId }: { contactId: number | null }) => {
  const timeline = useContactTimeline(contactId);
  const items = timeline.data ?? [];

  if (timeline.isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">Sem eventos ainda.</p>;
  }

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const Icon = TIPO_ICONS[item.tipo] || Clock;
        const titulo = item.titulo || TIPO_LABELS[item.tipo] || item.tipo;
        const resumo = timelinePayloadSummary(item);
        const actor = actorLabel(item.actor);
        return (
          <div key={item.id} className="flex gap-3 rounded-lg border p-3">
            <div className="shrink-0 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-foreground truncate">{titulo}</span>
                {actor && (
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    {actor}
                  </Badge>
                )}
              </div>
              {resumo && (
                <p className="text-xs text-muted-foreground mt-0.5 break-words">{resumo}</p>
              )}
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
  );
};

const ContactSheet = ({
  contactId,
  onClose,
}: {
  contactId: number | null;
  onClose: () => void;
}) => {
  const detail = useContactDetail(contactId);
  const c = detail.data?.contact;
  const propostas = detail.data?.propostas ?? [];
  const comissaoPaga = propostas
    .filter((p) => isPaga(p.status))
    .reduce((acc, p) => acc + (Number(p.comissao) || 0), 0);

  const [isEditOpen, setIsEditOpen] = useState(false);

  return (
    <Sheet open={!!contactId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        {detail.isLoading || !c ? (
          <>
            <SheetHeader className="text-left">
              <SheetTitle>Carregando cliente...</SheetTitle>
              <SheetDescription>Buscando dados no Supabase</SheetDescription>
            </SheetHeader>
            <div className="space-y-4 mt-6">
              <Skeleton className="h-8 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-40 w-full" />
            </div>
          </>
        ) : (
          <>
            <SheetHeader className="text-left">
              <div className="flex items-center justify-between pr-6">
                <SheetTitle className="text-xl">{c.nome || 'Sem nome'}</SheetTitle>
                <Button size="sm" variant="outline" onClick={() => setIsEditOpen(true)}>
                  <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
                </Button>
              </div>
              <SheetDescription className="sr-only">Ficha completa do cliente</SheetDescription>
            </SheetHeader>
            <ContactFormDialog open={isEditOpen} onOpenChange={setIsEditOpen} contact={c} />
            
            <div className="flex flex-wrap gap-2 items-center mt-2.5">
              {c.status && (
                <Badge variant={c.status === 'Cliente' ? 'default' : 'secondary'}>
                  {c.status}
                </Badge>
              )}
              {c.qualificacao && <Badge variant="outline">{c.qualificacao}</Badge>}
              {c.convenio && <Badge className="bg-primary/20 text-primary border-primary/20">{c.convenio}</Badge>}
              <span className="text-[10px] text-muted-foreground ml-auto">
                Atualizado: {fmtDate(c.updated_at || c.created_at)}
              </span>
            </div>

            <Tabs defaultValue="dados" className="mt-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="dados">Dados</TabsTrigger>
                <TabsTrigger value="propostas">
                  Propostas ({propostas.length})
                </TabsTrigger>
                <TabsTrigger value="notas">Notas</TabsTrigger>
                <TabsTrigger value="timeline">
                  <History className="h-3.5 w-3.5 mr-1" /> Timeline
                </TabsTrigger>
              </TabsList>

              <TabsContent value="dados" className="space-y-5 mt-4">
                <div>
                  <div className="flex items-center gap-2 mb-2 text-sm font-semibold text-foreground">
                    <Phone className="h-4 w-4 text-primary" /> Contato
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="WhatsApp" value={fmtPhone(c.phone_number)} />
                    <Field label="E-mail" value={c.email} />
                    <Field label="Aquisição" value={c.aquisicao} />
                    <Field label="Lembrete OP" value={fmtDate(c.lembrete_op)} />
                  </div>
                </div>
                <Separator />
                
                <div>
                  <div className="flex items-center gap-2 mb-2 text-sm font-semibold text-foreground">
                    <FileText className="h-4 w-4 text-primary" /> Documentos e benefício
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="CPF" value={fmtCpf(c.cpf)} />
                    <Field label="RG" value={c.rg} />
                    <Field label="Nascimento" value={c.data_nasc ? `${fmtDate(c.data_nasc)}${calculateAge(c.data_nasc)}` : '—'} />
                    <Field label="Espécie benefício" value={c.esp_benef} />
                    <Field label="NB / Matrícula" value={c.nb_mat} />
                    <Field label="Órgão SIAPE" value={c.orgao_siape} />
                    <Field label="Nome da mãe" value={c.nome_mae} />
                    <Field label="Nome do pai" value={c.nome_pai} />
                  </div>
                </div>
                {(c.nome_rep_legal || c.cpf_rep_legal) && (
                  <>
                    <Separator />
                    <div>
                      <div className="flex items-center gap-2 mb-2 text-sm font-semibold text-foreground">
                        <Users className="h-4 w-4 text-primary" /> Representante legal
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Nome" value={c.nome_rep_legal} />
                        <Field label="CPF" value={fmtCpf(c.cpf_rep_legal)} />
                      </div>
                    </div>
                  </>
                )}
                <Separator />
                
                <div>
                  <div className="flex items-center gap-2 mb-2 text-sm font-semibold text-foreground">
                    <Landmark className="h-4 w-4 text-primary" /> Dados bancários
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <Field label="Banco" value={c.banco} />
                    <Field label="Agência" value={c.agencia} />
                    <Field label="Conta" value={c.conta} />
                    <Field label="Recebimento" value={c.recebimento_beneficio} />
                  </div>
                </div>
                <Separator />
                
                <div>
                  <div className="flex items-center gap-2 mb-2 text-sm font-semibold text-foreground">
                    <MapPin className="h-4 w-4 text-primary" /> Endereço
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Rua" value={c.rua} />
                    <Field label="Número" value={c.numero} />
                    <Field label="Complemento" value={c.complemento} />
                    <Field label="Bairro" value={c.bairro} />
                    <Field label="Cidade/UF" value={c.cidade ? `${c.cidade}${c.uf ? ' / ' + c.uf : ''}` : c.uf} />
                    <Field label="CEP" value={c.cep} />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="propostas" className="space-y-3 mt-4">
                {propostas.length === 0 && (
                  <p className="text-sm text-muted-foreground">Nenhuma proposta para este cliente.</p>
                )}
                {propostas.length > 0 && (
                  <div className="text-sm text-muted-foreground">
                    Comissão paga acumulada:{' '}
                    <span className="font-semibold text-foreground">{fmtBRL(comissaoPaga)}</span>
                  </div>
                )}
                {propostas.map((p) => (
                  <Card key={p.id}>
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-foreground">{p.operacao || p.produto || 'Operação'}</div>
                        <Badge variant={isPaga(p.status) ? 'default' : 'secondary'}>
                          {p.status || 'Não iniciada'}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                        <div>
                          <div>Banco</div>
                          <div className="font-medium text-foreground">{p.bco_op || '—'}</div>
                        </div>
                        <div>
                          <div>Operado</div>
                          <div className="font-medium text-foreground">{fmtBRL(p.saldo)}</div>
                        </div>
                        <div>
                          <div>Comissão</div>
                          <div className="font-medium text-success">{fmtBRL(p.comissao)}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="notas" className="space-y-4 mt-4">
                <div>
                  <div className="flex items-center gap-2 mb-2 text-sm font-semibold text-foreground">
                    <FileText className="h-4 w-4 text-primary" /> Resumo de empréstimos ativos
                  </div>
                  <p className="text-sm whitespace-pre-wrap text-muted-foreground bg-muted/30 p-3 rounded-lg border">
                    {c.resumo_emprestimos || 'Nenhum empréstimo cadastrado.'}
                  </p>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2 text-sm font-semibold text-foreground">
                    <Users className="h-4 w-4 text-primary" /> Histórico da conversa / anotações
                  </div>
                  <p className="text-sm whitespace-pre-wrap text-muted-foreground bg-muted/30 p-3 rounded-lg border">
                    {c.contexto_conversa || 'Sem histórico.'}
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="timeline" className="mt-4">
                <ContactTimelineTab contactId={contactId} />
              </TabsContent>
            </Tabs>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};

const Contatos = () => {
  const { activeWorkspaceId } = useWorkspace();
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editContact, setEditContact] = useState<Contact | null>(null);

  // Filtros e paginação
  const [convenioFilter, setConvenioFilter] = useState('todos');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

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
