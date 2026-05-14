import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const links = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/map', label: 'Map', icon: '🗺️' },
  { to: '/ai', label: 'AI Assistant', icon: '🤖' },
  { to: '/marketplace', label: 'Marketplace', icon: '🏪' },
];

export default function Navbar() {
  const { pathname } = useLocation();

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-2xl">🌿</span>
          <span className="font-bold text-lg text-primary-700">AgriCopilot AI</span>
        </Link>

        <div className="flex items-center gap-1">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                pathname === link.to
                  ? 'bg-primary-100 text-primary-800'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {link.icon} {link.label}
            </Link>
          ))}

          <Link
            to="/auth"
            className="ml-4 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700"
          >
            Sign In
          </Link>
        </div>
      </div>
    </nav>
  );
}
