import { MessageSquare } from 'lucide-react';
import { 
  Breadcrumb, 
  BreadcrumbList, 
  BreadcrumbItem, 
  BreadcrumbPage 
} from '@/components/ui/breadcrumb';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Conversas = () => {
  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>Conversas</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Conversas</h1>
        <p className="text-muted-foreground mt-1">
          Acompanhe e gerencie suas conversas ativas
        </p>
      </div>

      {/* Coming Soon Card */}
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-xl">Em Breve</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              O gerenciamento de conversas estará disponível em breve. Recursos incluem:
            </p>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground text-left">
              <li>• Interface de chat em tempo real</li>
              <li>• Respostas rápidas e templates</li>
              <li>• Transferência entre atendentes</li>
              <li>• Histórico completo de mensagens</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Conversas;