import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ProtectedRoute from './components/ProtectedRoute';

// Auth Pages
import InternalLoginPage from './pages/auth/InternalLoginPage';
import RegisterFirmPage from './pages/auth/RegisterFirmPage';
import EmailConfirmPage from './pages/auth/EmailConfirmPage';
import FirstLoginWelcome from './pages/auth/FirstLoginWelcome';
import UnauthorizedPage from './pages/auth/UnauthorizedPage';
import LockedAccountPage from './pages/auth/LockedAccountPage';
import AcceptInvitePage from './pages/auth/AcceptInvitePage';
import FirmProfilePage from './pages/internal/FirmProfilePage';
import AuditLogsPage from './pages/internal/AuditLogsPage';
import SubscriptionPlansPage from './pages/internal/SubscriptionPlansPage';
import InternalLandingPage from './pages/internal/InternalLandingPage';
import DashboardDispatcher from './pages/internal/DashboardDispatcher';
import StaffManagementPage from './pages/internal/StaffManagementPage';
import MatterManagementPage from './pages/internal/MatterManagementPage';
import ComingSoonPage from './pages/internal/ComingSoonPage';
import IntakeDashboard from './pages/internal/intake/IntakeDashboard';
import IntakeReview from './pages/internal/intake/IntakeReview';
import ClientBehaviorPage from './pages/internal/case-manager/ClientBehaviorPage';

import MyMattersPage from './pages/internal/MyMattersPage';
import MatterWorkspace from './pages/internal/matters/MatterWorkspace';
import NotificationsPage from './pages/internal/NotificationsPage';
import ProfileSettings from './pages/internal/ProfileSettings';
import InternalCalendar from './pages/internal/InternalCalendar';
import InternalSchedulePage from './pages/internal/InternalSchedulePage';
import InternalDocumentVault from './pages/internal/InternalDocumentVault';

import ClientLoginPage from './pages/client/ClientLoginPage';
import ClientDashboard from './pages/client/ClientDashboard';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Client Portal Routes */}
          <Route path="/client/login" element={<ClientLoginPage />} />
          <Route path="/client/dashboard" element={<ClientDashboard />} />

          {/* Public Routes */}
          <Route path="/" element={<InternalLandingPage />} />
          <Route path="/internal/login" element={<InternalLoginPage />} />
          <Route path="/internal/register-firm" element={<RegisterFirmPage />} />
          <Route path="/auth/confirm" element={<EmailConfirmPage />} />
          <Route path="/auth/accept-invite" element={<AcceptInvitePage />} />

          {/* Security & Onboarding Routes */}
          <Route path="/auth/welcome" element={<ProtectedRoute><FirstLoginWelcome /></ProtectedRoute>} />
          <Route path="/auth/unauthorized" element={<UnauthorizedPage />} />
          <Route path="/auth/locked" element={<LockedAccountPage />} />


          {/* Protected Internal Routes */}
          <Route
            path="/internal/dashboard"
            element={
              <ProtectedRoute>
                <DashboardDispatcher />
              </ProtectedRoute>
            }
          />
          <Route path="/internal/case-manager/dashboard" element={<ProtectedRoute><DashboardDispatcher /></ProtectedRoute>} />
          <Route path="/internal/associate/dashboard" element={<ProtectedRoute><DashboardDispatcher /></ProtectedRoute>} />

          {/* Unify Admin & Case Manager Routes (Admin has super-set) */}
          <Route path="/internal/intake" element={<ProtectedRoute><IntakeDashboard /></ProtectedRoute>} />
          <Route path="/intake" element={<ProtectedRoute><IntakeDashboard /></ProtectedRoute>} /> {/* Alias */}
          <Route path="/intake/:id" element={<ProtectedRoute><IntakeReview /></ProtectedRoute>} />
          <Route path="/internal/intake/:id" element={<ProtectedRoute><IntakeReview /></ProtectedRoute>} />

          <Route path="/internal/matters" element={<ProtectedRoute><MatterManagementPage /></ProtectedRoute>} />
          <Route path="/internal/clients" element={<ProtectedRoute><ClientBehaviorPage /></ProtectedRoute>} />
          <Route path="/internal/documents" element={<ProtectedRoute><InternalDocumentVault /></ProtectedRoute>} />
          <Route path="/internal/calendar" element={<ProtectedRoute><InternalCalendar /></ProtectedRoute>} />
          <Route path="/internal/reports" element={<ProtectedRoute><ComingSoonPage /></ProtectedRoute>} />

          <Route path="/internal/staff" element={<ProtectedRoute><StaffManagementPage /></ProtectedRoute>} />
          <Route path="/internal/staff-management" element={<ProtectedRoute><StaffManagementPage /></ProtectedRoute>} /> {/* Alias */}

          {/* Legacy / Specialized Routes */}
          <Route path="/internal/case-manager/matters" element={<ProtectedRoute><MatterManagementPage /></ProtectedRoute>} />
          <Route path="/internal/case-manager/clients" element={<ProtectedRoute><ClientBehaviorPage /></ProtectedRoute>} />
          <Route path="/internal/case-manager/calendar" element={<ProtectedRoute><InternalCalendar /></ProtectedRoute>} />
          <Route path="/internal/case-manager/documents" element={<ProtectedRoute><InternalDocumentVault /></ProtectedRoute>} />

          {/* Associate Routes */}
          <Route path="/internal/associate/matters" element={<ProtectedRoute><MyMattersPage /></ProtectedRoute>} />
          <Route path="/internal/associate/schedule" element={<ProtectedRoute><InternalSchedulePage /></ProtectedRoute>} />
          <Route path="/internal/associate/documents" element={<ProtectedRoute><InternalDocumentVault /></ProtectedRoute>} />

          {/* System Pages */}
          <Route path="/internal/firm-profile" element={<ProtectedRoute><FirmProfilePage /></ProtectedRoute>} />
          <Route path="/internal/billing" element={<ProtectedRoute><ComingSoonPage /></ProtectedRoute>} />
          <Route path="/internal/settings" element={<ProtectedRoute><ComingSoonPage /></ProtectedRoute>} />
          <Route path="/internal/profile" element={<ProtectedRoute><ProfileSettings /></ProtectedRoute>} />
          <Route path="/internal/audit-logs" element={<ProtectedRoute><AuditLogsPage /></ProtectedRoute>} />
          <Route path="/internal/subscription-plans" element={<ProtectedRoute><SubscriptionPlansPage /></ProtectedRoute>} />
          <Route path="/internal/security" element={<ProtectedRoute><ComingSoonPage /></ProtectedRoute>} />
          <Route path="/internal/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
          <Route path="/internal/matter/:id" element={<ProtectedRoute><MatterWorkspace /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
