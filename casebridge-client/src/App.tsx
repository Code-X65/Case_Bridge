import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import PublicRoute from './components/PublicRoute';
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
import LandingPage from './pages/LandingPage';
import InternalLandingPage from './pages/InternalLandingPage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
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
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/cases" element={<MyCases />} />
            <Route path="/cases/:id" element={<CaseDetail />} />
            <Route path="/cases/:id/schedule" element={<ScheduleMeeting />} />
            <Route path="/documents" element={<GlobalDocuments />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/cases/new" element={<NewCase />} />
            <Route path="/billing/plans" element={<SelectIntakePlan />} />
            <Route path="/billing/invoices/:id/pay" element={<InvoicePaymentPage />} />
            <Route path="/billing/history" element={<InvoicesPage />} />
            <Route path="/" element={<LandingPage />} />
            <Route path="/firm" element={<InternalLandingPage />} />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;
