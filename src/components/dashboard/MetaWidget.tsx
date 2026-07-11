// src/components/dashboard/MetaWidget.tsx — Progresso da meta do mês corrente
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
  const [formVolume, setFormVolume] = useState('');
  const [formComissao, setFormComissao] = useState('');
  const [formFechamentos, setFormFechamentos] = useState('');

  const isLoading = meta.isLoading || realizado.isLoading;

  const openDialog = () => {
    setFormVolume(meta.data?.meta_volume?.toString() ?? '');
    setFormComissao(meta.data?.meta_comissao?.toString() ?? '');
    setFormFechamentos(meta.data?.meta_fechamentos?.toString() ?? '');
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    await upsertMeta.mutateAsync({
      meta_volume: Number(formVolume) || 0,
      meta_comissao: Number(formComissao) || 0,
      meta_fechamentos: Number(formFechamentos) || 0,
    });
    setIsDialogOpen(false);
  };

  const r = realizado.data ?? { comissao: 0, volume: 0, fechamentos: 0 };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-semibold flex items-center gap-2 capitalize">
          <Target className="h-4 w-4 text-primary" /> Meta de {nomeMesAtual()}
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
                <span className="text-muted-foreground">Comissão</span>
                <span className="font-medium text-foreground">
                  {fmtBRL(r.comissao)} / {fmtBRL(meta.data.meta_comissao)}
                </span>
              </div>
              <Progress value={pct(r.comissao, meta.data.meta_comissao ?? 0)} />
            </div>
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-muted-foreground">Volume</span>
                <span className="font-medium text-foreground">
                  {fmtBRL(r.volume)} / {fmtBRL(meta.data.meta_volume)}
                </span>
              </div>
              <Progress value={pct(r.volume, meta.data.meta_volume ?? 0)} />
            </div>
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-muted-foreground">Fechamentos</span>
                <span className="font-medium text-foreground">
                  {r.fechamentos} / {meta.data.meta_fechamentos ?? 0}
                </span>
              </div>
              <Progress value={pct(r.fechamentos, meta.data.meta_fechamentos ?? 0)} />
            </div>
          </div>
        )}
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="capitalize">Meta de {nomeMesAtual()}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="meta-volume">Meta de volume (R$)</Label>
              <Input
                id="meta-volume"
                type="number"
                value={formVolume}
                onChange={(e) => setFormVolume(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="meta-comissao">Meta de comissão (R$)</Label>
              <Input
                id="meta-comissao"
                type="number"
                value={formComissao}
                onChange={(e) => setFormComissao(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="meta-fechamentos">Meta de fechamentos</Label>
              <Input
                id="meta-fechamentos"
                type="number"
                value={formFechamentos}
                onChange={(e) => setFormFechamentos(e.target.value)}
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
