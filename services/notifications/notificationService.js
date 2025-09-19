/**
 * General Notification Service
 * Handles all app notifications including safety, emergency, and general alerts
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

class NotificationService {
  constructor() {
    this.notificationListener = null;
    this.responseListener = null;
    this.isInitialized = false;
  }

  // Initialize notification service
  async initialize() {
    try {
      if (this.isInitialized) {
        return { success: true };
      }

      // Request permissions
      const { status } = await Notifications.requestPermissionsAsync();
      
      if (status !== 'granted') {
        return { success: false, error: 'Notification permissions not granted' };
      }

      // Get push token for remote notifications
      const token = await Notifications.getExpoPushTokenAsync();

      // Set up notification listeners
      this.setupListeners();

      this.isInitialized = true;

      return { 
        success: true, 
        token: token.data,
        permissions: status 
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Set up notification listeners
  setupListeners() {
    // Listen for notifications received while app is foregrounded
    this.notificationListener = Notifications.addNotificationReceivedListener(notification => {
      this.handleNotificationReceived(notification);
    });

    // Listen for user interactions with notifications
    this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      this.handleNotificationResponse(response);
    });
  }

  // Handle received notifications
  handleNotificationReceived(notification) {
    console.log('Notification received:', notification);
    // Additional handling can be added here
  }

  // Handle notification responses
  handleNotificationResponse(response) {
    console.log('Notification response:', response);
    // Additional handling can be added here
  }

  // Schedule local notification
  async scheduleNotification(title, body, data = {}, options = {}) {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: options.sound !== false,
          priority: options.priority || Notifications.AndroidNotificationPriority.HIGH,
          color: options.color || '#007AFF',
        },
        trigger: options.trigger || null,
      });

      return { success: true, notificationId };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Send immediate notification
  async sendNotification(title, body, data = {}, options = {}) {
    return await this.scheduleNotification(title, body, data, {
      ...options,
      trigger: null
    });
  }

  // Schedule emergency notification
  async sendEmergencyNotification(emergencyData) {
    try {
      const { location, contacts, message } = emergencyData;
      
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '🚨 EMERGENCY ALERT',
          body: message || 'Emergency alert has been activated',
          data: {
            type: 'emergency',
            location,
            contacts,
            timestamp: new Date().toISOString()
          },
          sound: true,
          priority: Notifications.AndroidNotificationPriority.MAX,
          color: '#FF3B30',
        },
        trigger: null,
      });

      return { success: true, notificationId };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Schedule safety zone notification
  async sendSafetyZoneNotification(zoneData) {
    try {
      const { safetyLevel, zoneName, message } = zoneData;
      
      let title, color;
      switch (safetyLevel) {
        case 'restricted':
          title = '⚠️ Restricted Area Alert';
          color = '#FF3B30';
          break;
        case 'caution':
          title = '⚠️ Caution Zone Alert';
          color = '#FF9500';
          break;
        case 'safe':
          title = '✅ Safe Zone';
          color = '#34C759';
          break;
        default:
          title = '📍 Location Update';
          color = '#007AFF';
      }

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body: message || `You are now in ${zoneName}`,
          data: {
            type: 'safety_zone',
            ...zoneData,
            timestamp: new Date().toISOString()
          },
          sound: safetyLevel === 'restricted',
          priority: safetyLevel === 'restricted' 
            ? Notifications.AndroidNotificationPriority.HIGH 
            : Notifications.AndroidNotificationPriority.DEFAULT,
          color,
        },
        trigger: null,
      });

      return { success: true, notificationId };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Schedule reminder notification
  async scheduleReminder(title, body, triggerDate, data = {}) {
    try {
      const trigger = {
        date: triggerDate,
      };

      return await this.scheduleNotification(title, body, {
        type: 'reminder',
        ...data
      }, { trigger });
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Cancel notification
  async cancelNotification(notificationId) {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Cancel all notifications
  async cancelAllNotifications() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Get scheduled notifications
  async getScheduledNotifications() {
    try {
      const notifications = await Notifications.getAllScheduledNotificationsAsync();
      return { success: true, notifications };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Set notification badge count
  async setBadgeCount(count) {
    try {
      await Notifications.setBadgeCountAsync(count);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Clear badge count
  async clearBadgeCount() {
    return await this.setBadgeCount(0);
  }

  // Get notification permissions
  async getPermissions() {
    try {
      const permissions = await Notifications.getPermissionsAsync();
      return { success: true, permissions };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Request notification permissions
  async requestPermissions() {
    try {
      const permissions = await Notifications.requestPermissionsAsync();
      return { success: true, permissions };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Cleanup listeners
  cleanup() {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
    }
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
    }
    this.isInitialized = false;
  }
}

// Create singleton instance
const notificationService = new NotificationService();

export { notificationService };
export default notificationService;