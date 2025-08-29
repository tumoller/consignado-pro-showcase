import { ReactNode } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface KpiCardProps {
  title: string;
  value: string | number;
  variation?: number;
  icon?: ReactNode;
  className?: string;
  isLoading?: boolean;
}

export const KpiCard = ({
  title,
  value,
  variation,
  icon,
  className,
  isLoading = false
}: KpiCardProps) => {
  const isPositive = variation && variation > 0;
  const isNegative = variation && variation < 0;

  if (isLoading) {
    return (
      <Card className={cn("", className)}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="h-4 w-20 bg-muted animate-pulse rounded" />
            {icon && (
              <div className="h-5 w-5 bg-muted animate-pulse rounded" />
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-8 w-24 bg-muted animate-pulse rounded mb-2" />
          <div className="h-4 w-16 bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("transition-all hover:shadow-md", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted-foreground">
            {title}
          </h3>
          {icon && (
            <div className="text-muted-foreground">
              {icon}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between">
          <div>
            <div className="text-2xl font-bold text-foreground">
              {value}
            </div>
            {variation !== undefined && (
              <div className={cn(
                "flex items-center text-sm font-medium mt-1",
                isPositive && "text-success",
                isNegative && "text-destructive",
                variation === 0 && "text-muted-foreground"
              )}>
                {isPositive && <TrendingUp className="h-4 w-4 mr-1" />}
                {isNegative && <TrendingDown className="h-4 w-4 mr-1" />}
                {variation > 0 && '+'}
                {variation}%
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};