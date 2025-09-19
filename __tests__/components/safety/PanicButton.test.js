import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert, Vibration, Linking } from 'react-native';
import PanicButton from '../../../components/safety/PanicButton';
import { useSafety } from '../../../context/SafetyContext';
import { useLocation } from '../../../context/LocationContext';
import { useAuth } from '../../../context/AuthContext';
import { EMERGENCY_NUMBERS } from '../../../utils/constants';

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
    canOpenURL: jest.fn(),
    openURL: jest.fn()
  },
  Animated: {
    Value: jest.fn(() => ({
      setValue: jest.fn(),
      stopAnimation: jest.fn()
    })),
    timing: jest.fn(() => ({
      start: jest.fn()
    })),
    loop: jest.fn(() => ({
      start: jest.fn()
    })),
    sequence: jest.fn(),
    multiply: jest.fn()
  },
  Dimensions: {
    get: jest.fn(() => ({ width: 375, height: 812 }))
  }
}));

// Mock contexts
jest.mock('../../../context/SafetyContext');
jest.mock('../../../context/LocationContext');
jest.mock('../../../context/AuthContext');

// Mock constants
jest.mock('../../../utils/constants', () => ({
  EMERGENCY_NUMBERS: {
    POLICE: '100',
    MEDICAL: '108',
    FIRE: '101',
    TOURIST_HELPLINE: '1363'
  }
}));

describe('PanicButton Component', () => {
  const mockActivatePanicMode = jest.fn();
  const mockDeactivatePanicMode = jest.fn();
  const mockCurrentLocation = {
    latitude: 28.6139,
    longitude: 77.2090,
    accuracy: 10
  };
  const mockProfile = {
    userId: 'test-user',
    name: 'Test User',
    emergencyContacts: [
      { id: '1', name: 'Contact 1', phoneNumber: '+1234567890' },
      { id: '2', name: 'Contact 2', phoneNumber: '+0987654321' }
    ]
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Setup default context mocks
    useSafety.mockReturnValue({
      activatePanicMode: mockActivatePanicMode,
      deactivatePanicMode: mockDeactivatePanicMode,
      panicMode: false,
      isEmergencyActive: false
    });
    
    useLocation.mockReturnValue({
      currentLocation: mockCurrentLocation
    });
    
    useAuth.mockReturnValue({
      profile: mockProfile
    });

    // Mock Alert.alert to auto-confirm
    Alert.alert.mockImplementation((title, message, buttons) => {
      if (buttons && buttons.length > 0) {
        // Find and execute the first non-cancel button
        const actionButton = buttons.find(btn => btn.style !== 'cancel');
        if (actionButton && actionButton.onPress) {
          actionButton.onPress();
        }
      }
    });

    // Mock Linking
    Linking.canOpenURL.mockResolvedValue(true);
    Linking.openURL.mockResolvedValue(true);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Rendering', () => {
    it('should render panic button with default props', () => {
      const { getByText } = render(<PanicButton />);
      
      expect(getByText('PANIC\nBUTTON')).toBeTruthy();
    });

    it('should render with custom size', () => {
      const { getByText } = render(<PanicButton size="small" />);
      
      expect(getByText('PANIC\nBUTTON')).toBeTruthy();
    });

    it('should show emergency active state when panic mode is on', () => {
      useSafety.mockReturnValue({
        activatePanicMode: mockActivatePanicMode,
        deactivatePanicMode: mockDeactivatePanicMode,
        panicMode: true,
        isEmergencyActive: true
      });

      const { getByText } = render(<PanicButton />);
      
      expect(getByText('EMERGENCY\nACTIVE')).toBeTruthy();
    });
  });

  describe('Emergency Activation', () => {
    it('should show confirmation alert when pressed', () => {
      const { getByText } = render(<PanicButton />);
      const button = getByText('PANIC\nBUTTON');
      
      fireEvent.press(button);
      
      expect(Alert.alert).toHaveBeenCalledWith(
        'Emergency Alert',
        expect.stringContaining('This will send your location'),
        expect.arrayContaining([
          expect.objectContaining({ text: 'Cancel' }),
          expect.objectContaining({ text: 'Start Emergency' })
        ])
      );
    });

    it('should start countdown after confirmation', async () => {
      const { getByText } = render(<PanicButton />);
      const button = getByText('PANIC\nBUTTON');
      
      fireEvent.press(button);
      
      // Wait for countdown to start
      await waitFor(() => {
        expect(Vibration.vibrate).toHaveBeenCalled();
      });
    });

    it('should activate panic mode after countdown completes', async () => {
      mockActivatePanicMode.mockResolvedValue();
      
      const { getByText } = render(<PanicButton />);
      const button = getByText('PANIC\nBUTTON');
      
      fireEvent.press(button);
      
      // Fast-forward through countdown
      act(() => {
        jest.advanceTimersByTime(3000);
      });
      
      await waitFor(() => {
        expect(mockActivatePanicMode).toHaveBeenCalledWith(
          mockCurrentLocation,
          mockProfile,
          mockProfile.emergencyContacts
        );
      });
    });

    it('should show emergency screen after activation', async () => {
      mockActivatePanicMode.mockResolvedValue();
      
      const { getByText } = render(<PanicButton />);
      const button = getByText('PANIC\nBUTTON');
      
      fireEvent.press(button);
      
      act(() => {
        jest.advanceTimersByTime(3000);
      });
      
      await waitFor(() => {
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
    });
  });

  describe('Error Handling', () => {
    it('should show alert when location is not available', async () => {
      useLocation.mockReturnValue({
        currentLocation: null
      });
      
      const { getByText } = render(<PanicButton />);
      const button = getByText('PANIC\nBUTTON');
      
      fireEvent.press(button);
      
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
    });

    it('should show alert when no emergency contacts exist', async () => {
      useAuth.mockReturnValue({
        profile: {
          ...mockProfile,
          emergencyContacts: []
        }
      });
      
      const { getByText } = render(<PanicButton />);
      const button = getByText('PANIC\nBUTTON');
      
      fireEvent.press(button);
      
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

    it('should handle activation errors gracefully', async () => {
      mockActivatePanicMode.mockRejectedValue(new Error('Network error'));
      
      const { getByText } = render(<PanicButton />);
      const button = getByText('PANIC\nBUTTON');
      
      fireEvent.press(button);
      
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
  });

  describe('Emergency Calls', () => {
    it('should make emergency call when call button is pressed', async () => {
      const { getByText } = render(<PanicButton />);
      const button = getByText('PANIC\nBUTTON');
      
      fireEvent.press(button);
      
      act(() => {
        jest.advanceTimersByTime(3000);
      });
      
      // Simulate pressing "Call Police" button in emergency screen
      await waitFor(() => {
        expect(Linking.canOpenURL).toHaveBeenCalledWith('tel:100');
        expect(Linking.openURL).toHaveBeenCalledWith('tel:100');
      });
    });

    it('should handle unsupported phone calls', async () => {
      Linking.canOpenURL.mockResolvedValue(false);
      
      const { getByText } = render(<PanicButton />);
      const button = getByText('PANIC\nBUTTON');
      
      fireEvent.press(button);
      
      act(() => {
        jest.advanceTimersByTime(3000);
      });
      
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          'Phone calls are not supported on this device'
        );
      });
    });

    it('should handle call errors', async () => {
      Linking.openURL.mockRejectedValue(new Error('Call failed'));
      
      const { getByText } = render(<PanicButton />);
      const button = getByText('PANIC\nBUTTON');
      
      fireEvent.press(button);
      
      act(() => {
        jest.advanceTimersByTime(3000);
      });
      
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          'Failed to make emergency call'
        );
      });
    });
  });

  describe('Panic Mode Management', () => {
    it('should show deactivation options when already in panic mode', () => {
      useSafety.mockReturnValue({
        activatePanicMode: mockActivatePanicMode,
        deactivatePanicMode: mockDeactivatePanicMode,
        panicMode: true,
        isEmergencyActive: true
      });
      
      const { getByText } = render(<PanicButton />);
      const button = getByText('EMERGENCY\nACTIVE');
      
      fireEvent.press(button);
      
      expect(Alert.alert).toHaveBeenCalledWith(
        'Emergency Active',
        'Emergency mode is currently active. What would you like to do?',
        expect.arrayContaining([
          expect.objectContaining({ text: 'Call Police' }),
          expect.objectContaining({ text: 'Deactivate' }),
          expect.objectContaining({ text: 'Cancel' })
        ])
      );
    });

    it('should deactivate panic mode when deactivate is pressed', () => {
      useSafety.mockReturnValue({
        activatePanicMode: mockActivatePanicMode,
        deactivatePanicMode: mockDeactivatePanicMode,
        panicMode: true,
        isEmergencyActive: true
      });
      
      // Mock Alert to simulate pressing deactivate
      Alert.alert.mockImplementation((title, message, buttons) => {
        const deactivateButton = buttons.find(btn => btn.text === 'Deactivate');
        if (deactivateButton && deactivateButton.onPress) {
          deactivateButton.onPress();
        }
      });
      
      const { getByText } = render(<PanicButton />);
      const button = getByText('EMERGENCY\nACTIVE');
      
      fireEvent.press(button);
      
      expect(mockDeactivatePanicMode).toHaveBeenCalled();
    });
  });

  describe('Countdown Cancellation', () => {
    it('should cancel countdown when cancel button is pressed', async () => {
      const { getByText } = render(<PanicButton />);
      const button = getByText('PANIC\nBUTTON');
      
      fireEvent.press(button);
      
      // Wait for countdown to start and cancel button to appear
      await waitFor(() => {
        const cancelButton = getByText('Cancel');
        fireEvent.press(cancelButton);
      });
      
      // Verify countdown was cancelled
      expect(mockActivatePanicMode).not.toHaveBeenCalled();
    });

    it('should cancel countdown when button is pressed again during countdown', async () => {
      const { getByText } = render(<PanicButton />);
      const button = getByText('PANIC\nBUTTON');
      
      fireEvent.press(button);
      
      // Press button again to cancel
      fireEvent.press(button);
      
      // Advance time to ensure countdown would have completed
      act(() => {
        jest.advanceTimersByTime(5000);
      });
      
      expect(mockActivatePanicMode).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should be accessible with proper button behavior', () => {
      const { getByText } = render(<PanicButton />);
      const button = getByText('PANIC\nBUTTON');
      
      expect(button).toBeTruthy();
      
      // Test press events
      fireEvent(button, 'pressIn');
      fireEvent(button, 'pressOut');
      fireEvent.press(button);
      
      // Should not crash and should handle events properly
      expect(Alert.alert).toHaveBeenCalled();
    });

    it('should handle different button sizes', () => {
      const sizes = ['small', 'medium', 'large'];
      
      sizes.forEach(size => {
        const { getByText } = render(<PanicButton size={size} />);
        expect(getByText('PANIC\nBUTTON')).toBeTruthy();
      });
    });
  });
});