import * as SMS from 'expo-sms';
import { Linking } from 'react-native';
import { messagingService } from '../firebase/messaging';
import { firestoreService } from '../firebase/firestore';
import { EMERGENCY_NUMBERS, NOTIFICATION_TYPES } from '../../utils/constants';

export const emergencyAlertService = {
  // Send emergency alert to all contacts
  sendEmergencyAlert: async (location, userProfile, emergencyContacts, customMessage = null) => {
    try {
      const results = {
        smsResults: [],
        notificationResults: [],
        firestoreResults: [],
        success: false,
        errors: []
      };

      // Prepare emergency message
      const emergencyMessage = customMessage || createEmergencyMessage(location, userProfile);
      
      // Send SMS to emergency contacts
      if (emergencyContacts && emergencyContacts.length > 0) {
        const smsResults = await sendEmergencySMS(emergencyContacts, emergencyMessage, location);
        results.smsResults = smsResults;
      }

      // Send push notifications
      const notificationResult = await sendEmergencyNotification(emergencyMessage, location);
      results.notificationResults.push(notificationResult);

      // Log emergency event to Firestore
      const firestoreResult = await logEmergencyEvent(userProfile.id, location, emergencyContacts, emergencyMessage);
      results.firestoreResults.push(firestoreResult);

      // Send location to emergency services (if configured)
      await notifyEmergencyServices(location, userProfile);

      results.success = true;
      return results;

    } catch (error) {
      console.error('Error sending emergency alert:', error);
      return {
        success: false,
        error: error.message,
        smsResults: [],
        notificationResults: [],
        firestoreResults: []
      };
    }
  },

  // Send quick emergency call
  makeEmergencyCall: async (emergencyNumber = EMERGENCY_NUMBERS.POLICE) => {
    try {
      const url = `tel:${emergencyNumber}`;
      const canOpen = await Linking.canOpenURL(url);
      
      if (canOpen) {
        await Linking.openURL(url);
        return { success: true };
      } else {
        return { success: false, error: 'Phone calls not supported on this device' };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Send location update during active emergency
  sendLocationUpdate: async (location, emergencyId, userProfile) => {
    try {
      const updateMessage = `LOCATION UPDATE: I am now at ${location.latitude}, ${location.longitude}. Time: ${new Date().toLocaleString()}`;
      
      // Update Firestore with new location
      const updateResult = await firestoreService.updateDocument('emergencies', emergencyId, {
        currentLocation: location,
        lastLocationUpdate: new Date(),
        locationHistory: firestoreService.arrayUnion({
          location,
          timestamp: new Date()
        })
      });

      // Send notification to user
      await messagingService.scheduleNotification(
        'Location Updated',
        'Your location has been shared with emergency contacts.',
        { type: NOTIFICATION_TYPES.LOCATION_UPDATE, location }
      );

      return { success: true, updateResult };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Get emergency message templates
  getMessageTemplates: () => {
    return {
      medical: "MEDICAL EMERGENCY: I need immediate medical assistance. Please call emergency services and come to my location.",
      safety: "SAFETY EMERGENCY: I am in danger and need help immediately. Please contact police and emergency services.",
      lost: "HELP: I am lost and need assistance finding my way back. Please help me or contact local authorities.",
      accident: "ACCIDENT: I have been in an accident and need help. Please call emergency services immediately.",
      custom: "EMERGENCY: I need help immediately. Please contact emergency services and come to my assistance."
    };
  },

  // Check SMS availability
  checkSMSAvailability: async () => {
    try {
      const isAvailable = await SMS.isAvailableAsync();
      return { available: isAvailable };
    } catch (error) {
      return { available: false, error: error.message };
    }
  }
};

// Helper function to create emergency message
const createEmergencyMessage = (location, userProfile) => {
  const timestamp = new Date().toLocaleString();
  const locationUrl = `https://maps.google.com/?q=${location.latitude},${location.longitude}`;
  
  return `🚨 EMERGENCY ALERT 🚨
${userProfile.name} needs immediate help!

Location: ${location.latitude}, ${location.longitude}
Address: ${location.address || 'Address not available'}
Time: ${timestamp}

View on map: ${locationUrl}

Emergency Numbers:
Police: ${EMERGENCY_NUMBERS.POLICE}
Medical: ${EMERGENCY_NUMBERS.MEDICAL}
Tourist Helpline: ${EMERGENCY_NUMBERS.TOURIST_HELPLINE}

This is an automated emergency alert from Tourist Safety App.`;
};

// Helper function to send SMS to emergency contacts
const sendEmergencySMS = async (emergencyContacts, message, location) => {
  const results = [];
  
  try {
    const isAvailable = await SMS.isAvailableAsync();
    
    if (!isAvailable) {
      return [{ success: false, error: 'SMS not available on this device' }];
    }

    // Send to primary contact first
    const primaryContact = emergencyContacts.find(contact => contact.isPrimary);
    if (primaryContact) {
      const result = await sendSMSToContact(primaryContact, message);
      results.push({ contact: primaryContact, ...result });
    }

    // Send to other contacts
    const otherContacts = emergencyContacts.filter(contact => !contact.isPrimary);
    for (const contact of otherContacts) {
      const result = await sendSMSToContact(contact, message);
      results.push({ contact: contact, ...result });
      
      // Add small delay between SMS sends
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return results;
  } catch (error) {
    return [{ success: false, error: error.message }];
  }
};

// Helper function to send SMS to individual contact
const sendSMSToContact = async (contact, message) => {
  try {
    const result = await SMS.sendSMSAsync(
      [contact.phoneNumber],
      message
    );
    
    return { 
      success: result.result === 'sent',
      result: result.result,
      phoneNumber: contact.phoneNumber
    };
  } catch (error) {
    return { 
      success: false, 
      error: error.message,
      phoneNumber: contact.phoneNumber
    };
  }
};

// Helper function to send emergency notification
const sendEmergencyNotification = async (message, location) => {
  try {
    const result = await messagingService.scheduleNotification(
      '🚨 Emergency Alert Sent',
      'Your emergency contacts have been notified with your current location.',
      { 
        type: NOTIFICATION_TYPES.EMERGENCY,
        location,
        timestamp: new Date().toISOString()
      }
    );
    
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Helper function to log emergency event
const logEmergencyEvent = async (userId, location, emergencyContacts, message) => {
  try {
    const emergencyData = {
      userId,
      type: 'panic_button',
      location,
      message,
      emergencyContacts: emergencyContacts.map(contact => ({
        id: contact.id,
        name: contact.name,
        phoneNumber: contact.phoneNumber,
        relationship: contact.relationship,
        isPrimary: contact.isPrimary
      })),
      timestamp: new Date(),
      status: 'active',
      locationHistory: [{ location, timestamp: new Date() }],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await firestoreService.addDocument('emergencies', emergencyData);
    return { success: true, emergencyId: result.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Helper function to notify emergency services (placeholder for future integration)
const notifyEmergencyServices = async (location, userProfile) => {
  try {
    // This would integrate with local emergency services APIs
    // For now, we'll just log the event
    console.log('Emergency services notified:', {
      location,
      user: userProfile.name,
      timestamp: new Date()
    });
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};