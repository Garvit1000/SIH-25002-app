import { DeviceEventEmitter } from 'react-native';
import { geoLocationService } from '../location/geoLocation';
import { performanceOptimizer } from './performanceOptimizer';

// Smart location tracking with battery optimization
export const smartLocationTracker = {
  // Tracking state
  trackingState: {
    isTracking: false,
    currentInterval: 15000,
    subscription: null,
    lastLocation: null,
    movementDetected: false,
    stationaryTime: 0,
    emergencyMode: false
  },

  // Movement detection thresholds
  movementThresholds: {
    minDistance: 10,        // 10 meters minimum movement
    stationaryTimeout: 300000, // 5 minutes to consider stationary
    significantDistance: 100   // 100 meters for significant movement
  },

  // Initialize smart location tracking (Requirement 7.5)
  initialize: async () => {
    try {
      // Listen for performance mode changes
      DeviceEventEmitter.addListener('performance:lowPowerMode', 
        smartLocationTracker.handleLowPowerMode);
      DeviceEventEmitter.addListener('performance:backgroundMode', 
        smartLocationTracker.handleBackgroundMode);
      DeviceEventEmitter.addListener('performance:foregroundMode', 
        smartLocationTracker.handleForegroundMode);
      DeviceEventEmitter.addListener('performance:emergencyMode', 
        smartLocationTracker.handleEmergencyMode);
      DeviceEventEmitter.addListener('performance:normalMode', 
        smartLocationTracker.handleNormalMode);

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Start smart location tracking with battery optimization
  startSmartTracking: async (callback, options = {}) => {
    try {
      if (smartLocationTracker.trackingState.isTracking) {
        return { success: false, error: 'Tracking already active' };
      }

      // Set initial tracking parameters
      smartLocationTracker.trackingState.emergencyMode = options.isEmergency || false;
      smartLocationTracker.trackingState.currentInterval = 
        smartLocationTracker.getOptimalInterval();

      // Start location tracking with smart callback
      const result = await geoLocationService.startSmartLocationTracking(
        (location) => smartLocationTracker.handleLocationUpdate(location, callback),
        {
          timeInterval: smartLocationTracker.trackingState.currentInterval,
          isEmergency: smartLocationTracker.trackingState.emergencyMode
        }
      );

      if (result.success) {
        smartLocationTracker.trackingState.isTracking = true;
        smartLocationTracker.trackingState.subscription = result.subscription;
        
        // Start movement detection
        smartLocationTracker.startMovementDetection();
        
        return { success: true };
      }

      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Handle location updates with smart optimization
  handleLocationUpdate: (location, callback) => {
    const previousLocation = smartLocationTracker.trackingState.lastLocation;
    smartLocationTracker.trackingState.lastLocation = location;

    // Detect movement
    if (previousLocation) {
      const distance = geoLocationService.calculateDistance(
        previousLocation.latitude,
        previousLocation.longitude,
        location.latitude,
        location.longitude
      );

      smartLocationTracker.updateMovementState(distance);
    }

    // Adjust tracking interval based on movement
    smartLocationTracker.adjustTrackingInterval();

    // Call the original callback
    callback(location);
  },

  // Update movement state based on distance
  updateMovementState: (distance) => {
    const wasMoving = smartLocationTracker.trackingState.movementDetected;
    const isMoving = distance >= smartLocationTracker.movementThresholds.minDistance;

    smartLocationTracker.trackingState.movementDetected = isMoving;

    if (isMoving) {
      smartLocationTracker.trackingState.stationaryTime = 0;
    } else {
      smartLocationTracker.trackingState.stationaryTime += 
        smartLocationTracker.trackingState.currentInterval;
    }

    // Log significant movement changes
    if (wasMoving !== isMoving) {
      console.log(`Movement state changed: ${isMoving ? 'moving' : 'stationary'}`);
    }
  },

  // Adjust tracking interval based on current state
  adjustTrackingInterval: () => {
    const newInterval = smartLocationTracker.getOptimalInterval();
    
    if (newInterval !== smartLocationTracker.trackingState.currentInterval) {
      smartLocationTracker.trackingState.currentInterval = newInterval;
      
      // Restart tracking with new interval
      smartLocationTracker.restartTrackingWithNewInterval();
    }
  },

  // Get optimal tracking interval based on current state
  getOptimalInterval: () => {
    const intervals = performanceOptimizer.locationTrackingIntervals;
    
    // Emergency mode takes priority
    if (smartLocationTracker.trackingState.emergencyMode) {
      return intervals.emergency;
    }

    // Check if stationary for extended period
    if (smartLocationTracker.trackingState.stationaryTime >= 
        smartLocationTracker.movementThresholds.stationaryTimeout) {
      return intervals.stationary;
    }

    // Use performance optimizer's current interval
    return performanceOptimizer.getCurrentLocationInterval();
  },

  // Restart tracking with new interval
  restartTrackingWithNewInterval: async () => {
    try {
      if (!smartLocationTracker.trackingState.isTracking) {
        return;
      }

      // Stop current tracking
      if (smartLocationTracker.trackingState.subscription) {
        geoLocationService.stopLocationTracking(
          smartLocationTracker.trackingState.subscription
        );
      }

      // Start with new interval
      const result = await geoLocationService.startSmartLocationTracking(
        smartLocationTracker.trackingState.lastCallback,
        {
          timeInterval: smartLocationTracker.trackingState.currentInterval,
          isEmergency: smartLocationTracker.trackingState.emergencyMode
        }
      );

      if (result.success) {
        smartLocationTracker.trackingState.subscription = result.subscription;
        console.log(`Location tracking interval adjusted to ${smartLocationTracker.trackingState.currentInterval}ms`);
      }
    } catch (error) {
      console.error('Error restarting tracking with new interval:', error);
    }
  },

  // Start movement detection monitoring
  startMovementDetection: () => {
    // Monitor movement patterns every minute
    smartLocationTracker.movementMonitor = setInterval(() => {
      smartLocationTracker.analyzeMovementPattern();
    }, 60000);
  },

  // Analyze movement patterns for optimization
  analyzeMovementPattern: () => {
    const state = smartLocationTracker.trackingState;
    
    // If stationary for long time, reduce tracking frequency
    if (state.stationaryTime > smartLocationTracker.movementThresholds.stationaryTimeout) {
      console.log('User appears stationary, optimizing battery usage');
    }
    
    // If moving frequently, ensure adequate tracking
    if (state.movementDetected) {
      console.log('User is moving, maintaining tracking accuracy');
    }
  },

  // Stop smart location tracking
  stopSmartTracking: () => {
    try {
      if (smartLocationTracker.trackingState.subscription) {
        geoLocationService.stopLocationTracking(
          smartLocationTracker.trackingState.subscription
        );
      }

      // Clear movement monitor
      if (smartLocationTracker.movementMonitor) {
        clearInterval(smartLocationTracker.movementMonitor);
        smartLocationTracker.movementMonitor = null;
      }

      // Reset state
      smartLocationTracker.trackingState = {
        isTracking: false,
        currentInterval: 15000,
        subscription: null,
        lastLocation: null,
        movementDetected: false,
        stationaryTime: 0,
        emergencyMode: false
      };

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Handle low power mode changes
  handleLowPowerMode: (event) => {
    if (event.enabled) {
      console.log('Entering low power mode - reducing location tracking frequency');
    } else {
      console.log('Exiting low power mode - restoring normal tracking frequency');
    }
    
    smartLocationTracker.adjustTrackingInterval();
  },

  // Handle background mode
  handleBackgroundMode: (event) => {
    console.log('App in background - optimizing location tracking for battery');
    smartLocationTracker.adjustTrackingInterval();
  },

  // Handle foreground mode
  handleForegroundMode: (event) => {
    console.log('App in foreground - restoring normal location tracking');
    smartLocationTracker.adjustTrackingInterval();
  },

  // Handle emergency mode
  handleEmergencyMode: (event) => {
    console.log('Emergency mode activated - maximum location tracking frequency');
    smartLocationTracker.trackingState.emergencyMode = true;
    smartLocationTracker.adjustTrackingInterval();
  },

  // Handle normal mode restoration
  handleNormalMode: (event) => {
    console.log('Normal mode restored - standard location tracking');
    smartLocationTracker.trackingState.emergencyMode = false;
    smartLocationTracker.adjustTrackingInterval();
  },

  // Get tracking statistics
  getTrackingStats: () => {
    return {
      success: true,
      stats: {
        ...smartLocationTracker.trackingState,
        optimalInterval: smartLocationTracker.getOptimalInterval(),
        movementThresholds: smartLocationTracker.movementThresholds,
        batteryOptimized: performanceOptimizer.performanceState.isLowPowerMode
      }
    };
  },

  // Update movement thresholds for different scenarios
  updateMovementThresholds: (newThresholds) => {
    Object.assign(smartLocationTracker.movementThresholds, newThresholds);
    return { success: true };
  },

  // Force emergency tracking mode
  enableEmergencyTracking: async () => {
    smartLocationTracker.trackingState.emergencyMode = true;
    smartLocationTracker.adjustTrackingInterval();
    
    // Notify performance optimizer
    performanceOptimizer.optimizeForEmergency();
    
    return { success: true };
  },

  // Disable emergency tracking mode
  disableEmergencyTracking: async () => {
    smartLocationTracker.trackingState.emergencyMode = false;
    smartLocationTracker.adjustTrackingInterval();
    
    // Restore normal performance
    performanceOptimizer.restoreNormalPerformance();
    
    return { success: true };
  },

  // Clean up smart location tracker
  cleanup: () => {
    // Remove event listeners
    DeviceEventEmitter.removeAllListeners('performance:lowPowerMode');
    DeviceEventEmitter.removeAllListeners('performance:backgroundMode');
    DeviceEventEmitter.removeAllListeners('performance:foregroundMode');
    DeviceEventEmitter.removeAllListeners('performance:emergencyMode');
    DeviceEventEmitter.removeAllListeners('performance:normalMode');
    
    // Stop tracking
    smartLocationTracker.stopSmartTracking();
    
    console.log('Smart location tracker cleaned up');
  }
};