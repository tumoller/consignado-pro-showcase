
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

const plans = [
  {
    name: "Trial",
    price: "Grátis",
    period: "/ 14 dias",
    features: [
      "Acesso a todos os recursos",
      "1.000 contatos",
      "1 usuário",
      "Suporte via comunidade",
    ],
    cta: "Iniciar Teste",
    variant: "ghost"
  },
  {
    name: "Basic",
    price: "R$ 49",
    period: "/mês",
    features: [
      "Acesso a todos os recursos",
      "5.000 contatos",
      "Até 3 usuários",
      "Suporte via e-mail",
    ],
    cta: "Assinar Plano Basic",
    variant: "default"
  },
  {
    name: "Pro",
    price: "R$ 99",
    period: "/mês",
    features: [
      "Acesso a todos os recursos",
      "Contatos ilimitados",
      "Usuários ilimitados",
      "Suporte prioritário por WhatsApp",
    ],
    cta: "Assinar Plano Pro",
    variant: "default"
  },
];

export const SubscriptionPage = () => {
  return (
    <div className="container mx-auto py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight">Planos de Assinatura</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Escolha o plano que melhor se adapta às suas necessidades.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {plans.map((plan) => (
          <Card key={plan.name} className={`flex flex-col ${plan.name === 'Basic' ? 'border-primary' : ''}`}>
            <CardHeader>
              <CardTitle>{plan.name}</CardTitle>
              <CardDescription>
                <span className="text-3xl font-bold">{plan.price}</span>
                <span className="text-muted-foreground">{plan.period}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <ul className="space-y-4">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center">
                    <Check className="h-5 w-5 text-green-500 mr-2" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button className="w-full" variant={plan.variant as any}>
                {plan.cta}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
};
