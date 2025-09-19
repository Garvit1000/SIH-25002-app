import { qrGeneratorService } from '../../../services/security/qrGenerator';
import { encryptionService } from '../../../services/security/encryption';
import { blockchainService } from '../../../services/security/blockchain';
import { QRCodeData, QRVerificationResult } from '../../../utils/dataModels';
import { VERIFICATION_STATUS, QR_CONFIG } from '../../../utils/constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock dependencies
jest.mock('../../../services/security/encryption');
jest.mock('../../../services/security/blockchain');
jest.mock('../../../utils/dataModels');
jest.mock('../../../utils/constants', () => ({
  VERIFICATION_STATUS: {
    VERIFIED: 'verified',
    PENDING: 'pending',
    REJECTED: 'rejected'
  },
  QR_CONFIG: {
    VERSION: '1.0',
    EXPIRY_HOURS: 24
  }
}));

describe('QR Generator Service', () => {
  const mockTouristData = {
    userId: 'test-user-123',
    name: 'John Doe',
    nationality: 'US',
    passportNumber: 'US1234567890',
    verificationStatus: VERIFICATION_STATUS.VERIFIED,
    profilePhotoUrl: 'https://example.com/photo.jpg'
  };

  const mockEncryptionResult = {
    success: true,
    encryptedData: 'encrypted-data-string',
    verificationHash: 'verification-hash',
    verificationSignature: 'signature',
    timestamp: Date.now(),
    nonce: 'test-nonce',
    salt: 'test-salt',
    securityLevel: 'high'
  };

  const mockBlockchainResult = {
    success: true,
    transaction: {
      txId: 'blockchain-tx-123'
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.clear();
    
    // Setup default mocks
    encryptionService.encryptForQR.mockResolvedValue(mockEncryptionResult);
    blockchainService.createVerificationTransaction.mockResolvedValue(mockBlockchainResult);
    QRCodeData.mockImplementation((data) => ({
      ...data,
      toJSON: () => data,
      needsRefresh: () => false,
      isExpired: () => false
    }));
    QRCodeData.fromJSON = jest.fn((data) => ({
      ...data,
      isExpired: () => false
    }));
  });

  describe('generateQRData', () => {
    it('should generate QR data successfully for verified user', async () => {
      const result = await qrGeneratorService.generateQRData(mockTouristData);

      expect(result.success).toBe(true);
      expect(result.qrData).toBeDefined();
      expect(result.blockchainVerified).toBe(true);
      expect(encryptionService.encryptForQR).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockTouristData.userId,
          name: mockTouristData.name,
          nationality: mockTouristData.nationality,
          passportNumber: '7890' // Only last 4 digits
        }),
        mockTouristData.userId,
        'high'
      );
    });

    it('should fail for invalid tourist data', async () => {
      const result = await qrGeneratorService.generateQRData(null);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid tourist data provided');
    });

    it('should fail for unverified user', async () => {
      const unverifiedUser = {
        ...mockTouristData,
        verificationStatus: VERIFICATION_STATUS.PENDING
      };

      const result = await qrGeneratorService.generateQRData(unverifiedUser);

      expect(result.success).toBe(false);
      expect(result.error).toBe('User must be verified to generate QR code');
    });

    it('should handle encryption failure', async () => {
      encryptionService.encryptForQR.mockResolvedValue({
        success: false,
        error: 'Encryption failed'
      });

      const result = await qrGeneratorService.generateQRData(mockTouristData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to encrypt QR data');
    });

    it('should generate QR data even if blockchain fails', async () => {
      blockchainService.createVerificationTransaction.mockResolvedValue({
        success: false,
        error: 'Blockchain unavailable'
      });

      const result = await qrGeneratorService.generateQRData(mockTouristData);

      expect(result.success).toBe(true);
      expect(result.blockchainVerified).toBe(false);
    });

    it('should cache generated QR data', async () => {
      const result = await qrGeneratorService.generateQRData(mockTouristData);

      expect(result.success).toBe(true);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        `qr_cache_${mockTouristData.userId}`,
        expect.any(String)
      );
    });
  });

  describe('verifyQRData', () => {
    const mockQRString = JSON.stringify({
      data: 'encrypted-data',
      hash: 'verification-hash',
      signature: 'signature',
      timestamp: Date.now(),
      nonce: 'nonce',
      salt: 'salt',
      version: QR_CONFIG.VERSION,
      securityLevel: 'high',
      blockchainTxId: 'tx-123'
    });

    beforeEach(() => {
      encryptionService.decryptQRData.mockResolvedValue({
        success: true,
        decryptedData: mockTouristData
      });
      blockchainService.verifyTransaction.mockResolvedValue({
        success: true,
        verified: true
      });
      QRVerificationResult.mockImplementation((data) => data);
    });

    it('should verify valid QR data successfully', async () => {
      const result = await qrGeneratorService.verifyQRData(mockQRString);

      expect(result.success).toBe(true);
      expect(result.verified).toBe(true);
      expect(result.blockchainVerified).toBe(true);
      expect(encryptionService.decryptQRData).toHaveBeenCalled();
    });

    it('should fail for empty QR string', async () => {
      const result = await qrGeneratorService.verifyQRData('');

      expect(result.success).toBe(false);
      expect(result.error).toBe('No QR code data provided');
    });

    it('should fail for unsupported version', async () => {
      const oldVersionQR = JSON.stringify({
        ...JSON.parse(mockQRString),
        version: '0.9'
      });

      const result = await qrGeneratorService.verifyQRData(oldVersionQR);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported QR code version');
    });

    it('should fail for expired QR code', async () => {
      const expiredQR = JSON.stringify({
        ...JSON.parse(mockQRString),
        timestamp: Date.now() - (25 * 60 * 60 * 1000) // 25 hours ago
      });

      const result = await qrGeneratorService.verifyQRData(expiredQR);

      expect(result.success).toBe(false);
      expect(result.error).toBe('QR code has expired');
      expect(result.result.isExpired).toBe(true);
    });

    it('should handle decryption failure', async () => {
      encryptionService.decryptQRData.mockResolvedValue({
        success: false,
        error: 'Decryption failed'
      });

      const result = await qrGeneratorService.verifyQRData(mockQRString);

      expect(result.success).toBe(false);
      expect(result.error).toContain('QR code verification failed');
    });

    it('should handle invalid JSON format', async () => {
      const result = await qrGeneratorService.verifyQRData('invalid-json');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid QR code format or corrupted data');
    });
  });

  describe('refreshQRCode', () => {
    beforeEach(() => {
      jest.spyOn(qrGeneratorService, 'getUserDataForQR').mockResolvedValue(mockTouristData);
      jest.spyOn(qrGeneratorService, 'generateQRData').mockResolvedValue({
        success: true,
        qrData: { userId: mockTouristData.userId }
      });
      jest.spyOn(qrGeneratorService, 'invalidateQRData').mockResolvedValue({ success: true });
    });

    it('should refresh QR code successfully', async () => {
      const currentQRData = { userId: mockTouristData.userId };
      const result = await qrGeneratorService.refreshQRCode(mockTouristData.userId, currentQRData);

      expect(result.success).toBe(true);
      expect(result.refreshed).toBe(true);
      expect(qrGeneratorService.invalidateQRData).toHaveBeenCalledWith(currentQRData.userId);
    });

    it('should fail if user data not found', async () => {
      jest.spyOn(qrGeneratorService, 'getUserDataForQR').mockResolvedValue(null);

      const result = await qrGeneratorService.refreshQRCode(mockTouristData.userId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('User data not found');
    });
  });

  describe('needsRefresh', () => {
    it('should return true for null QR data', () => {
      const result = qrGeneratorService.needsRefresh(null);
      expect(result).toBe(true);
    });

    it('should return true for invalid QR data', () => {
      const result = qrGeneratorService.needsRefresh({});
      expect(result).toBe(true);
    });

    it('should delegate to QRCodeData needsRefresh method', () => {
      const mockQRData = {
        needsRefresh: jest.fn().mockReturnValue(false)
      };
      // Mock instanceof check
      QRCodeData.mockImplementation(() => mockQRData);
      Object.setPrototypeOf(mockQRData, QRCodeData.prototype);

      const result = qrGeneratorService.needsRefresh(mockQRData);

      expect(mockQRData.needsRefresh).toHaveBeenCalled();
      expect(result).toBe(false);
    });
  });

  describe('cacheQRData', () => {
    it('should cache QR data successfully', async () => {
      const mockQRData = {
        userId: 'test-user',
        toJSON: () => ({ userId: 'test-user' })
      };

      const result = await qrGeneratorService.cacheQRData(mockQRData);

      expect(result.success).toBe(true);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'qr_cache_test-user',
        JSON.stringify({ userId: 'test-user' })
      );
    });

    it('should handle cache errors', async () => {
      AsyncStorage.setItem.mockRejectedValue(new Error('Storage error'));
      const mockQRData = {
        userId: 'test-user',
        toJSON: () => ({ userId: 'test-user' })
      };

      const result = await qrGeneratorService.cacheQRData(mockQRData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Storage error');
    });
  });

  describe('getCachedQRData', () => {
    it('should retrieve cached QR data successfully', async () => {
      const cachedData = { userId: 'test-user' };
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(cachedData));
      QRCodeData.fromJSON.mockReturnValue({
        ...cachedData,
        isExpired: () => false
      });

      const result = await qrGeneratorService.getCachedQRData('test-user');

      expect(result.success).toBe(true);
      expect(result.qrData).toBeDefined();
    });

    it('should fail when no cached data exists', async () => {
      AsyncStorage.getItem.mockResolvedValue(null);

      const result = await qrGeneratorService.getCachedQRData('test-user');

      expect(result.success).toBe(false);
      expect(result.error).toBe('No cached QR data found');
    });

    it('should remove expired cached data', async () => {
      const cachedData = { userId: 'test-user' };
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(cachedData));
      QRCodeData.fromJSON.mockReturnValue({
        ...cachedData,
        isExpired: () => true
      });

      const result = await qrGeneratorService.getCachedQRData('test-user');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cached QR data has expired');
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('qr_cache_test-user');
    });
  });

  describe('generateOfflineQR', () => {
    beforeEach(() => {
      jest.spyOn(qrGeneratorService, 'generateQRData').mockResolvedValue({
        success: true,
        qrData: {
          userId: mockTouristData.userId,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        }
      });
    });

    it('should generate offline QR successfully', async () => {
      const result = await qrGeneratorService.generateOfflineQR(mockTouristData);

      expect(result.success).toBe(true);
      expect(result.downloadReady).toBe(true);
      expect(result.offlineMetadata).toBeDefined();
      expect(result.offlineMetadata.emergencyContact).toBe('1363');
      expect(qrGeneratorService.generateQRData).toHaveBeenCalledWith(mockTouristData, 'offline');
    });

    it('should handle generation failure', async () => {
      jest.spyOn(qrGeneratorService, 'generateQRData').mockResolvedValue({
        success: false,
        error: 'Generation failed'
      });

      const result = await qrGeneratorService.generateOfflineQR(mockTouristData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Generation failed');
    });
  });
});