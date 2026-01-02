'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { getCurrentUser, login, registerCompany, logout } from './api';

const AuthContext = createContext(null);

/**
 * AuthProvider component - Provides global authentication state via React Context
 *
 * Manages authentication state for users within a company context.
 * Since cookies are httpOnly, we check authentication via the /me endpoint.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const applyAuthData = data => {
    const u = data?.user || null;
    const c = data?.company || null;

    setUser(u || null);
    setCompany(c || null);
    setIsAuthenticated(!!u);
  };

  const checkAuth = async () => {
    try {
      setLoading(true);
      const data = await getCurrentUser(); // /auth/me
      // Backend /me endpoint returns { user: {...}, company: {...} }
      // user object includes: id, email, name, role, companyId
      // company object includes: id, name, email, subscriptionPlan, isActive
      applyAuthData(data);
    } catch (error) {
      setUser(null);
      setCompany(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const loginUser = async (email, password) => {
    // Don't set global loading to true here - let the login page handle its own loading state
    // This prevents GlobalAuthGuard from interfering during login
    try {
      const data = await login(email, password); // /auth/login
      // Login response includes user data, but we need to refresh to get full company data
      // The backend sets httpOnly cookies, so we call checkAuth to get complete state
      await checkAuth();
    } catch (error) {
      // Don't clear auth state on error - let the user stay on login page
      // Only clear if we're sure it's an auth error (not a network error)
      // Re-throw error so caller can handle it and display error message
      throw error;
    }
  };

  const registerCompanyOwner = async payload => {
    setLoading(true);
    try {
      const data = await registerCompany(payload); // /auth/register-company
      // Registration response includes user and company data, but we refresh to ensure consistency
      await checkAuth();
    } catch (error) {
      setUser(null);
      setCompany(null);
      setIsAuthenticated(false);
      throw error; // Re-throw so caller can handle it
    } finally {
      setLoading(false);
    }
  };

  const logoutUser = async () => {
    setLoading(true);
    try {
      await logout(); // /auth/logout
    } catch (e) {
      // ignore error - we'll clear state anyway
    } finally {
      setUser(null);
      setCompany(null);
      setIsAuthenticated(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  // Extract convenient fields for multi-tenant context
  // Priority: user.companyId > company.id (user.companyId is the source of truth)
  const userId = user?.id || user?._id || null;
  const email = user?.email || null;

  const rawCompanyId = user?.companyId;
  const normalizedCompanyId =
    rawCompanyId && typeof rawCompanyId === 'object'
      ? rawCompanyId._id
      : rawCompanyId;

  const companyId = normalizedCompanyId || company?.id || company?._id || null;
  const role = user?.role || null;
  const companyName = company?.name || null;

  const value = {
    user,
    userId,
    email,
    companyId,
    role,
    companyName,
    company,
    loading,
    isAuthenticated,
    checkAuth,
    login: loginUser,
    logout: logoutUser,
    registerCompanyOwner,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Multi-tenant authentication hook
 *
 * Returns:
 * - user: Full user object (includes companyId and role from backend)
 * - userId: User ID
 * - email: User email
 * - companyId: Company ID (from user.companyId or company.id)
 * - role: User role (owner, employee, etc.) from user.role
 * - companyName: Company name (if available from company object)
 * - company: Full company object (if available from /me endpoint)
 * - loading: Loading state
 * - isAuthenticated: Authentication status
 * - checkAuth: Function to manually refresh auth status
 * - login: Function to login user (email, password)
 * - logout: Function to logout user
 * - registerCompanyOwner: Function to register company with owner
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
