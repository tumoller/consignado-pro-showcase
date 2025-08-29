import { useState, useEffect } from 'react';
import { Users, MessageSquare, Send, TrendingUp, Zap } from 'lucide-react';
import { KpiCard } from '@/components/ui/KpiCard';
import { ChartCard } from '@/components/ui/ChartCard';
import { DataTable, StatusBadge } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  kpiData, 
  timeSeriesData, 
  ultimasConversas,
  formatNumber,
  formatPercentage,
  simulateLoading 
} from '@/data/mock';

// Dynamic imports para os gráficos (simulando comportamento Next.js)
const AreaChart = ({ data }: { data: any[] }) => {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  if (!mounted) {
    return (
      <div className="h-[300px] w-full bg-muted animate-pulse rounded flex items-center justify-center">
        <div className="text-muted-foreground">Carregando gráfico...</div>
      </div>
    );
  }
  
  return <div className="h-[300px] w-full bg-muted/20 rounded flex items-center justify-center border-2 border-dashed border-border">
    <div className="text-center text-muted-foreground">
      <TrendingUp className="h-8 w-8 mx-auto mb-2" />
      <div className="font-medium">Gráfico de Área</div>
      <div className="text-sm">Dados: {data.length} pontos</div>
    </div>
  </div>;
};

const BarChart = ({ data }: { data: any[] }) => {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  if (!mounted) {
    return (
      <div className="h-[300px] w-full bg-muted animate-pulse rounded flex items-center justify-center">
        <div className="text-muted-foreground">Carregando gráfico...</div>
      </div>
    );
  }
  
  return <div className="h-[300px] w-full bg-muted/20 rounded flex items-center justify-center border-2 border-dashed border-border">
    <div className="text-center text-muted-foreground">
      <div className="flex space-x-2 mb-2 justify-center">
        <div className="w-4 h-8 bg-primary/60 rounded"></div>
        <div className="w-4 h-6 bg-secondary/60 rounded"></div>
        <div className="w-4 h-10 bg-primary/60 rounded"></div>
      </div>
      <div className="font-medium">Gráfico de Barras</div>
      <div className="text-sm">Envios x Respostas</div>
    </div>
  </div>;
};

const Index = () => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    simulateLoading(800).then(() => setIsLoading(false));
  }, []);

  const tableColumns = [
    {
      key: 'nome',
      title: 'Contato',
    },
    {
      key: 'telefone',
      title: 'Telefone',
    },
    {
      key: 'ultimaMensagem',
      title: 'Última Mensagem',
      render: (value: string) => (
        <div className="max-w-xs truncate" title={value}>
          {value}
        </div>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      render: (value: 'aberta' | 'fechada') => <StatusBadge status={value} />,
    },
    {
      key: 'atualizadoEm',
      title: 'Atualizado',
      render: (value: string) => (
        <span className="text-muted-foreground text-sm">
          {value}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Visão Geral</h1>
        <p className="text-muted-foreground mt-1">
          Acompanhe o desempenho das suas campanhas de consignado
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard
          title="Leads Ativos"
          value={formatNumber(kpiData.leadsAtivos)}
          variation={kpiData.variacaoLeads}
          icon={<Users className="h-5 w-5" />}
          isLoading={isLoading}
        />
        <KpiCard
          title="Conversas Ativas"
          value={kpiData.conversasAtivas}
          variation={kpiData.variacaoConversas}
          icon={<MessageSquare className="h-5 w-5" />}
          isLoading={isLoading}
        />
        <KpiCard
          title="Mensagens Hoje"
          value={kpiData.mensagensHoje}
          variation={kpiData.variacaoMensagens}
          icon={<Send className="h-5 w-5" />}
          isLoading={isLoading}
        />
        <KpiCard
          title="Taxa de Resposta"
          value={formatPercentage(kpiData.taxaResposta)}
          variation={kpiData.variacaoTaxa}
          icon={<TrendingUp className="h-5 w-5" />}
          isLoading={isLoading}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="Respostas nos Últimos Dias"
          showPeriodSelector
          isLoading={isLoading}
        >
          <AreaChart data={timeSeriesData} />
        </ChartCard>

        <ChartCard
          title="Envios x Respostas"
          showPeriodSelector
          isLoading={isLoading}
        >
          <BarChart data={timeSeriesData} />
        </ChartCard>
      </div>

      {/* Table and CTA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <DataTable
            title="Últimas Conversas"
            columns={tableColumns}
            data={ultimasConversas}
            isLoading={isLoading}
          />
        </div>

        <div className="space-y-6">
          {/* CTA Wuzapi */}
          <Card>
            <CardContent className="p-6">
              <div className="text-center space-y-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">
                    Integração Wuzapi
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Conecte sua conta Wuzapi para automatizar conversas
                  </p>
                </div>
                <Button className="w-full" disabled>
                  Conectar Wuzapi
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Status do Sistema */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold text-foreground mb-4">
                Status do Sistema
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">WhatsApp API</span>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-success rounded-full mr-2"></div>
                    <span className="text-sm font-medium text-success">Online</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Banco de Dados</span>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-success rounded-full mr-2"></div>
                    <span className="text-sm font-medium text-success">Online</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Automação</span>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-warning rounded-full mr-2"></div>
                    <span className="text-sm font-medium text-warning">Pausada</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
