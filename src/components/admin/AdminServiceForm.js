import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSubscriptions } from '../../contexts/SubscriptionContext';
import { firestore } from '../../firebase';

const AdminServiceForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addService, updateService } = useSubscriptions();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isEdit, setIsEdit] = useState(false);
  
  // Catégories disponibles
  const categories = [
    'Streaming',
    'Musique',
    'Productivité',
    'Sécurité',
    'Cloud',
    'Éducation',
    'Autre'
  ];
  
  useEffect(() => {
    if (id && id !== 'new') {
      setIsEdit(true);
      setLoading(true);
      
      const fetchService = async () => {
        try {
          const serviceDoc = await firestore.collection('services').doc(id).get();
          
          if (!serviceDoc.exists) {
            setError("Service non trouvé");
            setLoading(false);
            return;
          }
          
          const serviceData = serviceDoc.data();
          setName(serviceData.name);
          setDescription(serviceData.description);
          setImageUrl(serviceData.imageUrl || '');
          setPrice(serviceData.price.toString());
          setDuration(serviceData.duration.toString());
          setCategory(serviceData.category || 'Autre');
          setLoading(false);
        } catch (err) {
          setError("Erreur lors du chargement du service");
          setLoading(false);
        }
      };
      
      fetchService();
    }
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!name || !description || !price || !duration || !category) {
      setError("Tous les champs obligatoires doivent être remplis");
      return;
    }
    
    const serviceData = {
      name,
      description,
      imageUrl: imageUrl || null,
      price: parseFloat(price),
      duration: parseInt(duration),
      category
    };
    
    try {
      setLoading(true);
      
      if (isEdit) {
        await updateService(id, serviceData);
      } else {
        await addService(serviceData);
      }
      
      navigate('/admin/services');
    } catch (err) {
      setError(`Erreur lors de l'enregistrement: ${err.message}`);
      setLoading(false);
    }
  };

  if (loading && isEdit) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          {isEdit ? 'Modifier le service' : 'Ajouter un service'}
        </h1>
      </div>
      
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
          <p className="font-bold">Erreur</p>
          <p>{error}</p>
        </div>
      )}
      
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Nom du service <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                placeholder="Ex: Netflix Premium"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                Catégorie <span className="text-red-500">*</span>
              </label>
              <select
                id="category"
                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
              >
                <option value="">Sélectionnez une catégorie</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="mb-6">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              id="description"
              rows={4}
              className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
              placeholder="Description détaillée du service"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            ></textarea>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
                Prix (€) <span className="text-red-500">*</span>
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <input
                  type="number"
                  id="price"
                  className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-3 pr-12 sm:text-sm border-gray-300 rounded-md"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">€</span>
                </div>
              </div>
            </div>
            
            <div>
              <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-1">
                Durée (jours) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="duration"
                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                placeholder="30"
                min="1"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                required
              />
            </div>
          </div>
          
          <div className="mb-6">
            <label htmlFor="imageUrl" className="block text-sm font-medium text-gray-700 mb-1">
              URL de l'image (optionnel)
            </label>
            <input
              type="url"
              id="imageUrl"
              className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
              placeholder="https://exemple.com/image.jpg"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
            />
            <p className="mt-1 text-sm text-gray-500">
              Laissez vide pour utiliser une icône générée automatiquement
            </p>
          </div>
          
          <div className="border-t border-gray-200 pt-6 flex justify-between">
            <Link
              to="/admin/services"
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Annuler
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {isEdit ? 'Mise à jour...' : 'Création...'}
                </>
              ) : (
                isEdit ? 'Mettre à jour' : 'Créer le service'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminServiceForm;