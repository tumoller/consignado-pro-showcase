import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import Index from "./pages/Index";
import Contatos from "./pages/Contatos";
import Conversas from "./pages/Conversas";
import Campanhas from "./pages/Campanhas";
import Automacao from "./pages/Automacao";
import Templates from "./pages/Templates";
import Integracoes from "./pages/Integracoes";
import Configuracoes from "./pages/Configuracoes";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppShell>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/contatos" element={<Contatos />} />
            <Route path="/conversas" element={<Conversas />} />
            <Route path="/campanhas" element={<Campanhas />} />
            <Route path="/automacao" element={<Automacao />} />
            <Route path="/templates" element={<Templates />} />
            <Route path="/integracoes" element={<Integracoes />} />
            <Route path="/configuracoes" element={<Configuracoes />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppShell>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
