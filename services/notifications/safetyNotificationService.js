import { messagingService } from '../firebase/messaging';
import { geoFencingService } from '../location/geoFencing';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const safetyNotificationService = {
  // Initialize safety notification system (Requirement 3.2, 7.3)
  initialize: async () => {
    try {
      // Initialize Firebase messaging with safety categories
      const initResult = await messagingService.initializeSafetyNotifications();
      
      if (!initResult.success) {
        return initResult;
      }

      // Set up notification listeners
      safetyNotificationService.setupNotificationListeners();
      
      // Load notification preferences
      const preferences = await safetyNotificationService.getNotificationPreferences();
      
      return { 
        success: true, 
        token: initResult.token,
        preferences 
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Set up notification event listeners
  setupNotificationListeners: () => {
    // Listen for received notifications
    messagingService.addNotificationListener((notification) => {
      safetyNotificationService.handleReceivedNotification(notification);
    });

    // Listen for notification responses (user taps)
    messagingService.addNotificationResponseListener((response) => {
      safetyNotificationService.handleNotificationResponse(response);
    });
  },

  // Handle received notifications
  handleReceivedNotification: async (notification) => {
    try {
      const { data } = notification.request.content;
      
      // Log notification for analytics
      await safetyNotificationService.logNotificationEvent('received', data);
      
      // Handle specific notification types
      switch (data?.type) {
        case 'geo_fence_alert':
          await safetyNotificationService.handleGeoFenceNotification(data);
          break;
        case 'emergency':
          await safetyNotificationService.handleEmergencyNotification(data);
          break;
        case 'safety_warning':
          await safetyNotificationService.handleSafetyWarningNotification(data);
          break;
      }
    } catch (error) {
      console.error('Error handling received notification:', error);
    }
  },

  // Handle notification responses (user interactions)
  handleNotificationResponse: async (response) => {
    try {
      const { actionIdentifier, notification } = response;
      const { data } = notification.request.content;
      
      // Log user interaction
      await safetyNotificationService.logNotificationEvent('interaction', {
        ...data,
        action: actionIdentifier
      });

      // Handle the action
      const actionResult = await messagingService.handleNotificationAction(actionIdentifier, data);
      
      // Execute the action (this would be handled by the main app navigation)
      return actionResult;
    } catch (error) {
      console.error('Error handling notification response:', error);
      return { action: 'error', error: error.message };
    }
  },

  // Send geo-fence alert with smart filtering (Requirement 3.2)
  sendGeoFenceAlert: async (location, safetyStatus, options = {}) => {
    try {
      const preferences = await safetyNotificationService.getNotificationPreferences();
      
      // Check if geo-fence notifications are enabled
      if (!preferences.geoFenceAlerts) {
        return { success: false, reason: 'Geo-fence alerts disabled by user' };
      }

      // Smart filtering to prevent notification spam
      const shouldSend = await safetyNotificationService.shouldSendGeoFenceAlert(
        safetyStatus.safetyLevel, 
        safetyStatus.zone?.id
      );
      
      if (!shouldSend.send) {
        return { success: false, reason: shouldSend.reason };
      }

      // Generate safety recommendations
      const recommendations = geoFencingService.generateSafetyAlert(location, safetyStatus, options.safetyScore);
      
      const alertData = {
        safetyLevel: safetyStatus.safetyLevel,
        zoneName: safetyStatus.zone?.name || 'Unknown Area',
        location,
        message: safetyStatus.message,
        actions: recommendations.length > 0 ? recommendations[0].actions : [],
        recommendations
      };

      const result = await messagingService.sendGeoFenceAlert(alertData);
      
      if (result.success) {
        // Update last notification time to prevent spam
        await safetyNotificationService.updateLastNotificationTime(
          'geo_fence', 
          safetyStatus.safetyLevel,
          safetyStatus.zone?.id
        );
      }

      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Send emergency notification (Requirement 2.3)
  sendEmergencyAlert: async (emergencyData) => {
    try {
      const result = await messagingService.sendEmergencyNotification(emergencyData);
      
      if (result.success) {
        // Log emergency notification
        await safetyNotificationService.logNotificationEvent('emergency_sent', emergencyData);
      }

      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Send safety warning based on conditions
  sendSafetyWarning: async (warningType, location, additionalData = {}) => {
    try {
      const preferences = await safetyNotificationService.getNotificationPreferences();
      
      if (!preferences.safetyWarnings) {
        return { success: false, reason: 'Safety warnings disabled by user' };
      }

      const warningConfig = safetyNotificationService.getWarningConfig(warningType);
      const warningData = {
        ...warningConfig,
        location,
        ...additionalData
      };

      return await messagingService.sendSafetyWarning(warningData);
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Smart filtering to prevent notification spam
  shouldSendGeoFenceAlert: async (safetyLevel, zoneId) => {
    try {
      const now = Date.now();
      const lastNotifications = await safetyNotificationService.getLastNotificationTimes();
      
      // Always send restricted area alerts
      if (safetyLevel === 'restricted') {
        return { send: true };
      }

      // Check cooldown periods
      const cooldownKey = `geo_fence_${safetyLevel}_${zoneId || 'unknown'}`;
      const lastNotificationTime = lastNotifications[cooldownKey];
      
      if (lastNotificationTime) {
        const timeSinceLastNotification = now - lastNotificationTime;
        const cooldownPeriod = safetyNotificationService.getCooldownPeriod(safetyLevel);
        
        if (timeSinceLastNotification < cooldownPeriod) {
          return { 
            send: false, 
            reason: `Cooldown period active (${Math.round((cooldownPeriod - timeSinceLastNotification) / 1000)}s remaining)` 
          };
        }
      }

      return { send: true };
    } catch (error) {
      return { send: false, reason: error.message };
    }
  },

  // Get cooldown period based on safety level
  getCooldownPeriod: (safetyLevel) => {
    switch (safetyLevel) {
      case 'restricted':
        return 0; // No cooldown for restricted areas
      case 'caution':
        return 5 * 60 * 1000; // 5 minutes
      case 'safe':
        return 15 * 60 * 1000; // 15 minutes
      default:
        return 10 * 60 * 1000; // 10 minutes
    }
  },

  // Get warning configuration
  getWarningConfig: (warningType) => {
    const configs = {
      night_safety: {
        title: '🌙 Night Safety Reminder',
        message: 'It\'s getting late. Consider staying in well-lit, populated areas.',
        severity: 'medium',
        recommendations: ['Find accommodation', 'Call taxi', 'Share location with contacts']
      },
      weather_warning: {
        title: '🌧️ Weather Alert',
        message: 'Weather conditions may affect safety. Exercise extra caution.',
        severity: 'medium',
        recommendations: ['Seek shelter', 'Avoid outdoor activities', 'Check weather updates']
      },
      crowd_density: {
        title: '👥 Crowd Alert',
        message: 'High crowd density detected. Stay alert and keep belongings secure.',
        severity: 'low',
        recommendations: ['Stay alert', 'Secure belongings', 'Avoid pushing crowds']
      },
      low_battery: {
        title: '🔋 Low Battery Warning',
        message: 'Device battery is low. Consider charging to maintain safety features.',
        severity: 'medium',
        recommendations: ['Find charging station', 'Enable power saving mode', 'Inform contacts']
      }
    };

    return configs[warningType] || {
      title: '⚠️ Safety Warning',
      message: 'Please exercise caution in your current area.',
      severity: 'medium',
      recommendations: ['Stay alert', 'Consider safer alternatives']
    };
  },

  // Handle specific notification types
  handleGeoFenceNotification: async (data) => {
    try {
      // Update user's safety status cache
      await AsyncStorage.setItem('last_safety_status', JSON.stringify({
        safetyLevel: data.safetyLevel,
        zoneName: data.zoneName,
        location: data.location,
        timestamp: data.timestamp
      }));
    } catch (error) {
      console.error('Error handling geo-fence notification:', error);
    }
  },

  handleEmergencyNotification: async (data) => {
    try {
      // Cache emergency status for quick access
      await AsyncStorage.setItem('emergency_status', JSON.stringify({
        active: true,
        emergencyId: data.emergencyId,
        timestamp: data.timestamp,
        location: data.location
      }));
    } catch (error) {
      console.error('Error handling emergency notification:', error);
    }
  },

  handleSafetyWarningNotification: async (data) => {
    try {
      // Log safety warning for analytics
      const warnings = await safetyNotificationService.getSafetyWarningHistory();
      const updatedWarnings = [data, ...warnings.slice(0, 19)]; // Keep last 20 warnings
      
      await AsyncStorage.setItem('safety_warnings', JSON.stringify(updatedWarnings));
    } catch (error) {
      console.error('Error handling safety warning notification:', error);
    }
  },

  // Notification preferences management
  getNotificationPreferences: async () => {
    try {
      const preferences = await AsyncStorage.getItem('notification_preferences');
      return preferences ? JSON.parse(preferences) : {
        geoFenceAlerts: true,
        emergencyAlerts: true,
        safetyWarnings: true,
        locationUpdates: true,
        safetyReminders: true,
        soundEnabled: true,
        vibrationEnabled: true,
        quietHours: {
          enabled: false,
          start: '22:00',
          end: '07:00'
        }
      };
    } catch (error) {
      console.error('Error getting notification preferences:', error);
      return {};
    }
  },

  updateNotificationPreferences: async (preferences) => {
    try {
      await AsyncStorage.setItem('notification_preferences', JSON.stringify(preferences));
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Notification analytics and logging
  logNotificationEvent: async (eventType, data) => {
    try {
      const events = await safetyNotificationService.getNotificationEvents();
      const event = {
        type: eventType,
        data,
        timestamp: new Date().toISOString(),
        id: Date.now().toString()
      };
      
      const updatedEvents = [event, ...events.slice(0, 99)]; // Keep last 100 events
      await AsyncStorage.setItem('notification_events', JSON.stringify(updatedEvents));
    } catch (error) {
      console.error('Error logging notification event:', error);
    }
  },

  getNotificationEvents: async () => {
    try {
      const events = await AsyncStorage.getItem('notification_events');
      return events ? JSON.parse(events) : [];
    } catch (error) {
      return [];
    }
  },

  // Last notification times for spam prevention
  getLastNotificationTimes: async () => {
    try {
      const times = await AsyncStorage.getItem('last_notification_times');
      return times ? JSON.parse(times) : {};
    } catch (error) {
      return {};
    }
  },

  updateLastNotificationTime: async (type, subType, zoneId) => {
    try {
      const times = await safetyNotificationService.getLastNotificationTimes();
      const key = zoneId ? `${type}_${subType}_${zoneId}` : `${type}_${subType}`;
      times[key] = Date.now();
      
      await AsyncStorage.setItem('last_notification_times', JSON.stringify(times));
    } catch (error) {
      console.error('Error updating last notification time:', error);
    }
  },

  // Safety warning history
  getSafetyWarningHistory: async () => {
    try {
      const warnings = await AsyncStorage.getItem('safety_warnings');
      return warnings ? JSON.parse(warnings) : [];
    } catch (error) {
      return [];
    }
  },

  // Clear notification data (for privacy)
  clearNotificationData: async () => {
    try {
      await AsyncStorage.multiRemove([
        'notification_events',
        'last_notification_times',
        'safety_warnings',
        'last_safety_status'
      ]);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};