import { firestoreService } from '../firebase/firestore';
import { where, orderBy, limit } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { safetyNotificationService } from '../notifications/safetyNotificationService';

export const realtimeSyncService = {
  // Active listeners for cleanup
  activeListeners: new Map(),
  
  // Sync status
  syncStatus: {
    isOnline: true,
    lastSync: null,
    pendingOperations: [],
    conflictResolution: 'client-wins' // 'client-wins', 'server-wins', 'merge'
  },

  // Initialize real-time synchronization (Requirement 7.3)
  initialize: async (userId) => {
    try {
      // Set up connection state monitoring
      realtimeSyncService.setupConnectionMonitoring();
      
      // Start essential real-time listeners
      await realtimeSyncService.startEssentialListeners(userId);
      
      // Process any pending offline operations
      await realtimeSyncService.processPendingOperations();
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Set up connection state monitoring
  setupConnectionMonitoring: () => {
    // Monitor network connectivity
    const { NetInfo } = require('@react-native-community/netinfo');
    
    NetInfo.addEventListener(state => {
      const wasOnline = realtimeSyncService.syncStatus.isOnline;
      realtimeSyncService.syncStatus.isOnline = state.isConnected;
      
      if (!wasOnline && state.isConnected) {
        // Came back online, sync pending operations
        realtimeSyncService.processPendingOperations();
      }
    });
  },

  // Start essential real-time listeners
  startEssentialListeners: async (userId) => {
    try {
      // Listen to user's emergency status (Requirement 2.3)
      realtimeSyncService.listenToEmergencyStatus(userId);
      
      // Listen to safety zone updates (Requirement 3.1)
      realtimeSyncService.listenToSafetyZoneUpdates();
      
      // Listen to location sharing sessions
      realtimeSyncService.listenToLocationSharingSessions(userId);
      
      // Listen to emergency contacts updates
      realtimeSyncService.listenToEmergencyContactsUpdates(userId);
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Listen to emergency status changes (Requirement 2.3)
  listenToEmergencyStatus: (userId) => {
    const listenerId = 'emergency_status';
    
    const unsubscribe = firestoreService.listenToQuery(
      'emergencies',
      [
        where('userId', '==', userId),
        where('status', '==', 'active'),
        orderBy('createdAt', 'desc'),
        limit(1)
      ],
      async (result) => {
        if (result.success) {
          const activeEmergency = result.data[0];
          
          if (activeEmergency) {
            // Handle active emergency
            await realtimeSyncService.handleActiveEmergency(activeEmergency, result.changes);
          } else {
            // No active emergency
            await realtimeSyncService.handleEmergencyResolved();
          }
        }
      }
    );
    
    realtimeSyncService.activeListeners.set(listenerId, unsubscribe);
  },

  // Handle active emergency updates
  handleActiveEmergency: async (emergency, changes) => {
    try {
      // Cache emergency data locally
      await AsyncStorage.setItem('active_emergency', JSON.stringify(emergency));
      
      // Check for location updates
      const locationChanges = changes.filter(change => 
        change.type === 'modified' && 
        change.doc.locationHistory && 
        change.doc.locationHistory.length > 0
      );
      
      if (locationChanges.length > 0) {
        // Send location update notification
        await safetyNotificationService.sendLocationUpdateNotification({
          location: emergency.currentLocation,
          isEmergency: true
        });
      }
      
      // Start real-time location sharing if not already active
      realtimeSyncService.startEmergencyLocationSharing(emergency.id);
      
    } catch (error) {
      console.error('Error handling active emergency:', error);
    }
  },

  // Handle emergency resolved
  handleEmergencyResolved: async () => {
    try {
      // Clear cached emergency data
      await AsyncStorage.removeItem('active_emergency');
      
      // Stop emergency location sharing
      realtimeSyncService.stopEmergencyLocationSharing();
      
      // Send resolution notification
      await safetyNotificationService.sendEmergencyNotification({
        type: 'resolved',
        message: 'Emergency status has been resolved'
      });
      
    } catch (error) {
      console.error('Error handling emergency resolution:', error);
    }
  },

  // Listen to safety zone updates (Requirement 3.1)
  listenToSafetyZoneUpdates: () => {
    const listenerId = 'safety_zones';
    
    const unsubscribe = firestoreService.listenToCollection(
      'safety_zones',
      async (result) => {
        if (result.success) {
          // Update local safety zones cache
          await AsyncStorage.setItem('safety_zones', JSON.stringify(result.data));
          
          // Check for critical zone updates
          const criticalUpdates = result.data.filter(zone => 
            zone.safetyLevel === 'restricted' && 
            zone.lastUpdated && 
            new Date(zone.lastUpdated.toDate()) > new Date(Date.now() - 5 * 60 * 1000) // Last 5 minutes
          );
          
          if (criticalUpdates.length > 0) {
            // Send safety zone update notifications
            for (const zone of criticalUpdates) {
              await safetyNotificationService.sendSafetyWarning('zone_update', null, {
                title: '🚨 Safety Zone Update',
                message: `${zone.name} has been marked as restricted. Avoid this area.`,
                severity: 'high',
                zone
              });
            }
          }
        }
      }
    );
    
    realtimeSyncService.activeListeners.set(listenerId, unsubscribe);
  },

  // Listen to location sharing sessions
  listenToLocationSharingSessions: (userId) => {
    const listenerId = 'location_sharing';
    
    const unsubscribe = firestoreService.listenToQuery(
      'location_sharing',
      [
        where('userId', '==', userId),
        where('isActive', '==', true),
        orderBy('startTime', 'desc')
      ],
      async (result) => {
        if (result.success) {
          const activeSessions = result.data;
          
          // Handle location sharing session updates
          for (const session of activeSessions) {
            await realtimeSyncService.handleLocationSharingUpdate(session);
          }
        }
      }
    );
    
    realtimeSyncService.activeListeners.set(listenerId, unsubscribe);
  },

  // Listen to emergency contacts updates
  listenToEmergencyContactsUpdates: (userId) => {
    const listenerId = 'emergency_contacts';
    
    const unsubscribe = firestoreService.listenToDocument(
      'users',
      userId,
      async (result) => {
        if (result.success && result.data.emergencyContacts) {
          // Update local emergency contacts cache
          await AsyncStorage.setItem(
            'emergency_contacts', 
            JSON.stringify(result.data.emergencyContacts)
          );
        }
      }
    );
    
    realtimeSyncService.activeListeners.set(listenerId, unsubscribe);
  },

  // Start emergency location sharing (Requirement 2.3)
  startEmergencyLocationSharing: async (emergencyId) => {
    try {
      const { geoLocationService } = await import('../location/geoLocation');
      
      // Start high-frequency location tracking
      const trackingResult = await geoLocationService.startSmartLocationTracking(
        async (location) => {
          // Update emergency document with new location
          await realtimeSyncService.updateEmergencyLocation(emergencyId, location);
        },
        {
          timeInterval: 3000, // 3 seconds for emergency
          distanceInterval: 3, // 3 meters
          isEmergency: true
        }
      );
      
      if (trackingResult.success) {
        // Store tracking session
        await AsyncStorage.setItem('emergency_tracking', JSON.stringify({
          emergencyId,
          startTime: new Date().toISOString(),
          isActive: true
        }));
      }
      
      return trackingResult;
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Stop emergency location sharing
  stopEmergencyLocationSharing: async () => {
    try {
      const { geoLocationService } = await import('../location/geoLocation');
      
      // Stop location tracking
      await geoLocationService.stopLocationTracking();
      
      // Clear tracking session
      await AsyncStorage.removeItem('emergency_tracking');
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Update emergency location in real-time
  updateEmergencyLocation: async (emergencyId, location) => {
    try {
      const updateData = {
        currentLocation: location,
        lastLocationUpdate: new Date(),
        locationHistory: firestoreService.arrayUnion({
          location,
          timestamp: new Date()
        })
      };
      
      if (realtimeSyncService.syncStatus.isOnline) {
        // Update immediately if online
        await firestoreService.updateDocument('emergencies', emergencyId, updateData);
      } else {
        // Queue for later if offline
        await realtimeSyncService.queueOperation({
          type: 'update',
          collectionName: 'emergencies',
          docId: emergencyId,
          data: updateData,
          priority: 'high'
        });
      }
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Handle location sharing session updates
  handleLocationSharingUpdate: async (session) => {
    try {
      // Check if session is still valid
      const now = new Date();
      const sessionEnd = new Date(session.endTime?.toDate() || now.getTime() + 24 * 60 * 60 * 1000);
      
      if (now > sessionEnd) {
        // Session expired, deactivate
        await firestoreService.updateDocument('location_sharing', session.id, {
          isActive: false,
          endTime: now
        });
        return;
      }
      
      // Update local session cache
      await AsyncStorage.setItem('active_location_sharing', JSON.stringify(session));
      
    } catch (error) {
      console.error('Error handling location sharing update:', error);
    }
  },

  // Queue operation for offline sync
  queueOperation: async (operation) => {
    try {
      const pendingOps = await realtimeSyncService.getPendingOperations();
      const newOperation = {
        ...operation,
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        retryCount: 0
      };
      
      pendingOps.push(newOperation);
      await AsyncStorage.setItem('pending_operations', JSON.stringify(pendingOps));
      
      return { success: true, operationId: newOperation.id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Get pending operations
  getPendingOperations: async () => {
    try {
      const operations = await AsyncStorage.getItem('pending_operations');
      return operations ? JSON.parse(operations) : [];
    } catch (error) {
      return [];
    }
  },

  // Process pending operations when back online
  processPendingOperations: async () => {
    try {
      if (!realtimeSyncService.syncStatus.isOnline) {
        return { success: false, reason: 'Device is offline' };
      }
      
      const pendingOps = await realtimeSyncService.getPendingOperations();
      const results = [];
      
      // Sort by priority and timestamp
      const sortedOps = pendingOps.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const aPriority = priorityOrder[a.priority] || 1;
        const bPriority = priorityOrder[b.priority] || 1;
        
        if (aPriority !== bPriority) {
          return bPriority - aPriority; // Higher priority first
        }
        
        return new Date(a.timestamp) - new Date(b.timestamp); // Older first
      });
      
      for (const operation of sortedOps) {
        try {
          let result;
          
          switch (operation.type) {
            case 'set':
              result = await firestoreService.setDocument(
                operation.collectionName, 
                operation.docId, 
                operation.data
              );
              break;
              
            case 'update':
              result = await firestoreService.updateDocument(
                operation.collectionName, 
                operation.docId, 
                operation.data
              );
              break;
              
            case 'delete':
              result = await firestoreService.deleteDocument(
                operation.collectionName, 
                operation.docId
              );
              break;
              
            case 'add':
              result = await firestoreService.addDocument(
                operation.collectionName, 
                operation.data
              );
              break;
          }
          
          results.push({ operation, result });
          
        } catch (error) {
          // Handle operation failure
          operation.retryCount = (operation.retryCount || 0) + 1;
          operation.lastError = error.message;
          
          if (operation.retryCount < 3) {
            // Keep for retry
            results.push({ operation, result: { success: false, retry: true } });
          } else {
            // Max retries reached, log and remove
            console.error('Operation failed after max retries:', operation);
            results.push({ operation, result: { success: false, abandoned: true } });
          }
        }
      }
      
      // Update pending operations (remove successful ones, keep failed ones for retry)
      const remainingOps = results
        .filter(r => r.result.retry)
        .map(r => r.operation);
      
      await AsyncStorage.setItem('pending_operations', JSON.stringify(remainingOps));
      
      // Update sync status
      realtimeSyncService.syncStatus.lastSync = new Date();
      
      return { success: true, results, remaining: remainingOps.length };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Conflict resolution for concurrent edits (Requirement 7.3)
  resolveConflict: async (localData, serverData, conflictType = 'merge') => {
    try {
      switch (conflictType) {
        case 'client-wins':
          return { resolved: localData, strategy: 'client-wins' };
          
        case 'server-wins':
          return { resolved: serverData, strategy: 'server-wins' };
          
        case 'merge':
          // Intelligent merge based on timestamps and data types
          const merged = await realtimeSyncService.mergeData(localData, serverData);
          return { resolved: merged, strategy: 'merge' };
          
        default:
          return { resolved: serverData, strategy: 'default-server-wins' };
      }
    } catch (error) {
      return { resolved: serverData, strategy: 'error-fallback', error: error.message };
    }
  },

  // Intelligent data merging
  mergeData: async (localData, serverData) => {
    try {
      const merged = { ...serverData }; // Start with server data
      
      // Merge arrays intelligently
      Object.keys(localData).forEach(key => {
        const localValue = localData[key];
        const serverValue = serverData[key];
        
        if (Array.isArray(localValue) && Array.isArray(serverValue)) {
          // Merge arrays, preferring newer items
          const localItems = localValue.map(item => ({ ...item, source: 'local' }));
          const serverItems = serverValue.map(item => ({ ...item, source: 'server' }));
          
          const allItems = [...localItems, ...serverItems];
          const uniqueItems = realtimeSyncService.deduplicateArray(allItems, 'id');
          
          merged[key] = uniqueItems.map(item => {
            const { source, ...cleanItem } = item;
            return cleanItem;
          });
        } else if (localValue && typeof localValue === 'object' && localValue.timestamp) {
          // For timestamped objects, prefer the newer one
          const localTime = new Date(localValue.timestamp);
          const serverTime = new Date(serverValue?.timestamp || 0);
          
          if (localTime > serverTime) {
            merged[key] = localValue;
          }
        } else if (localValue !== undefined && !serverValue) {
          // Local has value, server doesn't
          merged[key] = localValue;
        }
      });
      
      return merged;
    } catch (error) {
      console.error('Error merging data:', error);
      return serverData; // Fallback to server data
    }
  },

  // Deduplicate array items
  deduplicateArray: (array, keyField) => {
    const seen = new Set();
    return array.filter(item => {
      const key = item[keyField];
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  },

  // Clean up listeners
  cleanup: () => {
    realtimeSyncService.activeListeners.forEach((unsubscribe, listenerId) => {
      try {
        unsubscribe();
      } catch (error) {
        console.error(`Error unsubscribing from ${listenerId}:`, error);
      }
    });
    
    realtimeSyncService.activeListeners.clear();
  },

  // Get sync statistics
  getSyncStats: async () => {
    try {
      const pendingOps = await realtimeSyncService.getPendingOperations();
      
      return {
        success: true,
        stats: {
          isOnline: realtimeSyncService.syncStatus.isOnline,
          lastSync: realtimeSyncService.syncStatus.lastSync,
          pendingOperations: pendingOps.length,
          activeListeners: realtimeSyncService.activeListeners.size,
          highPriorityPending: pendingOps.filter(op => op.priority === 'high').length
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};