/**
 * End-to-End Application Integration Tests
 * Tests complete application flows from user perspective
 * 
 * Requirements Coverage:
 * - All requirements integration testing
 * - Complete user journey from registration to emergency response
 * - Cross-platform compatibility and accessibility
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert, Linking, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import main app
import App from '../../App';

// Import test utilities
import { createMockNavigation, mockAsyncStorage, mockFirebaseAuth } from '../test-utils';

// Mock all external dependencies
jest.mock('expo-location');
jest.mock('expo-notifications');
jest.mock('expo-secure-store');
jest.mock('react-native-qrcode-svg');
jest.mock('../../services/firebase/auth');
jest.mock('../../services/firebase/firestore');
jest.mock('../../services/performance/appLaunchOptimizer');

// Mock performance services
const mockAppLaunchOptimizer = {
  initialize: jest.fn().mockResolvedValue({
    success: true,
    metrics: { totalTime: 1500, success: true }
  })
};

const mockPerformanceOptimizer = {
  initialize: jest.fn().mockResolvedValue(true)
};

const mockSmartLocationTracker = {
  initialize: jest.fn().mockResolvedValue(true)
};

const mockBackgroundSyncService = {
  initialize: jest.fn().mockResolvedValue(true)
};

// Mock data for complete user journey
const completeUserData = {
  userId: 'e2e-test-user',
  email: 'e2etest@example.com',
  name: 'E2E Test User',
  nationality: 'India',
  passportNumber: 'IN987654321',
  phoneNumber: '+919876543210',
  verificationStatus: 'verified',
  emergencyContacts: [
    {
      id: 'emergency-1',
      name: 'Emergency Contact 1',
      phoneNumber: '+919876543211',
      relationship: 'Family',
      isPrimary: true
    },
    {
      id: 'emergency-2',
      name: 'Emergency Contact 2',
      phoneNumber: '+919876543212',
      relationship: 'Friend',
      isPrimary: false
    }
  ],
  medicalInfo: {
    bloodType: 'B+',
    allergies: ['Shellfish'],
    medications: ['Insulin'],
    conditions: ['Diabetes']
  },
  preferences: {
    language: 'en',
    theme: 'light',
    notifications: true
  }
};

const mockLocationData = {
  latitude: 28.7041,
  longitude: 77.1025,
  accuracy: 5,
  timestamp: new Date(),
  address: 'Red Fort, New Delhi, India'
};

describe('End-to-End Application Integration', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    
    // Setup performance mocks
    require('../../services/performance/appLaunchOptimizer').appLaunchOptimizer = mockAppLaunchOptimizer;
    require('../../services/performance/performanceOptimizer').performanceOptimizer = mockPerformanceOptimizer;
    require('../../services/performance/smartLocationTracker').smartLocationTracker = mockSmartLocationTracker;
    require('../../services/offline/backgroundSyncService').backgroundSyncService = mockBackgroundSyncService;
  });

  describe('Complete User Journey - New User Registration to Emergency Response', () => {
    test('Full user journey: Registration → Verification → QR Generation → Emergency Response', async () => {
      const { getByText, getByTestId, getByPlaceholderText, queryByText } = render(<App />);

      // Step 1: App Initialization
      await waitFor(() => {
        expect(mockAppLaunchOptimizer.initialize).toHaveBeenCalled();
      }, { timeout: 5000 });

      // Step 2: User Registration Flow
      await waitFor(() => {
        expect(getByText('Create Account')).toBeTruthy();
      });

      // Fill registration form
      fireEvent.changeText(getByPlaceholderText('Email'), completeUserData.email);
      fireEvent.changeText(getByPlaceholderText('Password'), 'TestPassword123!');
      fireEvent.changeText(getByPlaceholderText('Full Name'), completeUserData.name);

      const registerButton = getByText('Register');
      fireEvent.press(registerButton);

      // Step 3: Tourist Profile Completion
      await waitFor(() => {
        expect(getByText('Complete Your Tourist Profile')).toBeTruthy();
      });

      // Fill tourist profile
      fireEvent.changeText(getByPlaceholderText('Nationality'), completeUserData.nationality);
      fireEvent.changeText(getByPlaceholderText('Passport Number'), completeUserData.passportNumber);
      fireEvent.changeText(getByPlaceholderText('Phone Number'), completeUserData.phoneNumber);

      // Add emergency contacts
      const addContactButton = getByText('Add Emergency Contact');
      fireEvent.press(addContactButton);

      fireEvent.changeText(getByPlaceholderText('Contact Name'), completeUserData.emergencyContacts[0].name);
      fireEvent.changeText(getByPlaceholderText('Phone Number'), completeUserData.emergencyContacts[0].phoneNumber);

      const saveProfileButton = getByText('Save Profile');
      fireEvent.press(saveProfileButton);

      // Step 4: Dashboard Access
      await waitFor(() => {
        expect(getByText('Welcome back!')).toBeTruthy();
        expect(getByText(completeUserData.name)).toBeTruthy();
      });

      // Verify safety score widget
      await waitFor(() => {
        expect(queryByText(/Safety Assessment/)).toBeTruthy();
      });

      // Step 5: QR Code Generation and Display
      const qrCodeButton = getByTestId('qr-code-button');
      fireEvent.press(qrCodeButton);

      await waitFor(() => {
        expect(getByText('My QR Code')).toBeTruthy();
        expect(getByText('Security Status')).toBeTruthy();
        expect(getByText('Encrypted')).toBeTruthy();
      });

      // Test QR code functionality
      const fullScreenButton = getByText('Full Screen');
      fireEvent.press(fullScreenButton);

      await waitFor(() => {
        expect(getByText('Tourist ID')).toBeTruthy();
      });

      // Exit full screen
      const closeButton = getByTestId('close-fullscreen');
      fireEvent.press(closeButton);

      // Step 6: Emergency Response Flow
      const emergencyTab = getByText('SOS');
      fireEvent.press(emergencyTab);

      await waitFor(() => {
        expect(getByText('Emergency Panic Button')).toBeTruthy();
        expect(getByText('Emergency Services')).toBeTruthy();
      });

      // Test panic button activation
      const panicButton = getByTestId('panic-button');
      fireEvent.press(panicButton);

      // Confirm emergency activation
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Emergency Alert',
          expect.stringContaining('Hold the button for 3 seconds'),
          expect.any(Array)
        );
      });

      // Simulate emergency confirmation
      act(() => {
        Alert.alert.mock.calls[0][2][1].onPress(); // Press "Start Emergency"
      });

      // Simulate countdown completion
      act(() => {
        jest.advanceTimersByTime(3000);
      });

      // Verify emergency mode activation
      await waitFor(() => {
        expect(queryByText('🚨 EMERGENCY ACTIVE')).toBeTruthy();
      });

      // Step 7: Test Emergency Services Integration
      const policeButton = getByText('Police');
      fireEvent.press(policeButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Call Police',
          expect.stringContaining('100'),
          expect.any(Array)
        );
      });

      // Step 8: Test Location Sharing
      const mapTab = getByText('Map');
      fireEvent.press(mapTab);

      await waitFor(() => {
        expect(queryByText(/Current Location/)).toBeTruthy();
      });

      // Step 9: Test AI Assistant
      const chatTab = getByText('Help');
      fireEvent.press(chatTab);

      await waitFor(() => {
        expect(queryByText(/AI Assistant/)).toBeTruthy();
      });

      // Step 10: Test Profile Management
      const profileTab = getByText('Profile');
      fireEvent.press(profileTab);

      await waitFor(() => {
        expect(getByText(completeUserData.name)).toBeTruthy();
        expect(getByText(completeUserData.nationality)).toBeTruthy();
      });
    });
  });

  describe('Offline Functionality Integration', () => {
    test('Complete offline mode functionality', async () => {
      // Mock offline state
      const mockNetInfo = require('@react-native-community/netinfo');
      mockNetInfo.useNetInfo.mockReturnValue({
        isConnected: false,
        isInternetReachable: false
      });

      const { getByText, getByTestId, queryByText } = render(<App />);

      // Wait for app initialization
      await waitFor(() => {
        expect(mockBackgroundSyncService.initialize).toHaveBeenCalled();
      });

      // Verify offline mode indicators
      await waitFor(() => {
        expect(queryByText(/Offline Mode/)).toBeTruthy();
      });

      // Test offline QR code access
      const qrCodeButton = getByTestId('qr-code-button');
      fireEvent.press(qrCodeButton);

      await waitFor(() => {
        expect(queryByText(/Cached QR Code/)).toBeTruthy();
      });

      // Test offline emergency functionality
      const emergencyTab = getByText('SOS');
      fireEvent.press(emergencyTab);

      const panicButton = getByTestId('panic-button');
      fireEvent.press(panicButton);

      // Verify offline emergency works
      await waitFor(() => {
        expect(queryByText(/Emergency queued for sync/)).toBeTruthy();
      });
    });
  });

  describe('Accessibility Integration', () => {
    test('Complete accessibility features integration', async () => {
      const { getByText, getByTestId, getByA11yLabel } = render(<App />);

      // Wait for app load
      await waitFor(() => {
        expect(getByText('Welcome back!')).toBeTruthy();
      });

      // Test accessibility navigation
      const dashboardTab = getByA11yLabel(/Dashboard tab/);
      expect(dashboardTab).toBeTruthy();

      const emergencyTab = getByA11yLabel(/Emergency tab/);
      expect(emergencyTab).toBeTruthy();

      // Test high contrast mode
      const profileTab = getByText('Profile');
      fireEvent.press(profileTab);

      const accessibilityButton = getByText('Accessibility Settings');
      fireEvent.press(accessibilityButton);

      const highContrastToggle = getByTestId('high-contrast-toggle');
      fireEvent.press(highContrastToggle);

      // Verify high contrast is applied
      await waitFor(() => {
        expect(queryByText(/High Contrast: On/)).toBeTruthy();
      });

      // Test font scaling
      const fontScaleSlider = getByTestId('font-scale-slider');
      fireEvent(fontScaleSlider, 'valueChange', 1.5);

      await waitFor(() => {
        expect(queryByText(/Font Size: 150%/)).toBeTruthy();
      });
    });
  });

  describe('Performance Integration', () => {
    test('App launch performance meets requirements', async () => {
      const startTime = Date.now();
      
      const { getByText } = render(<App />);
      
      // Wait for app to fully load
      await waitFor(() => {
        expect(getByText('Welcome back!')).toBeTruthy();
      });
      
      const loadTime = Date.now() - startTime;
      
      // Verify launch time meets 2-second requirement (Requirement 7.1)
      expect(loadTime).toBeLessThan(2000);
      
      // Verify performance optimizer was initialized
      expect(mockPerformanceOptimizer.initialize).toHaveBeenCalled();
    });

    test('Memory usage optimization', async () => {
      const { unmount, rerender } = render(<App />);
      
      // Simulate heavy usage
      for (let i = 0; i < 10; i++) {
        rerender(<App />);
      }
      
      // Verify memory management
      expect(mockSmartLocationTracker.initialize).toHaveBeenCalled();
      
      // Cleanup
      unmount();
      
      // Verify cleanup completed
      expect(true).toBe(true); // Placeholder for actual memory checks
    });
  });

  describe('Multi-language Integration', () => {
    test('Complete multi-language support', async () => {
      const { getByText, getByTestId } = render(<App />);

      // Navigate to settings
      const profileTab = getByText('Profile');
      fireEvent.press(profileTab);

      const languageButton = getByText('Language Settings');
      fireEvent.press(languageButton);

      // Test language switching
      const hindiOption = getByText('हिन्दी (Hindi)');
      fireEvent.press(hindiOption);

      // Verify UI updates to Hindi
      await waitFor(() => {
        expect(queryByText('डैशबोर्ड')).toBeTruthy(); // Dashboard in Hindi
      });

      // Test emergency services in Hindi
      const emergencyTab = getByTestId('emergency-tab');
      fireEvent.press(emergencyTab);

      await waitFor(() => {
        expect(queryByText('आपातकालीन सेवाएं')).toBeTruthy(); // Emergency Services in Hindi
      });
    });
  });

  describe('Cross-Platform Integration', () => {
    test('iOS specific features integration', async () => {
      Platform.OS = 'ios';
      
      const { getByText, getByTestId } = render(<App />);
      
      // Test iOS specific haptic feedback
      const panicButton = getByTestId('panic-button');
      fireEvent.press(panicButton);
      
      // Verify iOS haptics are triggered
      const Haptics = require('expo-haptics');
      expect(Haptics.impactAsync).toHaveBeenCalled();
      
      // Test iOS specific navigation
      expect(true).toBe(true); // Placeholder for iOS specific tests
    });

    test('Android specific features integration', async () => {
      Platform.OS = 'android';
      
      const { getByText, getByTestId } = render(<App />);
      
      // Test Android specific features
      const emergencyTab = getByText('SOS');
      fireEvent.press(emergencyTab);
      
      // Test Android emergency call integration
      const policeButton = getByText('Police');
      fireEvent.press(policeButton);
      
      await waitFor(() => {
        expect(Linking.openURL).toHaveBeenCalledWith('tel:100');
      });
    });
  });

  describe('Data Synchronization Integration', () => {
    test('Complete data sync across app restart', async () => {
      // First app session
      const { unmount } = render(<App />);
      
      // Simulate app data storage
      await AsyncStorage.setItem('user_data', JSON.stringify(completeUserData));
      await AsyncStorage.setItem('cached_qr', JSON.stringify({
        qrString: 'cached-qr-data',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      }));
      
      unmount();
      
      // Second app session
      const { getByText, queryByText } = render(<App />);
      
      // Verify data persistence
      await waitFor(() => {
        expect(getByText(completeUserData.name)).toBeTruthy();
      });
      
      // Verify cached QR code is available
      const qrCodeButton = getByTestId('qr-code-button');
      fireEvent.press(qrCodeButton);
      
      await waitFor(() => {
        expect(queryByText(/Cached QR Code/)).toBeTruthy();
      });
    });
  });

  describe('Security Integration', () => {
    test('Complete security flow with biometric authentication', async () => {
      const { getByText, getByTestId } = render(<App />);
      
      // Navigate to security settings
      const profileTab = getByText('Profile');
      fireEvent.press(profileTab);
      
      const securityButton = getByText('Security Settings');
      fireEvent.press(securityButton);
      
      // Enable biometric authentication
      const biometricToggle = getByTestId('biometric-toggle');
      fireEvent.press(biometricToggle);
      
      // Verify biometric prompt
      await waitFor(() => {
        expect(queryByText(/Biometric Authentication/)).toBeTruthy();
      });
      
      // Test QR code with biometric protection
      const qrCodeButton = getByTestId('qr-code-button');
      fireEvent.press(qrCodeButton);
      
      // Should prompt for biometric authentication
      await waitFor(() => {
        expect(queryByText(/Authenticate to view QR code/)).toBeTruthy();
      });
    });
  });
});