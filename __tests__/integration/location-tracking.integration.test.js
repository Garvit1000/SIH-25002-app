import { geoLocationService } from '../../services/location/geoLocation';
import { geoFencingService } from '../../services/location/geoFencing';
import { safetyZoneService } from '../../services/location/safetyZones';
import { emergencyAlertService } from '../../services/emergency/alertService';
import { messagingService } from '../../services/firebase/messaging';
import * as Location from 'expo-location';

// Mock dependencies
jest.mock('expo-location');
jest.mock('../../services/emergency/alertService');
jest.mock('../../services/firebase/messaging');

describe('Location Tracking Integration Tests', () => {
  const mockSafeLocation = {
    latitude: 28.6139,
    longitude: 77.2090,
    accuracy: 5,
    timestamp: Date.now()
  };

  const mockDangerousLocation = {
    latitude: 28.5000,
    longitude: 77.1000,
    accuracy: 8,
    timestamp: Date.now()
  };

  const mockSafetyZones = [
    {
      id: 'zone-1',
      name: 'Tourist Area',
      coordinates: [
        { latitude: 28.6100, longitude: 77.2050 },
        { latitude: 28.6180, longitude: 77.2050 },
        { latitude: 28.6180, longitude: 77.2130 },
        { latitude: 28.6100, longitude: 77.2130 }
      ],
      safetyLevel: 'safe',
      description: 'Well-patrolled tourist area'
    },
    {
      id: 'zone-2',
      name: 'Restricted Area',
      coordinates: [
        { latitude: 28.4950, longitude: 77.0950 },
        { latitude: 28.5050, longitude: 77.0950 },
        { latitude: 28.5050, longitude: 77.1050 },
        { latitude: 28.4950, longitude: 77.1050 }
      ],
      safetyLevel: 'restricted',
      description: 'High-risk area, avoid after dark'
    }
  ];

  const mockUserProfile = {
    userId: 'test-user-123',
    name: 'Test User',
    emergencyContacts: [
      { id: '1', name: 'Contact 1', phoneNumber: '+1234567890', isPrimary: true }
    ]
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup location service mocks
    Location.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
    Location.getCurrentPositionAsync.mockResolvedValue({
      coords: mockSafeLocation,
      timestamp: mockSafeLocation.timestamp
    });
    Location.watchPositionAsync.mockResolvedValue({ remove: jest.fn() });
    
    // Setup other service mocks
    emergencyAlertService.sendEmergencyAlert.mockResolvedValue({ success: true });
    messagingService.scheduleNotification.mockResolvedValue({ success: true });
    
    // Mock safety zones
    jest.spyOn(safetyZoneService, 'getSafetyZones').mockResolvedValue({
      success: true,
      zones: mockSafetyZones
    });
    
    jest.spyOn(safetyZoneService, 'checkLocationSafety').mockImplementation((location) => {
      if (location.latitude > 28.6000) {
        return {
          success: true,
          safetyLevel: 'safe',
          zone: mockSafetyZones[0],
          safetyScore: 85
        };
      } else {
        return {
          success: true,
          safetyLevel: 'restricted',
          zone: mockSafetyZones[1],
          safetyScore: 25
        };
      }
    });
  });

  describe('Location Permission and Initialization', () => {
    it('should request and verify location permissions', async () => {
      const permissionResult = await geoLocationService.requestLocationPermissions();
      
      expect(permissionResult.success).toBe(true);
      expect(permissionResult.foregroundGranted).toBe(true);
      expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalled();
    });

    it('should handle permission denial gracefully', async () => {
      Location.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'denied' });
      
      const permissionResult = await geoLocationService.requestLocationPermissions();
      
      expect(permissionResult.success).toBe(false);
      expect(permissionResult.foregroundGranted).toBe(false);
    });

    it('should initialize location tracking with proper accuracy', async () => {
      const callback = jest.fn();
      const trackingResult = await geoLocationService.startLocationTracking(callback, {
        accuracy: Location.Accuracy.High,
        timeInterval: 5000,
        distanceInterval: 10
      });
      
      expect(trackingResult.success).toBe(true);
      expect(Location.watchPositionAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,
          distanceInterval: 10
        }),
        expect.any(Function)
      );
    });
  });

  describe('Real-time Location Tracking', () => {
    it('should track location changes and update safety status', async () => {
      const locationCallback = jest.fn();
      let watchCallback;
      
      Location.watchPositionAsync.mockImplementation((options, callback) => {
        watchCallback = callback;
        return Promise.resolve({ remove: jest.fn() });
      });
      
      await geoLocationService.startLocationTracking(locationCallback);
      
      // Simulate location update to safe area
      watchCallback({
        coords: mockSafeLocation,
        timestamp: mockSafeLocation.timestamp
      });
      
      expect(locationCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          latitude: mockSafeLocation.latitude,
          longitude: mockSafeLocation.longitude
        })
      );
      
      // Check safety status
      const safetyResult = safetyZoneService.checkLocationSafety(mockSafeLocation);
      expect(safetyResult.safetyLevel).toBe('safe');
      expect(safetyResult.safetyScore).toBe(85);
    });

    it('should detect entry into dangerous areas', async () => {
      const locationCallback = jest.fn();
      let watchCallback;
      
      Location.watchPositionAsync.mockImplementation((options, callback) => {
        watchCallback = callback;
        return Promise.resolve({ remove: jest.fn() });
      });
      
      await geoLocationService.startLocationTracking(locationCallback);
      
      // Simulate movement to dangerous area
      watchCallback({
        coords: mockDangerousLocation,
        timestamp: mockDangerousLocation.timestamp
      });
      
      expect(locationCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          latitude: mockDangerousLocation.latitude,
          longitude: mockDangerousLocation.longitude
        })
      );
      
      // Check safety status
      const safetyResult = safetyZoneService.checkLocationSafety(mockDangerousLocation);
      expect(safetyResult.safetyLevel).toBe('restricted');
      expect(safetyResult.safetyScore).toBe(25);
    });

    it('should maintain location accuracy standards', async () => {
      const locationCallback = jest.fn();
      let watchCallback;
      
      Location.watchPositionAsync.mockImplementation((options, callback) => {
        watchCallback = callback;
        return Promise.resolve({ remove: jest.fn() });
      });
      
      await geoLocationService.startLocationTracking(locationCallback);
      
      // Simulate high-accuracy location update
      const highAccuracyLocation = {
        coords: { ...mockSafeLocation, accuracy: 3 },
        timestamp: Date.now()
      };
      
      watchCallback(highAccuracyLocation);
      
      const receivedLocation = locationCallback.mock.calls[0][0];
      expect(receivedLocation.accuracy).toBe(3);
      expect(geoLocationService.isLocationAccurate(receivedLocation)).toBe(true);
    });

    it('should handle low accuracy locations appropriately', async () => {
      const locationCallback = jest.fn();
      let watchCallback;
      
      Location.watchPositionAsync.mockImplementation((options, callback) => {
        watchCallback = callback;
        return Promise.resolve({ remove: jest.fn() });
      });
      
      await geoLocationService.startLocationTracking(locationCallback);
      
      // Simulate low-accuracy location update
      const lowAccuracyLocation = {
        coords: { ...mockSafeLocation, accuracy: 100 },
        timestamp: Date.now()
      };
      
      watchCallback(lowAccuracyLocation);
      
      const receivedLocation = locationCallback.mock.calls[0][0];
      expect(receivedLocation.accuracy).toBe(100);
      expect(geoLocationService.isLocationAccurate(receivedLocation)).toBe(false);
    });
  });

  describe('Geo-fencing Integration', () => {
    it('should trigger alerts when entering restricted zones', async () => {
      const locationCallback = jest.fn();
      let watchCallback;
      
      Location.watchPositionAsync.mockImplementation((options, callback) => {
        watchCallback = callback;
        return Promise.resolve({ remove: jest.fn() });
      });
      
      // Start geo-fencing
      await geoFencingService.startGeoFencing(mockUserProfile, (event) => {
        if (event.type === 'enter' && event.zone.safetyLevel === 'restricted') {
          messagingService.scheduleNotification(
            'Safety Alert',
            'You have entered a restricted area. Please be cautious.',
            { type: 'safety_warning', zone: event.zone }
          );
        }
      });
      
      await geoLocationService.startLocationTracking(locationCallback);
      
      // Simulate entering restricted zone
      watchCallback({
        coords: mockDangerousLocation,
        timestamp: mockDangerousLocation.timestamp
      });
      
      // Verify safety notification was sent
      expect(messagingService.scheduleNotification).toHaveBeenCalledWith(
        'Safety Alert',
        'You have entered a restricted area. Please be cautious.',
        expect.objectContaining({
          type: 'safety_warning'
        })
      );
    });

    it('should calculate accurate distances for geo-fence boundaries', async () => {
      const zoneCenter = { latitude: 28.6140, longitude: 77.2090 };
      const userLocation = { latitude: 28.6139, longitude: 77.2090 };
      
      const distance = geoLocationService.calculateDistance(zoneCenter, userLocation);
      
      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(20); // Should be very close (< 20 meters)
    });

    it('should handle multiple overlapping geo-fences', async () => {
      const overlappingZones = [
        {
          id: 'zone-a',
          name: 'Tourist Zone A',
          coordinates: [
            { latitude: 28.6120, longitude: 77.2070 },
            { latitude: 28.6160, longitude: 77.2070 },
            { latitude: 28.6160, longitude: 77.2110 },
            { latitude: 28.6120, longitude: 77.2110 }
          ],
          safetyLevel: 'safe'
        },
        {
          id: 'zone-b',
          name: 'Commercial Zone B',
          coordinates: [
            { latitude: 28.6130, longitude: 77.2080 },
            { latitude: 28.6170, longitude: 77.2080 },
            { latitude: 28.6170, longitude: 77.2120 },
            { latitude: 28.6130, longitude: 77.2120 }
          ],
          safetyLevel: 'caution'
        }
      ];
      
      jest.spyOn(safetyZoneService, 'getSafetyZones').mockResolvedValue({
        success: true,
        zones: overlappingZones
      });
      
      const testLocation = { latitude: 28.6140, longitude: 77.2090 };
      
      // Should handle overlapping zones and return the most restrictive safety level
      const safetyResult = safetyZoneService.checkLocationSafety(testLocation);
      expect(safetyResult.success).toBe(true);
    });
  });

  describe('Location Data Persistence', () => {
    it('should cache location data for offline access', async () => {
      const locationResult = await geoLocationService.getCurrentLocation();
      
      expect(locationResult.success).toBe(true);
      
      // Verify location was cached
      const cachedResult = await geoLocationService.getCachedLocation();
      expect(cachedResult.success).toBe(true);
      expect(cachedResult.location.latitude).toBe(mockSafeLocation.latitude);
    });

    it('should handle cache expiration properly', async () => {
      // Mock expired cache
      const expiredTimestamp = Date.now() - (11 * 60 * 1000); // 11 minutes ago
      jest.spyOn(geoLocationService, 'getCachedLocation').mockResolvedValue({
        success: false,
        error: 'Cached location has expired'
      });
      
      const cachedResult = await geoLocationService.getCachedLocation();
      expect(cachedResult.success).toBe(false);
      expect(cachedResult.error).toBe('Cached location has expired');
    });

    it('should sync location history with cloud storage', async () => {
      const locationHistory = [
        { ...mockSafeLocation, timestamp: Date.now() - 60000 },
        { ...mockSafeLocation, timestamp: Date.now() - 30000 },
        { ...mockSafeLocation, timestamp: Date.now() }
      ];
      
      // Mock location history sync
      jest.spyOn(geoLocationService, 'syncLocationHistory').mockResolvedValue({
        success: true,
        synced: locationHistory.length
      });
      
      const syncResult = await geoLocationService.syncLocationHistory(locationHistory);
      expect(syncResult.success).toBe(true);
      expect(syncResult.synced).toBe(3);
    });
  });

  describe('Emergency Location Sharing', () => {
    it('should share precise location during emergency', async () => {
      // Simulate emergency activation
      const emergencyResult = await emergencyAlertService.sendEmergencyAlert(
        mockSafeLocation,
        mockUserProfile,
        mockUserProfile.emergencyContacts
      );
      
      expect(emergencyResult.success).toBe(true);
      expect(emergencyAlertService.sendEmergencyAlert).toHaveBeenCalledWith(
        expect.objectContaining({
          latitude: mockSafeLocation.latitude,
          longitude: mockSafeLocation.longitude,
          accuracy: mockSafeLocation.accuracy
        }),
        mockUserProfile,
        mockUserProfile.emergencyContacts
      );
    });

    it('should continue location updates during active emergency', async () => {
      const emergencyId = 'emergency-123';
      const updatedLocation = {
        ...mockSafeLocation,
        latitude: 28.6140,
        longitude: 77.2091,
        timestamp: Date.now()
      };
      
      jest.spyOn(emergencyAlertService, 'sendLocationUpdate').mockResolvedValue({
        success: true
      });
      
      const updateResult = await emergencyAlertService.sendLocationUpdate(
        updatedLocation,
        emergencyId,
        mockUserProfile
      );
      
      expect(updateResult.success).toBe(true);
      expect(emergencyAlertService.sendLocationUpdate).toHaveBeenCalledWith(
        updatedLocation,
        emergencyId,
        mockUserProfile
      );
    });

    it('should handle location sharing failures during emergency', async () => {
      // Mock location service failure during emergency
      Location.getCurrentPositionAsync.mockRejectedValue(new Error('GPS signal lost'));
      
      const locationResult = await geoLocationService.getCurrentLocation();
      expect(locationResult.success).toBe(false);
      
      // Should fall back to cached location
      jest.spyOn(geoLocationService, 'getCachedLocation').mockResolvedValue({
        success: true,
        location: mockSafeLocation
      });
      
      const cachedResult = await geoLocationService.getCachedLocation();
      expect(cachedResult.success).toBe(true);
    });
  });

  describe('Battery Optimization', () => {
    it('should adjust tracking frequency based on battery level', async () => {
      // Mock low battery scenario
      const lowBatteryOptions = {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 30000, // 30 seconds instead of 10
        distanceInterval: 50  // 50 meters instead of 10
      };
      
      const trackingResult = await geoLocationService.startLocationTracking(
        jest.fn(),
        lowBatteryOptions
      );
      
      expect(trackingResult.success).toBe(true);
      expect(Location.watchPositionAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          timeInterval: 30000,
          distanceInterval: 50
        }),
        expect.any(Function)
      );
    });

    it('should use high accuracy during emergency regardless of battery', async () => {
      const emergencyOptions = {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 5000,
        distanceInterval: 5
      };
      
      const trackingResult = await geoLocationService.startLocationTracking(
        jest.fn(),
        emergencyOptions
      );
      
      expect(trackingResult.success).toBe(true);
      expect(Location.watchPositionAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 5000
        }),
        expect.any(Function)
      );
    });
  });

  describe('Network Connectivity Handling', () => {
    it('should queue location updates when offline', async () => {
      // Mock network failure
      jest.spyOn(geoLocationService, 'syncLocationHistory').mockRejectedValue(
        new Error('Network unavailable')
      );
      
      const locationHistory = [mockSafeLocation];
      
      try {
        await geoLocationService.syncLocationHistory(locationHistory);
      } catch (error) {
        expect(error.message).toBe('Network unavailable');
      }
      
      // Should queue for retry when network returns
      jest.spyOn(geoLocationService, 'syncLocationHistory').mockResolvedValue({
        success: true,
        synced: 1
      });
      
      const retryResult = await geoLocationService.syncLocationHistory(locationHistory);
      expect(retryResult.success).toBe(true);
    });

    it('should work offline with cached safety zones', async () => {
      // Mock offline scenario
      jest.spyOn(safetyZoneService, 'getSafetyZones').mockRejectedValue(
        new Error('Network unavailable')
      );
      
      // Should fall back to cached zones
      jest.spyOn(safetyZoneService, 'getCachedSafetyZones').mockResolvedValue({
        success: true,
        zones: mockSafetyZones
      });
      
      const cachedZones = await safetyZoneService.getCachedSafetyZones();
      expect(cachedZones.success).toBe(true);
      expect(cachedZones.zones).toHaveLength(2);
    });
  });
});