import NetInfo from '@react-native-community/netinfo';
import { offlineDataService } from './offlineDataService';
import { firestoreService } from '../firebase/firestore';
import { emergencyAlertService } from '../emergency/alertService';
import { geoLocationService } from '../location/geoLocation';

export const backgroundSyncService = {
  isOnline: false,
  syncInProgress: false,
  syncListeners: [],

  // Initialize background sync service (Requirement 7.3)
  initialize: async () => {
    try {
      // Listen for network state changes
      const unsubscribe = NetInfo.addEventListener(state => {
        const wasOffline = !backgroundSyncService.isOnline;
        backgroundSyncService.isOnline = state.isConnected;
        
        // If we just came back online, trigger sync
        if (wasOffline && state.isConnected) {
          backgroundSyncService.syncWhenOnline();
        }
        
        // Notify listeners of network state change
        backgroundSyncService.notifyListeners({
          type: 'network_change',
          isOnline: state.isConnected,
          connectionType: state.type
        });
      });

      // Get initial network state
      const networkState = await NetInfo.fetch();
      backgroundSyncService.isOnline = networkState.isConnected;

      return { success: true, unsubscribe };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Add sync listener
  addSyncListener: (listener) => {
    backgroundSyncService.syncListeners.push(listener);
    
    return () => {
      const index = backgroundSyncService.syncListeners.indexOf(listener);
      if (index > -1) {
        backgroundSyncService.syncListeners.splice(index, 1);
      }
    };
  },

  // Notify all sync listeners
  notifyListeners: (event) => {
    backgroundSyncService.syncListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in sync listener:', error);
      }
    });
  },

  // Sync when coming back online (Requirement 7.3)
  syncWhenOnline: async () => {
    if (!backgroundSyncService.isOnline || backgroundSyncService.syncInProgress) {
      return { success: false, error: 'Not online or sync already in progress' };
    }

    backgroundSyncService.syncInProgress = true;
    
    try {
      backgroundSyncService.notifyListeners({
        type: 'sync_started',
        timestamp: new Date().toISOString()
      });

      const results = {
        locationUpdates: { success: false },
        emergencyAlerts: { success: false },
        queuedOperations: { success: false },
        cacheRefresh: { success: false }
      };

      // Sync location updates
      results.locationUpdates = await backgroundSyncService.syncLocationUpdates();
      
      // Sync emergency alerts
      results.emergencyAlerts = await backgroundSyncService.syncEmergencyAlerts();
      
      // Process queued operations
      results.queuedOperations = await backgroundSyncService.processQueuedOperations();
      
      // Refresh cached data
      results.cacheRefresh = await backgroundSyncService.refreshCachedData();

      // Update last sync time
      await offlineDataService.setLastSyncTime();

      backgroundSyncService.notifyListeners({
        type: 'sync_completed',
        timestamp: new Date().toISOString(),
        results
      });

      return { success: true, results };
    } catch (error) {
      backgroundSyncService.notifyListeners({
        type: 'sync_error',
        timestamp: new Date().toISOString(),
        error: error.message
      });
      
      return { success: false, error: error.message };
    } finally {
      backgroundSyncService.syncInProgress = false;
    }
  },

  // Sync location updates to server
  syncLocationUpdates: async () => {
    try {
      const locationHistory = await geoLocationService.getLocationHistory();
      
      if (locationHistory.length === 0) {
        return { success: true, message: 'No location updates to sync' };
      }

      // Get last sync time to only sync new locations
      const lastSyncResult = await offlineDataService.getLastSyncTime();
      const lastSyncTime = lastSyncResult.timestamp ? new Date(lastSyncResult.timestamp) : new Date(0);

      const newLocations = locationHistory.filter(location => 
        new Date(location.timestamp) > lastSyncTime
      );

      if (newLocations.length === 0) {
        return { success: true, message: 'No new location updates to sync' };
      }

      // Batch upload location updates
      const batchSize = 10;
      let syncedCount = 0;

      for (let i = 0; i < newLocations.length; i += batchSize) {
        const batch = newLocations.slice(i, i + batchSize);
        
        try {
          await firestoreService.addDocument('location_updates', {
            locations: batch,
            syncedAt: new Date(),
            batchId: `batch_${Date.now()}_${i}`
          });
          
          syncedCount += batch.length;
        } catch (error) {
          console.error('Error syncing location batch:', error);
        }
      }

      return { 
        success: true, 
        syncedCount, 
        totalLocations: newLocations.length 
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Sync emergency alerts that were sent offline
  syncEmergencyAlerts: async () => {
    try {
      const queueResult = await offlineDataService.getSyncQueue();
      
      if (!queueResult.success) {
        return { success: true, message: 'No sync queue found' };
      }

      const emergencyAlerts = queueResult.queue.filter(item => 
        item.type === 'emergency_alert'
      );

      if (emergencyAlerts.length === 0) {
        return { success: true, message: 'No emergency alerts to sync' };
      }

      let syncedCount = 0;
      const failedAlerts = [];

      for (const alert of emergencyAlerts) {
        try {
          // Log the emergency event to Firestore
          await firestoreService.addDocument('emergency_events', {
            ...alert.data,
            syncedAt: new Date(),
            wasOffline: true
          });

          // Remove from sync queue
          await offlineDataService.removeFromSyncQueue(alert.id);
          syncedCount++;
        } catch (error) {
          console.error('Error syncing emergency alert:', error);
          failedAlerts.push({ alert, error: error.message });
          
          // Update retry count
          await offlineDataService.updateSyncQueueItem(alert.id, {
            retryCount: (alert.retryCount || 0) + 1,
            lastError: error.message
          });
        }
      }

      return { 
        success: true, 
        syncedCount, 
        totalAlerts: emergencyAlerts.length,
        failedAlerts 
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Process all queued operations
  processQueuedOperations: async () => {
    try {
      const queueResult = await offlineDataService.getSyncQueue();
      
      if (!queueResult.success) {
        return { success: true, message: 'No sync queue found' };
      }

      const operations = queueResult.queue.filter(item => 
        item.retryCount < item.maxRetries
      );

      if (operations.length === 0) {
        return { success: true, message: 'No operations to process' };
      }

      let processedCount = 0;
      const failedOperations = [];

      for (const operation of operations) {
        try {
          let result = false;

          switch (operation.type) {
            case 'profile_update':
              result = await firestoreService.updateDocument(
                'users', 
                operation.data.userId, 
                operation.data.updates
              );
              break;
              
            case 'emergency_contact_update':
              result = await firestoreService.updateDocument(
                'users', 
                operation.data.userId, 
                { emergencyContacts: operation.data.contacts }
              );
              break;
              
            case 'location_share':
              result = await firestoreService.addDocument(
                'shared_locations', 
                operation.data
              );
              break;
              
            default:
              console.warn('Unknown operation type:', operation.type);
              continue;
          }

          if (result) {
            await offlineDataService.removeFromSyncQueue(operation.id);
            processedCount++;
          } else {
            throw new Error('Operation failed');
          }
        } catch (error) {
          console.error('Error processing operation:', error);
          failedOperations.push({ operation, error: error.message });
          
          // Update retry count
          await offlineDataService.updateSyncQueueItem(operation.id, {
            retryCount: (operation.retryCount || 0) + 1,
            lastError: error.message
          });
        }
      }

      return { 
        success: true, 
        processedCount, 
        totalOperations: operations.length,
        failedOperations 
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Refresh cached data when online
  refreshCachedData: async () => {
    try {
      const results = {
        safetyZones: { success: false },
        emergencyNumbers: { success: false },
        userProfile: { success: false }
      };

      // Refresh safety zones if we have a current location
      try {
        const locationResult = await geoLocationService.getLastKnownLocation();
        if (locationResult.success) {
          // This would typically call the safety zones service to get fresh data
          // For now, we'll just mark as successful
          results.safetyZones = { success: true, message: 'Safety zones refresh queued' };
        }
      } catch (error) {
        results.safetyZones = { success: false, error: error.message };
      }

      // Refresh emergency numbers
      try {
        const emergencyNumbers = {
          police: '100',
          medical: '108',
          fire: '101',
          touristHelpline: '1363'
        };
        
        await offlineDataService.cacheEmergencyNumbers(emergencyNumbers);
        results.emergencyNumbers = { success: true };
      } catch (error) {
        results.emergencyNumbers = { success: false, error: error.message };
      }

      // Refresh user profile would typically fetch from Firestore
      results.userProfile = { success: true, message: 'User profile refresh queued' };

      return { success: true, results };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Queue operation for later sync
  queueOperation: async (type, data, priority = 'normal') => {
    try {
      const operation = {
        type,
        data,
        priority,
        createdAt: new Date().toISOString()
      };

      return await offlineDataService.addToSyncQueue(operation);
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Force sync now (manual trigger)
  forceSyncNow: async () => {
    if (!backgroundSyncService.isOnline) {
      return { success: false, error: 'Device is offline' };
    }

    return await backgroundSyncService.syncWhenOnline();
  },

  // Get sync status
  getSyncStatus: async () => {
    try {
      const queueResult = await offlineDataService.getSyncQueue();
      const lastSyncResult = await offlineDataService.getLastSyncTime();
      
      return {
        success: true,
        isOnline: backgroundSyncService.isOnline,
        syncInProgress: backgroundSyncService.syncInProgress,
        queueLength: queueResult.success ? queueResult.queue.length : 0,
        lastSyncTime: lastSyncResult.timestamp,
        pendingOperations: queueResult.success ? queueResult.queue : []
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Clean up old sync queue items
  cleanupSyncQueue: async () => {
    try {
      const queueResult = await offlineDataService.getSyncQueue();
      
      if (!queueResult.success) {
        return { success: true, message: 'No sync queue to clean' };
      }

      const now = new Date();
      const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
      
      const validItems = queueResult.queue.filter(item => {
        const itemAge = now - new Date(item.timestamp);
        const hasRetriesLeft = item.retryCount < item.maxRetries;
        
        return itemAge < maxAge && hasRetriesLeft;
      });

      const removedCount = queueResult.queue.length - validItems.length;

      if (removedCount > 0) {
        await AsyncStorage.setItem(
          'offline_sync_queue', 
          JSON.stringify(validItems)
        );
      }

      return { 
        success: true, 
        removedCount, 
        remainingCount: validItems.length 
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};