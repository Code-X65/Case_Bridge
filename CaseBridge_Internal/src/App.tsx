import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Components
import ProtectedRoute from './components/ProtectedRoute';

// Layouts
import InternalLayout from './layouts/InternalLayout';

// Pages
import LoginPage from './pages/auth/LoginPage';
import AcceptInvitePage from './pages/auth/AcceptInvitePage';
import DashboardPage from './pages/DashboardPage';

// Admin Pages
import FirmSettingsPage from './pages/admin/FirmSettingsPage';
import TeamManagementPage from './pages/admin/TeamManagementPage';
import AuditLogsPage from './pages/admin/AuditLogsPage';
import EarningsPage from './pages/admin/EarningsPage';
import NotificationsPage from './pages/NotificationsPage';
import ProfilePage from './pages/ProfilePage';

// Case Pages
import MatterIntakePage from './pages/cases/MatterIntakePage';
import MatterDetailPage from './pages/cases/MatterDetailPage';
import CreateMatterPage from './pages/cases/CreateMatterPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/accept-invite/:token" element={<AcceptInvitePage />} />

          {/* Protected Internal Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <InternalLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />

            <Route
              path="firm-profile"
              element={
                <ProtectedRoute requiredRole="admin_manager">
                  <FirmSettingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="cases/new"
              element={
                <ProtectedRoute>
                  <CreateMatterPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="users"
              element={
                <ProtectedRoute requiredRole="admin_manager">
                  <TeamManagementPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="audit-logs"
              element={
                <ProtectedRoute requiredRole="admin_manager">
                  <AuditLogsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="earnings"
              element={
                <ProtectedRoute requiredRole="admin_manager">
                  <EarningsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="notifications"
              element={
                <ProtectedRoute>
                  <NotificationsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />

            {/* Case Manager Routes */}
            <Route path="cases" element={<MatterIntakePage />} />
            <Route path="cases/:id" element={<MatterDetailPage />} />
          </Route>

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
