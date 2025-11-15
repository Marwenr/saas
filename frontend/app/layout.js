import './globals.css';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import Container from '../components/Container';

/**
 * Root layout for Next.js App Router
 * Assembles navbar + sidebar + container
 */
export const metadata = {
  title: 'SaaS Starter',
  description: 'Clean, flexible SaaS starter monorepo',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <div className="min-h-screen flex flex-col">
          {/* Navbar */}
          <Navbar />

          {/* Main layout with sidebar */}
          <div className="flex flex-1 pt-16">
            {/* Sidebar */}
            <Sidebar />

            {/* Main content area */}
            <main className="flex-1 lg:pl-64">
              <Container>
                {children}
              </Container>
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
