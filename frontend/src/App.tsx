import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';

// Layouts
import PublicLayout from './layouts/PublicLayout';
import DashboardLayout from './layouts/DashboardLayout';

// Guards
import ProtectedRoute from './components/ProtectedRoute';

// Public Pages
import LandingPage from './pages/public/LandingPage';
import LoginPage from './pages/public/LoginPage';
import RegisterPage from './pages/public/RegisterPage';
import ServicesPage from './pages/public/ServicesPage';
import MerchantsPage from './pages/public/MerchantsPage';
import MerchantProfilePage from './pages/public/MerchantProfilePage';

// Customer Pages
import CustomerDashboard from './pages/customer/CustomerDashboard';
import CustomerBookings from './pages/customer/CustomerBookings';
import CustomerPayments from './pages/customer/CustomerPayments';
import CustomerFavorites from './pages/customer/CustomerFavorites';
import CustomerReviews from './pages/customer/CustomerReviews';

// Merchant Pages
import MerchantDashboard from './pages/merchant/MerchantDashboard';
import MerchantProfile from './pages/merchant/MerchantProfile';
import MerchantServices from './pages/merchant/MerchantServices';
import MerchantBookings from './pages/merchant/MerchantBookings';
import MerchantEarnings from './pages/merchant/MerchantEarnings';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminMerchants from './pages/admin/AdminMerchants';
import AdminCategories from './pages/admin/AdminCategories';
import AdminBookings from './pages/admin/AdminBookings';
import AdminPayments from './pages/admin/AdminPayments';
import AdminUsers from './pages/admin/AdminUsers';
import AdminAuditLogs from './pages/admin/AdminAuditLogs';

// Layout Wrappers
const CustomerLayout = () => (
  <ProtectedRoute allowedRoles={['Customer']}>
    <DashboardLayout role="Customer" />
  </ProtectedRoute>
);

const MerchantLayout = () => (
  <ProtectedRoute allowedRoles={['Merchant']}>
    <DashboardLayout role="Merchant" />
  </ProtectedRoute>
);

const AdminLayout = () => (
  <ProtectedRoute allowedRoles={['Admin']}>
    <DashboardLayout role="Admin" />
  </ProtectedRoute>
);

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/services" element={<ServicesPage />} />
            <Route path="/merchants" element={<MerchantsPage />} />
            <Route path="/merchants/:id" element={<MerchantProfilePage />} />
          </Route>

          {/* Customer Dashboard */}
          <Route element={<CustomerLayout />}>
            <Route path="/customer/dashboard" element={<CustomerDashboard />} />
            <Route path="/customer/bookings" element={<CustomerBookings />} />
            <Route path="/customer/payments" element={<CustomerPayments />} />
            <Route path="/customer/favorites" element={<CustomerFavorites />} />
            <Route path="/customer/reviews" element={<CustomerReviews />} />
          </Route>

          {/* Merchant Dashboard */}
          <Route element={<MerchantLayout />}>
            <Route path="/merchant/dashboard" element={<MerchantDashboard />} />
            <Route path="/merchant/profile" element={<MerchantProfile />} />
            <Route path="/merchant/services" element={<MerchantServices />} />
            <Route path="/merchant/bookings" element={<MerchantBookings />} />
            <Route path="/merchant/earnings" element={<MerchantEarnings />} />
          </Route>

          {/* Admin Dashboard */}
          <Route element={<AdminLayout />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/merchants" element={<AdminMerchants />} />
            <Route path="/admin/categories" element={<AdminCategories />} />
            <Route path="/admin/bookings" element={<AdminBookings />} />
            <Route path="/admin/payments" element={<AdminPayments />} />
            <Route path="/admin/audit-logs" element={<AdminAuditLogs />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
