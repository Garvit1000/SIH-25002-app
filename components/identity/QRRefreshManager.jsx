import React, { useEffect, useRef, useState } from 'react';
import { AppState, Alert } from 'react-native';
import { qrGeneratorService } from '../../services/security/qrGenerator';
import { QR_CONFIG } from '../../utils/constants';

/**
 * QR Refresh Manager Component
 * Handles automatic QR code refresh based on expiration and app state
 */
const QRRefreshManager = ({ 
  userId, 
  qrData, 
  onRefresh, 
  onError,
  autoRefresh = true,
  backgroundRefresh = true 
}) => {
  const [appState, setAppState] = useState(AppState.currentState);
  const refreshTimer = useRef(null);
  const backgroundTimer = useRef(null);

  useEffect(() => {
    if (autoRefresh && qrData) {
      startRefreshTimer();
    }

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      clearTimers();
      subscription?.remove();
    };
  }, [qrData, autoRefresh]);

  const handleAppStateChange = (nextAppState) => {
    if (appState.match(/inactive|background/) && nextAppState === 'active') {
      // App came to foreground - check if QR needs refresh
      if (qrData && qrGeneratorService.needsRefresh(qrData)) {
        handleRefresh();
      }
    } else if (nextAppState.match(/inactive|background/) && backgroundRefresh) {
      // App went to background - start background refresh timer
      startBackgroundRefresh();
    }

    setAppState(nextAppState);
  };

  const startRefreshTimer = () => {
    clearTimers();

    if (!qrData) return;

    const timeUntilRefresh = getTimeUntilRefresh();
    
    if (timeUntilRefresh > 0) {
      refreshTimer.current = setTimeout(() => {
        handleRefresh();
      }, timeUntilRefresh);
    } else {
      // QR code already needs refresh
      handleRefresh();
    }
  };

  const startBackgroundRefresh = () => {
    if (!backgroundRefresh || !qrData) return;

    // Check every 5 minutes in background
    backgroundTimer.current = setInterval(() => {
      if (qrGeneratorService.needsRefresh(qrData)) {
        handleRefresh();
      }
    }, 5 * 60 * 1000); // 5 minutes
  };

  const getTimeUntilRefresh = () => {
    if (!qrData) return 0;

    const now = new Date();
    const expiryTime = qrData.expiresAt.getTime();
    const refreshThreshold = QR_CONFIG.REFRESH_THRESHOLD_HOURS * 60 * 60 * 1000;
    const refreshTime = expiryTime - refreshThreshold;

    return Math.max(0, refreshTime - now.getTime());
  };

  const handleRefresh = async () => {
    try {
      clearTimers();

      const result = await qrGeneratorService.refreshQRCode(userId, qrData);
      
      if (result.success) {
        if (onRefresh) {
          onRefresh(result.qrData);
        }
        
        // Show notification if app is in foreground
        if (appState === 'active') {
          Alert.alert(
            'QR Code Updated',
            'Your QR code has been automatically refreshed for security.',
            [{ text: 'OK' }]
          );
        }
        
        // Restart timer with new QR data
        startRefreshTimer();
      } else {
        handleError(result.error);
      }
    } catch (error) {
      handleError(error.message);
    }
  };

  const handleError = (error) => {
    console.error('QR Refresh Error:', error);
    
    if (onError) {
      onError(error);
    }
    
    // Retry after 5 minutes on error
    refreshTimer.current = setTimeout(() => {
      handleRefresh();
    }, 5 * 60 * 1000);
  };

  const clearTimers = () => {
    if (refreshTimer.current) {
      clearTimeout(refreshTimer.current);
      refreshTimer.current = null;
    }
    
    if (backgroundTimer.current) {
      clearInterval(backgroundTimer.current);
      backgroundTimer.current = null;
    }
  };

  // This component doesn't render anything
  return null;
};

export default QRRefreshManager;