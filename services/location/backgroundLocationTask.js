import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { geoFencingService } from './geoFencing';
import { safetyZonesService } from './safetyZones';

const BACKGROUND_LOCATION_TASK = 'TOURIST_SAFETY_BACKGROUND_TASK';

/**
 * Background Location Task Handler
 * Requirement 4.6: Background location handling for safety features
 * 
 * Handles location updates when the app is in background to:
 * - Monitor safety zones
 * - Detect zone transitions
 * - Cache location data for offline access
 * - Generate safety alerts when needed
 */

/**
 * Define the background location task
 */
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('Background location task error:', error);
    await logBackgroundError(error);
    return;
  }

  if (data) {
    try {
      const { locations } = data;
      
      if (locations && locations.length > 0) {
        const location = locations[0];
        await handleBackgroundLocationUpdate(location);
      }
    } catch (taskError) {
      console.error('Error processing background location:', taskError);
      await logBackgroundError(taskError);
    }
  }
});

/**
 * Handle background location updates
 */
async function handleBackgroundLocationUpdate(locationData) {
  try {
    const processedLocation = {
      latitude: locationData.coords.latitude,
      longitude: locationData.coords.longitude,
      accuracy: locationData.coords.accuracy,
      altitude: locationData.coords.altitude,
      heading: locationData.coords.heading,
      speed: locationData.coords.speed,
      timestamp: new Date(locationData.timestamp),
      isBackground: true
    };

    // Cache the location update
    await cacheBackgroundLocation(processedLocation);

    // Get cached safety zones for offline processing
    const safetyZonesResult = await safetyZonesService.getCachedSafetyZones();
    
    if (safetyZonesResult.success && safetyZonesResult.zones.length > 0) {
      // Check safety zone status
      const safetyCheck = await geoFencingService.checkSafetyZone(
        processedLocation, 
        safetyZonesResult.zones
      );

      if (safetyCheck.success) {
        await handleSafetyZoneCheck(processedLocation, safetyCheck);
      }
    }

    // Update background tracking statistics
    await updateBackgroundStats(processedLocation);

    console.log('Background location processed:', {
      lat: processedLocation.latitude.toFixed(6),
      lng: processedLocation.longitude.toFixed(6),
      accuracy: processedLocation.accuracy,
      timestamp: processedLocation.timestamp.toISOString()
    });

  } catch (error) {
    console.error('Error handling background location update:', error);
    await logBackgroundError(error);
  }
}

/**
 * Cache background location for offline access
 */
async function cacheBackgroundLocation(location) {
  try {
    // Cache current location
    await AsyncStorage.setItem('last_background_location', JSON.stringify({
      location,
      timestamp: new Date().toISOString()
    }));

    // Add to location history
    const historyKey = 'background_location_history';
    const existingHistory = await AsyncStorage.getItem(historyKey);
    const history = existingHistory ? JSON.parse(existingHistory) : [];
    
    // Add new location and keep last 100 entries
    const updatedHistory = [location, ...history.slice(0, 99)];
    await AsyncStorage.setItem(historyKey, JSON.stringify(updatedHistory));

  } catch (error) {
    console.error('Error caching background location:', error);
  }
}

/**
 * Handle safety zone checks in background
 */
async function handleSafetyZoneCheck(location, safetyCheck) {
  try {
    // Get previous zone status
    const previousZoneKey = 'last_safety_zone_status';
    const previousZoneData = await AsyncStorage.getItem(previousZoneKey);
    const previousZone = previousZoneData ? JSON.parse(previousZoneData) : null;

    // Check for zone transitions
    const currentZoneId = safetyCheck.zone?.id || null;
    const previousZoneId = previousZone?.zone?.id || null;

    if (currentZoneId !== previousZoneId) {
      // Zone transition detected
      const transition = {
        from: previousZoneId,
        to: currentZoneId,
        fromLevel: previousZone?.safetyLevel || 'unknown',
        toLevel: safetyCheck.safetyLevel,
        location,
        timestamp: new Date().toISOString()
      };

      await handleZoneTransition(transition);
    }

    // Cache current zone status
    await AsyncStorage.setItem(previousZoneKey, JSON.stringify({
      zone: safetyCheck.zone,
      safetyLevel: safetyCheck.safetyLevel,
      timestamp: new Date().toISOString()
    }));

    // Generate alerts for dangerous zones
    if (safetyCheck.safetyLevel === 'restricted') {
      await generateBackgroundAlert('danger', {
        title: 'Restricted Area Warning',
        message: 'You have entered a restricted area. Please leave immediately.',
        location,
        safetyCheck
      });
    } else if (safetyCheck.safetyLevel === 'caution') {
      await generateBackgroundAlert('warning', {
        title: 'Caution Area',
        message: 'Exercise extra caution in this area.',
        location,
        safetyCheck
      });
    }

  } catch (error) {
    console.error('Error handling safety zone check:', error);
  }
}

/**
 * Handle zone transitions
 */
async function handleZoneTransition(transition) {
  try {
    // Cache zone transition
    const transitionsKey = 'background_zone_transitions';
    const existingTransitions = await AsyncStorage.getItem(transitionsKey);
    const transitions = existingTransitions ? JSON.parse(existingTransitions) : [];
    
    const updatedTransitions = [transition, ...transitions.slice(0, 49)];
    await AsyncStorage.setItem(transitionsKey, JSON.stringify(updatedTransitions));

    // Generate transition alerts
    if (transition.toLevel === 'restricted') {
      await generateBackgroundAlert('danger', {
        title: 'Entered Restricted Area',
        message: 'You have entered a restricted area. Consider leaving immediately.',
        transition
      });
    } else if (transition.fromLevel === 'restricted' && transition.toLevel === 'safe') {
      await generateBackgroundAlert('info', {
        title: 'Entered Safe Area',
        message: 'You are now in a safe area.',
        transition
      });
    }

    console.log('Zone transition detected:', transition);

  } catch (error) {
    console.error('Error handling zone transition:', error);
  }
}

/**
 * Generate background alerts
 */
async function generateBackgroundAlert(type, alertData) {
  try {
    // Cache alert for when app becomes active
    const alertsKey = 'background_alerts';
    const existingAlerts = await AsyncStorage.getItem(alertsKey);
    const alerts = existingAlerts ? JSON.parse(existingAlerts) : [];
    
    const alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      ...alertData,
      timestamp: new Date().toISOString(),
      isBackground: true,
      processed: false
    };

    const updatedAlerts = [alert, ...alerts.slice(0, 19)]; // Keep last 20 alerts
    await AsyncStorage.setItem(alertsKey, JSON.stringify(updatedAlerts));

    console.log('Background alert generated:', alert);

  } catch (error) {
    console.error('Error generating background alert:', error);
  }
}

/**
 * Update background tracking statistics
 */
async function updateBackgroundStats(location) {
  try {
    const statsKey = 'background_tracking_stats';
    const existingStats = await AsyncStorage.getItem(statsKey);
    const stats = existingStats ? JSON.parse(existingStats) : {
      totalUpdates: 0,
      lastUpdate: null,
      averageAccuracy: 0,
      startTime: new Date().toISOString()
    };

    stats.totalUpdates++;
    stats.lastUpdate = new Date().toISOString();
    
    // Calculate average accuracy
    if (location.accuracy) {
      const totalAccuracy = stats.averageAccuracy * (stats.totalUpdates - 1) + location.accuracy;
      stats.averageAccuracy = totalAccuracy / stats.totalUpdates;
    }

    await AsyncStorage.setItem(statsKey, JSON.stringify(stats));

  } catch (error) {
    console.error('Error updating background stats:', error);
  }
}

/**
 * Log background errors for debugging
 */
async function logBackgroundError(error) {
  try {
    const errorsKey = 'background_location_errors';
    const existingErrors = await AsyncStorage.getItem(errorsKey);
    const errors = existingErrors ? JSON.parse(existingErrors) : [];
    
    const errorLog = {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    };

    const updatedErrors = [errorLog, ...errors.slice(0, 9)]; // Keep last 10 errors
    await AsyncStorage.setItem(errorsKey, JSON.stringify(updatedErrors));

  } catch (logError) {
    console.error('Error logging background error:', logError);
  }
}

/**
 * Background Location Task Service
 */
export const backgroundLocationTaskService = {
  /**
   * Check if background location task is registered
   */
  isTaskRegistered: async () => {
    try {
      const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
      return isRegistered;
    } catch (error) {
      console.error('Error checking task registration:', error);
      return false;
    }
  },

  /**
   * Get background tracking statistics
   */
  getBackgroundStats: async () => {
    try {
      const stats = await AsyncStorage.getItem('background_tracking_stats');
      return stats ? JSON.parse(stats) : null;
    } catch (error) {
      console.error('Error getting background stats:', error);
      return null;
    }
  },

  /**
   * Get background location history
   */
  getBackgroundLocationHistory: async () => {
    try {
      const history = await AsyncStorage.getItem('background_location_history');
      return history ? JSON.parse(history) : [];
    } catch (error) {
      console.error('Error getting background location history:', error);
      return [];
    }
  },

  /**
   * Get background alerts
   */
  getBackgroundAlerts: async () => {
    try {
      const alerts = await AsyncStorage.getItem('background_alerts');
      return alerts ? JSON.parse(alerts) : [];
    } catch (error) {
      console.error('Error getting background alerts:', erro