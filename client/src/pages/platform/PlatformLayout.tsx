import { useState, useEffect } from 'react';
import { platformService, PlatformUser } from '../../services/platform.service';
import { PlatformLoginPage } from './PlatformLoginPage';
import { PlatformDashboardPage } from './PlatformDashboardPage';
import { TenantListPage } from './TenantListPage';
import { SubscriptionListPage } from './SubscriptionListPage';
import { PlanListPage } from './PlanListPage';
import { DeveloperSettingsPage } from './DeveloperSettingsPage';
import { HelpCenterPage } from './HelpCenterPage';

type Page = 'dashboard' | 'tenants' | 'subscriptions' | 'plans' | 'developer' | 'help';

export function PlatformLayout() {
  const [user, setUser] = useState<PlatformUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('platformToken');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const userData = await platformService.getMe();
      setUser(userData);
    } catch (err) {
      localStorage.removeItem('platformToken');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSuccess = async () => {
    const userData = await platformService.getMe();
    setUser(userData);
  };

  const handleLogout = async () => {
    await platformService.logout();
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Laden...</div>
      </div>
    );
  }

  if (!user) {
    return <PlatformLoginPage />;
  }

  const navItems: { page: Page; label: string; icon: string }[] = [
    { page: 'dashboard', label: 'Dashboard', icon: '📊' },
    { page: 'tenants', label: 'Mandanten', icon: '🏢' },
    { page: 'subscriptions', label: 'Abonnements', icon: '💳' },
    { page: 'plans', label: 'Tarife', icon: '📋' },
    { page: 'developer', label: 'Entwickler', icon: '⚙️' },
    { page: 'help', label: 'Hilfe-Center', icon: '📚' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-gradient-to-b from-blue-900 to-indigo-900 text-white">
        <div className="p-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
              <span className="text-xl font-bold">S</span>
            </div>
            <div>
              <h1 className="text-lg font-bold">SMS</h1>
              <p className="text-xs text-blue-200">Plattform-Admin</p>
            </div>
          </div>
        </div>

        <nav className="mt-6">
          {navItems.map((item) => (
            <button
              key={item.page}
              onClick={() => setCurrentPage(item.page)}
              className={`w-full flex items-center space-x-3 px-6 py-3 text-left transition-colors ${
                currentPage === item.page
                  ? 'bg-white bg-opacity-10 border-r-4 border-white'
                  : 'hover:bg-white hover:bg-opacity-5'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="bg-white bg-opacity-10 rounded-lg p-4">
            <div className="text-sm font-medium">
              {user.firstName} {user.lastName}
            </div>
            <div className="text-xs text-blue-200 mt-1">{user.email}</div>
            <button
              onClick={handleLogout}
              className="mt-3 text-xs text-blue-200 hover:text-white transition-colors"
            >
              Abmelden
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="ml-64 p-8">
        {currentPage === 'dashboard' && <PlatformDashboardPage />}
        {currentPage === 'tenants' && <TenantListPage />}
        {currentPage === 'subscriptions' && <SubscriptionListPage />}
        {currentPage === 'plans' && <PlanListPage />}
        {currentPage === 'developer' && <DeveloperSettingsPage />}
        {currentPage === 'help' && <HelpCenterPage />}
      </div>
    </div>
  );
}
