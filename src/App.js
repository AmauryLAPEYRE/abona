import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { StripeProvider } from './contexts/StripeContext';
import { AuthProvider } from './contexts/AuthContext';
import { SubscriptionProvider } from './contexts/SubscriptionContext';

// Pages principales
import LandingPage from './pages/LandingPage';
import ServicesListPage from './pages/ServicesListPage';
import ServiceDetailsPage from './pages/ServiceDetailsPage';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import AdminPanel from './pages/AdminPanel';
import Checkout from './pages/Checkout';
import SuccessPage from './pages/SuccessPage';
import SubscriptionDetails from './pages/SubscriptionDetails';

// Pages Admin
import AdminMainServices from './components/admin/AdminMainServices';
import AdminServiceForm from './components/admin/AdminServiceForm';
import AdminServiceSubscriptions from './components/admin/AdminServiceSubscriptions';
import SubscriptionForm from './components/admin/SubscriptionForm';
import AdminUsers from './components/admin/AdminUsers';

// Composants
import Navbar from './components/Navbar';
import PrivateRoute from './components/PrivateRoute';
import AdminRoute from './components/AdminRoute';

const App = () => {
  return (
    <Router>
      <AuthProvider>
        <StripeProvider>
          <SubscriptionProvider>
            {/* La barre de navigation ne doit pas s'afficher sur les pages d'authentification et landing page */}
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="*" element={<AppWithNavbar />} />
            </Routes>
          </SubscriptionProvider>
        </StripeProvider>
      </AuthProvider>
    </Router>
  );
};

// Composant pour afficher la barre de navigation avec les routes restantes
const AppWithNavbar = () => {
  return (
    <>
      <Navbar />
      <div className="min-h-screen">
        <Routes>
          {/* Routes utilisateur */}
          <Route path="/services" element={<ServicesListPage />} />
          <Route path="/service/:serviceId" element={<ServiceDetailsPage />} />
          <Route path="/checkout/:serviceId/:subscriptionId" element={
            <PrivateRoute>
              <Checkout />
            </PrivateRoute>
          } />
          <Route path="/success" element={
            <PrivateRoute>
              <SuccessPage />
            </PrivateRoute>
          } />
          <Route path="/subscription/:subscriptionId" element={
            <PrivateRoute>
              <SubscriptionDetails />
            </PrivateRoute>
          } />
          <Route path="/dashboard" element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          } />
          
          {/* Routes Admin */}
          <Route path="/admin" element={
            <AdminRoute>
              <AdminPanel />
            </AdminRoute>
          }>
            <Route index element={<Navigate to="/admin/services" replace />} />
            <Route path="services" element={<AdminMainServices />} />
            <Route path="services/new" element={<AdminServiceForm />} />
            <Route path="services/edit/:id" element={<AdminServiceForm />} />
            <Route path="services/:serviceId/subscriptions" element={<AdminServiceSubscriptions />} />
            <Route path="services/:serviceId/subscriptions/new" element={<SubscriptionForm />} />
            <Route path="services/:serviceId/subscriptions/edit/:subscriptionId" element={<SubscriptionForm />} />
            <Route path="users" element={<AdminUsers />} />
          </Route>
          
          {/* Redirection par défaut */}
          <Route path="*" element={<Navigate to="/services" replace />} />
        </Routes>
      </div>
    </>
  );
};

export default App;