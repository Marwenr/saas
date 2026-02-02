'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

import AuthGuard from '../../../../components/AuthGuard';
import { useAuth } from '../../../../lib/useAuth';
import {
  fetchCustomer,
  fetchCustomerFinance,
  fetchCustomerInvoices,
  recordCustomerPayment,
} from '../../../../lib/customers';

function CustomerFinanceInner() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [finance, setFinance] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');

  const customerId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  const loadData = async () => {
    if (!customerId || authLoading || !isAuthenticated) return;
    try {
      setLoading(true);
      setError(null);

      const [customerData, financeData, invoicesData] = await Promise.all([
        fetchCustomer(customerId),
        fetchCustomerFinance(customerId),
        fetchCustomerInvoices(customerId, {
          page: pagination.page,
          limit: pagination.limit,
          status: statusFilter || undefined,
        }),
      ]);

      setCustomer(customerData.customer);
      setFinance(financeData.finance);
      setInvoices(invoicesData.invoices);
      setPagination(invoicesData.pagination);
    } catch (e) {
      console.error(e);
      setError(e.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [customerId, authLoading, isAuthenticated, pagination.page, statusFilter]);

  const handlePaymentSubmit = async e => {
    e.preventDefault();
    if (!selectedInvoice) return;

    const formData = new FormData(e.target);
    const amount = parseFloat(formData.get('amount'));
    const paymentMethod = formData.get('paymentMethod');
    const reference = formData.get('reference')?.trim() || undefined;
    const notes = formData.get('notes')?.trim() || undefined;

    if (!amount || amount <= 0) {
      alert('Le montant doit être supérieur à 0');
      return;
    }

    if (amount > selectedInvoice.remainingAmount) {
      alert(
        `Le montant ne peut pas dépasser le montant restant (${selectedInvoice.remainingAmount.toFixed(3)} TND)`
      );
      return;
    }

    try {
      setPaymentLoading(true);
      await recordCustomerPayment(customerId, {
        invoiceId: selectedInvoice._id,
        amount,
        paymentMethod,
        reference,
        notes,
      });

      setShowPaymentForm(false);
      setSelectedInvoice(null);
      await loadData(); // Reload data
    } catch (e) {
      console.error(e);
      alert(e.message || 'Failed to record payment');
    } finally {
      setPaymentLoading(false);
    }
  };

  const getStatusBadge = status => {
    const colors = {
      pending:
        'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400',
      partial:
        'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400',
      paid: 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400',
      overdue: 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400',
      cancelled:
        'bg-gray-100 dark:bg-gray-900/20 text-gray-700 dark:text-gray-400',
    };
    const labels = {
      pending: 'En attente',
      partial: 'Partiel',
      paid: 'Payé',
      overdue: 'En retard',
      cancelled: 'Annulé',
    };
    return (
      <span
        className={`inline-block px-2 py-1 rounded text-xs font-medium ${colors[status] || colors.pending}`}
      >
        {labels[status] || status}
      </span>
    );
  };

  const formatCurrency = amount => {
    return new Intl.NumberFormat('fr-TN', {
      style: 'currency',
      currency: 'TND',
      minimumFractionDigits: 2,
    }).format(amount || 0);
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-[var(--text-secondary)]">Chargement...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8">
        <div className="p-4 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-700 rounded-lg text-red-700 dark:text-red-400">
          {error}
        </div>
        <button
          onClick={() => router.push(`/clients/${customerId}`)}
          className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          Retour au client
        </button>
      </div>
    );
  }

  if (!customer || !finance) {
    return (
      <div className="py-8">
        <div className="text-center py-12">
          <div className="text-[var(--text-secondary)]">
            Données non trouvées
          </div>
          <button
            onClick={() => router.push('/clients')}
            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Retour à la liste
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-[var(--text-primary)] mb-2">
              Comptabilité - {customer.firstName} {customer.lastName}
            </h1>
            {customer.internalCode && (
              <div className="text-sm text-[var(--text-secondary)]">
                Code interne: {customer.internalCode}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => router.push(`/clients/${customerId}`)}
              className="px-4 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
            >
              Retour au client
            </button>
          </div>
        </div>
      </div>

      {/* Finance Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Balance Card */}
        <div className="p-6 border border-[var(--border-color)] rounded-lg bg-[var(--bg-secondary)]">
          <div className="text-sm text-[var(--text-secondary)] mb-2">
            Solde Client
          </div>
          <div
            className={`text-2xl font-bold ${finance.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}
          >
            {formatCurrency(finance.balance)}
          </div>
        </div>

        {/* Credit Limit Card */}
        <div className="p-6 border border-[var(--border-color)] rounded-lg bg-[var(--bg-secondary)]">
          <div className="text-sm text-[var(--text-secondary)] mb-2">
            Limite de Crédit
          </div>
          <div className="text-2xl font-bold text-[var(--text-primary)]">
            {formatCurrency(finance.creditLimit || 0)}
          </div>
          {finance.creditLimit > 0 && (
            <div className="text-xs text-[var(--text-secondary)] mt-1">
              Disponible:{' '}
              {formatCurrency(
                Math.max(0, finance.creditLimit - finance.balance)
              )}
            </div>
          )}
        </div>

        {/* Unpaid Amount Card */}
        <div className="p-6 border border-[var(--border-color)] rounded-lg bg-[var(--bg-secondary)]">
          <div className="text-sm text-[var(--text-secondary)] mb-2">
            Montant Impayé
          </div>
          <div className="text-2xl font-bold text-orange-600">
            {formatCurrency(finance.unpaidAmount || 0)}
          </div>
          {finance.pendingInvoicesCount > 0 && (
            <div className="text-xs text-[var(--text-secondary)] mt-1">
              {finance.pendingInvoicesCount} facture(s) en attente
            </div>
          )}
        </div>

        {/* Overdue Amount Card */}
        <div className="p-6 border border-[var(--border-color)] rounded-lg bg-[var(--bg-secondary)]">
          <div className="text-sm text-[var(--text-secondary)] mb-2">
            Montant en Retard
          </div>
          <div className="text-2xl font-bold text-red-600">
            {formatCurrency(finance.overdueAmount || 0)}
          </div>
          {finance.overdueInvoicesCount > 0 && (
            <div className="text-xs text-[var(--text-secondary)] mt-1">
              {finance.overdueInvoicesCount} facture(s) en retard
            </div>
          )}
        </div>
      </div>

      {/* Additional Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Monthly Average */}
        <div className="p-6 border border-[var(--border-color)] rounded-lg bg-[var(--bg-secondary)]">
          <div className="text-sm text-[var(--text-secondary)] mb-2">
            Moyenne d&apos;Achat Mensuelle
          </div>
          <div className="text-xl font-bold text-[var(--text-primary)]">
            {formatCurrency(finance.monthlyAveragePurchase || 0)}
          </div>
          <div className="text-xs text-[var(--text-secondary)] mt-1">
            Calculée sur les 12 derniers mois
          </div>
        </div>

        {/* Custom Discount */}
        <div className="p-6 border border-[var(--border-color)] rounded-lg bg-[var(--bg-secondary)]">
          <div className="text-sm text-[var(--text-secondary)] mb-2">
            Remise Personnalisée
          </div>
          <div className="text-xl font-bold text-[var(--text-primary)]">
            {(finance.customDiscount || 0).toFixed(1)}%
          </div>
          <div className="text-xs text-[var(--text-secondary)] mt-1">
            Appliquée automatiquement sur les factures
          </div>
        </div>
      </div>

      {/* Invoices Section */}
      <div className="mb-6 p-6 border border-[var(--border-color)] rounded-lg bg-[var(--bg-secondary)]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">
            Factures ({pagination.total})
          </h2>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={e => {
                setStatusFilter(e.target.value);
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
              className="px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Tous les statuts</option>
              <option value="pending">En attente</option>
              <option value="partial">Partiel</option>
              <option value="paid">Payé</option>
              <option value="overdue">En retard</option>
            </select>
          </div>
        </div>

        {invoices.length === 0 ? (
          <div className="text-center py-8 text-[var(--text-secondary)]">
            Aucune facture trouvée
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--border-color)]">
                    <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">
                      N° Facture
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">
                      Date
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">
                      Échéance
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">
                      Montant
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">
                      Payé
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">
                      Restant
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">
                      Statut
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map(invoice => (
                    <tr
                      key={invoice._id}
                      className="border-b border-[var(--border-color)] hover:bg-[var(--bg-tertiary)]"
                    >
                      <td className="py-3 px-4 text-[var(--text-primary)] font-medium">
                        {invoice.invoiceNumber}
                      </td>
                      <td className="py-3 px-4 text-[var(--text-primary)]">
                        {new Date(invoice.invoiceDate).toLocaleDateString(
                          'fr-FR'
                        )}
                      </td>
                      <td className="py-3 px-4 text-[var(--text-primary)]">
                        {new Date(invoice.dueDate).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="py-3 px-4 text-right text-[var(--text-primary)] font-medium">
                        {formatCurrency(invoice.total)}
                      </td>
                      <td className="py-3 px-4 text-right text-green-600">
                        {formatCurrency(invoice.paidAmount || 0)}
                      </td>
                      <td className="py-3 px-4 text-right text-[var(--text-primary)] font-medium">
                        {formatCurrency(invoice.remainingAmount || 0)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {getStatusBadge(invoice.status)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {invoice.remainingAmount > 0 &&
                          invoice.status !== 'cancelled' && (
                            <button
                              onClick={() => {
                                setSelectedInvoice(invoice);
                                setShowPaymentForm(true);
                              }}
                              className="px-3 py-1 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors text-sm"
                            >
                              Payer
                            </button>
                          )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-[var(--text-secondary)]">
                  Page {pagination.page} sur {pagination.pages}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setPagination(prev => ({
                        ...prev,
                        page: Math.max(1, prev.page - 1),
                      }))
                    }
                    disabled={pagination.page === 1}
                    className="px-4 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Précédent
                  </button>
                  <button
                    onClick={() =>
                      setPagination(prev => ({
                        ...prev,
                        page: Math.min(prev.pages, prev.page + 1),
                      }))
                    }
                    disabled={pagination.page === pagination.pages}
                    className="px-4 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Suivant
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Payment Form Modal */}
      {showPaymentForm && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-[var(--bg-primary)] rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-[var(--border-color)]">
              <h2 className="text-xl font-bold text-[var(--text-primary)]">
                Enregistrer un Paiement
              </h2>
              <button
                onClick={() => {
                  setShowPaymentForm(false);
                  setSelectedInvoice(null);
                }}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <form onSubmit={handlePaymentSubmit} className="p-6">
              <div className="mb-4">
                <div className="text-sm text-[var(--text-secondary)] mb-2">
                  Facture
                </div>
                <div className="text-[var(--text-primary)] font-medium">
                  {selectedInvoice.invoiceNumber}
                </div>
                <div className="text-sm text-[var(--text-secondary)]">
                  Montant restant:{' '}
                  {formatCurrency(selectedInvoice.remainingAmount)}
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                  Montant <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="amount"
                  step="0.00001"
                  min="0.00001"
                  max={selectedInvoice.remainingAmount}
                  required
                  defaultValue={selectedInvoice.remainingAmount}
                  className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                  Mode de paiement <span className="text-red-500">*</span>
                </label>
                <select
                  name="paymentMethod"
                  required
                  className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="CASH">Espèces</option>
                  <option value="CHECK">Chèque</option>
                  <option value="BANK_TRANSFER">Virement bancaire</option>
                  <option value="CREDIT_CARD">Carte de crédit</option>
                  <option value="OTHER">Autre</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                  Référence
                </label>
                <input
                  type="text"
                  name="reference"
                  className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="N° de chèque, référence virement, etc."
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                  Notes
                </label>
                <textarea
                  name="notes"
                  rows={3}
                  className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Notes supplémentaires"
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowPaymentForm(false);
                    setSelectedInvoice(null);
                  }}
                  className="px-4 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={paymentLoading}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {paymentLoading ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CustomerFinancePage() {
  return (
    <AuthGuard>
      <CustomerFinanceInner />
    </AuthGuard>
  );
}
