/**
 * Offline Cache Service
 * Manages offline data caching for essential app functionality
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { encryptionService } from '../security/encryption';

class OfflineCacheService {
  constructor() {
    this.cachePrefix = 'tourist_safety_cache_';
    this.maxCacheSize = 100 * 1024 * 1024; // 100MB
    this.cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours
  }

  // Cache data with optional encryption
  async cacheData(key, data, options = {}) {
    try {
      const cacheKey = this.cachePrefix + key;
      const cacheEntry = {
        data: options.encrypted ? await encryptionService.encrypt(JSON.stringify(data)) : data,
        timestamp: new Date().toISOString(),
        encrypted: options.encrypted || false,
        expiry: options.expiry || this.cacheExpiry
      };

      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheEntry));
      return true;
    } catch (error) {
      console.error('Error caching data:', error);
      return false;
    }
  }

  // Get cached data
  async getCachedData(key) {
    try {
      const cacheKey = this.cachePrefix + key;
      const cachedItem = await AsyncStorage.getItem(cacheKey);
      
      if (!cachedItem) {
        return null;
      }

      const cacheEntry = JSON.parse(cachedItem);
      
      // Check if cache is expired
      if (this.isCacheExpired(cacheEntry)) {
        await this.removeCachedData(key);
        return null;
      }

      // Decrypt if necessary
      if (cacheEntry.encrypted) {
        const decryptedData = await encryptionService.decrypt(cacheEntry.data);
        return JSON.parse(decryptedData);
      }

      return cacheEntry.data;
    } catch (error) {
      console.error('Error getting cached data:', error);
      return null;
    }
  }

  // Check if cache is valid
  isCacheValid(cacheEntry) {
    if (!cacheEntry || !cacheEntry.timestamp) {
      return false;
    }

    const now = new Date().getTime();
    const cacheTime = new Date(cacheEntry.timestamp).getTime();
    const expiry = cacheEntry.expiry || this.cacheExpiry;

    return (now - cacheTime) < expiry;
  }

  // Check if cache is expired
  isCacheExpired(cacheEntry) {
    return !this.isCacheValid(cacheEntry);
  }

  // Remove cached data
  async removeCachedData(key) {
    try {
      const cacheKey = this.cachePrefix + key;
      await AsyncStorage.removeItem(cacheKey);
      return true;
    } catch (error) {
      console.error('Error removing cached data:', error);
      return false;
    }
  }

  // Clear all cache
  async clearCache() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.cachePrefix));
      await AsyncStorage.multiRemove(cacheKeys);
      return true;
    } catch (error) {
      console.error('Error clearing cache:', error);
      return false;
    }
  }

  // Get cache size
  async getCacheSize() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.cachePrefix));
      
      let totalSize = 0;
      for (const key of cacheKeys) {
        const item = await AsyncStorage.getItem(key);
        if (item) {
          totalSize += new Blob([item]).size;
        }
      }
      
      return totalSize;
    } catch (error) {
      console.error('Error calculating cache size:', error);
      return 0;
    }
  }

  // Cache emergency contacts
  async cacheEmergencyContacts(contacts) {
    return await this.cacheData('emergencyContacts', contacts, { encrypted: true });
  }

  // Get cached emergency contacts
  async getCachedEmergencyContacts() {
    return await this.getCachedData('emergencyContacts');
  }

  // Cache QR code data
  async cacheQRCode(qrData) {
    return await this.cacheData('qrCode', qrData, { encrypted: true });
  }

  // Get cached QR code
  async getCachedQRCode() {
    return await this.getCachedData('qrCode');
  }

  // Cache safety zones
  async cacheSafetyZones(zones) {
    return await this.cacheData('safetyZones', zones);
  }

  // Get cached safety zones
  async getCachedSafetyZones() {
    return await this.getCachedData('safetyZones');
  }

  // Cache last known location
  async cacheLastLocation(location) {
    return await this.cacheData('lastLocation', location);
  }

  // Get cached last location
  async getCachedLastLocation() {
    return await this.getCachedData('lastLocation');
  }

  // Cache user profile
  async cacheUserProfile(profile) {
    return await this.cacheData('userProfile', profile, { encrypted: true });
  }

  // Get cached user profile
  async getCachedUserProfile() {
    return await this.getCachedData('userProfile');
  }
}

// Create singleton instance
const offlineCacheService = new OfflineCacheService();

export { offlineCacheService };
export default offlineCacheService;