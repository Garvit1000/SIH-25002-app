import { messagingService } from '../firebase/messaging';
import { firestoreService } from '../firebase/firestore';
import { emergencyAlertService } from './alertService';
import { NOTIFICATION_TYPES } from '../../utils/constants';

export const locationSharingService = {
  // Start automatic location sharing during emergency
  startEmergencyLocationSharing: async (emergencyId, userProfile, emergencyContacts, initialLocation) => {
    try {
      // Create location sharing session
      const locationSession = {
        emergencyId,
        userId: userProfile.id,
        contacts: emergencyContacts.map(contact => ({
          id: contact.id,
          name: contact.name,
          phoneNumber: contact.phoneNumber,
          relationship: contact.relationship
        })),
        startTime: new Date(),
        isActive: true,
        locationHistory: [{
          location: initialLocation,
          timestamp: new Date(),
          shared: false
        }],
        shareInterval: 300000, // 5 minutes
        lastSharedAt: new Date(),
        createdAt: new Date()
      };

      const result = await firestoreService.addDocument('locationSessions', locationSession);
      
      if (result.success) {
        // Send initial location to contacts
        await shareLocationWithContacts(emergencyContacts, initialLocation, userProfile, true);
        
        // Schedule periodic location updates
        scheduleLocationUpdates(result.id, emergencyContacts, userProfile);
        
        return { success: true, sessionId: result.id };
      }
      
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Update location during active emergency
  updateEmergencyLocation: async (sessionId, newLocation, userProfile, emergencyContacts) => {
    try {
      // Update location session
      const updateResult = await firestoreService.updateDocument('locationSessions', sessionId, {
        locationHistory: firestoreService.arrayUnion({
          location: newLocation,
          timestamp: new Date(),
          shared: false
        }),
        lastLocationUpdate: new Date()
      });

      if (updateResult.success) {
        // Check if we should share this location update
        const shouldShare = await shouldShareLocationUpdate(sessionId);
        
        if (shouldShare) {
          await shareLocationWithContacts(emergencyContacts, newLocation, userProfile, false);
          
          // Update last shared timestamp
          await firestoreService.updateDocument('locationSessions', sessionId, {
            lastSharedAt: new Date()
          });
        }
      }

      return updateResult;
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Stop location sharing
  stopEmergencyLocationSharing: async (sessionId) => {
    try {
      const result = await firestoreService.updateDocument('locationSessions', sessionId, {
        isActive: false,
        endTime: new Date()
      });

      // Cancel any scheduled location updates
      cancelLocationUpdates(sessionId);

      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Get active location sharing sessions for user
  getActiveLocationSessions: async (userId) => {
    try {
      const result = await firestoreService.queryDocuments(
        'locationSessions',
        'userId',
        '==',
        userId
      );

      if (result.success) {
        const activeSessions = result.data.filter(session => session.isActive);
        return { success: true, sessions: activeSessions };
      }

      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Share current location manually
  shareLocationManually: async (contacts, location, userProfile, message = null) => {
    try {
      const customMessage = message || createLocationShareMessage(location, userProfile, false);
      
      const result = await emergencyAlertService.sendEmergencyAlert(
        location,
        userProfile,
        contacts,
        customMessage
      );

      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};

// Helper function to share location with contacts
const shareLocationWithContacts = async (contacts, location, userProfile, isEmergency = false) => {
  try {
    const message = createLocationShareMessage(location, userProfile, isEmergency);
    
    const result = await emergencyAlertService.sendEmergencyAlert(
      location,
      userProfile,
      contacts,
      message
    );

    // Send notification to user
    if (result.success) {
      await messagingService.scheduleNotification(
        'Location Shared',
        `Your location has been shared with ${contacts.length} emergency contacts.`,
        { 
          type: NOTIFICATION_TYPES.LOCATION_UPDATE,
          location,
          contactCount: contacts.length
        }
      );
    }

    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Helper function to create location share message
const createLocationShareMessage = (location, userProfile, isEmergency) => {
  const timestamp = new Date().toLocaleString();
  const locationUrl = `https://maps.google.com/?q=${location.latitude},${location.longitude}`;
  
  const emergencyPrefix = isEmergency ? '🚨 EMERGENCY LOCATION UPDATE 🚨\n' : '📍 LOCATION UPDATE\n';
  
  return `${emergencyPrefix}
${userProfile.name} is currently at:

Coordinates: ${location.latitude}, ${location.longitude}
${location.address ? `Address: ${location.address}` : ''}
Time: ${timestamp}

View on map: ${locationUrl}

${isEmergency ? 'This is an emergency location update.' : 'This is a location update from Tourist Safety App.'}`;
};

// Helper function to check if location should be shared
const shouldShareLocationUpdate = async (sessionId) => {
  try {
    const sessionResult = await firestoreService.getDocument('locationSessions', sessionId);
    
    if (sessionResult.success) {
      const session = sessionResult.data;
      const now = new Date();
      const lastShared = new Date(session.lastSharedAt);
      const timeDiff = now.getTime() - lastShared.getTime();
      
      // Share if more than 5 minutes have passed
      return timeDiff >= session.shareInterval;
    }
    
    return false;
  } catch (error) {
    return false;
  }
};

// Helper function to schedule periodic location updates
const scheduleLocationUpdates = (sessionId, contacts, userProfile) => {
  // This would be implemented with background tasks in a production app
  // For now, we'll rely on manual location updates
  console.log(`Location sharing scheduled for session: ${sessionId}`);
};

// Helper function to cancel location updates
const cancelLocationUpdates = (sessionId) => {
  // Cancel any scheduled background tasks
  console.log(`Location sharing cancelled for session: ${sessionId}`);
};