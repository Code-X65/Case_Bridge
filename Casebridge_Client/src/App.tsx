import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ClientLayout } from '@/layouts/ClientLayout';
import { Toaster } from '@/components/ui/toaster';

import LoginPage from '@/pages/auth/LoginPage';
import SignupPage from '@/pages/auth/SignupPage';
import DashboardPage from '@/pages/client/DashboardPage';
import MatterListPage from '@/pages/client/matters/MatterListPage';
import CreateMatterPage from '@/pages/client/matters/CreateMatterPage';
import MatterDetailPage from '@/pages/client/matters/MatterDetailPage';
import DocumentListPage from '@/pages/client/documents/DocumentListPage';
import ConsultationListPage from '@/pages/client/consultations/ConsultationListPage';
import BillingPage from '@/pages/client/billing/BillingPage';
import ProfilePage from '@/pages/client/ProfilePage';
import NotificationsPage from '@/pages/client/NotificationsPage';
import LandingPage from '@/pages/LandingPage';

import { AuthProvider } from '@/contexts/AuthContext';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />

            {/* Protected Client Routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/client" element={<ClientLayout />}>
                <Route index element={<Navigate to="/client/dashboard" replace />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="matters">
                  <Route index element={<MatterListPage />} />
                  <Route path="create" element={<CreateMatterPage />} />
                  <Route path=":id" element={<MatterDetailPage />} />
                </Route>
                <Route path="documents" element={<DocumentListPage />} />
                <Route path="consultations" element={<ConsultationListPage />} />
                <Route path="billing" element={<BillingPage />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="notifications" element={<NotificationsPage />} />
              </Route>
            </Route>

            {/* Root Route */}
            <Route path="/" element={<LandingPage />} />
          </Routes>
          <Toaster />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
