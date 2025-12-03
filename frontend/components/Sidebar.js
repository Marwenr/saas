'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../lib/useAuth';

/**
 * Sidebar component - Side navigation menu
 */
export default function Sidebar() {
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();

  // Don't render sidebar if user is not authenticated
  if (!isAuthenticated) {
    return null;
  }

  const navItems = [{ href: '/dashboard', label: 'Dashboard', icon: '📊' }];

  const analyticsItems = [
    { href: '/analytics', label: 'Analytics', icon: '📈' },
    { href: '/analytics/suppliers', label: 'Suppliers Analytics', icon: '🏷️' },
    { href: '/analytics/sales', label: 'Sales Analytics', icon: '📊' },
  ];

  const stockManagementItems = [
    { href: '/inventory', label: 'Inventaire', icon: '📦' },
    { href: '/purchases', label: 'Achats / Bons de commande', icon: '🛒' },
    { href: '/suppliers', label: 'Fournisseurs', icon: '🏢' },
    {
      href: '/ai-reference-search',
      label: 'Recherche Correspondances',
      icon: '🔍',
    },
  ];

  const salesItems = [
    { href: '/pos', label: 'Point de vente (POS)', icon: '💳' },
    { href: '/sales', label: 'Ventes', icon: '💰' },
    { href: '/clients', label: 'Clients', icon: '👥' },
  ];

  const isActive = href => {
    return pathname?.startsWith(href);
  };

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:pt-16 border-r border-[var(--border-color)] bg-[var(--bg-secondary)]">
      <nav className="flex-1 px-4 py-6 space-y-6">
        {/* General navigation items */}
        <div className="space-y-2">
          {navItems.map(item => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors
                  ${
                    active
                      ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
                  }
                `}
              >
                <span className="mr-3 text-lg">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Analytics section - only visible when authenticated */}
        {isAuthenticated && (
          <div className="space-y-2">
            <h3 className="px-4 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
              Analytics
            </h3>
            {analyticsItems.map(item => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors
                    ${
                      active
                        ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
                    }
                  `}
                >
                  <span className="mr-3 text-lg">{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </div>
        )}

        {/* Stock management section - only visible when authenticated */}
        {isAuthenticated && (
          <div className="space-y-2">
            <h3 className="px-4 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
              Gestion stock
            </h3>
            {stockManagementItems.map(item => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors
                    ${
                      active
                        ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
                    }
                  `}
                >
                  <span className="mr-3 text-lg">{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </div>
        )}

        {/* Sales section - only visible when authenticated */}
        {isAuthenticated && (
          <div className="space-y-2">
            <h3 className="px-4 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
              Ventes
            </h3>
            {salesItems.map(item => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors
                    ${
                      active
                        ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
                    }
                  `}
                >
                  <span className="mr-3 text-lg">{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </div>
        )}
      </nav>
    </aside>
  );
}
