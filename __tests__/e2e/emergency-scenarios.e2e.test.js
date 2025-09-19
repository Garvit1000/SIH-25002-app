import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert, Vibration } from 'react-native';
import DashboardScreen from '../../screens/DashboardScreen';
import PanicButton from '../../components/safety/PanicButton';
import EmergencyScreen from '../../screens/EmergencyScreen';
import { AuthContext } from '../../context/AuthContext';
import { LocationContext } from '../../context/LocationContext';
import { SafetyContext } from '../../context/SafetyContext';
import { emergencyAlertService } from '../../services/emergency/alertService';
import { geoLocationService } from '../../services/location/geoLocation';
import { messagingService } from '../../services/firebase/messaging';

// Mock services
jest.mock('../../services/emergency/alertService');
jest.mock('../../services/location/geoLocation');
jest.mock('../../services/firebase/messaging');

// Mock React Native modules
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Alert: {
    alert: jest.fn()
  },
  Vibration: {
    vibrate: jest.fn()
  },
  Linking: {
    canOpenURL: jest.fn().mockResolvedValue(true),
    openURL: jest.fn().mockResolvedValue(true)
  }
}));

describe('Emergency Scenarios End-to-End Tests', () => {
  const mockUser = {
    uid: 'test-user-123',
    email: 'test@example.com',
    name: 'Test User'
  };

  const mockProfile = {
    userId: 'test-user-123',
    name: 'Test User',
    nationality: 'US',
    passportNumber: 'US1234567890',
    phoneNumber: '+1234567890',
    emergencyContacts: [
      {
        id: 'contact-1',
        name: 'Emergency Contact 1',
        phoneNumber: '+1111111111',
        relationship: 'spouse',
        isPrimary: true
      },
      {
        id: 'contact-2',
        name: 'Emergency Contact 2',
        phoneNumber: '+2222222222',
        relationship: 'parent',
        isPrimary: false
      }
    ],
    medicalInfo: {
      bloodType: 'O+',
      allergies: ['Peanuts'],
      medications: ['Aspirin'],
      conditions: []
    }
  };

  const mockLocation = {
    latitude: 28.6139,
    longitude: 77.2090,
    accuracy: 10,
    address: 'New Delhi, India',
    timestamp: new Date()
  };

  const mockSafetyContext = {
    panicMode: false,
    isEmergencyActive: false,
    activatePanicMode: jest.fn(),
    deactivatePanicMode: jest.fn(),
    safetyScore: 85,
    currentSafetyZone: 'safe'
  };

  const mockLocationContext = {
    currentLocation: mockLocation,
    locationPermission: 'granted',
    isTracking: true,
    startTracking: jest.fn(),
    stopTracking: jest.fn()
  };

  const mockAuthContext = {
    user: mockUser,
    profile: mockProfile,
    isAuthenticated: true,
    loading: false
  };

  const renderWithContexts = (component) => {
    return render(
      <AuthContext.Provider value={mockAuthContext}>
        <LocationContext.Provider value={mockLocationContext}>
          <SafetyContext.Provider value={mockSafetyContext}>
            {component}
          </SafetyContext.Provider>
        </LocationContext.Provider>
      </AuthContext.Provider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Setup service mocks
    emergencyAlertService.sendEmergencyAlert.mockResolvedValue({
      success: true,
      smsResults: [
        { success: true, contact: mockProfile.emergencyContacts[0] },
        { success: true, contact: mockProfile.emergencyContacts[1] }
      ],
      notificationResults: [{ success: true }],
      firestoreResults: [{ success: true, emergencyId: 'emergency-123' }]
    });

    geoLocationService.getCurrentLocation.mockResolvedValue({
      success: true,
      location: mockLocation
    });

    messagingService.scheduleNotification.mockResolvedValue({
      success: true
    });

    // Mock Alert.alert to auto-confirm emergency actions
    Alert.alert.mockImplementation((title, message, buttons) => {
      if (buttons && buttons.length > 0) {
        const actionButton = buttons.find(btn => btn.style !== 'cancel' && btn.text !== 'Cancel');
        if (actionButton && actionButton.onPress) {
          actionButton.onPress();
        }
      }
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Complete Emergency Activation Flow', () => {
    it('should complete full emergency activation from dashboard', async () => {
      const { getByTestId } = renderWithContexts(<DashboardScreen />);
      
      // Find and press panic button
      const panicButton = getByTestId('panic-button');
      expect(panicButton).toBeTruthy();
      
      // Press panic button to start emergency
      fireEvent.press(panicButton);
      
      // Confirm emergency activation
      expect(Alert.alert).toHaveBeenCalledWith(
        'Emergency Alert',
        expect.stringContaining('This will send your location'),
        expect.arrayContaining([
          expect.objectContaining({ text: 'Start Emergency' })
        ])
      );
      
      // Wait for countdown to complete
      act(() => {
        jest.advanceTimersByTime(3000);
      });
      
      // Verify emergency services were called
      await waitFor(() => {
        expect(emergencyAlertService.sendEmergencyAlert).toHaveBeenCalledWith(
          mockLocation,
          mockProfile,
          mockProfile.emergencyContacts
        );
      });
      
      // Verify vibration was triggered
      expect(Vibration.vibrate).toHaveBeenCalled();
      
      // Verify emergency screen is shown
      expect(Alert.alert).toHaveBeenCalledWith(
        '🚨 EMERGENCY ACTIVATED',
        expect.stringContaining('Emergency contacts have been notified'),
        expect.arrayContaining([
          expect.objectContaining({ text: 'Call Police' }),
          expect.objectContaining({ text: 'Call Medical' }),
          expect.objectContaining({ text: 'Deactivate' })
        ]),
        { cancelable: false }
      );
    });

    it('should handle emergency activation with location services disabled', async () => {
      // Mock location service failure
      mockLocationContext.currentLocation = null;
      geoLocationService.getCurrentLocation.mockResolvedValue({
        success: false,
        error: 'Location services disabled'
      });
      
      const { getByTestId } = renderWithContexts(<DashboardScreen />);
      
      const panicButton = getByTestId('panic-button');
      fireEvent.press(panicButton);
      
      act(() => {
        jest.advanceTimersByTime(3000);
      });
      
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Location Required',
          expect.stringContaining('Location access is required'),
          [{ text: 'OK' }]
        );
      });
      
      expect(emergencyAlertService.sendEmergencyAlert).not.toHaveBeenCalled();
    });

    it('should handle emergency activation with no emergency contacts', async () => {
      // Mock profile with no emergency contacts
      const profileWithoutContacts = {
        ...mockProfile,
        emergencyContacts: []
      };
      
      const contextWithoutContacts = {
        ...mockAuthContext,
        profile: profileWithoutContacts
      };
      
      const { getByTestId } = render(
        <AuthContext.Provider value={contextWithoutContacts}>
          <LocationContext.Provider value={mockLocationContext}>
            <SafetyContext.Provider value={mockSafetyContext}>
              <DashboardScreen />
            </SafetyContext.Provider>
          </LocationContext.Provider>
        </AuthContext.Provider>
      );
      
      const panicButton = getByTestId('panic-button');
      fireEvent.press(panicButton);
      
      act(() => {
        jest.advanceTimersByTime(3000);
      });
      
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'No Emergency Contacts',
          expect.stringContaining('Please add emergency contacts'),
          [{ text: 'OK' }]
        );
      });
    });
  });

  describe('Emergency Communication Flow', () => {
    it('should send SMS and notifications to all emergency contacts', async () => {
      const { getByTestId } = renderWithContexts(<DashboardScreen />);
      
      const panicButton = getByTestId('panic-button');
      fireEvent.press(panicButton);
      
      act(() => {
        jest.advanceTimersByTime(3000);
      });
      
      await waitFor(() => {
        expect(emergencyAlertService.sendEmergencyAlert).toHaveBeenCalledWith(
          mockLocation,
          mockProfile,
          mockProfile.emergencyContacts
        );
      });
      
      // Verify SMS was sent to all contacts
      const alertCall = emergencyAlertService.sendEmergencyAlert.mock.calls[0];
      const [location, profile, contacts] = alertCall;
      
      expect(contacts).toHaveLength(2);
      expect(contacts[0].isPrimary).toBe(true);
      expect(contacts[1].isPrimary).toBe(false);
    });

    it('should handle partial communication failures', async () => {
      // Mock partial failure in emergency alert service
      emergencyAlertService.sendEmergencyAlert.mockResolvedValue({
        success: true,
        smsResults: [
          { success: true, contact: mockProfile.emergencyContacts[0] },
          { success: false, contact: mockProfile.emergencyContacts[1], error: 'SMS failed' }
        ],
        notificationResults: [{ success: true }],
        firestoreResults: [{ success: true, emergencyId: 'emergency-123' }]
      });
      
      const { getByTestId } = renderWithContexts(<DashboardScreen />);
      
      const panicButton = getByTestId('panic-button');
      fireEvent.press(panicButton);
      
      act(() => {
        jest.advanceTimersByTime(3000);
      });
      
      await waitFor(() => {
        expect(emergencyAlertService.sendEmergencyAlert).toHaveBeenCalled();
      });
      
      // Emergency should still be activated even with partial failures
      expect(Alert.alert).toHaveBeenCalledWith(
        '🚨 EMERGENCY ACTIVATED',
        expect.stringContaining('Emergency contacts have been notified'),
        expect.any(Array),
        { cancelable: false }
      );
    });
  });

  describe('Location Tracking During Emergency', () => {
    it('should continuously track and share location during active emergency', async () => {
      mockSafetyContext.panicMode = true;
      mockSafetyContext.isEmergencyActive = true;
      
      const { getByTestId } = renderWithContexts(<EmergencyScreen />);
      
      // Simulate location updates during emergency
      const updatedLocation = {
        ...mockLocation,
        latitude: 28.6140,
        longitude: 77.2091,
        timestamp: new Date()
      };
      
      // Mock location service to return updated location
      geoLocationService.getCurrentLocation.mockResolvedValue({
        success: true,
        location: updatedLocation
      });
      
      // Simulate location update
      act(() => {
        mockLocationContext.currentLocation = updatedLocation;
      });
      
      // Verify location sharing service is called
      await waitFor(() => {
        expect(emergencyAlertService.sendLocationUpdate).toHaveBeenCalledWith(
          updatedLocation,
          expect.any(String),
          mockProfile
        );
      });
    });

    it('should handle location tracking failures during emergency', async () => {
      mockSafetyContext.panicMode = true;
      
      // Mock location service failure
      geoLocationService.getCurrentLocation.mockResolvedValue({
        success: false,
        error: 'GPS signal lost'
      });
      
      const { getByTestId } = renderWithContexts(<EmergencyScreen />);
      
      // Should still maintain emergency state even with location failures
      expect(getByTestId('emergency-status')).toBeTruthy();
      expect(getByTestId('emergency-contacts-list')).toBeTruthy();
    });
  });

  describe('Emergency Deactivation Flow', () => {
    it('should deactivate emergency when requested', async () => {
      mockSafetyContext.panicMode = true;
      mockSafetyContext.isEmergencyActive = true;
      
      const { getByTestId } = renderWithContexts(<EmergencyScreen />);
      
      const deactivateButton = getByTestId('deactivate-emergency-button');
      fireEvent.press(deactivateButton);
      
      // Confirm deactivation
      expect(Alert.alert).toHaveBeenCalledWith(
        'Deactivate Emergency',
        expect.stringContaining('Are you sure you want to deactivate'),
        expect.arrayContaining([
          expect.objectContaining({ text: 'Deactivate' })
        ])
      );
      
      await waitFor(() => {
        expect(mockSafetyContext.deactivatePanicMode).toHaveBeenCalled();
      });
    });

    it('should send deactivation notification to emergency contacts', async () => {
      mockSafetyContext.panicMode = true;
      
      const { getByTestId } = renderWithContexts(<EmergencyScreen />);
      
      const deactivateButton = getByTestId('deactivate-emergency-button');
      fireEvent.press(deactivateButton);
      
      await waitFor(() => {
        expect(emergencyAlertService.sendEmergencyAlert).toHaveBeenCalledWith(
          mockLocation,
          mockProfile,
          mockProfile.emergencyContacts,
          expect.stringContaining('EMERGENCY DEACTIVATED')
        );
      });
    });
  });

  describe('Medical Information Display', () => {
    it('should display medical information during emergency', async () => {
      mockSafetyContext.panicMode = true;
      
      const { getByText } = renderWithContexts(<EmergencyScreen />);
      
      // Verify medical information is displayed
      expect(getByText('Blood Type: O+')).toBeTruthy();
      expect(getByText('Allergies: Peanuts')).toBeTruthy();
      expect(getByText('Medications: Aspirin')).toBeTruthy();
    });

    it('should handle missing medical information', async () => {
      const profileWithoutMedical = {
        ...mockProfile,
        medicalInfo: null
      };
      
      const contextWithoutMedical = {
        ...mockAuthContext,
        profile: profileWithoutMedical
      };
      
      mockSafetyContext.panicMode = true;
      
      const { getByText } = render(
        <AuthContext.Provider value={contextWithoutMedical}>
          <LocationContext.Provider value={mockLocationContext}>
            <SafetyContext.Provider value={mockSafetyContext}>
              <EmergencyScreen />
            </SafetyContext.Provider>
          </LocationContext.Provider>
        </AuthContext.Provider>
      );
      
      expect(getByText('No medical information available')).toBeTruthy();
    });
  });

  describe('Network Connectivity Issues', () => {
    it('should handle offline emergency activation', async () => {
      // Mock network failure
      emergencyAlertService.sendEmergencyAlert.mockRejectedValue(
        new Error('Network request failed')
      );
      
      const { getByTestId } = renderWithContexts(<DashboardScreen />);
      
      const panicButton = getByTestId('panic-button');
      fireEvent.press(panicButton);
      
      act(() => {
        jest.advanceTimersByTime(3000);
      });
      
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          'Failed to send emergency alert. Please try again.'
        );
      });
    });

    it('should queue emergency alerts for retry when network returns', async () => {
      // First attempt fails, second succeeds
      emergencyAlertService.sendEmergencyAlert
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          success: true,
          smsResults: [{ success: true }]
        });
      
      const { getByTestId } = renderWithContexts(<DashboardScreen />);
      
      const panicButton = getByTestId('panic-button');
      
      // First attempt
      fireEvent.press(panicButton);
      act(() => {
        jest.advanceTimersByTime(3000);
      });
      
      await waitFor(() => {
        expect(emergencyAlertService.sendEmergencyAlert).toHaveBeenCalledTimes(1);
      });
      
      // Retry
      fireEvent.press(panicButton);
      act(() => {
        jest.advanceTimersByTime(3000);
      });
      
      await waitFor(() => {
        expect(emergencyAlertService.sendEmergencyAlert).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Accessibility During Emergency', () => {
    it('should maintain accessibility features during emergency', async () => {
      mockSafetyContext.panicMode = true;
      
      const { getByTestId, getByLabelText } = renderWithContexts(<EmergencyScreen />);
      
      // Verify accessibility labels are present
      expect(getByLabelText('Emergency status indicator')).toBeTruthy();
      expect(getByLabelText('Call emergency services')).toBeTruthy();
      expect(getByLabelText('Deactivate emergency mode')).toBeTruthy();
    });

    it('should provide voice feedback for emergency actions', async () => {
      const { getByTestId } = renderWithContexts(<DashboardScreen />);
      
      const panicButton = getByTestId('panic-button');
      
      // Verify panic button has proper accessibility properties
      expect(panicButton.props.accessibilityLabel).toContain('Emergency panic button');
      expect(panicButton.props.accessibilityHint).toContain('Activates emergency alert');
    });
  });
});