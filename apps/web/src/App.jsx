// CHANGE 1: Ensure 'Navigate' is imported here
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { useEffect, Suspense, lazy } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

// Auth Provider
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';

// Components
// Components
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import Loading from './components/ui/Loading';
import ProtectedRoute from './components/auth/ProtectedRoute';
import ErrorBoundary from './components/layout/ErrorBoundary';

// Lazy load pages
const Home = lazy(() => import('./pages/public/Home'));
const About = lazy(() => import('./pages/public/About'));
const Services = lazy(() => import('./pages/public/Services'));
const Contact = lazy(() => import('./pages/public/Contact'));
const Login = lazy(() => import('./pages/auth/Login'));
const AdminLogin = lazy(() => import('./pages/auth/AdminLogin'));
const MarketLogin = lazy(() => import('./pages/auth/MarketLogin'));
const Privacy = lazy(() => import('./pages/public/Privacy'));

const StatusPage = lazy(() => import('./pages/public/StatusPage'));
const NotFound = lazy(() => import('./pages/public/NotFound'));
const ComingSoon = lazy(() => import('./pages/public/ComingSoon'));

const UnifiedLayout = lazy(() => import('./layouts/UnifiedLayout'));

const FarmerDashboard = lazy(() => import('./pages/farmer/FarmerDashboard'));
const WeightDashboard = lazy(() => import('./pages/weight/WeightDashboard'));

const TraderDashboardContent = lazy(() => import('./pages/trader/TraderDashboard'));

const TraderTransactions = lazy(() => import('./pages/trader/TraderTransactions'));
const TraderProfile = lazy(() => import('./pages/trader/TraderProfile'));

// Admin Dashboard
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const UserManagement = lazy(() => import('./pages/admin/UserManagement'));
const CommissionRules = lazy(() => import('./pages/admin/CommissionRules'));
const TransactionHistory = lazy(() => import('./pages/admin/TransactionHistory'));
// NEW Admin Pages
const FarmerManagement = lazy(() => import('./pages/admin/FarmerManagement'));
const TraderManagement = lazy(() => import('./pages/admin/TraderManagement'));
const WeightManagement = lazy(() => import('./pages/admin/WeightManagement'));
const LilavManagement = lazy(() => import('./pages/admin/LilavManagement'));
const CommitteeManagement = lazy(() => import('./pages/admin/CommitteeManagement'));
const ActivityLog = lazy(() => import('./pages/admin/ActivityLog'));
const VegetableManagement = lazy(() => import('./pages/admin/VegetableManagement'));

// Committee Dashboard
const CommitteeDashboard = lazy(() => import('./pages/committee/CommitteeDashboard'));
const FarmersList = lazy(() => import('./pages/committee/FarmersList'));
const TradersList = lazy(() => import('./pages/committee/TradersList'));
const WeightList = lazy(() => import('./pages/committee/WeightList'));
const WeightHistory = lazy(() => import('./pages/committee/WeightHistory'));
const FarmerDetail = lazy(() => import('./pages/committee/FarmerDetail'));
const MarketActivity = lazy(() => import('./pages/committee/MarketActivity'));


const BillingReports = lazy(() => import('./pages/committee/BillingReports'));
const PaymentManagement = lazy(() => import('./pages/committee/PaymentManagement'));
const LilavEntry = lazy(() => import('./pages/committee/LilavEntry'));
const LilavTransactions = lazy(() => import('./pages/lilav/LilavTransactions'));
// const AccountingDashboard = lazy(() => import('./pages/accounting/AccountingDashboard'));

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

function Layout({ children, hideNav = false, hideFooter = false }) {
  return (
    <>
      {!hideNav && <Navbar />}
      {children}
      {!hideFooter && <Footer />}
    </>
  );
}

// NEW COMPONENT: DashboardRedirect - Fixes infinite loop
function DashboardRedirect() {
  const { profile, profileLoading } = useAuth();

  if (profileLoading) {
    return <Loading text="Loading dashboard..." />;
  }

  // Redirect based on user's role
  const roleRoutes = {
    farmer: '/dashboard/farmer',
    trader: '/dashboard/trader',
    committee: '/dashboard/committee',
    accounting: '/dashboard/accounting',
    admin: '/dashboard/admin',
    weight: '/dashboard/weight'
  };

  const redirectTo = roleRoutes[profile?.role] || '/login';
  return <Navigate to={redirectTo} replace />;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30, // 30 seconds - data considered fresh
      refetchOnWindowFocus: true, // Auto-refresh when user returns to tab
      refetchOnReconnect: true, // Auto-refresh on network reconnect
      refetchInterval: false, // Disable global polling (handled per-component)
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <NotificationProvider>
          <Router>
            <Toaster position="top-center" />
            <ErrorBoundary>
              <ScrollToTop />
              <Suspense fallback={<Loading />}>
                <Routes>
                  {/* Login & Public Routes */}
                  <Route path="/login" element={
                    <Layout hideNav hideFooter>
                      <Login />
                    </Layout>
                  }
                  />

                  {/* Admin Login */}
                  <Route path="/admin/login" element={
                    <Layout hideNav hideFooter>
                      <AdminLogin />
                    </Layout>
                  }
                  />

                  {/* Market Staff Login - Committee & Lilav */}
                  <Route path="/market/login" element={
                    <Layout hideNav hideFooter>
                      <MarketLogin />
                    </Layout>
                  }
                  />

                  {/* --- DASHBOARDS --- */}

                  {/* Farmer Dashboard */}
                  <Route path="/dashboard/farmer" element={
                    <ProtectedRoute requireRole="farmer">
                      <FarmerDashboard />
                    </ProtectedRoute>
                  }
                  />

                  <Route path="/dashboard/weight" element={
                    <ProtectedRoute requireRole="weight">
                      <WeightDashboard />
                    </ProtectedRoute>
                  }
                  />

                  {/* Trader Dashboard */}
                  <Route path="/dashboard/trader" element={
                    <ProtectedRoute requireRole="trader">
                      <UnifiedLayout role="trader" />
                    </ProtectedRoute>
                  }
                  >
                    <Route index element={<TraderDashboardContent />} />
                    <Route path="transactions" element={<TraderTransactions />} />

                    <Route path="profile" element={<TraderProfile />} />
                  </Route>

                  <Route path="/dashboard/committee" element={
                    <ProtectedRoute requireRole="committee">
                      <UnifiedLayout role="committee" />
                    </ProtectedRoute>
                  }
                  >
                    <Route index element={<CommitteeDashboard />} />
                    <Route path="farmers" element={<FarmersList />} />
                    <Route path="farmers/:id" element={<FarmerDetail />} />
                    <Route path="traders" element={<TradersList />} />
                    <Route path="weight" element={<WeightList />} />
                    <Route path="weight-history" element={<WeightHistory />} />
                    <Route path="activity" element={<MarketActivity />} />

                    <Route path="billing" element={<BillingReports />} />


                    <Route path="payments" element={<PaymentManagement />} />


                    {/* Lilav (Auction) Section */}
                    <Route path="lilav" element={<LilavEntry />} />
                    <Route path="vegetables" element={<VegetableManagement />} />
                  </Route>

                  {/* Lilav Dashboard - Replaces Accounting */}
                  <Route path="/dashboard/lilav" element={
                    <ProtectedRoute requireRole="lilav">
                      <UnifiedLayout role="lilav" />
                    </ProtectedRoute>
                  }
                  >
                    <Route index element={<LilavEntry />} />
                    <Route path="transactions" element={<LilavTransactions />} />
                  </Route>

                  {/* Admin Dashboard */}
                  <Route path="/dashboard/admin" element={
                    <ProtectedRoute requireRole="admin">
                      <UnifiedLayout role="admin" />
                    </ProtectedRoute>
                  }
                  >
                    <Route index element={<AdminDashboard />} />
                    <Route path="users" element={<UserManagement />} />
                    <Route path="commission" element={<CommissionRules />} />
                    <Route path="transactions" element={<TransactionHistory />} />
                    {/* New Management Routes */}
                    <Route path="farmers" element={<FarmerManagement />} />
                    <Route path="traders" element={<TraderManagement />} />
                    <Route path="weight" element={<WeightManagement />} />
                    <Route path="lilav" element={<LilavManagement />} />
                    <Route path="committee" element={<CommitteeManagement />} />
                    <Route path="activity-log" element={<ActivityLog />} />
                    <Route path="vegetables" element={<VegetableManagement />} />
                  </Route>

                  {/* FIXED: Smart redirect based on user role - Prevents infinite loop */}
                  <Route path="/dashboard" element={<DashboardRedirect />} />

                  {/* Public Pages */}
                  <Route path="/" element={<Layout><Home /></Layout>} />
                  <Route path="/about" element={<Layout><About /></Layout>} />
                  <Route path="/services" element={<Layout><Services /></Layout>} />
                  <Route path="/contact" element={<Layout><Contact /></Layout>} />
                  <Route path="/privacy" element={<Layout><Privacy /></Layout>} />
                  <Route path="/status" element={<Layout><StatusPage /></Layout>} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </ErrorBoundary>
          </Router>
        </NotificationProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;