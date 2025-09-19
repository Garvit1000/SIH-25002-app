import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Alert,
  ScrollView,
  RefreshControl,
  Dimensions,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import QRCodeDisplay from '../components/identity/QRCodeDisplay';
import { AuthContext } from '../context/AuthContext';
import { qrGeneratorService } from '../services/security/qrGenerator';
import { VERIFICATION_STATUS, ERROR_MESSAGES } from '../utils/constants';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const QRCodeScreen = ({ navigation, route }) => {
  const { user } = useContext(AuthContext);
  const [refreshing, setRefreshing] = useState(false);
  const [qrData, setQrData] = useState(null);
  const [fullScreen, setFullScreen] = useState(false);
  const [securityInfo, setSecurityInfo] = useState({
    encryptionLevel: 'High',
    blockchainVerified: false,
    lastUpdated: new Date()
  });

  // Get fullScreen mode from route params
  const isFullScreenMode = route?.params?.fullScreen || fullScreen;

  useEffect(() => {
    // Check if user is verified
    if (user?.verificationStatus !== VERIFICATION_STATUS.VERIFIED) {
      Alert.alert(
        'Verification Required',
        'You need to complete profile verification to generate QR codes.',
        [
          { text: 'Go to Profile', onPress: () => navigation.navigate('Profile') },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
      return;
    }

    // Load cached QR data on mount
    loadCachedQRData();
  }, [user]);

  const loadCachedQRData = async () => {
    if (!user?.userId) return;

    try {
      const cachedResult = await qrGeneratorService.getCachedQRData(user.userId);
      if (cachedResult.success) {
        setQrData(cachedResult.qrData);
        updateSecurityInfo(cachedResult.qrData);
      }
    } catch (error) {
      console.error('Failed to load cached QR data:', error);
    }
  };

  const updateSecurityInfo = (qrCodeData) => {
    setSecurityInfo({
      encryptionLevel: qrCodeData.securityLevel === 'high' ? 'High' : 'Standard',
      blockchainVerified: !!qrCodeData.blockchainTxId,
      lastUpdated: qrCodeData.generatedAt
    });
  };

  const handleQRRefresh = (newQrData) => {
    setQrData(newQrData);
    updateSecurityInfo(newQrData);
  };

  const handleQRError = (error) => {
    Alert.alert('QR Code Error', error || ERROR_MESSAGES.GENERIC_ERROR);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      // Force refresh QR code
      if (user?.userId && qrData) {
        const result = await qrGeneratorService.refreshQRCode(user.userId, qrData);
        if (result.success) {
          setQrData(result.qrData);
          updateSecurityInfo(result.qrData);
        }
      }
    } catch (error) {
      handleQRError(error.message);
    } finally {
      setRefreshing(false);
    }
  };

  const toggleFullScreen = () => {
    setFullScreen(!fullScreen);
    
    // Update navigation params
    navigation.setParams({ fullScreen: !fullScreen });
  };

  const handleSecurityInfo = () => {
    Alert.alert(
      'Security Information',
      `Encryption Level: ${securityInfo.encryptionLevel}\n` +
      `Blockchain Verified: ${securityInfo.blockchainVerified ? 'Yes' : 'No'}\n` +
      `Last Updated: ${securityInfo.lastUpdated.toLocaleString()}\n\n` +
      'Your QR code is encrypted with military-grade security and verified on blockchain for maximum authenticity.',
      [{ text: 'OK' }]
    );
  };

  const handleEmergencyAccess = () => {
    Alert.alert(
      'Emergency Access',
      'In case of emergency, authorities can scan your QR code to access:\n\n' +
      '• Your identity verification\n' +
      '• Emergency contact information\n' +
      '• Medical information (if provided)\n' +
      '• Current location data\n\n' +
      'No sensitive personal data is stored in the QR code.',
      [{ text: 'Understood' }]
    );
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="person-outline" size={64} color="#999" />
          <Text style={styles.errorText}>Please log in to view QR code</Text>
          <TouchableOpacity 
            style={styles.loginButton}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.loginButtonText}>Go to Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (user.verificationStatus !== VERIFICATION_STATUS.VERIFIED) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="shield-outline" size={64} color="#FF9500" />
          <Text style={styles.errorText}>Verification Required</Text>
          <Text style={styles.errorSubtext}>
            Complete your profile verification to generate secure QR codes
          </Text>
          <TouchableOpacity 
            style={styles.verifyButton}
            onPress={() => navigation.navigate('Profile')}
          >
            <Text style={styles.verifyButtonText}>Complete Verification</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (isFullScreenMode) {
    return (
      <View style={styles.fullScreenContainer}>
        <StatusBar hidden />
        <LinearGradient
          colors={['#1E3A8A', '#3B82F6']}
          style={styles.fullScreenGradient}
        >
          <SafeAreaView style={styles.fullScreenSafeArea}>
            {/* Full Screen Header */}
            <View style={styles.fullScreenHeader}>
              <TouchableOpacity onPress={toggleFullScreen}>
                <Ionicons name="close" size={28} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.fullScreenTitle}>Tourist ID</Text>
              <TouchableOpacity onPress={handleSecurityInfo}>
                <Ionicons name="information-circle-outline" size={28} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Full Screen QR Display */}
            <View style={styles.fullScreenContent}>
              <QRCodeDisplay
                touristData={user}
                onRefresh={handleQRRefresh}
                onError={handleQRError}
                fullScreen={true}
                showControls={true}
                style={styles.fullScreenQR}
              />
            </View>

            {/* Full Screen Footer */}
            <View style={styles.fullScreenFooter}>
              <Text style={styles.fullScreenFooterText}>
                Show this QR code to authorities for instant verification
              </Text>
            </View>
          </SafeAreaView>
        </LinearGradient>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1C1C1E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My QR Code</Text>
        <TouchableOpacity onPress={handleSecurityInfo}>
          <Ionicons name="information-circle-outline" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Security Status Card */}
        <View style={styles.securityCard}>
          <View style={styles.securityHeader}>
            <Ionicons name="shield-checkmark" size={24} color="#00C851" />
            <Text style={styles.securityTitle}>Security Status</Text>
          </View>
          <View style={styles.securityDetails}>
            <View style={styles.securityItem}>
              <Text style={styles.securityLabel}>Encryption:</Text>
              <Text style={styles.securityValue}>{securityInfo.encryptionLevel}</Text>
            </View>
            <View style={styles.securityItem}>
              <Text style={styles.securityLabel}>Blockchain:</Text>
              <Text style={[
                styles.securityValue,
                { color: securityInfo.blockchainVerified ? '#00C851' : '#FF9500' }
              ]}>
                {securityInfo.blockchainVerified ? 'Verified' : 'Pending'}
              </Text>
            </View>
            <View style={styles.securityItem}>
              <Text style={styles.securityLabel}>Last Updated:</Text>
              <Text style={styles.securityValue}>
                {securityInfo.lastUpdated.toLocaleTimeString()}
              </Text>
            </View>
          </View>
        </View>

        {/* QR Code Display */}
        <QRCodeDisplay
          touristData={user}
          onRefresh={handleQRRefresh}
          onError={handleQRError}
          fullScreen={false}
          showControls={true}
          style={styles.qrDisplay}
        />

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.actionButton} onPress={toggleFullScreen}>
            <Ionicons name="expand-outline" size={20} color="#007AFF" />
            <Text style={styles.actionButtonText}>Full Screen</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleEmergencyAccess}>
            <Ionicons name="medical-outline" size={20} color="#007AFF" />
            <Text style={styles.actionButtonText}>Emergency Info</Text>
          </TouchableOpacity>
        </View>

        {/* Usage Instructions */}
        <View style={styles.instructionsCard}>
          <Text style={styles.instructionsTitle}>How to Use</Text>
          <View style={styles.instructionsList}>
            <View style={styles.instructionItem}>
              <Ionicons name="checkmark-circle" size={16} color="#00C851" />
              <Text style={styles.instructionText}>
                Show QR code to authorities for instant verification
              </Text>
            </View>
            <View style={styles.instructionItem}>
              <Ionicons name="checkmark-circle" size={16} color="#00C851" />
              <Text style={styles.instructionText}>
                QR code refreshes automatically every 24 hours
              </Text>
            </View>
            <View style={styles.instructionItem}>
              <Ionicons name="checkmark-circle" size={16} color="#00C851" />
              <Text style={styles.instructionText}>
                Works offline for emergency situations
              </Text>
            </View>
            <View style={styles.instructionItem}>
              <Ionicons name="checkmark-circle" size={16} color="#00C851" />
              <Text style={styles.instructionText}>
                Blockchain verified for maximum security
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  fullScreenContainer: {
    flex: 1,
  },
  fullScreenGradient: {
    flex: 1,
  },
  fullScreenSafeArea: {
    flex: 1,
  },
  fullScreenHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  fullScreenTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  fullScreenContent: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  fullScreenQR: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  fullScreenFooter: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    alignItems: 'center',
  },
  fullScreenFooterText: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.9,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  securityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  securityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  securityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  securityDetails: {
    gap: 8,
  },
  securityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  securityLabel: {
    fontSize: 14,
    color: '#666',
  },
  securityValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  qrDisplay: {
    marginBottom: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  instructionsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 12,
  },
  instructionsList: {
    gap: 10,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  instructionText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  loginButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  verifyButton: {
    backgroundColor: '#FF9500',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  verifyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default QRCodeScreen;