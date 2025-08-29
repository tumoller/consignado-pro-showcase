import { Users } from 'lucide-react';
import { 
  Breadcrumb, 
  BreadcrumbList, 
  BreadcrumbItem, 
  BreadcrumbPage 
} from '@/components/ui/breadcrumb';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Contatos = () => {
  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>Contatos</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Contatos</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie sua base de contatos e leads
        </p>
      </div>

      {/* Coming Soon Card */}
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-xl">Em Breve</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              A gestão de contatos estará disponível em breve. Aqui você poderá:
            </p>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground text-left">
              <li>• Importar e organizar contatos</li>
              <li>• Segmentar por critérios específicos</li>
              <li>• Acompanhar histórico de interações</li>
              <li>• Gerenciar tags e categorias</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Contatos;