import { safetyZonesService, mockSafetyZones } from '../../../services/location/safetyZones';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage');

describe('safetyZonesService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllSafetyZones', () => {
    it('should return all safety zones', async () => {
      const result = await safetyZonesService.getAllSafetyZones();

      expect(result.success).toBe(true);
      expect(result.zones).toHaveLength(mockSafetyZones.length);
      expect(result.zones[0]).toHaveProperty('id');
      expect(result.zones[0]).toHaveProperty('safetyLevel');
    });
  });

  describe('getSafetyZonesByLocation', () => {
    it('should return nearby safety zones', async () => {
      const result = await safetyZonesService.getSafetyZonesByLocation(
        28.6140, 77.2095, 5
      );

      expect(result.success).toBe(true);
      expect(result.zones.length).toBeGreaterThan(0);
    });

    it('should return empty array for distant location', async () => {
      const result = await safetyZonesService.getSafetyZonesByLocation(
        30.0000, 80.0000, 1 // Very distant location with small radius
      );

      expect(result.success).toBe(true);
      expect(result.zones).toHaveLength(0);
    });
  });

  describe('getSafetyZoneById', () => {
    it('should return specific safety zone', async () => {
      const result = await safetyZonesService.getSafetyZoneById('zone_001');

      expect(result.success).toBe(true);
      expect(result.zone.id).toBe('zone_001');
      expect(result.zone.name).toBe('Tourist District Central');
    });

    it('should handle non-existent zone ID', async () => {
      const result = await safetyZonesService.getSafetyZoneById('non_existent');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Safety zone not found');
    });
  });

  describe('updateSafetyZone', () => {
    it('should update existing safety zone', async () => {
      const updates = { description: 'Updated description' };
      const result = await safetyZonesService.updateSafetyZone('zone_001', updates);

      expect(result.success).toBe(true);
      expect(result.zone.description).toBe('Updated description');
      expect(result.zone.lastUpdated).toBeInstanceOf(Date);
    });

    it('should handle non-existent zone update', async () => {
      const updates = { description: 'Updated description' };
      const result = await safetyZonesService.updateSafetyZone('non_existent', updates);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Safety zone not found');
    });
  });

  describe('getEmergencyServices', () => {
    it('should return emergency services for location in zone', async () => {
      const result = await safetyZonesService.getEmergencyServices(28.6140, 77.2095);

      expect(result.success).toBe(true);
      expect(result.services).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: expect.any(String),
            number: expect.any(String)
          })
        ])
      );
    });

    it('should return default services for location outside zones', async () => {
      const result = await safetyZonesService.getEmergencyServices(30.0000, 80.0000);

      expect(result.success).toBe(true);
      expect(result.services).toEqual([
        { type: 'police', number: '100', distance: 'Unknown' },
        { type: 'medical', number: '108', distance: 'Unknown' },
        { type: 'fire', number: '101', distance: 'Unknown' },
        { type: 'tourist_helpline', number: '1363', distance: 'Unknown' }
      ]);
    });
  });

  describe('cacheSafetyZones', () => {
    it('should cache safety zones successfully', async () => {
      AsyncStorage.setItem.mockResolvedValue();

      const zones = mockSafetyZones.slice(0, 2);
      const result = await safetyZonesService.cacheSafetyZones(zones);

      expect(result.success).toBe(true);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'cached_safety_zones',
        expect.stringContaining('"zones"')
      );
    });

    it('should handle cache error', async () => {
      AsyncStorage.setItem.mockRejectedValue(new Error('Storage error'));

      const zones = mockSafetyZones.slice(0, 2);
      const result = await safetyZonesService.cacheSafetyZones(zones);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Storage error');
    });
  });

  describe('getCachedSafetyZones', () => {
    it('should return cached zones', async () => {
      const cachedData = {
        zones: mockSafetyZones.slice(0, 2),
        cachedAt: new Date().toISOString()
      };
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(cachedData));

      const result = await safetyZonesService.getCachedSafetyZones();

      expect(result.success).toBe(true);
      expect(result.zones).toHaveLength(2);
      expect(result.isStale).toBe(false);
    });

    it('should detect stale cache', async () => {
      const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
      const cachedData = {
        zones: mockSafetyZones.slice(0, 2),
        cachedAt: oldDate.toISOString()
      };
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(cachedData));

      const result = await safetyZonesService.getCachedSafetyZones();

      expect(result.success).toBe(true);
      expect(result.isStale).toBe(true);
    });

    it('should handle no cached data', async () => {
      AsyncStorage.getItem.mockResolvedValue(null);

      const result = await safetyZonesService.getCachedSafetyZones();

      expect(result.success).toBe(false);
      expect(result.error).toBe('No cached zones found');
    });
  });

  describe('getSafetyZonesWithFallback', () => {
    it('should return fresh data and cache it', async () => {
      AsyncStorage.setItem.mockResolvedValue();

      const result = await safetyZonesService.getSafetyZonesWithFallback(
        28.6140, 77.2095, 5
      );

      expect(result.success).toBe(true);
      expect(result.zones.length).toBeGreaterThan(0);
      expect(result.isOffline).toBeUndefined();
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should fallback to cached data when fresh data fails', async () => {
      // Mock fresh data failure by making getSafetyZonesByLocation fail
      const originalMethod = safetyZonesService.getSafetyZonesByLocation;
      safetyZonesService.getSafetyZonesByLocation = jest.fn().mockResolvedValue({
        success: false,
        error: 'Network error'
      });

      // Mock cached data
      const cachedData = {
        zones: mockSafetyZones,
        cachedAt: new Date().toISOString()
      };
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(cachedData));

      const result = await safetyZonesService.getSafetyZonesWithFallback(
        28.6140, 77.2095, 5
      );

      expect(result.success).toBe(true);
      expect(result.isOffline).toBe(true);
      expect(result.zones.length).toBeGreaterThan(0);

      // Restore original method
      safetyZonesService.getSafetyZonesByLocation = originalMethod;
    });
  });

  describe('getZoneDetails', () => {
    it('should return detailed zone information', async () => {
      const result = await safetyZonesService.getZoneDetails('zone_001');

      expect(result.success).toBe(true);
      expect(result.zone.id).toBe('zone_001');
      expect(result.zone.realTimeInfo).toBeDefined();
      expect(result.zone.realTimeInfo.currentCrowdLevel).toBeDefined();
      expect(result.zone.realTimeInfo.weatherImpact).toBeDefined();
    });

    it('should handle non-existent zone', async () => {
      const result = await safetyZonesService.getZoneDetails('non_existent');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Safety zone not found');
    });
  });

  describe('getCurrentCrowdLevel', () => {
    it('should calculate crowd level with time factors', () => {
      // Mock Date to return peak hours
      const mockDate = new Date('2024-01-15T18:00:00Z'); // Evening peak
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);

      const result = safetyZonesService.getCurrentCrowdLevel('medium');

      expect(result.level).toBe('medium');
      expect(result.currentFactor).toBeGreaterThan(1);
      expect(result.description).toBeDefined();

      global.Date.mockRestore();
    });

    it('should reduce crowd factor during night hours', () => {
      // Mock Date to return night time
      const mockDate = new Date('2024-01-15T02:00:00Z');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);

      const result = safetyZonesService.getCurrentCrowdLevel('high');

      expect(result.level).toBe('high');
      expect(result.currentFactor).toBeLessThan(1);

      global.Date.mockRestore();
    });
  });

  describe('getWeatherImpact', () => {
    it('should return weather impact information', () => {
      const result = safetyZonesService.getWeatherImpact();

      expect(result.condition).toBeDefined();
      expect(result.safetyImpact).toBeDefined();
      expect(result.recommendation).toBeDefined();
      expect(typeof result.safetyImpact).toBe('number');
    });
  });

  describe('getWeatherSafetyImpact', () => {
    it('should return correct impact for different weather conditions', () => {
      expect(safetyZonesService.getWeatherSafetyImpact('clear')).toBe(0);
      expect(safetyZonesService.getWeatherSafetyImpact('heavy_rain')).toBe(-20);
      expect(safetyZonesService.getWeatherSafetyImpact('fog')).toBe(-15);
    });
  });

  describe('getRecentIncidents', () => {
    it('should return incidents based on zone safety level', () => {
      const safeIncidents = safetyZonesService.getRecentIncidents('zone_001');
      const restrictedIncidents = safetyZonesService.getRecentIncidents('zone_003');

      expect(Array.isArray(safeIncidents)).toBe(true);
      expect(Array.isArray(restrictedIncidents)).toBe(true);
      expect(restrictedIncidents.length).toBeGreaterThanOrEqual(safeIncidents.length);
    });
  });

  describe('getCurrentAlerts', () => {
    it('should return alerts for restricted zones', () => {
      const alerts = safetyZonesService.getCurrentAlerts('zone_003');

      expect(Array.isArray(alerts)).toBe(true);
      expect(alerts).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'warning',
            priority: 'high'
          })
        ])
      );
    });

    it('should return risk factor alerts', () => {
      const alerts = safetyZonesService.getCurrentAlerts('zone_002');

      expect(Array.isArray(alerts)).toBe(true);
      if (alerts.length > 0) {
        expect(alerts[0]).toHaveProperty('type');
        expect(alerts[0]).toHaveProperty('message');
      }
    });
  });
});