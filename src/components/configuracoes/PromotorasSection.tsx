// src/components/configuracoes/PromotorasSection.tsx
import { useState } from 'react';
import { Plus, Loader2, Pencil } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { usePromotoras, useMutationPromotora, Promotora } from '@/hooks/useConfigNegocio';
import { useWorkspace } from '@/contexts/WorkspaceContext';

const PromotorasSection = () => {
  const { activeWorkspaceId } = useWorkspace();
  const promotoras = usePromotoras(activeWorkspaceId);
  const mutate = useMutationPromotora(activeWorkspaceId);

  const [newNome, setNewNome] = useState('');
  const [newCnpj, setNewCnpj] = useState('');
  const [newObs, setNewObs] = useState('');

  const [editing, setEditing] = useState<Promotora | null>(null);
  const [editNome, setEditNome] = useState('');
  const [editCnpj, setEditCnpj] = useState('');
  const [editObs, setEditObs] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNome.trim()) return;
    mutate.mutate(
      { nome: newNome.trim(), cnpj: newCnpj.trim() || null, observacoes: newObs.trim() || null, action: 'create' },
      {
        onSuccess: () => {
          toast.success('Promotora cadastrada com sucesso!');
          setNewNome('');
          setNewCnpj('');
          setNewObs('');
        },
        onError: (err: any) => toast.error(`Erro ao cadastrar promotora: ${err.message}`),
      }
    );
  };

  const handleToggleAtivo = (p: Promotora, val: boolean) => {
    mutate.mutate(
      { id: p.id, nome: p.nome, cnpj: p.cnpj, observacoes: p.observacoes, ativo: val, action: 'update' },
      {
        onSuccess: () => toast.success(`Promotora "${p.nome}" ${val ? 'ativada' : 'desativada'}.`),
        onError: (err: any) => toast.error(`Erro ao atualizar promotora: ${err.message}`),
      }
    );
  };

  const openEdit = (p: Promotora) => {
    setEditing(p);
    setEditNome(p.nome);
    setEditCnpj(p.cnpj ?? '');
    setEditObs(p.observacoes ?? '');
  };

  const handleSaveEdit = () => {
    if (!editing) return;
    mutate.mutate(
      { id: editing.id, nome: editNome.trim(), cnpj: editCnpj.trim() || null, observacoes: editObs.trim() || null, ativo: editing.ativo, action: 'update' },
      {
        onSuccess: () => {
          toast.success('Promotora atualizada com sucesso!');
          setEditing(null);
        },
        onError: (err: any) => toast.error(`Erro ao atualizar promotora: ${err.message}`),
      }
    );
  };

  const isMutating = mutate.isPending;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card className="md:col-span-1 h-fit">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Nova Promotora</CardTitle>
          <CardDescription>Cadastre uma promotora de crédito parceira</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="prom-nome">Nome</Label>
              <Input id="prom-nome" placeholder="Ex: Promotora XYZ" value={newNome} onChange={(e) => setNewNome(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="prom-cnpj">CNPJ</Label>
              <Input id="prom-cnpj" placeholder="00.000.000/0001-00" value={newCnpj} onChange={(e) => setNewCnpj(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="prom-obs">Observações</Label>
              <Input id="prom-obs" placeholder="Ex: Contato comercial..." value={newObs} onChange={(e) => setNewObs(e.target.value)} />
            </div>
            <Button type="submit" className="w-full mt-2" disabled={isMutating}>
              {isMutating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Adicionar Promotora
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Promotoras Cadastradas</CardTitle>
          <CardDescription>Ative/desative ou edite as promotoras. Não há exclusão física — desative para remover do uso.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {promotoras.isLoading ? (
            <div className="p-6 text-center text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" /> Carregando...
            </div>
          ) : !promotoras.data || promotoras.data.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">Nenhuma promotora cadastrada.</div>
          ) : (
            <div className="divide-y divide-border">
              {promotoras.data.map((p) => (
                <div key={p.id} className="p-4 flex items-center justify-between text-sm">
                  <div className="space-y-0.5">
                    <div className="font-semibold text-foreground">{p.nome}</div>
                    {p.cnpj && <div className="text-xs text-muted-foreground">{p.cnpj}</div>}
                    {p.observacoes && <div className="text-xs text-muted-foreground">{p.observacoes}</div>}
                  </div>
                  <div className="flex items-center gap-4 select-none">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => openEdit(p)} disabled={isMutating}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{p.ativo ? 'Ativa' : 'Inativa'}</span>
                      <Switch checked={p.ativo} onCheckedChange={(val) => handleToggleAtivo(p, val)} disabled={isMutating} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Promotora</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Nome</Label>
              <Input value={editNome} onChange={(e) => setEditNome(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>CNPJ</Label>
              <Input value={editCnpj} onChange={(e) => setEditCnpj(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Observações</Label>
              <Input value={editObs} onChange={(e) => setEditObs(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={handleSaveEdit} disabled={isMutating}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PromotorasSection;
