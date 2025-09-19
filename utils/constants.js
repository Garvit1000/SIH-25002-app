// App Constants
export const APP_CONFIG = {
  name: 'Tourist Safety App',
  version: '1.0.0',
  supportEmail: 'support@touristsafety.app',
  emergencyHelpline: '1363'
};

// Emergency Numbers
export const EMERGENCY_NUMBERS = {
  POLICE: '100',
  MEDICAL: '108',
  FIRE: '101',
  TOURIST_HELPLINE: '1363',
  WOMEN_HELPLINE: '1091',
  CHILD_HELPLINE: '1098'
};

// Safety Zone Levels
export const SAFETY_LEVELS = {
  SAFE: 'safe',
  CAUTION: 'caution',
  RESTRICTED: 'restricted'
};

// Safety Zone Colors
export const SAFETY_COLORS = {
  [SAFETY_LEVELS.SAFE]: '#34C759',
  [SAFETY_LEVELS.CAUTION]: '#FF9500',
  [SAFETY_LEVELS.RESTRICTED]: '#FF3B30'
};

// QR Code Configuration
export const QR_CONFIG = {
  SIZE: 200,
  EXPIRY_HOURS: 24,
  REFRESH_THRESHOLD_HOURS: 2,
  VERSION: '1.0'
};

// Location Configuration
export const LOCATION_CONFIG = {
  ACCURACY: 'high',
  TIME_INTERVAL: 10000, // 10 seconds
  DISTANCE_INTERVAL: 10, // 10 meters
  GEOFENCE_RADIUS: 100, // 100 meters
  MAX_AGE: 60000 // 1 minute
};

// Notification Types
export const NOTIFICATION_TYPES = {
  EMERGENCY: 'emergency',
  SAFETY_ZONE: 'safety_zone',
  SAFETY_WARNING: 'safety_warning',
  SAFETY_CAUTION: 'safety_caution',
  LOCATION_UPDATE: 'location_update',
  QR_REFRESH: 'qr_refresh',
  REMINDER: 'reminder',
  SYSTEM: 'system'
};

// Verification Status
export const VERIFICATION_STATUS = {
  PENDING: 'pending',
  VERIFIED: 'verified',
  REJECTED: 'rejected'
};

// Error Messages
export const ERROR_MESSAGES = {
  GENERIC_ERROR: 'Something went wrong. Please try again.',
  NETWORK_ERROR: 'Network connection error. Please check your internet.',
  LOCATION_ERROR: 'Unable to get your location. Please enable location services.',
  PERMISSION_ERROR: 'Permission denied. Please grant required permissions.',
  QR_GENERATION_ERROR: 'Failed to generate QR code. Please try again.',
  LOCATION_PERMISSION_DENIED: 'Location permission is required for safety features.',
  CAMERA_PERMISSION_DENIED: 'Camera permission is required to scan QR codes.',
  NOTIFICATION_PERMISSION_DENIED: 'Notification permission is required for safety alerts.',
  INVALID_QR_CODE: 'Invalid or expired QR code.',
  EMERGENCY_SEND_FAILED: 'Failed to send emergency alert. Please try again.',
  AUTH_FAILED: 'Authentication failed. Please check your credentials.'
};

// Success Messages
export const SUCCESS_MESSAGES = {
  QR_GENERATED: 'QR code generated successfully',
  PROFILE_UPDATED: 'Profile updated successfully',
  EMERGENCY_SENT: 'Emergency alert sent successfully',
  LOCATION_UPDATED: 'Location updated successfully',
  CONTACT_ADDED: 'Emergency contact added successfully',
  SETTINGS_SAVED: 'Settings saved successfully'
};

// Supported Languages
export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' }
];

// Theme Configuration
export const THEME_CONFIG = {
  FONT_SIZES: ['xs', 'sm', 'md', 'lg', 'xl', 'xxl', 'xxxl'],
  FONT_SCALE_MIN: 0.8,
  FONT_SCALE_MAX: 2.0,
  ANIMATION_DURATION: 300
};

// Storage Keys
export const STORAGE_KEYS = {
  USER_PREFERENCES: 'userPreferences',
  THEME_PREFERENCES: 'themePreferences',
  EMERGENCY_CONTACTS: 'emergencyContacts',
  QR_CODE_DATA: 'qrCodeData',
  LOCATION_CACHE: 'locationCache',
  SAFETY_ZONES_CACHE: 'safetyZonesCache',
  CHAT_HISTORY: 'chatHistory'
};

// API Endpoints (for future backend integration)
export const API_ENDPOINTS = {
  BASE_URL: 'https://api.touristsafety.app/v1',
  AUTH: '/auth',
  USERS: '/users',
  SAFETY_ZONES: '/safety-zones',
  EMERGENCY: '/emergency',
  QR_VERIFY: '/qr/verify',
  CHAT: '/chat',
  NOTIFICATIONS: '/notifications'
};

// Validation Rules
export const VALIDATION_RULES = {
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_REGEX: /^\+?[\d\s\-\(\)]{10,}$/,
  PASSPORT_REGEX: /^[A-Z0-9]{6,9}$/,
  MIN_PASSWORD_LENGTH: 8,
  MAX_NAME_LENGTH: 50,
  MAX_MESSAGE_LENGTH: 500
};

// Performance Thresholds
export const PERFORMANCE_THRESHOLDS = {
  APP_LAUNCH_TIME: 2000, // 2 seconds
  MAX_MEMORY_USAGE: 100 * 1024 * 1024, // 100MB
  LOCATION_UPDATE_INTERVAL: 5000, // 5 seconds
  QR_GENERATION_TIME: 1000, // 1 second
  API_TIMEOUT: 10000 // 10 seconds
};

// Accessibility Configuration
export const ACCESSIBILITY_CONFIG = {
  MIN_TOUCH_TARGET_SIZE: 44,
  HIGH_CONTRAST_RATIO: 7.0,
  NORMAL_CONTRAST_RATIO: 4.5,
  ANIMATION_REDUCE_MOTION: true,
  VOICE_OVER_ENABLED: true
};