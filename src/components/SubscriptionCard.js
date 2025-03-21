import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const SubscriptionCard = ({ subscription }) => {
  const { currentUser } = useAuth();
  const isExpired = new Date() > new Date(subscription.expiryDate.toDate());
  
  // Générer des avatars aléatoires pour simuler les autres utilisateurs partageant l'abonnement
  const generateRandomUsers = (count = 3) => {
    const colors = ['bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-red-500', 'bg-indigo-500'];
    const users = [];
    
    for (let i = 0; i < count; i++) {
      const colorIndex = Math.floor(Math.random() * colors.length);
      users.push({
        color: colors[colorIndex],
        initial: String.fromCharCode(65 + Math.floor(Math.random() * 26))
      });
    }
    
    return users;
  };
  
  // Entre 1 et 4 autres utilisateurs aléatoires
  const otherUsers = generateRandomUsers(Math.floor(Math.random() * 4) + 1);
  const totalUsers = otherUsers.length + 1; // +1 pour l'utilisateur actuel
  const maxUsers = totalUsers + 1; // Capacité maximale (+1)
  
  return (
    <div className={`bg-white rounded-xl shadow-md overflow-hidden transition-all duration-300 ${isExpired ? 'opacity-70' : 'hover:shadow-lg'}`}>
      <div className={`p-6 ${isExpired ? 'bg-gray-600' : 'bg-gradient-to-r from-blue-600 to-purple-700'}`}>
        <div className="flex justify-between items-start">
          <h3 className="text-xl font-bold text-white">{subscription.serviceName}</h3>
          {isExpired ? (
            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">Expiré</span>
          ) : (
            <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">Actif</span>
          )}
        </div>
        
        {!isExpired && (
          <div className="mt-4">
            <p className="text-white/80 text-sm mb-2">Partagé avec :</p>
            <div className="flex -space-x-2">
              {/* Avatar de l'utilisateur actuel */}
              <div className="w-8 h-8 rounded-full bg-white text-blue-700 flex items-center justify-center font-bold text-sm ring-2 ring-white">
                {currentUser?.displayName ? currentUser.displayName.charAt(0).toUpperCase() : 'U'}
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
            
            <div className="mt-2 text-white/70 text-xs">
              {totalUsers}/{maxUsers} membres
            </div>
          </div>
        )}
      </div>
      
      <div className="p-6">
        <div className="space-y-3 mb-4">
          <div>
            <p className="text-sm text-gray-500">Email</p>
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
                className="text-blue-600 break-all hover:underline"
              >
                {subscription.accessLink}
              </a>
            </div>
          )}
        </div>
        
        <div className="flex justify-between items-center">
          <div className={`text-sm ${isExpired ? 'text-red-500' : 'text-gray-500'}`}>
            {isExpired ? 'Expiré le ' : 'Expire le '}
            {new Date(subscription.expiryDate.toDate()).toLocaleDateString()}
          </div>
          
          {isExpired ? (
            <button className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1 rounded transition-colors">
              Renouveler
            </button>
          ) : (
            <Link
              to={`/subscription/${subscription.id}`}
              className="bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm px-3 py-1 rounded transition-colors"
            >
              Détails
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubscriptionCard;