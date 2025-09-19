// Tourist-specific validation utilities
import { validateEmail, validatePassword } from './validation';

// Nationality validation
export const validateNationality = (nationality) => {
  if (!nationality || nationality.trim().length === 0) {
    return { isValid: false, error: 'Nationality is required' };
  }
  if (nationality.trim().length < 2) {
    return { isValid: false, error: 'Please enter a valid nationality' };
  }
  return { isValid: true, error: null };
};

// Passport number validation
export const validatePassportNumber = (passportNumber) => {
  if (!passportNumber || passportNumber.trim().length === 0) {
    return { isValid: false, error: 'Passport number is required' };
  }
  
  // Basic passport number validation (alphanumeric, 6-12 characters)
  const passportRegex = /^[A-Z0-9]{6,12}$/;
  const cleanPassport = passportNumber.trim().toUpperCase();
  
  if (!passportRegex.test(cleanPassport)) {
    return { isValid: false, error: 'Passport number must be 6-12 alphanumeric characters' };
  }
  
  return { isValid: true, error: null };
};

// Phone number validation
export const validatePhoneNumber = (phoneNumber) => {
  if (!phoneNumber || phoneNumber.trim().length === 0) {
    return { isValid: false, error: 'Phone number is required' };
  }
  
  // International phone number format validation
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  const cleanPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');
  
  if (!phoneRegex.test(cleanPhone)) {
    return { isValid: false, error: 'Please enter a valid phone number' };
  }
  
  return { isValid: true, error: null };
};

// Emergency contact validation
export const validateEmergencyContact = (contact) => {
  const errors = {};
  
  if (!contact.name || contact.name.trim().length === 0) {
    errors.name = 'Contact name is required';
  }
  
  const phoneValidation = validatePhoneNumber(contact.phoneNumber);
  if (!phoneValidation.isValid) {
    errors.phoneNumber = phoneValidation.error;
  }
  
  if (!contact.relationship || contact.relationship.trim().length === 0) {
    errors.relationship = 'Relationship is required';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// Medical information validation
export const validateMedicalInfo = (medicalInfo) => {
  // Medical info is optional, but if provided, validate format
  if (!medicalInfo) return { isValid: true, error: null };
  
  const { allergies, medications, conditions, bloodType } = medicalInfo;
  
  // Blood type validation if provided
  if (bloodType && bloodType.trim().length > 0) {
    const bloodTypeRegex = /^(A|B|AB|O)[+-]$/;
    if (!bloodTypeRegex.test(bloodType.trim().toUpperCase())) {
      return { isValid: false, error: 'Invalid blood type format (e.g., A+, O-, AB+)' };
    }
  }
  
  return { isValid: true, error: null };
};

// User preferences validation
export const validateUserPreferences = (preferences) => {
  if (!preferences) return { isValid: true, error: null };
  
  const { language, accessibility } = preferences;
  
  // Language validation
  if (language && typeof language !== 'string') {
    return { isValid: false, error: 'Language must be a valid language code' };
  }
  
  // Accessibility preferences validation
  if (accessibility && typeof accessibility !== 'object') {
    return { isValid: false, error: 'Accessibility preferences must be an object' };
  }
  
  return { isValid: true, error: null };
};

// Complete tourist registration validation
export const validateTouristRegistration = (userData) => {
  const errors = {};
  
  // Basic auth validation
  const emailValidation = validateEmail(userData.email);
  if (!emailValidation.isValid) {
    errors.email = emailValidation.error;
  }
  
  const passwordValidation = validatePassword(userData.password);
  if (!passwordValidation.isValid) {
    errors.password = passwordValidation.error;
  }
  
  // Tourist-specific validation
  const nationalityValidation = validateNationality(userData.nationality);
  if (!nationalityValidation.isValid) {
    errors.nationality = nationalityValidation.error;
  }
  
  const passportValidation = validatePassportNumber(userData.passportNumber);
  if (!passportValidation.isValid) {
    errors.passportNumber = passportValidation.error;
  }
  
  const phoneValidation = validatePhoneNumber(userData.phoneNumber);
  if (!phoneValidation.isValid) {
    errors.phoneNumber = phoneValidation.error;
  }
  
  // Emergency contacts validation (at least one required)
  if (!userData.emergencyContacts || userData.emergencyContacts.length === 0) {
    errors.emergencyContacts = 'At least one emergency contact is required';
  } else {
    userData.emergencyContacts.forEach((contact, index) => {
      const contactValidation = validateEmergencyContact(contact);
      if (!contactValidation.isValid) {
        errors[`emergencyContact_${index}`] = contactValidation.errors;
      }
    });
  }
  
  // Medical info validation (optional)
  if (userData.medicalInfo) {
    const medicalValidation = validateMedicalInfo(userData.medicalInfo);
    if (!medicalValidation.isValid) {
      errors.medicalInfo = medicalValidation.error;
    }
  }
  
  // Preferences validation (optional)
  if (userData.preferences) {
    const preferencesValidation = validateUserPreferences(userData.preferences);
    if (!preferencesValidation.isValid) {
      errors.preferences = preferencesValidation.error;
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// Default values for new tourist user
export const getDefaultTouristData = () => ({
  nationality: '',
  passportNumber: '',
  phoneNumber: '',
  emergencyContacts: [
    {
      name: '',
      phoneNumber: '',
      relationship: '',
      isPrimary: true,
      photoUrl: null
    }
  ],
  medicalInfo: {
    allergies: '',
    medications: '',
    conditions: '',
    bloodType: ''
  },
  preferences: {
    language: 'en',
    accessibility: {
      highContrast: false,
      fontSize: 'medium',
      voiceOver: false
    }
  },
  verificationStatus: 'pending'
});