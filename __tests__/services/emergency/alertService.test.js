import { emergencyAlertService } from '../../../services/emergency/alertService';
import * as SMS from 'expo-sms';
import { Linking } from 'react-native';
import { messagingService } from '../../../services/firebase/messaging';
import { firestoreService } from '../../../services/firebase/firestore';
import { EMERGENCY_NUMBERS, NOTIFICATION_TYPES } from '../../../utils/constants';

// Mock dependencies
jest.mock('expo-sms');
jest.mock('react-native', () => ({
  Linking: {
    canOpenURL: jest.fn(),
    openURL: jest.fn()
  }
}));
jest.mock('../../../services/firebase/messaging');
jest.mock('../../../services/firebase/firestore');
jest.mock('../../../utils/constants', () => ({
  EMERGENCY_NUMBERS: {
    POLICE: '100',
    MEDICAL: '108',
    FIRE: '101',
    TOURIST_HELPLINE: '1363'
  },
  NOTIFICATION_TYPES: {
    EMERGENCY: 'emergency',
    LOCATION_UPDATE: 'location_update'
  }
}));

describe('Emergency Alert Service', () => {
  const mockLocation = {
    latitude: 28.6139,
    longitude: 77.2090,
    address: 'New Delhi, India'
  };

  const mockUserProfile = {
    id: 'user-123',
    name: 'John Doe',
    phoneNumber: '+1234567890'
  };

  const mockEmergencyContacts = [
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
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    SMS.isAvailableAsync.mockResolvedValue(true);
    SMS.sendSMSAsync.mockResolvedValue({ result: 'sent' });
    messagingService.scheduleNotification.mockResolvedValue({ success: true });
    firestoreService.addDocument.mockResolvedValue({ id: 'emergency-123' });
    firestoreService.updateDocument.mockResolvedValue({ success: true });
    firestoreService.arrayUnion.mockReturnValue([]);
    Linking.canOpenURL.mockResolvedValue(true);
    Linking.openURL.mockResolvedValue(true);
  });

  describe('sendEmergencyAlert', () => {
    it('should send emergency alert successfully', async () => {
      const result = await emergencyAlertService.sendEmergencyAlert(
        mockLocation,
        mockUserProfile,
        mockEmergencyContacts
      );

      expect(result.success).toBe(true);
      expect(result.smsResults).toHaveLength(2);
      expect(result.notificationResults).toHaveLength(1);
      expect(result.firestoreResults).toHaveLength(1);
    });

    it('should send SMS to primary contact first', async () => {
      await emergencyAlertService.sendEmergencyAlert(
        mockLocation,
        mockUserProfile,
        mockEmergencyContacts
      );

      expect(SMS.sendSMSAsync).toHaveBeenCalledTimes(2);
      
      // First call should be to primary contact
      const firstCall = SMS.sendSMSAsync.mock.calls[0];
      expect(firstCall[0]).toEqual(['+1111111111']);
    });

    it('should include location and emergency numbers in message', async () => {
      await emergencyAlertService.sendEmergencyAlert(
        mockLocation,
        mockUserProfile,
        mockEmergencyContacts
      );

      const messageCall = SMS.sendSMSAsync.mock.calls[0];
      const message = messageCall[1];
      
      expect(message).toContain('🚨 EMERGENCY ALERT 🚨');
      expect(message).toContain(mockUserProfile.name);
      expect(message).toContain(mockLocation.latitude.toString());
      expect(message).toContain(mockLocation.longitude.toString());
      expect(message).toContain(EMERGENCY_NUMBERS.POLICE);
      expect(message).toContain(EMERGENCY_NUMBERS.MEDICAL);
    });

    it('should use custom message when provided', async () => {
      const customMessage = 'Custom emergency message';
      
      await emergencyAlertService.sendEmergencyAlert(
        mockLocation,
        mockUserProfile,
        mockEmergencyContacts,
        customMessage
      );

      const messageCall = SMS.sendSMSAsync.mock.calls[0];
      expect(messageCall[1]).toBe(customMessage);
    });

    it('should handle SMS unavailability', async () => {
      SMS.isAvailableAsync.mockResolvedValue(false);

      const result = await emergencyAlertService.sendEmergencyAlert(
        mockLocation,
        mockUserProfile,
        mockEmergencyContacts
      );

      expect(result.success).toBe(true);
      expect(result.smsResults[0].success).toBe(false);
      expect(result.smsResults[0].error).toBe('SMS not available on this device');
    });

    it('should handle SMS sending errors', async () => {
      SMS.sendSMSAsync.mockRejectedValue(new Error('SMS sending failed'));

      const result = await emergencyAlertService.sendEmergencyAlert(
        mockLocation,
        mockUserProfile,
        mockEmergencyContacts
      );

      expect(result.success).toBe(true);
      expect(result.smsResults[0].success).toBe(false);
      expect(result.smsResults[0].error).toBe('SMS sending failed');
    });

    it('should log emergency event to Firestore', async () => {
      await emergencyAlertService.sendEmergencyAlert(
        mockLocation,
        mockUserProfile,
        mockEmergencyContacts
      );

      expect(firestoreService.addDocument).toHaveBeenCalledWith(
        'emergencies',
        expect.objectContaining({
          userId: mockUserProfile.id,
          type: 'panic_button',
          location: mockLocation,
          status: 'active'
        })
      );
    });

    it('should send push notification', async () => {
      await emergencyAlertService.sendEmergencyAlert(
        mockLocation,
        mockUserProfile,
        mockEmergencyContacts
      );

      expect(messagingService.scheduleNotification).toHaveBeenCalledWith(
        '🚨 Emergency Alert Sent',
        'Your emergency contacts have been notified with your current location.',
        expect.objectContaining({
          type: NOTIFICATION_TYPES.EMERGENCY,
          location: mockLocation
        })
      );
    });

    it('should handle empty emergency contacts', async () => {
      const result = await emergencyAlertService.sendEmergencyAlert(
        mockLocation,
        mockUserProfile,
        []
      );

      expect(result.success).toBe(true);
      expect(result.smsResults).toHaveLength(0);
      expect(SMS.sendSMSAsync).not.toHaveBeenCalled();
    });

    it('should handle service errors gracefully', async () => {
      firestoreService.addDocument.mockRejectedValue(new Error('Firestore error'));

      const result = await emergencyAlertService.sendEmergencyAlert(
        mockLocation,
        mockUserProfile,
        mockEmergencyContacts
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Firestore error');
    });
  });

  describe('makeEmergencyCall', () => {
    it('should make emergency call successfully', async () => {
      const result = await emergencyAlertService.makeEmergencyCall(EMERGENCY_NUMBERS.POLICE);

      expect(result.success).toBe(true);
      expect(Linking.canOpenURL).toHaveBeenCalledWith('tel:100');
      expect(Linking.openURL).toHaveBeenCalledWith('tel:100');
    });

    it('should use default police number when no number provided', async () => {
      await emergencyAlertService.makeEmergencyCall();

      expect(Linking.canOpenURL).toHaveBeenCalledWith('tel:100');
    });

    it('should handle unsupported phone calls', async () => {
      Linking.canOpenURL.mockResolvedValue(false);

      const result = await emergencyAlertService.makeEmergencyCall();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Phone calls not supported on this device');
    });

    it('should handle call errors', async () => {
      Linking.openURL.mockRejectedValue(new Error('Call failed'));

      const result = await emergencyAlertService.makeEmergencyCall();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Call failed');
    });
  });

  describe('sendLocationUpdate', () => {
    const mockEmergencyId = 'emergency-123';

    it('should send location update successfully', async () => {
      const result = await emergencyAlertService.sendLocationUpdate(
        mockLocation,
        mockEmergencyId,
        mockUserProfile
      );

      expect(result.success).toBe(true);
      expect(firestoreService.updateDocument).toHaveBeenCalledWith(
        'emergencies',
        mockEmergencyId,
        expect.objectContaining({
          currentLocation: mockLocation,
          lastLocationUpdate: expect.any(Date)
        })
      );
    });

    it('should send location update notification', async () => {
      await emergencyAlertService.sendLocationUpdate(
        mockLocation,
        mockEmergencyId,
        mockUserProfile
      );

      expect(messagingService.scheduleNotification).toHaveBeenCalledWith(
        'Location Updated',
        'Your location has been shared with emergency contacts.',
        expect.objectContaining({
          type: NOTIFICATION_TYPES.LOCATION_UPDATE,
          location: mockLocation
        })
      );
    });

    it('should handle location update errors', async () => {
      firestoreService.updateDocument.mockRejectedValue(new Error('Update failed'));

      const result = await emergencyAlertService.sendLocationUpdate(
        mockLocation,
        mockEmergencyId,
        mockUserProfile
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Update failed');
    });
  });

  describe('getMessageTemplates', () => {
    it('should return predefined message templates', () => {
      const templates = emergencyAlertService.getMessageTemplates();

      expect(templates).toHaveProperty('medical');
      expect(templates).toHaveProperty('safety');
      expect(templates).toHaveProperty('lost');
      expect(templates).toHaveProperty('accident');
      expect(templates).toHaveProperty('custom');
      
      expect(templates.medical).toContain('MEDICAL EMERGENCY');
      expect(templates.safety).toContain('SAFETY EMERGENCY');
      expect(templates.lost).toContain('HELP: I am lost');
    });

    it('should have appropriate content for each template', () => {
      const templates = emergencyAlertService.getMessageTemplates();

      Object.values(templates).forEach(template => {
        expect(typeof template).toBe('string');
        expect(template.length).toBeGreaterThan(0);
      });
    });
  });

  describe('checkSMSAvailability', () => {
    it('should check SMS availability successfully', async () => {
      SMS.isAvailableAsync.mockResolvedValue(true);

      const result = await emergencyAlertService.checkSMSAvailability();

      expect(result.available).toBe(true);
      expect(SMS.isAvailableAsync).toHaveBeenCalled();
    });

    it('should handle SMS unavailability', async () => {
      SMS.isAvailableAsync.mockResolvedValue(false);

      const result = await emergencyAlertService.checkSMSAvailability();

      expect(result.available).toBe(false);
    });

    it('should handle SMS check errors', async () => {
      SMS.isAvailableAsync.mockRejectedValue(new Error('SMS check failed'));

      const result = await emergencyAlertService.checkSMSAvailability();

      expect(result.available).toBe(false);
      expect(result.error).toBe('SMS check failed');
    });
  });

  describe('Edge Cases', () => {
    it('should handle null location gracefully', async () => {
      const result = await emergencyAlertService.sendEmergencyAlert(
        null,
        mockUserProfile,
        mockEmergencyContacts
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle null user profile gracefully', async () => {
      const result = await emergencyAlertService.sendEmergencyAlert(
        mockLocation,
        null,
        mockEmergencyContacts
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle contacts with missing phone numbers', async () => {
      const invalidContacts = [
        {
          id: 'contact-1',
          name: 'Contact Without Phone',
          phoneNumber: null,
          isPrimary: true
        }
      ];

      const result = await emergencyAlertService.sendEmergencyAlert(
        mockLocation,
        mockUserProfile,
        invalidContacts
      );

      // Should still succeed but SMS should fail
      expect(result.success).toBe(true);
      expect(result.smsResults[0].success).toBe(false);
    });
  });
});