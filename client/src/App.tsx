import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { PlatformAuthProvider, usePlatformAuth } from './contexts/PlatformAuthContext';
import { WebSocketProvider } from './contexts/WebSocketContext';
import { Layout } from './components/layout/Layout';
import { LoginPage } from './pages/auth/LoginPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';
import SetupPasswordPage from './pages/auth/SetupPasswordPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { EmployeesPage } from './pages/employees/EmployeesPage';
import { EmployeeDetailPage } from './pages/employees/EmployeeDetailPage';
import { CustomersPage } from './pages/customers/CustomersPage';
import { CustomerDetailPage } from './pages/customers/CustomerDetailPage';
import { ObjectsPage } from './pages/objects/ObjectsPage';
import { ObjectDetailPage } from './pages/objects/ObjectDetailPage';
import { SchedulingPage } from './pages/scheduling/SchedulingPage';
import { PlanningGroupManager } from './components/planning/PlanningGroupManager';
import { AttendancePage } from './pages/attendance/AttendancePage';
import { BillingPage } from './pages/billing/BillingPage';
import { ReportsPage } from './pages/reports/ReportsPage';
import { AdminPage } from './pages/admin/AdminPage';
import { UsersPage } from './pages/admin/UsersPage';
import { RolesPage } from './pages/admin/RolesPage';
import BrandingSettingsPage from './pages/settings/BrandingSettingsPage';
import { PlatformLayout } from './pages/platform/PlatformLayout';
import { PlatformLoginPage } from './pages/platform/PlatformLoginPage';
import { PlatformDashboardPage } from './pages/platform/PlatformDashboardPage';
import { TenantListPage } from './pages/platform/TenantListPage';
import { SubscriptionListPage } from './pages/platform/SubscriptionListPage';
import { PlanListPage } from './pages/platform/PlanListPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { ShiftSwapManagement } from './pages/scheduling/ShiftSwapManagement';
import { LoadingSpinner } from './components/common/LoadingSpinner';
import { ModalSafetyGuard } from './components/common/ModalSafetyGuard';
import { getDefaultPath, hasPermission, ROUTE_PERMISSIONS } from './utils/authorization';

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

function PermissionRoute({ path, children }: { path: string; children: React.ReactNode }) {
  const { user } = useAuth();
  const required = ROUTE_PERMISSIONS[path] ?? [];

  if (hasPermission(user, required)) return <>{children}</>;

  const defaultPath = getDefaultPath(user);
  if (defaultPath && defaultPath !== path) return <Navigate to={defaultPath} replace />;
  return <div className="rounded-lg bg-white p-6 text-gray-700">Sie haben keine Berechtigung, diesen Bereich aufzurufen.</div>;
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
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/setup-password" element={<SetupPasswordPage />} />
      <Route path="/platform/login" element={<PlatformLoginPage />} />
      <Route path="/platform/*" element={<PlatformLayout />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <WebSocketProvider>
              <Layout>
                <Routes>
                  {/* Dashboard */}
                  <Route path="/" element={<PermissionRoute path="/"><DashboardPage /></PermissionRoute>} />

                  {/* Module (Phase 2+ Inhalte) */}
                  <Route path="/employees" element={<PermissionRoute path="/employees"><EmployeesPage /></PermissionRoute>} />
                  <Route path="/employees/:id" element={<PermissionRoute path="/employees"><EmployeeDetailPage /></PermissionRoute>} />
                  <Route path="/customers" element={<PermissionRoute path="/customers"><CustomersPage /></PermissionRoute>} />
                  <Route path="/customers/:id" element={<PermissionRoute path="/customers"><CustomerDetailPage /></PermissionRoute>} />
                  <Route path="/objects" element={<PermissionRoute path="/objects"><ObjectsPage /></PermissionRoute>} />
                  <Route path="/objects/:id" element={<PermissionRoute path="/objects"><ObjectDetailPage /></PermissionRoute>} />
                  <Route path="/scheduling" element={<PermissionRoute path="/scheduling"><SchedulingPage /></PermissionRoute>} />
                  <Route path="/planning-groups" element={<PermissionRoute path="/planning-groups"><PlanningGroupManager /></PermissionRoute>} />
                  <Route path="/attendance" element={<PermissionRoute path="/attendance"><AttendancePage /></PermissionRoute>} />
                  <Route path="/billing" element={<PermissionRoute path="/billing"><BillingPage /></PermissionRoute>} />
                  <Route path="/reports" element={<PermissionRoute path="/reports"><ReportsPage /></PermissionRoute>} />

                  {/* Administration */}
                  <Route path="/admin" element={<PermissionRoute path="/admin"><AdminPage /></PermissionRoute>} />
                  <Route path="/admin/users" element={<PermissionRoute path="/admin/users"><UsersPage /></PermissionRoute>} />
                  <Route path="/admin/roles" element={<PermissionRoute path="/admin/roles"><RolesPage /></PermissionRoute>} />
                  <Route path="/admin/branding" element={<PermissionRoute path="/admin/branding"><BrandingSettingsPage /></PermissionRoute>} />
                  <Route path="/notifications" element={<NotificationsPage />} />
                  <Route path="/shift-swaps" element={<PermissionRoute path="/shift-swaps"><ShiftSwapManagement /></PermissionRoute>} />

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
      <ModalSafetyGuard />
      <AppRoutes />
    </AuthProvider>
  );
}
