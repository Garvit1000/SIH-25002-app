import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const SafetyNotification = ({ 
  notification, 
  onPress, 
  onDismiss, 
  onAction,
  visible = true,
  autoHide = true,
  duration = 5000 
}) => {
  const [slideAnim] = useState(new Animated.Value(-100));
  const [opacity] = useState(new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      showNotification();
      
      if (autoHide && duration > 0) {
        const timer = setTimeout(() => {
          hideNotification();
        }, duration);
        
        return () => clearTimeout(timer);
      }
    } else {
      hideNotification();
    }
  }, [visible]);

  const showNotification = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const hideNotification = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (onDismiss) onDismiss();
    });
  };

  const getNotificationStyle = () => {
    const { type, safetyLevel, severity } = notification.data || {};
    
    switch (type) {
      case 'geo_fence_alert':
        return getGeoFenceStyle(safetyLevel);
      case 'emergency':
        return styles.emergencyNotification;
      case 'safety_warning':
        return getSafetyWarningStyle(severity);
      default:
        return styles.defaultNotification;
    }
  };

  const getGeoFenceStyle = (safetyLevel) => {
    switch (safetyLevel) {
      case 'restricted':
        return styles.restrictedNotification;
      case 'caution':
        return styles.cautionNotification;
      case 'safe':
        return styles.safeNotification;
      default:
        return styles.defaultNotification;
    }
  };

  const getSafetyWarningStyle = (severity) => {
    switch (severity) {
      case 'high':
        return styles.highSeverityNotification;
      case 'medium':
        return styles.mediumSeverityNotification;
      case 'low':
        return styles.lowSeverityNotification;
      default:
        return styles.defaultNotification;
    }
  };

  const getIcon = () => {
    const { type, safetyLevel, severity } = notification.data || {};
    
    switch (type) {
      case 'geo_fence_alert':
        return safetyLevel === 'restricted' ? 'warning' : 
               safetyLevel === 'caution' ? 'alert-circle' : 'checkmark-circle';
      case 'emergency':
        return 'medical';
      case 'safety_warning':
        return severity === 'high' ? 'warning' : 'information-circle';
      case 'location_update':
        return 'location';
      default:
        return 'notifications';
    }
  };

  const getIconColor = () => {
    const { type, safetyLevel, severity } = notification.data || {};
    
    switch (type) {
      case 'geo_fence_alert':
        return safetyLevel === 'restricted' ? '#FF4444' : 
               safetyLevel === 'caution' ? '#FF8800' : '#00AA44';
      case 'emergency':
        return '#FF0000';
      case 'safety_warning':
        return severity === 'high' ? '#FF4444' : '#FF8800';
      default:
        return '#007AFF';
    }
  };

  const handleActionPress = (action) => {
    if (onAction) {
      onAction(action, notification.data);
    }
    hideNotification();
  };

  const renderActions = () => {
    const actions = notification.data?.actions || [];
    
    if (actions.length === 0) return null;

    return (
      <View style={styles.actionsContainer}>
        {actions.slice(0, 2).map((action, index) => (
          <TouchableOpacity
            key={index}
            style={styles.actionButton}
            onPress={() => handleActionPress(action)}
          >
            <Text style={styles.actionText}>{action}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        getNotificationStyle(),
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacity,
        },
      ]}
    >
      <TouchableOpacity
        style={styles.notificationContent}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons
              name={getIcon()}
              size={24}
              color={getIconColor()}
            />
          </View>
          
          <View style={styles.textContainer}>
            <Text style={styles.title} numberOfLines={2}>
              {notification.title}
            </Text>
            <Text style={styles.body} numberOfLines={3}>
              {notification.body}
            </Text>
          </View>
          
          <TouchableOpacity
            style={styles.dismissButton}
            onPress={hideNotification}
          >
            <Ionicons name="close" size={20} color="#666" />
          </TouchableOpacity>
        </View>
        
        {renderActions()}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 25,
    left: 10,
    right: 10,
    zIndex: 1000,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  
  notificationContent: {
    padding: 16,
  },
  
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  
  iconContainer: {
    marginRight: 12,
    marginTop: 2,
  },
  
  textContainer: {
    flex: 1,
    marginRight: 8,
  },
  
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  
  body: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  
  dismissButton: {
    padding: 4,
  },
  
  actionsContainer: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  
  actionButton: {
    backgroundColor: 'rgba(0,0,0,0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  
  actionText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#333',
  },
  
  // Notification type styles
  defaultNotification: {
    backgroundColor: '#F8F9FA',
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  
  restrictedNotification: {
    backgroundColor: '#FFEBEE',
    borderLeftWidth: 4,
    borderLeftColor: '#FF4444',
  },
  
  cautionNotification: {
    backgroundColor: '#FFF8E1',
    borderLeftWidth: 4,
    borderLeftColor: '#FF8800',
  },
  
  safeNotification: {
    backgroundColor: '#E8F5E8',
    borderLeftWidth: 4,
    borderLeftColor: '#00AA44',
  },
  
  emergencyNotification: {
    backgroundColor: '#FFEBEE',
    borderLeftWidth: 4,
    borderLeftColor: '#FF0000',
  },
  
  highSeverityNotification: {
    backgroundColor: '#FFEBEE',
    borderLeftWidth: 4,
    borderLeftColor: '#FF4444',
  },
  
  mediumSeverityNotification: {
    backgroundColor: '#FFF8E1',
    borderLeftWidth: 4,
    borderLeftColor: '#FF8800',
  },
  
  lowSeverityNotification: {
    backgroundColor: '#E3F2FD',
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
});

export default SafetyNotification;