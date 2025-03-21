import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import AdminServices from '../components/admin/AdminServices';
import AdminServiceForm from '../components/admin/AdminServiceForm';
import AdminCredentials from '../components/admin/AdminCredentials';
import AdminUsers from '../components/admin/AdminUsers';

const AdminPanel = () => {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Panel d'administration</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Link 
          to="/admin/services"
          className="bg-blue-600 text-white p-4 rounded-lg text-center"
        >
          Gérer les services
        </Link>
        <Link 
          to="/admin/services/new"
          className="bg-green-600 text-white p-4 rounded-lg text-center"
        >
          Ajouter un service
        </Link>
        <Link 
          to="/admin/credentials"
          className="bg-purple-600 text-white p-4 rounded-lg text-center"
        >
          Gérer les identifiants
        </Link>
        <Link 
          to="/admin/users"
          className="bg-gray-700 text-white p-4 rounded-lg text-center"
        >
          Gérer les utilisateurs
        </Link>
      </div>

      <Routes>
        <Route path="services" element={<AdminServices />} />
        <Route path="services/new" element={<AdminServiceForm />} />
        <Route path="services/edit/:id" element={<AdminServiceForm />} />
        <Route path="credentials" element={<AdminCredentials />} />
        <Route path="credentials/:serviceId" element={<AdminCredentials />} />
        <Route path="users" element={<AdminUsers />} />
      </Routes>
    </div>
  );
};

export default AdminPanel;