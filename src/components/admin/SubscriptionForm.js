import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { firestore } from '../../firebase';
import { DISCOUNT_RATE, MAX_DURATION_DAYS } from '../../constants';
import { calculateDiscountedMonthly, calculatePrice } from '../../pricing';

const SubscriptionForm = () => {
  const { serviceId, subscriptionId } = useParams();
  const navigate = useNavigate();
  const isEditMode = subscriptionId && subscriptionId !== 'new';

  // États pour le service parent
  const [service, setService] = useState(null);

  // États pour le formulaire
  const [name, setName] = useState('');
  const [accessType, setAccessType] = useState('account');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [invitationLink, setInvitationLink] = useState('');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('');
  const [maxUsers, setMaxUsers] = useState('');
  const [isActive, setIsActive] = useState(true);

  // États pour le chargement et les erreurs
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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

        // Définir les valeurs par défaut à partir du service
        if (!isEditMode) {
          setPrice(serviceData.defaultPrice?.toString() || '');
          setDuration(serviceData.defaultDuration?.toString() || '');
          setMaxUsers(serviceData.defaultMaxUsers?.toString() || '');
        }

        // Si en mode édition, récupérer les données de l'abonnement
        if (isEditMode) {
          const subscriptionDoc = await firestore
            .collection('services')
            .doc(serviceId)
            .collection('subscriptions')
            .doc(subscriptionId)
            .get();

          if (!subscriptionDoc.exists) {
            setError("Abonnement non trouvé");
            setLoading(false);
            return;
          }

          const subscriptionData = subscriptionDoc.data();

          setName(subscriptionData.name || '');
          setAccessType(subscriptionData.accessType || 'account');
          setEmail(subscriptionData.email || '');
          setPassword(subscriptionData.password || '');
          setInvitationLink(subscriptionData.invitationLink || '');
          setPrice(subscriptionData.price?.toString() || '');
          setDuration(subscriptionData.duration?.toString() || '');
          setMaxUsers(subscriptionData.maxUsers?.toString() || '');
          setIsActive(subscriptionData.isActive !== false); // Par défaut actif si non spécifié
        }

        setLoading(false);
      } catch (err) {
        console.error("Erreur lors du chargement des données:", err);
        setError("Erreur lors du chargement des données");
        setLoading(false);
      }
    };

    fetchData();
  }, [serviceId, subscriptionId, isEditMode]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation des champs requis
    if (!name) {
      setError("Veuillez saisir un nom pour l'abonnement");
      return;
    }

    if (accessType === 'account' && (!email || !password)) {
      setError("Email et mot de passe sont requis pour un abonnement de type 'identifiants'");
      return;
    }

    if (accessType === 'invitation' && !invitationLink) {
      setError("Le lien d'invitation est requis pour un abonnement de type 'invitation'");
      return;
    }

    if (!price || !duration || !maxUsers) {
      setError("Prix, durée et nombre maximum d'utilisateurs sont requis");
      return;
    }

    const subscriptionData = {
      name,
      accessType,
      email: accessType === 'account' ? email : null,
      password: accessType === 'account' ? password : null,
      invitationLink: accessType === 'invitation' ? invitationLink : null,
      price: parseFloat(price),
      duration: parseInt(duration),
      maxUsers: parseInt(maxUsers),
      isActive,
      currentUsers: 0, // Par défaut pour un nouvel abonnement
      users: [], // Par défaut pour un nouvel abonnement
      updatedAt: new Date()
    };

    // Si c'est un nouvel abonnement, ajoutez ces champs
    if (!isEditMode) {
      subscriptionData.createdAt = new Date();
      subscriptionData.expiryDate = new Date(Date.now() + parseInt(duration) * 24 * 60 * 60 * 1000);
    }

    try {
      setSaving(true);

      if (isEditMode) {
        // Mettre à jour l'abonnement existant
        await firestore
          .collection('services')
          .doc(serviceId)
          .collection('subscriptions')
          .doc(subscriptionId)
          .update(subscriptionData);
      } else {
        // Créer un nouvel abonnement
        await firestore
          .collection('services')
          .doc(serviceId)
          .collection('subscriptions')
          .add(subscriptionData);
      }

      // Rediriger vers la liste des abonnements
      navigate(`/admin/services/${serviceId}/subscriptions`);
    } catch (err) {
      console.error("Erreur lors de l'enregistrement:", err);
      setError("Erreur lors de l'enregistrement de l'abonnement");
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error && !service) {
    return (
      <div className="glass-alert-error p-4 mb-6" role="alert">
        <p className="font-bold">Erreur</p>
        <p>{error}</p>
        <div className="mt-4">
          <Link
            to="/admin/services"
            className="btn-primary"
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
          onClick={() => navigate(`/admin/services/${serviceId}/subscriptions`)}
          className="mr-4 text-white/50 hover:text-white"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <h1 className="text-2xl font-bold text-white">
          {isEditMode ? 'Modifier l\'abonnement' : 'Ajouter un abonnement'} - {service?.name}
        </h1>
      </div>

      {error && (
        <div className="glass-alert-error p-4 mb-6" role="alert">
          <p className="font-bold">Erreur</p>
          <p>{error}</p>
        </div>
      )}

      <div className="glass-card overflow-hidden">
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-white/80 mb-1">
                Nom de l'abonnement <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                id="name"
                className="glass-input"
                placeholder="ex: Netflix Premium 4K"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div>
              <label htmlFor="accessType" className="block text-sm font-medium text-white/80 mb-1">
                Type d'accès <span className="text-red-400">*</span>
              </label>
              <select
                id="accessType"
                className="glass-input"
                value={accessType}
                onChange={(e) => setAccessType(e.target.value)}
                required
              >
                <option value="account">Identifiants (email/mot de passe)</option>
                <option value="invitation">Lien d'invitation</option>
              </select>
            </div>
          </div>

          {accessType === 'account' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-white/80 mb-1">
                  Email <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  className="glass-input"
                  placeholder="exemple@service.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required={accessType === 'account'}
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-white/80 mb-1">
                  Mot de passe <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  id="password"
                  className="glass-input"
                  placeholder="mot_de_passe_sécurisé"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required={accessType === 'account'}
                />
              </div>
            </div>
          ) : (
            <div className="mb-6">
              <label htmlFor="invitationLink" className="block text-sm font-medium text-white/80 mb-1">
                Lien d'invitation <span className="text-red-400">*</span>
              </label>
              <input
                type="url"
                id="invitationLink"
                className="glass-input"
                placeholder="https://service.com/invitation/abcdef"
                value={invitationLink}
                onChange={(e) => setInvitationLink(e.target.value)}
                required={accessType === 'invitation'}
              />
            </div>
          )}

          <div>
            <label htmlFor="price" className="block text-sm font-medium text-white/80 mb-1">
                Prix mensuel officiel (€) <span className="text-red-400">*</span>
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
                <input
                type="number"
                id="price"
                className="glass-input pl-3 pr-12"
                placeholder="0.00"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <span className="text-white/50 sm:text-sm">€ / mois</span>
                </div>
            </div>
            {price && parseFloat(price) > 0 && (
              <p className="mt-1 text-xs text-green-400 font-medium">
                Prix Abona : {calculateDiscountedMonthly(parseFloat(price)).toFixed(2)} €/mois (-{DISCOUNT_RATE * 100}%) | {MAX_DURATION_DAYS}j = {calculatePrice(parseFloat(price), MAX_DURATION_DAYS).toFixed(2)} €
              </p>
            )}
            <p className="mt-1 text-xs text-white/50">
                Entrez le prix officiel du service. La réduction de {DISCOUNT_RATE * 100}% et le prorata (max {MAX_DURATION_DAYS} jours) sont appliqués automatiquement.
            </p>
            </div>

            <div>
            <label htmlFor="maxUsers" className="block text-sm font-medium text-white/80 mb-1">
                Nombre max d'utilisateurs <span className="text-red-400">*</span>
            </label>
            <input
                type="number"
                id="maxUsers"
                className="glass-input"
                placeholder="5"
                min="1"
                value={maxUsers}
                onChange={(e) => setMaxUsers(e.target.value)}
                required
            />
            <p className="mt-1 text-xs text-white/50">
                Suggestion: {service?.defaultMaxUsers ? service.defaultMaxUsers : 'Non défini'}
            </p>
        </div>

          <div className="mb-6">
            <div className="flex items-center">
              <input
                id="isActive"
                name="isActive"
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-white/20 bg-white/10 rounded"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              <label htmlFor="isActive" className="ml-2 block text-sm text-white/80">
                Abonnement actif
              </label>
            </div>
            <p className="mt-1 text-xs text-white/50">
              Les abonnements inactifs ne seront pas disponibles pour les utilisateurs
            </p>
          </div>

          <div className="border-t border-white/10 pt-6 flex justify-between">
            <Link
              to={`/admin/services/${serviceId}/subscriptions`}
              className="btn-secondary"
            >
              Annuler
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {isEditMode ? 'Mise à jour...' : 'Création...'}
                </>
              ) : (
                isEditMode ? 'Mettre à jour' : 'Créer l\'abonnement'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SubscriptionForm;
