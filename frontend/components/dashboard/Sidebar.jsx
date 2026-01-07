'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../lib/useAuth';
import { useSidebar } from '../../lib/useSidebar';
import {
  LayoutDashboard,
  Package,
  Warehouse,
  DollarSign,
  CreditCard,
  TrendingUp,
  Tag,
  BarChart3,
  ShoppingCart,
  Building2,
  Search,
  Users,
  UserCog,
  X,
  Menu,
  ChevronRight,
  Cloud,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';

/**
 * Dashboard Sidebar Component
 * Side navigation menu with collapsible sections
 */
export default function Sidebar() {
  const pathname = usePathname();
  const { isAuthenticated, user } = useAuth();
  const { isOpen, toggleSidebar } = useSidebar();

  if (!isAuthenticated) {
    return null;
  }

  // Main navigation items (always visible at top)
  const mainNavItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/products', label: 'Products', icon: Package },
    { href: '/inventory', label: 'Inventory', icon: Warehouse },
    { href: '/sales', label: 'Sales', icon: DollarSign },
    { href: '/pos', label: 'POS', icon: CreditCard },
  ];

  const analyticsItems = [
    { href: '/analytics', label: 'Analytics', icon: TrendingUp },
    { href: '/analytics/suppliers', label: 'Suppliers Analytics', icon: Tag },
    { href: '/analytics/sales', label: 'Sales Analytics', icon: BarChart3 },
  ];

  const stockManagementItems = [
    {
      href: '/purchases',
      label: 'Achats / Bons de commande',
      icon: ShoppingCart,
    },
    { href: '/suppliers', label: 'Fournisseurs', icon: Building2 },
    {
      href: '/ai-reference-search',
      label: 'Recherche Correspondances',
      icon: Search,
    },
  ];

  const salesItems = [{ href: '/clients', label: 'Clients', icon: Users }];

  const managementItems = [
    { href: '/users', label: 'Gestion utilisateurs', icon: UserCog },
  ];

  const isActive = href => {
    if (href === '/dashboard' || href === '/') {
      return pathname === '/dashboard' || pathname === '/';
    }
    return pathname?.startsWith(href);
  };

  const NavLink = ({ href, label, icon: Icon, isActive: active }) => (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        active
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
        !isOpen && 'justify-center'
      )}
      title={!isOpen ? label : ''}
    >
      <Icon className="h-5 w-5 flex-shrink-0" />
      {isOpen && <span className="truncate">{label}</span>}
    </Link>
  );

  const NavSection = ({ title, items, className }) => {
    if (!isOpen && !title) {
      return (
        <div className={cn('space-y-1', className)}>
          {items.map(item => {
            const active = isActive(item.href);
            return (
              <NavLink
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                isActive={active}
              />
            );
          })}
        </div>
      );
    }

    return (
      <div className={cn('space-y-1', className)}>
        {isOpen && title && (
          <h3 className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {title}
          </h3>
        )}
        {items.map(item => {
          const active = isActive(item.href);
          return (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              isActive={active}
            />
          );
        })}
      </div>
    );
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 h-screen w-64 border-r bg-card transition-all duration-300 ease-in-out md:translate-x-0',
          !isOpen && 'md:w-16 -translate-x-full md:translate-x-0'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo and Toggle button */}
          <div className="flex h-16 items-center justify-between border-b px-4">
            {isOpen && (
              <Link
                href="/dashboard"
                className="flex items-center gap-2 font-semibold"
              >
                <Cloud className="h-6 w-6 text-primary" />
                <span className="text-lg text-foreground">CloudERP</span>
              </Link>
            )}
            {!isOpen && (
              <Link
                href="/dashboard"
                className="flex items-center justify-center"
              >
                <Cloud className="h-6 w-6 text-primary" />
              </Link>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className="md:hidden"
              aria-label="Toggle sidebar"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Scrollable navigation */}
          <ScrollArea className="flex-1 px-3 py-4">
            <nav className="space-y-6">
              {/* Main Navigation */}
              <NavSection items={mainNavItems} />

              <Separator />

              {/* Analytics Section */}
              <NavSection title="Analytics" items={analyticsItems} />

              <Separator />

              {/* Stock Management Section */}
              <NavSection title="Gestion stock" items={stockManagementItems} />

              <Separator />

              {/* Sales Section */}
              <NavSection title="Ventes" items={salesItems} />

              {/* Administration Section (Owner only) */}
              {user?.role === 'owner' && (
                <>
                  <Separator />
                  <NavSection title="Administration" items={managementItems} />
                </>
              )}
            </nav>
          </ScrollArea>

          {/* Desktop toggle button */}
          <div className="hidden border-t p-4 md:block">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className="w-full"
              aria-label={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            >
              {isOpen ? (
                <ChevronRight className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}
