import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const geoLocationService = {
  // Request location permissions
  requestPermissions: async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        return { 
          success: false, 
          error: 'Location permission not granted',
          status 
        };
      }

      return { success: true, status };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Get current location
  getCurrentLocation: async () => {
    try {
      const permissionResult = await Location.getForegroundPermissionsAsync();
      
      if (permissionResult.status !== 'granted') {
        return { success: false, error: 'Location permission not granted' };
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      return {
        success: true,
        location: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          accuracy: location.coords.accuracy,
          timestamp: new Date(location.timestamp)
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Start location tracking
  startLocationTracking: async (callback, options = {}) => {
    try {
      const permissionResult = await Location.getForegroundPermissionsAsync();
      
      if (permissionResult.status !== 'granted') {
        return { success: false, error: 'Location permission not granted' };
      }

      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: options.timeInterval || 10000, // 10 seconds
          distanceInterval: options.distanceInterval || 10, // 10 meters
        },
        (location) => {
          callback({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy,
            timestamp: new Date(location.timestamp)
          });
        }
      );

      return { success: true, subscription };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Stop location tracking
  stopLocationTracking: (subscription) => {
    if (subscription) {
      subscription.remove();
      return { success: true };
    }
    return { success: false, error: 'No active subscription found' };
  },

  // Get address from coordinates (reverse geocoding)
  getAddressFromCoordinates: async (latitude, longitude) => {
    try {
      const addresses = await Location.reverseGeocodeAsync({
        latitude,
        longitude
      });

      if (addresses.length > 0) {
        const address = addresses[0];
        const formattedAddress = [
          address.name,
          address.street,
          address.city,
          address.region,
          address.country
        ].filter(Boolean).join(', ');

        return {
          success: true,
          address: formattedAddress,
          details: address
        };
      }

      return { success: false, error: 'No address found for coordinates' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Calculate distance between two points
  calculateDistance: (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in kilometers

    return distance;
  },

  // Enhanced location tracking with battery optimization (Requirement 7.5)
  startSmartLocationTracking: async (callback, options = {}) => {
    try {
      const permissionResult = await Location.getForegroundPermissionsAsync();
      
      if (permissionResult.status !== 'granted') {
        return { success: false, error: 'Location permission not granted' };
      }

      // Smart intervals based on movement and battery optimization
      const smartOptions = {
        accuracy: Location.Accuracy.Balanced, // Balance between accuracy and battery
        timeInterval: options.isEmergency ? 5000 : 15000, // More frequent in emergency
        distanceInterval: options.isEmergency ? 5 : 20, // Smaller distance in emergency
        mayShowUserSettingsDialog: true,
      };

      const subscription = await Location.watchPositionAsync(
        smartOptions,
        (location) => {
          const locationData = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy,
            altitude: location.coords.altitude,
            heading: location.coords.heading,
            speed: location.coords.speed,
            timestamp: new Date(location.timestamp)
          };

          // Cache location for offline access
          geoLocationService.cacheLocation(locationData);
          
          callback(locationData);
        }
      );

      return { success: true, subscription };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Cache location data for offline access (Requirement 7.6)
  cacheLocation: async (locationData) => {
    try {
      const locationHistory = await geoLocationService.getLocationHistory();
      const updatedHistory = [locationData, ...locationHistory.slice(0, 99)]; // Keep last 100 locations
      
      await AsyncStorage.setItem('location_history', JSON.stringify(updatedHistory));
      await AsyncStorage.setItem('last_known_location', JSON.stringify(locationData));
    } catch (error) {
      console.error('Error caching location:', error);
    }
  },

  // Get cached location history
  getLocationHistory: async () => {
    try {
      const history = await AsyncStorage.getItem('location_history');
      return history ? JSON.parse(history) : [];
    } catch (error) {
      console.error('Error getting location history:', error);
      return [];
    }
  },

  // Get last known location for offline use
  getLastKnownLocation: async () => {
    try {
      const location = await AsyncStorage.getItem('last_known_location');
      return location ? { success: true, location: JSON.parse(location) } : { success: false, error: 'No cached location found' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Background location tracking for safety monitoring (Requirement 7.6)
  startBackgroundLocationTracking: async () => {
    try {
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      if (foregroundStatus !== 'granted') {
        return { success: false, error: 'Foreground permission not granted' };
      }

      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      if (backgroundStatus !== 'granted') {
        return { success: false, error: 'Background permission not granted' };
      }

      await Location.startLocationUpdatesAsync('BACKGROUND_LOCATION_TASK', {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 30000, // 30 seconds for background
        distanceInterval: 50, // 50 meters for background
        foregroundService: {
          notificationTitle: 'Tourist Safety App',
          notificationBody: 'Monitoring your location for safety',
        },
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Stop background location tracking
  stopBackgroundLocationTracking: async () => {
    try {
      await Location.stopLocationUpdatesAsync('BACKGROUND_LOCATION_TASK');
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Get location accuracy status
  getLocationAccuracyStatus: (accuracy) => {
    if (accuracy <= 5) return { level: 'high', message: 'GPS signal is excellent' };
    if (accuracy <= 20) return { level: 'medium', message: 'GPS signal is good' };
    if (accuracy <= 100) return { level: 'low', message: 'GPS signal is weak' };
    return { level: 'poor', message: 'GPS signal is very poor' };
  }
};