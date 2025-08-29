import { Megaphone } from 'lucide-react';
import { 
  Breadcrumb, 
  BreadcrumbList, 
  BreadcrumbItem, 
  BreadcrumbPage 
} from '@/components/ui/breadcrumb';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Campanhas = () => {
  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>Campanhas</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Campanhas</h1>
        <p className="text-muted-foreground mt-1">
          Crie e gerencie campanhas de marketing
        </p>
      </div>

      {/* Coming Soon Card */}
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Megaphone className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-xl">Em Breve</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              O módulo de campanhas permitirá criar e gerenciar:
            </p>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground text-left">
              <li>• Campanhas de divulgação em massa</li>
              <li>• Segmentação avançada de público</li>
              <li>• Agendamento de envios</li>
              <li>• Relatórios de performance</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Campanhas;