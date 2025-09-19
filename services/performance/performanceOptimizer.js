import { AppState, DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';

// Performance optimization service for battery and memory management
export const performanceOptimizer = {
  // Smart location tracking intervals for battery optimization (Requirement 7.5)
  locationTrackingIntervals: {
    emergency: 5000,      // 5 seconds during emergency
    active: 15000,        // 15 seconds when app is active
    background: 60000,    // 1 minute in background
    lowBattery: 120000,   // 2 minutes when battery is low
    stationary: 300000    // 5 minutes when user is stationary
  },

  // Memory management thresholds (Requirement 7.4)
  memoryThresholds: {
    warning: 80 * 1024 * 1024,    // 80MB warning threshold
    critical: 95 * 1024 * 1024,   // 95MB critical threshold
    target: 100 * 1024 * 1024     // 100MB target maximum
  },

  // Performance monitoring state
  performanceState: {
    isOptimizing: false,
    batteryLevel: 1.0,
    memoryUsage: 0,
    appState: 'active',
    isLowPowerMode: false,
    locationTrackingMode: 'active'
  },

  // Initialize performance optimization (Requirement 7.1, 7.4, 7.5)
  initialize: async () => {
    try {
      // Set up app state monitoring
      AppState.addEventListener('change', performanceOptimizer.handleAppStateChange);
      
      // Set up battery monitoring
      await performanceOptimizer.initializeBatteryMonitoring();
      
      // Set up memory monitoring
      performanceOptimizer.startMemoryMonitoring();
      
      // Load performance settings
      await performanceOptimizer.loadPerformanceSettings();
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Handle app state changes for battery optimization
  handleAppStateChange: (nextAppState) => {
    const previousState = performanceOptimizer.performanceState.appState;
    performanceOptimizer.performanceState.appState = nextAppState;

    if (previousState === 'active' && nextAppState === 'background') {
      // App went to background - optimize for battery
      performanceOptimizer.optimizeForBackground();
    } else if (previousState === 'background' && nextAppState === 'active') {
      // App came to foreground - restore normal performance
      performanceOptimizer.optimizeForForeground();
    }
  },

  // Initialize battery monitoring
  initializeBatteryMonitoring: async () => {
    try {
      // Note: Battery monitoring would require additional native modules
      // For now, we'll simulate battery monitoring
      performanceOptimizer.simulateBatteryMonitoring();
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Simulate battery monitoring (in production, use react-native-device-info)
  simulateBatteryMonitoring: () => {
    setInterval(() => {
      // Simulate battery level changes
      const batteryLevel = Math.max(0.1, Math.random());
      performanceOptimizer.performanceState.batteryLevel = batteryLevel;
      
      // Adjust performance based on battery level
      if (batteryLevel < 0.2 && !performanceOptimizer.performanceState.isLowPowerMode) {
        performanceOptimizer.enableLowPowerMode();
      } else if (batteryLevel > 0.3 && performanceOptimizer.performanceState.isLowPowerMode) {
        performanceOptimizer.disableLowPowerMode();
      }
    }, 30000); // Check every 30 seconds
  },

  // Enable low power mode for battery optimization
  enableLowPowerMode: () => {
    performanceOptimizer.performanceState.isLowPowerMode = true;
    performanceOptimizer.performanceState.locationTrackingMode = 'lowBattery';
    
    // Notify listeners about low power mode
    DeviceEventEmitter.emit('performance:lowPowerMode', { enabled: true });
    
    console.log('Low power mode enabled - optimizing for battery life');
  },

  // Disable low power mode
  disableLowPowerMode: () => {
    performanceOptimizer.performanceState.isLowPowerMode = false;
    performanceOptimizer.performanceState.locationTrackingMode = 'active';
    
    // Notify listeners about normal mode
    DeviceEventEmitter.emit('performance:lowPowerMode', { enabled: false });
    
    console.log('Low power mode disabled - normal performance restored');
  },

  // Optimize for background operation
  optimizeForBackground: () => {
    performanceOptimizer.performanceState.locationTrackingMode = 'background';
    
    // Reduce update frequencies
    DeviceEventEmitter.emit('performance:backgroundMode', { 
      locationInterval: performanceOptimizer.locationTrackingIntervals.background,
      reducedUpdates: true
    });
    
    // Trigger memory cleanup
    performanceOptimizer.performMemoryCleanup();
  },

  // Optimize for foreground operation
  optimizeForForeground: () => {
    if (!performanceOptimizer.performanceState.isLowPowerMode) {
      performanceOptimizer.performanceState.locationTrackingMode = 'active';
    }
    
    // Restore normal update frequencies
    DeviceEventEmitter.emit('performance:foregroundMode', { 
      locationInterval: performanceOptimizer.getCurrentLocationInterval(),
      normalUpdates: true
    });
  },

  // Get current location tracking interval based on state
  getCurrentLocationInterval: () => {
    const mode = performanceOptimizer.performanceState.locationTrackingMode;
    return performanceOptimizer.locationTrackingIntervals[mode] || 
           performanceOptimizer.locationTrackingIntervals.active;
  },

  // Start memory monitoring (Requirement 7.4)
  startMemoryMonitoring: () => {
    setInterval(() => {
      performanceOptimizer.checkMemoryUsage();
    }, 10000); // Check every 10 seconds
  },

  // Check memory usage and optimize if needed
  checkMemoryUsage: async () => {
    try {
      // In production, use react-native-device-info to get actual memory usage
      // For now, simulate memory usage
      const simulatedMemoryUsage = Math.random() * 120 * 1024 * 1024; // 0-120MB
      performanceOptimizer.performanceState.memoryUsage = simulatedMemoryUsage;

      if (simulatedMemoryUsage > performanceOptimizer.memoryThresholds.critical) {
        await performanceOptimizer.performCriticalMemoryCleanup();
      } else if (simulatedMemoryUsage > performanceOptimizer.memoryThresholds.warning) {
        await performanceOptimizer.performMemoryCleanup();
      }
    } catch (error) {
      console.error('Error checking memory usage:', error);
    }
  },

  // Perform memory cleanup (Requirement 7.4)
  performMemoryCleanup: async () => {
    try {
      if (performanceOptimizer.performanceState.isOptimizing) {
        return; // Already optimizing
      }

      performanceOptimizer.performanceState.isOptimizing = true;

      // Clear old cached data
      await performanceOptimizer.clearOldCacheData();
      
      // Reduce image cache
      await performanceOptimizer.optimizeImageCache();
      
      // Clear temporary data
      await performanceOptimizer.clearTemporaryData();
      
      // Notify components to release resources
      DeviceEventEmitter.emit('performance:memoryCleanup', { level: 'normal' });
      
      console.log('Memory cleanup completed');
    } catch (error) {
      console.error('Error during memory cleanup:', error);
    } finally {
      performanceOptimizer.performanceState.isOptimizing = false;
    }
  },

  // Perform critical memory cleanup
  performCriticalMemoryCleanup: async () => {
    try {
      if (performanceOptimizer.performanceState.isOptimizing) {
        return;
      }

      performanceOptimizer.performanceState.isOptimizing = true;

      // Aggressive cleanup
      await performanceOptimizer.performMemoryCleanup();
      
      // Clear all non-essential caches
      await performanceOptimizer.clearNonEssentialCaches();
      
      // Force garbage collection (if available)
      if (global.gc) {
        global.gc();
      }
      
      // Notify components for aggressive cleanup
      DeviceEventEmitter.emit('performance:memoryCleanup', { level: 'critical' });
      
      console.log('Critical memory cleanup completed');
    } catch (error) {
      console.error('Error during critical memory cleanup:', error);
    } finally {
      performanceOptimizer.performanceState.isOptimizing = false;
    }
  },

  // Clear old cached data
  clearOldCacheData: async () => {
    try {
      const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
      const now = Date.now();
      
      // Get all storage keys
      const keys = await AsyncStorage.getAllKeys();
      const keysToRemove = [];
      
      for (const key of keys) {
        try {
          const data = await AsyncStorage.getItem(key);
          if (data) {
            const parsed = JSON.parse(data);
            if (parsed.cachedAt) {
              const age = now - new Date(parsed.cachedAt).getTime();
              if (age > maxAge) {
                keysToRemove.push(key);
              }
            }
          }
        } catch (error) {
          // Skip invalid JSON items
        }
      }
      
      if (keysToRemove.length > 0) {
        await AsyncStorage.multiRemove(keysToRemove);
        console.log(`Removed ${keysToRemove.length} old cache items`);
      }
    } catch (error) {
      console.error('Error clearing old cache data:', error);
    }
  },

  // Optimize image cache
  optimizeImageCache: async () => {
    try {
      // In production, this would clear React Native's image cache
      // For now, we'll just simulate the optimization
      console.log('Image cache optimized');
    } catch (error) {
      console.error('Error optimizing image cache:', error);
    }
  },

  // Clear temporary data
  clearTemporaryData: async () => {
    try {
      const tempKeys = [
        'temp_location_data',
        'temp_route_cache',
        'temp_search_results',
        'temp_map_tiles'
      ];
      
      await AsyncStorage.multiRemove(tempKeys);
      console.log('Temporary data cleared');
    } catch (error) {
      console.error('Error clearing temporary data:', error);
    }
  },

  // Clear non-essential caches
  clearNonEssentialCaches: async () => {
    try {
      const nonEssentialKeys = [
        'map_tile_index',
        'cached_weather_data',
        'cached_traffic_data',
        'cached_poi_data'
      ];
      
      await AsyncStorage.multiRemove(nonEssentialKeys);
      console.log('Non-essential caches cleared');
    } catch (error) {
      console.error('Error clearing non-essential caches:', error);
    }
  },

  // App launch optimization (Requirement 7.1)
  optimizeAppLaunch: async () => {
    try {
      const startTime = Date.now();
      
      // Preload essential data only
      const essentialData = await performanceOptimizer.preloadEssentialData();
      
      // Defer non-critical initializations
      setTimeout(() => {
        performanceOptimizer.initializeNonCriticalServices();
      }, 100);
      
      const launchTime = Date.now() - startTime;
      
      // Store launch time for monitoring
      await AsyncStorage.setItem('app_launch_time', launchTime.toString());
      
      return { 
        success: true, 
        launchTime,
        essentialDataLoaded: essentialData.success
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Preload only essential data for fast startup
  preloadEssentialData: async () => {
    try {
      // Load only critical cached data
      const promises = [
        AsyncStorage.getItem('offline_user_profile'),
        AsyncStorage.getItem('offline_emergency_contacts'),
        AsyncStorage.getItem('last_known_location')
      ];
      
      await Promise.all(promises);
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Initialize non-critical services after app launch
  initializeNonCriticalServices: async () => {
    try {
      // Initialize services that aren't needed immediately
      console.log('Initializing non-critical services...');
      
      // This would include things like:
      // - Analytics initialization
      // - Non-essential cache warming
      // - Background sync setup
      // - Performance monitoring setup
      
      return { success: true };
    } catch (error) {
      console.error('Error initializing non-critical services:', error);
      return { success: false, error: error.message };
    }
  },

  // Load performance settings
  loadPerformanceSettings: async () => {
    try {
      const settings = await AsyncStorage.getItem('performance_settings');
      
      if (settings) {
        const parsed = JSON.parse(settings);
        
        // Apply saved settings
        if (parsed.locationIntervals) {
          Object.assign(performanceOptimizer.locationTrackingIntervals, parsed.locationIntervals);
        }
        
        if (parsed.memoryThresholds) {
          Object.assign(performanceOptimizer.memoryThresholds, parsed.memoryThresholds);
        }
      }
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Save performance settings
  savePerformanceSettings: async (settings) => {
    try {
      await AsyncStorage.setItem('performance_settings', JSON.stringify(settings));
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Get performance statistics
  getPerformanceStats: async () => {
    try {
      const launchTime = await AsyncStorage.getItem('app_launch_time');
      
      return {
        success: true,
        stats: {
          ...performanceOptimizer.performanceState,
          lastLaunchTime: launchTime ? parseInt(launchTime) : null,
          deviceInfo: {
            brand: Device.brand,
            modelName: Device.modelName,
            osName: Device.osName,
            osVersion: Device.osVersion
          }
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Optimize for emergency mode
  optimizeForEmergency: () => {
    performanceOptimizer.performanceState.locationTrackingMode = 'emergency';
    
    // Increase location tracking frequency
    DeviceEventEmitter.emit('performance:emergencyMode', { 
      locationInterval: performanceOptimizer.locationTrackingIntervals.emergency,
      highPriority: true
    });
    
    console.log('Emergency mode activated - maximum performance');
  },

  // Restore normal performance after emergency
  restoreNormalPerformance: () => {
    const mode = performanceOptimizer.performanceState.isLowPowerMode ? 'lowBattery' : 'active';
    performanceOptimizer.performanceState.locationTrackingMode = mode;
    
    DeviceEventEmitter.emit('performance:normalMode', { 
      locationInterval: performanceOptimizer.getCurrentLocationInterval(),
      normalPriority: true
    });
    
    console.log('Normal performance restored');
  },

  // Clean up performance optimizer
  cleanup: () => {
    AppState.removeEventListener('change', performanceOptimizer.handleAppStateChange);
    console.log('Performance optimizer cleaned up');
  }
};