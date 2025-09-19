import { firestoreService } from '../firebase/firestore';
import { realtimeSyncService } from './realtimeSyncService';
import { geoLocationService } from '../location/geoLocation';
import { safetyNotificationService } from '../notifications/safetyNotificationService';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const locationSharingService = {
  // Active sharing sessions
  activeSessions: new Map(),
  
  // Start location sharing session (Requirement 2.3)
  startLocationSharing: async (options = {}) => {
    try {
      const {
        duration = 60, // minutes
        contacts = [],
        isEmergency = false,
        shareFrequency = isEmergency ? 3000 : 30000, // 3s for emergency, 30s for normal
        userId,
        reason = 'safety_check'
      } = options;
      
      // Create sharing session document
      const sessionData = {
        userId,
        contacts,
        isEmergency,
        reason,
        shareFrequency,
        startTime: new Date(),
        endTime: new Date(Date.now() + duration * 60 * 1000),
        isActive: true,
        locationHistory: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const sessionResult = await firestoreService.addDocument('location_sharing', sessionData);
      
      if (!sessionResult.success) {
        return sessionResult;
      }
      
      const sessionId = sessionResult.id;
      
      // Start location tracking for this session
      const trackingResult = await locationSharingService.startSessionTracking(sessionId, options);
      
      if (!trackingResult.success) {
        // Clean up session if tracking failed
        await firestoreService.deleteDocument('location_sharing', sessionId);
        return trackingResult;
      }
      
      // Send notifications to contacts
      await locationSharingService.notifyContactsOfSharing(sessionId, contacts, isEmergency);
      
      // Cache session locally
      await AsyncStorage.setItem('active_location_sharing', JSON.stringify({
        sessionId,
        ...sessionData
      }));
      
      return { 
        success: true, 
        sessionId,
        trackingId: trackingResult.trackingId
      };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Start tracking for a sharing session
  startSessionTracking: async (sessionId, options = {}) => {
    try {
      const { shareFrequency = 30000, isEmergency = false } = options;
      
      const trackingResult = await geoLocationService.startSmartLocationTracking(
        async (location) => {
          // Update session with new location
          await locationSharingService.updateSessionLocation(sessionId, location);
        },
        {
          timeInterval: shareFrequency,
          distanceInterval: isEmergency ? 3 : 10,
          isEmergency
        }
      );
      
      if (trackingResult.success) {
        // Store tracking session
        locationSharingService.activeSessions.set(sessionId, {
          trackingId: trackingResult.trackingId,
          startTime: new Date(),
          isEmergency
        });
      }
      
      return trackingResult;
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Update session with new location
  updateSessionLocation: async (sessionId, location) => {
    try {
      const locationData = {
        location,
        timestamp: new Date(),
        accuracy: location.accuracy || 0
      };
      
      const updateData = {
        currentLocation: location,
        lastLocationUpdate: new Date(),
        locationHistory: firestoreService.arrayUnion(locationData),
        updatedAt: new Date()
      };
      
      // Use real-time sync for reliable updates
      if (realtimeSyncService.syncStatus.isOnline) {
        await firestoreService.updateDocument('location_sharing', sessionId, updateData);
      } else {
        await realtimeSyncService.queueOperation({
          type: 'update',
          collectionName: 'location_sharing',
          docId: sessionId,
          data: updateData,
          priority: 'high'
        });
      }
      
      // Send location update notification
      await safetyNotificationService.sendLocationUpdateNotification({
        location,
        isEmergency: locationSharingService.activeSessions.get(sessionId)?.isEmergency || false
      });
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Stop location sharing session
  stopLocationSharing: async (sessionId) => {
    try {
      // Stop location tracking
      const session = locationSharingService.activeSessions.get(sessionId);
      if (session) {
        await geoLocationService.stopLocationTracking();
        locationSharingService.activeSessions.delete(sessionId);
      }
      
      // Update session as inactive
      await firestoreService.updateDocument('location_sharing', sessionId, {
        isActive: false,
        endTime: new Date(),
        updatedAt: new Date()
      });
      
      // Clear local cache
      await AsyncStorage.removeItem('active_location_sharing');
      
      // Notify contacts that sharing has stopped
      const sessionDoc = await firestoreService.getDocument('location_sharing', sessionId);
      if (sessionDoc.success && sessionDoc.data.contacts) {
        await locationSharingService.notifyContactsOfSharingEnd(sessionId, sessionDoc.data.contacts);
      }
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Notify contacts about location sharing start
  notifyContactsOfSharing: async (sessionId, contacts, isEmergency) => {
    try {
      const message = isEmergency 
        ? 'Emergency location sharing has started. You will receive real-time location updates.'
        : 'Location sharing has started for safety purposes. You will receive periodic location updates.';
      
      // This would integrate with SMS/messaging service
      // For now, we'll create notifications in the system
      for (const contact of contacts) {
        await firestoreService.addDocument('notifications', {
          recipientPhone: contact.phoneNumber,
          recipientName: contact.name,
          type: 'location_sharing_started',
          message,
          sessionId,
          isEmergency,
          createdAt: new Date(),
          status: 'pending'
        });
      }
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Notify contacts about location sharing end
  notifyContactsOfSharingEnd: async (sessionId, contacts) => {
    try {
      const message = 'Location sharing has ended. Thank you for staying connected for safety.';
      
      for (const contact of contacts) {
        await firestoreService.addDocument('notifications', {
          recipientPhone: contact.phoneNumber,
          recipientName: contact.name,
          type: 'location_sharing_ended',
          message,
          sessionId,
          createdAt: new Date(),
          status: 'pending'
        });
      }
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Get active sharing sessions for user
  getActiveSharing: async (userId) => {
    try {
      const result = await firestoreService.queryDocuments(
        'location_sharing',
        'userId',
        '==',
        userId
      );
      
      if (result.success) {
        const activeSessions = result.data.filter(session => 
          session.isActive && new Date(session.endTime.toDate()) > new Date()
        );
        
        return { success: true, sessions: activeSessions };
      }
      
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Listen to shared location updates (for contacts receiving updates)
  listenToSharedLocation: (sessionId, callback) => {
    return firestoreService.listenToDocument('location_sharing', sessionId, (result) => {
      if (result.success) {
        const session = result.data;
        
        // Check if session is still active
        if (session.isActive && new Date(session.endTime.toDate()) > new Date()) {
          callback({
            success: true,
            location: session.currentLocation,
            lastUpdate: session.lastLocationUpdate,
            isEmergency: session.isEmergency,
            locationHistory: session.locationHistory || []
          });
        } else {
          callback({
            success: false,
            reason: 'Session ended or expired'
          });
        }
      } else {
        callback(result);
      }
    });
  },

  // Create emergency location sharing (Requirement 2.3)
  createEmergencyLocationSharing: async (userId, emergencyContacts) => {
    try {
      return await locationSharingService.startLocationSharing({
        userId,
        contacts: emergencyContacts,
        isEmergency: true,
        duration: 120, // 2 hours for emergency
        shareFrequency: 3000, // 3 seconds
        reason: 'emergency_alert'
      });
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Get location sharing history
  getLocationSharingHistory: async (userId, limit = 10) => {
    try {
      const { orderBy, limitToLast } = await import('firebase/firestore');
      
      const result = await firestoreService.listenToQuery(
        'location_sharing',
        [
          where('userId', '==', userId),
          orderBy('createdAt', 'desc'),
          limitToLast(limit)
        ],
        () => {} // Empty callback for one-time query
      );
      
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Extend sharing session
  extendSharingSession: async (sessionId, additionalMinutes) => {
    try {
      const sessionDoc = await firestoreService.getDocument('location_sharing', sessionId);
      
      if (!sessionDoc.success) {
        return sessionDoc;
      }
      
      const currentEndTime = new Date(sessionDoc.data.endTime.toDate());
      const newEndTime = new Date(currentEndTime.getTime() + additionalMinutes * 60 * 1000);
      
      await firestoreService.updateDocument('location_sharing', sessionId, {
        endTime: newEndTime,
        updatedAt: new Date()
      });
      
      return { success: true, newEndTime };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Get sharing session statistics
  getSessionStats: async (sessionId) => {
    try {
      const sessionDoc = await firestoreService.getDocument('location_sharing', sessionId);
      
      if (!sessionDoc.success) {
        return sessionDoc;
      }
      
      const session = sessionDoc.data;
      const locationHistory = session.locationHistory || [];
      
      const stats = {
        duration: session.endTime.toDate() - session.startTime.toDate(),
        locationUpdates: locationHistory.length,
        averageAccuracy: locationHistory.length > 0 
          ? locationHistory.reduce((sum, loc) => sum + (loc.accuracy || 0), 0) / locationHistory.length
          : 0,
        isActive: session.isActive,
        contactsNotified: session.contacts?.length || 0,
        isEmergency: session.isEmergency
      };
      
      return { success: true, stats };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Clean up expired sessions
  cleanupExpiredSessions: async () => {
    try {
      const now = new Date();
      
      // This would typically be done by a cloud function
      // For now, we'll just mark them as inactive locally
      const activeSessions = Array.from(locationSharingService.activeSessions.keys());
      
      for (const sessionId of activeSessions) {
        const sessionDoc = await firestoreService.getDocument('location_sharing', sessionId);
        
        if (sessionDoc.success) {
          const endTime = new Date(sessionDoc.data.endTime.toDate());
          
          if (now > endTime) {
            await locationSharingService.stopLocationSharing(sessionId);
          }
        }
      }
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};