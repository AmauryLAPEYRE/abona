import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import NotificationBell from './NotificationBell';

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
              ? 'text-white'
              : 'text-white/80 hover:text-white'
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
              ? 'text-white bg-white/10'
              : 'text-white/80 hover:text-white hover:bg-white/10'
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
          className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-white/80 hover:text-white hover:bg-white/10"
        >
          Déconnexion
        </button>
      ) : (
        <>
          <Link
            to="/login"
            className="block px-3 py-2 rounded-md text-base font-medium text-white/80 hover:text-white hover:bg-white/10"
            onClick={() => setMobileMenuOpen(false)}
          >
            Connexion
          </Link>
          <Link
            to="/register"
            className="block px-3 py-2 rounded-md text-base font-medium text-white/80 hover:text-white hover:bg-white/10"
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
          className="flex items-center space-x-2 text-white/80 hover:text-white transition-colors"
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
            className="glass-dropdown"
          >
            <Link
              to="/profile"
              className="glass-dropdown-item"
              onClick={() => setIsOpen(false)}
            >
              Mon profil
            </Link>
            <Link
              to="/dashboard"
              className="glass-dropdown-item"
              onClick={() => setIsOpen(false)}
            >
              Mes abonnements
            </Link>
            {isAdmin && (
              <Link
                to="/admin/services"
                className="glass-dropdown-item"
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
              className="glass-dropdown-item w-full text-left"
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
        className="px-4 py-2 text-sm font-medium text-white hover:text-white/80 transition-colors"
      >
        Connexion
      </Link>
      <Link
        to="/register"
        className="btn-primary px-4 py-2 text-sm font-medium"
      >
        Inscription
      </Link>
    </div>
  );

  // Bouton de basculement du menu mobile
  const MobileMenuToggle = () => (
    <button
      type="button"
      className="text-white/80 hover:text-white transition-colors"
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

  return (
    <nav className="bg-white/80 backdrop-blur-md shadow-sm">
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
        <div className="md:hidden bg-white/10 backdrop-blur-xl border-t border-white/10 pt-2 pb-3">
          <MobileNavLinks />
        </div>
      )}
    </nav>
  );
};

export default Navbar;
