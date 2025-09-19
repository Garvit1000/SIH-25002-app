import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Text,
  Modal,
  ScrollView,
  ActivityIndicator,
  Dimensions
} from 'react-native';
// Removed maps import to prevent TurboModule errors in Expo Go
import { Ionicons } from '@expo/vector-icons';
import { useLocation } from '../../context/LocationContext';
import { useTheme } from '../../context/ThemeContext';
import { safetyZonesService } from '../../services/location/safetyZones';
import { geoFencingService } from '../../services/location/geoFencing';

const { width, height } = Dimensions.get('window');

const MapScreen = ({ navigation }) => {
  const { 
    currentLocation, 
    currentSafetyStatus, 
    safetyZones,
    getCurrentLocation,
    calculateRouteSafety,
    loading 
  } = useLocation();
  
  const { theme, colors } = useTheme();
  const mapRef = useRef(null);
  
  const [mapReady, setMapReady] = useState(false);
  const [selectedZone, setSelectedZone] = useState(null);
  const [showZoneDetails, setShowZoneDetails] = useState(false);
  const [routePoints, setRoutePoints] = useState([]);
  const [routeSafety, setRouteSafety] = useState(null);
  const [isRoutePlanning, setIsRoutePlanning] = useState(false);
  const [mapType, setMapType] = useState('standard');

  // Safety zone colors based on safety level
  const getSafetyZoneColor = (safetyLevel) => {
    switch (safetyLevel) {
      case 'safe':
        return {
          fillColor: 'rgba(76, 175, 80, 0.3)',
          strokeColor: '#4CAF50'
        };
      case 'caution':
        return {
          fillColor: 'rgba(255, 193, 7, 0.3)',
          strokeColor: '#FFC107'
        };
      case 'restricted':
        return {
          fillColor: 'rgba(244, 67, 54, 0.3)',
          strokeColor: '#F44336'
        };
      default:
        return {
          fillColor: 'rgba(158, 158, 158, 0.3)',
          strokeColor: '#9E9E9E'
        };
    }
  };

  // Get route safety color based on score
  const getRouteSafetyColor = (score) => {
    if (score >= 80) return '#4CAF50'; // Green - Safe
    if (score >= 60) return '#FF9800'; // Orange - Caution
    if (score >= 40) return '#FF5722'; // Red-Orange - High Risk
    return '#F44336'; // Red - Critical
  };

  useEffect(() => {
    if (currentLocation && mapReady && mapRef.current) {
      // Center map on current location
      mapRef.current.animateToRegion({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
    }
  }, [currentLocation, mapReady]);

  const handleZonePress = async (zone) => {
    setSelectedZone(zone);
    
    try {
      const zoneDetails = await safetyZonesService.getZoneDetails(zone.id);
      if (zoneDetails.success) {
        setSelectedZone(zoneDetails.zone);
      }
    } catch (error) {
      console.error('Error fetching zone details:', error);
    }
    
    setShowZoneDetails(true);
  };

  const handleMapPress = (event) => {
    if (isRoutePlanning) {
      const { latitude, longitude } = event.nativeEvent.coordinate;
      setRoutePoints(prev => [...prev, { latitude, longitude }]);
    }
  };

  const calculateRouteScore = async () => {
    if (routePoints.length < 2) {
      Alert.alert('Route Planning', 'Please add at least 2 points to calculate route safety.');
      return;
    }

    try {
      const result = await calculateRouteSafety(routePoints);
      if (result.success) {
        setRouteSafety(result);
        Alert.alert(
          'Route Safety Score',
          `Safety Score: ${result.score}/100\n${result.recommendation}`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', 'Failed to calculate route safety.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to calculate route safety.');
    }
  };

  const clearRoute = () => {
    setRoutePoints([]);
    setRouteSafety(null);
  };

  const toggleRoutePlanning = () => {
    setIsRoutePlanning(!isRoutePlanning);
    if (isRoutePlanning) {
      clearRoute();
    }
  };

  const centerOnCurrentLocation = () => {
    if (currentLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
    } else {
      getCurrentLocation();
    }
  };

  const toggleMapType = () => {
    const types = ['standard', 'satellite', 'hybrid'];
    const currentIndex = types.indexOf(mapType);
    const nextIndex = (currentIndex + 1) % types.length;
    setMapType(types[nextIndex]);
  };

  // Temporarily disabled for Expo Go compatibility
  const renderSafetyZones = () => {
    // return safetyZones.map((zone) => {
    //   const colors = getSafetyZoneColor(zone.safetyLevel);
    //   
    //   return (
    //     <Polygon
    //       key={zone.id}
    //       coordinates={zone.coordinates}
    //       fillColor={colors.fillColor}
    //       strokeColor={colors.strokeColor}
    //       strokeWidth={2}
    //       onPress={() => handleZonePress(zone)}
    //       tappable={true}
    //     />
    //   );
    // });
    return null;
  };

  const renderRoute = () => {
    // if (routePoints.length < 2) return null;

    // const routeColor = routeSafety 
    //   ? getRouteSafetyColor(routeSafety.score)
    //   : colors.primary;

    // return (
    //   <>
    //     <Polyline
    //       coordinates={routePoints}
    //       strokeColor={routeColor}
    //       strokeWidth={4}
    //       lineDashPattern={[5, 5]}
    //     />
    //     {routePoints.map((point, index) => (
    //       <Marker
    //         key={`route-point-${index}`}
    //         coordinate={point}
    //         pinColor={routeColor}
    //         title={`Route Point ${index + 1}`}
    //         description={routeSafety ? `Safety Score: ${routeSafety.score}` : 'Route planning point'}
    //       />
    //     ))}
    //   </>
    // );
    return null;
  };

  const renderZoneDetailsModal = () => (
    <Modal
      visible={showZoneDetails}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowZoneDetails(false)}
    >
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            {selectedZone?.name}
          </Text>
          <TouchableOpacity
            onPress={() => setShowZoneDetails(false)}
            style={styles.closeButton}
          >
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.modalContent}>
          {selectedZone && (
            <>
              <View style={styles.safetyLevelContainer}>
                <View style={[
                  styles.safetyLevelBadge,
                  { backgroundColor: getSafetyZoneColor(selectedZone.safetyLevel).strokeColor }
                ]}>
                  <Text style={styles.safetyLevelText}>
                    {selectedZone.safetyLevel.toUpperCase()}
                  </Text>
                </View>
              </View>

              <Text style={[styles.description, { color: colors.text }]}>
                {selectedZone.description}
              </Text>

              {selectedZone.safetyFeatures && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    Safety Features
                  </Text>
                  {selectedZone.safetyFeatures.map((feature, index) => (
                    <View key={index} style={styles.featureItem}>
                      <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                      <Text style={[styles.featureText, { color: colors.text }]}>
                        {feature}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {selectedZone.riskFactors && selectedZone.riskFactors.length > 0 && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    Risk Factors
                  </Text>
                  {selectedZone.riskFactors.map((risk, index) => (
                    <View key={index} style={styles.riskItem}>
                      <Ionicons name="warning" size={16} color={colors.warning} />
                      <Text style={[styles.riskText, { color: colors.text }]}>
                        {risk}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {selectedZone.safetyTips && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    Safety Tips
                  </Text>
                  {selectedZone.safetyTips.map((tip, index) => (
                    <View key={index} style={styles.tipItem}>
                      <Ionicons name="bulb" size={16} color={colors.info} />
                      <Text style={[styles.tipText, { color: colors.text }]}>
                        {tip}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {selectedZone.emergencyServices && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    Emergency Services
                  </Text>
                  {selectedZone.emergencyServices.map((service, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[styles.emergencyService, { borderColor: colors.border }]}
                      onPress={() => {
                        // Handle emergency service call
                        Alert.alert(
                          'Call Emergency Service',
                          `Call ${service.type} at ${service.number}?`,
                          [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Call', onPress: () => {
                              // In a real app, this would make a phone call
                              console.log(`Calling ${service.number}`);
                            }}
                          ]
                        );
                      }}
                    >
                      <Ionicons name="call" size={20} color={colors.primary} />
                      <View style={styles.serviceInfo}>
                        <Text style={[styles.serviceType, { color: colors.text }]}>
                          {service.type.replace('_', ' ').toUpperCase()}
                        </Text>
                        <Text style={[styles.serviceNumber, { color: colors.textSecondary }]}>
                          {service.number} • {service.distance}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {selectedZone.realTimeInfo && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    Real-time Information
                  </Text>
                  
                  <View style={styles.realTimeItem}>
                    <Text style={[styles.realTimeLabel, { color: colors.textSecondary }]}>
                      Crowd Level:
                    </Text>
                    <Text style={[styles.realTimeValue, { color: colors.text }]}>
                      {selectedZone.realTimeInfo.currentCrowdLevel?.description}
                    </Text>
                  </View>

                  <View style={styles.realTimeItem}>
                    <Text style={[styles.realTimeLabel, { color: colors.textSecondary }]}>
                      Weather Impact:
                    </Text>
                    <Text style={[styles.realTimeValue, { color: colors.text }]}>
                      {selectedZone.realTimeInfo.weatherImpact?.recommendation}
                    </Text>
                  </View>
                </View>
              )}
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>
          Loading map...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Expo Go Compatible Map Fallback */}
      <View style={[styles.map, { backgroundColor: colors.background }]}>
        <View style={[styles.mapPlaceholder, { backgroundColor: colors.surface }]}>
          <Ionicons name="map-outline" size={64} color={colors.textSecondary} />
          <Text style={[styles.mapPlaceholderTitle, { color: colors.text }]}>
            Safety Map
          </Text>
          <Text style={[styles.mapPlaceholderText, { color: colors.textSecondary }]}>
            Interactive map available in development build.{'\n'}
            Showing safety information below.
          </Text>
          
          {currentLocation && (
            <View style={[styles.locationInfo, { backgroundColor: colors.primary }]}>
              <Ionicons name="location" size={20} color="white" />
              <Text style={styles.locationText}>
                Current: {currentLocation.latitude.toFixed(4)}, {currentLocation.longitude.toFixed(4)}
              </Text>
            </View>
          )}
          
          {currentSafetyStatus && (
            <View style={[
              styles.safetyInfo,
              { 
                backgroundColor: currentSafetyStatus.isInSafeZone 
                  ? colors.success 
                  : colors.warning 
              }
            ]}>
              <Ionicons 
                name={currentSafetyStatus.isInSafeZone ? "shield-checkmark" : "warning"} 
                size={20} 
                color="white" 
              />
              <Text style={styles.safetyInfoText}>
                {currentSafetyStatus.message || 'Safety status available'}
              </Text>
            </View>
          )}

          {/* Safety Zones List */}
          {safetyZones && safetyZones.length > 0 && (
            <View style={[styles.zonesContainer, { backgroundColor: colors.surface }]}>
              <Text style={[styles.zonesTitle, { color: colors.text }]}>
                Nearby Safety Zones
              </Text>
              {safetyZones.slice(0, 3).map((zone, index) => (
                <TouchableOpacity
                  key={zone.id || index}
                  style={[styles.zoneItem, { borderColor: colors.border }]}
                  onPress={() => handleZonePress(zone)}
                >
                  <View style={[
                    styles.zoneIndicator,
                    { backgroundColor: getSafetyZoneColor(zone.safetyLevel).strokeColor }
                  ]} />
                  <Text style={[styles.zoneName, { color: colors.text }]}>
                    {zone.name || `Zone ${index + 1}`}
                  </Text>
                  <Text style={[styles.zoneLevel, { color: colors.textSecondary }]}>
                    {zone.safetyLevel || 'unknown'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>

      {/* Safety Status Bar */}
      {currentSafetyStatus && (
        <View style={[
          styles.safetyStatusBar,
          { 
            backgroundColor: currentSafetyStatus.isInSafeZone 
              ? 'rgba(76, 175, 80, 0.9)' 
              : 'rgba(255, 193, 7, 0.9)' 
          }
        ]}>
          <Ionicons 
            name={currentSafetyStatus.isInSafeZone ? "shield-checkmark" : "warning"} 
            size={20} 
            color="white" 
          />
          <Text style={styles.safetyStatusText}>
            {currentSafetyStatus.message}
          </Text>
        </View>
      )}

      {/* Map Controls */}
      <View style={styles.mapControls}>
        <TouchableOpacity
          style={[styles.controlButton, { backgroundColor: colors.surface }]}
          onPress={centerOnCurrentLocation}
        >
          <Ionicons name="locate" size={24} color={colors.primary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, { backgroundColor: colors.surface }]}
          onPress={toggleMapType}
        >
          <Ionicons name="layers" size={24} color={colors.primary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.controlButton,
            { backgroundColor: isRoutePlanning ? colors.primary : colors.surface }
          ]}
          onPress={toggleRoutePlanning}
        >
          <Ionicons 
            name="navigate" 
            size={24} 
            color={isRoutePlanning ? colors.surface : colors.primary} 
          />
        </TouchableOpacity>
      </View>

      {/* Route Planning Controls */}
      {isRoutePlanning && (
        <View style={[styles.routeControls, { backgroundColor: colors.surface }]}>
          <Text style={[styles.routeTitle, { color: colors.text }]}>
            Route Planning ({routePoints.length} points)
          </Text>
          <View style={styles.routeButtons}>
            <TouchableOpacity
              style={[styles.routeButton, { backgroundColor: colors.primary }]}
              onPress={calculateRouteScore}
              disabled={routePoints.length < 2}
            >
              <Text style={[styles.routeButtonText, { color: colors.surface }]}>
                Calculate Safety
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.routeButton, { backgroundColor: colors.error }]}
              onPress={clearRoute}
            >
              <Text style={[styles.routeButtonText, { color: colors.surface }]}>
                Clear Route
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Safety Status Bar */}
      {currentSafetyStatus && (
        <View style={[
          styles.safetyStatusBar,
          { 
            backgroundColor: currentSafetyStatus.isInSafeZone 
              ? 'rgba(76, 175, 80, 0.9)' 
              : 'rgba(255, 193, 7, 0.9)' 
          }
        ]}>
          <Ionicons 
            name={currentSafetyStatus.isInSafeZone ? "shield-checkmark" : "warning"} 
            size={20} 
            color="white" 
          />
          <Text style={styles.safetyStatusText}>
            {currentSafetyStatus.message}
          </Text>
        </View>
      )}

      {renderZoneDetailsModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  mapControls: {
    position: 'absolute',
    right: 16,
    top: 60,
    gap: 12,
  },
  controlButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  routeControls: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  routeTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  routeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  routeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  routeButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  safetyStatusBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  safetyStatusText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  safetyLevelContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  safetyLevelBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  safetyLevelText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  featureText: {
    fontSize: 14,
    flex: 1,
  },
  riskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  riskText: {
    fontSize: 14,
    flex: 1,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 8,
  },
  tipText: {
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  emergencyService: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 8,
    gap: 12,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceType: {
    fontSize: 14,
    fontWeight: '600',
  },
  serviceNumber: {
    fontSize: 12,
    marginTop: 2,
  },
  realTimeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  realTimeLabel: {
    fontSize: 14,
  },
  realTimeValue: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  // Placeholder styles for Expo Go compatibility
  mapPlaceholder: {
    padding: 40,
    borderRadius: 16,
    alignItems: 'center',
    margin: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  mapPlaceholderTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  mapPlaceholderText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 12,
    gap: 8,
  },
  locationText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  safetyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 12,
    gap: 8,
  },
  safetyInfoText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  zonesContainer: {
    width: '100%',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  zonesTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  zoneItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 8,
    gap: 12,
  },
  zoneIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  zoneName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  zoneLevel: {
    fontSize: 12,
    textTransform: 'capitalize',
    borderRadius: 20,
    gap: 8,
  },
  safetyText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default MapScreen;