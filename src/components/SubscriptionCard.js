import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Composant pour afficher l'avatar d'un utilisateur
const UserAvatar = ({ initial, color, label = null, ring = true }) => (
  <div className="flex items-center">
    <div 
      className={`w-8 h-8 rounded-full ${color} flex items-center justify-center font-bold text-sm ${
        ring ? 'ring-2 ring-white' : ''
      }`}
    >
      {initial}
    </div>
    {label && <span className="ml-2 text-white text-sm">{label}</span>}
  </div>
);

// Composant pour afficher un champ d'information
const InfoField = ({ label, value, isCopyable = false, isLink = false }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!value) return;
    
    navigator.clipboard.writeText(value)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(err => {
        console.error('Erreur lors de la copie :', err);
      });
  };

  return (
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <div className="flex items-center justify-between flex-wrap gap-2">
        {isLink ? (
          <a 
            href={value} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 break-all hover:underline mr-2"
          >
            {value}
          </a>
        ) : (
          <p className="font-medium break-all mr-2">{value}</p>
        )}
        
        {isCopyable && (
          <button 
            onClick={handleCopy}
            className="text-blue-600 hover:text-blue-800 text-sm flex items-center whitespace-nowrap"
          >
            {copied ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Copié
              </>
            ) : "Copier"}
          </button>
        )}
      </div>
    </div>
  );
};

const SubscriptionCard = ({ 
  subscription, 
  showDetails = true, 
  className = "", 
  isCompact = false,
  renderActions 
}) => {
  const { currentUser } = useAuth();
  const isExpired = new Date() > new Date(subscription.expiryDate.toDate());
  
  // Génération des avatars aléatoires pour les autres utilisateurs
  const otherUsers = useMemo(() => {
    const colors = ['bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-red-500', 'bg-indigo-500'];
    const users = [];
    
    // Entre 1 et 3 autres utilisateurs aléatoires
    const count = Math.floor(Math.random() * 3) + 1;
    
    for (let i = 0; i < count; i++) {
      const colorIndex = Math.floor(Math.random() * colors.length);
      users.push({
        color: colors[colorIndex],
        initial: String.fromCharCode(65 + Math.floor(Math.random() * 26)),
        id: i
      });
    }
    
    return users;
  }, [subscription.id]); // Dépendance à l'ID pour être stable pour un abonnement donné
  
  // Style de la carte basé sur l'état de l'abonnement
  const cardStyle = isExpired 
    ? 'opacity-80' 
    : 'hover:shadow-lg';
  
  // Style de l'en-tête basé sur l'état de l'abonnement
  const headerStyle = isExpired 
    ? 'bg-gray-600' 
    : 'bg-gradient-to-r from-blue-600 to-purple-700';
  
  // Rendu du badge d'état
  const StatusBadge = () => (
    isExpired 
      ? <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">Expiré</span>
      : <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">Actif</span>
  );

  // Formatage de la date en français
  const formatDate = (date) => {
    if (!date) return '';
    
    try {
      return new Date(date instanceof Date ? date : date.toDate()).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short', 
        year: 'numeric'
      });
    } catch (e) {
      return 'Date invalide';
    }
  };
  
  // Rendu par défaut pour les actions
  const defaultActions = () => (
    <div className="flex justify-between items-center">
      <div className={`text-sm ${isExpired ? 'text-red-500' : 'text-gray-500'}`}>
        {isExpired ? 'Expiré le ' : 'Expire le '}
        {formatDate(subscription.expiryDate)}
      </div>
      
      {isExpired ? (
        <Link
          to={`/service/${subscription.serviceId}`}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1 rounded-lg transition-colors"
        >
          Renouveler
        </Link>
      ) : (
        <Link
          to={`/subscription/${subscription.id}`}
          className="text-blue-600 hover:text-blue-800 font-medium text-sm"
        >
          Détails
        </Link>
      )}
    </div>
  );
  
  return (
    <div className={`bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm transition-all duration-300 ${cardStyle} ${className}`}>
      <div className={`p-4 sm:p-6 ${headerStyle}`}>
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-xl font-bold text-white">{subscription.serviceName}</h3>
            {subscription.subscriptionName && (
              <p className="text-white/80 text-sm mt-1">{subscription.subscriptionName}</p>
            )}
          </div>
          <StatusBadge />
        </div>
        
        {!isExpired && !isCompact && (
          <div className="mt-4">
            <p className="text-white/80 text-sm mb-2">Partagé avec :</p>
            <div className="flex -space-x-2">
              {/* Avatar de l'utilisateur actuel */}
              <UserAvatar 
                initial={currentUser?.displayName ? currentUser.displayName.charAt(0).toUpperCase() : 'U'}
                color="bg-white text-blue-700"
              />
              
              {/* Avatars des autres utilisateurs */}
              {otherUsers.map(user => (
                <UserAvatar
                  key={user.id}
                  initial={user.initial}
                  color={`${user.color} text-white`}
                />
              ))}
            </div>
          </div>
        )}
      </div>
      
      <div className="p-4 sm:p-6">
        {showDetails && (
          <div className="space-y-3 mb-4">
            {subscription.accessType === 'account' ? (
              <>
                {subscription.email && (
                  <InfoField 
                    label="Email d'accès" 
                    value={subscription.email} 
                    isCopyable 
                  />
                )}
                
                {subscription.password && (
                  <InfoField 
                    label="Mot de passe" 
                    value={subscription.password} 
                    isCopyable 
                  />
                )}
              </>
            ) : (
              <>
                {subscription.invitationLink && (
                  <InfoField 
                    label="Lien d'invitation" 
                    value={subscription.invitationLink} 
                    isCopyable 
                    isLink 
                  />
                )}
              </>
            )}

            {subscription.accessLink && (
              <InfoField 
                label="Lien d'accès" 
                value={subscription.accessLink} 
                isCopyable 
                isLink 
              />
            )}
          </div>
        )}
        
        {renderActions ? renderActions(subscription) : defaultActions()}
      </div>
    </div>
  );
};

export default SubscriptionCard;