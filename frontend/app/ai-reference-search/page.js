'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Container from '../../components/Container';
import AuthGuard from '../../components/AuthGuard';
import { useAuth } from '../../lib/useAuth';
import { searchReference, getChatHistory } from '../../lib/ai';
import { Search } from 'lucide-react';

/**
 * AI Reference Search page - Chat interface for finding equivalent references
 */
function AIReferenceSearchPage() {
  const { companyName, isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();

  const [reference, setReference] = useState('');
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState([]);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const messagesEndRef = useRef(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  // Load chat history on mount
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      loadHistory();
    }
  }, [authLoading, isAuthenticated]);

  // Scroll to bottom when results change
  useEffect(() => {
    scrollToBottom();
  }, [results]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Load chat history
  const loadHistory = async () => {
    try {
      setLoadingHistory(true);
      const data = await getChatHistory({ page: 1, limit: 50 });
      setHistory(data.chats || []);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Handle search
  const handleSearch = async e => {
    e.preventDefault();

    if (!reference.trim()) {
      setError('Veuillez entrer une référence');
      return;
    }

    try {
      setSearching(true);
      setError(null);

      // Add user message to results
      const userMessage = {
        type: 'user',
        reference: reference.trim(),
        timestamp: new Date(),
      };
      setResults(prev => [...prev, userMessage]);

      // Call API
      const response = await searchReference(reference.trim());

      // Add AI response to results
      if (response.success && response.data) {
        const aiMessage = {
          type: 'ai',
          data: response.data,
          chatId: response.chatId,
          timestamp: new Date(),
        };
        setResults(prev => [...prev, aiMessage]);
      } else {
        throw new Error(response.error || 'Failed to get results');
      }

      // Clear input
      setReference('');

      // Reload history to show new entry
      await loadHistory();
    } catch (err) {
      console.error('Failed to search reference:', err);
      setError(err.message || 'Échec de la recherche');

      // Add error message to results
      const errorMessage = {
        type: 'error',
        message: err.message || 'Échec de la recherche',
        timestamp: new Date(),
      };
      setResults(prev => [...prev, errorMessage]);
    } finally {
      setSearching(false);
    }
  };

  // Format brand name for display
  const formatBrandName = brand => {
    const brandMap = {
      LPR: 'LPR',
      Valeo: 'Valeo',
      TRW: 'TRW',
      ATE: 'ATE',
      Delphi: 'Delphi',
      Ferodo: 'Ferodo',
      OEM: 'OEM (Constructeur)',
    };
    return brandMap[brand] || brand;
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-[var(--text-secondary)]">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="py-8">
      <Container fullWidth>
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-[var(--text-primary)] mb-2">
            Recherche de Correspondances de Pièces
          </h1>
          {companyName && (
            <p className="text-lg text-[var(--text-secondary)]">
              {companyName}
            </p>
          )}
          <p className="text-sm text-[var(--text-secondary)] mt-2">
            Recherchez les références équivalentes pour les marques: LPR, Valeo,
            TRW, ATE, Delphi, Ferodo, OEM
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main chat area */}
          <div className="lg:col-span-2">
            <div className="bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)] flex flex-col h-[calc(100vh-250px)]">
              {/* Chat messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {results.length === 0 ? (
                  <div className="text-center py-12 text-[var(--text-secondary)]">
                    <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-lg">
                      Entrez une référence pour commencer la recherche
                    </p>
                    <p className="text-sm mt-2">Exemple: LPR : 05P1702</p>
                  </div>
                ) : (
                  results.map((result, index) => (
                    <div
                      key={index}
                      className={`flex ${
                        result.type === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-4 ${
                          result.type === 'user'
                            ? 'bg-primary-600 text-white'
                            : result.type === 'error'
                              ? 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-700'
                              : 'bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)]'
                        }`}
                      >
                        {result.type === 'user' && (
                          <div>
                            <div className="font-semibold mb-1">Vous</div>
                            <div>{result.reference}</div>
                            <div className="text-xs opacity-75 mt-2">
                              {new Date(result.timestamp).toLocaleTimeString(
                                'fr-FR'
                              )}
                            </div>
                          </div>
                        )}

                        {result.type === 'ai' && result.data && (
                          <div>
                            <div className="font-semibold mb-3 flex items-center gap-2">
                              <span>🤖</span>
                              <span>
                                Résultats pour: {result.data.requested_ref}
                              </span>
                            </div>
                            <div className="space-y-2">
                              {result.data.equivalents && (
                                <div className="grid grid-cols-1 gap-2">
                                  {Object.entries(result.data.equivalents).map(
                                    ([brand, ref]) => (
                                      <div
                                        key={brand}
                                        className="flex justify-between items-center p-2 bg-[var(--bg-secondary)] rounded border border-[var(--border-color)]"
                                      >
                                        <span className="font-medium text-[var(--text-primary)]">
                                          {formatBrandName(brand)}:
                                        </span>
                                        <span className="text-[var(--text-secondary)] font-mono">
                                          {ref || '-'}
                                        </span>
                                      </div>
                                    )
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="text-xs text-[var(--text-secondary)] mt-3 pt-2 border-t border-[var(--border-color)]">
                              {new Date(result.timestamp).toLocaleString(
                                'fr-FR'
                              )}
                            </div>
                          </div>
                        )}

                        {result.type === 'error' && (
                          <div>
                            <div className="font-semibold mb-1">❌ Erreur</div>
                            <div>{result.message}</div>
                            <div className="text-xs opacity-75 mt-2">
                              {new Date(result.timestamp).toLocaleTimeString(
                                'fr-FR'
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
                {searching && (
                  <div className="flex justify-start">
                    <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg p-4">
                      <div className="flex items-center gap-2">
                        <svg
                          className="animate-spin h-5 w-5 text-primary-600"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        <span className="text-[var(--text-secondary)]">
                          Recherche en cours...
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input form */}
              <div className="border-t border-[var(--border-color)] p-4">
                {error && (
                  <div className="mb-3 p-3 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-700 rounded-lg text-red-700 dark:text-red-400 text-sm">
                    {error}
                  </div>
                )}
                <form onSubmit={handleSearch} className="flex gap-2">
                  <input
                    type="text"
                    value={reference}
                    onChange={e => {
                      setReference(e.target.value);
                      setError(null);
                    }}
                    placeholder="Entrez une référence (ex: LPR : 05P1702)"
                    className="flex-1 px-4 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary-500"
                    disabled={searching}
                  />
                  <button
                    type="submit"
                    disabled={searching || !reference.trim()}
                    className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                  >
                    {searching ? 'Recherche...' : 'Rechercher'}
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* History sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)] p-4 sticky top-4">
              <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">
                Historique
              </h2>
              {loadingHistory ? (
                <div className="text-center py-8 text-[var(--text-secondary)]">
                  Chargement...
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-8 text-[var(--text-secondary)] text-sm">
                  Aucun historique
                </div>
              ) : (
                <div className="space-y-2 max-h-[calc(100vh-350px)] overflow-y-auto">
                  {history.map(chat => (
                    <div
                      key={chat._id}
                      className="p-3 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
                      onClick={() => {
                        // Add to results if not already there
                        const exists = results.some(r => r.chatId === chat._id);
                        if (
                          !exists &&
                          chat.status === 'success' &&
                          chat.response
                        ) {
                          setResults(prev => [
                            ...prev,
                            {
                              type: 'user',
                              reference: chat.requestedReference,
                              timestamp: new Date(chat.createdAt),
                            },
                            {
                              type: 'ai',
                              data: chat.response,
                              chatId: chat._id,
                              timestamp: new Date(chat.createdAt),
                            },
                          ]);
                        }
                      }}
                    >
                      <div className="font-medium text-[var(--text-primary)] text-sm truncate">
                        {chat.requestedReference}
                      </div>
                      <div className="text-xs text-[var(--text-secondary)] mt-1">
                        {new Date(chat.createdAt).toLocaleString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                      <div className="mt-2">
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            chat.status === 'success'
                              ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                              : chat.status === 'error'
                                ? 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                                : 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400'
                          }`}
                        >
                          {chat.status === 'success'
                            ? 'Succès'
                            : chat.status === 'error'
                              ? 'Erreur'
                              : 'En attente'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}

export default function AIReferenceSearch() {
  return (
    <AuthGuard>
      <AIReferenceSearchPage />
    </AuthGuard>
  );
}
