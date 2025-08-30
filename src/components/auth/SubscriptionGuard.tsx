// src/components/auth/SubscriptionGuard.tsx

import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export const SubscriptionGuard = () => {
  // CORREÇÃO AQUI: Chamamos o useAuth apenas UMA VEZ e pegamos tudo o que precisamos.
  const { profile, loading, error } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div>Carregando informações do plano...</div>; // Ou um spinner/skeleton
  }

  if (error) {
    console.error("SubscriptionGuard Error:", error);
    return <div>Erro ao verificar a assinatura.</div>;
  }

  const isSubscriptionPage = location.pathname === "/subscription";

  // Se, após o carregamento, não houver perfil, algo está errado.
  // Redirecionar para a página de assinatura é uma ação segura.
  if (!profile) {
    if (isSubscriptionPage) {
      // Se já estiver na página de assinatura, permite que ela seja renderizada.
      return <Outlet />;
    }
    return <Navigate to="/subscription" replace />;
  }

  // Lógica de validação da assinatura (seu código original estava perfeito)
  const now = new Date();
  const endDate = profile.current_period_ends_at ? new Date(profile.current_period_ends_at) : null;
  const hasExpired = endDate ? now > endDate : true;
  const isActiveStatus = profile.billing_status === "trial" || profile.billing_status === "paid" || profile.billing_status === "active";

  const isSubscriptionValid = isActiveStatus && !hasExpired;

  if (!isSubscriptionValid) {
    if (isSubscriptionPage) {
      // Se a assinatura não é válida, mas ele já está na página para resolver isso, permite.
      return <Outlet />;
    }
    // Se não, redireciona para lá.
    return <Navigate to="/subscription" replace />;
  }

  // Se a assinatura é válida, renderiza a página solicitada.
  return <Outlet />;
};