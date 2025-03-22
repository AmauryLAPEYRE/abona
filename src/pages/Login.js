import React, { useState, useCallback, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Login = () => {
  // Utilisation d'un état unique pour le formulaire
  const [formState, setFormState] = useState({
    email: '',
    password: '',
    rememberMe: false
  });
  const [touched, setTouched] = useState({});
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Récupérer l'URL de redirection si elle existe
  const redirectPath = location.state?.redirect || '/dashboard';

  // Gestionnaire générique pour les changements de champ
  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setFormState(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  }, []);
  
  // Marquer un champ comme touché lorsqu'il perd le focus
  const handleBlur = useCallback((e) => {
    const { name } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
  }, []);
  
  // Validation du formulaire
  const validateForm = useCallback(() => {
    const newErrors = {};
    
    // Valider l'email
    if (!formState.email) {
      newErrors.email = 'L\'email est requis';
    } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(formState.email)) {
      newErrors.email = 'L\'adresse email est invalide';
    }
    
    // Valider le mot de passe
    if (!formState.password) {
      newErrors.password = 'Le mot de passe est requis';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formState]);
  
  // Valider les champs individuels lorsqu'ils changent
  useEffect(() => {
    // Pour chaque champ qui a été touché, valider et mettre à jour les erreurs
    if (touched.email) {
      let emailError = '';
      if (!formState.email) {
        emailError = 'L\'email est requis';
      } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(formState.email)) {
        emailError = 'L\'adresse email est invalide';
      }
      setErrors(prev => ({ ...prev, email: emailError }));
    }
    
    if (touched.password) {
      const passwordError = !formState.password ? 'Le mot de passe est requis' : '';
      setErrors(prev => ({ ...prev, password: passwordError }));
    }
  }, [formState, touched]);
  
  // Soumettre le formulaire
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Marquer tous les champs comme touchés pour déclencher la validation
    setTouched({
      email: true,
      password: true
    });
    
    // Valider le formulaire
    const isValid = validateForm();
    
    if (!isValid) {
      return;
    }
    
    setServerError('');
    setLoading(true);
    
    try {
      await login(formState.email, formState.password);
      
      // Enregistrer l'email dans le stockage local si "Se souvenir de moi" est coché
      if (formState.rememberMe) {
        localStorage.setItem('rememberedEmail', formState.email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }
      
      // Rediriger vers la page demandée ou le tableau de bord
      navigate(redirectPath);
    } catch (error) {
      console.error('Erreur de connexion:', error);
      
      // Messages d'erreur spécifiques
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        setServerError('Email ou mot de passe incorrect.');
      } else if (error.code === 'auth/too-many-requests') {
        setServerError('Trop de tentatives de connexion. Veuillez réessayer plus tard.');
      } else if (error.code === 'auth/user-disabled') {
        setServerError('Ce compte a été désactivé. Veuillez contacter le support.');
      } else {
        setServerError(error.message || 'Échec de la connexion. Veuillez réessayer.');
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Charger l'email enregistré au montage du composant
  useEffect(() => {
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail) {
      setFormState(prev => ({
        ...prev,
        email: rememberedEmail,
        rememberMe: true
      }));
    }
  }, []);
  
  // Afficher un message d'erreur pour un champ
  const ErrorMessage = ({ name }) => {
    if (!errors[name] || !touched[name]) return null;
    
    return (
      <p className="mt-1 text-sm text-red-600">{errors[name]}</p>
    );
  };
  
  // Déterminer si un champ a une erreur
  const fieldHasError = (name) => {
    return touched[name] && errors[name];
  };
  
  // Classes pour les champs de formulaire
  const getInputClasses = (name) => {
    return `appearance-none bg-white/5 border ${
      fieldHasError(name) 
        ? 'border-red-500 focus:ring-red-500' 
        : 'border-white/10 focus:ring-blue-500'
    } rounded-lg w-full py-3 px-4 text-white leading-tight focus:outline-none focus:ring-2 focus:border-transparent`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-blue-900 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="max-w-md w-full bg-white/10 backdrop-blur-md rounded-xl shadow-xl overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 py-6">
          <h1 className="text-center text-2xl font-bold text-white">Connexion à Abona</h1>
        </div>
        
        <div className="p-6 sm:p-8">
          {serverError && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg relative mb-6">
              <span className="block sm:inline">{serverError}</span>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-white mb-2">
                Adresse e-mail
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formState.email}
                onChange={handleChange}
                onBlur={handleBlur}
                className={getInputClasses('email')}
                placeholder="votre@email.com"
              />
              <ErrorMessage name="email" />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-white mb-2">
                Mot de passe
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={formState.password}
                onChange={handleChange}
                onBlur={handleBlur}
                className={getInputClasses('password')}
                placeholder="••••••••"
              />
              <ErrorMessage name="password" />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="rememberMe"
                  name="rememberMe"
                  type="checkbox"
                  checked={formState.rememberMe}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="rememberMe" className="ml-2 block text-sm text-white">
                  Se souvenir de moi
                </label>
              </div>

              <div className="text-sm">
                <Link to="/reset-password" className="font-medium text-blue-400 hover:text-blue-300">
                  Mot de passe oublié ?
                </Link>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors ${
                  loading ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Connexion en cours...
                  </>
                ) : "Se connecter"}
              </button>
            </div>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-white/70">
              Pas encore de compte ?{' '}
              <Link to="/register" className="font-medium text-blue-400 hover:text-blue-300">
                Inscrivez-vous
              </Link>
            </p>
          </div>
          
          <div className="mt-6 border-t border-white/10 pt-6 text-center">
            <Link to="/" className="inline-flex items-center text-sm text-white/70 hover:text-white">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Retour à l'accueil
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;