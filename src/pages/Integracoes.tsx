import { Puzzle } from 'lucide-react';
import { 
  Breadcrumb, 
  BreadcrumbList, 
  BreadcrumbItem, 
  BreadcrumbPage 
} from '@/components/ui/breadcrumb';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Integracoes = () => {
  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>Integrações</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Integrações</h1>
        <p className="text-muted-foreground mt-1">
          Conecte com sistemas externos e APIs
        </p>
      </div>

      {/* Coming Soon Card */}
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Puzzle className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-xl">Em Breve</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Central de integrações com diversos sistemas:
            </p>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground text-left">
              <li>• WhatsApp Business API</li>
              <li>• CRMs populares (HubSpot, Pipedrive)</li>
              <li>• Ferramentas de e-mail marketing</li>
              <li>• Webhooks personalizados</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Integracoes;