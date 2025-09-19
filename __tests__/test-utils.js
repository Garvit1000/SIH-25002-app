import React from 'react';
import { render } from '@testing-library/react-native';
import { AuthContext } from '../context/AuthContext';
import { LocationContext } from '../context/LocationContext';
import { SafetyContext } from '../context/SafetyContext';
import { ThemeContext } from '../context/ThemeContext';

// Default mock contexts for testing
export const mockAuthContext = {
  user: {
    uid: 'test-user-123',
    email: 'test@example.com',
    displayName: 'Test User'
  },
  profile: {
    userId: 'test-user-123',
    name: 'Test User',
    nationality: 'US',
    passportNumber: 'US1234567890',
    phoneNumber: '+1234567890',
    emergencyContacts: [
      {
        id: 'contact-1',
        name: 'Emergency Contact',
        phoneNumber: '+1111111111',
        relationship: 'spouse',
        isPrimary: true
      }
    ],
    verificationStatus: 'verified'
  },
  isAuthenticated: true,
  loading: false,
  login: jest.fn(),
  logout: jest.fn(),
  register: jest.fn()
};

export const mockLocationContext = {
  currentLocation: {
    latitude: 28.6139,
    longitude: 77.2090,
    accuracy: 10,
    timestamp: new Date()
  },
  locationPermission: 'granted',
  isTracking: true,
  startTracking: jest.fn(),
  stopTracking: jest.fn(),
  getCurrentLocation: jest.fn()
};

export const mockSafetyContext = {
  panicMode: false,
  isEmergencyActive: false,
  safetyScore: 85,
  currentSafetyZone: 'safe',
  activatePanicMode: jest.fn(),
  deactivatePanicMode: jest.fn(),
  updateSafetyScore: jest.fn()
};

export const mockThemeContext = {
  theme: 'light',
  colors: {
    primary: '#007AFF',
    background: '#FFFFFF',
    text: '#000000',
    error: '#FF3B30'
  },
  toggleTheme: jest.fn(),
  isDarkMode: false
};

// Custom render function with all contexts
export const renderWithContexts = (
  component,
  {
    authContext = mockAuthContext,
    locationContext = mockLocationContext,
    safetyContext = mockSafetyContext,
    themeContext = mockThemeContext,
    ...renderOptions
  } = {}
) => {
  const Wrapper = ({ children }) => (
    <ThemeContext.Provider value={themeContext}>
      <AuthContext.Provider value={authContext}>
        <LocationContext.Provider value={locationContext}>
          <SafetyContext.Provider value={safetyContext}>
            {children}
          </SafetyContext.Provider>
        </LocationContext.Provider>
      </AuthContext.Provider>
    </ThemeContext.Provider>
  );

  return render(component, { wrapper: Wrapper, ...renderOptions });
};

// Mock data generators
export const createMockUser = (overrides = {}) => ({
  uid: 'test-user-123',
  email: 'test@example.com',
  displayName: 'Test User',
  emailVerified: true,
  ...overrides
});

export const createMockProfile = (overrides = {}) => ({
  userId: 'test-user-123',
  name: 'Test User',
  nationality: 'US',
  passportNumber: 'US1234567890',
  phoneNumber: '+1234567890',
  emergencyContacts: [],
  verificationStatus: 'verified',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
});

export const createMockLocation = (overrides = {}) => ({
  latitude: 28.6139,
  longitude: 77.2090,
  accuracy: 10,
  altitude: 100,
  heading: 0,
  speed: 0,
  timestamp: new Date(),
  ...overrides
});

export const createMockEmergencyContact = (overrides = {}) => ({
  id: 'contact-1',
  name: 'Emergency Contact',
  phoneNumber: '+1234567890',
  relationship: 'spouse',
  isPrimary: true,
  ...overrides
});

// Test helpers
export const waitForAsync = (fn, timeout = 5000) => {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const check = () => {
      try {
        const result = fn();
        if (result) {
          resolve(result);
        } else if (Date.now() - startTime > timeout) {
          reject(new Error('Timeout waiting for condition'));
        } else {
          setTimeout(check, 100);
        }
      } catch (error) {
        if (Date.now() - startTime > timeout) {
          reject(error);
        } else {
          setTimeout(check, 100);
        }
      }
    };
    
    check();
  });
};

// Mock service responses
export const mockServiceResponse = (success = true, data = null, error = null) => ({
  success,
  data,
  error,
  timestamp: new Date()
});

// Test data validation helpers
export const validateLocationData = (location) => {
  expect(location).toHaveProperty('latitude');
  expect(location).toHaveProperty('longitude');
  expect(typeof location.latitude).toBe('number');
  expect(typeof location.longitude).toBe('number');
  expect(location.latitude).toBeGreaterThanOrEqual(-90);
  expect(location.latitude).toBeLessThanOrEqual(90);
  expect(location.longitude).toBeGreaterThanOrEqual(-180);
  expect(location.longitude).toBeLessThanOrEqual(180);
};

export const validateUserProfile = (profile) => {
  expect(profile).toHaveProperty('userId');
  expect(profile).toHaveProperty('name');
  expect(profile).toHaveProperty('nationality');
  expect(profile).toHaveProperty('passportNumber');
  expect(profile).toHaveProperty('phoneNumber');
  expect(profile).toHaveProperty('emergencyContacts');
  expect(Array.isArray(profile.emergencyContacts)).toBe(true);
};

export const validateQRCodeData = (qrData) => {
  expect(qrData).toHaveProperty('qrString');
  expect(qrData).toHaveProperty('userId');
  expect(qrData).toHaveProperty('verificationHash');
  expect(qrData).toHaveProperty('expiresAt');
  expect(qrData).toHaveProperty('generatedAt');
  expect(typeof qrData.qrString).toBe('string');
  expect(qrData.qrString.length).toBeGreaterThan(0);
};

// Performance testing helpers
export const measurePerformance = async (fn, label = 'Operation') => {
  const startTime = performance.now();
  const result = await fn();
  const endTime = performance.now();
  const duration = endTime - startTime;
  
  console.log(`${label} took ${duration.toFixed(2)} milliseconds`);
  
  return {
    result,
    duration,
    startTime,
    endTime
  };
};

// Memory usage helpers (for performance testing)
export const getMemoryUsage = () => {
  if (typeof performance !== 'undefined' && performance.memory) {
    return {
      used: performance.memory.usedJSHeapSize,
      total: performance.memory.totalJSHeapSize,
      limit: performance.memory.jsHeapSizeLimit
    };
  }
  return null;
};

// Accessibility testing helpers
export const validateAccessibility = (component) => {
  // Check for accessibility labels
  const accessibleElements = component.queryAllByLabelText(/.+/);
  expect(accessibleElements.length).toBeGreaterThan(0);
  
  // Check for proper button roles
  const buttons = component.queryAllByRole('button');
  buttons.forEach(button => {
    expect(button.props.accessibilityLabel || button.props.children).toBeDefined();
  });
};

// Network simulation helpers
export const simulateNetworkError = (mockFn, errorMessage = 'Network error') => {
  mockFn.mockRejectedValue(new Error(errorMessage));
};

export const simulateNetworkDelay = (mockFn, delay = 1000, response = { success: true }) => {
  mockFn.mockImplementation(() => 
    new Promise(resolve => setTimeout(() => resolve(response), delay))
  );
};

// Test cleanup helpers
export const cleanupMocks = (...mocks) => {
  mocks.forEach(mock => {
    if (mock && typeof mock.mockClear === 'function') {
      mock.mockClear();
    }
  });
};

export const resetAllMocks = () => {
  jest.clearAllMocks();
  jest.clearAllTimers();
};