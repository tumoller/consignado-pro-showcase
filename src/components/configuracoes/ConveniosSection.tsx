// src/components/configuracoes/ConveniosSection.tsx
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
import { useConveniosNegocio, useMutationConvenioNegocio, ConvenioNegocio } from '@/hooks/useConfigNegocio';
import { useWorkspace } from '@/contexts/WorkspaceContext';

const FK_VIOLATION_CODE = '23503';

function friendlyDeleteError(err: any): string {
  if (err?.code === FK_VIOLATION_CODE) {
    return 'Este convênio está em uso em propostas existentes. Inative-o em vez de excluir.';
  }
  return err?.message ?? 'Erro desconhecido.';
}

const ConveniosSection = () => {
  const { activeWorkspaceId } = useWorkspace();
  const convenios = useConveniosNegocio(activeWorkspaceId);
  const mutate = useMutationConvenioNegocio(activeWorkspaceId);

  const [newNome, setNewNome] = useState('');
  const [newPrazo, setNewPrazo] = useState('');

  const [editing, setEditing] = useState<ConvenioNegocio | null>(null);
  const [editNome, setEditNome] = useState('');
  const [editPrazo, setEditPrazo] = useState('');

  const [deleting, setDeleting] = useState<ConvenioNegocio | null>(null);

  // Estado do desligamento pendente: precisa de motivo obrigatório antes de confirmar
  const [pendingInactive, setPendingInactive] = useState<ConvenioNegocio | null>(null);
  const [motivoInativo, setMotivoInativo] = useState('');

  const isMutating = mutate.isPending;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNome.trim()) return;
    mutate.mutate(
      { nome: newNome.trim(), prazo_maximo_meses: newPrazo ? parseInt(newPrazo, 10) : null, action: 'create' },
      {
        onSuccess: () => {
          toast.success('Convênio cadastrado com sucesso!');
          setNewNome('');
          setNewPrazo('');
        },
        onError: (err: any) => toast.error(`Erro ao cadastrar convênio: ${err.message}`),
      }
    );
  };

  const handleToggle = (c: ConvenioNegocio, val: boolean) => {
    if (!val) {
      // Inativar exige motivo — abre modal para coletar
      setPendingInactive(c);
      setMotivoInativo('');
      return;
    }
    mutate.mutate(
      { id: c.id, nome: c.nome, ativo: true, motivo_inativo: null, prazo_maximo_meses: c.prazo_maximo_meses, action: 'update' },
      {
        onSuccess: () => toast.success(`Convênio "${c.nome}" ativado.`),
        onError: (err: any) => toast.error(`Erro ao atualizar convênio: ${err.message}`),
      }
    );
  };

  const confirmInactivate = () => {
    if (!pendingInactive) return;
    if (!motivoInativo.trim()) {
      toast.error('Informe o motivo da inativação.');
      return;
    }
    mutate.mutate(
      {
        id: pendingInactive.id,
        nome: pendingInactive.nome,
        ativo: false,
        motivo_inativo: motivoInativo.trim(),
        prazo_maximo_meses: pendingInactive.prazo_maximo_meses,
        action: 'update',
      },
      {
        onSuccess: () => {
          toast.success(`Convênio "${pendingInactive.nome}" desativado.`);
          setPendingInactive(null);
          setMotivoInativo('');
        },
        onError: (err: any) => toast.error(`Erro ao atualizar convênio: ${err.message}`),
      }
    );
  };

  const openEdit = (c: ConvenioNegocio) => {
    setEditing(c);
    setEditNome(c.nome);
    setEditPrazo(c.prazo_maximo_meses != null ? String(c.prazo_maximo_meses) : '');
  };

  const handleSaveEdit = () => {
    if (!editing) return;
    mutate.mutate(
      {
        id: editing.id,
        nome: editNome.trim(),
        ativo: editing.ativo,
        motivo_inativo: editing.motivo_inativo,
        prazo_maximo_meses: editPrazo ? parseInt(editPrazo, 10) : null,
        action: 'update',
      },
      {
        onSuccess: () => {
          toast.success('Convênio atualizado com sucesso!');
          setEditing(null);
        },
        onError: (err: any) => toast.error(`Erro ao atualizar convênio: ${err.message}`),
      }
    );
  };

  const handleConfirmDelete = () => {
    if (!deleting) return;
    mutate.mutate(
      { id: deleting.id, action: 'delete' },
      {
        onSuccess: () => {
          toast.success('Convênio excluído com sucesso!');
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
          <CardTitle className="text-sm font-semibold">Novo Convênio</CardTitle>
          <CardDescription>Cadastre um convênio e o prazo máximo de parcelamento</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="conv-nome">Nome</Label>
              <Input id="conv-nome" placeholder="Ex: INSS, SIAPE, FGTS" value={newNome} onChange={(e) => setNewNome(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="conv-prazo">Prazo Máximo (meses)</Label>
              <Input id="conv-prazo" type="number" placeholder="Ex: 108" value={newPrazo} onChange={(e) => setNewPrazo(e.target.value)} />
            </div>
            <Button type="submit" className="w-full mt-2" disabled={isMutating}>
              {isMutating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Adicionar Convênio
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Convênios Cadastrados</CardTitle>
          <CardDescription>Ao inativar, é necessário informar o motivo. Só convênios ativos aparecem no cadastro de proposta.</CardDescription>
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
                    <div className="font-semibold text-foreground">{c.nome}</div>
                    <div className="text-xs text-muted-foreground">
                      Prazo máximo: {c.prazo_maximo_meses ? `${c.prazo_maximo_meses} meses` : '—'}
                    </div>
                    {!c.ativo && c.motivo_inativo && (
                      <div className="text-xs text-destructive">Motivo: {c.motivo_inativo}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-4 select-none">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => openEdit(c)} disabled={isMutating}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setDeleting(c)} disabled={isMutating}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{c.ativo ? 'Ativo' : 'Inativo'}</span>
                      <Switch checked={c.ativo} onCheckedChange={(val) => handleToggle(c, val)} disabled={isMutating} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Editar */}
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Convênio</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Nome</Label>
              <Input value={editNome} onChange={(e) => setEditNome(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Prazo Máximo (meses)</Label>
              <Input type="number" value={editPrazo} onChange={(e) => setEditPrazo(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={handleSaveEdit} disabled={isMutating}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Inativar com motivo obrigatório */}
      <Dialog open={!!pendingInactive} onOpenChange={(open) => !open && setPendingInactive(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Inativar convênio "{pendingInactive?.nome}"</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="motivo-inativo">Motivo da inativação *</Label>
              <Input
                id="motivo-inativo"
                placeholder="Ex: Suspenso pelo órgão conveniado"
                value={motivoInativo}
                onChange={(e) => setMotivoInativo(e.target.value)}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingInactive(null)} disabled={isMutating}>Cancelar</Button>
            <Button onClick={confirmInactivate} disabled={isMutating || !motivoInativo.trim()}>Confirmar Inativação</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir convênio "{deleting?.nome}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita. Se o convênio já estiver em uso em propostas, a exclusão será bloqueada — nesse caso, inative-o.
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

export default ConveniosSection;
