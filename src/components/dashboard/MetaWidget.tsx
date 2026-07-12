// src/components/dashboard/MetaWidget.tsx — Progresso da meta de comissão do mês corrente
import { useState } from 'react';
import { Target, Pencil } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { fmtBRL } from '@/hooks/useCrmData';
import { useMetaMesAtual, useRealizadoMesAtual, useUpsertMeta } from '@/hooks/useHojeData';

const pct = (realizado: number, meta: number) => {
  if (!meta || meta <= 0) return 0;
  return Math.min(100, Math.round((realizado / meta) * 100));
};

const nomeMesAtual = () =>
  new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

export function MetaWidget() {
  const { activeWorkspaceId } = useWorkspace();
  const meta = useMetaMesAtual(activeWorkspaceId);
  const realizado = useRealizadoMesAtual(activeWorkspaceId);
  const upsertMeta = useUpsertMeta(activeWorkspaceId);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formComissao, setFormComissao] = useState('');

  const isLoading = meta.isLoading || realizado.isLoading;

  const openDialog = () => {
    setFormComissao(meta.data?.meta_comissao?.toString() ?? '');
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    await upsertMeta.mutateAsync({
      meta_comissao: Number(formComissao) || 0,
    });
    setIsDialogOpen(false);
  };

  const r = realizado.data ?? {
    digitado: 0,
    cancelado: 0,
    comissaoRecebida: 0,
    comissaoPrevista: 0,
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-semibold flex items-center gap-2 capitalize">
          <Target className="h-4 w-4 text-primary" /> Meta de comissão de {nomeMesAtual()}
        </CardTitle>
        {meta.data && (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={openDialog}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        ) : !meta.data ? (
          <div className="flex flex-col items-center justify-center gap-2 py-4 text-center">
            <p className="text-sm text-muted-foreground">Nenhuma meta cadastrada para este mês.</p>
            <Button size="sm" onClick={openDialog}>
              Definir meta
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-muted-foreground">Comissão recebida</span>
                <span className="font-medium text-foreground">
                  {fmtBRL(r.comissaoRecebida)} / {fmtBRL(meta.data.meta_comissao)}
                </span>
              </div>
              <Progress value={pct(r.comissaoRecebida, meta.data.meta_comissao ?? 0)} />
              <div className="text-right text-[11px] text-muted-foreground mt-1">
                {pct(r.comissaoRecebida, meta.data.meta_comissao ?? 0)}% da meta
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg border p-2.5">
                <div className="text-muted-foreground">Digitado no mês</div>
                <div className="font-medium text-foreground mt-0.5">{fmtBRL(r.digitado)}</div>
              </div>
              <div className="rounded-lg border p-2.5">
                <div className="text-muted-foreground">Cancelado no mês</div>
                <div className="font-medium text-destructive mt-0.5">{fmtBRL(r.cancelado)}</div>
              </div>
              <div className="rounded-lg border p-2.5">
                <div className="text-muted-foreground">Comissão recebida</div>
                <div className="font-medium text-success mt-0.5">{fmtBRL(r.comissaoRecebida)}</div>
              </div>
              <div className="rounded-lg border p-2.5">
                <div className="text-muted-foreground">Comissão prevista</div>
                <div className="font-medium text-foreground mt-0.5">{fmtBRL(r.comissaoPrevista)}</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="capitalize">Meta de comissão de {nomeMesAtual()}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="meta-comissao">Meta de comissão (R$)</Label>
              <Input
                id="meta-comissao"
                type="number"
                value={formComissao}
                onChange={(e) => setFormComissao(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSave} disabled={upsertMeta.isPending}>
              {upsertMeta.isPending ? 'Salvando...' : 'Salvar meta'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
