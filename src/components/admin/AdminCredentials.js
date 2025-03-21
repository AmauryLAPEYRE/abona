import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { firestore } from '../../firebase';
import { useSubscriptions } from '../../contexts/SubscriptionContext';

const AdminCredentials = () => {
  const { serviceId } = useParams();
  const navigate = useNavigate();
  const { services, addSubscriptionCredentials } = useSubscriptions();
  
  const [credentials, setCredentials] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accessLink, setAccessLink] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  
  // Filtrer les identifiants en fonction du terme de recherche
  const filteredCredentials = credentials.filter(credential => 
    credential.email.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  useEffect(() => {
    const loadData = async () => {
      try {
        if (serviceId) {
          const service = services.find(s => s.id === serviceId);
          setSelectedService(service);
          
          // Charger les identifiants pour ce service
          const credentialsSnapshot = await firestore
            .collection('services')
            .doc(serviceId)
            .collection('credentials')
            .get();
          
          const credentialsData = credentialsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          setCredentials(credentialsData);
        }
        
        setLoading(false);
      } catch (err) {
        setError("Erreur lors du chargement des données");
        setLoading(false);
      }
    };
    
    loadData();
  }, [serviceId, services]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError("L'email et le mot de passe sont obligatoires");
      return;
    }
    
    if (!selectedService) {
      setError("Veuillez sélectionner un service");
      return;
    }
    
    const credentialData = {
      email,
      password,
      accessLink: accessLink || null,
      inUse: false,
      createdAt: new Date()
    };
    
    try {
      setFormSubmitting(true);
      setError(null);
      
      await addSubscriptionCredentials(selectedService.id, credentialData);
      
      // Rafraîchir la liste des identifiants
      const credentialsSnapshot = await firestore
        .collection('services')
        .doc(selectedService.id)
        .collection('credentials')
        .get();
      
      const credentialsData = credentialsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setCredentials(credentialsData);
      
      // Réinitialiser le formulaire
      setEmail('');
      setPassword('');
      setAccessLink('');
      
      // Afficher un message de succès
      setSuccessMessage("Identifiants ajoutés avec succès");
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (err) {
      setError(`Erreur lors de l'ajout des identifiants: ${err.message}`);
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteCredential = async (credentialId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ces identifiants ?')) {
      return;
    }
    
    try {
      setLoading(true);
      await firestore
        .collection('services')
        .doc(selectedService.id)
        .collection('credentials')
        .doc(credentialId)
        .delete();
      
      // Mettre à jour la liste locale
      setCredentials(credentials.filter(cred => cred.id !== credentialId));
      setSuccessMessage("Identifiants supprimés avec succès");
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (err) {
      setError(`Erreur lors de la suppression: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !selectedService) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Si aucun service n'est sélectionné, afficher la liste des services
  if (!selectedService && !serviceId) {
    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Gestion des identifiants</h1>
        </div>
        
        <div className="bg-white shadow rounded-lg">
          <div className="p-6">
            <p className="mb-4 text-gray-700">Sélectionnez un service pour gérer ses identifiants de connexion :</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {services.map(service => (
                <div 
                  key={service.id}
                  className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden"
                >
                  <div className="p-4">
                    <div className="flex items-center mb-3">
                      {service.imageUrl ? (
                        <img src={service.imageUrl} alt={service.name} className="w-10 h-10 rounded mr-3" />
                      ) : (
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded flex items-center justify-center text-white font-bold">
                          {service.name.charAt(0)}
                        </div>
                      )}
                      <h3 className="text-lg font-semibold text-gray-800">{service.name}</h3>
                    </div>
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">{service.description}</p>
                    <Link 
                      to={`/admin/credentials/${service.id}`}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                      </svg>
                      Gérer les identifiants
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <button
            onClick={() => navigate('/admin/credentials')}
            className="mr-4 text-gray-500 hover:text-gray-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <h1 className="text-2xl font-bold text-gray-800">
            Identifiants pour {selectedService ? selectedService.name : 'le service'}
          </h1>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
          <p className="font-bold">Erreur</p>
          <p>{error}</p>
        </div>
      )}
      
      {successMessage && (
        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-6" role="alert">
          <p>{successMessage}</p>
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulaire d'ajout */}
        <div className="bg-white shadow rounded-lg overflow-hidden lg:col-span-1">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
            <h2 className="text-lg font-semibold text-white">Ajouter des identifiants</h2>
          </div>
          
          <form onSubmit={handleSubmit} className="p-6">
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  placeholder="utilisateur@exemple.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Mot de passe <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="password"
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  placeholder="mot_de_passe"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              
              <div>
                <label htmlFor="accessLink" className="block text-sm font-medium text-gray-700 mb-1">
                  Lien d'accès (optionnel)
                </label>
                <input
                  type="url"
                  id="accessLink"
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  placeholder="https://exemple.com/access"
                  value={accessLink}
                  onChange={(e) => setAccessLink(e.target.value)}
                />
              </div>
            </div>
            
            <div className="mt-6">
              <button
                type="submit"
                disabled={formSubmitting}
                className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {formSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Ajout en cours...
                  </>
                ) : (
                  'Ajouter ces identifiants'
                )}
              </button>
            </div>
          </form>
        </div>
        
        {/* Liste des identifiants */}
        <div className="bg-white shadow rounded-lg overflow-hidden lg:col-span-2">
          <div className="bg-gradient-to-r from-gray-700 to-gray-800 px-6 py-4 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-white">Identifiants existants</h2>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </div>
              <input
                type="text"
                className="bg-gray-600 bg-opacity-50 focus:bg-gray-700 text-white placeholder-gray-400 pl-10 pr-4 py-2 rounded-lg text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          {loading ? (
            <div className="p-6 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              <p className="mt-2 text-gray-600">Chargement des identifiants...</p>
            </div>
          ) : filteredCredentials.length === 0 ? (
            <div className="p-6 text-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun identifiant trouvé</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm 
                  ? `Aucun résultat pour "${searchTerm}". Essayez avec d'autres termes.` 
                  : "Commencez par ajouter de nouveaux identifiants pour ce service."}
              </p>
              {searchTerm && (
                <button
                  className="mt-4 text-sm text-blue-600 hover:text-blue-500"
                  onClick={() => setSearchTerm('')}
                >
                  Effacer la recherche
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Mot de passe
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Lien d'accès
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredCredentials.map(credential => (
                    <tr key={credential.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{credential.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{credential.password}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {credential.accessLink ? (
                          <a 
                            href={credential.accessLink} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-900 text-sm"
                          >
                            {credential.accessLink.substring(0, 30)}
                            {credential.accessLink.length > 30 ? '...' : ''}
                          </a>
                        ) : (
                          <span className="text-sm text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {credential.inUse ? (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                            Utilisé
                          </span>
                        ) : (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            Disponible
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleDeleteCredential(credential.id)}
                          className="text-red-600 hover:text-red-900"
                          disabled={credential.inUse}
                          title={credential.inUse ? "Impossible de supprimer des identifiants en cours d'utilisation" : "Supprimer"}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminCredentials;