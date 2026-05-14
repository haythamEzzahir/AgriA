import React from 'react';
import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({ children }) {
  const session = localStorage.getItem('session');

  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  return children;
}
