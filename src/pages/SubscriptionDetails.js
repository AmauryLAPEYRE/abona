import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { firestore } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

const SubscriptionDetails = () => {
  const { id } = useParams();
  const { currentUser } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  
  // État pour simuler d'autres utilisateurs partageant cet abonnement
  const [otherUsers, setOtherUsers] = useState([]);
  
  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const subscriptionDoc = await firestore.collection('subscriptions').doc(id).get();
        
        if (!subscriptionDoc.exists) {
          setError("Abonnement non trouvé");
          setLoading(false);
          return;
        }
        
        const subscriptionData = subscriptionDoc.data();
        
        // Vérifier que l'abonnement appartient à l'utilisateur connecté
        if (subscriptionData.userId !== currentUser.uid) {
          setError("Vous n'avez pas accès à cet abonnement");
          setLoading(false);
          return;
        }
        
        setSubscription({
          id: subscriptionDoc.id,
          ...subscriptionData
        });
        
        // Générer des avatars aléatoires pour simuler les autres utilisateurs
        generateRandomUsers();
        
        setLoading(false);
      } catch (err) {
        setError("Erreur lors du chargement de l'abonnement");
        setLoading(false);
      }
    };
    
    fetchSubscription();
  }, [id, currentUser]);

  // Fonction pour générer des avatars aléatoires
  const generateRandomUsers = () => {
    const colors = ['bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-red-500', 'bg-indigo-500'];
    const names = ['Alex', 'Sam', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Jamie'];
    const count = Math.floor(Math.random() * 3) + 1; // Entre 1 et 3 autres utilisateurs
    
    const users = [];
    for (let i = 0; i < count; i++) {
      const colorIndex = Math.floor(Math.random() * colors.length);
      const nameIndex = Math.floor(Math.random() * names.length);
      users.push({
        id: i,
        name: names[nameIndex],
        color: colors[colorIndex],
        initial: names[nameIndex].charAt(0).toUpperCase()
      });
    }
    
    setOtherUsers(users);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-12 px-4 flex justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-12 px-4">
        <div className="max-w-lg mx-auto bg-white rounded-xl shadow-md overflow-hidden">
          <div className="p-8">
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
              <p className="font-bold">Erreur</p>
              <p>{error}</p>
            </div>
            <Link 
              to="/dashboard" 
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
            >
              Retour au tableau de bord
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
  if (!subscription) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-12 px-4 flex justify-center">
        <div className="text-center py-10">Abonnement non trouvé</div>
      </div>
    );
  }

  const isExpired = new Date() > new Date(subscription.expiryDate.toDate());

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-12 px-4">
      <div className="max-w-lg mx-auto">
        {/* Bloc principal */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-8">
          <div className={`${isExpired ? 'bg-gray-600' : 'bg-gradient-to-r from-blue-600 to-purple-600'} px-6 py-8 relative`}>
            <div className="flex justify-between items-start">
              <h1 className="text-2xl font-bold text-white">{subscription.serviceName}</h1>
              {isExpired ? (
                <span className="bg-red-500 text-white text-xs px-3 py-1 rounded-full">Expiré</span>
              ) : (
                <span className="bg-green-500 text-white text-xs px-3 py-1 rounded-full">Actif</span>
              )}
            </div>
            
            {!isExpired && (
              <div className="mt-4">
                <p className="text-white/80 text-sm mb-2">Cet abonnement est partagé avec:</p>
                <div className="flex items-center flex-wrap gap-2">
                  {/* Avatar de l'utilisateur actuel */}
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-white text-blue-700 flex items-center justify-center font-bold text-sm">
                      {currentUser.displayName ? currentUser.displayName.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <span className="ml-2 text-white text-sm">Vous</span>
                  </div>
                  
                  {/* Avatars des autres utilisateurs */}
                  {otherUsers.map((user) => (
                    <div key={user.id} className="flex items-center">
                      <div className={`w-8 h-8 rounded-full ${user.color} flex items-center justify-center font-bold text-sm text-white`}>
                        {user.initial}
                      </div>
                      <span className="ml-2 text-white text-sm">{user.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="p-6">
            <div className="mb-8">
              <h2 className="text-lg font-bold text-gray-800 mb-4">Informations d'accès</h2>
              
              <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-gray-800">{subscription.email}</p>
                    <button 
                      onClick={() => {navigator.clipboard.writeText(subscription.email)}}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Copier
                    </button>
                  </div>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">Mot de passe</p>
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-gray-800">{subscription.password}</p>
                    <button 
                      onClick={() => {navigator.clipboard.writeText(subscription.password)}}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Copier
                    </button>
                  </div>
                </div>
                
                {subscription.accessLink && (
                  <div>
                    <p className="text-sm text-gray-500">Lien d'accès</p>
                    <div className="flex items-center justify-between">
                      <a 
                        href={subscription.accessLink} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 break-all"
                      >
                        {subscription.accessLink}
                      </a>
                      <button 
                        onClick={() => {navigator.clipboard.writeText(subscription.accessLink)}}
                        className="text-blue-600 hover:text-blue-800 text-sm whitespace-nowrap ml-2"
                      >
                        Copier
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div>
              <h2 className="text-lg font-bold text-gray-800 mb-4">Détails de l'abonnement</h2>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Date de début</p>
                    <p className="font-medium text-gray-800">{new Date(subscription.startDate.toDate()).toLocaleDateString()}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-500">Date d'expiration</p>
                    <p className={`font-medium ${isExpired ? 'text-red-600' : 'text-gray-800'}`}>
                      {new Date(subscription.expiryDate.toDate()).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Boutons d'action */}
        <div className="flex justify-between">
          <Link 
            to="/dashboard" 
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Retour
          </Link>
          
          {isExpired ? (
            <button
              onClick={() => navigate(`/checkout/${subscription.serviceId}`)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
            >
              Renouveler l'abonnement
            </button>
          ) : (
            <button
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
              onClick={() => window.open(subscription.accessLink || `https://${subscription.serviceName.toLowerCase()}.com`, '_blank')}
            >
              Accéder au service
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubscriptionDetails;