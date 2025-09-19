import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, AppState } from 'react-native';
import SafetyNotification from './SafetyNotification';
import { safetyNotificationService } from '../../services/notifications/safetyNotificationService';

const NotificationManager = ({ navigation }) => {
  const [notifications, setNotifications] = useState([]);
  const [currentNotification, setCurrentNotification] = useState(null);
  const appState = useRef(AppState.currentState);
  const notificationQueue = useRef([]);

  useEffect(() => {
    initializeNotificationManager();
    
    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      appStateSubscription?.remove();
    };
  }, []);

  const initializeNotificationManager = async () => {
    try {
      // Initialize safety notification service
      const initResult = await safetyNotificationService.initialize();
      
      if (initResult.success) {
        console.log('Notification manager initialized successfully');
      }
      
      // Set up notification listeners
      setupNotificationListeners();
    } catch (error) {
      console.error('Error initializing notification manager:', error);
    }
  };

  const setupNotificationListeners = () => {
    // Listen for incoming notifications
    const notificationListener = safetyNotificationService.setupNotificationListeners();
    
    // Override the handleReceivedNotification to show in-app notifications
    const originalHandler = safetyNotificationService.handleReceivedNotification;
    safetyNotificationService.handleReceivedNotification = async (notification) => {
      // Call original handler
      await originalHandler(notification);
      
      // Show in-app notification if app is active
      if (appState.current === 'active') {
        showInAppNotification(notification.request.content);
      }
    };

    // Override the handleNotificationResponse to handle navigation
    const originalResponseHandler = safetyNotificationService.handleNotificationResponse;
    safetyNotificationService.handleNotificationResponse = async (response) => {
      const actionResult = await originalResponseHandler(response);
      
      // Handle navigation actions
      if (actionResult.action === 'navigate' && navigation) {
        navigation.navigate(actionResult.screen, actionResult.params);
      } else if (actionResult.action === 'call') {
        // Handle emergency call
        handleEmergencyCall(actionResult.number);
      } else if (actionResult.action === 'share_location') {
        // Handle location sharing
        handleLocationSharing(actionResult.location);
      }
      
      return actionResult;
    };
  };

  const handleAppStateChange = (nextAppState) => {
    if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
      // App came to foreground, process queued notifications
      processNotificationQueue();
    }
    appState.current = nextAppState;
  };

  const showInAppNotification = (notificationContent) => {
    const notification = {
      id: Date.now().toString(),
      title: notificationContent.title,
      body: notificationContent.body,
      data: notificationContent.data,
      timestamp: new Date(),
    };

    if (currentNotification) {
      // Queue the notification if one is already showing
      notificationQueue.current.push(notification);
    } else {
      setCurrentNotification(notification);
    }
  };

  const processNotificationQueue = () => {
    if (notificationQueue.current.length > 0 && !currentNotification) {
      const nextNotification = notificationQueue.current.shift();
      setCurrentNotification(nextNotification);
    }
  };

  const handleNotificationPress = (notification) => {
    const { type, location } = notification.data || {};
    
    switch (type) {
      case 'geo_fence_alert':
        if (navigation) {
          navigation.navigate('Map', { 
            location, 
            showSafetyZones: true 
          });
        }
        break;
        
      case 'emergency':
        if (navigation) {
          navigation.navigate('Emergency', { 
            emergencyId: notification.data.emergencyId 
          });
        }
        break;
        
      case 'safety_warning':
        if (navigation) {
          navigation.navigate('Safety', { 
            location,
            recommendations: notification.data.recommendations 
          });
        }
        break;
        
      case 'location_update':
        if (navigation) {
          navigation.navigate('Map', { 
            location,
            showLocationHistory: true 
          });
        }
        break;
        
      default:
        if (navigation) {
          navigation.navigate('Dashboard');
        }
        break;
    }
    
    dismissCurrentNotification();
  };

  const handleNotificationAction = async (action, notificationData) => {
    try {
      switch (action) {
        case 'Call Emergency':
          await handleEmergencyCall('100'); // Police
          break;
          
        case 'Get Directions Out':
          if (navigation) {
            navigation.navigate('Map', { 
              location: notificationData.location,
              findSafeRoute: true 
            });
          }
          break;
          
        case 'Share Location':
          await handleLocationSharing(notificationData.location);
          break;
          
        case 'View Safety Tips':
          if (navigation) {
            navigation.navigate('Safety', { 
              showTips: true,
              safetyLevel: notificationData.safetyLevel 
            });
          }
          break;
          
        case 'Find Safe Route':
          if (navigation) {
            navigation.navigate('Map', { 
              location: notificationData.location,
              findSafeRoute: true 
            });
          }
          break;
          
        case 'Call Contact':
          if (navigation) {
            navigation.navigate('EmergencyContacts');
          }
          break;
          
        case 'View Recommendations':
          if (navigation) {
            navigation.navigate('Safety', { 
              recommendations: notificationData.recommendations 
            });
          }
          break;
          
        default:
          console.log('Unknown action:', action);
          break;
      }
    } catch (error) {
      console.error('Error handling notification action:', error);
    }
  };

  const handleEmergencyCall = async (phoneNumber) => {
    try {
      const { Linking } = require('react-native');
      const url = `tel:${phoneNumber}`;
      const canOpen = await Linking.canOpenURL(url);
      
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        console.error('Cannot make phone calls on this device');
      }
    } catch (error) {
      console.error('Error making emergency call:', error);
    }
  };

  const handleLocationSharing = async (location) => {
    try {
      const { Share } = require('react-native');
      const locationUrl = `https://maps.google.com/?q=${location.latitude},${location.longitude}`;
      const message = `My current location: ${locationUrl}`;
      
      await Share.share({
        message,
        url: locationUrl,
        title: 'My Location - Tourist Safety App',
      });
    } catch (error) {
      console.error('Error sharing location:', error);
    }
  };

  const dismissCurrentNotification = () => {
    setCurrentNotification(null);
    
    // Show next notification in queue after a short delay
    setTimeout(() => {
      processNotificationQueue();
    }, 500);
  };

  const getNotificationDuration = (notification) => {
    const { type, safetyLevel, severity } = notification.data || {};
    
    // Critical notifications stay longer
    if (type === 'emergency' || safetyLevel === 'restricted') {
      return 10000; // 10 seconds
    }
    
    // High severity warnings stay longer
    if (severity === 'high') {
      return 8000; // 8 seconds
    }
    
    // Default duration
    return 5000; // 5 seconds
  };

  const shouldAutoHide = (notification) => {
    const { type, safetyLevel } = notification.data || {};
    
    // Don't auto-hide critical notifications
    if (type === 'emergency' || safetyLevel === 'restricted') {
      return false;
    }
    
    return true;
  };

  return (
    <View style={styles.container} pointerEvents="box-none">
      {currentNotification && (
        <SafetyNotification
          notification={currentNotification}
          onPress={() => handleNotificationPress(currentNotification)}
          onDismiss={dismissCurrentNotification}
          onAction={handleNotificationAction}
          visible={true}
          autoHide={shouldAutoHide(currentNotification)}
          duration={getNotificationDuration(currentNotification)}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
});

export default NotificationManager;