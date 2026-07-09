// src/App.tsx

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Componentes e Páginas
import { AppShell } from "@/components/layout/AppShell";
import { SubscriptionGuard } from "@/components/auth/SubscriptionGuard";
import Index from "./pages/Index";
import Instances from "./pages/Instances";
import Contatos from "./pages/Contatos";
import Conversas from "./pages/Conversas";
import Propostas from "./pages/Propostas";
import FollowUps from "./pages/FollowUps";
import Campanhas from "./pages/Campanhas";
import Automacao from "./pages/Automacao";
import Templates from "./pages/Templates";
import Configuracoes from "./pages/Configuracoes";
import { SubscriptionPage } from "./pages/Subscription";
import { LoginPage } from "./pages/Login";

// Nossos Provedores de Contexto
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { WorkspaceProvider } from "./contexts/WorkspaceContext";

const queryClient = new QueryClient();

// ==================================================================
// 1. CRIAMOS UM COMPONENTE FILHO PARA A LÓGICA DAS ROTAS
// ==================================================================
const AppRoutes = () => {
  // Agora, o useAuth() é chamado DENTRO dos provedores, o que é correto.
  const { session, loading } = useAuth();

  // Esta tela de carregamento agora funcionará como esperado.
  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div>Carregando...</div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      {session ? (
        // Rotas para usuários LOGADOS
        <AppShell>
          <Routes>
            <Route element={<SubscriptionGuard />}>
              <Route path="/" element={<Index />} />
              <Route path="/instances" element={<Instances />} />
              <Route path="/contatos" element={<Contatos />} />
              <Route path="/propostas" element={<Propostas />} />
              <Route path="/followups" element={<FollowUps />} />
              <Route path="/conversas" element={<Conversas />} />
              <Route path="/campanhas" element={<Campanhas />} />
              <Route path="/automacao" element={<Automacao />} />
              <Route path="/templates" element={<Templates />} />
              <Route path="/configuracoes" element={<Configuracoes />} />
              <Route path="/subscription" element={<SubscriptionPage />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Route>
          </Routes>
        </AppShell>
      ) : (
        // Rotas para usuários DESLOGADOS
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      )}
    </BrowserRouter>
  );
};

// ==================================================================
// 2. O COMPONENTE APP AGORA SÓ CONFIGURA OS PROVEDORES GLOBAIS
// ==================================================================
const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
          <WorkspaceProvider>
            {/* O AppRoutes é renderizado aqui, DENTRO de todos os contextos necessários */}
            <AppRoutes />
          </WorkspaceProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;