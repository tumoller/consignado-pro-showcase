// src/components/propostas/ProposalFormDialog.tsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Search, Loader2 } from 'lucide-react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import {
  Proposta,
  Contact,
  useContacts,
  useCreateProposta,
  useUpdateProposta,
  useBancosAtivos,
  fmtDate,
} from '@/hooks/useCrmData';
import { useProdutosAtivos, useConveniosNegocioAtivos, usePromotoras } from '@/hooks/useConfigNegocio';

interface ProposalFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposta?: Proposta | null; // Se fornecido, modo de edição
  presetContact?: { id: number; nome: string | null } | null; // Cliente pré-vinculado (nova proposta a partir da ficha)
}

export const ProposalFormDialog: React.FC<ProposalFormDialogProps> = ({
  open,
  onOpenChange,
  proposta,
  presetContact,
}) => {
  const { activeWorkspaceId } = useWorkspace();
  const createMutation = useCreateProposta(activeWorkspaceId);
  const updateMutation = useUpdateProposta(activeWorkspaceId);
  const { data: bancos } = useBancosAtivos();
  const { data: produtos } = useProdutosAtivos(activeWorkspaceId);
  const { data: conveniosNegocio } = useConveniosNegocioAtivos(activeWorkspaceId);
  const { data: promotoras } = usePromotoras(activeWorkspaceId);

  // Estados do formulário
  const [contactId, setContactId] = useState<number | null>(null);
  const [searchContact, setSearchContact] = useState('');
  const [showContactList, setShowContactList] = useState(false);
  const [selectedContactName, setSelectedContactName] = useState('');

  const [operacao, setOperacao] = useState('');
  const [convenio, setConvenio] = useState('');
  const [bcoOp, setBcoOp] = useState('');
  const [bcoPort, setBcoPort] = useState('');
  const [saldo, setSaldo] = useState('');
  const [cmsPct, setCmsPct] = useState('');
  const [parcela, setParcela] = useState('');
  const [parcelaReduzida, setParcelaReduzida] = useState('');
  const [qtdeParc, setQtdeParc] = useState('');
  const [taxa, setTaxa] = useState('');
  const [status, setStatus] = useState('Não iniciada');
  const [subStatus, setSubStatus] = useState('');
  const [numProposta, setNumProposta] = useState('');
  const [numContrato, setNumContrato] = useState('');
  const [dataCipAverb, setDataCipAverb] = useState('');
  const [promotora, setPromotora] = useState('');

  // Busca de contatos para o autocomplete
  const { data: contacts, isLoading: loadingContacts } = useWorkspaceContacts(activeWorkspaceId, searchContact);

  // Popula o formulário ao abrir no modo edição
  useEffect(() => {
    if (open) {
      if (proposta) {
        // O contato vinculado vem sempre de contact_id; o nome exibido prioriza o
        // presetContact (passado pela ficha do cliente) pois o join contacts pode
        // não vir carregado dependendo de onde a proposta foi aberta.
        const nomeExibido = presetContact?.nome ?? proposta.contacts?.nome ?? '';
        setContactId(proposta.contact_id);
        setSelectedContactName(nomeExibido);
        setSearchContact(nomeExibido);
        setOperacao(proposta.operacao || proposta.produto || '');
        setConvenio(proposta.convenio || '');
        setBcoOp(proposta.bco_op || '');
        setBcoPort(proposta.bco_port || '');
        setSaldo(proposta.saldo?.toString() || '');
        setCmsPct(proposta.cms_pct?.toString() || '');
        setParcela(proposta.parcela?.toString() || '');
        setParcelaReduzida(proposta.parcela_reduzida?.toString() || '');
        setQtdeParc(proposta.qtde_parc?.toString() || '');
        setTaxa(proposta.taxa?.toString() || '');
        setStatus(proposta.status || 'Não iniciada');
        setSubStatus(proposta.sub_status || '');
        setNumProposta(proposta.num_proposta || '');
        setNumContrato(proposta.num_contrato || '');
        setDataCipAverb(proposta.data_cip_averb || '');
        setPromotora(proposta.promotora || '');
      } else {
        // Limpa campos para novo cadastro (pré-vincula cliente se fornecido)
        setContactId(presetContact?.id ?? null);
        setSelectedContactName(presetContact?.nome ?? '');
        setSearchContact(presetContact?.nome ?? '');
        setOperacao('');
        setConvenio('');
        setBcoOp('');
        setBcoPort('');
        setSaldo('');
        setCmsPct('');
        setParcela('');
        setParcelaReduzida('');
        setQtdeParc('');
        setTaxa('');
        setStatus('Não iniciada');
        setSubStatus('');
        setNumProposta('');
        setNumContrato('');
        setDataCipAverb('');
        setPromotora('');
      }
    }
  }, [open, proposta, presetContact]);

  // Opções de promotora: cadastradas no workspace + a atual da proposta, caso ela
  // não esteja (mais) na lista cadastrada (para não perder o dado ao editar).
  const promotoraOptions = useMemo(() => {
    const nomes = (promotoras ?? []).map((p) => p.nome);
    if (promotora && !nomes.includes(promotora)) {
      return [...nomes, promotora];
    }
    return nomes;
  }, [promotoras, promotora]);

  // Comissão estimada calculada em tempo real (read-only)
  const estimatedCommission = useMemo(() => {
    const valSaldo = parseFloat(saldo);
    const pctCms = parseFloat(cmsPct);
    if (isNaN(valSaldo) || isNaN(pctCms)) return 0;
    return Math.round((valSaldo * pctCms) / 100 * 100) / 100;
  }, [saldo, cmsPct]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!contactId) {
      toast.error('Por favor, selecione um cliente da lista.');
      return;
    }

    const payload = {
      contact_id: contactId,
      operacao: operacao || null,
      convenio: convenio || null,
      bco_op: bcoOp || null,
      bco_port: bcoPort || null,
      saldo: saldo ? parseFloat(saldo) : null,
      cms_pct: cmsPct ? parseFloat(cmsPct) : null,
      parcela: parcela ? parseFloat(parcela) : null,
      parcela_reduzida: parcelaReduzida ? parseFloat(parcelaReduzida) : null,
      qtde_parc: qtdeParc ? parseInt(qtdeParc, 10) : null,
      taxa: taxa ? parseFloat(taxa) : null,
      status: status || 'Não iniciada',
      sub_status: subStatus || null,
      num_proposta: numProposta || null,
      num_contrato: numContrato || null,
      data_cip_averb: dataCipAverb || null,
      promotora: promotora || null,
    };

    if (proposta) {
      updateMutation.mutate(
        { id: proposta.id, ...payload },
        {
          onSuccess: () => {
            toast.success('Proposta atualizada com sucesso!');
            onOpenChange(false);
          },
          onError: (err: any) => {
            toast.error(`Erro ao atualizar proposta: ${err.message}`);
          },
        }
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          toast.success('Proposta criada com sucesso!');
          onOpenChange(false);
        },
        onError: (err: any) => {
          toast.error(`Erro ao criar proposta: ${err.message}`);
        },
      });
    }
  };

  const selectContact = (c: Contact) => {
    setContactId(c.id);
    setSelectedContactName(c.nome || '');
    setSearchContact(c.nome || '');
    setShowContactList(false);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{proposta ? 'Editar Proposta' : 'Nova Proposta'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Tabs defaultValue="venda" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="venda">Venda & Banco</TabsTrigger>
              <TabsTrigger value="valores">Valores & Prazo</TabsTrigger>
              <TabsTrigger value="status">Status & Docs</TabsTrigger>
            </TabsList>

            {/* TAB 1: VENDA & BANCO */}
            <TabsContent value="venda" className="space-y-4 pt-4">
              {/* Campo de Cliente - Autocomplete */}
              <div className="relative space-y-1">
                <Label htmlFor="cliente-search">Cliente (Buscar por Nome/CPF/Telefone)</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="cliente-search"
                    placeholder={selectedContactName ? `Selecionado: ${selectedContactName}` : "Pesquise para selecionar o cliente..."}
                    value={searchContact}
                    className="pl-9"
                    disabled={!!proposta || !!presetContact}
                    onChange={(e) => {
                      setSearchContact(e.target.value);
                      setShowContactList(true);
                      if (contactId) {
                        setContactId(null);
                        setSelectedContactName('');
                      }
                    }}
                    onFocus={() => setShowContactList(true)}
                  />
                </div>
                {showContactList && searchContact.trim().length > 0 && (
                  <div className="absolute z-50 w-full bg-popover text-popover-foreground border rounded-md shadow-lg max-h-48 overflow-y-auto mt-1">
                    {loadingContacts ? (
                      <div className="p-4 text-sm text-center text-muted-foreground flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" /> Carregando clientes...
                      </div>
                    ) : !contacts || contacts.length === 0 ? (
                      <div className="p-4 text-sm text-center text-muted-foreground">
                        Nenhum cliente encontrado
                      </div>
                    ) : (
                      <ul className="divide-y divide-border">
                        {contacts.map((c) => (
                          <li
                            key={c.id}
                            onClick={() => selectContact(c)}
                            className="p-3 text-sm hover:bg-accent hover:text-accent-foreground cursor-pointer flex flex-col"
                          >
                            <span className="font-medium">{c.nome}</span>
                            <span className="text-[10px] text-muted-foreground">
                              CPF: {c.cpf || '—'} | Telefone: {c.phone_number || '—'}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="operacao">Produto</Label>
                  <Select value={operacao || ''} onValueChange={setOperacao}>
                    <SelectTrigger id="operacao">
                      <SelectValue placeholder="Selecione o produto" />
                    </SelectTrigger>
                    <SelectContent>
                      {(produtos ?? []).map((p) => (
                        <SelectItem key={p.id} value={p.nome}>
                          {p.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="convenio">Convênio</Label>
                  <Select
                    value={convenio || ''}
                    onValueChange={(val) => {
                      setConvenio(val);
                      const conv = (conveniosNegocio ?? []).find((c) => c.nome === val);
                      if (conv?.prazo_maximo_meses && (!qtdeParc || Number(qtdeParc) > conv.prazo_maximo_meses)) {
                        setQtdeParc(String(conv.prazo_maximo_meses));
                      }
                    }}
                  >
                    <SelectTrigger id="convenio">
                      <SelectValue placeholder="Selecione o convênio" />
                    </SelectTrigger>
                    <SelectContent>
                      {(conveniosNegocio ?? []).map((c) => (
                        <SelectItem key={c.id} value={c.nome}>
                          {c.nome}{c.prazo_maximo_meses ? ` (até ${c.prazo_maximo_meses}x)` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="bcoOp">Banco Operador</Label>
                  <Select value={bcoOp || ''} onValueChange={setBcoOp}>
                    <SelectTrigger id="bcoOp">
                      <SelectValue placeholder="Selecione o banco" />
                    </SelectTrigger>
                    <SelectContent>
                      {bancos && bancos.filter(b => b.ativo).map((b) => (
                        <SelectItem key={b.id} value={b.nome}>
                          {b.nome}
                        </SelectItem>
                      ))}
                      {(!bancos || bancos.length === 0) && (
                        <>
                          <SelectItem value="ITAÚ">ITAÚ</SelectItem>
                          <SelectItem value="BANCO PAN">BANCO PAN</SelectItem>
                          <SelectItem value="BMG">BMG</SelectItem>
                          <SelectItem value="C6 BANK">C6 BANK</SelectItem>
                          <SelectItem value="BRADESCO">BRADESCO</SelectItem>
                          <SelectItem value="BANRISUL">BANRISUL</SelectItem>
                          <SelectItem value="DAYCOVAL">DAYCOVAL</SelectItem>
                          <SelectItem value="AGIBANK">AGIBANK</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="bcoPort">Banco Portador (se Portabilidade)</Label>
                  <Select value={bcoPort || 'none'} onValueChange={(val) => setBcoPort(val === 'none' ? '' : val)}>
                    <SelectTrigger id="bcoPort">
                      <SelectValue placeholder="Selecione o banco portador" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum (Novo / Margem Livre)</SelectItem>
                      {bancos && bancos.filter(b => b.ativo).map((b) => (
                        <SelectItem key={b.id} value={b.nome}>
                          {b.nome}
                        </SelectItem>
                      ))}
                      {(!bancos || bancos.length === 0) && (
                        <>
                          <SelectItem value="ITAÚ">ITAÚ</SelectItem>
                          <SelectItem value="BANCO PAN">BANCO PAN</SelectItem>
                          <SelectItem value="BMG">BMG</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1 col-span-2">
                  <Label htmlFor="promotora">Promotora</Label>
                  <Select
                    value={promotora || 'none'}
                    onValueChange={(val) => setPromotora(val === 'none' ? '' : val)}
                  >
                    <SelectTrigger id="promotora">
                      <SelectValue placeholder="Selecione a promotora" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhuma</SelectItem>
                      {promotoraOptions.map((nome) => (
                        <SelectItem key={nome} value={nome}>
                          {nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            {/* TAB 2: VALORES & PRAZO */}
            <TabsContent value="valores" className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="saldo">Valor da Operação (Saldo)</Label>
                  <Input
                    id="saldo"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={saldo}
                    onChange={(e) => setSaldo(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="cmsPct">Comissão %</Label>
                  <Input
                    id="cmsPct"
                    type="number"
                    step="0.01"
                    placeholder="Ex: 5.5"
                    value={cmsPct}
                    onChange={(e) => setCmsPct(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="parcela">Valor da Parcela</Label>
                  <Input
                    id="parcela"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={parcela}
                    onChange={(e) => setParcela(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="parcelaReduzida">Parcela Reduzida</Label>
                  <Input
                    id="parcelaReduzida"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={parcelaReduzida}
                    onChange={(e) => setParcelaReduzida(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="qtdeParc">Quantidade de Parcelas (Prazo)</Label>
                  <Select value={qtdeParc || ''} onValueChange={setQtdeParc}>
                    <SelectTrigger id="qtdeParc">
                      <SelectValue placeholder="Selecione o prazo" />
                    </SelectTrigger>
                    <SelectContent>
                      {[12, 24, 36, 48, 60, 72, 84, 96, 108, 120]
                        .filter((n) => {
                          const conv = (conveniosNegocio ?? []).find((c) => c.nome === convenio);
                          return !conv?.prazo_maximo_meses || n <= conv.prazo_maximo_meses;
                        })
                        .map((n) => (
                          <SelectItem key={n} value={String(n)}>{n} parcelas</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  {(() => {
                    const conv = (conveniosNegocio ?? []).find((c) => c.nome === convenio);
                    return conv?.prazo_maximo_meses ? (
                      <p className="text-xs text-muted-foreground">Prazo máximo para {conv.nome}: {conv.prazo_maximo_meses}x</p>
                    ) : null;
                  })()}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="taxa">Taxa de Juros % (a.m.)</Label>
                  <Input
                    id="taxa"
                    type="number"
                    step="0.0001"
                    placeholder="Ex: 1.35"
                    value={taxa}
                    onChange={(e) => setTaxa(e.target.value)}
                  />
                </div>
              </div>

              {/* Informação da Comissão Estimada */}
              <div className="bg-success/5 border border-success/20 rounded-lg p-3 flex items-center justify-between text-sm mt-4 select-none">
                <span className="text-muted-foreground font-medium">Estimativa de Comissão Prevista:</span>
                <span className="font-bold text-success text-base">
                  {estimatedCommission > 0 ? `R$ ${estimatedCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}
                </span>
              </div>
            </TabsContent>

            {/* TAB 3: STATUS & DOCS */}
            <TabsContent value="status" className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="status">Status da Proposta</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger id="status">
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Não iniciada">Não Iniciada</SelectItem>
                      <SelectItem value="Digitada">Digitada</SelectItem>
                      <SelectItem value="REDIGITAR">REDIGITAR (Pendência)</SelectItem>
                      <SelectItem value="Aprovada">Aprovada / Averbando</SelectItem>
                      <SelectItem value="Paga">Paga</SelectItem>
                      <SelectItem value="Cancelada">Cancelada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="subStatus">Sub-status detalhado</Label>
                  <Input
                    id="subStatus"
                    placeholder="Ex: Aguardando averbação órgão"
                    value={subStatus}
                    onChange={(e) => setSubStatus(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="numProposta">Nº da Proposta (Banco)</Label>
                  <Input
                    id="numProposta"
                    placeholder="Ex: 80948512"
                    value={numProposta}
                    onChange={(e) => setNumProposta(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="numContrato">Nº do Contrato</Label>
                  <Input
                    id="numContrato"
                    placeholder="Ex: 928374827"
                    value={numContrato}
                    onChange={(e) => setNumContrato(e.target.value)}
                  />
                </div>

                <div className="space-y-1 col-span-2">
                  <Label htmlFor="dataCipAverb">Data de Averbamento (CIP)</Label>
                  <Input
                    id="dataCipAverb"
                    type="date"
                    value={dataCipAverb}
                    onChange={(e) => setDataCipAverb(e.target.value)}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="pt-4 flex items-center justify-between select-none">
            {proposta && (
              <span className="text-[10px] text-muted-foreground font-medium mr-auto">
                Última atualização: {fmtDate(proposta.updated_at || proposta.created_at)}
              </span>
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {proposta ? 'Salvar Alterações' : 'Criar Proposta'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Helper customizado para carregar contatos do Workspace
function useWorkspaceContacts(workspaceId: number | null, queryText: string) {
  const contacts = useContacts(workspaceId, queryText);
  return contacts;
}
