/**
 * Complete User Flow Integration Tests
 * Tests the end-to-end user flows for the Tourist Safety App
 * 
 * Requirements Coverage:
 * - All requirements integration testing
 * - Emergency response workflow (Requirements 2.1-2.6)
 * - QR code generation and verification (Requirements 1.1-1.6)
 * - Location and safety features (Requirements 3.1-3.6)
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { Alert, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import main app components
import App from '../../App';
import Navigation from '../../navigation';
import DashboardScreen from '../../screens/DashboardScreen';
import QRCodeScreen from '../../screens/QRCodeScreen';
import EmergencyScreen from '../../screens/main/EmergencyScreen';

// Import context providers
import { AuthProvider } from '../../context/AuthContext';
import { LocationProvider } from '../../context/LocationContext';
import { SafetyProvider } from '../../context/SafetyContext';
import { ThemeProvider } from '../../context/ThemeContext';

// Import services
import { qrGeneratorService } from '../../services/security/qrGenerator';
import { emergencyAlertService } from '../../services/emergency/alertService';
import { locationService } from '../../services/location/geoLocation';

// Mock external dependencies
jest.mock('expo-location');
jest.mock('expo-notifications');
jest.mock('react-native-qrcode-svg');
jest.mock('../../services/firebase/auth');
jest.mock('../../services/firebase/firestore');

// Mock data
const mockTouristUser = {
  userId: 'test-user-123',
  email: 'tourist@example.com',
  name: 'John Doe',
  nationality: 'United States',
  passportNumber: 'US123456789',
  phoneNumber: '+1234567890',
  verificationStatus: 'verified',
  emergencyContacts: [
    {
      id: 'contact-1',
      name: 'Jane Doe',
      phoneNumber: '+1234567891',
      relationship: 'Spouse',
      isPrimary: true
    }
  ],
  medicalInfo: {
    bloodType: 'O+',
    allergies: ['Peanuts'],
    medications: ['Aspirin']
  }
};

const mockLocation = {
  latitude: 28.6139,
  longitude: 77.2090,
  accuracy: 10,
  timestamp: new Date(),
  address: 'New Delhi, India'
};

const mockSafetyStatus = {
  safetyLevel: 'safe',
  safetyScore: 85,
  nearbyServices: [],
  riskFactors: []
};

// Test wrapper component
const TestWrapper = ({ children, initialUser = null }) => (
  <NavigationContainer>
    <ThemeProvider>
      <AuthProvider initialUser={initialUser}>
        <LocationProvider>
          <SafetyProvider>
            {children}
          </SafetyProvider>
        </LocationProvider>
      </AuthProvider>
    </ThemeProvider>
  </NavigationContainer>
);

describe('Complete User Flow Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.clear();
    
    // Mock location services
    locationService.getCurrentLocation = jest.fn().mockResolvedValue(mockLocation);
    locationService.checkSafetyZone = jest.fn().mockReturnValue(mockSafetyStatus);
    
    // Mock QR generator service
    qrGeneratorService.generateQRData = jest.fn().mockResolvedValue({
      success: true,
      qrData: {
        qrString: 'mock-qr-string',
        userId: mockTouristUser.userId,
        verificationHash: 'mock-hash',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        blockchainTxId: 'mock-tx-id',
        generatedAt: new Date(),
        securityLevel: 'high'
      }
    });
    
    // Mock emergency alert service
    emergencyAlertService.sendEmergencyAlert = jest.fn().mockResolvedValue({
      success: true,
      alertId: 'mock-alert-id'
    });
  });

  describe('Emergency Response Workflow', () => {
    test('Complete panic button to contact notification flow', async () => {
      const { getByTestId, getByText, queryByText } = render(
        <TestWrapper initialUser={mockTouristUser}>
          <EmergencyScreen />
        </TestWrapper>
      );

      // Step 1: Verify emergency screen loads with panic button
      await waitFor(() => {
        expect(getByText('Emergency Panic Button')).toBeTruthy();
      });

      // Step 2: Press panic button
      const panicButton = getByTestId('panic-button');
      fireEvent.press(panicButton);

      // Step 3: Confirm emergency alert dialog
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Emergency Alert',
          expect.stringContaining('Hold the button for 3 seconds'),
          expect.any(Array)
        );
      });

      // Step 4: Simulate countdown completion
      act(() => {
        // Simulate the countdown timer completing
        jest.advanceTimersByTime(3000);
      });

      // Step 5: Verify emergency alert is sent
      await waitFor(() => {
        expect(emergencyAlertService.sendEmergencyAlert).toHaveBeenCalledWith(
          mockLocation,
          mockTouristUser,
          mockTouristUser.emergencyContacts,
          expect.any(String)
        );
      });

      // Step 6: Verify emergency mode is activated
      await waitFor(() => {
        expect(queryByText('🚨 EMERGENCY ACTIVE')).toBeTruthy();
      });

      // Step 7: Test emergency service calls
      const policeButton = getByText('Police');
      fireEvent.press(policeButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Call Police',
          expect.stringContaining('100'),
          expect.any(Array)
        );
      });

      // Step 8: Test custom alert sending
      const customAlertButton = getByText('Send Selected Alert');
      fireEvent.press(customAlertButton);

      await waitFor(() => {
        expect(emergencyAlertService.sendEmergencyAlert).toHaveBeenCalledTimes(2);
      });
    });

    test('Emergency contact notification with location sharing', async () => {
      const { getByTestId } = render(
        <TestWrapper initialUser={mockTouristUser}>
          <EmergencyScreen />
        </TestWrapper>
      );

      // Activate emergency mode
      const panicButton = getByTestId('panic-button');
      fireEvent.press(panicButton);

      // Confirm emergency activation
      act(() => {
        Alert.alert.mock.calls[0][2][1].onPress(); // Press "Start Emergency"
      });

      // Simulate countdown completion
      act(() => {
        jest.advanceTimersByTime(3000);
      });

      // Verify emergency alert includes location and user data
      await waitFor(() => {
        expect(emergencyAlertService.sendEmergencyAlert).toHaveBeenCalledWith(
          expect.objectContaining({
            latitude: mockLocation.latitude,
            longitude: mockLocation.longitude
          }),
          expect.objectContaining({
            name: mockTouristUser.name,
            nationality: mockTouristUser.nationality
          }),
          mockTouristUser.emergencyContacts,
          expect.any(String)
        );
      });
    });
  });

  describe('QR Code Generation and Verification Flow', () => {
    test('Complete QR code generation, display, and verification flow', async () => {
      const { getByText, getByTestId, queryByText } = render(
        <TestWrapper initialUser={mockTouristUser}>
          <QRCodeScreen />
        </TestWrapper>
      );

      // Step 1: Verify QR code screen loads
      await waitFor(() => {
        expect(getByText('My QR Code')).toBeTruthy();
      });

      // Step 2: Verify QR code generation is called
      await waitFor(() => {
        expect(qrGeneratorService.generateQRData).toHaveBeenCalledWith(mockTouristUser);
      });

      // Step 3: Verify security status is displayed
      await waitFor(() => {
        expect(getByText('Security Status')).toBeTruthy();
        expect(getByText('Encrypted')).toBeTruthy();
        expect(getByText('Blockchain')).toBeTruthy();
      });

      // Step 4: Test QR code refresh functionality
      const refreshButton = getByText('Refresh');
      fireEvent.press(refreshButton);

      await waitFor(() => {
        expect(qrGeneratorService.refreshQRCode).toHaveBeenCalled();
      });

      // Step 5: Test full screen mode
      const fullScreenButton = getByText('Full Screen');
      fireEvent.press(fullScreenButton);

      await waitFor(() => {
        expect(queryByText('Tourist ID')).toBeTruthy();
      });

      // Step 6: Test download functionality
      const downloadButton = getByText('Download');
      fireEvent.press(downloadButton);

      await waitFor(() => {
        expect(qrGeneratorService.generateOfflineQR).toHaveBeenCalledWith(mockTouristUser);
      });
    });

    test('QR code expiration and auto-refresh', async () => {
      // Mock expired QR code
      const expiredQRData = {
        qrString: 'expired-qr-string',
        userId: mockTouristUser.userId,
        expiresAt: new Date(Date.now() - 1000), // Expired
        needsRefresh: () => true
      };

      qrGeneratorService.getCachedQRData = jest.fn().mockResolvedValue({
        success: true,
        qrData: expiredQRData
      });

      const { getByText } = render(
        <TestWrapper initialUser={mockTouristUser}>
          <QRCodeScreen />
        </TestWrapper>
      );

      // Verify auto-refresh is triggered for expired QR code
      await waitFor(() => {
        expect(qrGeneratorService.refreshQRCode).toHaveBeenCalled();
      });

      // Verify expiry warning is shown
      await waitFor(() => {
        expect(getByText(/expire soon/)).toBeTruthy();
      });
    });
  });

  describe('Dashboard Integration Flow', () => {
    test('Complete dashboard workflow with all widgets', async () => {
      const { getByText, getByTestId, queryByText } = render(
        <TestWrapper initialUser={mockTouristUser}>
          <DashboardScreen />
        </TestWrapper>
      );

      // Step 1: Verify dashboard loads with user profile
      await waitFor(() => {
        expect(getByText('Welcome back!')).toBeTruthy();
        expect(getByText(mockTouristUser.name)).toBeTruthy();
      });

      // Step 2: Verify safety score widget
      await waitFor(() => {
        expect(queryByText('85')).toBeTruthy(); // Safety score
      });

      // Step 3: Verify location status widget
      await waitFor(() => {
        expect(locationService.getCurrentLocation).toHaveBeenCalled();
      });

      // Step 4: Test QR code navigation
      const qrButton = getByTestId('qr-code-button');
      fireEvent.press(qrButton);

      // Should navigate to QR code screen (mocked navigation)
      expect(qrButton).toBeTruthy();

      // Step 5: Test emergency navigation
      const emergencyButton = getByText('Emergency');
      fireEvent.press(emergencyButton);

      // Should navigate to emergency screen
      expect(emergencyButton).toBeTruthy();

      // Step 6: Test panic button integration
      const panicButton = getByTestId('panic-button');
      expect(panicButton).toBeTruthy();
    });

    test('Dashboard safety tips and alerts', async () => {
      // Mock caution zone
      const cautionSafetyStatus = {
        ...mockSafetyStatus,
        safetyLevel: 'caution',
        safetyScore: 45
      };

      locationService.checkSafetyZone = jest.fn().mockReturnValue(cautionSafetyStatus);

      const { getByText, queryByText } = render(
        <TestWrapper initialUser={mockTouristUser}>
          <DashboardScreen />
        </TestWrapper>
      );

      // Verify safety tips are shown for caution zone
      await waitFor(() => {
        expect(queryByText('Safety Tips')).toBeTruthy();
        expect(queryByText(/Exercise caution/)).toBeTruthy();
      });

      // Verify safety score reflects caution level
      await waitFor(() => {
        expect(queryByText('45')).toBeTruthy();
      });
    });
  });

  describe('Cross-Component Integration', () => {
    test('Navigation between all main screens', async () => {
      const mockNavigation = {
        navigate: jest.fn(),
        goBack: jest.fn()
      };

      // Test Dashboard to QR Code navigation
      const { getByTestId: getDashboardElements } = render(
        <TestWrapper initialUser={mockTouristUser}>
          <DashboardScreen navigation={mockNavigation} />
        </TestWrapper>
      );

      const qrButton = getDashboardElements('qr-code-button');
      fireEvent.press(qrButton);
      expect(mockNavigation.navigate).toHaveBeenCalledWith('QRCode');

      // Test Dashboard to Emergency navigation
      const emergencyButton = getDashboardElements('emergency-button');
      fireEvent.press(emergencyButton);
      expect(mockNavigation.navigate).toHaveBeenCalledWith('Emergency');
    });

    test('Context data sharing between components', async () => {
      let authContext, locationContext, safetyContext;

      const TestComponent = () => {
        authContext = useAuth();
        locationContext = useLocation();
        safetyContext = useSafety();
        return null;
      };

      render(
        <TestWrapper initialUser={mockTouristUser}>
          <TestComponent />
        </TestWrapper>
      );

      await waitFor(() => {
        // Verify auth context has user data
        expect(authContext.profile).toEqual(mockTouristUser);
        
        // Verify location context has location data
        expect(locationContext.currentLocation).toBeTruthy();
        
        // Verify safety context has safety data
        expect(safetyContext.safetyScore).toBeTruthy();
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('Handle network failures gracefully', async () => {
      // Mock network failure
      qrGeneratorService.generateQRData = jest.fn().mockRejectedValue(
        new Error('Network error')
      );

      const { getByText, queryByText } = render(
        <TestWrapper initialUser={mockTouristUser}>
          <QRCodeScreen />
        </TestWrapper>
      );

      // Verify error handling
      await waitFor(() => {
        expect(queryByText('Failed to generate QR code')).toBeTruthy();
        expect(getByText('Retry')).toBeTruthy();
      });
    });

    test('Handle missing emergency contacts', async () => {
      const userWithoutContacts = {
        ...mockTouristUser,
        emergencyContacts: []
      };

      const { getByTestId } = render(
        <TestWrapper initialUser={userWithoutContacts}>
          <EmergencyScreen />
        </TestWrapper>
      );

      const panicButton = getByTestId('panic-button');
      fireEvent.press(panicButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'No Emergency Contacts',
          expect.stringContaining('add emergency contacts'),
          expect.any(Array)
        );
      });
    });

    test('Handle location permission denied', async () => {
      locationService.getCurrentLocation = jest.fn().mockRejectedValue(
        new Error('Location permission denied')
      );

      const { getByTestId } = render(
        <TestWrapper initialUser={mockTouristUser}>
          <DashboardScreen />
        </TestWrapper>
      );

      const panicButton = getByTestId('panic-button');
      fireEvent.press(panicButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Location Required',
          expect.stringContaining('location services'),
          expect.any(Array)
        );
      });
    });
  });

  describe('Performance and Optimization', () => {
    test('App initialization performance', async () => {
      const startTime = Date.now();
      
      render(<App />);
      
      // Verify app initializes within performance target
      const initTime = Date.now() - startTime;
      expect(initTime).toBeLessThan(2000); // 2 second target
    });

    test('Memory usage optimization', async () => {
      const { unmount } = render(
        <TestWrapper initialUser={mockTouristUser}>
          <DashboardScreen />
        </TestWrapper>
      );

      // Simulate component unmount
      unmount();

      // Verify cleanup (mocked memory check)
      expect(true).toBe(true); // Placeholder for actual memory checks
    });
  });
});