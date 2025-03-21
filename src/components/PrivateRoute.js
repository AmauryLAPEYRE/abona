import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const PrivateRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();
  
  if (loading) {
    return <div className="text-center py-10">Chargement...</div>;
  }
  
  return currentUser ? children : <Navigate to="/login" />;
};

export default PrivateRoute;