import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

// Storage keys for different data types
const STORAGE_KEYS = {
  EMERGENCY_CONTACTS: 'offline_emergency_contacts',
  QR_CODES: 'offline_qr_codes',
  SAFETY_ZONES: 'offline_safety_zones',
  USER_PROFILE: 'offline_user_profile',
  LOCATION_HISTORY: 'offline_location_history',
  EMERGENCY_NUMBERS: 'offline_emergency_numbers',
  CACHED_MAPS: 'offline_cached_maps',
  SYNC_QUEUE: 'offline_sync_queue',
  LAST_SYNC: 'offline_last_sync',
  APP_SETTINGS: 'offline_app_settings'
};

export const offlineDataService = {
  // Cache emergency contacts for offline access (Requirement 7.2)
  cacheEmergencyContacts: async (contacts) => {
    try {
      const contactsData = {
        contacts,
        cachedAt: new Date().toISOString(),
        version: 1
      };
      
      await AsyncStorage.setItem(
        STORAGE_KEYS.EMERGENCY_CONTACTS, 
        JSON.stringify(contactsData)
      );
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Get cached emergency contacts
  getCachedEmergencyContacts: async () => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.EMERGENCY_CONTACTS);
      
      if (data) {
        const contactsData = JSON.parse(data);
        return { 
          success: true, 
          contacts: contactsData.contacts,
          cachedAt: contactsData.cachedAt,
          isOffline: true
        };
      }
      
      return { success: false, error: 'No cached emergency contacts found' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Cache QR codes for offline access (Requirement 7.2)
  cacheQRCode: async (qrCodeData) => {
    try {
      // Store sensitive QR data in secure storage
      const secureData = {
        qrString: qrCodeData.qrString,
        verificationHash: qrCodeData.verificationHash,
        encryptedData: qrCodeData.encryptedData
      };
      
      await SecureStore.setItemAsync(
        `qr_code_${qrCodeData.userId}`, 
        JSON.stringify(secureData)
      );
      
      // Store non-sensitive metadata in regular storage
      const metaData = {
        userId: qrCodeData.userId,
        expiresAt: qrCodeData.expiresAt,
        generatedAt: qrCodeData.generatedAt,
        cachedAt: new Date().toISOString(),
        version: 1
      };
      
      await AsyncStorage.setItem(
        STORAGE_KEYS.QR_CODES, 
        JSON.stringify(metaData)
      );
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Get cached QR code
  getCachedQRCode: async (userId) => {
    try {
      // Get metadata first
      const metaData = await AsyncStorage.getItem(STORAGE_KEYS.QR_CODES);
      
      if (!metaData) {
        return { success: false, error: 'No cached QR code found' };
      }
      
      const meta = JSON.parse(metaData);
      
      // Check if QR code is expired
      if (new Date(meta.expiresAt) < new Date()) {
        return { success: false, error: 'Cached QR code has expired' };
      }
      
      // Get secure data
      const secureData = await SecureStore.getItemAsync(`qr_code_${userId}`);
      
      if (secureData) {
        const qrData = JSON.parse(secureData);
        return { 
          success: true, 
          qrCode: { ...qrData, ...meta },
          isOffline: true
        };
      }
      
      return { success: false, error: 'QR code secure data not found' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Cache safety zones for offline map functionality (Requirement 7.2)
  cacheSafetyZones: async (zones, location) => {
    try {
      const safetyData = {
        zones,
        centerLocation: location,
        cachedAt: new Date().toISOString(),
        radius: 10000, // 10km radius
        version: 1
      };
      
      await AsyncStorage.setItem(
        STORAGE_KEYS.SAFETY_ZONES, 
        JSON.stringify(safetyData)
      );
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Get cached safety zones
  getCachedSafetyZones: async (currentLocation = null) => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.SAFETY_ZONES);
      
      if (data) {
        const safetyData = JSON.parse(data);
        
        // Check if current location is within cached radius
        if (currentLocation && safetyData.centerLocation) {
          const distance = calculateDistance(
            currentLocation.latitude,
            currentLocation.longitude,
            safetyData.centerLocation.latitude,
            safetyData.centerLocation.longitude
          );
          
          // If outside cached radius, mark as stale
          const isStale = distance > safetyData.radius;
          
          return { 
            success: true, 
            zones: safetyData.zones,
            cachedAt: safetyData.cachedAt,
            isOffline: true,
            isStale
          };
        }
        
        return { 
          success: true, 
          zones: safetyData.zones,
          cachedAt: safetyData.cachedAt,
          isOffline: true,
          isStale: false
        };
      }
      
      return { success: false, error: 'No cached safety zones found' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Cache user profile for offline access
  cacheUserProfile: async (profile) => {
    try {
      const profileData = {
        profile,
        cachedAt: new Date().toISOString(),
        version: 1
      };
      
      await AsyncStorage.setItem(
        STORAGE_KEYS.USER_PROFILE, 
        JSON.stringify(profileData)
      );
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Get cached user profile
  getCachedUserProfile: async () => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.USER_PROFILE);
      
      if (data) {
        const profileData = JSON.parse(data);
        return { 
          success: true, 
          profile: profileData.profile,
          cachedAt: profileData.cachedAt,
          isOffline: true
        };
      }
      
      return { success: false, error: 'No cached user profile found' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Cache emergency numbers for offline access
  cacheEmergencyNumbers: async (numbers) => {
    try {
      const numbersData = {
        numbers,
        cachedAt: new Date().toISOString(),
        version: 1
      };
      
      await AsyncStorage.setItem(
        STORAGE_KEYS.EMERGENCY_NUMBERS, 
        JSON.stringify(numbersData)
      );
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Get cached emergency numbers
  getCachedEmergencyNumbers: async () => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.EMERGENCY_NUMBERS);
      
      if (data) {
        const numbersData = JSON.parse(data);
        return { 
          success: true, 
          numbers: numbersData.numbers,
          cachedAt: numbersData.cachedAt,
          isOffline: true
        };
      }
      
      return { success: false, error: 'No cached emergency numbers found' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Add item to sync queue for background sync (Requirement 7.3)
  addToSyncQueue: async (item) => {
    try {
      const existingQueue = await offlineDataService.getSyncQueue();
      const queue = existingQueue.success ? existingQueue.queue : [];
      
      const queueItem = {
        id: Date.now().toString(),
        ...item,
        timestamp: new Date().toISOString(),
        retryCount: 0,
        maxRetries: 3
      };
      
      queue.push(queueItem);
      
      await AsyncStorage.setItem(
        STORAGE_KEYS.SYNC_QUEUE, 
        JSON.stringify(queue)
      );
      
      return { success: true, queueItem };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Get sync queue
  getSyncQueue: async () => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.SYNC_QUEUE);
      
      if (data) {
        const queue = JSON.parse(data);
        return { success: true, queue };
      }
      
      return { success: true, queue: [] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Remove item from sync queue
  removeFromSyncQueue: async (itemId) => {
    try {
      const existingQueue = await offlineDataService.getSyncQueue();
      
      if (existingQueue.success) {
        const updatedQueue = existingQueue.queue.filter(item => item.id !== itemId);
        
        await AsyncStorage.setItem(
          STORAGE_KEYS.SYNC_QUEUE, 
          JSON.stringify(updatedQueue)
        );
        
        return { success: true };
      }
      
      return { success: false, error: 'No sync queue found' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Update sync queue item retry count
  updateSyncQueueItem: async (itemId, updates) => {
    try {
      const existingQueue = await offlineDataService.getSyncQueue();
      
      if (existingQueue.success) {
        const updatedQueue = existingQueue.queue.map(item => 
          item.id === itemId ? { ...item, ...updates } : item
        );
        
        await AsyncStorage.setItem(
          STORAGE_KEYS.SYNC_QUEUE, 
          JSON.stringify(updatedQueue)
        );
        
        return { success: true };
      }
      
      return { success: false, error: 'No sync queue found' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Set last sync timestamp
  setLastSyncTime: async (timestamp = new Date().toISOString()) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC, timestamp);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Get last sync timestamp
  getLastSyncTime: async () => {
    try {
      const timestamp = await AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC);
      return { success: true, timestamp };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Clear all cached data
  clearAllCache: async () => {
    try {
      const keys = Object.values(STORAGE_KEYS);
      await AsyncStorage.multiRemove(keys);
      
      // Also clear secure storage QR codes
      // Note: SecureStore doesn't have a clear all method, so we'd need to track keys
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Get cache size and statistics
  getCacheStatistics: async () => {
    try {
      const keys = Object.values(STORAGE_KEYS);
      const stats = {
        totalItems: 0,
        totalSize: 0,
        itemDetails: {}
      };
      
      for (const key of keys) {
        try {
          const data = await AsyncStorage.getItem(key);
          if (data) {
            stats.totalItems++;
            stats.totalSize += data.length;
            stats.itemDetails[key] = {
              size: data.length,
              lastModified: JSON.parse(data).cachedAt || 'Unknown'
            };
          }
        } catch (error) {
          // Skip invalid JSON items
        }
      }
      
      return { success: true, stats };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};

// Helper function to calculate distance between two points
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c; // Distance in kilometers

  return distance * 1000; // Return in meters
};