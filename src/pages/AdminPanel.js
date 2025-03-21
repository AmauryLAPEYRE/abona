import React, { useState } from 'react';
import { Routes, Route, Link, useLocation, Navigate, Outlet } from 'react-router-dom';

const AdminPanel = () => {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  // Déterminer quel menu est actif
  const isActive = (path) => {
    const currentPath = location.pathname;
    return currentPath.includes(path);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar (version desktop) */}
      <div className={`bg-white shadow-md fixed inset-y-0 left-0 z-30 transition-all duration-300 transform ${
        collapsed ? 'w-16' : 'w-64'
      } lg:translate-x-0 border-r border-gray-200`}>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
            {!collapsed && (
              <span className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                Administration
              </span>
            )}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-1 rounded-md hover:bg-gray-100"
            >
              {collapsed ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              )}
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            <nav className="py-4 px-2">
              <Link 
                to="/admin/services" 
                className={`flex items-center px-4 py-3 mb-2 rounded-lg ${
                  isActive('/admin/services') && !isActive('/admin/services/new') && !isActive('/admin/services/edit')
                    ? 'bg-blue-50 text-blue-700' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                {!collapsed && <span>Services</span>}
              </Link>
              
              <Link 
                to="/admin/services/new" 
                className={`flex items-center px-4 py-3 mb-2 rounded-lg ${
                  isActive('/admin/services/new') 
                    ? 'bg-blue-50 text-blue-700' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                {!collapsed && <span>Nouveau service</span>}
              </Link>
              
              <Link 
                to="/admin/users" 
                className={`flex items-center px-4 py-3 mb-2 rounded-lg ${
                  isActive('/admin/users') 
                    ? 'bg-blue-50 text-blue-700' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                {!collapsed && <span>Utilisateurs</span>}
              </Link>
              
              <div className="border-t border-gray-200 my-4"></div>
              
              <Link 
                to="/" 
                className="flex items-center px-4 py-3 mb-2 rounded-lg text-gray-600 hover:bg-gray-100"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                {!collapsed && <span>Retour au site</span>}
              </Link>
            </nav>
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className={`flex-1 ${collapsed ? 'ml-16' : 'ml-64'} transition-all duration-300`}>
        <div className="py-6 px-8">
          <Outlet /> {/* Affiche les composants enfants basés sur les routes */}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;