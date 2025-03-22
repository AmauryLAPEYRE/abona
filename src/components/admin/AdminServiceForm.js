import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSubscriptions } from '../../contexts/SubscriptionContext';
import { firestore } from '../../firebase';

const AdminServiceForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addService, updateService } = useSubscriptions();
  
  // États pour les champs du formulaire
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('');
  const [category, setCategory] = useState('');
  
  // États pour la gestion du formulaire
  const [loading, setLoading] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  
  // États pour la validation des champs
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  
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
  
  // Marquer un champ comme "touché" lors de la modification
  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };
  
  // Valider un champ spécifique
  const validateField = useCallback((field, value) => {
    let error = '';
    
    switch (field) {
      case 'name':
        if (!value.trim()) {
          error = 'Le nom du service est requis';
        } else if (value.length < 2) {
          error = 'Le nom doit contenir au moins 2 caractères';
        } else if (value.length > 50) {
          error = 'Le nom ne doit pas dépasser 50 caractères';
        }
        break;
        
      case 'description':
        if (!value.trim()) {
          error = 'La description est requise';
        } else if (value.length < 10) {
          error = 'La description doit contenir au moins 10 caractères';
        }
        break;
        
      case 'imageUrl':
        if (value && !value.match(/^(https?:\/\/)?([\w\-])+\.{1}([a-zA-Z]{2,63})([\/\w-]*)*\/?\??([^#\n\r]*)?#?([^\n\r]*)$/)) {
          error = 'L\'URL de l\'image doit être valide';
        }
        break;
        
      case 'price':
        if (!value) {
          error = 'Le prix est requis';
        } else if (isNaN(parseFloat(value)) || parseFloat(value) < 0) {
          error = 'Le prix doit être un nombre positif';
        }
        break;
        
      case 'duration':
        if (!value) {
          error = 'La durée est requise';
        } else if (isNaN(parseInt(value)) || parseInt(value) < 1) {
          error = 'La durée doit être un nombre entier positif';
        }
        break;
        
      case 'category':
        if (!value) {
          error = 'La catégorie est requise';
        }
        break;
        
      default:
        break;
    }
    
    return error;
  }, []);
  
  // Valider tous les champs
  const validateForm = useCallback(() => {
    const newErrors = {
      name: validateField('name', name),
      description: validateField('description', description),
      imageUrl: validateField('imageUrl', imageUrl),
      price: validateField('price', price),
      duration: validateField('duration', duration),
      category: validateField('category', category)
    };
    
    setErrors(newErrors);
    
    // Le formulaire est valide si aucun champ n'a d'erreur
    return !Object.values(newErrors).some(error => error);
  }, [name, description, imageUrl, price, duration, category, validateField]);
  
  // Mettre à jour les erreurs lorsqu'un champ est modifié
  useEffect(() => {
    if (touched.name) setErrors(prev => ({ ...prev, name: validateField('name', name) }));
  }, [name, touched.name, validateField]);
  
  useEffect(() => {
    if (touched.description) setErrors(prev => ({ ...prev, description: validateField('description', description) }));
  }, [description, touched.description, validateField]);
  
  useEffect(() => {
    if (touched.imageUrl) setErrors(prev => ({ ...prev, imageUrl: validateField('imageUrl', imageUrl) }));
  }, [imageUrl, touched.imageUrl, validateField]);
  
  useEffect(() => {
    if (touched.price) setErrors(prev => ({ ...prev, price: validateField('price', price) }));
  }, [price, touched.price, validateField]);
  
  useEffect(() => {
    if (touched.duration) setErrors(prev => ({ ...prev, duration: validateField('duration', duration) }));
  }, [duration, touched.duration, validateField]);
  
  useEffect(() => {
    if (touched.category) setErrors(prev => ({ ...prev, category: validateField('category', category) }));
  }, [category, touched.category, validateField]);
  
  // Charger les données du service en mode édition
  useEffect(() => {
    if (id && id !== 'new') {
      setIsEdit(true);
      setLoading(true);
      
      const fetchService = async () => {
        try {
          const serviceDoc = await firestore.collection('services').doc(id).get();
          
          if (!serviceDoc.exists) {
            setErrors(prev => ({ ...prev, form: "Service non trouvé" }));
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
          console.error("Erreur lors du chargement du service:", err);
          setErrors(prev => ({ ...prev, form: "Erreur lors du chargement du service" }));
          setLoading(false);
        }
      };
      
      fetchService();
    }
  }, [id]);

  // Soumission du formulaire
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Marquer tous les champs comme touchés pour déclencher la validation
    setTouched({
      name: true,
      description: true,
      imageUrl: true,
      price: true,
      duration: true,
      category: true
    });
    
    // Valider le formulaire avant soumission
    const isValid = validateForm();
    
    if (!isValid) {
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
      setErrors({});
      
      if (isEdit) {
        await updateService(id, serviceData);
      } else {
        await addService(serviceData);
      }
      
      navigate('/admin/services');
    } catch (err) {
      console.error("Erreur lors de l'enregistrement:", err);
      setErrors(prev => ({ ...prev, form: `Erreur lors de l'enregistrement: ${err.message}` }));
      setLoading(false);
    }
  };

  // Affichage du message d'erreur sous un champ
  const ErrorMessage = ({ field }) => {
    if (!errors[field] || !touched[field]) return null;
    
    return (
      <p className="mt-1 text-sm text-red-600">{errors[field]}</p>
    );
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
      
      {errors.form && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
          <p className="font-bold">Erreur</p>
          <p>{errors.form}</p>
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
                className={`shadow-sm ${errors.name && touched.name ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'focus:ring-blue-500 focus:border-blue-500'} block w-full sm:text-sm border-gray-300 rounded-md`}
                placeholder="Ex: Netflix Premium"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => handleBlur('name')}
                required
              />
              <ErrorMessage field="name" />
            </div>
            
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                Catégorie <span className="text-red-500">*</span>
              </label>
              <select
                id="category"
                className={`shadow-sm ${errors.category && touched.category ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'focus:ring-blue-500 focus:border-blue-500'} block w-full sm:text-sm border-gray-300 rounded-md`}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                onBlur={() => handleBlur('category')}
                required
              >
                <option value="">Sélectionnez une catégorie</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <ErrorMessage field="category" />
            </div>
          </div>
          
          <div className="mb-6">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              id="description"
              rows={4}
              className={`shadow-sm ${errors.description && touched.description ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'focus:ring-blue-500 focus:border-blue-500'} block w-full sm:text-sm border-gray-300 rounded-md`}
              placeholder="Description détaillée du service"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={() => handleBlur('description')}
              required
            ></textarea>
            <ErrorMessage field="description" />
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
                  className={`${errors.price && touched.price ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'focus:ring-blue-500 focus:border-blue-500'} block w-full pl-3 pr-12 sm:text-sm border-gray-300 rounded-md`}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  onBlur={() => handleBlur('price')}
                  required
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">€</span>
                </div>
              </div>
              <ErrorMessage field="price" />
            </div>
            
            <div>
              <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-1">
                Durée (jours) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="duration"
                className={`shadow-sm ${errors.duration && touched.duration ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'focus:ring-blue-500 focus:border-blue-500'} block w-full sm:text-sm border-gray-300 rounded-md`}
                placeholder="30"
                min="1"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                onBlur={() => handleBlur('duration')}
                required
              />
              <ErrorMessage field="duration" />
            </div>
          </div>
          
          <div className="mb-6">
            <label htmlFor="imageUrl" className="block text-sm font-medium text-gray-700 mb-1">
              URL de l'image (optionnel)
            </label>
            <input
              type="url"
              id="imageUrl"
              className={`shadow-sm ${errors.imageUrl && touched.imageUrl ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'focus:ring-blue-500 focus:border-blue-500'} block w-full sm:text-sm border-gray-300 rounded-md`}
              placeholder="https://exemple.com/image.jpg"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              onBlur={() => handleBlur('imageUrl')}
            />
            <ErrorMessage field="imageUrl" />
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