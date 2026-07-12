// src/components/contatos/ContactSheet.tsx — Ficha lateral do cliente (reaproveitável)
import { useState } from 'react';
import {
  Phone,
  MapPin,
  Landmark,
  FileText,
  Pencil,
  History,
  MessageSquare,
  Send,
  Calculator,
  AlarmClock,
  StickyNote,
  Wallet,
  AlertTriangle,
  Clock,
  Users,
  PlusCircle,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
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
import { useContactDetail, fmtBRL, fmtCpf, fmtDate, fmtPhone, Proposta } from '@/hooks/useCrmData';
import { Button } from '@/components/ui/button';
import { ContactFormDialog } from '@/components/contatos/ContactFormDialog';
import { ProposalFormDialog } from '@/components/propostas/ProposalFormDialog';
import { useContactTimeline, TimelineItem } from '@/hooks/useHojeData';

// Rótulos legíveis para os campos usados nos diffs da timeline (triggers Postgres)
const DIFF_FIELD_LABELS: Record<string, string> = {
  status: 'Status',
  saldo: 'Valor operado',
  banco: 'Banco',
  nome: 'Nome',
  cpf: 'CPF',
  departamento: 'Departamento',
  qualificacao: 'Qualificação',
};

const fmtDiffValue = (field: string, v: unknown): string => {
  if (v == null || v === '') return '—';
  if (field === 'saldo') return fmtBRL(Number(v));
  if (field === 'cpf') return fmtCpf(String(v));
  return String(v);
};

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
  const p = item.payload;
  if (p && typeof p === 'object') {
    if (typeof p.resumo === 'string') return p.resumo;
    if (typeof p.mensagem === 'string') return p.mensagem;

    // Eventos gerados por triggers (proposta criada/atualizada, cadastro alterado)
    if (item.titulo === 'Proposta criada') {
      const partes: string[] = [];
      if (p.banco) partes.push(String(p.banco));
      if (p.operacao) partes.push(String(p.operacao));
      if (p.saldo != null) partes.push(fmtBRL(Number(p.saldo)));
      if (p.status) partes.push(String(p.status));
      return partes.length ? partes.join(' · ') : null;
    }

    // Diffs no formato { campo: { de, para } }
    const diffs = Object.entries(p).filter(
      ([, v]) => v && typeof v === 'object' && 'para' in (v as object)
    );
    if (diffs.length > 0) {
      return diffs
        .map(([field, v]) => {
          const label = DIFF_FIELD_LABELS[field] || field;
          const { de, para } = v as { de: unknown; para: unknown };
          return `${label}: ${fmtDiffValue(field, de)} → ${fmtDiffValue(field, para)}`;
        })
        .join(' | ');
    }
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

export const ContactSheet = ({
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
  const [isPropostaOpen, setIsPropostaOpen] = useState(false);
  const [selectedProposta, setSelectedProposta] = useState<Proposta | null>(null);

  const handleNovaProposta = () => {
    setSelectedProposta(null);
    setIsPropostaOpen(true);
  };

  const handleEditProposta = (p: Proposta) => {
    setSelectedProposta(p);
    setIsPropostaOpen(true);
  };

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
                <div className="flex items-center justify-between gap-2">
                  {propostas.length > 0 ? (
                    <div className="text-sm text-muted-foreground">
                      Comissão paga acumulada:{' '}
                      <span className="font-semibold text-foreground">{fmtBRL(comissaoPaga)}</span>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      Nenhuma proposta para este cliente.
                    </div>
                  )}
                  <Button size="sm" onClick={handleNovaProposta} className="shrink-0">
                    <PlusCircle className="h-3.5 w-3.5 mr-1" /> Nova proposta
                  </Button>
                </div>

                {propostas.map((p) => (
                  <Card
                    key={p.id}
                    onClick={() => handleEditProposta(p)}
                    className="cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
                  >
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium text-foreground">{p.operacao || p.produto || 'Operação'}</div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] text-muted-foreground">
                            {fmtDate(p.data_cip_averb || p.created_at)}
                          </span>
                          <Badge variant={isPaga(p.status) ? 'default' : 'secondary'}>
                            {p.status || 'Não iniciada'}
                          </Badge>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                        <div>
                          <div>Banco</div>
                          <div className="font-medium text-foreground">{p.bco_op || '—'}</div>
                        </div>
                        <div>
                          <div>Valor operado</div>
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

                <ProposalFormDialog
                  open={isPropostaOpen}
                  onOpenChange={setIsPropostaOpen}
                  proposta={selectedProposta}
                  presetContact={
                    !selectedProposta && c ? { id: c.id, nome: c.nome } : null
                  }
                />
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
