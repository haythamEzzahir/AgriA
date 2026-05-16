import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../i18n/context';
import { useAuth } from '../../services/AuthContext';

const sidebarLinks = [
  { to: '/dashboard', icon: 'D', key: 'dashboard' },
  { to: '/map', icon: 'M', key: 'map' },
  { to: '/community', icon: 'C', key: 'community' },
];

const bottomLinks = [
  { to: '/ai', icon: 'AI', key: 'ai' },
];

export default function Navbar({ children }) {
  const { pathname } = useLocation();
  const { isDark, toggleTheme } = useTheme();
  const { t, lang, setLang, languages } = useLanguage();
  const { isAuthenticated, user, logout } = useAuth();
  const isDemoUser = user?.isDemo || (import.meta.env.DEV && pathname === '/map' && !isAuthenticated);

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  const pageTitle = {
    '/dashboard': t('nav.dashboard', 'Dashboard'),
    '/map': t('nav.map', 'Map View'),
    '/ai': t('nav.ai', 'AI Assistant'),
    '/community': t('nav.community', 'Community'),
  }[pathname] || t('nav.dashboard', 'Dashboard');

  const sidebarBase = isDark
    ? 'bg-agri-950 border-r border-agri-700'
    : 'bg-white border-r border-slate-200';
  const topbarBase = isDark
    ? 'border-agri-700 bg-agri-900'
    : 'border-slate-200 bg-white';

  const linkClass = (active) => `w-9 h-9 flex items-center justify-center rounded-lg transition text-xs font-bold ${
    active
      ? isDark ? 'bg-agri-700 text-agri-300' : 'bg-emerald-100 text-emerald-800'
      : isDark ? 'text-agri-500 hover:bg-agri-800 hover:text-agri-200' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
  }`;

  return (
    <div className={`flex h-screen ${isDark ? 'bg-agri-900 text-agri-50' : 'bg-slate-100 text-slate-950'}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className={`w-14 flex flex-col items-center py-3 gap-1 flex-shrink-0 ${sidebarBase}`}>
        <Link to="/dashboard" className="w-8 h-8 bg-agri-500 rounded-lg flex items-center justify-center mb-2 text-sm font-bold text-white">
          A
        </Link>

        {sidebarLinks.map((link) => (
          <Link key={link.to} to={link.to} className={linkClass(pathname === link.to)} title={t(`nav.${link.key}`)}>
            {link.icon}
          </Link>
        ))}

        <div className={`w-7 h-px my-1 ${isDark ? 'bg-agri-700' : 'bg-slate-200'}`} />

        {bottomLinks.map((link) => (
          <Link key={link.to} to={link.to} className={linkClass(pathname === link.to)} title={t(`nav.${link.key}`)}>
            {link.icon}
          </Link>
        ))}

        <div className="flex-1" />

        {isAuthenticated && (
          <>
            <div className={`w-7 h-px my-1 ${isDark ? 'bg-agri-700' : 'bg-slate-200'}`} />
            <button
              type="button"
              onClick={handleLogout}
              className={`w-9 h-9 flex items-center justify-center rounded-lg transition text-sm ${
                isDark ? 'text-agri-500 hover:bg-agri-800 hover:text-red-400' : 'text-slate-500 hover:bg-slate-100 hover:text-red-600'
              }`}
              title={t('nav.signOut')}
            >
              X
            </button>
          </>
        )}
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className={`h-10 flex items-center justify-between px-4 border-b flex-shrink-0 ${topbarBase}`}>
          <span className={`text-xs tracking-wider uppercase ${isDark ? 'text-agri-500' : 'text-slate-500'}`}>
            {pageTitle}
          </span>
          <div className="flex items-center gap-3">
            {isDemoUser && (
              <span className={`rounded-md px-2 py-1 text-xs font-semibold ${
                isDark ? 'bg-emerald-500/10 text-emerald-300' : 'bg-emerald-50 text-emerald-700'
              }`}>
                Demo Farmer
              </span>
            )}
            <button
              type="button"
              onClick={toggleTheme}
              className={`px-2 py-1 rounded text-xs transition ${isDark ? 'bg-agri-950 text-agri-300 hover:bg-agri-800' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
            >
              {isDark ? 'Dark' : 'Light'}
            </button>
            <div className={`flex gap-1 rounded-lg p-0.5 ${isDark ? 'bg-agri-950' : 'bg-slate-100'}`}>
              {languages.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => setLang(l.code)}
                  className={`px-2 py-0.5 rounded-md text-xs font-medium transition-all ${
                    lang === l.code
                      ? isDark ? 'bg-agri-700 text-agri-200' : 'bg-white text-slate-900 shadow-sm'
                      : isDark ? 'text-agri-500 hover:text-agri-300' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {l.code.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {children}
        </div>
      </div>
    </div>
  );
}
