// src/components/contatos/ContactFormDialog.tsx
import React, { useState, useEffect } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import {
  Contact,
  useCreateContact,
  useUpdateContact,
  useConveniosAtivos,
  useBancosAtivos,
  useEspeciesAtivas,
} from '@/hooks/useCrmData';

interface ContactFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact?: Contact | null; // Se fornecido, modo de edição
}

export const ContactFormDialog: React.FC<ContactFormDialogProps> = ({
  open,
  onOpenChange,
  contact,
}) => {
  const { activeWorkspaceId } = useWorkspace();
  const createMutation = useCreateContact(activeWorkspaceId);
  const updateMutation = useUpdateContact(activeWorkspaceId);

  // Queries para dados de configuração dinâmica
  const { data: listConvenios } = useConveniosAtivos();
  const { data: listBancos } = useBancosAtivos();
  const { data: listEspecies } = useEspeciesAtivas();

  // Estados dos campos
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('Lead');
  const [qualificacao, setQualificacao] = useState('');
  const [convenio, setConvenio] = useState('');

  const [rg, setRg] = useState('');
  const [dataNasc, setDataNasc] = useState('');
  const [espBenef, setEspBenef] = useState('');
  const [nbMat, setNbMat] = useState('');
  const [orgaoSiape, setOrgaoSiape] = useState('');
  const [recebimentoBeneficio, setRecebimentoBeneficio] = useState('');
  const [nomeMae, setNomeMae] = useState('');
  const [nomePai, setNomePai] = useState('');

  const [banco, setBanco] = useState('');
  const [agencia, setAgencia] = useState('');
  const [conta, setConta] = useState('');

  const [rua, setRua] = useState('');
  const [numero, setNumero] = useState('');
  const [complemento, setComplemento] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [uf, setUf] = useState('');
  const [cep, setCep] = useState('');

  const [lembreteOp, setLembreteOp] = useState('');
  const [contextoConversa, setContextoConversa] = useState('');
  const [resumoEmprestimos, setResumoEmprestimos] = useState('');

  // Popula os campos no modo edição
  useEffect(() => {
    if (open) {
      if (contact) {
        setNome(contact.nome || '');
        setCpf(contact.cpf || '');
        setPhoneNumber(contact.phone_number || '');
        setEmail(contact.email || '');
        setStatus(contact.status || 'Lead');
        setQualificacao(contact.qualificacao || '');
        setConvenio(contact.convenio || '');
        setRg(contact.rg || '');
        setDataNasc(contact.data_nasc || '');
        setEspBenef(contact.esp_benef || '');
        setNbMat(contact.nb_mat || '');
        setOrgaoSiape(contact.orgao_siape || '');
        setRecebimentoBeneficio(contact.recebimento_beneficio || '');
        setNomeMae(contact.nome_mae || '');
        setNomePai(contact.nome_pai || '');
        setBanco(contact.banco || '');
        setAgencia(contact.agencia || '');
        setConta(contact.conta || '');
        setRua(contact.rua || '');
        setNumero(contact.numero || '');
        setComplemento(contact.complemento || '');
        setBairro(contact.bairro || '');
        setCidade(contact.cidade || '');
        setUf(contact.uf || '');
        setCep(contact.cep || '');
        setLembreteOp(contact.lembrete_op || '');
        setContextoConversa(contact.contexto_conversa || '');
        setResumoEmprestimos(contact.resumo_emprestimos || '');
      } else {
        // Limpa campos para criação
        setNome('');
        setCpf('');
        setPhoneNumber('');
        setEmail('');
        setStatus('Lead');
        setQualificacao('');
        setConvenio('');
        setRg('');
        setDataNasc('');
        setEspBenef('');
        setNbMat('');
        setOrgaoSiape('');
        setRecebimentoBeneficio('');
        setNomeMae('');
        setNomePai('');
        setBanco('');
        setAgencia('');
        setConta('');
        setRua('');
        setNumero('');
        setComplemento('');
        setBairro('');
        setCidade('');
        setUf('');
        setCep('');
        setLembreteOp('');
        setContextoConversa('');
        setResumoEmprestimos('');
      }
    }
  }, [open, contact]);

  // Máscara de CPF
  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);
    setCpf(value);
  };

  // Máscara de Telefone
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);
    setPhoneNumber(value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!nome.trim()) {
      toast.error('O nome do cliente é obrigatório.');
      return;
    }

    const payload = {
      nome,
      cpf: cpf || null,
      phone_number: phoneNumber || null,
      email: email || null,
      status: status || null,
      qualificacao: qualificacao || null,
      convenio: convenio || null,
      rg: rg || null,
      data_nasc: dataNasc || null,
      esp_benef: espBenef || null,
      nb_mat: nbMat || null,
      orgao_siape: orgaoSiape || null,
      recebimento_beneficio: recebimentoBeneficio || null,
      banco: banco || null,
      agencia: agencia || null,
      conta: conta || null,
      rua: rua || null,
      numero: numero || null,
      complemento: complemento || null,
      bairro: bairro || null,
      cidade: cidade || null,
      uf: uf || null,
      cep: cep || null,
      lembrete_op: lembreteOp || null,
      contexto_conversa: contextoConversa || null,
      resumo_emprestimos: resumoEmprestimos || null,
      nome_rep_legal: contact?.nome_rep_legal || null,
      cpf_rep_legal: contact?.cpf_rep_legal || null,
      data_nasc_rl: contact?.data_nasc_rl || null,
      nome_mae: nomeMae || null,
      nome_pai: nomePai || null,
    };

    if (contact) {
      updateMutation.mutate(
        { id: contact.id, ...payload },
        {
          onSuccess: () => {
            toast.success('Contato atualizado com sucesso!');
            onOpenChange(false);
          },
          onError: (err: any) => {
            toast.error(`Erro ao atualizar contato: ${err.message}`);
          },
        }
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          toast.success('Contato criado com sucesso!');
          onOpenChange(false);
        },
        onError: (err: any) => {
          toast.error(`Erro ao criar contato: ${err.message}`);
        },
      });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{contact ? 'Editar Contato' : 'Novo Contato'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Tabs defaultValue="cadastro" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="cadastro">Cadastro</TabsTrigger>
              <TabsTrigger value="documentos">Docs & Margem</TabsTrigger>
              <TabsTrigger value="bancarios">Financeiro</TabsTrigger>
              <TabsTrigger value="notas">Notas & Endereço</TabsTrigger>
            </TabsList>

            {/* TAB 1: CADASTRO BÁSICO */}
            <TabsContent value="cadastro" className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 col-span-2">
                  <Label htmlFor="nome">Nome Completo</Label>
                  <Input
                    id="nome"
                    placeholder="Nome do cliente"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="cpf">CPF (Somente números)</Label>
                  <Input
                    id="cpf"
                    placeholder="12345678900"
                    value={cpf}
                    onChange={handleCpfChange}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="phone">WhatsApp (DDD + Número)</Label>
                  <Input
                    id="phone"
                    placeholder="11999998888"
                    value={phoneNumber}
                    onChange={handlePhoneChange}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="cliente@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="convenio">Convênio</Label>
                  <Select value={convenio || ''} onValueChange={setConvenio}>
                    <SelectTrigger id="convenio">
                      <SelectValue placeholder="Selecione o convênio" />
                    </SelectTrigger>
                    <SelectContent>
                      {listConvenios && listConvenios.filter((c) => c.ativo).map((c) => (
                        <SelectItem key={c.id} value={c.convenio}>
                          {c.convenio}
                        </SelectItem>
                      ))}
                      {(!listConvenios || listConvenios.length === 0) && (
                        <>
                          <SelectItem value="INSS">INSS</SelectItem>
                          <SelectItem value="SIAPE">SIAPE</SelectItem>
                          <SelectItem value="FGTS">FGTS</SelectItem>
                          <SelectItem value="FORÇAS ARMADAS">FORÇAS ARMADAS</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="status">Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger id="status">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cliente">Cliente</SelectItem>
                      <SelectItem value="Lead">Lead</SelectItem>
                      <SelectItem value="Prospect">Prospect</SelectItem>
                      <SelectItem value="Pendente">Pendente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="qualificacao">Qualificação</Label>
                  <Input
                    id="qualificacao"
                    placeholder="Ex: Hot, Frio, Simulação Feita"
                    value={qualificacao}
                    onChange={(e) => setQualificacao(e.target.value)}
                  />
                </div>
              </div>
            </TabsContent>

            {/* TAB 2: DOCUMENTOS E INFORMAÇÕES DE BENEFÍCIO */}
            <TabsContent value="documentos" className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="rg">RG / Identidade</Label>
                  <Input
                    id="rg"
                    placeholder="Nº do RG"
                    value={rg}
                    onChange={(e) => setRg(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="dataNasc">Data de Nascimento</Label>
                  <Input
                    id="dataNasc"
                    type="date"
                    value={dataNasc}
                    onChange={(e) => setDataNasc(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="nbMat">Número do Benefício (NB) / Matrícula</Label>
                  <Input
                    id="nbMat"
                    placeholder="Nº do Benefício"
                    value={nbMat}
                    onChange={(e) => setNbMat(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="espBenef">Espécie de Benefício</Label>
                  <Select value={espBenef || ''} onValueChange={setEspBenef}>
                    <SelectTrigger id="espBenef">
                      <SelectValue placeholder="Selecione a espécie" />
                    </SelectTrigger>
                    <SelectContent>
                      {listEspecies && listEspecies.filter((e) => e.ativo).map((e) => (
                        <SelectItem key={e.id} value={`${e.codigo} - ${e.descricao}`}>
                          {e.codigo} - {e.descricao}
                        </SelectItem>
                      ))}
                      {(!listEspecies || listEspecies.length === 0) && (
                        <>
                          <SelectItem value="41 - Aposentadoria por Idade">41 - Aposentadoria por Idade</SelectItem>
                          <SelectItem value="21 - Pensão por Morte">21 - Pensão por Morte</SelectItem>
                          <SelectItem value="32 - Aposentadoria por Invalidez">32 - Aposentadoria por Invalidez</SelectItem>
                          <SelectItem value="88 - BPC LOAS">88 - BPC LOAS</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1 col-span-2">
                  <Label htmlFor="orgaoSiape">Órgão SIAPE (se aplicável)</Label>
                  <Input
                    id="orgaoSiape"
                    placeholder="Ex: Ministério da Saúde"
                    value={orgaoSiape}
                    onChange={(e) => setOrgaoSiape(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="nomeMae">Nome da Mãe</Label>
                  <Input
                    id="nomeMae"
                    placeholder="Nome da mãe"
                    value={nomeMae}
                    onChange={(e) => setNomeMae(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="nomePai">Nome do Pai</Label>
                  <Input
                    id="nomePai"
                    placeholder="Nome do pai"
                    value={nomePai}
                    onChange={(e) => setNomePai(e.target.value)}
                  />
                </div>
              </div>
            </TabsContent>

            {/* TAB 3: DADOS FINANCEIROS E BANCÁRIOS */}
            <TabsContent value="bancarios" className="space-y-4 pt-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="banco">Banco</Label>
                  <Select value={banco || ''} onValueChange={setBanco}>
                    <SelectTrigger id="banco">
                      <SelectValue placeholder="Selecione o banco" />
                    </SelectTrigger>
                    <SelectContent>
                      {listBancos && listBancos.filter((b) => b.ativo).map((b) => (
                        <SelectItem key={b.id} value={b.nome}>
                          {b.nome}
                        </SelectItem>
                      ))}
                      {(!listBancos || listBancos.length === 0) && (
                        <>
                          <SelectItem value="ITAÚ">ITAÚ</SelectItem>
                          <SelectItem value="BANCO PAN">BANCO PAN</SelectItem>
                          <SelectItem value="BMG">BMG</SelectItem>
                          <SelectItem value="C6 BANK">C6 BANK</SelectItem>
                          <SelectItem value="BRADESCO">BRADESCO</SelectItem>
                          <SelectItem value="BANRISUL">BANRISUL</SelectItem>
                          <SelectItem value="DAYCOVAL">DAYCOVAL</SelectItem>
                          <SelectItem value="AGIBANK">AGIBANK</SelectItem>
                          <SelectItem value="SAFRA">SAFRA</SelectItem>
                          <SelectItem value="MERCANTIL">MERCANTIL</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="agencia">Agência</Label>
                  <Input
                    id="agencia"
                    placeholder="Nº Agência"
                    value={agencia}
                    onChange={(e) => setAgencia(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="conta">Conta Corrente</Label>
                  <Input
                    id="conta"
                    placeholder="Nº Conta + Dígito"
                    value={conta}
                    onChange={(e) => setConta(e.target.value)}
                  />
                </div>
                <div className="space-y-1 col-span-3">
                  <Label htmlFor="recebimento">Canal de Recebimento de Benefício</Label>
                  <Input
                    id="recebimento"
                    placeholder="Ex: Cartão Magnético, Conta Corrente"
                    value={recebimentoBeneficio}
                    onChange={(e) => setRecebimentoBeneficio(e.target.value)}
                  />
                </div>
              </div>
            </TabsContent>

            {/* TAB 4: NOTAS, ENDEREÇO E ALERTAS */}
            <TabsContent value="notas" className="space-y-4 pt-4">
              <div className="grid grid-cols-6 gap-4">
                <div className="space-y-1 col-span-4">
                  <Label htmlFor="rua">Rua</Label>
                  <Input
                    id="rua"
                    placeholder="Rua..."
                    value={rua}
                    onChange={(e) => setRua(e.target.value)}
                  />
                </div>
                <div className="space-y-1 col-span-2">
                  <Label htmlFor="numero">Número</Label>
                  <Input
                    id="numero"
                    placeholder="123"
                    value={numero}
                    onChange={(e) => setNumero(e.target.value)}
                  />
                </div>
                <div className="space-y-1 col-span-3">
                  <Label htmlFor="complemento">Complemento</Label>
                  <Input
                    id="complemento"
                    placeholder="Ex: Apto 42, Bloco B"
                    value={complemento}
                    onChange={(e) => setComplemento(e.target.value)}
                  />
                </div>
                <div className="space-y-1 col-span-3">
                  <Label htmlFor="bairro">Bairro</Label>
                  <Input
                    id="bairro"
                    placeholder="Bairro"
                    value={bairro}
                    onChange={(e) => setBairro(e.target.value)}
                  />
                </div>
                <div className="space-y-1 col-span-3">
                  <Label htmlFor="cidade">Cidade</Label>
                  <Input
                    id="cidade"
                    placeholder="Cidade"
                    value={cidade}
                    onChange={(e) => setCidade(e.target.value)}
                  />
                </div>
                <div className="space-y-1 col-span-1">
                  <Label htmlFor="uf">UF</Label>
                  <Input
                    id="uf"
                    placeholder="SP"
                    value={uf}
                    maxLength={2}
                    onChange={(e) => setUf(e.target.value.toUpperCase())}
                  />
                </div>
                <div className="space-y-1 col-span-2">
                  <Label htmlFor="cep">CEP</Label>
                  <Input
                    id="cep"
                    placeholder="00000000"
                    value={cep}
                    onChange={(e) => setCep(e.target.value.replace(/\D/g, ''))}
                  />
                </div>

                <div className="space-y-1 col-span-6">
                  <Label htmlFor="lembreteOp">Lembrete de Operação / Tarefa (Data)</Label>
                  <Input
                    id="lembreteOp"
                    type="date"
                    value={lembreteOp}
                    onChange={(e) => setLembreteOp(e.target.value)}
                  />
                </div>

                <div className="space-y-1 col-span-6">
                  <Label htmlFor="contextoConversa">Contexto da Conversa / Anotações</Label>
                  <Textarea
                    id="contextoConversa"
                    placeholder="Histórico resumido do cliente..."
                    value={contextoConversa}
                    onChange={(e) => setContextoConversa(e.target.value)}
                    rows={2}
                  />
                </div>

                <div className="space-y-1 col-span-6">
                  <Label htmlFor="resumoEmprestimos">Resumo de Empréstimos Ativos</Label>
                  <Textarea
                    id="resumoEmprestimos"
                    placeholder="Ex: Refin do Banco X parcela R$ 400..."
                    value={resumoEmprestimos}
                    onChange={(e) => setResumoEmprestimos(e.target.value)}
                    rows={2}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="pt-2">
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
              {contact ? 'Salvar Alterações' : 'Criar Contato'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
