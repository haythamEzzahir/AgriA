import React from 'react';
import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Layout/Navbar';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import MapView from './pages/MapView';
import AIAssistant from './pages/AIAssistant';
import Marketplace from './pages/Marketplace';
import Auth from './pages/Auth';
import Register from './pages/Register';

function AppLayout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-6">
        {children}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/register" element={<Register />} />

      <Route path="/dashboard" element={
        <ProtectedRoute>
          <AppLayout><Dashboard /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/map" element={
        <ProtectedRoute>
          <AppLayout><MapView /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/ai" element={
        <ProtectedRoute>
          <AppLayout><AIAssistant /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/marketplace" element={
        <AppLayout><Marketplace /></AppLayout>
      } />
    </Routes>
  );
}
