import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isEdit, setIsEdit] = useState(false);
  
  useEffect(() => {
    if (id && id !== 'new') {
      setIsEdit(true);
      
      const fetchService = async () => {
        try {
          const serviceDoc = await firestore.collection('services').doc(id).get();
          
          if (!serviceDoc.exists) {
            setError("Service non trouvé");
            return;
          }
          
          const serviceData = serviceDoc.data();
          setName(serviceData.name);
          setDescription(serviceData.description);
          setImageUrl(serviceData.imageUrl || '');
          setPrice(serviceData.price.toString());
          setDuration(serviceData.duration.toString());
        } catch (err) {
          setError("Erreur lors du chargement du service");
        }
      };
      
      fetchService();
    }
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!name || !description || !price || !duration) {
      setError("Tous les champs obligatoires doivent être remplis");
      return;
    }
    
    const serviceData = {
      name,
      description,
      imageUrl: imageUrl || null,
      price: parseFloat(price),
      duration: parseInt(duration)
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

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">
        {isEdit ? 'Modifier le service' : 'Ajouter un service'}
      </h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name">
            Nom du service *
          </label>
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="name"
            type="text"
            placeholder="Ex: Netflix Premium"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="description">
            Description *
          </label>
          <textarea
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="description"
            placeholder="Description du service"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows="3"
            required
          ></textarea>
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="imageUrl">
            URL de l'image (optionnel)
          </label>
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="imageUrl"
            type="url"
            placeholder="https://example.com/image.jpg"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="price">
            Prix (€) *
          </label>
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="price"
            type="number"
            step="0.01"
            min="0"
            placeholder="9.99"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
          />
        </div>
        
        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="duration">
            Durée (jours) *
          </label>
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="duration"
            type="number"
            min="1"
            placeholder="30"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            required
          />
        </div>
        
        <div className="flex items-center justify-between">
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          >
            {loading ? 'Enregistrement...' : (isEdit ? 'Mettre à jour' : 'Ajouter')}
          </button>
          <button
            type="button"
            onClick={() => navigate('/admin/services')}
            className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          >
            Annuler
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdminServiceForm;