// src/components/configuracoes/ParametrosBancoSection.tsx
import { useMemo, useState } from 'react';
import { Loader2, Save, ChevronDown, History } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { useBancosAtivos } from '@/hooks/useCrmData';
import {
  useParametrosSimulacao,
  useMutationParametroSimulacao,
  useConfigCredito,
  useMutationConfigCredito,
} from '@/hooks/useConfigNegocio';
import { useWorkspace } from '@/contexts/WorkspaceContext';

// Aceita vírgula ou ponto como separador decimal. Retorna null se vazio.
function parseDecimal(v: string): number | null {
  const trimmed = v.trim();
  if (!trimmed) return null;
  const normalized = trimmed.replace(',', '.');
  const n = Number(normalized);
  return isNaN(n) ? null : n;
}

function fmt(n: number | null | undefined): string {
  if (n == null) return '';
  return String(n).replace('.', ',');
}

interface BancoFormState {
  coef_emprestimo: string;
  coef_cartao: string;
  taxa_portabilidade_perc: string;
  taxa_refin_perc: string;
  prazo_maximo_meses: string;
}

const emptyForm: BancoFormState = {
  coef_emprestimo: '',
  coef_cartao: '',
  taxa_portabilidade_perc: '',
  taxa_refin_perc: '',
  prazo_maximo_meses: '',
};

const ParametrosBancoSection = () => {
  const { activeWorkspaceId } = useWorkspace();
  const bancos = useBancosAtivos();
  const parametros = useParametrosSimulacao(activeWorkspaceId);
  const mutateParam = useMutationParametroSimulacao(activeWorkspaceId);

  const configCredito = useConfigCredito(activeWorkspaceId);
  const mutateGlobal = useMutationConfigCredito(activeWorkspaceId);

  const [globalForm, setGlobalForm] = useState<{ coef_emprestimo: string; coef_cartao: string; taxa_refin_nova_perc: string; prazo_refin_novo_meses: string } | null>(null);
  const [editingBancoId, setEditingBancoId] = useState<number | null>(null);
  const [bancoForm, setBancoForm] = useState<BancoFormState>(emptyForm);
  const [historyOpen, setHistoryOpen] = useState<Record<number, boolean>>({});

  const byBanco = useMemo(() => {
    const map: Record<number, typeof parametros.data> = {};
    (parametros.data ?? []).forEach((p) => {
      if (!map[p.banco_id]) map[p.banco_id] = [] as any;
      (map[p.banco_id] as any).push(p);
    });
    return map;
  }, [parametros.data]);

  const globalValues = globalForm ?? {
    coef_emprestimo: fmt(configCredito.data?.coef_emprestimo),
    coef_cartao: fmt(configCredito.data?.coef_cartao),
    taxa_refin_nova_perc: fmt(configCredito.data?.taxa_refin_nova_perc),
    prazo_refin_novo_meses: fmt(configCredito.data?.prazo_refin_novo_meses),
  };

  const handleSaveGlobal = () => {
    mutateGlobal.mutate(
      {
        coef_emprestimo: parseDecimal(globalValues.coef_emprestimo) ?? undefined,
        coef_cartao: parseDecimal(globalValues.coef_cartao) ?? undefined,
        taxa_refin_nova_perc: parseDecimal(globalValues.taxa_refin_nova_perc) ?? undefined,
        prazo_refin_novo_meses: parseDecimal(globalValues.prazo_refin_novo_meses) ?? undefined,
      },
      {
        onSuccess: () => {
          toast.success('Parâmetros globais atualizados com sucesso!');
          setGlobalForm(null);
        },
        onError: (err: any) => toast.error(`Erro ao atualizar parâmetros globais: ${err.message}`),
      }
    );
  };

  const openBancoEdit = (bancoId: number, current?: BancoFormState) => {
    setEditingBancoId(bancoId);
    setBancoForm(current ?? emptyForm);
  };

  const handleSaveBanco = () => {
    if (editingBancoId == null) return;
    mutateParam.mutate(
      {
        banco_id: editingBancoId,
        coef_emprestimo: parseDecimal(bancoForm.coef_emprestimo),
        coef_cartao: parseDecimal(bancoForm.coef_cartao),
        taxa_portabilidade_perc: parseDecimal(bancoForm.taxa_portabilidade_perc),
        taxa_refin_perc: parseDecimal(bancoForm.taxa_refin_perc),
        prazo_maximo_meses: parseDecimal(bancoForm.prazo_maximo_meses),
      },
      {
        onSuccess: () => {
          toast.success('Parâmetro do banco atualizado (novo registro vigente criado).');
          setEditingBancoId(null);
          setBancoForm(emptyForm);
        },
        onError: (err: any) => toast.error(`Erro ao atualizar parâmetro: ${err.message}`),
      }
    );
  };

  const isLoading = bancos.isLoading || parametros.isLoading || configCredito.isLoading;

  return (
    <div className="space-y-6">
      {/* Card informativo/editável dos defaults globais */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Parâmetros Globais (padrão)</CardTitle>
          <CardDescription>
            Vale para bancos sem parâmetro específico cadastrado abaixo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {configCredito.isLoading ? (
            <div className="text-center text-muted-foreground flex items-center justify-center gap-2 py-4">
              <Loader2 className="h-5 w-5 animate-spin" /> Carregando...
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Coef. Empréstimo</Label>
                <Input value={globalValues.coef_emprestimo} onChange={(e) => setGlobalForm({ ...globalValues, coef_emprestimo: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Coef. Cartão</Label>
                <Input value={globalValues.coef_cartao} onChange={(e) => setGlobalForm({ ...globalValues, coef_cartao: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Taxa Refin Nova (%)</Label>
                <Input value={globalValues.taxa_refin_nova_perc} onChange={(e) => setGlobalForm({ ...globalValues, taxa_refin_nova_perc: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Prazo Refin Novo (meses)</Label>
                <Input value={globalValues.prazo_refin_novo_meses} onChange={(e) => setGlobalForm({ ...globalValues, prazo_refin_novo_meses: e.target.value })} />
              </div>
            </div>
          )}
          <div className="flex justify-end mt-3">
            <Button size="sm" onClick={handleSaveGlobal} disabled={mutateGlobal.isPending || configCredito.isLoading}>
              {mutateGlobal.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar Globais
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Parâmetros por banco */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Parâmetros por Banco</CardTitle>
          <CardDescription>Editar cria um novo registro vigente e mantém o histórico anterior (versionamento).</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 text-center text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" /> Carregando...
            </div>
          ) : !bancos.data || bancos.data.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">Nenhum banco cadastrado.</div>
          ) : (
            <div className="divide-y divide-border">
              {bancos.data.map((b) => {
                const list = (byBanco[b.id] ?? []) as any[];
                const vigente = list.find((p) => p.ativo);
                const historico = list.filter((p) => !p.ativo);
                const isEditing = editingBancoId === b.id;
                return (
                  <div key={b.id} className="p-4 space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <div className="font-semibold text-foreground">{b.nome}</div>
                      {!isEditing && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            openBancoEdit(b.id, {
                              coef_emprestimo: fmt(vigente?.coef_emprestimo),
                              coef_cartao: fmt(vigente?.coef_cartao),
                              taxa_portabilidade_perc: fmt(vigente?.taxa_portabilidade_perc),
                              taxa_refin_perc: fmt(vigente?.taxa_refin_perc),
                              prazo_maximo_meses: fmt(vigente?.prazo_maximo_meses),
                            })
                          }
                        >
                          {vigente ? 'Editar' : 'Definir parâmetro específico'}
                        </Button>
                      )}
                    </div>

                    {vigente && !isEditing && (
                      <div className="text-xs text-muted-foreground grid grid-cols-2 md:grid-cols-5 gap-2">
                        <div>Coef. Empr.: <span className="text-foreground font-medium">{fmt(vigente.coef_emprestimo) || '—'}</span></div>
                        <div>Coef. Cartão: <span className="text-foreground font-medium">{fmt(vigente.coef_cartao) || '—'}</span></div>
                        <div>Portab. %: <span className="text-foreground font-medium">{fmt(vigente.taxa_portabilidade_perc) || '—'}</span></div>
                        <div>Refin %: <span className="text-foreground font-medium">{fmt(vigente.taxa_refin_perc) || '—'}</span></div>
                        <div>Prazo Máx.: <span className="text-foreground font-medium">{vigente.prazo_maximo_meses ?? '—'}</span></div>
                      </div>
                    )}
                    {!vigente && !isEditing && (
                      <div className="text-xs text-muted-foreground">Sem parâmetro específico — usa os globais acima.</div>
                    )}

                    {isEditing && (
                      <div className="space-y-3 bg-muted/30 p-3 rounded-md">
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Coef. Empréstimo</Label>
                            <Input value={bancoForm.coef_emprestimo} onChange={(e) => setBancoForm((f) => ({ ...f, coef_emprestimo: e.target.value }))} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Coef. Cartão</Label>
                            <Input value={bancoForm.coef_cartao} onChange={(e) => setBancoForm((f) => ({ ...f, coef_cartao: e.target.value }))} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Portabilidade %</Label>
                            <Input value={bancoForm.taxa_portabilidade_perc} onChange={(e) => setBancoForm((f) => ({ ...f, taxa_portabilidade_perc: e.target.value }))} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Refin %</Label>
                            <Input value={bancoForm.taxa_refin_perc} onChange={(e) => setBancoForm((f) => ({ ...f, taxa_refin_perc: e.target.value }))} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Prazo Máx. (meses)</Label>
                            <Input value={bancoForm.prazo_maximo_meses} onChange={(e) => setBancoForm((f) => ({ ...f, prazo_maximo_meses: e.target.value }))} />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => setEditingBancoId(null)}>Cancelar</Button>
                          <Button size="sm" onClick={handleSaveBanco} disabled={mutateParam.isPending}>
                            {mutateParam.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                            Salvar (novo vigente)
                          </Button>
                        </div>
                      </div>
                    )}

                    {historico.length > 0 && (
                      <Collapsible open={!!historyOpen[b.id]} onOpenChange={(open) => setHistoryOpen((h) => ({ ...h, [b.id]: open }))}>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1">
                            <History className="h-3 w-3" /> Ver histórico ({historico.length})
                            <ChevronDown className="h-3 w-3" />
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-2 space-y-2">
                          {historico.map((h) => (
                            <div key={h.id} className="text-xs text-muted-foreground border-l-2 border-border pl-2">
                              Vigente desde {h.vigente_desde}: Coef. Empr. {fmt(h.coef_emprestimo) || '—'}, Coef. Cartão {fmt(h.coef_cartao) || '—'},
                              Portab. {fmt(h.taxa_portabilidade_perc) || '—'}%, Refin {fmt(h.taxa_refin_perc) || '—'}%, Prazo {h.prazo_maximo_meses ?? '—'}m
                            </div>
                          ))}
                        </CollapsibleContent>
                      </Collapsible>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ParametrosBancoSection;
