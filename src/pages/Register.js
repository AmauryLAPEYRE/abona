import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useForm } from '../hooks/useForm';
import { translateErrorCode } from '../utils/errorUtils';

// Composant d'indicateur de force du mot de passe
const PasswordStrengthIndicator = React.memo(({ password }) => {
  // Calcul de la force du mot de passe
  const calculateStrength = (pwd) => {
    if (!pwd) return 0;
    
    let strength = 0;
    
    // Longueur (1-4 points)
    if (pwd.length >= 6) strength += 1;
    if (pwd.length >= 8) strength += 1;
    if (pwd.length >= 10) strength += 1;
    if (pwd.length >= 12) strength += 1;
    
    // Complexité (1 point chacun)
    if (/[0-9]/.test(pwd)) strength += 1; // Chiffres
    if (/[a-z]/.test(pwd)) strength += 1; // Minuscules
    if (/[A-Z]/.test(pwd)) strength += 1; // Majuscules
    if (/[^a-zA-Z0-9]/.test(pwd)) strength += 1; // Caractères spéciaux
    
    return Math.min(Math.floor((strength / 8) * 100), 100);
  };
  
  const strength = calculateStrength(password);
  
  // Déterminer la couleur et le texte en fonction de la force
  const getColorAndText = () => {
    if (strength < 30) return { color: 'bg-red-500', text: 'Faible' };
    if (strength < 60) return { color: 'bg-yellow-500', text: 'Moyen' };
    if (strength < 80) return { color: 'bg-blue-500', text: 'Bon' };
    return { color: 'bg-green-500', text: 'Fort' };
  };
  
  const { color, text } = getColorAndText();
  
  return (
    <div className="mt-1">
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className={`h-full ${color} transition-all duration-300 ease-in-out`} 
          style={{ width: `${strength}%` }}
        />
      </div>
      <p className="text-xs mt-1 text-gray-500">
        Force: <span className={`font-medium ${color.replace('bg-', 'text-')}`}>{text}</span>
      </p>
    </div>
  );
});

// Fonction de validation du formulaire d'inscription
const validateRegisterForm = (values, fieldName = null) => {
  const errors = {};
  
  // Si un champ spécifique est fourni, on ne valide que celui-là
  if (fieldName === 'name' || !fieldName) {
    if (!values.name?.trim()) {
      errors.name = 'Le nom est requis';
    }
  }
  
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
    } else if (values.password.length < 6) {
      errors.password = 'Le mot de passe doit contenir au moins 6 caractères';
    }
  }
  
  if (fieldName === 'confirmPassword' || !fieldName) {
    if (values.password !== values.confirmPassword) {
      errors.confirmPassword = 'Les mots de passe ne correspondent pas';
    }
  }
  
  return errors;
};

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState('');
  
  // Initialiser le formulaire avec notre hook personnalisé
  const {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    fieldHasError
  } = useForm(
    {
      name: '',
      email: '',
      password: '',
      confirmPassword: ''
    },
    validateRegisterForm
  );
  
  // Gestion de la soumission du formulaire
  const submitRegistration = async (formValues) => {
    try {
      setServerError('');
      await register(formValues.email, formValues.password, formValues.name);
      navigate('/dashboard');
    } catch (error) {
      console.error('Erreur d\'inscription:', error);
      setServerError(translateErrorCode(error.code) || error.message || 'Échec de la création du compte');
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
          <h1 className="text-center text-2xl font-bold text-white">Rejoignez Abona</h1>
        </div>
        
        <div className="p-6 sm:p-8">
          {serverError && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg relative mb-6">
              <span className="block sm:inline">{serverError}</span>
            </div>
          )}
          
          <form onSubmit={handleSubmit(submitRegistration)} className="space-y-5">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-white mb-2">
                Nom
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                value={values.name}
                onChange={handleChange}
                onBlur={handleBlur}
                className={getInputClasses('name')}
                placeholder="Votre nom"
              />
              <ErrorMessage name="name" />
            </div>

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
                autoComplete="new-password"
                required
                value={values.password}
                onChange={handleChange}
                onBlur={handleBlur}
                className={getInputClasses('password')}
                placeholder="••••••••"
              />
              <ErrorMessage name="password" />
              <PasswordStrengthIndicator password={values.password} />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-white mb-2">
                Confirmer le mot de passe
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={values.confirmPassword}
                onChange={handleChange}
                onBlur={handleBlur}
                className={getInputClasses('confirmPassword')}
                placeholder="••••••••"
              />
              <ErrorMessage name="confirmPassword" />
            </div>

            <div className="flex items-center">
              <input
                id="terms"
                name="terms"
                type="checkbox"
                required
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="terms" className="ml-2 block text-sm text-white">
                J'accepte les{' '}
                <Link to="/terms" className="text-blue-400 hover:text-blue-300">
                  conditions d'utilisation
                </Link>{' '}
                et la{' '}
                <Link to="/privacy" className="text-blue-400 hover:text-blue-300">
                  politique de confidentialité
                </Link>
              </label>
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
                    Création en cours...
                  </>
                ) : "Créer un compte"}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-white/70">
              Déjà un compte ?{' '}
              <Link to="/login" className="font-medium text-blue-400 hover:text-blue-300">
                Connectez-vous
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

export default Register;