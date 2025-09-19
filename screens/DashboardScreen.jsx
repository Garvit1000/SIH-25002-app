import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useLocation } from '../context/LocationContext';
import { useSafety } from '../context/SafetyContext';
import { useTheme } from '../context/ThemeContext';
import SafetyScore from '../components/safety/SafetyScore';
import LocationStatus from '../components/safety/LocationStatus';
import PanicButton from '../components/safety/PanicButton';
import LoadingIndicator from '../components/LoadingIndicator';

const { width } = Dimensions.get('window');

const DashboardScreen = ({ navigation }) => {
  const { profile, isVerifiedTourist } = useAuth();
  const { 
    currentLocation, 
    currentSafetyStatus, 
    getCurrentLocation, 
    requestLocationPermission,
    getLocationAccuracy,
    loading: locationLoading 
  } = useLocation();
  const { 
    safetyScore, 
    activatePanicMode, 
    panicMode,
    emergencyContacts,
    updateSafetyScore,
    sendSafetyZoneAlert 
  } = useSafety();
  const { colors } = useTheme();

  const [refreshing, setRefreshing] = useState(false);
  const [safetyTips, setSafetyTips] = useState([]);

  useEffect(() => {
    // Initialize location and safety data
    initializeDashboard();
  }, []);

  useEffect(() => {
    // Update safety score when location or safety status changes
    if (currentSafetyStatus) {
      updateSafetyScore(currentSafetyStatus);
      generateSafetyTips(currentSafetyStatus);
      
      // Send safety zone alerts if needed
      if (currentSafetyStatus.safetyLevel === 'restricted' || 
          currentSafetyStatus.safetyLevel === 'caution') {
        sendSafetyZoneAlert(currentSafetyStatus);
      }
    }
  }, [currentSafetyStatus]);

  const initializeDashboard = async () => {
    try {
      // Request location permission if not granted
      if (!currentLocation) {
        await requestLocationPermission();
      } else {
        await getCurrentLocation();
      }
    } catch (error) {
      console.error('Error initializing dashboard:', error);
    }
  };

  const generateSafetyTips = (safetyStatus) => {
    const tips = [];
    
    if (safetyStatus.safetyLevel === 'safe') {
      tips.push('You are in a safe area. Enjoy your visit!');
      tips.push('Keep your emergency contacts updated');
    } else if (safetyStatus.safetyLevel === 'caution') {
      tips.push('Exercise caution in this area');
      tips.push('Stay in well-lit, populated areas');
      tips.push('Keep your phone charged and accessible');
    } else if (safetyStatus.safetyLevel === 'restricted') {
      tips.push('This is a restricted area - consider leaving');
      tips.push('Stay alert and avoid isolated spots');
      tips.push('Have emergency contacts ready');
    }

    // Add time-based tips
    const hour = new Date().getHours();
    if (hour < 6 || hour > 22) {
      tips.push('It\'s late - consider returning to your accommodation');
    }

    setSafetyTips(tips.slice(0, 3)); // Show max 3 tips
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await getCurrentLocation();
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleQRCodePress = () => {
    if (!isVerifiedTourist()) {
      Alert.alert(
        'Verification Required',
        'Please complete your tourist profile verification to access QR code features.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Complete Profile', onPress: () => navigation.navigate('Profile') }
        ]
      );
      return;
    }
    navigation.navigate('QRCode');
  };

  const handleEmergencyPress = () => {
    navigation.navigate('Emergency');
  };

  const handleMapPress = () => {
    navigation.navigate('Map');
  };

  const handlePanicPress = async () => {
    if (!currentLocation) {
      Alert.alert('Location Required', 'Please enable location services to use panic button.');
      return;
    }

    if (emergencyContacts.length === 0) {
      Alert.alert(
        'No Emergency Contacts',
        'Please add emergency contacts in your profile before using panic button.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Add Contacts', onPress: () => navigation.navigate('Profile') }
        ]
      );
      return;
    }

    Alert.alert(
      'Emergency Alert',
      'This will send your location to emergency contacts. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Send Alert', 
          style: 'destructive',
          onPress: () => activatePanicMode(currentLocation, profile, emergencyContacts)
        }
      ]
    );
  };

  const getSafetyScoreFactors = () => {
    if (!currentSafetyStatus) return [];
    
    const factors = [];
    
    // Safety zone factor
    switch (currentSafetyStatus.safetyLevel) {
      case 'safe':
        factors.push({ factor: 'Safe Zone', impact: 20 });
        break;
      case 'caution':
        factors.push({ factor: 'Caution Zone', impact: -20 });
        break;
      case 'restricted':
        factors.push({ factor: 'Restricted Area', impact: -40 });
        break;
    }

    // Time factor
    const hour = new Date().getHours();
    if (hour >= 6 && hour <= 18) {
      factors.push({ factor: 'Daylight Hours', impact: 10 });
    } else {
      factors.push({ factor: 'Night Time', impact: -15 });
    }

    // Location accuracy factor
    const accuracy = getLocationAccuracy();
    if (accuracy && accuracy.level === 'high') {
      factors.push({ factor: 'Accurate Location', impact: 5 });
    }

    return factors;
  };

  const getRiskLevel = (score) => {
    if (score >= 80) return 'low';
    if (score >= 60) return 'medium';
    if (score >= 40) return 'high';
    return 'critical';
  };

  if (locationLoading && !currentLocation) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <LoadingIndicator message="Loading your safety dashboard..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <View style={[styles.header, { backgroundColor: colors.surface }]}>
          <View style={styles.profileInfo}>
            <View style={styles.avatarContainer}>
              <Ionicons 
                name="person-circle" 
                size={60} 
                color={colors.primary} 
              />
              {isVerifiedTourist() && (
                <View style={[styles.verificationBadge, { backgroundColor: colors.success }]}>
                  <Ionicons name="checkmark" size={16} color="white" />
                </View>
              )}
            </View>
            <View style={styles.profileText}>
              <Text style={[styles.welcomeText, { color: colors.text }]}>
                Welcome back!
              </Text>
              <Text style={[styles.nameText, { color: colors.text }]}>
                {profile?.displayName || profile?.name || 'Tourist'}
              </Text>
              {profile?.nationality && (
                <Text style={[styles.nationalityText, { color: colors.textSecondary }]}>
                  {profile.nationality}
                </Text>
              )}
            </View>
          </View>
          
          <TouchableOpacity
            style={[styles.qrButton, { backgroundColor: colors.primary }]}
            onPress={handleQRCodePress}
          >
            <Ionicons name="qr-code" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Safety Score Widget */}
        <View style={styles.widgetContainer}>
          <SafetyScore
            score={safetyScore}
            factors={getSafetyScoreFactors()}
            riskLevel={getRiskLevel(safetyScore)}
            showDetails={true}
            size="large"
          />
        </View>

        {/* Location Status Widget */}
        <View style={styles.widgetContainer}>
          <LocationStatus
            location={currentLocation}
            safetyStatus={currentSafetyStatus}
            accuracy={currentLocation?.accuracy}
            onRefresh={getCurrentLocation}
            onViewMap={handleMapPress}
            isOffline={currentSafetyStatus?.isOffline}
            isStale={currentSafetyStatus?.isStale}
          />
        </View>

        {/* Safety Tips */}
        {safetyTips.length > 0 && (
          <View style={[styles.tipsContainer, { backgroundColor: colors.surface }]}>
            <View style={styles.tipsHeader}>
              <Ionicons name="bulb" size={20} color={colors.warning} />
              <Text style={[styles.tipsTitle, { color: colors.text }]}>
                Safety Tips
              </Text>
            </View>
            {safetyTips.map((tip, index) => (
              <View key={index} style={styles.tipItem}>
                <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                <Text style={[styles.tipText, { color: colors.textSecondary }]}>
                  {tip}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.actionsContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Quick Actions
          </Text>
          
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.surface }]}
              onPress={handleEmergencyPress}
            >
              <Ionicons name="medical" size={32} color={colors.error} />
              <Text style={[styles.actionText, { color: colors.text }]}>
                Emergency
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.surface }]}
              onPress={handleMapPress}
            >
              <Ionicons name="map" size={32} color={colors.primary} />
              <Text style={[styles.actionText, { color: colors.text }]}>
                Safety Map
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.surface }]}
              onPress={() => navigation.navigate('Chat')}
            >
              <Ionicons name="chatbubbles" size={32} color={colors.secondary} />
              <Text style={[styles.actionText, { color: colors.text }]}>
                AI Assistant
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.surface }]}
              onPress={() => navigation.navigate('Profile')}
            >
              <Ionicons name="person" size={32} color={colors.textSecondary} />
              <Text style={[styles.actionText, { color: colors.text }]}>
                Profile
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.surface }]}
              onPress={() => navigation.navigate('LocationTracking')}
            >
              <Ionicons name="location" size={32} color={colors.success} />
              <Text style={[styles.actionText, { color: colors.text }]}>
                Location Demo
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Emergency Panic Button */}
        <View style={styles.panicContainer}>
          <PanicButton
            onPress={handlePanicPress}
            isActive={panicMode}
            size="large"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  verificationBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  profileText: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 14,
    marginBottom: 2,
  },
  nameText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  nationalityText: {
    fontSize: 12,
  },
  qrButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  widgetContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  tipsContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    paddingLeft: 4,
  },
  tipText: {
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
  },
  actionsContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    width: (width - 48) / 2,
    aspectRatio: 1.2,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  panicContainer: {
    alignItems: 'center',
    marginVertical: 20,
    paddingBottom: 20,
  },
});

export default DashboardScreen;