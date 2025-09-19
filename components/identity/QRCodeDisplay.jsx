import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons } from '@expo/vector-icons';

const QRCodeDisplay = ({ 
  touristData, 
  onRefresh, 
  onError, 
  fullScreen = false,
  showControls = true,
  style 
}) => {
  const [qrData, setQrData] = useState(null);
  const [loading, setLoading] = useState(true);

  // QR code size based on screen mode
  const qrSize = fullScreen ? 250 : 200;

  useEffect(() => {
    generateQRCode();
  }, [touristData]);

  const generateQRCode = async () => {
    try {
      setLoading(true);
      
      // Mock QR data for demo
      const mockQrData = {
        qrString: JSON.stringify({
          userId: touristData?.userId || 'demo-user',
          name: touristData?.name || 'Demo User',
          nationality: touristData?.nationality || 'India',
          verificationStatus: 'verified',
          timestamp: new Date().toISOString()
        }),
        userId: touristData?.userId || 'demo-user',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        generatedAt: new Date(),
        securityLevel: 'high'
      };
      
      setQrData(mockQrData);
      
      if (onRefresh) {
        onRefresh(mockQrData);
      }
      
      setLoading(false);
    } catch (error) {
      handleError(error.message);
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    await generateQRCode();
  };

  const handleError = (errorMessage) => {
    console.error('QR Display Error:', errorMessage);
    
    if (onError) {
      onError(errorMessage);
    } else {
      Alert.alert('Error', errorMessage || 'QR Code generation failed');
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer, style]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Generating QR code...</Text>
      </View>
    );
  }

  if (!qrData) {
    return (
      <View style={[styles.container, styles.errorContainer, style]}>
        <Ionicons name="alert-circle-outline" size={48} color="#FF3B30" />
        <Text style={styles.errorText}>Failed to generate QR code</Text>
        <TouchableOpacity style={styles.retryButton} onPress={generateQRCode}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, fullScreen && styles.fullScreenContainer, style]}>
      {/* Security Status Header */}
      <View style={styles.securityHeader}>
        <View style={styles.securityBadge}>
          <Ionicons name="shield-checkmark" size={16} color="#00C851" />
          <Text style={styles.securityText}>Encrypted</Text>
        </View>
        <View style={styles.securityBadge}>
          <Ionicons name="checkmark-circle" size={16} color="#007E33" />
          <Text style={styles.securityText}>Verified</Text>
        </View>
      </View>

      {/* QR Code Display */}
      <View style={styles.qrContainer}>
        <View style={styles.qrWrapper}>
          <QRCode
            value={qrData.qrString}
            size={qrSize}
            color="#000000"
            backgroundColor="#FFFFFF"
            logoSize={qrSize * 0.15}
            logoBackgroundColor="transparent"
            logoMargin={2}
            logoBorderRadius={8}
            quietZone={10}
          />
        </View>
        
        {/* Security Level Indicator */}
        <View style={styles.securityLevelBadge}>
          <Text style={styles.securityLevelText}>
            {qrData.securityLevel?.toUpperCase() || 'VERIFIED'}
          </Text>
        </View>
      </View>

      {/* QR Code Information */}
      <View style={styles.infoContainer}>
        <Text style={styles.userName}>{touristData?.name || 'Tourist User'}</Text>
        <Text style={styles.userDetails}>
          {touristData?.nationality || 'India'} • Verified Tourist
        </Text>
        
        <View style={styles.timeContainer}>
          <Ionicons name="time-outline" size={16} color="#666" />
          <Text style={styles.timeText}>
            Valid for 24 hours
          </Text>
        </View>
        
        <Text style={styles.generatedText}>
          Generated: {qrData.generatedAt.toLocaleString()}
        </Text>
      </View>

      {/* Control Buttons */}
      {showControls && (
        <View style={styles.controlsContainer}>
          <TouchableOpacity style={styles.controlButton} onPress={handleRefresh}>
            <Ionicons name="refresh" size={20} color="#FFFFFF" />
            <Text style={styles.controlButtonText}>Refresh</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.controlButton} 
            onPress={() => Alert.alert('Info', 'QR code is ready for verification')}
          >
            <Ionicons name="information-circle-outline" size={20} color="#FFFFFF" />
            <Text style={styles.controlButtonText}>Info</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  fullScreenContainer: {
    flex: 1,
    justifyContent: 'center',
    margin: 0,
    borderRadius: 0,
    paddingTop: 60,
  },
  loadingContainer: {
    justifyContent: 'center',
    minHeight: 200,
  },
  errorContainer: {
    justifyContent: 'center',
    minHeight: 200,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  securityHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  securityText: {
    fontSize: 12,
    color: '#00C851',
    fontWeight: '600',
  },
  qrContainer: {
    alignItems: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  qrWrapper: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 3,
    borderColor: '#00C851',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  securityLevelBadge: {
    position: 'absolute',
    bottom: -8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#00C851',
  },
  securityLevelText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  infoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  userDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  timeText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  generatedText: {
    fontSize: 12,
    color: '#999',
  },
  controlsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  controlButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default QRCodeDisplay;