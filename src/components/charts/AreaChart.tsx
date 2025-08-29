import { AreaChart as RechartsAreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TimeSeriesData } from '@/data/mock';

interface AreaChartProps {
  data: TimeSeriesData[];
  height?: number;
}

export const AreaChart = ({ data, height = 300 }: AreaChartProps) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  const formatTooltipDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', { 
      weekday: 'long',
      day: '2-digit', 
      month: 'long' 
    });
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsAreaChart
        data={data}
        margin={{
          top: 10,
          right: 30,
          left: 0,
          bottom: 0,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis 
          dataKey="date" 
          tickFormatter={formatDate}
          className="text-muted-foreground"
          fontSize={12}
        />
        <YAxis 
          className="text-muted-foreground"
          fontSize={12}
        />
        <Tooltip 
          labelFormatter={(value) => formatTooltipDate(value as string)}
          formatter={(value: number, name: string) => [
            value,
            name === 'envios' ? 'Envios' : 'Respostas'
          ]}
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '0.5rem',
            fontSize: '0.875rem'
          }}
        />
        <Area
          type="monotone"
          dataKey="respostas"
          stackId="1"
          stroke="hsl(var(--primary))"
          fill="hsl(var(--primary))"
          fillOpacity={0.6}
        />
      </RechartsAreaChart>
    </ResponsiveContainer>
  );
};