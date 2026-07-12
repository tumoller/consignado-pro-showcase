// src/components/configuracoes/ProdutosSection.tsx
import { useState } from 'react';
import { Plus, Loader2, Pencil, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { useProdutos, useMutationProduto, Produto } from '@/hooks/useConfigNegocio';
import { useWorkspace } from '@/contexts/WorkspaceContext';

const FK_VIOLATION_CODE = '23503';

function friendlyDeleteError(err: any): string {
  if (err?.code === FK_VIOLATION_CODE) {
    return 'Este produto está em uso em propostas existentes. Inative-o em vez de excluir.';
  }
  return err?.message ?? 'Erro desconhecido.';
}

const ProdutosSection = () => {
  const { activeWorkspaceId } = useWorkspace();
  const produtos = useProdutos(activeWorkspaceId);
  const mutate = useMutationProduto(activeWorkspaceId);

  const [newNome, setNewNome] = useState('');
  const [newObs, setNewObs] = useState('');

  const [editing, setEditing] = useState<Produto | null>(null);
  const [editNome, setEditNome] = useState('');
  const [editObs, setEditObs] = useState('');

  const [deleting, setDeleting] = useState<Produto | null>(null);

  const isMutating = mutate.isPending;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNome.trim()) return;
    mutate.mutate(
      { nome: newNome.trim(), observacoes: newObs.trim() || null, action: 'create' },
      {
        onSuccess: () => {
          toast.success('Produto cadastrado com sucesso!');
          setNewNome('');
          setNewObs('');
        },
        onError: (err: any) => toast.error(`Erro ao cadastrar produto: ${err.message}`),
      }
    );
  };

  const handleToggleAtivo = (p: Produto, val: boolean) => {
    mutate.mutate(
      { id: p.id, nome: p.nome, observacoes: p.observacoes, ativo: val, action: 'update' },
      {
        onSuccess: () => toast.success(`Produto "${p.nome}" ${val ? 'ativado' : 'desativado'}.`),
        onError: (err: any) => toast.error(`Erro ao atualizar produto: ${err.message}`),
      }
    );
  };

  const openEdit = (p: Produto) => {
    setEditing(p);
    setEditNome(p.nome);
    setEditObs(p.observacoes ?? '');
  };

  const handleSaveEdit = () => {
    if (!editing) return;
    mutate.mutate(
      { id: editing.id, nome: editNome.trim(), observacoes: editObs.trim() || null, ativo: editing.ativo, action: 'update' },
      {
        onSuccess: () => {
          toast.success('Produto atualizado com sucesso!');
          setEditing(null);
        },
        onError: (err: any) => toast.error(`Erro ao atualizar produto: ${err.message}`),
      }
    );
  };

  const handleConfirmDelete = () => {
    if (!deleting) return;
    mutate.mutate(
      { id: deleting.id, action: 'delete' },
      {
        onSuccess: () => {
          toast.success('Produto excluído com sucesso!');
          setDeleting(null);
        },
        onError: (err: any) => {
          toast.error(friendlyDeleteError(err));
          setDeleting(null);
        },
      }
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card className="md:col-span-1 h-fit">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Novo Produto</CardTitle>
          <CardDescription>Cadastre um produto de crédito ofertado</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="prod-nome">Nome</Label>
              <Input id="prod-nome" placeholder="Ex: Portabilidade" value={newNome} onChange={(e) => setNewNome(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="prod-obs">Observações</Label>
              <Input id="prod-obs" placeholder="Ex: Detalhes do produto..." value={newObs} onChange={(e) => setNewObs(e.target.value)} />
            </div>
            <Button type="submit" className="w-full mt-2" disabled={isMutating}>
              {isMutating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Adicionar Produto
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Produtos Cadastrados</CardTitle>
          <CardDescription>Ative/desative, edite ou exclua os produtos. Só produtos ativos aparecem no cadastro de proposta.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {produtos.isLoading ? (
            <div className="p-6 text-center text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" /> Carregando...
            </div>
          ) : !produtos.data || produtos.data.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">Nenhum produto cadastrado.</div>
          ) : (
            <div className="divide-y divide-border">
              {produtos.data.map((p) => (
                <div key={p.id} className="p-4 flex items-center justify-between text-sm">
                  <div className="space-y-0.5">
                    <div className="font-semibold text-foreground">{p.nome}</div>
                    {p.observacoes && <div className="text-xs text-muted-foreground">{p.observacoes}</div>}
                  </div>
                  <div className="flex items-center gap-4 select-none">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => openEdit(p)} disabled={isMutating}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setDeleting(p)} disabled={isMutating}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{p.ativo ? 'Ativo' : 'Inativo'}</span>
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
            <DialogTitle>Editar Produto</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Nome</Label>
              <Input value={editNome} onChange={(e) => setEditNome(e.target.value)} />
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

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir produto "{deleting?.nome}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita. Se o produto já estiver em uso em propostas, a exclusão será bloqueada — nesse caso, inative-o.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isMutating}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} disabled={isMutating} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ProdutosSection;
