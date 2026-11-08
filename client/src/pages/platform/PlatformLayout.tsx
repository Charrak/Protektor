import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { usePlatformAuth } from '../../contexts/PlatformAuthContext';

const navigation = [
  { name: 'Dashboard', href: '/platform', icon: '📊' },
  { name: 'Mandanten', href: '/platform/tenants', icon: '🏢' },
  { name: 'Tarife', href: '/platform/plans', icon: '💎' },
  { name: 'Zahlungen', href: '/platform/payments', icon: '💳' },
  { name: 'Webhooks', href: '/platform/webhooks', icon: '🔔' },
];

export function PlatformLayout({ children }: { children: React.ReactNode }) {
  const { admin, logout } = usePlatformAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/platform/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-purple-900 text-white flex flex-col">
        <div className="flex items-center h-16 px-6 border-b border-purple-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center font-bold text-sm">
              P
            </div>
            <div>
              <h1 className="text-lg font-bold">Plattform</h1>
              <p className="text-xs text-purple-300">Administration</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 mt-6 px-3">
          {navigation.map((item) => {
            const isActive = item.href === '/platform'
              ? location.pathname === '/platform'
              : location.pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 text-sm font-medium transition-colors ${
                  isActive ? 'bg-purple-700 text-white' : 'text-purple-200 hover:bg-purple-800 hover:text-white'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-purple-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-purple-700 rounded-full flex items-center justify-center text-sm font-bold">
              {admin?.firstName?.[0]}{admin?.lastName?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{admin?.firstName} {admin?.lastName}</p>
              <p className="text-xs text-purple-300 truncate">{admin?.email}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full text-left px-3 py-2 rounded-lg text-sm text-purple-200 hover:bg-purple-800 hover:text-white">
            🚪 Abmelden
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200 h-16 flex items-center px-8">
          <div className="flex-1" />
          <div className="text-sm text-gray-600">
            <span className="font-medium text-purple-600">Plattform-Administrator</span>
          </div>
        </header>

        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
