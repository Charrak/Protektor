import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { brandingService, BrandingSettings } from '../../services/branding.service';
import { NotificationBell } from '../common/NotificationBell';

const navigation = [
  { name: 'Dashboard', href: '/', icon: '📊' },
  { name: 'Mitarbeiter', href: '/employees', icon: '👥' },
  { name: 'Kunden', href: '/customers', icon: '🏢' },
  { name: 'Objekte', href: '/objects', icon: '🏗️' },
  { name: 'Dienstplan', href: '/scheduling', icon: '📅' },
  { name: 'Schichtwechsel', href: '/shift-swaps', icon: '🔄' },
  { name: 'Planungsgruppen', href: '/planning-groups', icon: '👥' },
  { name: 'Zeiterfassung', href: '/attendance', icon: '⏱️' },
  { name: 'Abrechnung', href: '/billing', icon: '💰' },
  { name: 'Berichte', href: '/reports', icon: '📈' },
  { name: 'Verwaltung', href: '/admin', icon: '⚙️' },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [branding, setBranding] = useState<BrandingSettings | null>(null);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Load branding settings
    brandingService.getBranding()
      .then(setBranding)
      .catch(() => {}); // Silently fail, use defaults
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-security-dark text-white transform transition-transform duration-300
        lg:translate-x-0 lg:static lg:inset-auto lg:flex-shrink-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center h-16 px-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            {branding?.logoUrl ? (
              <img
                src={branding.logoUrl}
                alt={branding.companyName}
                className="h-10 max-w-[120px] object-contain"
              />
            ) : (
              <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center font-bold text-sm">
                S
              </div>
            )}
            <div>
              <h1 className="text-lg font-bold">
                {branding?.companyName ? branding.companyName.substring(0, 15) : 'SMS'}
              </h1>
              <p className="text-xs text-gray-400">Security Management</p>
            </div>
          </div>
        </div>

        <nav className="mt-6 px-3 flex-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = item.href === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 text-sm font-medium transition-colors
                  ${isActive
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-300 hover:bg-white/10 hover:text-white'
                  }
                `}
                onClick={() => setSidebarOpen(false)}
              >
                <span className="text-lg">{item.icon}</span>
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* User Info */}
        <div className="p-4 border-t border-white/10 mt-auto">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-primary-500/30 rounded-full flex items-center justify-center text-sm font-bold">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-gray-400 truncate">{user?.role?.name}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
          >
            🚪 Abmelden
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200 h-16 flex items-center px-4 lg:px-8 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 mr-2"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-4">
            <NotificationBell />
            <div className="hidden sm:flex items-center gap-2 text-sm text-gray-600">
              <span>{user?.firstName} {user?.lastName}</span>
              <span className="text-gray-300">|</span>
              <span className="text-primary-600 font-medium">{user?.role?.name}</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
