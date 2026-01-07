import './globals.css';
import LayoutContent from '../components/LayoutContent';
import { Providers } from '../components/Providers';
import PageBackground from '../components/PageBackground';
import GlobalAuthGuard from '../components/GlobalAuthGuard';

/**
 * Root layout for Next.js App Router
 * Assembles sidebar + container (no top navbar)
 */
export const metadata = {
  title: 'CloudERP - Manage Your Entire Business From One Platform',
  description:
    'A smart ERP system that unifies sales, accounting, HR, and inventory into one powerful dashboard',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          <GlobalAuthGuard>
            <PageBackground>
              <div className="min-h-screen flex flex-col">
                {/* Main layout with sidebar (no top navbar) */}
                <LayoutContent>{children}</LayoutContent>
              </div>
            </PageBackground>
          </GlobalAuthGuard>
        </Providers>
      </body>
    </html>
  );
}
