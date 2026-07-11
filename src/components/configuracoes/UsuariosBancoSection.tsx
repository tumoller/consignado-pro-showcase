// src/components/configuracoes/UsuariosBancoSection.tsx
import { useState } from 'react';
import { Plus, Loader2, Pencil, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useBancosAtivos } from '@/hooks/useCrmData';
import { usePromotoras, useUsuariosBanco, useMutationUsuarioBanco, UsuarioBanco } from '@/hooks/useConfigNegocio';
import { useWorkspace } from '@/contexts/WorkspaceContext';

const DUPLICATE_CODE = '23505';

function friendlyError(err: any): string {
  if (err?.code === DUPLICATE_CODE) {
    return 'Esse login já existe para esse banco/promotora.';
  }
  return err?.message ?? 'Erro desconhecido.';
}

interface FormState {
  banco_id: string;
  promotora_id: string;
  login: string;
  senha_ref: string;
  observacoes: string;
}

const emptyForm: FormState = { banco_id: '', promotora_id: '', login: '', senha_ref: '', observacoes: '' };

const UsuariosBancoSection = () => {
  const { activeWorkspaceId } = useWorkspace();
  const bancos = useBancosAtivos();
  const promotoras = usePromotoras(activeWorkspaceId);
  const usuarios = useUsuariosBanco(activeWorkspaceId);
  const mutate = useMutationUsuarioBanco(activeWorkspaceId);

  const [form, setForm] = useState<FormState>(emptyForm);
  const [editing, setEditing] = useState<UsuarioBanco | null>(null);
  const [editForm, setEditForm] = useState<FormState>(emptyForm);

  const isMutating = mutate.isPending;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.banco_id || !form.login.trim()) return;
    mutate.mutate(
      {
        banco_id: Number(form.banco_id),
        promotora_id: form.promotora_id ? Number(form.promotora_id) : null,
        login: form.login.trim(),
        senha_ref: form.senha_ref.trim() || null,
        observacoes: form.observacoes.trim() || null,
        action: 'create',
      },
      {
        onSuccess: () => {
          toast.success('Usuário de banco cadastrado com sucesso!');
          setForm(emptyForm);
        },
        onError: (err: any) => toast.error(friendlyError(err)),
      }
    );
  };

  const handleToggleAtivo = (u: UsuarioBanco, val: boolean) => {
    mutate.mutate(
      { id: u.id, banco_id: u.banco_id, promotora_id: u.promotora_id, login: u.login, senha_ref: u.senha_ref, observacoes: u.observacoes, ativo: val, action: 'update' },
      {
        onSuccess: () => toast.success(`Usuário "${u.login}" ${val ? 'ativado' : 'desativado'}.`),
        onError: (err: any) => toast.error(friendlyError(err)),
      }
    );
  };

  const openEdit = (u: UsuarioBanco) => {
    setEditing(u);
    setEditForm({
      banco_id: String(u.banco_id),
      promotora_id: u.promotora_id ? String(u.promotora_id) : '',
      login: u.login,
      senha_ref: u.senha_ref ?? '',
      observacoes: u.observacoes ?? '',
    });
  };

  const handleSaveEdit = () => {
    if (!editing) return;
    mutate.mutate(
      {
        id: editing.id,
        banco_id: Number(editForm.banco_id),
        promotora_id: editForm.promotora_id ? Number(editForm.promotora_id) : null,
        login: editForm.login.trim(),
        senha_ref: editForm.senha_ref.trim() || null,
        observacoes: editForm.observacoes.trim() || null,
        ativo: editing.ativo,
        action: 'update',
      },
      {
        onSuccess: () => {
          toast.success('Usuário de banco atualizado com sucesso!');
          setEditing(null);
        },
        onError: (err: any) => toast.error(friendlyError(err)),
      }
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card className="md:col-span-1 h-fit">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Novo Usuário de Banco</CardTitle>
          <CardDescription>Credenciais de acesso ao sistema do banco</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="space-y-3">
            <div className="space-y-1">
              <Label>Banco</Label>
              <Select value={form.banco_id} onValueChange={(v) => setForm((f) => ({ ...f, banco_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione o banco" /></SelectTrigger>
                <SelectContent>
                  {(bancos.data ?? []).map((b) => (
                    <SelectItem key={b.id} value={String(b.id)}>{b.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Promotora (opcional)</Label>
              <Select value={form.promotora_id} onValueChange={(v) => setForm((f) => ({ ...f, promotora_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione a promotora" /></SelectTrigger>
                <SelectContent>
                  {(promotoras.data ?? []).map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="ub-login">Login</Label>
              <Input id="ub-login" value={form.login} onChange={(e) => setForm((f) => ({ ...f, login: e.target.value }))} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ub-senha">Referência da Senha</Label>
              <Input id="ub-senha" placeholder="Ex: mesma do e-mail" value={form.senha_ref} onChange={(e) => setForm((f) => ({ ...f, senha_ref: e.target.value }))} />
              <p className="text-xs text-muted-foreground flex items-start gap-1 mt-1">
                <Info className="h-3 w-3 mt-0.5 shrink-0" />
                Apenas um apelido/referência. NUNCA guarde a senha real aqui.
              </p>
            </div>
            <div className="space-y-1">
              <Label htmlFor="ub-obs">Observações</Label>
              <Input id="ub-obs" value={form.observacoes} onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))} />
            </div>
            <Button type="submit" className="w-full mt-2" disabled={isMutating || !form.banco_id}>
              {isMutating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Adicionar Usuário
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Usuários de Banco Cadastrados</CardTitle>
          <CardDescription>Ative/desative ou edite os acessos cadastrados</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {usuarios.isLoading ? (
            <div className="p-6 text-center text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" /> Carregando...
            </div>
          ) : !usuarios.data || usuarios.data.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">Nenhum usuário de banco cadastrado.</div>
          ) : (
            <div className="divide-y divide-border">
              {usuarios.data.map((u) => (
                <div key={u.id} className="p-4 flex items-center justify-between text-sm">
                  <div className="space-y-0.5">
                    <div className="font-semibold text-foreground">
                      {u.login} <span className="text-xs text-muted-foreground font-normal">— {u.bancos_ativos?.nome ?? '—'}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {u.promotoras?.nome ? `Promotora: ${u.promotoras.nome}` : 'Sem promotora'}
                      {u.senha_ref ? ` · Ref. senha: ${u.senha_ref}` : ''}
                    </div>
                    {u.observacoes && <div className="text-xs text-muted-foreground">{u.observacoes}</div>}
                  </div>
                  <div className="flex items-center gap-4 select-none">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => openEdit(u)} disabled={isMutating}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{u.ativo ? 'Ativo' : 'Inativo'}</span>
                      <Switch checked={u.ativo} onCheckedChange={(val) => handleToggleAtivo(u, val)} disabled={isMutating} />
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
            <DialogTitle>Editar Usuário de Banco</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Banco</Label>
              <Select value={editForm.banco_id} onValueChange={(v) => setEditForm((f) => ({ ...f, banco_id: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(bancos.data ?? []).map((b) => (
                    <SelectItem key={b.id} value={String(b.id)}>{b.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Promotora</Label>
              <Select value={editForm.promotora_id} onValueChange={(v) => setEditForm((f) => ({ ...f, promotora_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Sem promotora" /></SelectTrigger>
                <SelectContent>
                  {(promotoras.data ?? []).map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Login</Label>
              <Input value={editForm.login} onChange={(e) => setEditForm((f) => ({ ...f, login: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Referência da Senha</Label>
              <Input value={editForm.senha_ref} onChange={(e) => setEditForm((f) => ({ ...f, senha_ref: e.target.value }))} />
              <p className="text-xs text-muted-foreground flex items-start gap-1 mt-1">
                <Info className="h-3 w-3 mt-0.5 shrink-0" />
                Apenas um apelido/referência. NUNCA guarde a senha real aqui.
              </p>
            </div>
            <div className="space-y-1">
              <Label>Observações</Label>
              <Input value={editForm.observacoes} onChange={(e) => setEditForm((f) => ({ ...f, observacoes: e.target.value }))} />
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

export default UsuariosBancoSection;
