import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRealtime } from '../../context/RealtimeContext';

const RealtimeStatus = ({ onLocationSharingPress, onEmergencyPress }) => {
  const {
    isOnline,
    lastSync,
    pendingOperations,
    activeEmergency,
    emergencyLocationSharing,
    activeLocationSharing,
    realtimeNotifications,
    isInitialized,
    error,
    startLocationSharing,
    stopLocationSharing,
    startEmergencyLocationSharing,
    stopEmergencyLocationSharing,
    forceSyncPendingOperations,
    clearError
  } = useRealtime();

  const [showDetails, setShowDetails] = useState(false);

  const getConnectionStatus = () => {
    if (!isInitialized) return { text: 'Initializing...', color: '#FFA500', icon: 'hourglass' };
    if (!isOnline) return { text: 'Offline', color: '#FF4444', icon: 'cloud-offline' };
    if (pendingOperations > 0) return { text: 'Syncing...', color: '#FFA500', icon: 'sync' };
    return { text: 'Connected', color: '#00AA44', icon: 'cloud-done' };
  };

  const handleStartLocationSharing = async () => {
    Alert.alert(
      'Start Location Sharing',
      'Share your location with emergency contacts for safety?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Share for 1 hour',
          onPress: async () => {
            const result = await startLocationSharing({
              duration: 60,
              reason: 'safety_check'
            });
            
            if (!result.success) {
              Alert.alert('Error', result.error);
            }
          }
        },
        {
          text: 'Share for 4 hours',
          onPress: async () => {
            const result = await startLocationSharing({
              duration: 240,
              reason: 'extended_safety'
            });
            
            if (!result.success) {
              Alert.alert('Error', result.error);
            }
          }
        }
      ]
    );
  };

  const handleStopLocationSharing = async () => {
    Alert.alert(
      'Stop Location Sharing',
      'Are you sure you want to stop sharing your location?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Stop Sharing',
          style: 'destructive',
          onPress: async () => {
            const result = await stopLocationSharing();
            
            if (!result.success) {
              Alert.alert('Error', result.error);
            }
          }
        }
      ]
    );
  };

  const handleEmergencyLocationSharing = async () => {
    if (emergencyLocationSharing) {
      // Stop emergency sharing
      const result = await stopEmergencyLocationSharing();
      if (!result.success) {
        Alert.alert('Error', result.error);
      }
    } else {
      // Start emergency sharing
      if (onEmergencyPress) {
        onEmergencyPress();
      }
    }
  };

  const handleForcSync = async () => {
    const result = await forceSyncPendingOperations();
    
    if (result.success) {
      Alert.alert('Sync Complete', `Processed ${result.results?.length || 0} operations`);
    } else {
      Alert.alert('Sync Failed', result.error);
    }
  };

  const formatLastSync = (timestamp) => {
    if (!timestamp) return 'Never';
    
    const now = new Date();
    const syncTime = new Date(timestamp);
    const diffMs = now - syncTime;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    return syncTime.toLocaleDateString();
  };

  const connectionStatus = getConnectionStatus();

  return (
    <View style={styles.container}>
      {/* Connection Status Header */}
      <TouchableOpacity
        style={styles.statusHeader}
        onPress={() => setShowDetails(!showDetails)}
      >
        <View style={styles.statusInfo}>
          <Ionicons
            name={connectionStatus.icon}
            size={20}
            color={connectionStatus.color}
          />
          <Text style={[styles.statusText, { color: connectionStatus.color }]}>
            {connectionStatus.text}
          </Text>
          {pendingOperations > 0 && (
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingText}>{pendingOperations}</Text>
            </View>
          )}
        </View>
        
        <Ionicons
          name={showDetails ? 'chevron-up' : 'chevron-down'}
          size={20}
          color="#666"
        />
      </TouchableOpacity>

      {/* Error Display */}
      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="warning" size={16} color="#FF4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={clearError}>
            <Ionicons name="close" size={16} color="#FF4444" />
          </TouchableOpacity>
        </View>
      )}

      {/* Detailed Status */}
      {showDetails && (
        <View style={styles.detailsContainer}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Last Sync:</Text>
            <Text style={styles.detailValue}>{formatLastSync(lastSync)}</Text>
          </View>
          
          {pendingOperations > 0 && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Pending Operations:</Text>
              <View style={styles.pendingActions}>
                <Text style={styles.detailValue}>{pendingOperations}</Text>
                <TouchableOpacity
                  style={styles.syncButton}
                  onPress={handleForcSync}
                >
                  <Text style={styles.syncButtonText}>Sync Now</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      )}

      {/* Active Features */}
      <View style={styles.featuresContainer}>
        {/* Emergency Location Sharing */}
        {(activeEmergency || emergencyLocationSharing) && (
          <View style={styles.activeFeature}>
            <View style={styles.featureInfo}>
              <Ionicons name="medical" size={20} color="#FF0000" />
              <Text style={styles.featureText}>Emergency Location Sharing Active</Text>
            </View>
            <TouchableOpacity
              style={[styles.featureButton, styles.emergencyButton]}
              onPress={handleEmergencyLocationSharing}
            >
              <Text style={styles.emergencyButtonText}>Stop</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Regular Location Sharing */}
        {activeLocationSharing && !emergencyLocationSharing && (
          <View style={styles.activeFeature}>
            <View style={styles.featureInfo}>
              <Ionicons name="location" size={20} color="#007AFF" />
              <Text style={styles.featureText}>Location Sharing Active</Text>
            </View>
            <TouchableOpacity
              style={[styles.featureButton, styles.stopButton]}
              onPress={handleStopLocationSharing}
            >
              <Text style={styles.stopButtonText}>Stop</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Start Location Sharing */}
        {!activeLocationSharing && !emergencyLocationSharing && (
          <TouchableOpacity
            style={styles.startSharingButton}
            onPress={handleStartLocationSharing}
          >
            <Ionicons name="share" size={20} color="#007AFF" />
            <Text style={styles.startSharingText}>Start Location Sharing</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Recent Notifications */}
      {realtimeNotifications.length > 0 && (
        <View style={styles.notificationsContainer}>
          <Text style={styles.notificationsTitle}>Recent Updates</Text>
          <ScrollView style={styles.notificationsList} showsVerticalScrollIndicator={false}>
            {realtimeNotifications.slice(0, 3).map((notification) => (
              <View key={notification.id} style={styles.notificationItem}>
                <Text style={styles.notificationText} numberOfLines={2}>
                  {notification.message || notification.title}
                </Text>
                <Text style={styles.notificationTime}>
                  {formatLastSync(notification.timestamp)}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    margin: 16,
    overflow: 'hidden',
  },
  
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  
  pendingBadge: {
    backgroundColor: '#FF4444',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
  },
  
  pendingText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#FFCDD2',
  },
  
  errorText: {
    flex: 1,
    color: '#FF4444',
    fontSize: 14,
    marginLeft: 8,
  },
  
  detailsContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  
  pendingActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  syncButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  
  syncButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  
  featuresContainer: {
    padding: 16,
  },
  
  activeFeature: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  
  featureInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  
  featureText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
    color: '#333',
  },
  
  featureButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  
  emergencyButton: {
    backgroundColor: '#FF4444',
  },
  
  emergencyButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  
  stopButton: {
    backgroundColor: '#FF8800',
  },
  
  stopButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  
  startSharingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  
  startSharingText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  
  notificationsContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  
  notificationsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  
  notificationsList: {
    maxHeight: 120,
  },
  
  notificationItem: {
    backgroundColor: '#FFFFFF',
    padding: 8,
    borderRadius: 6,
    marginBottom: 4,
  },
  
  notificationText: {
    fontSize: 12,
    color: '#333',
    marginBottom: 2,
  },
  
  notificationTime: {
    fontSize: 10,
    color: '#666',
  },
});

export default RealtimeStatus;