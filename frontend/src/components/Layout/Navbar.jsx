import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../../i18n/context';
import { useAuth } from '../../services/AuthContext';

const sidebarLinks = [
  { to: '/dashboard', icon: '📊', key: 'dashboard' },
  { to: '/map', icon: '🗺️', key: 'map' },
  { to: '/marketplace', icon: '🏪', key: 'marketplace' },
];

const bottomLinks = [
  { to: '/ai', icon: '💡', key: 'ai' },
];

export default function Navbar({ children }) {
  const { pathname } = useLocation();
  const { t, lang, setLang, languages } = useLanguage();
  const { isAuthenticated, logout } = useAuth();

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  const pageTitle = {
    '/dashboard': 'Dashboard',
    '/map': 'Map View',
    '/ai': 'AI Assistant',
    '/marketplace': 'Marketplace',
  }[pathname] || 'Dashboard';

  return (
    <div className="flex h-screen bg-agri-900 text-agri-50" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Sidebar */}
      <div className="w-14 flex flex-col items-center py-3 gap-1 bg-agri-950 border-r border-agri-700 flex-shrink-0">
        <Link to="/dashboard" className="w-8 h-8 bg-agri-500 rounded-lg flex items-center justify-center mb-2">
          <span className="text-sm">🌾</span>
        </Link>

        {sidebarLinks.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className={`w-9 h-9 flex items-center justify-center rounded-lg transition text-sm ${
              pathname === link.to
                ? 'bg-agri-700 text-agri-300'
                : 'text-agri-500 hover:bg-agri-800 hover:text-agri-200'
            }`}
            title={t(`nav.${link.key}`)}
          >
            {link.icon}
          </Link>
        ))}

        <div className="w-7 h-px bg-agri-700 my-1" />

        {bottomLinks.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className={`w-9 h-9 flex items-center justify-center rounded-lg transition text-sm ${
              pathname === link.to
                ? 'bg-agri-700 text-agri-300'
                : 'text-agri-500 hover:bg-agri-800 hover:text-agri-200'
            }`}
            title={t(`nav.${link.key}`)}
          >
            {link.icon}
          </Link>
        ))}

        <div className="flex-1" />

        <div className="w-7 h-px bg-agri-700 my-1" />
        <button onClick={handleLogout}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-agri-500 hover:bg-agri-800 hover:text-red-400 transition text-sm"
          title={t('nav.signOut')}
        >
          ⏻
        </button>
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="h-10 flex items-center justify-between px-4 border-b border-agri-700 bg-agri-900 flex-shrink-0">
          <span className="text-xs tracking-wider uppercase text-agri-500">
            {pageTitle}
          </span>
          <div className="flex items-center gap-3">
            <div className="flex gap-1 bg-agri-950 rounded-lg p-0.5">
              {languages.map((l) => (
                <button key={l.code} onClick={() => setLang(l.code)}
                  className={`px-2 py-0.5 rounded-md text-xs font-medium transition-all ${
                    lang === l.code ? 'bg-agri-700 text-agri-200' : 'text-agri-500 hover:text-agri-300'
                  }`}>
                  {l.code === 'ar' ? 'ع' : l.code.toUpperCase()}
                </button>
              ))}
            </div>
            {isAuthenticated && (
              <button onClick={handleLogout} className="text-xs text-agri-500 hover:text-red-400 px-2 py-1 rounded hover:bg-agri-800 transition">
                {t('nav.signOut')}
              </button>
            )}
          </div>
        </div>

        {/* Page content */}
        <div className="flex-1 overflow-auto p-4">
          {children}
        </div>
      </div>
    </div>
  );
}
