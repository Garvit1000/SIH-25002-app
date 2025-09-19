import { encryptionService } from './encryption';
import { blockchainService } from './blockchain';
import { QRCodeData, QRVerificationResult } from '../../utils/dataModels';
import { QR_CONFIG, VERIFICATION_STATUS } from '../../utils/constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const qrGeneratorService = {
  // Generate secure QR code data for tourist with blockchain verification
  generateQRData: async (touristData, securityLevel = 'high') => {
    try {
      // Validate input data
      if (!touristData || !touristData.userId) {
        return { success: false, error: 'Invalid tourist data provided' };
      }

      const { userId, name, nationality, passportNumber, verificationStatus, profilePhotoUrl } = touristData;
      
      // Only verified users can generate QR codes
      if (verificationStatus !== VERIFICATION_STATUS.VERIFIED) {
        return { success: false, error: 'User must be verified to generate QR code' };
      }

      // Create sanitized QR payload (no sensitive data)
      const qrPayload = {
        userId,
        name,
        nationality,
        passportNumber: passportNumber.slice(-4), // Only last 4 digits for security
        verificationStatus,
        profilePhotoUrl,
        generatedAt: Date.now(),
        securityLevel
      };

      // Encrypt the data with enhanced security
      const encryptionResult = await encryptionService.encryptForQR(qrPayload, userId, securityLevel);
      
      if (!encryptionResult.success) {
        return { success: false, error: 'Failed to encrypt QR data' };
      }

      // Create blockchain verification transaction
      const blockchainResult = await blockchainService.createVerificationTransaction(
        { userId, name }, 
        encryptionResult.verificationHash
      );

      let blockchainTxId = null;
      if (blockchainResult.success) {
        blockchainTxId = blockchainResult.transaction.txId;
      }

      // Create comprehensive QR string with all security features
      const qrString = JSON.stringify({
        data: encryptionResult.encryptedData,
        hash: encryptionResult.verificationHash,
        signature: encryptionResult.verificationSignature,
        timestamp: encryptionResult.timestamp,
        nonce: encryptionResult.nonce,
        salt: encryptionResult.salt,
        version: QR_CONFIG.VERSION,
        securityLevel: encryptionResult.securityLevel,
        blockchainTxId
      });

      // Set expiration based on configuration
      const expiresAt = new Date(Date.now() + QR_CONFIG.EXPIRY_HOURS * 60 * 60 * 1000);

      // Create QR code data object
      const qrCodeData = new QRCodeData({
        qrString,
        userId,
        verificationHash: encryptionResult.verificationHash,
        expiresAt,
        blockchainTxId,
        encryptedData: encryptionResult.encryptedData,
        generatedAt: new Date(encryptionResult.timestamp),
        version: QR_CONFIG.VERSION,
        securityLevel: encryptionResult.securityLevel
      });

      // Cache QR code data locally for offline access
      await qrGeneratorService.cacheQRData(qrCodeData);

      return {
        success: true,
        qrData: qrCodeData,
        blockchainVerified: blockchainResult.success
      };
    } catch (error) {
      console.error('QR Generation Error:', error);
      return { success: false, error: error.message };
    }
  },

  // Verify QR code data with comprehensive security checks
  verifyQRData: async (qrString) => {
    try {
      if (!qrString) {
        return { success: false, error: 'No QR code data provided' };
      }

      const qrData = JSON.parse(qrString);
      const { 
        data, 
        hash, 
        signature, 
        timestamp, 
        nonce, 
        salt, 
        version, 
        securityLevel, 
        blockchainTxId 
      } = qrData;

      // Check version compatibility
      if (version !== QR_CONFIG.VERSION) {
        return { 
          success: false, 
          error: `Unsupported QR code version: ${version}. Expected: ${QR_CONFIG.VERSION}` 
        };
      }

      // Check if QR code has expired
      const now = Date.now();
      const qrAge = now - timestamp;
      const maxAge = QR_CONFIG.EXPIRY_HOURS * 60 * 60 * 1000;

      if (qrAge > maxAge) {
        return { 
          success: false, 
          error: 'QR code has expired',
          result: new QRVerificationResult({
            isValid: false,
            isExpired: true,
            timestamp: new Date(timestamp),
            errorMessage: 'QR code has expired'
          })
        };
      }

      // Verify data integrity using encryption service
      const decryptionResult = await encryptionService.decryptQRData(
        data, hash, timestamp, nonce, salt, null
      );

      if (!decryptionResult.success) {
        return { 
          success: false, 
          error: 'QR code verification failed: ' + decryptionResult.error,
          result: new QRVerificationResult({
            isValid: false,
            timestamp: new Date(timestamp),
            errorMessage: decryptionResult.error
          })
        };
      }

      // Verify blockchain transaction if available
      let blockchainVerified = false;
      if (blockchainTxId) {
        const blockchainResult = await blockchainService.verifyTransaction(blockchainTxId);
        blockchainVerified = blockchainResult.success && blockchainResult.verified;
      }

      // Create verification result
      const verificationResult = new QRVerificationResult({
        isValid: true,
        isExpired: false,
        userData: {
          timestamp: new Date(timestamp),
          securityLevel,
          nonce
        },
        verificationHash: hash,
        blockchainVerified,
        timestamp: new Date()
      });

      return {
        success: true,
        verified: true,
        result: verificationResult,
        blockchainVerified
      };
    } catch (error) {
      console.error('QR Verification Error:', error);
      return { 
        success: false, 
        error: 'Invalid QR code format or corrupted data',
        result: new QRVerificationResult({
          isValid: false,
          timestamp: new Date(),
          errorMessage: 'Invalid QR code format'
        })
      };
    }
  },

  // Refresh QR code if needed
  refreshQRCode: async (userId, currentQRData) => {
    try {
      // Get user data for regeneration
      const userData = await qrGeneratorService.getUserDataForQR(userId);
      if (!userData) {
        return { success: false, error: 'User data not found' };
      }

      // Generate new QR code
      const newQRResult = await qrGeneratorService.generateQRData(userData);
      
      if (!newQRResult.success) {
        return { success: false, error: 'Failed to generate new QR code' };
      }

      // Invalidate old QR code
      if (currentQRData) {
        await qrGeneratorService.invalidateQRData(currentQRData.userId);
      }

      return {
        success: true,
        qrData: newQRResult.qrData,
        refreshed: true
      };
    } catch (error) {
      console.error('QR Refresh Error:', error);
      return { success: false, error: error.message };
    }
  },

  // Check if QR code needs refresh
  needsRefresh: (qrCodeData) => {
    if (!qrCodeData || !(qrCodeData instanceof QRCodeData)) {
      return true; // If no valid QR data, needs refresh
    }

    return qrCodeData.needsRefresh();
  },

  // Cache QR data locally for offline access
  cacheQRData: async (qrCodeData) => {
    try {
      const cacheKey = `qr_cache_${qrCodeData.userId}`;
      await AsyncStorage.setItem(cacheKey, JSON.stringify(qrCodeData.toJSON()));
      return { success: true };
    } catch (error) {
      console.error('QR Cache Error:', error);
      return { success: false, error: error.message };
    }
  },

  // Get cached QR data
  getCachedQRData: async (userId) => {
    try {
      const cacheKey = `qr_cache_${userId}`;
      const cachedData = await AsyncStorage.getItem(cacheKey);
      
      if (!cachedData) {
        return { success: false, error: 'No cached QR data found' };
      }

      const qrData = QRCodeData.fromJSON(JSON.parse(cachedData));
      
      // Check if cached data is still valid
      if (qrData.isExpired()) {
        await AsyncStorage.removeItem(cacheKey);
        return { success: false, error: 'Cached QR data has expired' };
      }

      return { success: true, qrData };
    } catch (error) {
      console.error('QR Cache Retrieval Error:', error);
      return { success: false, error: error.message };
    }
  },

  // Invalidate QR data
  invalidateQRData: async (userId) => {
    try {
      const cacheKey = `qr_cache_${userId}`;
      await AsyncStorage.removeItem(cacheKey);
      return { success: true };
    } catch (error) {
      console.error('QR Invalidation Error:', error);
      return { success: false, error: error.message };
    }
  },

  // Get user data for QR generation (placeholder - would integrate with user service)
  getUserDataForQR: async (userId) => {
    try {
      // This would typically fetch from user service or Firebase
      // For now, return mock data structure
      return {
        userId,
        name: 'Tourist User',
        nationality: 'Unknown',
        passportNumber: 'XXXX1234',
        verificationStatus: VERIFICATION_STATUS.VERIFIED,
        profilePhotoUrl: null
      };
    } catch (error) {
      console.error('User Data Retrieval Error:', error);
      return null;
    }
  },

  // Generate QR code for offline use (downloadable)
  generateOfflineQR: async (touristData) => {
    try {
      const qrResult = await qrGeneratorService.generateQRData(touristData, 'offline');
      
      if (!qrResult.success) {
        return qrResult;
      }

      // Create offline-specific metadata
      const offlineMetadata = {
        generatedFor: 'offline_use',
        validUntil: qrResult.qrData.expiresAt,
        instructions: 'This QR code is valid for 24 hours from generation time',
        emergencyContact: '1363' // Tourist helpline
      };

      return {
        success: true,
        qrData: qrResult.qrData,
        offlineMetadata,
        downloadReady: true
      };
    } catch (error) {
      console.error('Offline QR Generation Error:', error);
      return { success: false, error: error.message };
    }
  }
};