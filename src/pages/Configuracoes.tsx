// src/pages/Configuracoes.tsx — Gestão de Convênios, Bancos e Espécies de Benefício do INSS
import { useState } from 'react';
import { Settings, Plus, Trash2, Loader2, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import {
  useEspeciesAtivas,
  useMutationEspecie,
  useConveniosAtivos,
  useMutationConvenio,
} from '@/hooks/useCrmData';
import BancosSection from '@/components/configuracoes/BancosSection';
import PromotorasSection from '@/components/configuracoes/PromotorasSection';
import UsuariosBancoSection from '@/components/configuracoes/UsuariosBancoSection';
import ParametrosBancoSection from '@/components/configuracoes/ParametrosBancoSection';
import ProdutosSection from '@/components/configuracoes/ProdutosSection';
import ConveniosSection from '@/components/configuracoes/ConveniosSection';

const Configuracoes = () => {
  // Estados para inclusão
  const [newConvenio, setNewConvenio] = useState('');
  const [newConvenioObs, setNewConvenioObs] = useState('');
  
  const [newEspecieCodigo, setNewEspecieCodigo] = useState('');
  const [newEspecieDescricao, setNewEspecieDescricao] = useState('');

  // Queries
  const convenios = useConveniosAtivos();
  const especies = useEspeciesAtivas();

  // Mutations
  const mutateConvenio = useMutationConvenio();
  const mutateEspecie = useMutationEspecie();

  // Handlers para Convênios
  const handleAddConvenio = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newConvenio.trim()) return;
    
    mutateConvenio.mutate(
      { convenio: newConvenio.toUpperCase().trim(), observacao: newConvenioObs.trim() || null, action: 'create' },
      {
        onSuccess: () => {
          toast.success('Convênio adicionado com sucesso!');
          setNewConvenio('');
          setNewConvenioObs('');
        },
        onError: (err: any) => {
          toast.error(`Erro ao adicionar convênio: ${err.message}`);
        },
      }
    );
  };

  const handleToggleConvenio = (id: number, val: boolean, name: string) => {
    mutateConvenio.mutate(
      { id, ativo: val, action: 'update' },
      {
        onSuccess: () => {
          toast.success(`Convênio "${name}" ${val ? 'ativado' : 'desativado'} com sucesso.`);
        },
        onError: (err: any) => {
          toast.error(`Erro ao atualizar convênio: ${err.message}`);
        },
      }
    );
  };

  const handleDeleteConvenio = (id: number, name: string) => {
    if (!confirm(`Tem certeza de que deseja excluir permanentemente o convênio "${name}"?`)) return;
    
    mutateConvenio.mutate(
      { id, action: 'delete' },
      {
        onSuccess: () => {
          toast.success('Convênio removido com sucesso!');
        },
        onError: (err: any) => {
          toast.error(`Erro ao remover convênio: ${err.message}`);
        },
      }
    );
  };

  // Handlers para Espécies
  const handleAddEspecie = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEspecieCodigo.trim() || !newEspecieDescricao.trim()) return;
    
    mutateEspecie.mutate(
      { codigo: newEspecieCodigo.trim(), descricao: newEspecieDescricao.trim(), action: 'create' },
      {
        onSuccess: () => {
          toast.success('Espécie de benefício cadastrada com sucesso!');
          setNewEspecieCodigo('');
          setNewEspecieDescricao('');
        },
        onError: (err: any) => {
          toast.error(`Erro ao cadastrar espécie: ${err.message}`);
        },
      }
    );
  };

  const handleToggleEspecie = (id: number, val: boolean, code: string) => {
    mutateEspecie.mutate(
      { id, ativo: val, action: 'update' },
      {
        onSuccess: () => {
          toast.success(`Espécie "${code}" ${val ? 'ativada' : 'desativada'} com sucesso.`);
        },
        onError: (err: any) => {
          toast.error(`Erro ao atualizar espécie: ${err.message}`);
        },
      }
    );
  };

  const handleDeleteEspecie = (id: number, code: string) => {
    if (!confirm(`Tem certeza de que deseja excluir permanentemente a espécie "${code}"?`)) return;
    
    mutateEspecie.mutate(
      { id, action: 'delete' },
      {
        onSuccess: () => {
          toast.success('Espécie removida com sucesso!');
        },
        onError: (err: any) => {
          toast.error(`Erro ao remover espécie: ${err.message}`);
        },
      }
    );
  };

  const isMutating = mutateConvenio.isPending || mutateEspecie.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Settings className="h-7 w-7 text-primary" /> Configurações
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie os parâmetros cadastrais e bancos do sistema
          </p>
        </div>
      </div>

      <Tabs defaultValue="convenios" className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1 w-full max-w-4xl">
          <TabsTrigger value="convenios">Convênios (Contatos)</TabsTrigger>
          <TabsTrigger value="convenios-propostas">Convênios (Propostas)</TabsTrigger>
          <TabsTrigger value="produtos">Produtos</TabsTrigger>
          <TabsTrigger value="bancos">Bancos</TabsTrigger>
          <TabsTrigger value="especies">Espécies INSS</TabsTrigger>
          <TabsTrigger value="promotoras">Promotoras</TabsTrigger>
          <TabsTrigger value="usuarios-banco">Usuários de Banco</TabsTrigger>
          <TabsTrigger value="parametros">Parâmetros por Banco</TabsTrigger>
        </TabsList>

        {/* TAB 1: CONVÊNIOS */}
        <TabsContent value="convenios" className="space-y-4 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Form de Inclusão */}
            <Card className="md:col-span-1 h-fit">
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Novo Convênio</CardTitle>
                <CardDescription>Cadastre um novo convênio na base</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddConvenio} className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="conv-name">Nome do Convênio</Label>
                    <Input
                      id="conv-name"
                      placeholder="Ex: INSS, SIAPE, FGTS"
                      value={newConvenio}
                      onChange={(e) => setNewConvenio(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="conv-obs">Observação / Status Operacional</Label>
                    <Input
                      id="conv-obs"
                      placeholder="Ex: Rodando normalmente..."
                      value={newConvenioObs}
                      onChange={(e) => setNewConvenioObs(e.target.value)}
                    />
                  </div>
                  <Button type="submit" className="w-full mt-2" disabled={isMutating}>
                    {isMutating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                    Adicionar Convênio
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Listagem */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Convênios Cadastrados</CardTitle>
                <CardDescription>Ative/desative ou gerencie os convênios cadastrados</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {convenios.isLoading ? (
                  <div className="p-6 text-center text-muted-foreground flex items-center justify-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" /> Carregando...
                  </div>
                ) : !convenios.data || convenios.data.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground">Nenhum convênio cadastrado.</div>
                ) : (
                  <div className="divide-y divide-border">
                    {convenios.data.map((c) => (
                      <div key={c.id} className="p-4 flex items-center justify-between text-sm">
                        <div className="space-y-0.5">
                          <div className="font-semibold text-foreground">{c.convenio}</div>
                          {c.observacao && <div className="text-xs text-muted-foreground">{c.observacao}</div>}
                        </div>
                        <div className="flex items-center gap-4 select-none">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">{c.ativo ? 'Ativo' : 'Inativo'}</span>
                            <Switch
                              checked={c.ativo}
                              onCheckedChange={(val) => handleToggleConvenio(c.id, val, c.convenio)}
                              disabled={isMutating}
                            />
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDeleteConvenio(c.id, c.convenio)}
                            disabled={isMutating}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 1b: CONVÊNIOS (Propostas) — tabela `convenios`, com prazo máximo e motivo de inativação */}
        <TabsContent value="convenios-propostas" className="space-y-4 pt-4">
          <ConveniosSection />
        </TabsContent>

        {/* TAB 1c: PRODUTOS — usados no cadastro de proposta */}
        <TabsContent value="produtos" className="space-y-4 pt-4">
          <ProdutosSection />
        </TabsContent>

        {/* TAB 2: BANCOS */}
        <TabsContent value="bancos" className="space-y-4 pt-4">
          <BancosSection />
        </TabsContent>

        {/* TAB 3: ESPÉCIES */}
        <TabsContent value="especies" className="space-y-4 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Form de Inclusão */}
            <Card className="md:col-span-1 h-fit">
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Nova Espécie INSS</CardTitle>
                <CardDescription>Cadastre uma nova espécie de benefício do INSS</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddEspecie} className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="spec-code">Código da Espécie</Label>
                    <Input
                      id="spec-code"
                      placeholder="Ex: 41, 88, 32"
                      value={newEspecieCodigo}
                      onChange={(e) => setNewEspecieCodigo(e.target.value.replace(/\D/g, ''))}
                      maxLength={3}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="spec-desc">Descrição / Nome</Label>
                    <Input
                      id="spec-desc"
                      placeholder="Ex: Aposentadoria por Idade"
                      value={newEspecieDescricao}
                      onChange={(e) => setNewEspecieDescricao(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full mt-2" disabled={isMutating}>
                    {isMutating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                    Cadastrar Espécie
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Listagem */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Espécies Cadastradas</CardTitle>
                <CardDescription>Gerencie as espécies válidas na esteira financeira</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {especies.isLoading ? (
                  <div className="p-6 text-center text-muted-foreground flex items-center justify-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" /> Carregando...
                  </div>
                ) : !especies.data || especies.data.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground">Nenhuma espécie cadastrada.</div>
                ) : (
                  <div className="divide-y divide-border">
                    {especies.data.map((e) => (
                      <div key={e.id} className="p-4 flex items-center justify-between text-sm">
                        <div className="space-y-0.5">
                          <div className="font-semibold text-foreground">
                            Código: <span className="font-mono text-primary font-bold">{e.codigo}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">{e.descricao}</div>
                        </div>
                        <div className="flex items-center gap-4 select-none">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">{e.ativo ? 'Ativa' : 'Inativa'}</span>
                            <Switch
                              checked={e.ativo}
                              onCheckedChange={(val) => handleToggleEspecie(e.id, val, e.codigo)}
                              disabled={isMutating}
                            />
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDeleteEspecie(e.id, e.codigo)}
                            disabled={isMutating}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 4: PROMOTORAS */}
        <TabsContent value="promotoras" className="space-y-4 pt-4">
          <PromotorasSection />
        </TabsContent>

        {/* TAB 5: USUÁRIOS DE BANCO */}
        <TabsContent value="usuarios-banco" className="space-y-4 pt-4">
          <UsuariosBancoSection />
        </TabsContent>

        {/* TAB 6: PARÂMETROS POR BANCO */}
        <TabsContent value="parametros" className="space-y-4 pt-4">
          <ParametrosBancoSection />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Configuracoes;