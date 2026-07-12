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
  CreditCard,
  Wallet,
  AlarmClock,
  Bot,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useSidebar } from '@/contexts/SidebarContext';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '../ui/tooltip';


const navigationItems = [
  { name: 'Visão Geral', href: '/', icon: Home },
  { name: 'Contatos', href: '/contatos', icon: Users },
  { name: 'Propostas', href: '/propostas', icon: Wallet },
  { name: 'Follow-ups', href: '/followups', icon: AlarmClock },
  { name: 'Conversas', href: '/conversas', icon: MessageSquare },
  { name: 'Agente IA', href: '/agente', icon: Bot },
  { name: 'Campanhas', href: '/campanhas', icon: Megaphone },
  { name: 'Automação', href: '/automacao', icon: Zap },
  { name: 'Templates', href: '/templates', icon: FileText },
  { name: 'WhatsApp', href: '/instances', icon: Puzzle },
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
            <div className="h-3 bg-muted-foreground/20 rounded w-3/4"></div>
            <div className="h-3 bg-muted-foreground/20 rounded w-1/2"></div>
          </div>
        ) : error ? (
          <p className="text-xs text-destructive">Erro ao carregar plano.</p>
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
  const { collapsed, toggleCollapsed } = useSidebar();

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <TooltipProvider delayDuration={200}>
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
          'fixed left-0 top-0 h-full bg-sidebar border-r border-sidebar-border z-50 transition-all duration-300',
          'flex flex-col',
          collapsed ? 'lg:w-16' : 'lg:w-64',
          'w-64',
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className={cn('p-6 border-b border-sidebar-border relative', collapsed && 'lg:p-4')}>
          {!collapsed && (
            <>
              <h1 className="text-xl font-bold text-sidebar-primary">
                Consignado Pro
              </h1>
              <p className="text-sm text-sidebar-muted mt-1">
                Dashboard de gestão
              </p>
            </>
          )}
          {collapsed && (
            <h1 className="hidden lg:block text-xl font-bold text-sidebar-primary text-center">CP</h1>
          )}

          {/* Botão recolher/expandir (desktop) */}
          <button
            onClick={toggleCollapsed}
            className="hidden lg:flex absolute -right-3 top-6 h-6 w-6 items-center justify-center rounded-full bg-card border border-border shadow-sm hover:bg-accent"
            aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
            title={collapsed ? 'Expandir menu' : 'Recolher menu'}
          >
            {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navigationItems.map((item) => {
            const isActive = location.pathname === item.href;

            const link = (
              <NavLink
                key={item.name}
                to={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  'flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                  collapsed && 'lg:justify-center',
                  isActive
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
                    : 'text-sidebar-foreground'
                )}
              >
                <item.icon className={cn('h-5 w-5 flex-shrink-0 mr-3', collapsed && 'lg:mr-0')} />
                <span className={cn(collapsed && 'lg:hidden')}>{item.name}</span>
              </NavLink>
            );

            if (!collapsed) return link;

            return (
              <Tooltip key={item.name}>
                <TooltipTrigger asChild>
                  {link}
                </TooltipTrigger>
                <TooltipContent side="right">{item.name}</TooltipContent>
              </Tooltip>
            );
          })}
        </nav>

        {!collapsed && <AccountStatusCard />}

        {/* Footer */}
        <div className="p-4 border-t border-sidebar-border">
          <div className="text-xs text-sidebar-muted text-center">
            {collapsed ? 'v1.0.0' : 'v1.0.0 - Dashboard'}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};