// src/pages/Contatos.tsx — base real de contatos + Ficha do Cliente
import { useState } from 'react';
import { Search, Users, Phone, MapPin, Landmark, FileText, StickyNote } from 'lucide-react';
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
} from '@/hooks/useCrmData';

const isPaga = (s: string | null | undefined) => (s ?? '').toLowerCase().startsWith('pag');

const Field = ({ label, value }: { label: string; value: string | null | undefined }) => (
  <div>
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className="text-sm font-medium break-words">{value || '—'}</div>
  </div>
);

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
              <SheetTitle className="text-xl">{c.nome || 'Sem nome'}</SheetTitle>
              <SheetDescription className="sr-only">Ficha completa do cliente</SheetDescription>
            </SheetHeader>
            <div className="flex flex-wrap gap-2 items-center mt-1">
              {c.status && <Badge variant="secondary">{c.status}</Badge>}
              {c.qualificacao && <Badge variant="outline">{c.qualificacao}</Badge>}
              {c.convenio && <Badge>{c.convenio}</Badge>}
            </div>

            <Tabs defaultValue="dados" className="mt-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="dados">Dados</TabsTrigger>
                <TabsTrigger value="propostas">
                  Propostas ({propostas.length})
                </TabsTrigger>
                <TabsTrigger value="notas">Notas</TabsTrigger>
              </TabsList>

              <TabsContent value="dados" className="space-y-5 mt-4">
                <div>
                  <div className="flex items-center gap-2 mb-2 text-sm font-semibold">
                    <Phone className="h-4 w-4" /> Contato
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
                  <div className="flex items-center gap-2 mb-2 text-sm font-semibold">
                    <FileText className="h-4 w-4" /> Documentos e benefício
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="CPF" value={fmtCpf(c.cpf)} />
                    <Field label="RG" value={c.rg} />
                    <Field label="Nascimento" value={fmtDate(c.data_nasc)} />
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
                      <div className="flex items-center gap-2 mb-2 text-sm font-semibold">
                        <Users className="h-4 w-4" /> Representante legal
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
                  <div className="flex items-center gap-2 mb-2 text-sm font-semibold">
                    <Landmark className="h-4 w-4" /> Dados bancários
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
                  <div className="flex items-center gap-2 mb-2 text-sm font-semibold">
                    <MapPin className="h-4 w-4" /> Endereço
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Rua" value={c.rua} />
                    <Field label="Número" value={c.numero} />
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
                        <div className="font-medium">{p.operacao || p.produto || 'Operação'}</div>
                        <Badge variant={isPaga(p.status) ? 'default' : 'secondary'}>
                          {p.status || '—'}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <Field label="Saldo" value={fmtBRL(p.saldo)} />
                        <Field label="CMS %" value={p.cms_pct != null ? `${p.cms_pct}%` : null} />
                        <Field label="Comissão" value={fmtBRL(p.comissao)} />
                        <Field
                          label="Parcela"
                          value={
                            p.parcela_reduzida != null
                              ? `${fmtBRL(p.parcela)} → ${fmtBRL(p.parcela_reduzida)}`
                              : fmtBRL(p.parcela)
                          }
                        />
                        <Field label="Banco op." value={p.bco_op} />
                        <Field label="Banco port." value={p.bco_port} />
                        <Field label="Data CIP/Averb" value={fmtDate(p.data_cip_averb)} />
                        <Field label="Promotora" value={p.promotora} />
                        <Field label="Nº proposta" value={p.num_proposta} />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="notas" className="space-y-4 mt-4">
                <div>
                  <div className="flex items-center gap-2 mb-2 text-sm font-semibold">
                    <StickyNote className="h-4 w-4" /> Contexto da conversa
                  </div>
                  <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                    {c.contexto_conversa || 'Sem anotações.'}
                  </p>
                </div>
                <Separator />
                <div>
                  <div className="flex items-center gap-2 mb-2 text-sm font-semibold">
                    <FileText className="h-4 w-4" /> Resumo de empréstimos
                  </div>
                  <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                    {c.resumo_emprestimos || 'Sem resumo.'}
                  </p>
                </div>
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
  const contacts = useContacts(activeWorkspaceId, search);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Contatos</h1>
        <p className="text-muted-foreground mt-1">
          {contacts.data ? `${contacts.data.length} contatos` : 'Sua base de clientes e leads'}
        </p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, CPF ou telefone..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

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
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="p-3 font-medium">Nome</th>
                    <th className="p-3 font-medium">CPF</th>
                    <th className="p-3 font-medium">WhatsApp</th>
                    <th className="p-3 font-medium">Convênio</th>
                    <th className="p-3 font-medium">Cidade/UF</th>
                    <th className="p-3 font-medium">Qualificação</th>
                  </tr>
                </thead>
                <tbody>
                  {(contacts.data ?? []).map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => setSelectedId(c.id)}
                      className="border-b border-border last:border-0 hover:bg-muted/50 cursor-pointer transition-colors"
                    >
                      <td className="p-3 font-medium">{c.nome || '—'}</td>
                      <td className="p-3">{fmtCpf(c.cpf)}</td>
                      <td className="p-3">{fmtPhone(c.phone_number)}</td>
                      <td className="p-3">{c.convenio ? <Badge variant="outline">{c.convenio}</Badge> : '—'}</td>
                      <td className="p-3">{c.cidade ? `${c.cidade}${c.uf ? '/' + c.uf : ''}` : '—'}</td>
                      <td className="p-3">{c.qualificacao || '—'}</td>
                    </tr>
                  ))}
                  {(contacts.data ?? []).length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-muted-foreground">
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

      <ContactSheet contactId={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
};

export default Contatos;
