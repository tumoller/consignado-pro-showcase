import { FileText } from 'lucide-react';
import { 
  Breadcrumb, 
  BreadcrumbList, 
  BreadcrumbItem, 
  BreadcrumbPage 
} from '@/components/ui/breadcrumb';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Templates = () => {
  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>Templates</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Templates</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie modelos de mensagens e documentos
        </p>
      </div>

      {/* Coming Soon Card */}
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-xl">Em Breve</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Biblioteca de templates para otimizar seu atendimento:
            </p>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground text-left">
              <li>• Templates de mensagens WhatsApp</li>
              <li>• Modelos de propostas comerciais</li>
              <li>• Documentos personalizáveis</li>
              <li>• Variáveis dinâmicas</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Templates;