/**
 * Realtime Service
 * Handles real-time data synchronization and updates
 */

import { messagingService } from '../firebase/messaging';
import { backgroundSyncService } from '../offline/backgroundSyncService';
import AsyncStorage from '@react-native-async-storage/async-storage';

class RealtimeService {
  constructor() {
    this.listeners = new Map();
    this.connectionStatus = 'disconnected';
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
  }

  // Initialize realtime service
  async initialize() {
    try {
      // Initialize Firebase messaging for realtime updates
      const messagingResult = await messagingService.initialize();
      
      if (!messagingResult.success) {
        return messagingResult;
      }

      // Set up message listeners
      this.setupMessageListeners();

      // Initialize background sync
      await backgroundSyncService.initialize();

      this.connectionStatus = 'connected';
      this.notifyListeners('connectionStatusChanged', { status: 'connected' });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Set up Firebase messaging listeners
  setupMessageListeners() {
    // Listen for foreground messages
    messagingService.addMessageListener((message) => {
      this.handleRealtimeMessage(message);
    });

    // Listen for background messages
    messagingService.addBackgroundMessageListener((message) => {
      this.handleBackgroundMessage(message);
    });
  }

  // Handle realtime messages
  handleRealtimeMessage(message) {
    const { data } = message;
    
    switch (data.type) {
      case 'location_update':
        this.notifyListeners('locationUpdate', data);
        break;
      case 'safety_status_change':
        this.notifyListeners('safetyStatusChange', data);
        break;
      case 'emergency_alert':
        this.notifyListeners('emergencyAlert', data);
        break;
      case 'zone_update':
        this.notifyListeners('zoneUpdate', data);
        break;
      default:
        this.notifyListeners('message', data);
    }
  }

  // Handle background messages
  handleBackgroundMessage(message) {
    // Queue message for processing when app becomes active
    backgroundSyncService.queueOperation({
      type: 'realtime_message',
      data: message,
      timestamp: new Date(),
      priority: 'medium'
    });
  }

  // Subscribe to realtime updates
  subscribe(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    
    this.listeners.get(eventType).add(callback);
    
    // Return unsubscribe function
    return () => {
      const eventListeners = this.listeners.get(eventType);
      if (eventListeners) {
        eventListeners.delete(callback);
        if (eventListeners.size === 0) {
          this.listeners.delete(eventType);
        }
      }
    };
  }

  // Unsubscribe from updates
  unsubscribe(eventType, callback) {
    const eventListeners = this.listeners.get(eventType);
    if (eventListeners) {
      eventListeners.delete(callback);
      if (eventListeners.size === 0) {
        this.listeners.delete(eventType);
      }
    }
  }

  // Notify listeners
  notifyListeners(eventType, data) {
    const eventListeners = this.listeners.get(eventType);
    if (eventListeners) {
      eventListeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in realtime listener:', error);
        }
      });
    }
  }

  // Send realtime update
  async sendUpdate(type, data) {
    try {
      const message = {
        type,
        data,
        timestamp: new Date().toISOString(),
        userId: await this.getCurrentUserId()
      };

      const result = await messagingService.sendMessage(message);
      
      if (!result.success) {
        // Queue for retry if failed
        await backgroundSyncService.queueOperation({
          type: 'realtime_update',
          data: message,
          timestamp: new Date(),
          priority: 'high'
        });
      }

      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Send location update
  async sendLocationUpdate(location) {
    return await this.sendUpdate('location_update', {
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.accuracy,
      timestamp: location.timestamp || new Date().toISOString()
    });
  }

  // Send safety status update
  async sendSafetyStatusUpdate(safetyStatus) {
    return await this.sendUpdate('safety_status_change', safetyStatus);
  }

  // Send emergency alert
  async sendEmergencyAlert(emergencyData) {
    return await this.sendUpdate('emergency_alert', {
      ...emergencyData,
      priority: 'critical'
    });
  }

  // Get connection status
  getConnectionStatus() {
    return this.connectionStatus;
  }

  // Check if connected
  isConnected() {
    return this.connectionStatus === 'connected';
  }

  // Reconnect to service
  async reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.connectionStatus = 'failed';
      this.notifyListeners('connectionStatusChanged', { status: 'failed' });
      return { success: false, error: 'Max reconnection attempts reached' };
    }

    this.reconnectAttempts++;
    this.connectionStatus = 'reconnecting';
    this.notifyListeners('connectionStatusChanged', { status: 'reconnecting' });

    // Wait before reconnecting
    await new Promise(resolve => setTimeout(resolve, this.reconnectDelay));

    try {
      const result = await this.initialize();
      
      if (result.success) {
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
      } else {
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000); // Max 30 seconds
      }

      return result;
    } catch (error) {
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
      return { success: false, error: error.message };
    }
  }

  // Disconnect from service
  disconnect() {
    this.connectionStatus = 'disconnected';
    this.listeners.clear();
    this.notifyListeners('connectionStatusChanged', { status: 'disconnected' });
  }

  // Get current user ID
  async getCurrentUserId() {
    try {
      const userData = await AsyncStorage.getItem('user_data');
      if (userData) {
        const user = JSON.parse(userData);
        return user.userId;
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  // Sync offline data
  async syncOfflineData() {
    try {
      const result = await backgroundSyncService.syncData();
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Get sync status
  async getSyncStatus() {
    try {
      const queueSize = await backgroundSyncService.getQueueSize();
      return {
        success: true,
        queueSize,
        isConnected: this.isConnected(),
        lastSync: await this.getLastSyncTime()
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Get last sync time
  async getLastSyncTime() {
    try {
      const lastSync = await AsyncStorage.getItem('last_sync_time');
      return lastSync ? new Date(lastSync) : null;
    } catch (error) {
      return null;
    }
  }

  // Update last sync time
  async updateLastSyncTime() {
    try {
      await AsyncStorage.setItem('last_sync_time', new Date().toISOString());
    } catch (error) {
      console.error('Error updating last sync time:', error);
    }
  }
}

// Create singleton instance
const realtimeService = new RealtimeService();

export { realtimeService };
export default realtimeService;