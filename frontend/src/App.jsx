import React from 'react';
import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Layout/Navbar';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import MapView from './pages/MapView';
import AIAssistant from './pages/AIAssistant';
import Community from './pages/Community';
import Auth from './pages/Auth';
import Register from './pages/Register';

function AppLayout({ children }) {
  return <Navbar>{children}</Navbar>;
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
      <Route path="/community" element={
        <ProtectedRoute>
          <AppLayout><Community /></AppLayout>
        </ProtectedRoute>
      } />
    </Routes>
  );
}
