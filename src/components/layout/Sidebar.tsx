import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Home,
  Users,
  MessageSquare,
  Megaphone,
  Zap,
  FileText,
  Puzzle,
  Settings,
  Menu,
  X,
  CreditCard
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';
import { useAuth } from '@/contexts/AuthContext';


const navigationItems = [
  { name: 'Visão Geral', href: '/', icon: Home },
  { name: 'Contatos', href: '/contatos', icon: Users },
  { name: 'Conversas', href: '/conversas', icon: MessageSquare },
  { name: 'Campanhas', href: '/campanhas', icon: Megaphone },
  { name: 'Automação', href: '/automacao', icon: Zap },
  { name: 'Instâncias', href: '/instances', icon: Puzzle },
  { name: 'Templates', href: '/templates', icon: FileText },
  { name: 'Integrações', href: '/integracoes', icon: Puzzle },
  { name: 'Configurações', href: '/configuracoes', icon: Settings },
];

const AccountStatusCard = () => {
  const { profile, loading, error } = useAuth();

  const formatBillingStatus = (status: string | undefined) => {
    if (!status) return '-';
    const statusMap: { [key: string]: string } = {
      trial: 'Teste Gratuito',
      active: 'Ativo',
      paid: 'Pago',
      inactive: 'Inativo',
      canceled: 'Cancelado',
    };
    return statusMap[status] || status;
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString('pt-BR');
    } catch (error) {
      return 'Data inválida';
    }
  };

  return (
    <div className="px-4 pb-6">
      <div className="p-4 rounded-lg bg-sidebar-accent text-sidebar-accent-foreground">
        <div className="flex items-center mb-2">
          <CreditCard className="h-5 w-5 mr-3" />
          <h3 className="text-sm font-semibold">Status da Conta</h3>
        </div>
        {loading ? (
          <div className="space-y-2 animate-pulse">
            <div className="h-3 bg-gray-500/30 rounded w-3/4"></div>
            <div className="h-3 bg-gray-500/30 rounded w-1/2"></div>
          </div>
        ) : error ? (
          <p className="text-xs text-red-400">Erro ao carregar plano.</p>
        ) : (
          <>
            <p className="text-xs mt-2">
              Plano: <span className="font-bold">{formatBillingStatus(profile?.billing_status)}</span>
            </p>
            <p className="text-xs mt-1">
              Válido até: {formatDate(profile?.current_period_ends_at)}
            </p>
          </>
        )}
        <Button variant="secondary" className="w-full mt-4 h-8 text-xs">
          Gerenciar Assinatura
        </Button>
      </div>
    </div>
  );
};

export const Sidebar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={toggleMobileMenu}
        className="fixed top-4 left-4 z-50 lg:hidden p-2 rounded-md bg-card border border-border shadow-sm"
      >
        {isMobileMenuOpen ? (
          <X className="h-5 w-5" />
        ) : (
          <Menu className="h-5 w-5" />
        )}
      </button>

      {/* Backdrop for mobile */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={toggleMobileMenu}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          'fixed left-0 top-0 h-full bg-sidebar border-r border-sidebar-border z-50 transition-transform duration-300',
          'w-64 flex flex-col',
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className="p-6 border-b border-sidebar-border">
          <h1 className="text-xl font-bold text-sidebar-primary">
            Consignado Pro
          </h1>
          <p className="text-sm text-sidebar-muted mt-1">
            Dashboard de gestão
          </p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navigationItems.map((item) => {
            const isActive = location.pathname === item.href;
            
            return (
              <NavLink
                key={item.name}
                to={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  'flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                  isActive
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
                    : 'text-sidebar-foreground'
                )}
              >
                <item.icon className="h-5 w-5 mr-3 flex-shrink-0" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        <AccountStatusCard />

        {/* Footer */}
        <div className="p-4 border-t border-sidebar-border">
          <div className="text-xs text-sidebar-muted text-center">
            v1.0.0 - Dashboard
          </div>
        </div>
      </div>
    </>
  );
};