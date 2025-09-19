import { VALIDATION_RULES, ERROR_MESSAGES } from './constants';

// Date and Time Helpers
export const formatDate = (date, format = 'short') => {
  if (!date) return '';
  
  const dateObj = new Date(date);
  
  switch (format) {
    case 'short':
      return dateObj.toLocaleDateString();
    case 'long':
      return dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    case 'time':
      return dateObj.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
    case 'datetime':
      return dateObj.toLocaleString();
    default:
      return dateObj.toLocaleDateString();
  }
};

export const getTimeAgo = (date) => {
  if (!date) return '';
  
  const now = new Date();
  const diffInSeconds = Math.floor((now - new Date(date)) / 1000);
  
  if (diffInSeconds < 60) {
    return 'Just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }
};

// Validation Helpers
export const validateEmail = (email) => {
  if (!email) return { isValid: false, error: 'Email is required' };
  if (!VALIDATION_RULES.EMAIL_REGEX.test(email)) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }
  return { isValid: true };
};

export const validatePhone = (phone) => {
  if (!phone) return { isValid: false, error: 'Phone number is required' };
  if (!VALIDATION_RULES.PHONE_REGEX.test(phone)) {
    return { isValid: false, error: 'Please enter a valid phone number' };
  }
  return { isValid: true };
};

export const validatePassword = (password) => {
  if (!password) return { isValid: false, error: 'Password is required' };
  if (password.length < VALIDATION_RULES.MIN_PASSWORD_LENGTH) {
    return { 
      isValid: false, 
      error: `Password must be at least ${VALIDATION_RULES.MIN_PASSWORD_LENGTH} characters long` 
    };
  }
  return { isValid: true };
};

export const validatePassport = (passport) => {
  if (!passport) return { isValid: false, error: 'Passport number is required' };
  if (!VALIDATION_RULES.PASSPORT_REGEX.test(passport.toUpperCase())) {
    return { isValid: false, error: 'Please enter a valid passport number' };
  }
  return { isValid: true };
};

export const validateName = (name) => {
  if (!name) return { isValid: false, error: 'Name is required' };
  if (name.trim().length === 0) return { isValid: false, error: 'Name cannot be empty' };
  if (name.length > VALIDATION_RULES.MAX_NAME_LENGTH) {
    return { 
      isValid: false, 
      error: `Name must be less than ${VALIDATION_RULES.MAX_NAME_LENGTH} characters` 
    };
  }
  return { isValid: true };
};

// Location Helpers
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  
  return distance;
};

export const formatDistance = (distanceInKm) => {
  if (distanceInKm < 1) {
    return `${Math.round(distanceInKm * 1000)}m`;
  } else {
    return `${distanceInKm.toFixed(1)}km`;
  }
};

export const formatCoordinates = (latitude, longitude, precision = 4) => {
  return `${latitude.toFixed(precision)}, ${longitude.toFixed(precision)}`;
};

// Safety Helpers
export const getSafetyColor = (safetyLevel) => {
  const colors = {
    safe: '#34C759',
    caution: '#FF9500',
    restricted: '#FF3B30'
  };
  return colors[safetyLevel] || colors.caution;
};

export const getSafetyIcon = (safetyLevel) => {
  const icons = {
    safe: 'checkmark-circle',
    caution: 'warning',
    restricted: 'close-circle'
  };
  return icons[safetyLevel] || icons.caution;
};

export const getSafetyMessage = (safetyLevel) => {
  const messages = {
    safe: 'You are in a safe zone. Enjoy your visit!',
    caution: 'Exercise caution in this area. Stay alert.',
    restricted: 'This is a restricted area. Please leave immediately.'
  };
  return messages[safetyLevel] || 'Safety status unknown.';
};

// String Helpers
export const truncateText = (text, maxLength = 100) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

export const capitalizeFirstLetter = (string) => {
  if (!string) return '';
  return string.charAt(0).toUpperCase() + string.slice(1);
};

export const formatPhoneNumber = (phone) => {
  if (!phone) return '';
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Format based on length
  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
  } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return cleaned.replace(/(\d{1})(\d{3})(\d{3})(\d{4})/, '+$1 ($2) $3-$4');
  }
  
  return phone;
};

// Error Handling Helpers
export const getErrorMessage = (error) => {
  if (typeof error === 'string') return error;
  if (error?.message) return error.message;
  if (error?.error) return error.error;
  return ERROR_MESSAGES.GENERIC_ERROR;
};

export const handleApiError = (error) => {
  if (error?.code === 'NETWORK_ERROR') {
    return ERROR_MESSAGES.NETWORK_ERROR;
  }
  if (error?.code === 'PERMISSION_DENIED') {
    return ERROR_MESSAGES.LOCATION_PERMISSION_DENIED;
  }
  return getErrorMessage(error);
};

// Array Helpers
export const removeDuplicates = (array, key) => {
  if (!key) return [...new Set(array)];
  
  const seen = new Set();
  return array.filter(item => {
    const value = item[key];
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
};

export const sortByProperty = (array, property, ascending = true) => {
  return array.sort((a, b) => {
    const aValue = a[property];
    const bValue = b[property];
    
    if (aValue < bValue) return ascending ? -1 : 1;
    if (aValue > bValue) return ascending ? 1 : -1;
    return 0;
  });
};

// Storage Helpers
export const safeJsonParse = (jsonString, defaultValue = null) => {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.warn('Failed to parse JSON:', error);
    return defaultValue;
  }
};

export const safeJsonStringify = (object, defaultValue = '{}') => {
  try {
    return JSON.stringify(object);
  } catch (error) {
    console.warn('Failed to stringify object:', error);
    return defaultValue;
  }
};

// Performance Helpers
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

export const throttle = (func, limit) => {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Random Helpers
export const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export const generateRandomColor = () => {
  return '#' + Math.floor(Math.random()*16777215).toString(16);
};

// Platform Helpers
export const isIOS = () => {
  return Platform.OS === 'ios';
};

export const isAndroid = () => {
  return Platform.OS === 'android';
};