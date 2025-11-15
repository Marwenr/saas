'use client';

import { useState, useEffect } from 'react';
import { getCurrentUser } from './api';

/**
 * Hook to check authentication status
 * Since cookies are httpOnly, we check via the /me endpoint
 */
export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const data = await getCurrentUser();
      setUser(data.user);
      setIsAuthenticated(true);
    } catch (error) {
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  return { user, loading, isAuthenticated, checkAuth };
}
