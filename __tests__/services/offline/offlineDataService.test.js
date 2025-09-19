import AsyncStorage from '@react-native-async-storage/async-storage';
import { offlineDataService } from '../../../services/offline/offlineDataService';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
  multiRemove: jest.fn(),
  getAllKeys: jest.fn()
}));

// Mock SecureStore
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn()
}));

describe('offlineDataService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('cacheEmergencyContacts', () => {
    it('should cache emergency contacts successfully', async () => {
      const contacts = [
        { id: '1', name: 'John Doe', phoneNumber: '+1234567890', isPrimary: true }
      ];

      AsyncStorage.setItem.mockResolvedValue();

      const result = await offlineDataService.cacheEmergencyContacts(contacts);

      expect(result.success).toBe(true);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'offline_emergency_contacts',
        expect.stringContaining('"contacts"')
      );
    });

    it('should handle caching errors', async () => {
      const contacts = [];
      AsyncStorage.setItem.mockRejectedValue(new Error('Storage error'));

      const result = await offlineDataService.cacheEmergencyContacts(contacts);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Storage error');
    });
  });

  describe('getCachedEmergencyContacts', () => {
    it('should retrieve cached emergency contacts', async () => {
      const cachedData = {
        contacts: [{ id: '1', name: 'John Doe' }],
        cachedAt: new Date().toISOString(),
        version: 1
      };

      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(cachedData));

      const result = await offlineDataService.getCachedEmergencyContacts();

      expect(result.success).toBe(true);
      expect(result.contacts).toEqual(cachedData.contacts);
      expect(result.isOffline).toBe(true);
    });

    it('should handle missing cached data', async () => {
      AsyncStorage.getItem.mockResolvedValue(null);

      const result = await offlineDataService.getCachedEmergencyContacts();

      expect(result.success).toBe(false);
      expect(result.error).toBe('No cached emergency contacts found');
    });
  });

  describe('cacheSafetyZones', () => {
    it('should cache safety zones with location', async () => {
      const zones = [
        { id: 'zone1', name: 'Safe Area', safetyLevel: 'safe' }
      ];
      const location = { latitude: 28.6139, longitude: 77.2090 };

      AsyncStorage.setItem.mockResolvedValue();

      const result = await offlineDataService.cacheSafetyZones(zones, location);

      expect(result.success).toBe(true);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'offline_safety_zones',
        expect.stringContaining('"zones"')
      );
    });
  });

  describe('addToSyncQueue', () => {
    it('should add item to sync queue', async () => {
      const existingQueue = [];
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(existingQueue));
      AsyncStorage.setItem.mockResolvedValue();

      const item = {
        type: 'emergency_alert',
        data: { message: 'Test emergency' }
      };

      const result = await offlineDataService.addToSyncQueue(item);

      expect(result.success).toBe(true);
      expect(result.queueItem).toMatchObject({
        type: 'emergency_alert',
        data: { message: 'Test emergency' },
        retryCount: 0,
        maxRetries: 3
      });
    });
  });

  describe('getCacheStatistics', () => {
    it('should return cache statistics', async () => {
      const mockKeys = ['offline_emergency_contacts', 'offline_safety_zones'];
      const mockData = JSON.stringify({ cachedAt: new Date().toISOString() });

      AsyncStorage.getAllKeys.mockResolvedValue(mockKeys);
      AsyncStorage.getItem.mockResolvedValue(mockData);

      const result = await offlineDataService.getCacheStatistics();

      expect(result.success).toBe(true);
      expect(result.stats.totalItems).toBeGreaterThanOrEqual(2);
      expect(result.stats.totalSize).toBeGreaterThan(0);
    });
  });
});