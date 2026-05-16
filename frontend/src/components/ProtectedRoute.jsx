import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../services/AuthContext';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const { pathname } = useLocation();
  const allowDevelopmentMapAccess = import.meta.env.DEV && pathname === '/map';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated && !allowDevelopmentMapAccess) {
    return <Navigate to="/auth" replace />;
  }

  return children;
}
