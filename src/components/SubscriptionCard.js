import React from 'react';
import { Link } from 'react-router-dom';

const SubscriptionCard = ({ subscription }) => {
  const isExpired = new Date() > new Date(subscription.expiryDate.toDate());
  
  return (
    <div className={`bg-white shadow-md rounded-lg overflow-hidden ${isExpired ? 'opacity-75' : ''}`}>
      <div className="p-4">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-xl font-bold">{subscription.serviceName}</h3>
          {isExpired ? (
            <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">Expiré</span>
          ) : (
            <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">Actif</span>
          )}
        </div>
        
        <div className="space-y-2 mb-4">
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
                className="text-blue-600 text-sm break-all"
              >
                {subscription.accessLink}
              </a>
            </div>
          )}
        </div>
        
        <div className="text-sm text-gray-500">
          Expire le {new Date(subscription.expiryDate.toDate()).toLocaleDateString()}
        </div>
        
        <Link
          to={`/subscription/${subscription.id}`}
          className="block text-center mt-4 bg-gray-100 text-gray-800 py-2 rounded-lg font-medium hover:bg-gray-200"
        >
          Détails
        </Link>
      </div>
    </div>
  );
};

export default SubscriptionCard;