import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import NotificationBell from './NotificationBell';

// Composant optimisé pour les liens de navigation
const NavLink = React.memo(({ to, label, isActive, onClick = null }) => (
  <Link 
    to={to} 
    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      isActive(to) 
        ? 'text-blue-600' 
        : 'text-gray-700 hover:text-blue-600'
    }`}
    onClick={onClick}
  >
    {label}
  </Link>
));

// Composant optimisé pour les boutons d'authentification
const AuthButtons = React.memo(() => (
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
));

// Menu déroulant du profil utilisateur
const UserProfileDropdown = React.memo(({ currentUser, isAdmin, handleLogout }) => {
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
  
  const toggleDropdown = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);
  
  const closeDropdown = useCallback(() => {
    setIsOpen(false);
  }, []);
  
  // Fonction pour obtenir la première lettre du nom ou un fallback
  const getInitial = useMemo(() => {
    if (currentUser?.displayName) {
      return currentUser.displayName.charAt(0).toUpperCase();
    }
    if (currentUser?.email) {
      return currentUser.email.charAt(0).toUpperCase();
    }
    return 'U';
  }, [currentUser]);
  
  // Fonction pour obtenir le nom d'affichage ou un fallback
  const getDisplayName = useMemo(() => {
    return currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Utilisateur';
  }, [currentUser]);
  
  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        className="flex items-center space-x-2 text-gray-700 hover:text-blue-600 transition-colors"
        onClick={toggleDropdown}
        aria-expanded={isOpen}
        aria-label="Menu utilisateur"
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center text-white font-medium">
          {getInitial}
        </div>
        <span className="font-medium">{getDisplayName}</span>
        <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>
      
      {isOpen && (
        <div 
          className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10"
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="user-menu"
        >
          <Link 
            to="/profile" 
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            onClick={closeDropdown}
            role="menuitem"
          >
            Mon profil
          </Link>
          <Link 
            to="/dashboard" 
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            onClick={closeDropdown}
            role="menuitem"
          >
            Mes abonnements
          </Link>
          {isAdmin && (
            <Link 
              to="/admin/services" 
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              onClick={closeDropdown}
              role="menuitem"
            >
              Administration
            </Link>
          )}
          <button 
            onClick={() => {
              closeDropdown();
              handleLogout();
            }}
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            role="menuitem"
          >
            Déconnexion
          </button>
        </div>
      )}
    </div>
  );
});

// Composant principal de la barre de navigation
const Navbar = () => {
  const { currentUser, logout, isAdmin, isOnline } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);
  
  // Gérer le scroll pour ajouter une ombre à la navbar
  useEffect(() => {
    const handleScroll = () => {
      setHasScrolled(window.scrollY > 10);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Gestion de la déconnexion
  const handleLogout = useCallback(async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Erreur de déconnexion', error);
    }
  }, [logout, navigate]);

  // Détermine si un lien est actif - fonction mémorisée
  const isActive = useCallback((path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  }, [location.pathname]);

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

  // Fermer le menu mobile lors d'un changement de page
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);
  
  // Fermer le menu mobile lors d'un clic en dehors
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (mobileMenuOpen && !event.target.closest('.mobile-menu-container')) {
        setMobileMenuOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mobileMenuOpen]);

  return (
    <nav className={`bg-white ${hasScrolled ? 'shadow-md' : 'shadow-sm'} sticky top-0 z-50 transition-shadow duration-300`}>
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo et liens principaux */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center" aria-label="Accueil">
              <span className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                Abona
              </span>
            </Link>
            
            {/* Liens de navigation - version desktop */}
            <div className="hidden md:flex ml-10 space-x-4">
              {navLinks.map(link => (
                <NavLink 
                  key={link.to} 
                  to={link.to} 
                  label={link.label} 
                  isActive={isActive} 
                />
              ))}
            </div>
          </div>
          
          {/* Boutons de connexion / profil */}
          <div className="hidden md:flex items-center">
            {currentUser ? (
              <div className="flex items-center space-x-4">
                {!isOnline && (
                  <div className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                    Hors ligne
                  </div>
                )}
                <NotificationBell />
                <UserProfileDropdown 
                  currentUser={currentUser} 
                  isAdmin={isAdmin} 
                  handleLogout={handleLogout} 
                />
              </div>
            ) : (
              <AuthButtons />
            )}
          </div>
          
          {/* Bouton de menu mobile */}
          <div className="md:hidden mobile-menu-container">
            <button
              type="button"
              className="text-gray-700 hover:text-blue-600 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-expanded={mobileMenuOpen}
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
          </div>
        </div>
      </div>
      
      {/* Menu mobile */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white pt-2 pb-3 border-t border-gray-200 mobile-menu-container">
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
              >
                {link.label}
              </Link>
            ))}
            
            {currentUser ? (
              <button 
                onClick={handleLogout}
                className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-blue-50"
              >
                Déconnexion
              </button>
            ) : (
              <>
                <Link 
                  to="/login" 
                  className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-blue-50"
                >
                  Connexion
                </Link>
                <Link 
                  to="/register" 
                  className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-blue-50"
                >
                  Inscription
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;