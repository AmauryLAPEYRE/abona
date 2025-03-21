import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { StripeProvider } from './contexts/StripeContext';
import { AuthProvider } from './contexts/AuthContext';
import { SubscriptionProvider } from './contexts/SubscriptionContext';

// Pages principales
import LandingPage from './pages/LandingPage';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import AdminPanel from './pages/AdminPanel';
import Checkout from './pages/Checkout';
import SuccessPage from './pages/SuccessPage';
import SubscriptionDetails from './pages/SubscriptionDetails';

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
          <Route path="/services" element={<Home />} />
          <Route path="/checkout/:subscriptionId" element={
            <PrivateRoute>
              <Checkout />
            </PrivateRoute>
          } />
          <Route path="/success" element={
            <PrivateRoute>
              <SuccessPage />
            </PrivateRoute>
          } />
          <Route path="/subscription/:id" element={
            <PrivateRoute>
              <SubscriptionDetails />
            </PrivateRoute>
          } />
          <Route path="/dashboard" element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          } />
          <Route path="/admin/*" element={
            <AdminRoute>
              <AdminPanel />
            </AdminRoute>
          } />
          {/* Redirection par défaut */}
          <Route path="*" element={<Navigate to="/services" replace />} />
        </Routes>
      </div>
    </>
  );
};

export default App;