import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Animated,
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocation } from '../context/LocationContext';

const { width, height } = Dimensions.get('window');

/**
 * Location Tracking Screen
 * Demonstrates Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
 * 
 * Features:
 * - Clear permission request flow
 * - Real-time location tracking display
 * - Smooth animations for location updates
 * - Background tracking controls
 * - Comprehensive error handling
 */
export default function LocationTrackingScreen() {
  const {
    currentLocation,
    loading,
    isTracking,
    permissionStatus,
    locationAccuracy,
    trackingStats,
    locationError,
    requestLocationPermission,
    startLocationTracking,
    stopLocationTracking,
    getCurrentLocation,
    getPermissionStatusDescription,
    checkLocationServicesEnabled,
    getTrackingStatistics
  } = useLocation();

  const [trackingMode, setTrackingMode] = useState('normal'); // normal, emergency, battery
  const [showStats, setShowStats] = useState(false);
  const [locationServicesEnabled, setLocationServicesEnabled] = useState(true);

  // Animation values
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Start entrance animation
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      })
    ]).start();

    // Check location services on mount
    checkServices();
  }, []);

  useEffect(() => {
    // Animate location updates
    if (currentLocation) {
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [currentLocation]);

  const checkServices = async () => {
    const servicesResult = await checkLocationServicesEnabled();
    setLocationServicesEnabled(servicesResult.enabled);
  };

  /**
   * Handle permission request with user guidance
   * Requirement 4.1: Clear permission dialog and user messaging
   */
  const handleRequestPermissions = async () => {
    try {
      const result = await requestLocationPermission({
        requireBackground: trackingMode === 'emergency',
        emergencyMode: trackingMode === 'emergency'
      });

      if (result.success) {
        Alert.alert(
          'Permissions Granted',
          'Location permissions have been granted successfully. You can now start tracking.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Permission Required',
          result.error || 'Location permission is needed for safety features to work properly.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to request permissions: ' + error.message);
    }
  };

  /**
   * Start location tracking with selected mode
   * Requirement 4.2, 4.3: High-accuracy real-time tracking
   */
  const handleStartTracking = async () => {
    try {
      const options = {
        enableBackground: trackingMode === 'emergency',
        emergencyMode: trackingMode === 'emergency',
        batteryOptimized: trackingMode === 'battery',
        enableSmoothing: true
      };

      const result = await startLocationTracking(options);

      if (result.success) {
        Alert.alert(
          'Tracking Started',
          `Real-time location tracking is now active in ${trackingMode} mode.`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Tracking Failed', result.error || 'Failed to start location tracking');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to start tracking: ' + error.message);
    }
  };

  /**
   * Stop location tracking
   */
  const handleStopTracking = async () => {
    try {
      const result = await stopLocationTracking();
      if (result.success) {
        Alert.alert('Tracking Stopped', 'Location tracking has been stopped.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to stop tracking: ' + error.message);
    }
  };

  /**
   * Get current location once
   */
  const handleGetCurrentLocation = async () => {
    try {
      await getCurrentLocation({ highAccuracy: true });
      Alert.alert('Location Updated', 'Current location has been retrieved successfully.');
    } catch (error) {
      Alert.alert('Location Error', 'Failed to get current location: ' + error.message);
    }
  };

  /**
   * Render permission status with visual indicators
   */
  const renderPermissionStatus = () => {
    const statusDesc = getPermissionStatusDescription();
    
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.sectionTitle}>Permission Status</Text>
        
        <View style={styles.permissionRow}>
          <Text style={styles.permissionLabel}>Foreground:</Text>
          <View style={[
            styles.statusBadge,
            { backgroundColor: statusDesc.foreground.isGranted ? '#4CAF50' : '#FF5722' }
          ]}>
            <Text style={styles.statusText}>
              {statusDesc.foreground.status.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.permissionRow}>
          <Text style={styles.permissionLabel}>Background:</Text>
          <View style={[
            styles.statusBadge,
            { backgroundColor: statusDesc.background.isGranted ? '#4CAF50' : '#FFC107' }
          ]}>
            <Text style={styles.statusText}>
              {statusDesc.background.status.toUpperCase()}
            </Text>
          </View>
        </View>

        {!locationServicesEnabled && (
          <View style={styles.warningContainer}>
            <Text style={styles.warningText}>
              ⚠️ Location services are disabled on this device
            </Text>
          </View>
        )}
      </View>
    );
  };

  /**
   * Render current location with smooth animations
   * Requirement 4.4: Smooth map animations and position updates
   */
  const renderLocationInfo = () => {
    if (!currentLocation) {
      return (
        <View style={styles.locationContainer}>
          <Text style={styles.sectionTitle}>Current Location</Text>
          <Text style={styles.noLocationText}>No location available</Text>
        </View>
      );
    }

    const accuracy = locationAccuracy || { level: 'unknown', description: 'Unknown' };

    return (
      <Animated.View style={[
        styles.locationContainer,
        { transform: [{ scale: pulseAnim }] }
      ]}>
        <Text style={styles.sectionTitle}>Current Location</Text>
        
        <View style={styles.coordinateRow}>
          <Text style={styles.coordinateLabel}>Latitude:</Text>
          <Text style={styles.coordinateValue}>
            {currentLocation.latitude.toFixed(6)}
          </Text>
        </View>

        <View style={styles.coordinateRow}>
          <Text style={styles.coordinateLabel}>Longitude:</Text>
          <Text style={styles.coordinateValue}>
            {currentLocation.longitude.toFixed(6)}
          </Text>
        </View>

        <View style={styles.coordinateRow}>
          <Text style={styles.coordinateLabel}>Accuracy:</Text>
          <Text style={[
            styles.coordinateValue,
            { color: accuracy.level === 'excellent' ? '#4CAF50' : 
                     accuracy.level === 'good' ? '#8BC34A' :
                     accuracy.level === 'fair' ? '#FFC107' : '#FF5722' }
          ]}>
            {currentLocation.accuracy ? `${currentLocation.accuracy.toFixed(1)}m` : 'Unknown'}
          </Text>
        </View>

        <View style={styles.coordinateRow}>
          <Text style={styles.coordinateLabel}>Updated:</Text>
          <Text style={styles.coordinateValue}>
            {currentLocation.timestamp ? 
              new Date(currentLocation.timestamp).toLocaleTimeString() : 
              'Unknown'
            }
          </Text>
        </View>

        {currentLocation.isSmoothed && (
          <View style={styles.smoothingIndicator}>
            <Text style={styles.smoothingText}>📍 Smoothed for animation</Text>
          </View>
        )}
      </Animated.View>
    );
  };

  /**
   * Render tracking statistics
   */
  const renderTrackingStats = () => {
    if (!showStats || !trackingStats) return null;

    const stats = getTrackingStatistics();

    return (
      <View style={styles.statsContainer}>
        <Text style={styles.sectionTitle}>Tracking Statistics</Text>
        
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Updates:</Text>
          <Text style={styles.statValue}>{stats.totalUpdates}</Text>
        </View>

        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Avg Accuracy:</Text>
          <Text style={styles.statValue}>
            {stats.averageAccuracy ? `${stats.averageAccuracy.toFixed(1)}m` : 'N/A'}
          </Text>
        </View>

        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Duration:</Text>
          <Text style={styles.statValue}>
            {stats.trackingDuration ? 
              `${Math.floor(stats.trackingDuration / 60000)}m ${Math.floor((stats.trackingDuration % 60000) / 1000)}s` : 
              'N/A'
            }
          </Text>
        </View>

        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Battery Optimized:</Text>
          <Text style={styles.statValue}>
            {stats.batteryOptimized ? 'Yes' : 'No'}
          </Text>
        </View>
      </View>
    );
  };

  /**
   * Render tracking mode selector
   */
  const renderTrackingModes = () => {
    const modes = [
      { key: 'normal', label: 'Normal', description: 'Balanced accuracy and battery' },
      { key: 'emergency', label: 'Emergency', description: 'Highest accuracy, background tracking' },
      { key: 'battery', label: 'Battery Saver', description: 'Lower accuracy, better battery life' }
    ];

    return (
      <View style={styles.modesContainer}>
        <Text style={styles.sectionTitle}>Tracking Mode</Text>
        
        {modes.map((mode) => (
          <TouchableOpacity
            key={mode.key}
            style={[
              styles.modeButton,
              trackingMode === mode.key && styles.modeButtonActive
            ]}
            onPress={() => setTrackingMode(mode.key)}
          >
            <Text style={[
              styles.modeLabel,
              trackingMode === mode.key && styles.modeLabelActive
            ]}>
              {mode.label}
            </Text>
            <Text style={[
              styles.modeDescription,
              trackingMode === mode.key && styles.modeDescriptionActive
            ]}>
              {mode.description}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <LinearGradient
      colors={['#667eea', '#764ba2']}
      style={styles.container}
    >
      <Animated.View style={[
        styles.content,
        {
          opacity: fadeAnim,
          transform: [{
            translateY: slideAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [50, 0]
            })
          }]
        }
      ]}>
        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Location Tracking Demo</Text>
          <Text style={styles.subtitle}>
            Demonstrates real-time location tracking with proper permissions
          </Text>

          {locationError && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>⚠️ {locationError}</Text>
            </View>
          )}

          {renderPermissionStatus()}
          {renderLocationInfo()}
          {renderTrackingModes()}
          {renderTrackingStats()}

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={handleRequestPermissions}
              disabled={loading}
            >
              <Text style={styles.buttonText}>Request Permissions</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={handleGetCurrentLocation}
              disabled={loading || permissionStatus.foreground !== 'granted'}
            >
              <Text style={styles.buttonText}>Get Current Location</Text>
            </TouchableOpacity>

            {!isTracking ? (
              <TouchableOpacity
                style={[styles.button, styles.successButton]}
                onPress={handleStartTracking}
                disabled={loading || permissionStatus.foreground !== 'granted'}
              >
                <Text style={styles.buttonText}>
                  Start Tracking ({trackingMode})
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.button, styles.dangerButton]}
                onPress={handleStopTracking}
                disabled={loading}
              >
                <Text style={styles.buttonText}>Stop Tracking</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.button, styles.infoButton]}
              onPress={() => setShowStats(!showStats)}
            >
              <Text style={styles.buttonText}>
                {showStats ? 'Hide' : 'Show'} Statistics
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingTop: 50,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#E8EAF6',
    textAlign: 'center',
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  permissionContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  permissionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  permissionLabel: {
    fontSize: 16,
    color: '#E8EAF6',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  warningContainer: {
    backgroundColor: 'rgba(255, 193, 7, 0.2)',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  warningText: {
    fontSize: 14,
    color: '#FFC107',
    textAlign: 'center',
  },
  locationContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  noLocationText: {
    fontSize: 16,
    color: '#E8EAF6',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  coordinateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  coordinateLabel: {
    fontSize: 16,
    color: '#E8EAF6',
  },
  coordinateValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  smoothingIndicator: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
  },
  smoothingText: {
    fontSize: 12,
    color: '#4CAF50',
    textAlign: 'center',
  },
  modesContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  modeButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  modeButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderColor: '#FFFFFF',
  },
  modeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E8EAF6',
    marginBottom: 4,
  },
  modeLabelActive: {
    color: '#FFFFFF',
  },
  modeDescription: {
    fontSize: 14,
    color: '#B39DDB',
  },
  modeDescriptionActive: {
    color: '#E8EAF6',
  },
  statsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 16,
    color: '#E8EAF6',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  errorContainer: {
    backgroundColor: 'rgba(244, 67, 54, 0.2)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  errorText: {
    fontSize: 14,
    color: '#FF5722',
    textAlign: 'center',
  },
  buttonContainer: {
    paddingBottom: 40,
  },
  button: {
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginBottom: 12,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#2196F3',
  },
  secondaryButton: {
    backgroundColor: '#9C27B0',
  },
  successButton: {
    backgroundColor: '#4CAF50',
  },
  dangerButton: {
    backgroundColor: '#F44336',
  },
  infoButton: {
    backgroundColor: '#FF9800',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});