import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../../i18n/context';

const navLinks = [
  { to: '/dashboard', key: 'dashboard', icon: '📊' },
  { to: '/map', key: 'map', icon: '🗺️' },
  { to: '/ai', key: 'ai', icon: '🤖' },
  { to: '/marketplace', key: 'marketplace', icon: '🏪' },
];

export default function Navbar() {
  const { pathname } = useLocation();
  const { t, lang, setLang, languages } = useLanguage();
  const session = localStorage.getItem('session');

  const handleLogout = () => {
    localStorage.removeItem('session');
    window.location.href = '/';
  };

  return (
    <nav className="bg-white shadow-sm border-b sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <Link to={session ? '/dashboard' : '/'} className="flex items-center gap-2">
          <span className="text-2xl">🌾</span>
          <span className="font-bold text-lg text-gray-800">AgriCopilot</span>
        </Link>

        {session && (
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  pathname === link.to
                    ? 'bg-farm-100 text-gray-900'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {link.icon} {t(`nav.${link.key}`)}
              </Link>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2">
          <div className="flex gap-0.5 bg-gray-50 rounded-lg p-0.5">
            {languages.map((l) => (
              <button key={l.code} onClick={() => setLang(l.code)}
                className={`px-2 py-0.5 rounded-md text-xs font-medium transition-all ${
                  lang === l.code ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                }`}>
                {l.code === 'ar' ? 'ع' : l.code.toUpperCase()}
              </button>
            ))}
          </div>

          {session ? (
            <button onClick={handleLogout} className="px-3 py-2 text-sm text-gray-500 hover:text-red-600 font-medium">
              {t('nav.signOut')}
            </button>
          ) : (
            <>
              <Link to="/auth" className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 font-medium">
                {t('nav.signIn')}
              </Link>
              <Link to="/register" className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition">
                {t('nav.getStarted')}
              </Link>
            </>
          )}
        </div>
      </div>

      {session && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t z-50 flex justify-around py-2">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`flex flex-col items-center px-3 py-1 rounded-lg text-xs ${
                pathname === link.to ? 'text-gray-900' : 'text-gray-400'
              }`}
            >
              <span className="text-lg">{link.icon}</span>
              <span>{t(`nav.${link.key}`)}</span>
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
