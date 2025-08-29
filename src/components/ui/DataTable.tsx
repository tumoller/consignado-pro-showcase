import { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Column {
  key: string;
  title: string;
  render?: (value: any, item: any) => ReactNode;
}

interface DataTableProps {
  title: string;
  columns: Column[];
  data: any[];
  className?: string;
  isLoading?: boolean;
}

export const DataTable = ({
  title,
  columns,
  data,
  className,
  isLoading = false
}: DataTableProps) => {
  if (isLoading) {
    return (
      <Card className={cn("", className)}>
        <CardHeader>
          <div className="h-6 w-40 bg-muted animate-pulse rounded" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex space-x-4">
                {columns.map((_, j) => (
                  <div
                    key={j}
                    className="h-4 bg-muted animate-pulse rounded flex-1"
                  />
                ))}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className="text-left pb-3 text-sm font-medium text-muted-foreground"
                  >
                    {column.title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((item, index) => (
                <tr
                  key={index}
                  className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors"
                >
                  {columns.map((column) => (
                    <td key={column.key} className="py-3 text-sm">
                      {column.render
                        ? column.render(item[column.key], item)
                        : item[column.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginação estática */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
          <div className="text-sm text-muted-foreground">
            Mostrando {data.length} de {data.length} registros
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" disabled>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Anterior
            </Button>
            <Button variant="outline" size="sm" disabled>
              Próxima
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Helper para renderizar status badge
export const StatusBadge = ({ status }: { status: 'aberta' | 'fechada' }) => (
  <Badge
    variant={status === 'aberta' ? 'default' : 'secondary'}
    className={cn(
      status === 'aberta' && "bg-success/10 text-success hover:bg-success/20",
      status === 'fechada' && "bg-muted text-muted-foreground"
    )}
  >
    {status === 'aberta' ? 'Aberta' : 'Fechada'}
  </Badge>
);