// src/pages/AgenteIA.tsx — Configuração do agente WhatsApp "Aurus"
import { useEffect, useState } from 'react';
import { Bot, Save, Loader2, AlertTriangle, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbPage } from '@/components/ui/breadcrumb';
import { toast } from 'sonner';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import {
  useConfigAgente,
  useMutationConfigAgente,
  useAtividadeAgenteHoje,
  ConfigAgente,
} from '@/hooks/useConfigNegocio';

const PERSONA_PADRAO_RESUMO = `Aurus é o assistente virtual especialista em crédito consignado do INSS.
Tom: cordial, direto, profissional — nunca robótico.
Objetivo: qualificar o lead, entender a necessidade (empréstimo, cartão, refin/portabilidade),
coletar dados básicos e agendar/encaminhar para o operador humano quando necessário.
Regras: nunca promete taxa fechada sem simulação; nunca solicita senha ou dados sensíveis
fora do fluxo oficial; respeita horário de atendimento configurado.
Este é um resumo — o prompt completo padrão fica embutido na function do agente.`;

const PROVIDERS = [
  { value: 'anthropic', label: 'Anthropic', disabled: false },
  { value: 'openai', label: 'OpenAI', disabled: true },
  { value: 'gemini', label: 'Gemini', disabled: true },
] as const;

const MODELOS_POR_PROVIDER: Record<string, { value: string; label: string; descricao: string }[]> = {
  anthropic: [
    { value: 'claude-sonnet-5', label: 'Claude Sonnet 5', descricao: 'Equilíbrio entre custo e raciocínio (recomendado)' },
    { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5', descricao: 'Mais rápido e barato, ideal para alto volume' },
    { value: 'claude-opus-4-8', label: 'Claude Opus 4.8', descricao: 'Máximo raciocínio, custo mais alto' },
  ],
  openai: [],
  gemini: [],
};

function chamadaText(payload: unknown): string {
  if (payload == null) return '';
  if (typeof payload === 'string') return payload;
  try {
    return JSON.stringify(payload).slice(0, 160);
  } catch {
    return '';
  }
}

const AgenteIA = () => {
  const { activeWorkspaceId } = useWorkspace();
  const config = useConfigAgente(activeWorkspaceId);
  const mutate = useMutationConfigAgente(activeWorkspaceId);
  const atividade = useAtividadeAgenteHoje(activeWorkspaceId);

  const [personaDialogOpen, setPersonaDialogOpen] = useState(false);

  // Estado local por card, sincronizado quando os dados chegam
  const [statusForm, setStatusForm] = useState<{ enabled: boolean } | null>(null);
  const [identidadeForm, setIdentidadeForm] = useState<{ nome_agente: string; assinatura: string; persona_prompt: string } | null>(null);
  const [modeloForm, setModeloForm] = useState<{ provider: string; modelo: string; max_chamadas_dia: string; max_chamadas_conversa: string; debounce_segundos: string } | null>(null);
  const [horarioForm, setHorarioForm] = useState<{ full24h: boolean; horario_inicio: string; horario_fim: string } | null>(null);

  useEffect(() => {
    if (!config.data) return;
    if (statusForm === null) setStatusForm({ enabled: config.data.enabled });
    if (identidadeForm === null) {
      setIdentidadeForm({
        nome_agente: config.data.nome_agente,
        assinatura: config.data.assinatura,
        persona_prompt: config.data.persona_prompt ?? '',
      });
    }
    if (modeloForm === null) {
      setModeloForm({
        provider: config.data.provider ?? 'anthropic',
        modelo: config.data.modelo,
        max_chamadas_dia: String(config.data.max_chamadas_dia),
        max_chamadas_conversa: String(config.data.max_chamadas_conversa),
        debounce_segundos: String(config.data.debounce_segundos),
      });
    }
    if (horarioForm === null) {
      setHorarioForm({
        full24h: !config.data.horario_inicio && !config.data.horario_fim,
        horario_inicio: config.data.horario_inicio?.slice(0, 5) ?? '08:00',
        horario_fim: config.data.horario_fim?.slice(0, 5) ?? '20:00',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.data]);

  const saveField = (updates: Partial<ConfigAgente>, successMsg: string) => {
    mutate.mutate(updates, {
      onSuccess: () => toast.success(successMsg),
      onError: (err: any) => toast.error(`Erro ao salvar: ${err.message}`),
    });
  };

  const isLoading = config.isLoading;

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>Agente IA</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Bot className="h-7 w-7 text-primary" /> Agente IA — Aurus
          </h1>
          <p className="text-muted-foreground mt-1">Configure o assistente de WhatsApp especialista em consignado INSS</p>
        </div>
        {!isLoading && statusForm && (
          <Badge variant={statusForm.enabled ? 'default' : 'secondary'}>
            {statusForm.enabled ? 'Ligado' : 'Desligado'}
          </Badge>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* CARD 1: STATUS */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Status</CardTitle>
              <CardDescription>Liga/desliga o atendimento automático via WhatsApp</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="font-medium text-foreground">Agente ativo</div>
                  <p className="text-sm text-muted-foreground max-w-lg">
                    Quando ativo, o Aurus responde automaticamente às mensagens recebidas no WhatsApp,
                    qualifica leads e simula crédito dentro dos limites configurados abaixo.
                  </p>
                </div>
                <Switch
                  checked={statusForm?.enabled ?? false}
                  onCheckedChange={(val) => {
                    setStatusForm({ enabled: val });
                    saveField({ enabled: val }, `Agente ${val ? 'ativado' : 'desativado'} com sucesso!`);
                  }}
                  disabled={mutate.isPending}
                />
              </div>
            </CardContent>
          </Card>

          {/* CARD 2: IDENTIDADE */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Identidade</CardTitle>
              <CardDescription>Nome, assinatura e persona do agente</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Nome do Agente</Label>
                  <Input
                    value={identidadeForm?.nome_agente ?? ''}
                    onChange={(e) => setIdentidadeForm((f) => (f ? { ...f, nome_agente: e.target.value } : f))}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Assinatura</Label>
                  <Input
                    value={identidadeForm?.assinatura ?? ''}
                    onChange={(e) => setIdentidadeForm((f) => (f ? { ...f, assinatura: e.target.value } : f))}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label>Persona / Prompt Customizado</Label>
                  <button type="button" onClick={() => setPersonaDialogOpen(true)} className="text-xs text-primary hover:underline">
                    ver persona padrão
                  </button>
                </div>
                <Textarea
                  className="min-h-64 font-mono text-xs"
                  placeholder="Deixe vazio para usar a persona padrão do Aurus (embutida no sistema)."
                  value={identidadeForm?.persona_prompt ?? ''}
                  onChange={(e) => setIdentidadeForm((f) => (f ? { ...f, persona_prompt: e.target.value } : f))}
                />
              </div>
              <div className="flex justify-end">
                <Button
                  size="sm"
                  disabled={mutate.isPending || !identidadeForm}
                  onClick={() =>
                    identidadeForm &&
                    saveField(
                      {
                        nome_agente: identidadeForm.nome_agente.trim(),
                        assinatura: identidadeForm.assinatura.trim(),
                        persona_prompt: identidadeForm.persona_prompt.trim() || null,
                      },
                      'Identidade atualizada com sucesso!'
                    )
                  }
                >
                  {mutate.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Salvar Identidade
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* CARD 3: MODELO E LIMITES */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Modelo e Limites</CardTitle>
              <CardDescription>Escolha do modelo de IA e limites de uso por dia/conversa</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Provider</Label>
                  <Select
                    value={modeloForm?.provider ?? 'anthropic'}
                    onValueChange={(v) =>
                      setModeloForm((f) => {
                        if (!f) return f;
                        const modelosDoProvider = MODELOS_POR_PROVIDER[v] ?? [];
                        return {
                          ...f,
                          provider: v,
                          modelo: modelosDoProvider[0]?.value ?? f.modelo,
                        };
                      })
                    }
                  >
                    <SelectTrigger className="max-w-md"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PROVIDERS.map((p) => (
                        <SelectItem key={p.value} value={p.value} disabled={p.disabled}>
                          <span className="flex items-center gap-2">
                            {p.label}
                            {p.disabled && <Badge variant="secondary" className="text-[10px]">em breve</Badge>}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Modelo</Label>
                  <Select
                    value={modeloForm?.modelo ?? ''}
                    onValueChange={(v) => setModeloForm((f) => (f ? { ...f, modelo: v } : f))}
                  >
                    <SelectTrigger className="max-w-md"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(MODELOS_POR_PROVIDER[modeloForm?.provider ?? 'anthropic'] ?? []).map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          <span className="flex flex-col">
                            <span>{m.label}</span>
                            <span className="text-xs text-muted-foreground">{m.descricao}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label>Máximo de chamadas por dia</Label>
                  <Input
                    type="number"
                    min={0}
                    value={modeloForm?.max_chamadas_dia ?? ''}
                    onChange={(e) => setModeloForm((f) => (f ? { ...f, max_chamadas_dia: e.target.value } : f))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Limite total de respostas da IA para todo o workspace por dia (reseta à meia-noite, horário de São Paulo). 1 chamada = 1 resposta gerada pela IA. 0 = ilimitado.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {Number(modeloForm?.max_chamadas_dia) === 0 ? 'Ilimitado' : `Limite: ${modeloForm?.max_chamadas_dia}/dia`}
                  </p>
                </div>
                <div className="space-y-1">
                  <Label>Máximo de chamadas por conversa (por dia)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={modeloForm?.max_chamadas_conversa ?? ''}
                    onChange={(e) => setModeloForm((f) => (f ? { ...f, max_chamadas_conversa: e.target.value } : f))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Limite de respostas da IA para o MESMO contato por dia (reseta à meia-noite, horário de São Paulo). Evita abuso/spam e estouro de contexto. 0 = ilimitado.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {Number(modeloForm?.max_chamadas_conversa) === 0 ? 'Ilimitado' : `Limite: ${modeloForm?.max_chamadas_conversa}/conversa`}
                  </p>
                </div>
                <div className="space-y-1">
                  <Label>Debounce (segundos)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={modeloForm?.debounce_segundos ?? ''}
                    onChange={(e) => setModeloForm((f) => (f ? { ...f, debounce_segundos: e.target.value } : f))}
                  />
                  <p className="text-xs text-muted-foreground">Tempo de espera para agrupar mensagens seguidas antes de responder.</p>
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  size="sm"
                  disabled={mutate.isPending || !modeloForm}
                  onClick={() =>
                    modeloForm &&
                    saveField(
                      {
                        provider: modeloForm.provider,
                        modelo: modeloForm.modelo,
                        max_chamadas_dia: Number(modeloForm.max_chamadas_dia) || 0,
                        max_chamadas_conversa: Number(modeloForm.max_chamadas_conversa) || 0,
                        debounce_segundos: Number(modeloForm.debounce_segundos) || 0,
                      },
                      'Modelo e limites atualizados com sucesso!'
                    )
                  }
                >
                  {mutate.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Salvar Modelo e Limites
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* CARD 4: HORÁRIO DE ATENDIMENTO */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Horário de Atendimento</CardTitle>
              <CardDescription>Defina quando o agente responde automaticamente</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between max-w-md">
                <Label>Atender 24h</Label>
                <Switch
                  checked={horarioForm?.full24h ?? false}
                  onCheckedChange={(val) => setHorarioForm((f) => (f ? { ...f, full24h: val } : f))}
                />
              </div>
              {!horarioForm?.full24h && (
                <div className="grid grid-cols-2 gap-4 max-w-md">
                  <div className="space-y-1">
                    <Label>Início</Label>
                    <Input
                      type="time"
                      value={horarioForm?.horario_inicio ?? '08:00'}
                      onChange={(e) => setHorarioForm((f) => (f ? { ...f, horario_inicio: e.target.value } : f))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Fim</Label>
                    <Input
                      type="time"
                      value={horarioForm?.horario_fim ?? '20:00'}
                      onChange={(e) => setHorarioForm((f) => (f ? { ...f, horario_fim: e.target.value } : f))}
                    />
                  </div>
                </div>
              )}
              <p className="text-xs text-muted-foreground max-w-lg">
                Fora do horário configurado, as mensagens recebidas continuam sendo registradas no CRM
                normalmente, mas o agente não responde automaticamente — a conversa fica para atendimento
                humano ou é retomada pelo agente quando a janela de horário voltar.
              </p>
              <div className="flex justify-end">
                <Button
                  size="sm"
                  disabled={mutate.isPending || !horarioForm}
                  onClick={() =>
                    horarioForm &&
                    saveField(
                      horarioForm.full24h
                        ? { horario_inicio: null, horario_fim: null }
                        : { horario_inicio: horarioForm.horario_inicio, horario_fim: horarioForm.horario_fim },
                      'Horário de atendimento atualizado com sucesso!'
                    )
                  }
                >
                  {mutate.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Salvar Horário
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* CARD 5: ATIVIDADE HOJE */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Atividade Hoje</CardTitle>
              <CardDescription>Uso do agente no dia corrente</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {atividade.isLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" /> Carregando atividade...
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border rounded-md p-4">
                      <div className="text-xs text-muted-foreground">Chamadas de IA hoje</div>
                      <div className="text-2xl font-bold text-foreground mt-1">
                        {atividade.data?.chamadasIa ?? 0}
                        <span className="text-sm text-muted-foreground font-normal">
                          {' '}/ {Number(modeloForm?.max_chamadas_dia) === 0 ? 'Ilimitado' : modeloForm?.max_chamadas_dia ?? '—'}
                        </span>
                      </div>
                    </div>
                    <div className="border rounded-md p-4">
                      <div className="text-xs text-muted-foreground">Mensagens recebidas hoje</div>
                      <div className="text-2xl font-bold text-foreground mt-1">{atividade.data?.msgIn ?? 0}</div>
                    </div>
                  </div>

                  {atividade.data && atividade.data.erros.length > 0 && (
                    <div className="border border-destructive/40 bg-destructive/5 rounded-md p-4 space-y-2">
                      <div className="flex items-center gap-2 text-destructive font-medium text-sm">
                        <AlertTriangle className="h-4 w-4" /> {atividade.data.erros.length} erro(s) do agente hoje
                      </div>
                      <div className="space-y-1">
                        {atividade.data.erros.map((e) => (
                          <div key={e.id} className="text-xs text-muted-foreground">
                            {e.titulo ?? 'Erro'}: {chamadaText(e.payload)}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <Dialog open={personaDialogOpen} onOpenChange={setPersonaDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="h-4 w-4" /> Persona Padrão do Aurus
            </DialogTitle>
          </DialogHeader>
          <pre className="text-xs whitespace-pre-wrap text-muted-foreground">{PERSONA_PADRAO_RESUMO}</pre>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AgenteIA;
