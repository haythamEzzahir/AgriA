import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/Layout/Navbar';
import Dashboard from './pages/Dashboard';
import MapView from './pages/MapView';
import AIAssistant from './pages/AIAssistant';
import Marketplace from './pages/Marketplace';
import Auth from './pages/Auth';
import { useTheme } from './context/ThemeContext';

function App() {
  const { pathname } = useLocation();
  const { isDark } = useTheme();
  const isMapPage = pathname === '/map';

  return (
    <div className={isMapPage ? (isDark ? 'min-h-screen bg-slate-950' : 'min-h-screen bg-slate-100') : (isDark ? 'min-h-screen bg-slate-950' : 'min-h-screen bg-gray-50')}>
      <Navbar />
      <main className={isMapPage ? 'mx-auto px-0 py-0' : 'max-w-7xl mx-auto px-4 py-6'}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/map" element={<MapView />} />
          <Route path="/ai" element={<AIAssistant />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
