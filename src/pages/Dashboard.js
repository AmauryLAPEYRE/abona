import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSubscriptions } from '../contexts/SubscriptionContext';
import { useAuth } from '../contexts/AuthContext';

const Dashboard = () => {
  const { userSubscriptions, loading } = useSubscriptions();
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('active');
  
  // Filtrer les abonnements actifs et expirés
  const activeSubscriptions = userSubscriptions.filter(sub => {
    const isExpired = new Date() > new Date(sub.expiryDate.toDate());
    return !isExpired;
  });
  
  const expiredSubscriptions = userSubscriptions.filter(sub => {
    const isExpired = new Date() > new Date(sub.expiryDate.toDate());
    return isExpired;
  });

  // Fonction pour générer des avatars aléatoires pour simuler d'autres utilisateurs
  const generateRandomAvatars = (count) => {
    const colors = ['bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-red-500', 'bg-indigo-500'];
    const avatars = [];
    
    for (let i = 0; i < count; i++) {
      const colorIndex = Math.floor(Math.random() * colors.length);
      avatars.push({
        color: colors[colorIndex],
        initial: String.fromCharCode(65 + Math.floor(Math.random() * 26))
      });
    }
    
    return avatars;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-b from-gray-50 to-gray-100 min-h-screen pb-12">
      <div className="bg-gradient-to-r from-blue-700 to-purple-800 text-white">
        <div className="container mx-auto px-4 py-12">
          <h1 className="text-3xl font-bold">Mes abonnements</h1>
          <p className="mt-2 opacity-80">Gérez vos abonnements et vos accès partagés</p>
        </div>
      </div>

      <div className="container mx-auto px-4 -mt-6">
        {/* Onglets */}
        <div className="bg-white rounded-t-xl shadow-md p-4 flex justify-center space-x-4">
          <button
            className={`px-4 py-2 font-medium rounded-lg transition-colors ${
              activeTab === 'active' 
                ? 'bg-blue-100 text-blue-800' 
                : 'text-gray-500 hover:bg-gray-100'
            }`}
            onClick={() => setActiveTab('active')}
          >
            Abonnements actifs
            <span className="ml-2 px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">
              {activeSubscriptions.length}
            </span>
          </button>
          <button
            className={`px-4 py-2 font-medium rounded-lg transition-colors ${
              activeTab === 'expired' 
                ? 'bg-blue-100 text-blue-800' 
                : 'text-gray-500 hover:bg-gray-100'
            }`}
            onClick={() => setActiveTab('expired')}
          >
            Abonnements expirés
            <span className="ml-2 px-2 py-0.5 bg-gray-600 text-white text-xs rounded-full">
              {expiredSubscriptions.length}
            </span>
          </button>
        </div>

        {/* Contenu principal */}
        <div className="bg-white rounded-b-xl shadow-md p-6 mb-8">
          {activeTab === 'active' && (
            <>
              {activeSubscriptions.length === 0 ? (
                <div className="text-center py-12">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  <h3 className="text-xl font-medium text-gray-700 mb-2">Aucun abonnement actif</h3>
                  <p className="text-gray-500 mb-6">Vous n'avez pas encore d'abonnements actifs.</p>
                  <Link to="/" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors">
                    Découvrir les services
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {activeSubscriptions.map(subscription => {
                    // Générer entre 1 et 4 avatars aléatoires pour simuler les autres utilisateurs
                    const userCount = Math.floor(Math.random() * 4) + 1;
                    const otherUsers = generateRandomAvatars(userCount);
                    
                    return (
                      <div 
                        key={subscription.id} 
                        className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                      >
                        <div className="bg-gradient-to-r from-blue-600 to-purple-700 p-6 relative">
                          <div className="flex items-center justify-between">
                            <h3 className="text-xl font-bold text-white">{subscription.serviceName}</h3>
                            <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">Actif</span>
                          </div>
                          
                          {/* Affichage des utilisateurs partageant cet abonnement */}
                          <div className="mt-4">
                            <p className="text-white/80 text-sm mb-2">Partagé avec:</p>
                            <div className="flex -space-x-2">
                              {/* Avatar de l'utilisateur actuel */}
                              <div className="w-8 h-8 rounded-full bg-white text-blue-700 flex items-center justify-center font-bold text-sm ring-2 ring-white">
                                {currentUser.displayName ? currentUser.displayName.charAt(0).toUpperCase() : 'U'}
                              </div>
                              
                              {/* Avatars des autres utilisateurs */}
                              {otherUsers.map((user, index) => (
                                <div 
                                  key={index} 
                                  className={`w-8 h-8 rounded-full ${user.color} flex items-center justify-center font-bold text-sm text-white ring-2 ring-white`}
                                >
                                  {user.initial}
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          <div className="absolute bottom-2 right-2 text-white/50 text-xs">
                            {userCount + 1}/{userCount + 2} utilisateurs
                          </div>
                        </div>
                        
                        <div className="p-6">
                          <div className="space-y-3 mb-4">
                            <div>
                              <p className="text-sm text-gray-500">Email d'accès</p>
                              <p className="font-medium">{subscription.email}</p>
                            </div>
                            
                            <div>
                              <p className="text-sm text-gray-500">Mot de passe</p>
                              <p className="font-medium">{subscription.password}</p>
                            </div>
                            
                            {subscription.accessLink && (
                              <div>
                                <p className="text-sm text-gray-500">Lien d'accès</p>
                                <a 
                                  href={subscription.accessLink} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 break-all"
                                >
                                  {subscription.accessLink}
                                </a>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="text-sm text-gray-500">
                              Expire le {new Date(subscription.expiryDate.toDate()).toLocaleDateString()}
                            </div>
                            <Link
                              to={`/subscription/${subscription.id}`}
                              className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                            >
                              Détails
                            </Link>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
          
          {activeTab === 'expired' && (
            <>
              {expiredSubscriptions.length === 0 ? (
                <div className="text-center py-12">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="text-xl font-medium text-gray-700 mb-2">Aucun abonnement expiré</h3>
                  <p className="text-gray-500">Tous vos abonnements sont encore actifs.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {expiredSubscriptions.map(subscription => (
                    <div 
                      key={subscription.id} 
                      className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow opacity-70"
                    >
                      <div className="bg-gray-600 p-6">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xl font-bold text-white">{subscription.serviceName}</h3>
                          <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">Expiré</span>
                        </div>
                      </div>
                      
                      <div className="p-6">
                        <div className="space-y-3 mb-4">
                          <div>
                            <p className="text-sm text-gray-500">Email d'accès</p>
                            <p className="font-medium">{subscription.email}</p>
                          </div>
                          
                          <div>
                            <p className="text-sm text-gray-500">Mot de passe</p>
                            <p className="font-medium">{subscription.password}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-red-500">
                            Expiré le {new Date(subscription.expiryDate.toDate()).toLocaleDateString()}
                          </div>
                          <button
                            className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1 rounded-lg transition-colors"
                          >
                            Renouveler
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;