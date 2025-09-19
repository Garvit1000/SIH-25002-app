import { VALIDATION_RULES } from './constants';

// Form validation schemas
export const validationSchemas = {
  // User registration validation
  registration: {
    email: {
      required: true,
      pattern: VALIDATION_RULES.EMAIL_REGEX,
      message: 'Please enter a valid email address'
    },
    password: {
      required: true,
      minLength: VALIDATION_RULES.MIN_PASSWORD_LENGTH,
      message: `Password must be at least ${VALIDATION_RULES.MIN_PASSWORD_LENGTH} characters long`
    },
    confirmPassword: {
      required: true,
      match: 'password',
      message: 'Passwords do not match'
    },
    name: {
      required: true,
      maxLength: VALIDATION_RULES.MAX_NAME_LENGTH,
      message: `Name must be less than ${VALIDATION_RULES.MAX_NAME_LENGTH} characters`
    },
    nationality: {
      required: true,
      message: 'Please select your nationality'
    },
    passportNumber: {
      required: true,
      pattern: VALIDATION_RULES.PASSPORT_REGEX,
      message: 'Please enter a valid passport number'
    },
    phoneNumber: {
      required: true,
      pattern: VALIDATION_RULES.PHONE_REGEX,
      message: 'Please enter a valid phone number'
    }
  },

  // Login validation
  login: {
    email: {
      required: true,
      pattern: VALIDATION_RULES.EMAIL_REGEX,
      message: 'Please enter a valid email address'
    },
    password: {
      required: true,
      message: 'Password is required'
    }
  },

  // Emergency contact validation
  emergencyContact: {
    name: {
      required: true,
      maxLength: VALIDATION_RULES.MAX_NAME_LENGTH,
      message: 'Contact name is required'
    },
    phoneNumber: {
      required: true,
      pattern: VALIDATION_RULES.PHONE_REGEX,
      message: 'Please enter a valid phone number'
    },
    relationship: {
      required: true,
      message: 'Please specify the relationship'
    }
  },

  // Profile update validation
  profile: {
    name: {
      required: true,
      maxLength: VALIDATION_RULES.MAX_NAME_LENGTH,
      message: 'Name is required'
    },
    phoneNumber: {
      required: true,
      pattern: VALIDATION_RULES.PHONE_REGEX,
      message: 'Please enter a valid phone number'
    },
    nationality: {
      required: true,
      message: 'Please select your nationality'
    }
  },

  // Chat message validation
  chatMessage: {
    message: {
      required: true,
      maxLength: VALIDATION_RULES.MAX_MESSAGE_LENGTH,
      message: `Message must be less than ${VALIDATION_RULES.MAX_MESSAGE_LENGTH} characters`
    }
  }
};

// Generic validation function
export const validateField = (value, rules) => {
  const errors = [];

  // Required validation
  if (rules.required && (!value || value.toString().trim() === '')) {
    errors.push(rules.message || 'This field is required');
    return { isValid: false, errors };
  }

  // Skip other validations if field is empty and not required
  if (!value || value.toString().trim() === '') {
    return { isValid: true, errors: [] };
  }

  // Pattern validation
  if (rules.pattern && !rules.pattern.test(value)) {
    errors.push(rules.message || 'Invalid format');
  }

  // Min length validation
  if (rules.minLength && value.length < rules.minLength) {
    errors.push(rules.message || `Minimum length is ${rules.minLength} characters`);
  }

  // Max length validation
  if (rules.maxLength && value.length > rules.maxLength) {
    errors.push(rules.message || `Maximum length is ${rules.maxLength} characters`);
  }

  // Min value validation (for numbers)
  if (rules.min && parseFloat(value) < rules.min) {
    errors.push(rules.message || `Minimum value is ${rules.min}`);
  }

  // Max value validation (for numbers)
  if (rules.max && parseFloat(value) > rules.max) {
    errors.push(rules.message || `Maximum value is ${rules.max}`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Validate entire form
export const validateForm = (formData, schema) => {
  const errors = {};
  let isValid = true;

  Object.keys(schema).forEach(fieldName => {
    const fieldRules = schema[fieldName];
    const fieldValue = formData[fieldName];

    // Handle match validation (e.g., confirm password)
    if (fieldRules.match) {
      const matchValue = formData[fieldRules.match];
      if (fieldValue !== matchValue) {
        errors[fieldName] = [fieldRules.message || 'Fields do not match'];
        isValid = false;
        return;
      }
    }

    const validation = validateField(fieldValue, fieldRules);
    
    if (!validation.isValid) {
      errors[fieldName] = validation.errors;
      isValid = false;
    }
  });

  return {
    isValid,
    errors
  };
};

// Specific validation functions
export const validateRegistrationForm = (formData) => {
  return validateForm(formData, validationSchemas.registration);
};

export const validateLoginForm = (formData) => {
  return validateForm(formData, validationSchemas.login);
};

export const validateEmergencyContact = (contactData) => {
  return validateForm(contactData, validationSchemas.emergencyContact);
};

export const validateProfileForm = (profileData) => {
  return validateForm(profileData, validationSchemas.profile);
};

export const validateChatMessage = (messageData) => {
  return validateForm(messageData, validationSchemas.chatMessage);
};

// Basic email validation function for compatibility
export const validateEmail = (email) => {
  const validation = validateField(email, {
    required: true,
    pattern: VALIDATION_RULES.EMAIL_REGEX,
    message: 'Please enter a valid email address'
  });
  
  return {
    isValid: validation.isValid,
    error: validation.errors.length > 0 ? validation.errors[0] : null
  };
};

// Basic password validation function for compatibility
export const validatePassword = (password) => {
  const validation = validateField(password, {
    required: true,
    minLength: VALIDATION_RULES.MIN_PASSWORD_LENGTH,
    message: `Password must be at least ${VALIDATION_RULES.MIN_PASSWORD_LENGTH} characters long`
  });
  
  return {
    isValid: validation.isValid,
    error: validation.errors.length > 0 ? validation.errors[0] : null
  };
};

// Real-time validation for individual fields
export const createFieldValidator = (fieldName, schema) => {
  return (value) => {
    const fieldRules = schema[fieldName];
    if (!fieldRules) return { isValid: true, errors: [] };
    
    return validateField(value, fieldRules);
  };
};

// Password strength validation
export const validatePasswordStrength = (password) => {
  const strength = {
    score: 0,
    feedback: [],
    level: 'weak'
  };

  if (!password) {
    return { ...strength, feedback: ['Password is required'] };
  }

  // Length check
  if (password.length >= 8) {
    strength.score += 1;
  } else {
    strength.feedback.push('Use at least 8 characters');
  }

  // Uppercase check
  if (/[A-Z]/.test(password)) {
    strength.score += 1;
  } else {
    strength.feedback.push('Add uppercase letters');
  }

  // Lowercase check
  if (/[a-z]/.test(password)) {
    strength.score += 1;
  } else {
    strength.feedback.push('Add lowercase letters');
  }

  // Number check
  if (/\d/.test(password)) {
    strength.score += 1;
  } else {
    strength.feedback.push('Add numbers');
  }

  // Special character check
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    strength.score += 1;
  } else {
    strength.feedback.push('Add special characters');
  }

  // Determine strength level
  if (strength.score <= 2) {
    strength.level = 'weak';
  } else if (strength.score <= 3) {
    strength.level = 'medium';
  } else if (strength.score <= 4) {
    strength.level = 'strong';
  } else {
    strength.level = 'very strong';
  }

  return strength;
};

// Custom validation rules
export const customValidators = {
  // Check if passport number is unique (mock implementation)
  isPassportUnique: async (passportNumber) => {
    // In real app, this would check against backend
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Mock validation - reject specific test passport numbers
    const existingPassports = ['A1234567', 'B9876543'];
    return !existingPassports.includes(passportNumber.toUpperCase());
  },

  // Check if email is unique (mock implementation)
  isEmailUnique: async (email) => {
    // In real app, this would check against backend
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Mock validation - reject specific test emails
    const existingEmails = ['test@example.com', 'admin@test.com'];
    return !existingEmails.includes(email.toLowerCase());
  },

  // Validate phone number format for specific countries
  validatePhoneByCountry: (phone, countryCode) => {
    const patterns = {
      'US': /^\+?1?[2-9]\d{2}[2-9]\d{2}\d{4}$/,
      'IN': /^\+?91[6-9]\d{9}$/,
      'UK': /^\+?44[1-9]\d{8,9}$/,
      'DE': /^\+?49[1-9]\d{10,11}$/
    };

    const pattern = patterns[countryCode];
    if (!pattern) return true; // Allow if no specific pattern

    return pattern.test(phone.replace(/\s/g, ''));
  }
};

// Sanitization functions
export const sanitizeInput = {
  // Remove potentially harmful characters
  text: (input) => {
    if (!input) return '';
    return input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                .replace(/[<>]/g, '')
                .trim();
  },

  // Sanitize phone number
  phone: (input) => {
    if (!input) return '';
    return input.replace(/[^\d+\-\s\(\)]/g, '');
  },

  // Sanitize email
  email: (input) => {
    if (!input) return '';
    return input.toLowerCase().trim();
  },

  // Sanitize passport number
  passport: (input) => {
    if (!input) return '';
    return input.toUpperCase().replace(/[^A-Z0-9]/g, '');
  }
};