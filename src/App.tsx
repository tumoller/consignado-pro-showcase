import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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
import { LoginPage } from "./pages/Login";
import { useAuth } from "./contexts/AuthContext";

const queryClient = new QueryClient();

const App = () => {
  const { session, loading } = useAuth();

  if (loading) {
    return <div>Carregando...</div>; // Você pode substituir por um splash screen
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          {session ? (
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
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </AppShell>
          ) : (
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="*" element={<Navigate to="/login" />} />
            </Routes>
          )}
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
