import './globals.css';
import Navbar from '../components/Navbar';
import LayoutContent from '../components/LayoutContent';
import { Providers } from '../components/Providers';
import ConditionalContainer from '../components/ConditionalContainer';
import PageBackground from '../components/PageBackground';
import GlobalAuthGuard from '../components/GlobalAuthGuard';

/**
 * Root layout for Next.js App Router
 * Assembles navbar + sidebar + container
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
                {/* Navbar */}
                <Navbar />

                {/* Main layout with sidebar */}
                <LayoutContent>
                  <ConditionalContainer>{children}</ConditionalContainer>
                </LayoutContent>
              </div>
            </PageBackground>
          </GlobalAuthGuard>
        </Providers>
      </body>
    </html>
  );
}
