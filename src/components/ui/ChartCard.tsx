import { ReactNode, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface ChartCardProps {
  title: string;
  children: ReactNode;
  showPeriodSelector?: boolean;
  onPeriodChange?: (period: string) => void;
  footer?: ReactNode;
  className?: string;
  isLoading?: boolean;
}

export const ChartCard = ({
  title,
  children,
  showPeriodSelector = false,
  onPeriodChange,
  footer,
  className,
  isLoading = false
}: ChartCardProps) => {
  const [selectedPeriod, setSelectedPeriod] = useState('7');

  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period);
    onPeriodChange?.(period);
  };

  if (isLoading) {
    return (
      <Card className={cn("", className)}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="h-6 w-32 bg-muted animate-pulse rounded" />
            {showPeriodSelector && (
              <div className="h-9 w-24 bg-muted animate-pulse rounded" />
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">
            {title}
          </CardTitle>
          {showPeriodSelector && (
            <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
              <SelectTrigger className="w-auto">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 dias</SelectItem>
                <SelectItem value="14">14 dias</SelectItem>
                <SelectItem value="30">30 dias</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {children}
        {footer && (
          <div className="mt-4 pt-4 border-t border-border">
            {footer}
          </div>
        )}
      </CardContent>
    </Card>
  );
};