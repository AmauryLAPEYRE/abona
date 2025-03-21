import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Navbar = () => {
  const { currentUser, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Erreur de déconnexion', error);
    }
  };

  return (
    <nav className="bg-white shadow-md mb-8">
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          <Link to="/" className="text-2xl font-bold text-blue-600">
            ShareSub
          </Link>
          
          <div className="flex items-center space-x-4">
            {currentUser ? (
              <>
                <Link to="/dashboard" className="text-gray-700 hover:text-blue-600">
                  Mes abonnements
                </Link>
                
                {isAdmin && (
                  <Link to="/admin/services" className="text-gray-700 hover:text-blue-600">
                    Admin
                  </Link>
                )}
                
                <button
                  onClick={handleLogout}
                  className="bg-gray-200 text-gray-700 px-3 py-1 rounded hover:bg-gray-300"
                >
                  Déconnexion
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-gray-700 hover:text-blue-600">
                  Connexion
                </Link>
                <Link 
                  to="/register" 
                  className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                >
                  Inscription
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;