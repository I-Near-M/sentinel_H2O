import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('sentinel_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('sentinel_token') || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const verifySession = async () => {
      const storedToken = localStorage.getItem('sentinel_token');
      if (storedToken) {
        try {
          const res = await authApi.getMe();
          setUser(res.data);
          localStorage.setItem('sentinel_user', JSON.stringify(res.data));
        } catch (err) {
          console.warn('[AUTH] Sesion expirada o token invalido.');
          logout();
        }
      }
      setLoading(false);
    };

    const handleUnauthorized = () => {
      logout();
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    verifySession();

    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, []);

  const login = async (email, password) => {
    setError(null);
    try {
      const res = await authApi.login({ email, password });
      const { access_token, user: userData } = res.data;
      
      setToken(access_token);
      setUser(userData);
      
      localStorage.setItem('sentinel_token', access_token);
      localStorage.setItem('sentinel_user', JSON.stringify(userData));
      window.dispatchEvent(new CustomEvent('auth:login_success', { detail: userData }));
      return { success: true, user: userData };
    } catch (err) {
      const msg = err.response?.data?.detail || 'Error al conectar con el servidor de autenticacion';
      setError(msg);
      return { success: false, error: msg };
    }
  };

  const registerFirstAdmin = async (adminData) => {
    setError(null);
    try {
      await authApi.bootstrapAdmin(adminData);
      return await login(adminData.email, adminData.password);
    } catch (err) {
      const msg = err.response?.data?.detail || 'Error al registrar el primer superadministrador';
      setError(msg);
      return { success: false, error: msg };
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setError(null);
    localStorage.removeItem('sentinel_token');
    localStorage.removeItem('sentinel_user');
  };

  const hasRole = (allowedRoles) => {
    if (!user || !user.rol) return false;
    if (typeof allowedRoles === 'string') {
      return user.rol === allowedRoles;
    }
    return allowedRoles.includes(user.rol);
  };

  const updateUserLocal = (newUserData) => {
    setUser(newUserData);
    localStorage.setItem('sentinel_user', JSON.stringify(newUserData));
  };

  const refreshUser = async () => {
    try {
      const res = await authApi.getMe();
      updateUserLocal(res.data);
      return res.data;
    } catch (e) {
      console.warn("Error refreshing user:", e);
    }
  };

  const value = {
    user,
    token,
    isAuthenticated: !!token && !!user,
    loading,
    error,
    login,
    registerFirstAdmin,
    logout,
    hasRole,
    updateUserLocal,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser utilizado dentro de un AuthProvider');
  }
  return context;
};
