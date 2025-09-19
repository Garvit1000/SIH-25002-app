import { useState, useEffect, useCallback } from 'react';
import { qrGeneratorService } from '../services/security/qrGenerator';
import { QRCodeData } from '../utils/dataModels';
import { VERIFICATION_STATUS } from '../utils/constants';

/**
 * Custom hook for QR code management
 * Provides QR code generation, caching, and refresh functionality
 */
export const useQRCode = (user, options = {}) => {
  const {
    autoGenerate = true,
    autoRefresh = true,
    cacheEnabled = true,
    onError = null
  } = options;

  const [qrData, setQrData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  // Initialize QR code on mount
  useEffect(() => {
    if (autoGenerate && user && isUserVerified(user)) {
      initializeQRCode();
    }
  }, [user, autoGenerate]);

  // Auto-refresh timer
  useEffect(() => {
    if (autoRefresh && qrData) {
      const timer = setInterval(() => {
        if (qrGeneratorService.needsRefresh(qrData)) {
          refreshQRCode();
        }
      }, 60000); // Check every minute

      return () => clearInterval(timer);
    }
  }, [qrData, autoRefresh]);

  const isUserVerified = (userData) => {
    return userData && userData.verificationStatus === VERIFICATION_STATUS.VERIFIED;
  };

  const initializeQRCode = async () => {
    if (!user || !isUserVerified(user)) {
      setError('User must be verified to generate QR code');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Try to load cached QR code first
      if (cacheEnabled) {
        const cachedResult = await qrGeneratorService.getCachedQRData(user.userId);
        
        if (cachedResult.success && !qrGeneratorService.needsRefresh(cachedResult.qrData)) {
          setQrData(cachedResult.qrData);
          setLastRefresh(cachedResult.qrData.generatedAt);
          setLoading(false);
          return;
        }
      }

      // Generate new QR code
      await generateNewQRCode();
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  const generateNewQRCode = async () => {
    if (!user || !isUserVerified(user)) {
      throw new Error('User must be verified to generate QR code');
    }

    const result = await qrGeneratorService.generateQRData(user);
    
    if (result.success) {
      setQrData(result.qrData);
      setLastRefresh(new Date());
      setError(null);
      return result.qrData;
    } else {
      throw new Error(result.error);
    }
  };

  const refreshQRCode = useCallback(async () => {
    if (!user || !qrData) return;

    setLoading(true);
    setError(null);

    try {
      const result = await qrGeneratorService.refreshQRCode(user.userId, qrData);
      
      if (result.success) {
        setQrData(result.qrData);
        setLastRefresh(new Date());
        return result.qrData;
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      handleError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user, qrData]);

  const generateOfflineQR = useCallback(async () => {
    if (!user || !isUserVerified(user)) {
      throw new Error('User must be verified to generate offline QR code');
    }

    setLoading(true);
    setError(null);

    try {
      const result = await qrGeneratorService.generateOfflineQR(user);
      
      if (result.success) {
        return result;
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      handleError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const verifyQRCode = useCallback(async (qrString) => {
    setLoading(true);
    setError(null);

    try {
      const result = await qrGeneratorService.verifyQRData(qrString);
      
      if (result.success) {
        return result;
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      handleError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearQRData = useCallback(async () => {
    if (user?.userId) {
      await qrGeneratorService.invalidateQRData(user.userId);
    }
    setQrData(null);
    setError(null);
    setLastRefresh(null);
  }, [user]);

  const handleError = (err) => {
    const errorMessage = err.message || 'An error occurred with QR code';
    setError(errorMessage);
    
    if (onError) {
      onError(errorMessage);
    }
    
    console.error('QR Code Hook Error:', err);
  };

  // Computed properties
  const isExpired = qrData ? qrData.isExpired() : false;
  const needsRefresh = qrData ? qrGeneratorService.needsRefresh(qrData) : false;
  const timeUntilExpiry = qrData ? qrData.getTimeUntilExpiry() : 0;
  const isBlockchainVerified = qrData ? !!qrData.blockchainTxId : false;

  return {
    // State
    qrData,
    loading,
    error,
    lastRefresh,
    
    // Computed properties
    isExpired,
    needsRefresh,
    timeUntilExpiry,
    isBlockchainVerified,
    
    // Actions
    generateNewQRCode,
    refreshQRCode,
    generateOfflineQR,
    verifyQRCode,
    clearQRData,
    initializeQRCode,
    
    // Utilities
    isUserVerified: () => isUserVerified(user)
  };
};

export default useQRCode;