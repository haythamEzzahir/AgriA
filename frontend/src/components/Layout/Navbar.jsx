import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';

const links = [
  { to: '/', label: 'Dashboard' },
  { to: '/map', label: 'Map' },
  { to: '/ai', label: 'AI Assistant' },
  { to: '/marketplace', label: 'Marketplace' },
];

export default function Navbar() {
  const { pathname } = useLocation();
  const { isDark } = useTheme();

  return (
    <nav className={isDark ? 'border-b border-white/10 bg-slate-950 text-white' : 'border-b bg-white shadow-sm'}>
      <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-3">
          <span className={isDark ? 'h-2.5 w-2.5 rounded-full bg-emerald-300' : 'h-2.5 w-2.5 rounded-full bg-primary-600'} />
          <span className={isDark ? 'text-lg font-bold text-white' : 'text-lg font-bold text-primary-700'}>AgriCopilot AI</span>
        </Link>

        <div className="flex items-center gap-1">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                pathname === link.to
                  ? isDark
                    ? 'bg-white/10 text-white'
                    : 'bg-primary-100 text-primary-800'
                  : isDark
                    ? 'text-slate-300 hover:bg-white/[0.08] hover:text-white'
                    : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {link.label}
            </Link>
          ))}

          <Link
            to="/auth"
            className={isDark
              ? 'ml-4 rounded-md bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-300'
              : 'ml-4 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700'}
          >
            Sign In
          </Link>
        </div>
      </div>
    </nav>
  );
}
