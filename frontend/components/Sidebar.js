'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../lib/useAuth';
import { useSidebar } from '../lib/useSidebar';
import {
  LayoutDashboard,
  TrendingUp,
  Tag,
  BarChart3,
  Package,
  ShoppingCart,
  Building2,
  Search,
  CreditCard,
  DollarSign,
  Users,
  UserCog,
  X,
  Menu,
} from 'lucide-react';

/**
 * Sidebar component - Side navigation menu (drawer style)
 */
export default function Sidebar() {
  const pathname = usePathname();
  const { isAuthenticated, user } = useAuth();
  const { isOpen, toggleSidebar } = useSidebar();

  // Don't render sidebar if user is not authenticated
  if (!isAuthenticated) {
    return null;
  }

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  ];

  const analyticsItems = [
    { href: '/analytics', label: 'Analytics', icon: TrendingUp },
    { href: '/analytics/suppliers', label: 'Suppliers Analytics', icon: Tag },
    { href: '/analytics/sales', label: 'Sales Analytics', icon: BarChart3 },
  ];

  const stockManagementItems = [
    { href: '/inventory', label: 'Inventaire', icon: Package },
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

  const salesItems = [
    { href: '/pos', label: 'Point de vente (POS)', icon: CreditCard },
    { href: '/sales', label: 'Ventes', icon: DollarSign },
    { href: '/clients', label: 'Clients', icon: Users },
  ];

  const managementItems = [
    { href: '/users', label: 'Gestion utilisateurs', icon: UserCog },
  ];

  const isActive = href => {
    return pathname?.startsWith(href);
  };

  return (
    <aside
      className={`
        fixed top-16 left-0 h-[calc(100vh-4rem)] z-50
        flex flex-col
        border-r border-[var(--border-color)] bg-[var(--bg-secondary)]
        transition-all duration-300 ease-in-out
        ${isOpen ? 'w-64' : 'w-16'}
      `}
    >
      {/* Toggle button */}
      <div
        className={`flex ${isOpen ? 'justify-end' : 'justify-center'} p-4 border-b border-[var(--border-color)]`}
      >
        <button
          onClick={toggleSidebar}
          className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
          aria-label={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          title={isOpen ? 'Réduire' : 'Agrandir'}
        >
          {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      <nav
        className={`flex-1 py-6 space-y-6 overflow-y-auto ${isOpen ? 'px-4' : 'px-2'}`}
      >
        {/* General navigation items */}
        <div className="space-y-2">
          {navItems.map(item => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center ${isOpen ? 'px-4' : 'px-2 justify-center'} py-3 text-sm font-medium rounded-lg transition-colors
                  ${
                    active
                      ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
                  }
                `}
                title={!isOpen ? item.label : ''}
              >
                <item.icon
                  className={`${isOpen ? 'mr-3' : 'mr-0'} w-5 h-5 flex-shrink-0`}
                />
                {isOpen && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </div>

        {/* Analytics section - only visible when authenticated */}
        {isAuthenticated && (
          <div className="space-y-2">
            {isOpen && (
              <h3 className="px-4 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                Analytics
              </h3>
            )}
            {analyticsItems.map(item => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    flex items-center ${isOpen ? 'px-4' : 'px-2 justify-center'} py-3 text-sm font-medium rounded-lg transition-colors
                    ${
                      active
                        ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
                    }
                  `}
                  title={!isOpen ? item.label : ''}
                >
                  <item.icon
                    className={`${isOpen ? 'mr-3' : 'mr-0'} w-5 h-5 flex-shrink-0`}
                  />
                  {isOpen && <span className="truncate">{item.label}</span>}
                </Link>
              );
            })}
          </div>
        )}

        {/* Stock management section - only visible when authenticated */}
        {isAuthenticated && (
          <div className="space-y-2">
            {isOpen && (
              <h3 className="px-4 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                Gestion stock
              </h3>
            )}
            {stockManagementItems.map(item => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    flex items-center ${isOpen ? 'px-4' : 'px-2 justify-center'} py-3 text-sm font-medium rounded-lg transition-colors
                    ${
                      active
                        ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
                    }
                  `}
                  title={!isOpen ? item.label : ''}
                >
                  <item.icon
                    className={`${isOpen ? 'mr-3' : 'mr-0'} w-5 h-5 flex-shrink-0`}
                  />
                  {isOpen && <span className="truncate">{item.label}</span>}
                </Link>
              );
            })}
          </div>
        )}

        {/* Sales section - only visible when authenticated */}
        {isAuthenticated && (
          <div className="space-y-2">
            {isOpen && (
              <h3 className="px-4 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                Ventes
              </h3>
            )}
            {salesItems.map(item => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    flex items-center ${isOpen ? 'px-4' : 'px-2 justify-center'} py-3 text-sm font-medium rounded-lg transition-colors
                    ${
                      active
                        ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
                    }
                  `}
                  title={!isOpen ? item.label : ''}
                >
                  <item.icon
                    className={`${isOpen ? 'mr-3' : 'mr-0'} w-5 h-5 flex-shrink-0`}
                  />
                  {isOpen && <span className="truncate">{item.label}</span>}
                </Link>
              );
            })}
          </div>
        )}

        {/* Management section - only visible for owners */}
        {isAuthenticated && user?.role === 'owner' && (
          <div className="space-y-2">
            {isOpen && (
              <h3 className="px-4 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                Administration
              </h3>
            )}
            {managementItems.map(item => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    flex items-center ${isOpen ? 'px-4' : 'px-2 justify-center'} py-3 text-sm font-medium rounded-lg transition-colors
                    ${
                      active
                        ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
                    }
                  `}
                  title={!isOpen ? item.label : ''}
                >
                  <item.icon
                    className={`${isOpen ? 'mr-3' : 'mr-0'} w-5 h-5 flex-shrink-0`}
                  />
                  {isOpen && <span className="truncate">{item.label}</span>}
                </Link>
              );
            })}
          </div>
        )}
      </nav>
    </aside>
  );
}
