import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { PlatformAuthProvider, usePlatformAuth } from './contexts/PlatformAuthContext';
import { WebSocketProvider } from './contexts/WebSocketContext';
import { Layout } from './components/layout/Layout';
import { LoginPage } from './pages/auth/LoginPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { EmployeesPage } from './pages/employees/EmployeesPage';
import { EmployeeDetailPage } from './pages/employees/EmployeeDetailPage';
import { CustomersPage } from './pages/customers/CustomersPage';
import { ObjectsPage } from './pages/objects/ObjectsPage';
import { SchedulingPage } from './pages/scheduling/SchedulingPage';
import { AttendancePage } from './pages/attendance/AttendancePage';
import { BillingPage } from './pages/billing/BillingPage';
import { ReportsPage } from './pages/reports/ReportsPage';
import { AdminPage } from './pages/admin/AdminPage';
import { UsersPage } from './pages/admin/UsersPage';
import { RolesPage } from './pages/admin/RolesPage';
import { PlatformLoginPage } from './pages/platform/PlatformLoginPage';
import { PlatformDashboardPage } from './pages/platform/PlatformDashboardPage';
import { PlatformTenantsPage } from './pages/platform/PlatformTenantsPage';
import { PlatformLayout } from './pages/platform/PlatformLayout';
import { LoadingSpinner } from './components/common/LoadingSpinner';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function PlatformProtectedRoute({ children }: { children: React.ReactNode }) {
  const { admin, isLoading } = usePlatformAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!admin) {
    return <Navigate to="/platform/login" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/platform/login" element={<PlatformLoginPage />} />
      <Route path="/platform/*" element={
        <PlatformAuthProvider>
          <PlatformProtectedRoute>
            <PlatformLayout>
              <Routes>
                <Route path="" element={<PlatformDashboardPage />} />
                <Route path="tenants" element={<PlatformTenantsPage />} />
                <Route path="plans" element={<div>Tarife (kommt bald)</div>} />
                <Route path="payments" element={<div>Zahlungen (kommt bald)</div>} />
                <Route path="webhooks" element={<div>Webhooks (kommt bald)</div>} />
              </Routes>
            </PlatformLayout>
          </PlatformProtectedRoute>
        </PlatformAuthProvider>
      } />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <WebSocketProvider>
              <Layout>
                <Routes>
                  {/* Dashboard */}
                  <Route path="/" element={<DashboardPage />} />

                  {/* Module (Phase 2+ Inhalte) */}
                  <Route path="/employees" element={<EmployeesPage />} />
                  <Route path="/employees/:id" element={<EmployeeDetailPage />} />
                  <Route path="/customers" element={<CustomersPage />} />
                  <Route path="/customers/:id" element={<div>Kunden-Detail</div>} />
                  <Route path="/objects" element={<ObjectsPage />} />
                  <Route path="/objects/:id" element={<div>Objekt-Detail</div>} />
                  <Route path="/scheduling" element={<SchedulingPage />} />
                  <Route path="/attendance" element={<AttendancePage />} />
                  <Route path="/billing" element={<BillingPage />} />
                  <Route path="/reports" element={<ReportsPage />} />

                  {/* Administration */}
                  <Route path="/admin" element={<AdminPage />} />
                  <Route path="/admin/users" element={<UsersPage />} />
                  <Route path="/admin/roles" element={<RolesPage />} />

                  {/* Fallback */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Layout>
            </WebSocketProvider>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
