'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Container from '../../../components/Container';
import AuthGuard from '../../../components/AuthGuard';
import CustomerForm from '../../../components/CustomerForm';
import { useAuth } from '../../../lib/useAuth';

/**
 * New Customer page - Création d'un nouveau client
 */
function NewCustomerPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const [showForm, setShowForm] = useState(true);

  const handleFormClose = (saved = false) => {
    if (saved) {
      router.push('/clients');
    } else {
      router.back();
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-[var(--text-secondary)]">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // AuthGuard will handle redirect
  }

  return (
    <div className="py-8">
      <Container>
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-[var(--text-primary)] mb-2">
            Nouveau client
          </h1>
        </div>

        {/* Customer Form Modal */}
        {showForm && (
          <CustomerForm
            customer={null}
            onClose={() => handleFormClose(false)}
          />
        )}
      </Container>
    </div>
  );
}

export default function NewCustomer() {
  return (
    <AuthGuard>
      <NewCustomerPage />
    </AuthGuard>
  );
}
