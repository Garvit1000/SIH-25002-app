import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Configure notification behavior with safety-focused settings
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const notificationType = notification.request.content.data?.type;
    const isSafetyAlert = ['geo_fence_alert', 'emergency', 'safety_warning', 'restricted_area'].includes(notificationType);
    
    return {
      shouldShowAlert: true,
      shouldPlaySound: isSafetyAlert ? true : true,
      shouldSetBadge: false,
      priority: isSafetyAlert ? Notifications.AndroidNotificationPriority.HIGH : Notifications.AndroidNotificationPriority.DEFAULT,
    };
  },
});

// Configure notification categories for safety alerts
const configureSafetyNotificationCategories = async () => {
  if (Platform.OS === 'ios') {
    await Notifications.setNotificationCategoryAsync('SAFETY_ALERT', [
      {
        identifier: 'VIEW_LOCATION',
        buttonTitle: 'View Location',
        options: { opensAppToForeground: true },
      },
      {
        identifier: 'CALL_EMERGENCY',
        buttonTitle: 'Call Emergency',
        options: { opensAppToForeground: true },
      },
      {
        identifier: 'SHARE_LOCATION',
        buttonTitle: 'Share Location',
        options: { opensAppToForeground: false },
      },
    ]);

    await Notifications.setNotificationCategoryAsync('GEO_FENCE_ALERT', [
      {
        identifier: 'VIEW_SAFE_ROUTE',
        buttonTitle: 'Find Safe Route',
        options: { opensAppToForeground: true },
      },
      {
        identifier: 'DISMISS',
        buttonTitle: 'Dismiss',
        options: { opensAppToForeground: false },
      },
    ]);
  }
};

export const messagingService = {
  // Initialize safety notification system
  initializeSafetyNotifications: async () => {
    try {
      await configureSafetyNotificationCategories();
      const registrationResult = await messagingService.registerForPushNotifications();
      
      if (registrationResult.success) {
        // Set up default notification channels for Android
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('safety-alerts', {
            name: 'Safety Alerts',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF0000',
            sound: 'default',
            description: 'Critical safety alerts and geo-fence warnings',
          });

          await Notifications.setNotificationChannelAsync('emergency', {
            name: 'Emergency Notifications',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 500, 250, 500],
            lightColor: '#FF0000',
            sound: 'default',
            description: 'Emergency alerts and panic button notifications',
          });

          await Notifications.setNotificationChannelAsync('location-updates', {
            name: 'Location Updates',
            importance: Notifications.AndroidImportance.DEFAULT,
            vibrationPattern: [0, 100],
            lightColor: '#0000FF',
            sound: null,
            description: 'Location sharing and safety zone updates',
          });
        }
      }
      
      return registrationResult;
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Register for push notifications with enhanced safety permissions
  registerForPushNotifications: async () => {
    let token;

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
            allowAnnouncements: true,
            allowCriticalAlerts: true,
          },
        });
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        return { success: false, error: 'Failed to get push token for push notification!' };
      }
      
      token = (await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      })).data;
    } else {
      return { success: false, error: 'Must use physical device for Push Notifications' };
    }

    return { success: true, token };
  },

  // Schedule local notification
  scheduleNotification: async (title, body, data = {}, trigger = null) => {
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
        },
        trigger,
      });
      return { success: true, id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Cancel notification
  cancelNotification: async (notificationId) => {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Cancel all notifications
  cancelAllNotifications: async () => {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Listen to notification events
  addNotificationListener: (callback) => {
    return Notifications.addNotificationReceivedListener(callback);
  },

  // Listen to notification response events
  addNotificationResponseListener: (callback) => {
    return Notifications.addNotificationResponseReceivedListener(callback);
  },

  // Send geo-fence alert notification (Requirement 3.2)
  sendGeoFenceAlert: async (alertData) => {
    try {
      const { safetyLevel, zoneName, location, message, actions = [] } = alertData;
      
      const notificationContent = {
        title: getGeoFenceAlertTitle(safetyLevel),
        body: message || `You have ${safetyLevel === 'restricted' ? 'entered' : 'approached'} ${zoneName || 'a monitored area'}`,
        data: {
          type: 'geo_fence_alert',
          safetyLevel,
          zoneName,
          location,
          timestamp: new Date().toISOString(),
          actions
        },
        sound: safetyLevel === 'restricted' ? 'default' : 'default',
        priority: safetyLevel === 'restricted' ? 'high' : 'normal',
      };

      // Add category for iOS action buttons
      if (Platform.OS === 'ios') {
        notificationContent.categoryIdentifier = 'GEO_FENCE_ALERT';
      }

      // Set Android channel
      if (Platform.OS === 'android') {
        notificationContent.channelId = 'safety-alerts';
      }

      const result = await Notifications.scheduleNotificationAsync({
        content: notificationContent,
        trigger: null, // Send immediately
      });

      return { success: true, notificationId: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Send emergency notification (Requirement 2.3, 7.3)
  sendEmergencyNotification: async (emergencyData) => {
    try {
      const { type, location, message, emergencyId, contactsNotified = 0 } = emergencyData;
      
      const notificationContent = {
        title: '🚨 Emergency Alert Sent',
        body: message || `Emergency contacts (${contactsNotified}) have been notified with your location`,
        data: {
          type: 'emergency',
          emergencyType: type,
          location,
          emergencyId,
          timestamp: new Date().toISOString(),
        },
        sound: 'default',
        priority: 'max',
      };

      // Add category for iOS action buttons
      if (Platform.OS === 'ios') {
        notificationContent.categoryIdentifier = 'SAFETY_ALERT';
        notificationContent.interruptionLevel = 'critical';
      }

      // Set Android channel
      if (Platform.OS === 'android') {
        notificationContent.channelId = 'emergency';
      }

      const result = await Notifications.scheduleNotificationAsync({
        content: notificationContent,
        trigger: null,
      });

      return { success: true, notificationId: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Send safety warning notification
  sendSafetyWarning: async (warningData) => {
    try {
      const { title, message, severity = 'medium', location, recommendations = [] } = warningData;
      
      const notificationContent = {
        title: title || '⚠️ Safety Warning',
        body: message,
        data: {
          type: 'safety_warning',
          severity,
          location,
          recommendations,
          timestamp: new Date().toISOString(),
        },
        sound: severity === 'high' ? 'default' : null,
        priority: severity === 'high' ? 'high' : 'normal',
      };

      // Set Android channel
      if (Platform.OS === 'android') {
        notificationContent.channelId = 'safety-alerts';
      }

      const result = await Notifications.scheduleNotificationAsync({
        content: notificationContent,
        trigger: null,
      });

      return { success: true, notificationId: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Send location update notification (Requirement 7.3)
  sendLocationUpdateNotification: async (locationData) => {
    try {
      const { location, safetyScore, isEmergency = false } = locationData;
      
      const notificationContent = {
        title: isEmergency ? '📍 Emergency Location Shared' : '📍 Location Updated',
        body: isEmergency 
          ? 'Your current location has been shared with emergency contacts'
          : `Safety score: ${safetyScore}/100 - Location updated`,
        data: {
          type: 'location_update',
          location,
          safetyScore,
          isEmergency,
          timestamp: new Date().toISOString(),
        },
        sound: isEmergency ? 'default' : null,
        priority: isEmergency ? 'high' : 'low',
      };

      // Set Android channel
      if (Platform.OS === 'android') {
        notificationContent.channelId = isEmergency ? 'emergency' : 'location-updates';
      }

      const result = await Notifications.scheduleNotificationAsync({
        content: notificationContent,
        trigger: null,
      });

      return { success: true, notificationId: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Schedule safety reminder notifications
  scheduleSafetyReminder: async (reminderData) => {
    try {
      const { title, message, triggerTime, repeatInterval = null } = reminderData;
      
      let trigger = null;
      if (triggerTime) {
        trigger = {
          date: new Date(triggerTime),
        };
        
        if (repeatInterval) {
          trigger.repeats = true;
          trigger.type = repeatInterval; // 'daily', 'weekly', etc.
        }
      }

      const result = await Notifications.scheduleNotificationAsync({
        content: {
          title: title || '🛡️ Safety Reminder',
          body: message,
          data: {
            type: 'safety_reminder',
            timestamp: new Date().toISOString(),
          },
        },
        trigger,
      });

      return { success: true, notificationId: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Handle notification actions
  handleNotificationAction: async (actionIdentifier, notificationData) => {
    try {
      const { type, location } = notificationData;
      
      switch (actionIdentifier) {
        case 'VIEW_LOCATION':
          return { action: 'navigate', screen: 'Map', params: { location } };
          
        case 'CALL_EMERGENCY':
          return { action: 'call', number: '100' }; // Police emergency number
          
        case 'SHARE_LOCATION':
          return { action: 'share_location', location };
          
        case 'VIEW_SAFE_ROUTE':
          return { action: 'navigate', screen: 'Map', params: { findSafeRoute: true, location } };
          
        case 'DISMISS':
          return { action: 'dismiss' };
          
        default:
          return { action: 'open_app' };
      }
    } catch (error) {
      return { action: 'error', error: error.message };
    }
  },

  // Get notification statistics for safety analytics
  getNotificationStats: async () => {
    try {
      const delivered = await Notifications.getAllScheduledNotificationsAsync();
      const pending = await Notifications.getAllScheduledNotificationsAsync();
      
      return {
        success: true,
        stats: {
          totalDelivered: delivered.length,
          totalPending: pending.length,
          lastNotification: delivered.length > 0 ? delivered[0].date : null,
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};

// Helper function to get geo-fence alert title
const getGeoFenceAlertTitle = (safetyLevel) => {
  switch (safetyLevel) {
    case 'restricted':
      return '🚨 Restricted Area Alert';
    case 'caution':
      return '⚠️ Caution Zone Alert';
    case 'safe':
      return '✅ Safe Zone Entered';
    default:
      return '📍 Location Alert';
  }
};