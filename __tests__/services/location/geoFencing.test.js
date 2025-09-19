import { geoFencingService } from '../../../services/location/geoFencing';
import { geoLocationService } from '../../../services/location/geoLocation';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock dependencies
jest.mock('../../../services/location/geoLocation');
jest.mock('@react-native-async-storage/async-storage');

describe('geoFencingService', () => {
  const mockSafetyZones = [
    {
      id: 'zone_001',
      name: 'Safe Zone',
      safetyLevel: 'safe',
      coordinates: [
        { latitude: 28.6139, longitude: 77.2090 },
        { latitude: 28.6150, longitude: 77.2100 },
        { latitude: 28.6140, longitude: 77.2110 },
        { latitude: 28.6130, longitude: 77.2100 }
      ],
      emergencyServices: [
        { type: 'police', number: '100', distance: '0.2km' }
      ]
    },
    {
      id: 'zone_002',
      name: 'Caution Zone',
      safetyLevel: 'caution',
      coordinates: [
        { latitude: 28.6120, longitude: 77.2080 },
        { latitude: 28.6130, longitude: 77.2090 },
        { latitude: 28.6125, longitude: 77.2095 },
        { latitude: 28.6115, longitude: 77.2085 }
      ],
      emergencyServices: []
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    geoLocationService.calculateDistance.mockImplementation((lat1, lon1, lat2, lon2) => {
      return Math.sqrt(Math.pow(lat2 - lat1, 2) + Math.pow(lon2 - lon1, 2)) * 111;
    });
  });

  describe('isPointInPolygon', () => {
    it('should detect point inside polygon', () => {
      const point = { latitude: 28.6140, longitude: 77.2095 };
      const polygon = mockSafetyZones[0].coordinates;

      const result = geoFencingService.isPointInPolygon(point, polygon);
      expect(result).toBe(true);
    });

    it('should detect point outside polygon', () => {
      const point = { latitude: 28.6200, longitude: 77.2200 };
      const polygon = mockSafetyZones[0].coordinates;

      const result = geoFencingService.isPointInPolygon(point, polygon);
      expect(result).toBe(false);
    });
  });

  describe('checkSafetyZone', () => {
    it('should identify safe zone correctly', async () => {
      const location = { latitude: 28.6140, longitude: 77.2095 };

      const result = await geoFencingService.checkSafetyZone(location, mockSafetyZones);

      expect(result.success).toBe(true);
      expect(result.safetyLevel).toBe('safe');
      expect(result.isInSafeZone).toBe(true);
      expect(result.zone.id).toBe('zone_001');
    });

    it('should handle location outside all zones', async () => {
      const location = { latitude: 28.7000, longitude: 77.3000 };

      const result = await geoFencingService.checkSafetyZone(location, mockSafetyZones);

      expect(result.success).toBe(true);
      expect(result.safetyLevel).toBe('caution');
      expect(result.isInSafeZone).toBe(false);
      expect(result.zone).toBe(null);
    });
  });

  describe('calculateAdvancedSafetyScore', () => {
    it('should calculate safety score with time factors', async () => {
      const location = { latitude: 28.6140, longitude: 77.2095 };
      
      // Mock Date to return daytime
      const mockDate = new Date('2024-01-15T14:00:00Z');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);

      const result = await geoFencingService.calculateAdvancedSafetyScore(
        location, 
        mockSafetyZones
      );

      expect(result.success).toBe(true);
      expect(result.score).toBeGreaterThan(0);
      expect(result.factors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            factor: 'Day time',
            impact: 10
          })
        ])
      );

      global.Date.mockRestore();
    });

    it('should reduce score during night time', async () => {
      const location = { latitude: 28.6140, longitude: 77.2095 };
      
      // Mock Date to return nighttime
      const mockDate = new Date('2024-01-15T23:00:00Z');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);

      const result = await geoFencingService.calculateAdvancedSafetyScore(
        location, 
        mockSafetyZones
      );

      expect(result.success).toBe(true);
      expect(result.factors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            factor: 'Night time',
            impact: -20
          })
        ])
      );

      global.Date.mockRestore();
    });

    it('should consider crowd density factors', async () => {
      const location = { latitude: 28.6140, longitude: 77.2095 };
      const options = { crowdDensity: 0.8 }; // High crowd density

      const result = await geoFencingService.calculateAdvancedSafetyScore(
        location, 
        mockSafetyZones,
        options
      );

      expect(result.success).toBe(true);
      expect(result.factors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            factor: 'High crowd density',
            impact: 5
          })
        ])
      );
    });

    it('should consider weather conditions', async () => {
      const location = { latitude: 28.6140, longitude: 77.2095 };
      const options = { weather: 'rain' };

      const result = await geoFencingService.calculateAdvancedSafetyScore(
        location, 
        mockSafetyZones,
        options
      );

      expect(result.success).toBe(true);
      expect(result.factors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            factor: 'Bad weather',
            impact: -15
          })
        ])
      );
    });
  });

  describe('getRiskLevel', () => {
    it('should classify risk levels correctly', () => {
      expect(geoFencingService.getRiskLevel(85)).toBe('low');
      expect(geoFencingService.getRiskLevel(65)).toBe('medium');
      expect(geoFencingService.getRiskLevel(45)).toBe('high');
      expect(geoFencingService.getRiskLevel(25)).toBe('critical');
    });
  });

  describe('generateSafetyAlert', () => {
    it('should generate danger alert for restricted zones', () => {
      const location = { latitude: 28.6140, longitude: 77.2095 };
      const safetyStatus = { safetyLevel: 'restricted' };
      const safetyScore = { score: 20 };

      const alerts = geoFencingService.generateSafetyAlert(
        location, 
        safetyStatus, 
        safetyScore
      );

      expect(alerts).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'danger',
            title: 'Restricted Area Warning',
            priority: 'high'
          })
        ])
      );
    });

    it('should generate warning alert for caution zones', () => {
      const location = { latitude: 28.6140, longitude: 77.2095 };
      const safetyStatus = { safetyLevel: 'caution' };
      const safetyScore = { score: 60 };

      const alerts = geoFencingService.generateSafetyAlert(
        location, 
        safetyStatus, 
        safetyScore
      );

      expect(alerts).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'warning',
            title: 'Caution Area',
            priority: 'medium'
          })
        ])
      );
    });

    it('should generate low safety score alert', () => {
      const location = { latitude: 28.6140, longitude: 77.2095 };
      const safetyStatus = { safetyLevel: 'safe' };
      const safetyScore = { score: 35 };

      const alerts = geoFencingService.generateSafetyAlert(
        location, 
        safetyStatus, 
        safetyScore
      );

      expect(alerts).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'warning',
            title: 'Low Safety Score',
            priority: 'medium'
          })
        ])
      );
    });

    it('should generate night safety reminder', () => {
      const location = { latitude: 28.6140, longitude: 77.2095 };
      const safetyStatus = { safetyLevel: 'caution' };
      const safetyScore = { score: 60 };

      // Mock Date to return nighttime
      const mockDate = new Date('2024-01-15T23:00:00Z');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);

      const alerts = geoFencingService.generateSafetyAlert(
        location, 
        safetyStatus, 
        safetyScore
      );

      expect(alerts).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'info',
            title: 'Night Safety Reminder',
            priority: 'low'
          })
        ])
      );

      global.Date.mockRestore();
    });
  });

  describe('cacheZoneTransition', () => {
    it('should cache zone transitions', async () => {
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify([]));
      AsyncStorage.setItem.mockResolvedValue();

      const transition = {
        from: 'zone_001',
        to: 'zone_002',
        timestamp: new Date(),
        timeInPreviousZone: 300
      };

      await geoFencingService.cacheZoneTransition(transition);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'zone_transitions',
        expect.any(String)
      );
    });
  });

  describe('startAdvancedGeoFenceMonitoring', () => {
    it('should start monitoring with zone transition detection', async () => {
      const mockSubscription = { remove: jest.fn() };
      geoLocationService.startSmartLocationTracking.mockResolvedValue({
        success: true,
        subscription: mockSubscription
      });

      const callback = jest.fn();
      const result = await geoFencingService.startAdvancedGeoFenceMonitoring(
        mockSafetyZones,
        callback,
        { isEmergency: true }
      );

      expect(result.success).toBe(true);
      expect(geoLocationService.startSmartLocationTracking).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          isEmergency: true,
          timeInterval: 3000,
          distanceInterval: 3
        })
      );
    });
  });
});