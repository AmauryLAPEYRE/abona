import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSubscriptions } from '../../contexts/SubscriptionContext';

const AdminServices = () => {
  const { services, loading, deleteService } = useSubscriptions();
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const handleDelete = async (serviceId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce service ?')) {
      return;
    }
    
    try {
      setDeleteLoading(true);
      await deleteService(serviceId);
      setError(null);
    } catch (err) {
      setError(`Erreur lors de la suppression: ${err.message}`);
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-10">Chargement des services...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Gestion des services</h2>
        <Link 
          to="/admin/services/new" 
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          Ajouter un service
        </Link>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
          {error}
        </div>
      )}
      
      {services.length === 0 ? (
        <p>Aucun service disponible.</p>
      ) : (
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Nom
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Prix
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Durée
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {services.map(service => (
                <tr key={service.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{service.name}</div>
                    <div className="text-sm text-gray-500">{service.description}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{service.price.toFixed(2)} €</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{service.duration} jours</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <Link 
                        to={`/admin/credentials/${service.id}`} 
                        className="text-purple-600 hover:text-purple-900"
                      >
                        Identifiants
                      </Link>
                      <Link 
                        to={`/admin/services/edit/${service.id}`} 
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Modifier
                      </Link>
                      <button 
                        onClick={() => handleDelete(service.id)}
                        disabled={deleteLoading}
                        className="text-red-600 hover:text-red-900"
                      >
                        Supprimer
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminServices;