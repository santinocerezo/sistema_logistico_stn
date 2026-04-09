import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './stores/authStore';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';

// Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import CourierDashboard from './pages/CourierDashboard';
import AIChat from './pages/AIChat';
import Shipments from './pages/Shipments';
import NewShipment from './pages/NewShipment';
import ShipmentDetail from './pages/ShipmentDetail';
import Tracking from './pages/Tracking';
import Branches from './pages/Branches';
import Profile from './pages/Profile';
import Payments from './pages/Payments';
import Notifications from './pages/Notifications';

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

function DashboardRoute() {
  const { user } = useAuthStore();
  if (user?.role === 'admin') return <AdminDashboard />;
  if (user?.role === 'courier') return <CourierDashboard />;
  return <Dashboard />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="flex min-h-screen flex-col">
          <Header />
          <main className="flex-1">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/tracking" element={<Tracking />} />
              <Route path="/tracking/:trackingCode" element={<Tracking />} />
              <Route path="/branches" element={<Branches />} />

              {/* Protected Routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardRoute />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/shipments"
                element={
                  <ProtectedRoute>
                    <Shipments />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/shipments/new"
                element={
                  <ProtectedRoute>
                    <NewShipment />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/shipments/:id"
                element={
                  <ProtectedRoute>
                    <ShipmentDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/ai-chat"
                element={
                  <ProtectedRoute>
                    <AIChat />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/payments/*"
                element={
                  <ProtectedRoute>
                    <Payments />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/notifications"
                element={
                  <ProtectedRoute>
                    <Notifications />
                  </ProtectedRoute>
                }
              />

              {/* 404 */}
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
