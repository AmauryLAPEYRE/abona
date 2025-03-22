import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';

const Navbar = () => {
  const { currentUser, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Gestion de la déconnexion
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Erreur de déconnexion', error);
    }
  };

  // Détermine si un lien est actif
  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  // Liens de navigation - générés une seule fois pour optimiser les performances
  const navLinks = useMemo(() => {
    const links = [
      { to: '/', label: 'Accueil' },
      { to: '/services', label: 'Services' }
    ];
    
    if (currentUser) {
      links.push({ to: '/dashboard', label: 'Mes abonnements' });
    }
    
    if (isAdmin) {
      links.push({ to: '/admin/services', label: 'Administration' });
    }
    
    return links;
  }, [currentUser, isAdmin]);

  // Composant pour les liens desktop
  const DesktopNavLinks = () => (
    <div className="hidden md:flex ml-10 space-x-4">
      {navLinks.map(link => (
        <Link 
          key={link.to}
          to={link.to} 
          className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            isActive(link.to) 
              ? 'text-blue-600' 
              : 'text-gray-700 hover:text-blue-600'
          }`}
        >
          {link.label}
        </Link>
      ))}
    </div>
  );

  // Composant pour les liens mobiles
  const MobileNavLinks = () => (
    <div className="space-y-1 px-4">
      {navLinks.map(link => (
        <Link 
          key={link.to}
          to={link.to} 
          className={`block px-3 py-2 rounded-md text-base font-medium ${
            isActive(link.to) 
              ? 'text-blue-600 bg-blue-50' 
              : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50'
          }`}
          onClick={() => setMobileMenuOpen(false)}
        >
          {link.label}
        </Link>
      ))}
      
      {currentUser ? (
        <button 
          onClick={() => {
            handleLogout();
            setMobileMenuOpen(false);
          }}
          className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-blue-50"
        >
          Déconnexion
        </button>
      ) : (
        <>
          <Link 
            to="/login" 
            className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-blue-50"
            onClick={() => setMobileMenuOpen(false)}
          >
            Connexion
          </Link>
          <Link 
            to="/register" 
            className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-blue-50"
            onClick={() => setMobileMenuOpen(false)}
          >
            Inscription
          </Link>
        </>
      )}
    </div>
  );

  // Composant pour le menu déroulant du profil utilisateur
  const UserProfileDropdown = () => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    
    // Fermer le menu lors d'un clic à l'extérieur
    useEffect(() => {
      const handleClickOutside = (event) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
          setIsOpen(false);
        }
      };
  
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, []);
    
    return (
      <div className="relative" ref={dropdownRef}>
        <button 
          className="flex items-center space-x-2 text-gray-700 hover:text-blue-600 transition-colors"
          onClick={() => setIsOpen(!isOpen)}
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center text-white font-medium">
            {currentUser.displayName ? currentUser.displayName.charAt(0).toUpperCase() : 'U'}
          </div>
          <span className="font-medium">{currentUser.displayName || 'Utilisateur'}</span>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
        
        {isOpen && (
          <div 
            className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10"
          >
            <Link 
              to="/profile" 
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Mon profil
            </Link>
            <Link 
              to="/dashboard" 
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Mes abonnements
            </Link>
            {isAdmin && (
              <Link 
                to="/admin/services" 
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                onClick={() => setIsOpen(false)}
              >
                Administration
              </Link>
            )}
            <button 
              onClick={() => {
                setIsOpen(false);
                handleLogout();
              }}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Déconnexion
            </button>
          </div>
        )}
      </div>
    );
  };

  // Composant pour les boutons d'authentification
  const AuthButtons = () => (
    <div className="flex items-center space-x-2">
      <Link 
        to="/login" 
        className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
      >
        Connexion
      </Link>
      <Link 
        to="/register" 
        className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-lg transition-colors"
      >
        Inscription
      </Link>
    </div>
  );

  // Bouton de basculement du menu mobile
  const MobileMenuToggle = () => (
    <button
      type="button"
      className="text-gray-700 hover:text-blue-600 transition-colors"
      onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      aria-label={mobileMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
    >
      {mobileMenuOpen ? (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      )}
    </button>
  );
  
  // Composant NotificationBell intégré
  const NotificationBell = () => {
    const [isOpen, setIsOpen] = useState(false);
    const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
    const dropdownRef = useRef(null);
  
    // Fermer le menu lors d'un clic à l'extérieur
    useEffect(() => {
      const handleClickOutside = (event) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
          setIsOpen(false);
        }
      };
  
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, []);
  
    // Formater la date pour l'affichage
    const formatDate = (date) => {
      if (!date) return '';
      
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);
      
      if (diffMins < 1) return 'À l\'instant';
      if (diffMins < 60) return `Il y a ${diffMins} min`;
      if (diffHours < 24) return `Il y a ${diffHours} h`;
      if (diffDays < 7) return `Il y a ${diffDays} j`;
      
      return date.toLocaleDateString();
    };
  
    // Obtenir l'icône et la couleur en fonction du type de notification
    const getNotificationIcon = (type) => {
      switch (type) {
        case 'expiration':
          return (
            <div className="flex-shrink-0 w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-orange-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
            </div>
          );
        case 'update':
          return (
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
              </svg>
            </div>
          );
        default:
          return (
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
              </svg>
            </div>
          );
      }
    };
  
    return (
      <div className="relative" ref={dropdownRef}>
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="relative p-1 rounded-full text-gray-700 hover:text-blue-600 transition-colors"
          aria-label="Notifications"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
        
        {isOpen && (
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg py-1 z-20">
            <div className="px-4 py-2 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-sm font-semibold text-gray-700">Notifications</h3>
              {unreadCount > 0 && (
                <button 
                  onClick={markAllAsRead}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Tout marquer comme lu
                </button>
              )}
            </div>
            
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto mb-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <p>Aucune notification</p>
                </div>
              ) : (
                notifications.map(notification => (
                  <div 
                    key={notification.id} 
                    className={`p-3 border-b border-gray-100 hover:bg-gray-50 transition-colors flex items-start ${!notification.read ? 'bg-blue-50' : ''}`}
                  >
                    {getNotificationIcon(notification.type)}
                    
                    <div className="ml-3 flex-1">
                      <div className="text-sm font-medium text-gray-900">
                        {notification.title}
                      </div>
                      <p className="text-sm text-gray-600 mt-0.5">
                        {notification.message}
                      </p>
                      
                      {notification.actionLink && (
                        <Link 
                          to={notification.actionLink}
                          className="text-xs text-blue-600 mt-1 inline-block hover:underline"
                          onClick={() => markAsRead(notification.id)}
                        >
                          {notification.actionText || 'Voir les détails'}
                        </Link>
                      )}
                      
                      <div className="mt-1 flex justify-between items-center">
                        <span className="text-xs text-gray-500">
                          {formatDate(notification.createdAt)}
                        </span>
                        
                        <div className="flex space-x-2">
                          {!notification.read && (
                            <button 
                              onClick={() => markAsRead(notification.id)}
                              className="text-xs text-blue-600 hover:text-blue-800"
                            >
                              Marquer comme lu
                            </button>
                          )}
                          <button 
                            onClick={() => deleteNotification(notification.id)}
                            className="text-xs text-gray-500 hover:text-red-600"
                          >
                            Supprimer
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <nav className="bg-white shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo et liens principaux */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center">
              <span className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                Abona
              </span>
            </Link>
            
            {/* Liens de navigation - version desktop */}
            <DesktopNavLinks />
          </div>
          
          {/* Boutons de connexion / profil */}
          <div className="hidden md:flex items-center">
            {currentUser ? (
              <div className="flex items-center space-x-4">
                <NotificationBell />
                <UserProfileDropdown />
              </div>
            ) : (
              <AuthButtons />
            )}
          </div>
          
          {/* Bouton de menu mobile */}
          <div className="md:hidden">
            <MobileMenuToggle />
          </div>
        </div>
      </div>
      
      {/* Menu mobile */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white pt-2 pb-3 border-t border-gray-200">
          <MobileNavLinks />
        </div>
      )}
    </nav>
  );
};

export default Navbar;