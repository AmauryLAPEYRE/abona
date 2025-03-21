import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const AdminRoute = ({ children }) => {
  const { currentUser, isAdmin, loading } = useAuth();
  
  if (loading) {
    return <div className="text-center py-10">Chargement...</div>;
  }
  
  return currentUser && isAdmin ? children : <Navigate to="/" />;
};

export default AdminRoute;