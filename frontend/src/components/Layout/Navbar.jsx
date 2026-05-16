import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../../i18n/context';
import { useAuth } from '../../services/AuthContext';
import { Chart, Map as MapIcon, Users, Sparkles, Leaf, LogOut } from '../icons';

const navLinks = [
  { to: '/dashboard', icon: Chart,    key: 'dashboard' },
  { to: '/map',       icon: MapIcon,  key: 'map' },
  { to: '/community', icon: Users,    key: 'community' },
  { to: '/ai',        icon: Sparkles, key: 'ai' },
];

export default function Navbar({ children }) {
  const { pathname } = useLocation();
  const { t, lang, setLang, languages } = useLanguage();
  const { isAuthenticated, logout } = useAuth();

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  return (
    <div className="flex flex-col min-h-screen bg-farm-50" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <nav className="bg-agri-900 border-b border-agri-800 sticky top-0 z-[1000]">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
          <Link to="/dashboard" className="flex items-center gap-2 flex-shrink-0">
            <Leaf size={18} className="text-agri-400" />
            <span className="font-bold text-white text-base tracking-tight">AgriCopilot</span>
          </Link>

          <div className="hidden md:flex gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const active = pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    active
                      ? 'text-agri-300 bg-agri-500/10 border border-agri-500/30 font-semibold'
                      : 'text-white/60 hover:text-white border border-transparent'
                  }`}
                >
                  <Icon size={14} />
                  {t(`nav.${link.key}`)}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex gap-1 bg-agri-950 rounded-lg p-0.5">
              {languages.map((l) => (
                <button
                  key={l.code}
                  onClick={() => setLang(l.code)}
                  className={`px-2 py-0.5 rounded-md text-xs font-medium transition-all ${
                    lang === l.code ? 'bg-agri-700 text-agri-200' : 'text-white/55 hover:text-white'
                  }`}
                >
                  {l.code === 'ar' ? 'ع' : l.code.toUpperCase()}
                </button>
              ))}
            </div>
            {isAuthenticated && (
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 text-white/60 hover:text-rose-400 text-xs px-2 py-1 rounded-lg transition-colors"
                title={t('nav.signOut')}
              >
                <LogOut size={14} />
                <span className="hidden sm:inline">{t('nav.signOut')}</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile tabs */}
        <div className="md:hidden border-t border-agri-800 flex overflow-x-auto">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const active = pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`flex-1 min-w-max flex flex-col items-center justify-center gap-1 px-3 py-2 text-[11px] transition-colors ${
                  active ? 'text-agri-300 bg-agri-800/50' : 'text-white/55 hover:text-white'
                }`}
              >
                <Icon size={16} />
                {t(`nav.${link.key}`)}
              </Link>
            );
          })}
        </div>
      </nav>

      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
