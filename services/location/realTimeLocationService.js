import * as Location from 'expo-location';
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { locationPermissionHandler } from './permissionHandler';

/**
 * Real-Time Location Service
 * Implements Requirements 4.2, 4.3, 4.4, 4.5, 4.6
 */
export class RealTimeLocationService {
  constructor() {
    this.isTracking = false;
    this.trackingSubscription = null;
    this.currentLocation = null;
    this.trackingOptions = null;
    this.callbacks = {};
    this.locationHistory = [];
    this.trackingStats = {
      startTime: null,
      totalUpdates: 0,
      averageAccuracy: 0,
      batteryOptimized: false
    };
    
    this.handleAppStateChange = this.handleAppStateChange.bind(this);
  }

  /**
   * Initialize the real-time location service
   */
  initialize(callbacks = {}) {
    this.callbacks = {
      onLocationUpdate: null,
      onLocationError: null,
      onTrackingStarted: null,
      onTrackingStopped: null,
      onAccuracyChanged: null,
      ...callbacks
    };

    AppState.addEventListener('change', this.handleAppStateChange);
    this.loadTrackingState();
  }

  /**
   * Start high-accuracy real-time location tracking
   * Requirement 4.2: High-accuracy real-time location tracking
   */
  async startRealTimeTracking(options = {}) {
    try {
      const permissionResult = await locationPermissionHandler.ensureLocationPermissions({
        requireBackground: options.enableBackground || false,
        emergencyMode: options.emergencyMode || false
      });

      if (!permissionResult.success) {
        return {
          success: false,
          error: 'Location permissions not granted',
          permissionResult
        };
      }

      if (this.isTracking) {
        await this.stopRealTimeTracking();
      }

      this.trackingOptions = this.configureTrackingOptions(options);
      
      const trackingResult = await this.startLocationUpdates();
      if (!trackingResult.success) {
        return trackingResult;
      }

      this.trackingStats = {
        startTime: new Date(),
        totalUpdates: 0,
        averageAccuracy: 0,
        batteryOptimized: options.batteryOptimized || false
      };

      this.isTracking = true;
      await this.saveTrackingState();

      if (this.callbacks.onTrackingStarted) {
        this.callbacks.onTrackingStarted({
          options: this.trackingOptions,
          permissions: permissionResult.permissions
        });
      }

      return {
        success: true,
        message: 'Real-time location tracking started',
        options: this.trackingOptions
      };

    } catch (error) {
      console.error('Error starting real-time tracking:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Configure tracking options for high accuracy
   */
  configureTrackingOptions(userOptions = {}) {
    const defaultOptions = {
      accuracy: Location.Accuracy.High,
      timeInterval: 5000, // 5 second updates
      distanceInterval: 10, // 10 meter updates
      enableBackground: false,
      emergencyMode: false,
      batteryOptimized: false,
      enableSmoothing: true,
      maximumAge: 10000,
      timeout: 15000
    };

    const options = { ...defaultOptions, ...userOptions };

    // Emergency mode adjustments
    if (options.emergencyMode) {
      options.accuracy = Location.Accuracy.BestForNavigation;
      options.timeInterval = 2000;
      options.distanceInterval = 5;
      options.enableBackground = true;
      options.batteryOptimized = false;
    }

    // Battery optimization adjustments
    if (options.batteryOptimized && !options.emergencyMode) {
      options.accuracy = Location.Accuracy.Balanced;
      options.timeInterval = 15000;
      options.distanceInterval = 25;
    }

    if (Platform.OS === 'android') {
      options.mayShowUserSettingsDialog = true;
    }

    return options;
  }

  /**
   * Start location updates with smooth tracking
   */
  async startLocationUpdates() {
    try {
      this.trackingSubscription = await Location.watchPositionAsync(
        {
          accuracy: this.trackingOptions.accuracy,
          timeInterval: this.trackingOptions.timeInterval,
          distanceInterval: this.trackingOptions.distanceInterval,
          mayShowUserSettingsDialog: this.trackingOptions.mayShowUserSettingsDialog
        },
        (locationData) => {
          this.handleLocationUpdate(locationData);
        }
      );

      return { success: true };

    } catch (error) {
      console.error('Error starting location updates:', error);
      
      if (error.code === 'E_LOCATION_SERVICES_DISABLED') {
        return {
          success: false,
          error: 'Location services are disabled',
          errorCode: 'SERVICES_DISABLED'
        };
      }

      return {
        success: false,
        error: error.message,
        errorCode: error.code || 'UNKNOWN_ERROR'
      };
    }
  }

  /**
   * Handle location updates with smoothing
   * Requirement 4.3: Real-time position updates with smooth animations
   */
  async handleLocationUpdate(locationData) {
    try {
      const processedLocation = this.processLocationData(locationData);
      
      if (!this.isValidLocation(processedLocation)) {
        console.warn('Invalid location data received');
        return;
      }

      const smoothedLocation = this.trackingOptions.enableSmoothing 
        ? this.applySmoothingFilter(processedLocation)
        : processedLocation;

      this.currentLocation = smoothedLocation;
      this.addToLocationHistory(smoothedLocation);
      this.updateTrackingStats(smoothedLocation);
      
      await this.cacheLocationUpdate(smoothedLocation);
      this.checkAccuracyChanges(smoothedLocation);
      
      if (this.callbacks.onLocationUpdate) {
        this.callbacks.onLocationUpdate({
          location: smoothedLocation,
          isRealTime: true,
          trackingStats: this.trackingStats,
          timestamp: new Date()
        });
      }

    } catch (error) {
      console.error('Error handling location update:', error);
      
      if (this.callbacks.onLocationError) {
        this.callbacks.onLocationError({
          error: error.message,
          type: 'UPDATE_PROCESSING_ERROR'
        });
      }
    }
  }

  /**
   * Process raw location data
   */
  processLocationData(locationData) {
    return {
      latitude: locationData.coords.latitude,
      longitude: locationData.coords.longitude,
      accuracy: locationData.coords.accuracy,
      altitude: locationData.coords.altitude,
      heading: locationData.coords.heading,
      speed: locationData.coords.speed,
      timestamp: new Date(locationData.timestamp),
      provider: 'gps',
      isRealTime: true
    };
  }

  /**
   * Validate location data quality
   */
  isValidLocation(location) {
    if (!location.latitude || !location.longitude) return false;
    if (Math.abs(location.latitude) > 90) return false;
    if (Math.abs(location.longitude) > 180) return false;
    if (location.accuracy && location.accuracy > 1000) return false;
    
    const now = Date.now();
    const locationTime = location.timestamp.getTime();
    if (now - locationTime > 30000) return false;
    
    return true;
  }

  /**
   * Apply smoothing for smooth animations
   * Requirement 4.4: Smooth map animations
   */
  applySmoothingFilter(newLocation) {
    if (!this.currentLocation || this.locationHistory.length < 2) {
      return newLocation;
    }

    const previousLocation = this.currentLocation;
    const distance = this.calculateDistance(
      previousLocation.latitude, previousLocation.longitude,
      newLocation.latitude, newLocation.longitude
    );

    // Apply smoothing for small movements
    if (distance < 0.005) {
      const smoothingFactor = 0.3;
      
      return {
        ...newLocation,
        latitude: previousLocation.latitude + (newLocation.latitude - previousLocation.latitude) * smoothingFactor,
        longitude: previousLocation.longitude + (newLocation.longitude - previousLocation.longitude) * smoothingFactor,
        isSmoothed: true
      };
    }

    return { ...newLocation, isSmoothed: false };
  }

  /**
   * Calculate distance between two points
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  /**
   * Add location to history
   */
  addToLocationHistory(location) {
    this.locationHistory.unshift(location);
    if (this.locationHistory.length > 50) {
      this.locationHistory = this.locationHistory.slice(0, 50);
    }
  }

  /**
   * Update tracking statistics
   */
  updateTrackingStats(location) {
    this.trackingStats.totalUpdates++;
    
    const totalAccuracy = this.trackingStats.averageAccuracy * (this.trackingStats.totalUpdates - 1) + location.accuracy;
    this.trackingStats.averageAccuracy = totalAccuracy / this.trackingStats.totalUpdates;
  }

  /**
   * Check for accuracy changes
   */
  checkAccuracyChanges(location) {
    if (!this.currentLocation) return;
    
    const previousAccuracy = this.currentLocation.accuracy;
    const currentAccuracy = location.accuracy;
    
    if (Math.abs(currentAccuracy - previousAccuracy) / previousAccuracy > 0.5) {
      if (this.callbacks.onAccuracyChanged) {
        this.callbacks.onAccuracyChanged({
          previousAccuracy,
          currentAccuracy,
          change: currentAccuracy - previousAccuracy,
          quality: this.getAccuracyQuality(currentAccuracy)
        });
      }
    }
  }

  /**
   * Get accuracy quality description
   */
  getAccuracyQuality(accuracy) {
    if (accuracy <= 5) return { level: 'excellent', description: 'GPS signal is excellent' };
    if (accuracy <= 15) return { level: 'good', description: 'GPS signal is good' };
    if (accuracy <= 50) return { level: 'fair', description: 'GPS signal is fair' };
    return { level: 'poor', description: 'GPS signal is poor' };
  }

  /**
   * Stop real-time tracking
   */
  async stopRealTimeTracking() {
    try {
      if (this.trackingSubscription) {
        this.trackingSubscription.remove();
        this.trackingSubscription = null;
      }

      await this.stopBackgroundTracking();
      this.isTracking = false;
      await this.saveTrackingState();

      if (this.callbacks.onTrackingStopped) {
        this.callbacks.onTrackingStopped({
          stats: this.trackingStats,
          finalLocation: this.currentLocation
        });
      }

      return { success: true };

    } catch (error) {
      console.error('Error stopping tracking:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Start background tracking for safety
   * Requirement 4.6: Background location handling
   */
  async startBackgroundTracking() {
    try {
      const permissionResult = await locationPermissionHandler.ensureLocationPermissions({
        requireBackground: true
      });

      if (!permissionResult.success || permissionResult.permissions.background !== 'granted') {
        return {
          success: false,
          error: 'Background location permission not granted'
        };
      }

      await Location.startLocationUpdatesAsync('TOURIST_SAFETY_BACKGROUND_TASK', {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 30000,
        distanceInterval: 50,
        foregroundService: {
          notificationTitle: 'Tourist Safety - Location Monitoring',
          notificationBody: 'Monitoring your location for safety features',
          notificationColor: '#007AFF'
        }
      });

      return { success: true };

    } catch (error) {
      console.error('Error starting background tracking:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Stop background tracking
   */
  async stopBackgroundTracking() {
    try {
      await Location.stopLocationUpdatesAsync('TOURIST_SAFETY_BACKGROUND_TASK');
      return { success: true };
    } catch (error) {
      console.error('Error stopping background tracking:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle app state changes
   */
  handleAppStateChange(nextAppState) {
    if (nextAppState === 'background' && this.isTracking && this.trackingOptions.enableBackground) {
      this.startBackgroundTracking();
    } else if (nextAppState === 'active' && this.isTracking) {
      this.stopBackgroundTracking();
    }
  }

  /**
   * Get current location with high accuracy
   */
  async getCurrentLocation(options = {}) {
    try {
      const permissionResult = await locationPermissionHandler.ensureLocationPermissions();
      if (!permissionResult.success) {
        return {
          success: false,
          error: 'Location permissions not granted'
        };
      }

      const locationOptions = {
        accuracy: options.highAccuracy ? Location.Accuracy.BestForNavigation : Location.Accuracy.High,
        maximumAge: options.maximumAge || 10000,
        timeout: options.timeout || 15000
      };

      const location = await Location.getCurrentPositionAsync(locationOptions);
      const processedLocation = this.processLocationData(location);

      await this.cacheLocationUpdate(processedLocation);

      return {
        success: true,
        location: processedLocation
      };

    } catch (error) {
      console.error('Error getting current location:', error);
      
      const cachedLocation = await this.getLastCachedLocation();
      if (cachedLocation.success) {
        return {
          success: true,
          location: cachedLocation.location,
          isCached: true,
          warning: 'Using cached location: ' + error.message
        };
      }

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Cache location for offline access
   */
  async cacheLocationUpdate(location) {
    try {
      await AsyncStorage.setItem('last_location_update', JSON.stringify({
        location,
        timestamp: new Date().toISOString()
      }));
    } catch (error) {
      console.error('Error caching location:', error);
    }
  }

  /**
   * Get last cached location
   */
  async getLastCachedLocation() {
    try {
      const cached = await AsyncStorage.getItem('last_location_update');
      if (!cached) {
        return { success: false, error: 'No cached location found' };
      }

      const { location, timestamp } = JSON.parse(cached);
      return {
        success: true,
        location,
        cachedAt: timestamp
      };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Save tracking state
   */
  async saveTrackingState() {
    try {
      const state = {
        isTracking: this.isTracking,
        trackingOptions: this.trackingOptions,
        trackingStats: this.trackingStats,
        currentLocation: this.currentLocation,
        timestamp: new Date().toISOString()
      };

      await AsyncStorage.setItem('tracking_state', JSON.stringify(state));
    } catch (error) {
      console.error('Error saving tracking state:', error);
    }
  }

  /**
   * Load tracking state
   */
  async loadTrackingState() {
    try {
      const state = await AsyncStorage.getItem('tracking_state');
      if (state) {
        const parsedState = JSON.parse(state);
        
        const stateAge = Date.now() - new Date(parsedState.timestamp).getTime();
        if (stateAge < 3600000) {
          this.currentLocation = parsedState.currentLocation;
          this.trackingStats = parsedState.trackingStats || this.trackingStats;
        }
      }
    } catch (error) {
      console.error('Error loading tracking state:', error);
    }
  }

  /**
   * Get tracking statistics
   */
  getTrackingStats() {
    return {
      ...this.trackingStats,
      isTracking: this.isTracking,
      currentLocation: this.currentLocation,
      locationHistoryCount: this.locationHistory.length,
      trackingDuration: this.trackingStats.startTime 
        ? Date.now() - this.trackingStats.startTime.getTime()
        : 0
    };
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    this.stopRealTimeTracking();
    AppState.removeEventListener('change', this.handleAppStateChange);
  }
}

export const realTimeLocationService = new RealTimeLocationService();