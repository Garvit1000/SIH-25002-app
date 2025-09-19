import { geoLocationService } from '../../../services/location/geoLocation';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock dependencies
jest.mock('expo-location');
jest.mock('@react-native-async-storage/async-storage');

describe('Geo Location Service', () => {
  const mockLocation = {
    coords: {
      latitude: 28.6139,
      longitude: 77.2090,
      accuracy: 10,
      altitude: 100,
      heading: 0,
      speed: 0
    },
    timestamp: Date.now()
  };

  const mockAddress = [
    {
      street: 'Connaught Place',
      city: 'New Delhi',
      region: 'Delhi',
      country: 'India',
      postalCode: '110001'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    Location.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
    Location.requestBackgroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
    Location.getCurrentPositionAsync.mockResolvedValue(mockLocation);
    Location.reverseGeocodeAsync.mockResolvedValue(mockAddress);
    Location.watchPositionAsync.mockResolvedValue({ remove: jest.fn() });
    AsyncStorage.setItem.mockResolvedValue();
    AsyncStorage.getItem.mockResolvedValue(null);
  });

  describe('requestLocationPermissions', () => {
    it('should request foreground permissions successfully', async () => {
      const result = await geoLocationService.requestLocationPermissions();

      expect(result.success).toBe(true);
      expect(result.foregroundGranted).toBe(true);
      expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalled();
    });

    it('should request background permissions when specified', async () => {
      const result = await geoLocationService.requestLocationPermissions(true);

      expect(result.success).toBe(true);
      expect(result.backgroundGranted).toBe(true);
      expect(Location.requestBackgroundPermissionsAsync).toHaveBeenCalled();
    });

    it('should handle permission denial', async () => {
      Location.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'denied' });

      const result = await geoLocationService.requestLocationPermissions();

      expect(result.success).toBe(false);
      expect(result.foregroundGranted).toBe(false);
      expect(result.error).toContain('Location permission denied');
    });

    it('should handle permission errors', async () => {
      Location.requestForegroundPermissionsAsync.mockRejectedValue(new Error('Permission error'));

      const result = await geoLocationService.requestLocationPermissions();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Permission error');
    });
  });

  describe('getCurrentLocation', () => {
    it('should get current location successfully', async () => {
      const result = await geoLocationService.getCurrentLocation();

      expect(result.success).toBe(true);
      expect(result.location).toEqual({
        latitude: mockLocation.coords.latitude,
        longitude: mockLocation.coords.longitude,
        accuracy: mockLocation.coords.accuracy,
        altitude: mockLocation.coords.altitude,
        heading: mockLocation.coords.heading,
        speed: mockLocation.coords.speed,
        timestamp: new Date(mockLocation.timestamp)
      });
    });

    it('should use high accuracy by default', async () => {
      await geoLocationService.getCurrentLocation();

      expect(Location.getCurrentPositionAsync).toHaveBeenCalledWith({
        accuracy: Location.Accuracy.High,
        maximumAge: 10000,
        timeout: 15000
      });
    });

    it('should use custom accuracy when specified', async () => {
      await geoLocationService.getCurrentLocation({ accuracy: Location.Accuracy.Balanced });

      expect(Location.getCurrentPositionAsync).toHaveBeenCalledWith({
        accuracy: Location.Accuracy.Balanced,
        maximumAge: 10000,
        timeout: 15000
      });
    });

    it('should handle location errors', async () => {
      Location.getCurrentPositionAsync.mockRejectedValue(new Error('Location unavailable'));

      const result = await geoLocationService.getCurrentLocation();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Location unavailable');
    });

    it('should cache location when successful', async () => {
      await geoLocationService.getCurrentLocation();

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'cached_location',
        expect.stringContaining(mockLocation.coords.latitude.toString())
      );
    });
  });

  describe('getAddressFromCoordinates', () => {
    it('should get address from coordinates successfully', async () => {
      const result = await geoLocationService.getAddressFromCoordinates(
        mockLocation.coords.latitude,
        mockLocation.coords.longitude
      );

      expect(result.success).toBe(true);
      expect(result.address).toEqual({
        street: mockAddress[0].street,
        city: mockAddress[0].city,
        region: mockAddress[0].region,
        country: mockAddress[0].country,
        postalCode: mockAddress[0].postalCode,
        formattedAddress: 'Connaught Place, New Delhi, Delhi, India 110001'
      });
    });

    it('should handle reverse geocoding errors', async () => {
      Location.reverseGeocodeAsync.mockRejectedValue(new Error('Geocoding failed'));

      const result = await geoLocationService.getAddressFromCoordinates(
        mockLocation.coords.latitude,
        mockLocation.coords.longitude
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Geocoding failed');
    });

    it('should handle empty geocoding results', async () => {
      Location.reverseGeocodeAsync.mockResolvedValue([]);

      const result = await geoLocationService.getAddressFromCoordinates(
        mockLocation.coords.latitude,
        mockLocation.coords.longitude
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('No address found for the given coordinates');
    });

    it('should validate coordinates', async () => {
      const result = await geoLocationService.getAddressFromCoordinates(null, null);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid coordinates provided');
    });
  });

  describe('startLocationTracking', () => {
    const mockCallback = jest.fn();

    it('should start location tracking successfully', async () => {
      const result = await geoLocationService.startLocationTracking(mockCallback);

      expect(result.success).toBe(true);
      expect(result.watchId).toBeDefined();
      expect(Location.watchPositionAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          accuracy: Location.Accuracy.High,
          timeInterval: 10000,
          distanceInterval: 10
        }),
        expect.any(Function)
      );
    });

    it('should use custom options when provided', async () => {
      const customOptions = {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 5000,
        distanceInterval: 5
      };

      await geoLocationService.startLocationTracking(mockCallback, customOptions);

      expect(Location.watchPositionAsync).toHaveBeenCalledWith(
        expect.objectContaining(customOptions),
        expect.any(Function)
      );
    });

    it('should handle tracking errors', async () => {
      Location.watchPositionAsync.mockRejectedValue(new Error('Tracking failed'));

      const result = await geoLocationService.startLocationTracking(mockCallback);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Tracking failed');
    });

    it('should call callback with location updates', async () => {
      let locationCallback;
      Location.watchPositionAsync.mockImplementation((options, callback) => {
        locationCallback = callback;
        return Promise.resolve({ remove: jest.fn() });
      });

      await geoLocationService.startLocationTracking(mockCallback);
      
      // Simulate location update
      locationCallback(mockLocation);

      expect(mockCallback).toHaveBeenCalledWith({
        latitude: mockLocation.coords.latitude,
        longitude: mockLocation.coords.longitude,
        accuracy: mockLocation.coords.accuracy,
        altitude: mockLocation.coords.altitude,
        heading: mockLocation.coords.heading,
        speed: mockLocation.coords.speed,
        timestamp: new Date(mockLocation.timestamp)
      });
    });
  });

  describe('stopLocationTracking', () => {
    it('should stop location tracking successfully', async () => {
      const mockRemove = jest.fn();
      const watchId = { remove: mockRemove };

      const result = await geoLocationService.stopLocationTracking(watchId);

      expect(result.success).toBe(true);
      expect(mockRemove).toHaveBeenCalled();
    });

    it('should handle invalid watch ID', async () => {
      const result = await geoLocationService.stopLocationTracking(null);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid watch ID provided');
    });

    it('should handle stop tracking errors', async () => {
      const mockRemove = jest.fn().mockImplementation(() => {
        throw new Error('Stop failed');
      });
      const watchId = { remove: mockRemove };

      const result = await geoLocationService.stopLocationTracking(watchId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Stop failed');
    });
  });

  describe('getCachedLocation', () => {
    it('should get cached location successfully', async () => {
      const cachedData = JSON.stringify({
        latitude: 28.6139,
        longitude: 77.2090,
        timestamp: Date.now() - 5000 // 5 seconds ago
      });
      AsyncStorage.getItem.mockResolvedValue(cachedData);

      const result = await geoLocationService.getCachedLocation();

      expect(result.success).toBe(true);
      expect(result.location).toBeDefined();
      expect(result.location.latitude).toBe(28.6139);
    });

    it('should handle no cached location', async () => {
      AsyncStorage.getItem.mockResolvedValue(null);

      const result = await geoLocationService.getCachedLocation();

      expect(result.success).toBe(false);
      expect(result.error).toBe('No cached location found');
    });

    it('should handle expired cached location', async () => {
      const expiredData = JSON.stringify({
        latitude: 28.6139,
        longitude: 77.2090,
        timestamp: Date.now() - (11 * 60 * 1000) // 11 minutes ago
      });
      AsyncStorage.getItem.mockResolvedValue(expiredData);

      const result = await geoLocationService.getCachedLocation();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cached location has expired');
    });

    it('should handle corrupted cached data', async () => {
      AsyncStorage.getItem.mockResolvedValue('invalid-json');

      const result = await geoLocationService.getCachedLocation();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to parse cached location');
    });
  });

  describe('calculateDistance', () => {
    const point1 = { latitude: 28.6139, longitude: 77.2090 };
    const point2 = { latitude: 28.6129, longitude: 77.2080 };

    it('should calculate distance between two points', () => {
      const distance = geoLocationService.calculateDistance(point1, point2);

      expect(typeof distance).toBe('number');
      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(1000); // Should be less than 1km for close points
    });

    it('should return 0 for same coordinates', () => {
      const distance = geoLocationService.calculateDistance(point1, point1);

      expect(distance).toBe(0);
    });

    it('should handle invalid coordinates', () => {
      const distance = geoLocationService.calculateDistance(null, point2);

      expect(distance).toBe(null);
    });
  });

  describe('isLocationAccurate', () => {
    it('should return true for accurate location', () => {
      const accurateLocation = { accuracy: 5 };
      const result = geoLocationService.isLocationAccurate(accurateLocation);

      expect(result).toBe(true);
    });

    it('should return false for inaccurate location', () => {
      const inaccurateLocation = { accuracy: 100 };
      const result = geoLocationService.isLocationAccurate(inaccurateLocation);

      expect(result).toBe(false);
    });

    it('should use custom threshold when provided', () => {
      const location = { accuracy: 15 };
      const result = geoLocationService.isLocationAccurate(location, 20);

      expect(result).toBe(true);
    });

    it('should handle missing accuracy', () => {
      const location = {};
      const result = geoLocationService.isLocationAccurate(location);

      expect(result).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle location service unavailable', async () => {
      Location.getCurrentPositionAsync.mockRejectedValue(new Error('Location services disabled'));

      const result = await geoLocationService.getCurrentLocation();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Location services disabled');
    });

    it('should handle network timeout', async () => {
      Location.getCurrentPositionAsync.mockRejectedValue(new Error('Network timeout'));

      const result = await geoLocationService.getCurrentLocation();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network timeout');
    });

    it('should validate location data before caching', async () => {
      const invalidLocation = {
        coords: {
          latitude: null,
          longitude: 77.2090
        }
      };
      Location.getCurrentPositionAsync.mockResolvedValue(invalidLocation);

      const result = await geoLocationService.getCurrentLocation();

      expect(result.success).toBe(false);
      expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    });
  });
});