import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { StripeProvider } from './contexts/StripeContext';
import { AuthProvider } from './contexts/AuthContext';
import { SubscriptionProvider } from './contexts/SubscriptionContext';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import AdminPanel from './pages/AdminPanel';
import Checkout from './pages/Checkout';
import SuccessPage from './pages/SuccessPage';
import SubscriptionDetails from './pages/SubscriptionDetails';

// Components
import Navbar from './components/Navbar';
import PrivateRoute from './components/PrivateRoute';
import AdminRoute from './components/AdminRoute';

const App = () => {
  return (
    <Router>
      <AuthProvider>
        <StripeProvider>
          <SubscriptionProvider>
            <Navbar />
            <div className="container mx-auto px-4 py-8">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/checkout/:subscriptionId" element={
                  <PrivateRoute>
                    <Checkout />
                  </PrivateRoute>
                } />
                <Route path="/success" element={<SuccessPage />} />
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
              </Routes>
            </div>
          </SubscriptionProvider>
        </StripeProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;