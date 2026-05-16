import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

const demoSession = {
  access_token: 'demo-access-token',
  token_type: 'bearer',
  user: {
    id: 'demo-user',
    name: 'Demo Farmer',
    email: 'demo@agrosat.local',
    role: 'farmer',
    isDemo: true,
  },
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('session');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSession(parsed);
        setUser(parsed.user || null);
      } catch {
        localStorage.removeItem('session');
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback((sessionData) => {
    localStorage.setItem('session', JSON.stringify(sessionData));
    setSession(sessionData);
    setUser(sessionData.user || null);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('session');
    setSession(null);
    setUser(null);
  }, []);

  const continueAsDemo = useCallback(() => {
    localStorage.setItem('session', JSON.stringify(demoSession));
    setSession(demoSession);
    setUser(demoSession.user);
  }, []);

  const isAuthenticated = !!session;

  return (
    <AuthContext.Provider value={{ user, session, login, logout, continueAsDemo, isAuthenticated, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
