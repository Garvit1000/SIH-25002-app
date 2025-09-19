import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

const LocationStatus = ({ 
  location,
  safetyStatus,
  accuracy,
  onRefresh,
  onViewMap,
  isOffline = false,
  isStale = false
}) => {
  const { colors } = useTheme();

  const getLocationAccuracyIcon = (accuracy) => {
    if (!accuracy) return 'location-outline';
    if (accuracy <= 5) return 'location';
    if (accuracy <= 20) return 'location-outline';
    return 'location-outline';
  };

  const getLocationAccuracyColor = (accuracy) => {
    if (!accuracy) return colors.textSecondary;
    if (accuracy <= 5) return colors.success;
    if (accuracy <= 20) return colors.warning;
    return colors.error;
  };

  const getSafetyStatusIcon = (safetyLevel) => {
    switch (safetyLevel) {
      case 'safe': return 'shield-checkmark';
      case 'caution': return 'warning';
      case 'restricted': return 'alert-circle';
      default: return 'help-circle';
    }
  };

  const getSafetyStatusColor = (safetyLevel) => {
    switch (safetyLevel) {
      case 'safe': return colors.success;
      case 'caution': return colors.warning;
      case 'restricted': return colors.error;
      default: return colors.textSecondary;
    }
  };

  const formatCoordinates = (lat, lon) => {
    return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
  };

  const formatAccuracy = (accuracy) => {
    if (!accuracy) return 'Unknown';
    if (accuracy < 1000) return `±${Math.round(accuracy)}m`;
    return `±${(accuracy / 1000).toFixed(1)}km`;
  };

  if (!location) {
    return (
      <View style={[styles.container, { backgroundColor: colors.surface }]}>
        <View style={styles.header}>
          <Ionicons name="location-outline" size={24} color={colors.textSecondary} />
          <Text style={[styles.title, { color: colors.text }]}>
            Location Status
          </Text>
        </View>
        <View style={styles.content}>
          <Text style={[styles.noLocationText, { color: colors.textSecondary }]}>
            Location not available
          </Text>
          <TouchableOpacity
            style={[styles.refreshButton, { backgroundColor: colors.primary }]}
            onPress={onRefresh}
          >
            <Ionicons name="refresh" size={16} color={colors.surface} />
            <Text style={[styles.refreshButtonText, { color: colors.surface }]}>
              Get Location
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const accuracyIcon = getLocationAccuracyIcon(accuracy);
  const accuracyColor = getLocationAccuracyColor(accuracy);
  const safetyIcon = getSafetyStatusIcon(safetyStatus?.safetyLevel);
  const safetyColor = getSafetyStatusColor(safetyStatus?.safetyLevel);

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={styles.header}>
        <Ionicons name={accuracyIcon} size={24} color={accuracyColor} />
        <Text style={[styles.title, { color: colors.text }]}>
          Location Status
        </Text>
        {(isOffline || isStale) && (
          <View style={styles.statusBadges}>
            {isOffline && (
              <View style={[styles.badge, { backgroundColor: colors.error }]}>
                <Text style={styles.badgeText}>Offline</Text>
              </View>
            )}
            {isStale && (
              <View style={[styles.badge, { backgroundColor: colors.warning }]}>
                <Text style={styles.badgeText}>Stale</Text>
              </View>
            )}
          </View>
        )}
      </View>

      <View style={styles.content}>
        <View style={styles.locationInfo}>
          <View style={styles.coordinatesRow}>
            <Text style={[styles.coordinates, { color: colors.text }]}>
              {formatCoordinates(location.latitude, location.longitude)}
            </Text>
            <Text style={[styles.accuracy, { color: accuracyColor }]}>
              {formatAccuracy(accuracy)}
            </Text>
          </View>
          
          {location.timestamp && (
            <Text style={[styles.timestamp, { color: colors.textSecondary }]}>
              Updated: {new Date(location.timestamp).toLocaleTimeString()}
            </Text>
          )}
        </View>

        {safetyStatus && (
          <View style={styles.safetyInfo}>
            <View style={styles.safetyHeader}>
              <Ionicons name={safetyIcon} size={20} color={safetyColor} />
              <Text style={[styles.safetyLevel, { color: safetyColor }]}>
                {safetyStatus.safetyLevel?.toUpperCase() || 'UNKNOWN'}
              </Text>
            </View>
            
            {safetyStatus.zone && (
              <Text style={[styles.zoneName, { color: colors.text }]}>
                {safetyStatus.zone.name}
              </Text>
            )}
            
            <Text style={[styles.safetyMessage, { color: colors.textSecondary }]}>
              {safetyStatus.message}
            </Text>

            {safetyStatus.advancedScore && (
              <View style={styles.scoreInfo}>
                <Text style={[styles.scoreLabel, { color: colors.textSecondary }]}>
                  Safety Score:
                </Text>
                <Text style={[
                  styles.scoreValue,
                  { color: safetyStatus.advancedScore.score >= 70 ? colors.success : colors.warning }
                ]}>
                  {safetyStatus.advancedScore.score}/100
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={onRefresh}
          >
            <Ionicons name="refresh" size={16} color={colors.surface} />
            <Text style={[styles.actionButtonText, { color: colors.surface }]}>
              Refresh
            </Text>
          </TouchableOpacity>
          
          {onViewMap && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.secondary }]}
              onPress={onViewMap}
            >
              <Ionicons name="map" size={16} color={colors.surface} />
              <Text style={[styles.actionButtonText, { color: colors.surface }]}>
                View Map
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  statusBadges: {
    flexDirection: 'row',
    gap: 4,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  content: {
    gap: 12,
  },
  noLocationText: {
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 8,
  },
  locationInfo: {
    gap: 4,
  },
  coordinatesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  coordinates: {
    fontSize: 14,
    fontFamily: 'monospace',
  },
  accuracy: {
    fontSize: 12,
    fontWeight: '500',
  },
  timestamp: {
    fontSize: 12,
  },
  safetyInfo: {
    gap: 4,
  },
  safetyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  safetyLevel: {
    fontSize: 14,
    fontWeight: '600',
  },
  zoneName: {
    fontSize: 14,
    fontWeight: '500',
  },
  safetyMessage: {
    fontSize: 13,
    lineHeight: 18,
  },
  scoreInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  scoreLabel: {
    fontSize: 13,
  },
  scoreValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 4,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 4,
    alignSelf: 'center',
  },
  refreshButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default LocationStatus;