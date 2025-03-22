import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useForm } from '../hooks/useForm';
import { translateErrorCode } from '../utils/errorUtils';

// Fonction de validation spécifique à la connexion
const validateLoginForm = (values, fieldName = null) => {
  const errors = {};
  
  // Si on spécifie un champ, on ne valide que celui-là
  if (fieldName === 'email' || !fieldName) {
    if (!values.email) {
      errors.email = 'L\'email est requis';
    } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(values.email)) {
      errors.email = 'L\'adresse email est invalide';
    }
  }
  
  if (fieldName === 'password' || !fieldName) {
    if (!values.password) {
      errors.password = 'Le mot de passe est requis';
    }
  }
  
  return errors;
};

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState('');
  
  // URL de redirection après connexion réussie
  const redirectPath = location.state?.redirect || '/dashboard';
  
  // Initialisation du formulaire avec notre hook personnalisé
  const {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    fieldHasError,
    setValues
  } = useForm(
    {
      email: '',
      password: '',
      rememberMe: false
    },
    validateLoginForm
  );
  
  // Charge l'email mémorisé au chargement
  useEffect(() => {
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail) {
      setValues(prev => ({
        ...prev,
        email: rememberedEmail,
        rememberMe: true
      }));
    }
  }, [setValues]);
  
  // Gestion de la soumission du formulaire
  const submitLogin = async (formValues) => {
    try {
      setServerError('');
      await login(formValues.email, formValues.password);
      
      // Enregistrer l'email si "Se souvenir de moi" est coché
      if (formValues.rememberMe) {
        localStorage.setItem('rememberedEmail', formValues.email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }
      
      navigate(redirectPath);
    } catch (error) {
      console.error('Erreur de connexion:', error);
      setServerError(translateErrorCode(error.code) || error.message || 'Échec de la connexion');
    }
  };
  
  // Classes pour les champs de formulaire
  const getInputClasses = (name) => {
    return `appearance-none bg-white/5 border ${
      fieldHasError(name) 
        ? 'border-red-500 focus:ring-red-500' 
        : 'border-white/10 focus:ring-blue-500'
    } rounded-lg w-full py-3 px-4 text-white leading-tight focus:outline-none focus:ring-2 focus:border-transparent`;
  };
  
  // Afficher un message d'erreur pour un champ
  const ErrorMessage = ({ name }) => {
    if (!errors[name] || !touched[name]) return null;
    return <p className="mt-1 text-sm text-red-600">{errors[name]}</p>;
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
          
          <form onSubmit={handleSubmit(submitLogin)} className="space-y-6">
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
                value={values.email}
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
                value={values.password}
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
                  checked={values.rememberMe}
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
                disabled={isSubmitting}
                className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors ${
                  isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {isSubmitting ? (
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