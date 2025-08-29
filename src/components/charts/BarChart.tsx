import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TimeSeriesData } from '@/data/mock';

interface BarChartProps {
  data: TimeSeriesData[];
  height?: number;
}

export const BarChart = ({ data, height = 300 }: BarChartProps) => {
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
      <RechartsBarChart
        data={data}
        margin={{
          top: 20,
          right: 30,
          left: 20,
          bottom: 5,
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
        <Legend 
          formatter={(value) => value === 'envios' ? 'Envios' : 'Respostas'}
        />
        <Bar 
          dataKey="envios" 
          fill="hsl(var(--secondary))" 
          radius={[2, 2, 0, 0]}
        />
        <Bar 
          dataKey="respostas" 
          fill="hsl(var(--primary))" 
          radius={[2, 2, 0, 0]}
        />
      </RechartsBarChart>
    </ResponsiveContainer>
  );
};