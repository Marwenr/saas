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
  title: 'CloudERP - Gérez toute votre entreprise depuis une seule plateforme',
  description:
    "Un système ERP intelligent qui unifie les ventes, la comptabilité, les RH et l'inventaire dans un tableau de bord puissant",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr" suppressHydrationWarning>
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
