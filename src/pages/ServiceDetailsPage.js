import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { firestore } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useSubscriptions } from '../contexts/SubscriptionContext';

const ServiceDetailsPage = () => {
  const { serviceId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { getAvailableSubscriptions, calculateProRatedPrice } = useSubscriptions();
  
  const [service, setService] = useState(null);
  const [subscriptions, setSubscriptions] = useState([]);
  const [selectedSubscription, setSelectedSubscription] = useState(null);
  const [customDuration, setCustomDuration] = useState(14);
  const [isRecurring, setIsRecurring] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Récupérer les informations du service
        const serviceDoc = await firestore.collection('services').doc(serviceId).get();
        
        if (!serviceDoc.exists) {
          setError("Service non trouvé");
          setLoading(false);
          return;
        }
        
        const serviceData = {
          id: serviceDoc.id,
          ...serviceDoc.data()
        };
        
        setService(serviceData);
        
        // Récupérer les abonnements disponibles
        const availableSubs = await getAvailableSubscriptions(serviceId);
        setSubscriptions(availableSubs);
        
        if (availableSubs.length > 0) {
          setSelectedSubscription(availableSubs[0]);
        }
        
        setLoading(false);
      } catch (err) {
        console.error("Erreur lors du chargement des données:", err);
        setError("Erreur lors du chargement des données");
        setLoading(false);
      }
    };
    
    fetchData();
  }, [serviceId, getAvailableSubscriptions]);
  
  const handleSubscribe = () => {
    if (!currentUser) {
      navigate('/login', { state: { redirect: `/service/${serviceId}` } });
      return;
    }
    
    if (!selectedSubscription) {
      setError("Veuillez sélectionner un abonnement");
      return;
    }
    
    const duration = isRecurring ? 30 : customDuration; // 30 jours pour l'abonnement récurrent
    navigate(`/checkout/${serviceId}/${selectedSubscription.id}?duration=${duration}&recurring=${isRecurring}`);
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
        <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-md overflow-hidden">
          <div className="p-8">
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
              <p className="font-bold">Erreur</p>
              <p>{error}</p>
            </div>
            <Link 
              to="/services" 
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
            >
              Retour aux services
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
  if (!service) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-12 px-4 flex justify-center">
        <div className="text-center py-10">Service non trouvé</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <Link to="/services" className="text-blue-600 hover:text-blue-800 font-medium inline-flex items-center mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Retour aux services
        </Link>
        
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="md:flex">
            <div className="md:w-1/2">
              <div className="h-64 md:h-full bg-gradient-to-r from-blue-600 to-purple-600 p-6 flex items-center justify-center">
                {service.imageUrl ? (
                  <img src={service.imageUrl} alt={service.name} className="max-h-full object-contain" />
                ) : (
                  <div className="text-6xl font-bold text-white">{service.name.charAt(0)}</div>
                )}
              </div>
            </div>
            
            <div className="md:w-1/2 p-8">
              <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-800 mb-2">{service.name}</h1>
                
                {service.category && (
                  <div className="mb-4">
                    <span className="px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                      {service.category}
                    </span>
                  </div>
                )}
                
                <p className="text-gray-600 mb-6">{service.description}</p>
                
                <div className="border-t border-gray-200 pt-6">
                  <h2 className="text-xl font-bold text-gray-800 mb-4">Choisissez votre abonnement</h2>
                  
                  {subscriptions.length === 0 ? (
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm text-yellow-700">
                            Aucun abonnement disponible pour le moment.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="space-y-4 mb-6">
                        {subscriptions.map(subscription => (
                          <div 
                            key={subscription.id}
                            className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                              selectedSubscription?.id === subscription.id 
                                ? 'border-blue-500 bg-blue-50' 
                                : 'border-gray-200 hover:border-blue-300'
                            }`}
                            onClick={() => setSelectedSubscription(subscription)}
                          >
                            <div className="flex justify-between items-center">
                              <div>
                                <h3 className="font-medium text-gray-800">{subscription.name}</h3>
                                <p className="text-sm text-gray-500 mt-1">
                                  {subscription.accessType === 'account' 
                                    ? 'Accès via identifiants' 
                                    : 'Accès via lien d\'invitation'}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-lg font-bold text-blue-600">{subscription.price.toFixed(2)} €</p>
                                <p className="text-xs text-gray-500">prix mensuel</p>
                              </div>
                            </div>
                            
                            <div className="mt-2 flex justify-between items-center text-sm">
                              <span className="text-gray-600">
                                {subscription.currentUsers} / {subscription.maxUsers} utilisateurs
                              </span>
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                {subscription.maxUsers - subscription.currentUsers} places disponibles
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Options de durée */}
                      <div className="mb-6 border-t border-gray-200 pt-4">
                        <h3 className="text-md font-bold text-gray-800 mb-4">Choisissez votre type d'abonnement</h3>
                        
                        <div className="flex flex-col space-y-4">
                          {/* Option d'abonnement récurrent */}
                          <div className="flex items-center">
                            <input
                              id="recurring"
                              name="subscription-type"
                              type="radio"
                              checked={isRecurring}
                              onChange={() => setIsRecurring(true)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                            />
                            <label htmlFor="recurring" className="ml-2 block text-sm font-medium text-gray-700">
                              Abonnement mensuel récurrent
                            </label>
                          </div>
                          
                          {/* Option de durée unique */}
                          <div className="flex items-center">
                            <input
                              id="one-time"
                              name="subscription-type"
                              type="radio"
                              checked={!isRecurring}
                              onChange={() => setIsRecurring(false)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                            />
                            <label htmlFor="one-time" className="ml-2 block text-sm font-medium text-gray-700">
                              Durée unique
                            </label>
                          </div>
                          
                          {/* Afficher le slider de durée uniquement si "Durée unique" est sélectionnée */}
                          {!isRecurring && (
                            <div className="mt-2 pl-6">
                              <label htmlFor="custom-duration" className="block text-sm font-medium text-gray-700 mb-2">
                                Choisissez votre durée (2-30 jours)
                              </label>
                              <div className="flex items-center">
                                <input
                                  type="range"
                                  id="custom-duration"
                                  min="2"
                                  max="30"
                                  value={customDuration}
                                  onChange={(e) => setCustomDuration(parseInt(e.target.value))}
                                  className="w-full mr-4"
                                />
                                <span className="text-sm font-medium">{customDuration} jours</span>
                              </div>
                            </div>
                          )}
                          
                          {/* Affichage du prix */}
                          <div className="bg-blue-50 p-3 rounded-lg mt-4">
                            {isRecurring ? (
                              <div className="flex justify-between">
                                <span className="text-gray-700">Abonnement mensuel:</span>
                                <span className="font-bold text-blue-600">
                                  {selectedSubscription?.price.toFixed(2)} € / mois
                                </span>
                              </div>
                            ) : (
                              <>
                                <div className="flex justify-between">
                                  <span className="text-gray-700">Prix mensuel:</span>
                                  <span className="font-medium">{selectedSubscription?.price.toFixed(2)} €</span>
                                </div>
                                <div className="flex justify-between mt-1">
                                  <span className="text-gray-700">Prix pour {customDuration} jours:</span>
                                  <span className="font-bold text-blue-600">
                                    {calculateProRatedPrice(selectedSubscription?.price || 0, customDuration)} €
                                  </span>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <button
                        onClick={handleSubscribe}
                        disabled={!selectedSubscription}
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isRecurring ? "S'abonner mensuellement" : "Acheter pour " + customDuration + " jours"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Autres informations supplémentaires */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center mb-4">
              <div className="bg-blue-100 p-2 rounded-md">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="ml-3 text-lg font-medium text-gray-800">Accès sécurisé</h3>
            </div>
            <p className="text-gray-600">
              Tous nos comptes sont légitimes et régulièrement vérifiés. Vos identifiants sont cryptés et protégés.
            </p>
          </div>
          
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center mb-4">
              <div className="bg-green-100 p-2 rounded-md">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="ml-3 text-lg font-medium text-gray-800">Support 24/7</h3>
            </div>
            <p className="text-gray-600">
              Notre équipe support est disponible 24/7 pour vous aider en cas de problème avec vos accès.
            </p>
          </div>
          
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center mb-4">
              <div className="bg-purple-100 p-2 rounded-md">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="ml-3 text-lg font-medium text-gray-800">Durée flexible</h3>
            </div>
            <p className="text-gray-600">
              Choisissez exactement la durée d'abonnement qui vous convient, de 2 jours à 3 mois, avec un prix automatiquement ajusté.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceDetailsPage;