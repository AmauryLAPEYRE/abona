import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { firestore } from '../../firebase';

const AdminServiceSubscriptions = () => {
  const { serviceId } = useParams();
  const navigate = useNavigate();
  
  const [service, setService] = useState(null);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredSubscriptions = subscriptions.filter(subscription => 
    subscription.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    subscription.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  useEffect(() => {
    const fetchServiceAndSubscriptions = async () => {
      try {
        // Récupérer les informations du service
        const serviceDoc = await firestore.collection('services').doc(serviceId).get();
        
        if (!serviceDoc.exists) {
          setError("Service non trouvé");
          setLoading(false);
          return;
        }
        
        setService({
          id: serviceDoc.id,
          ...serviceDoc.data()
        });
        
        // Récupérer les abonnements de ce service
        const subscriptionsSnapshot = await firestore
          .collection('services')
          .doc(serviceId)
          .collection('subscriptions')
          .get();
        
        const subscriptionsData = subscriptionsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          userCount: doc.data().users?.length || 0
        }));
        
        setSubscriptions(subscriptionsData);
        setLoading(false);
      } catch (err) {
        console.error("Erreur lors du chargement des données:", err);
        setError("Erreur lors du chargement des données");
        setLoading(false);
      }
    };
    
    fetchServiceAndSubscriptions();
  }, [serviceId]);
  
  const handleAddSubscription = () => {
    navigate(`/admin/services/${serviceId}/subscriptions/new`);
  };
  
  const handleDeleteSubscription = async (subscriptionId) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cet abonnement ? Les utilisateurs n'auront plus accès à ce service.")) {
      return;
    }
    
    try {
      setLoading(true);
      
      // Supprimer l'abonnement
      await firestore
        .collection('services')
        .doc(serviceId)
        .collection('subscriptions')
        .doc(subscriptionId)
        .delete();
      
      // Mettre à jour la liste locale
      setSubscriptions(subscriptions.filter(sub => sub.id !== subscriptionId));
      setLoading(false);
    } catch (err) {
      console.error("Erreur lors de la suppression:", err);
      setError("Erreur lors de la suppression de l'abonnement");
      setLoading(false);
    }
  };
  
  if (loading && !service) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
        <p className="font-bold">Erreur</p>
        <p>{error}</p>
        <div className="mt-4">
          <Link
            to="/admin/services"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            Retour aux services
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div>
      <div className="flex items-center mb-6">
        <button
          onClick={() => navigate('/admin/services')}
          className="mr-4 text-gray-500 hover:text-gray-700"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <h1 className="text-2xl font-bold text-gray-800">
          Abonnements {service?.name}
        </h1>
      </div>
      
      <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {service?.imageUrl ? (
                <img src={service.imageUrl} alt={service.name} className="w-12 h-12 rounded-lg mr-4 object-cover" />
              ) : (
                <div className="w-12 h-12 bg-white/20 rounded-lg mr-4 flex items-center justify-center text-white font-bold text-xl">
                  {service?.name.charAt(0)}
                </div>
              )}
              <div>
                <h2 className="text-2xl font-bold text-white">{service?.name}</h2>
                <p className="text-white/80">{service?.category || 'Aucune catégorie'}</p>
              </div>
            </div>
            
            <button
              onClick={handleAddSubscription}
              className="bg-white text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-lg font-medium flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Nouvel abonnement
            </button>
          </div>
          
          <p className="mt-4 text-white/90">{service?.description}</p>
          
          <div className="mt-6 grid grid-cols-3 gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <p className="text-white/70 text-sm">Utilisateurs par défaut</p>
              <p className="text-white text-xl font-bold">{service?.defaultMaxUsers || 'Non défini'}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <p className="text-white/70 text-sm">Prix par défaut</p>
              <p className="text-white text-xl font-bold">{service?.defaultPrice ? `${service.defaultPrice.toFixed(2)} €` : 'Non défini'}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <p className="text-white/70 text-sm">Durée par défaut</p>
              <p className="text-white text-xl font-bold">{service?.defaultDuration ? `${service.defaultDuration} jours` : 'Non défini'}</p>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          <div className="mb-6">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </div>
              <input
                type="text"
                className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 pr-3 py-2 border-gray-300 rounded-md"
                placeholder="Rechercher un abonnement..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          {filteredSubscriptions.length === 0 ? (
            <div className="text-center py-12">
              <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun abonnement trouvé</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm 
                  ? `Aucun résultat pour "${searchTerm}". Essayez avec d'autres termes.` 
                  : "Commencez par ajouter un nouvel abonnement pour ce service."}
              </p>
              {searchTerm ? (
                <button
                  className="mt-4 text-sm text-blue-600 hover:text-blue-500"
                  onClick={() => setSearchTerm('')}
                >
                  Effacer la recherche
                </button>
              ) : (
                <div className="mt-6">
                  <button
                    onClick={handleAddSubscription}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="-ml-1 mr-2 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                    Ajouter un abonnement
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSubscriptions.map(subscription => (
                <div 
                  key={subscription.id}
                  className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden"
                >
                  <div className={`${subscription.isActive ? 'bg-green-600' : 'bg-gray-600'} p-4`}>
                    <div className="flex justify-between items-start">
                      <h3 className="text-lg font-semibold text-white">{subscription.name || 'Abonnement sans nom'}</h3>
                      {subscription.isActive ? (
                        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">Actif</span>
                      ) : (
                        <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">Inactif</span>
                      )}
                    </div>
                    
                    <div className="mt-2 flex items-center">
                      <span className="text-white/80 text-sm mr-2">Type d'accès:</span>
                      {subscription.accessType === 'account' ? (
                        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                          Identifiants
                        </span>
                      ) : (
                        <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">
                          Invitation
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="p-4">
                    <div className="mb-4">
                      {subscription.accessType === 'account' ? (
                        <div className="space-y-2">
                          <div>
                            <p className="text-xs text-gray-500">Email</p>
                            <p className="text-gray-800 font-medium">{subscription.email}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Mot de passe</p>
                            <p className="text-gray-800 font-medium">{subscription.password}</p>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <p className="text-xs text-gray-500">Lien d'invitation</p>
                          <p className="text-blue-600 break-all text-sm">
                            {subscription.invitationLink}
                          </p>
                        </div>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div>
                        <p className="text-xs text-gray-500">Prix</p>
                        <p className="text-gray-800 font-medium">{subscription.price.toFixed(2)} €</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Durée</p>
                        <p className="text-gray-800 font-medium">{subscription.duration} jours</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Utilisateurs</p>
                        <p className="text-gray-800 font-medium">{subscription.userCount} / {subscription.maxUsers}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Expiration</p>
                        <p className="text-gray-800 font-medium">
                          {subscription.expiryDate?.toDate ? 
                            new Date(subscription.expiryDate.toDate()).toLocaleDateString() : 
                            'Non définie'
                          }
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <Link
                        to={`/admin/services/${serviceId}/subscriptions/${subscription.id}`}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Voir les détails
                      </Link>
                      
                      <div className="flex space-x-2">
                        <Link
                          to={`/admin/services/${serviceId}/subscriptions/edit/${subscription.id}`}
                          className="text-blue-600 hover:text-blue-900"
                          title="Modifier"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                          </svg>
                        </Link>
                        <button 
                          onClick={() => handleDeleteSubscription(subscription.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Supprimer"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminServiceSubscriptions;