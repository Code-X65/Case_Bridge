import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import PublicRoute from './components/PublicRoute';
import ClientLayout from './components/ClientLayout';
import VisitorLayout from './components/visitor/VisitorLayout';
import Signup from './pages/Signup';
import Login from './pages/Login';
import VerifyEmail from './pages/VerifyEmail';
import EmailVerificationPending from './pages/EmailVerificationPending';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import NewCase from './pages/NewCase';
import MyCases from './pages/MyCases';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import CaseDetail from './pages/CaseDetail';
import GlobalDocuments from './pages/GlobalDocuments';
import NotificationsPage from './pages/NotificationsPage';
import ScheduleMeeting from './pages/ScheduleMeeting';
import SelectIntakePlan from './pages/billing/SelectIntakePlan';
import InvoicePaymentPage from './pages/billing/InvoicePaymentPage';
import InvoicesPage from './pages/billing/InvoicesPage';
import MessagesPage from './pages/MessagesPage';
import ClientSignaturePage from './pages/ClientSignaturePage';
import LandingPage from './pages/LandingPage';
import InternalLandingPage from './pages/InternalLandingPage';
import HowItWorksPage from './pages/visitor/HowItWorksPage';
import LegalAreasPage from './pages/visitor/LegalAreasPage';
import AboutPage from './pages/visitor/AboutPage';
import ContactPage from './pages/visitor/ContactPage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { ConnectivityProvider } from './contexts/ConnectivityContext';
import { ToastProvider } from './components/common/ToastService';
import NetworkStatus from './components/common/NetworkStatus';
import NotificationDispatcher from './components/common/NotificationDispatcher';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30, // 30 seconds
      gcTime: 1000 * 60 * 10, // 10 minutes
      refetchOnWindowFocus: true, // Keep this true for background sync on tab focus
      retry: 2,
    },
  },
});

function App() {
  return (
    <ConnectivityProvider>
      <ToastProvider>
        <AuthProvider>
          <QueryClientProvider client={queryClient}>
            <NotificationDispatcher />
            <NetworkStatus />
            <BrowserRouter>
            <Routes>
              <Route element={<PublicRoute />}>
                <Route path="/signup" element={<Signup />} />
                <Route path="/login" element={<Login />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
              </Route>

              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="/email-verification-pending" element={<EmailVerificationPending />} />
              <Route path="/onboarding" element={<Onboarding />} />

              {/* Client Protected Routes with Persistent Layout */}
              <Route element={<ClientLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/cases" element={<MyCases />} />
                <Route path="/cases/:id" element={<CaseDetail />} />
                <Route path="/cases/:id/schedule" element={<ScheduleMeeting />} />
                <Route path="/documents" element={<GlobalDocuments />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/messages" element={<MessagesPage />} />
                <Route path="/cases/new" element={<NewCase />} />
                <Route path="/billing/plans" element={<SelectIntakePlan />} />
                <Route path="/billing/invoices/:id/pay" element={<InvoicePaymentPage />} />
                <Route path="/billing/history" element={<InvoicesPage />} />
                <Route path="/sign/:requestId" element={<ClientSignaturePage />} />
              </Route>

              {/* Visitor Routes with Visitor Layout */}
              <Route element={<VisitorLayout />}>
                <Route path="/" element={<LandingPage />} />
                <Route path="/how-it-works" element={<HowItWorksPage />} />
                <Route path="/legal-areas" element={<LegalAreasPage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/contact" element={<ContactPage />} />
              </Route>

              <Route path="/firm" element={<InternalLandingPage />} />
            </Routes>
          </BrowserRouter>
        </QueryClientProvider>
      </AuthProvider>
    </ToastProvider>
  </ConnectivityProvider>
);
}

export default App;
