import { useState, useCallback, useEffect } from 'react';

/**
 * Hook personnalisé pour gérer les formulaires avec validation
 * @param {Object} initialValues - Valeurs initiales du formulaire
 * @param {Function} validate - Fonction de validation qui renvoie des erreurs
 * @returns {Object} - État et méthodes pour gérer le formulaire
 */
export const useForm = (initialValues, validate) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Gestion du changement de valeur d'un champ
  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setValues(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  }, []);

  // Marque un champ comme touché lors de la perte de focus
  const handleBlur = useCallback((e) => {
    const { name } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
  }, []);

  // Valide le formulaire complet
  const validateForm = useCallback(() => {
    if (typeof validate !== 'function') return true;
    
    const newErrors = validate(values);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [values, validate]);

  // Valide les champs individuels quand ils changent
  useEffect(() => {
    if (typeof validate !== 'function') return;
    
    // On ne valide que les champs qui ont été touchés
    const touchedFields = Object.keys(touched).filter(key => touched[key]);
    if (touchedFields.length === 0) return;
    
    // Valider chaque champ touché individuellement
    const newErrors = {};
    touchedFields.forEach(field => {
      // On passe le nom du champ pour validation ciblée
      const fieldErrors = validate(values, field);
      if (fieldErrors[field]) {
        newErrors[field] = fieldErrors[field];
      }
    });
    
    setErrors(prev => ({
      ...prev,
      ...newErrors
    }));
  }, [values, touched, validate]);

  // Gestionnaire de soumission du formulaire
  const handleSubmit = useCallback((onSubmit) => {
    return async (e) => {
      e.preventDefault();
      
      // Marquer tous les champs comme touchés
      const allTouched = Object.keys(values).reduce((obj, field) => {
        obj[field] = true;
        return obj;
      }, {});
      setTouched(allTouched);
      
      const isValid = validateForm();
      if (!isValid) return;
      
      setIsSubmitting(true);
      
      try {
        await onSubmit(values);
      } finally {
        setIsSubmitting(false);
      }
    };
  }, [values, validateForm]);

  // Vérifie si un champ a une erreur
  const fieldHasError = useCallback((name) => {
    return touched[name] && Boolean(errors[name]);
  }, [touched, errors]);

  // Réinitialise le formulaire
  const resetForm = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, [initialValues]);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    validateForm,
    fieldHasError,
    resetForm,
    setValues
  };
};