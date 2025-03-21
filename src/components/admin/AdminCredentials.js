import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { firestore } from '../../firebase';
import { useSubscriptions } from '../../contexts/SubscriptionContext';

const AdminCredentials = () => {
  const { serviceId } = useParams();
  const { services, addSubscriptionCredentials } = useSubscriptions();
  
  const [credentials, setCredentials] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accessLink, setAccessLink] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  
  useEffect(() => {
    if (serviceId) {
      const service = services.find(s => s.id === serviceId);
      setSelectedService(service);
      
      // Charger les identifiants pour ce service
      const fetchCredentials = async () => {
        try {
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
          setLoading(false);
        } catch (err) {
          setError("Erreur lors du chargement des identifiants");
          setLoading(false);
        }
      };
      
      fetchCredentials();
    } else {
      setLoading(false);
    }
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
      setError(null);
    } catch (err) {
      setError(`Erreur lors de l'ajout des identifiants: ${err.message}`);
    } finally {
      setFormSubmitting(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">
        {selectedService 
          ? `Identifiants pour ${selectedService.name}` 
          : 'Gestion des identifiants'}
      </h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
          {error}
        </div>
      )}
      
      {!selectedService && !loading && (
        <div className="mb-6">
          <p className="mb-4">Sélectionnez un service pour gérer ses identifiants :</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {services.map(service => (
              <Link 
                key={service.id}
                to={`/admin/credentials/${service.id}`}
                className="bg-white shadow-md p-4 rounded-lg hover:shadow-lg"
              >
                <h3 className="font-bold mb-1">{service.name}</h3>
                <p className="text-sm text-gray-600">{service.description}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
      
      {selectedService && (
        <>
          <div className="bg-white shadow-md rounded-lg p-6 mb-6">
            <h3 className="text-xl font-bold mb-4">Ajouter des identifiants</h3>
            
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
                    Email *
                  </label>
                  <input
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    id="email"
                    type="email"
                    placeholder="utilisateur@exemple.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
                    Mot de passe *
                  </label>
                  <input
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    id="password"
                    type="text"
                    placeholder="mot_de_passe"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="accessLink">
                    Lien d'accès (optionnel)
                  </label>
                  <input
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    id="accessLink"
                    type="url"
                    placeholder="https://exemple.com/access"
                    value={accessLink}
                    onChange={(e) => setAccessLink(e.target.value)}
                  />
                </div>
              </div>
              
              <button
                type="submit"
                disabled={formSubmitting}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              >
                {formSubmitting ? 'Ajout...' : 'Ajouter'}
              </button>
            </form>
          </div>
          
          <div className="bg-white shadow-md rounded-lg overflow-hidden">
            <h3 className="text-xl font-bold p-6 border-b">Identifiants existants</h3>
            
            {loading ? (
              <div className="p-6 text-center">Chargement des identifiants...</div>
            ) : credentials.length === 0 ? (
              <div className="p-6 text-center">Aucun identifiant trouvé pour ce service.</div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th 
                      scope="col" 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Email
                    </th>
                    <th 
                      scope="col" 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Mot de passe
                    </th>
                    <th 
                      scope="col" 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Lien
                    </th>
                    <th 
                      scope="col" 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Statut
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {credentials.map(credential => (
                    <tr key={credential.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{credential.email}</div>
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
                            className="text-blue-600 text-sm"
                          >
                            Lien
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
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default AdminCredentials;