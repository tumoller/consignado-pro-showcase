// src/components/configuracoes/BancosSection.tsx
// Substitui a antiga tab "Bancos" simples: mantém cadastro/nome/ativo/exclusão
// (via useCrmData) e adiciona edição dos campos novos (febraban, switches, observações).
import { useState } from 'react';
import { Plus, Trash2, Loader2, Pencil } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useBancosAtivos, useMutationBanco } from '@/hooks/useCrmData';
import { useBancosExtra, useMutationBancoExtra, BancoExtra } from '@/hooks/useConfigNegocio';

const BancosSection = () => {
  const [newBanco, setNewBanco] = useState('');
  const bancos = useBancosAtivos();
  const bancosExtra = useBancosExtra();
  const mutateBanco = useMutationBanco();
  const mutateExtra = useMutationBancoExtra();

  const [editing, setEditing] = useState<BancoExtra | null>(null);
  const [editState, setEditState] = useState({
    codigo_febraban: '',
    opera_margem_livre: true,
    opera_portabilidade: true,
    opera_refin: true,
    opera_cartao: false,
    observacoes: '',
  });

  const isMutating = mutateBanco.isPending || mutateExtra.isPending;

  const handleAddBanco = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBanco.trim()) return;
    mutateBanco.mutate(
      { nome: newBanco.toUpperCase().trim(), action: 'create' },
      {
        onSuccess: () => {
          toast.success('Banco parceiro cadastrado com sucesso!');
          setNewBanco('');
        },
        onError: (err: any) => toast.error(`Erro ao cadastrar banco: ${err.message}`),
      }
    );
  };

  const handleToggleBanco = (id: number, val: boolean, name: string) => {
    mutateBanco.mutate(
      { id, ativo: val, action: 'update' },
      {
        onSuccess: () => toast.success(`Banco "${name}" ${val ? 'ativado' : 'desativado'} com sucesso.`),
        onError: (err: any) => toast.error(`Erro ao atualizar banco: ${err.message}`),
      }
    );
  };

  const handleDeleteBanco = (id: number, name: string) => {
    if (!confirm(`Tem certeza de que deseja excluir permanentemente o banco "${name}"?`)) return;
    mutateBanco.mutate(
      { id, action: 'delete' },
      {
        onSuccess: () => toast.success('Banco removido com sucesso!'),
        onError: (err: any) => toast.error(`Erro ao remover banco: ${err.message}`),
      }
    );
  };

  const openEdit = (b: BancoExtra) => {
    setEditing(b);
    setEditState({
      codigo_febraban: b.codigo_febraban ?? '',
      opera_margem_livre: b.opera_margem_livre,
      opera_portabilidade: b.opera_portabilidade,
      opera_refin: b.opera_refin,
      opera_cartao: b.opera_cartao,
      observacoes: b.observacoes ?? '',
    });
  };

  const handleSaveEdit = () => {
    if (!editing) return;
    mutateExtra.mutate(
      {
        id: editing.id,
        codigo_febraban: editState.codigo_febraban.trim() || null,
        opera_margem_livre: editState.opera_margem_livre,
        opera_portabilidade: editState.opera_portabilidade,
        opera_refin: editState.opera_refin,
        opera_cartao: editState.opera_cartao,
        observacoes: editState.observacoes.trim() || null,
      },
      {
        onSuccess: () => {
          toast.success('Banco atualizado com sucesso!');
          setEditing(null);
        },
        onError: (err: any) => toast.error(`Erro ao atualizar banco: ${err.message}`),
      }
    );
  };

  const extraById = new Map((bancosExtra.data ?? []).map((b) => [b.id, b]));

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card className="md:col-span-1 h-fit">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Novo Banco Parceiro</CardTitle>
          <CardDescription>Cadastre um novo banco parceiro comercial</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddBanco} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="bank-name">Nome do Banco</Label>
              <Input id="bank-name" placeholder="Ex: BANCO C6, OLE, ITAÚ" value={newBanco} onChange={(e) => setNewBanco(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full mt-2" disabled={isMutating}>
              {isMutating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Cadastrar Banco
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Bancos Cadastrados</CardTitle>
          <CardDescription>Gerencie quais bancos estão disponíveis, código Febraban e produtos operados</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {bancos.isLoading ? (
            <div className="p-6 text-center text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" /> Carregando...
            </div>
          ) : !bancos.data || bancos.data.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">Nenhum banco cadastrado.</div>
          ) : (
            <div className="divide-y divide-border">
              {bancos.data.map((b) => {
                const extra = extraById.get(b.id);
                const produtos = extra
                  ? [
                      extra.opera_margem_livre && 'Margem Livre',
                      extra.opera_portabilidade && 'Portabilidade',
                      extra.opera_refin && 'Refin',
                      extra.opera_cartao && 'Cartão',
                    ].filter(Boolean).join(' · ')
                  : '';
                return (
                  <div key={b.id} className="p-4 flex items-center justify-between text-sm">
                    <div className="space-y-0.5">
                      <div className="font-semibold text-foreground">
                        {b.nome} {extra?.codigo_febraban && <span className="text-xs text-muted-foreground font-mono">({extra.codigo_febraban})</span>}
                      </div>
                      {produtos && <div className="text-xs text-muted-foreground">{produtos}</div>}
                      {extra?.observacoes && <div className="text-xs text-muted-foreground">{extra.observacoes}</div>}
                    </div>
                    <div className="flex items-center gap-4 select-none">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => extra && openEdit(extra)} disabled={isMutating}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{b.ativo ? 'Ativo' : 'Inativo'}</span>
                        <Switch checked={b.ativo} onCheckedChange={(val) => handleToggleBanco(b.id, val, b.nome)} disabled={isMutating} />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeleteBanco(b.id, b.nome)}
                        disabled={isMutating}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Banco — {editing?.nome}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Código Febraban</Label>
              <Input value={editState.codigo_febraban} onChange={(e) => setEditState((s) => ({ ...s, codigo_febraban: e.target.value }))} placeholder="Ex: 341" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center justify-between border rounded-md p-2">
                <Label className="text-xs">Margem Livre</Label>
                <Switch checked={editState.opera_margem_livre} onCheckedChange={(v) => setEditState((s) => ({ ...s, opera_margem_livre: v }))} />
              </div>
              <div className="flex items-center justify-between border rounded-md p-2">
                <Label className="text-xs">Portabilidade</Label>
                <Switch checked={editState.opera_portabilidade} onCheckedChange={(v) => setEditState((s) => ({ ...s, opera_portabilidade: v }))} />
              </div>
              <div className="flex items-center justify-between border rounded-md p-2">
                <Label className="text-xs">Refin</Label>
                <Switch checked={editState.opera_refin} onCheckedChange={(v) => setEditState((s) => ({ ...s, opera_refin: v }))} />
              </div>
              <div className="flex items-center justify-between border rounded-md p-2">
                <Label className="text-xs">Cartão</Label>
                <Switch checked={editState.opera_cartao} onCheckedChange={(v) => setEditState((s) => ({ ...s, opera_cartao: v }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Observações</Label>
              <Textarea value={editState.observacoes} onChange={(e) => setEditState((s) => ({ ...s, observacoes: e.target.value }))} />
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

export default BancosSection;
