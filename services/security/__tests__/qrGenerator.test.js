import { qrGeneratorService } from '../qrGenerator';
import { encryptionService } from '../encryption';
import { blockchainService } from '../blockchain';
import { QRCodeData, QRVerificationResult } from '../../../utils/dataModels';
import { VERIFICATION_STATUS } from '../../../utils/constants';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
}));

// Mock the services
jest.mock('../encryption');
jest.mock('../blockchain');

describe('QR Generator Service', () => {
  const mockTouristData = {
    userId: 'test-user-123',
    name: 'John Doe',
    nationality: 'USA',
    passportNumber: 'AB1234567',
    verificationStatus: VERIFICATION_STATUS.VERIFIED,
    profilePhotoUrl: 'https://example.com/photo.jpg'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock implementations
    encryptionService.encryptForQR.mockResolvedValue({
      success: true,
      encryptedData: 'encrypted-data-hash',
      verificationHash: 'verification-hash',
      verificationSignature: 'signature',
      timestamp: Date.now(),
      nonce: 'test-nonce',
      salt: 'test-salt',
      securityLevel: 'high'
    });

    blockchainService.createVerificationTransaction.mockResolvedValue({
      success: true,
      transaction: {
        txId: 'blockchain-tx-123',
        userId: 'test-user-123',
        status: 'confirmed'
      }
    });
  });

  describe('generateQRData', () => {
    it('should generate QR code data successfully for verified user', async () => {
      const result = await qrGeneratorService.generateQRData(mockTouristData);

      expect(result.success).toBe(true);
      expect(result.qrData).toBeInstanceOf(QRCodeData);
      expect(result.qrData.userId).toBe(mockTouristData.userId);
      expect(result.qrData.qrString).toBeDefined();
      expect(result.blockchainVerified).toBe(true);
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

    it('should fail for invalid user data', async () => {
      const result = await qrGeneratorService.generateQRData(null);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid tourist data provided');
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

    it('should generate QR code even if blockchain fails', async () => {
      blockchainService.createVerificationTransaction.mockResolvedValue({
        success: false,
        error: 'Blockchain unavailable'
      });

      const result = await qrGeneratorService.generateQRData(mockTouristData);

      expect(result.success).toBe(true);
      expect(result.blockchainVerified).toBe(false);
      expect(result.qrData.blockchainTxId).toBeNull();
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
      version: '1.0',
      securityLevel: 'high',
      blockchainTxId: 'tx-123'
    });

    beforeEach(() => {
      encryptionService.decryptQRData.mockResolvedValue({
        success: true,
        verified: true,
        timestamp: new Date(),
        userId: 'test-user-123',
        nonce: 'nonce'
      });

      blockchainService.verifyTransaction.mockResolvedValue({
        success: true,
        verified: true
      });
    });

    it('should verify valid QR code successfully', async () => {
      const result = await qrGeneratorService.verifyQRData(mockQRString);

      expect(result.success).toBe(true);
      expect(result.verified).toBe(true);
      expect(result.result).toBeInstanceOf(QRVerificationResult);
      expect(result.result.isValid).toBe(true);
      expect(result.blockchainVerified).toBe(true);
    });

    it('should fail for empty QR string', async () => {
      const result = await qrGeneratorService.verifyQRData('');

      expect(result.success).toBe(false);
      expect(result.error).toBe('No QR code data provided');
    });

    it('should fail for unsupported version', async () => {
      const invalidVersionQR = JSON.stringify({
        ...JSON.parse(mockQRString),
        version: '2.0'
      });

      const result = await qrGeneratorService.verifyQRData(invalidVersionQR);

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

    it('should fail for invalid QR format', async () => {
      const result = await qrGeneratorService.verifyQRData('invalid-json');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid QR code format or corrupted data');
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
  });

  describe('refreshQRCode', () => {
    beforeEach(() => {
      qrGeneratorService.getUserDataForQR = jest.fn().mockResolvedValue(mockTouristData);
      qrGeneratorService.generateQRData = jest.fn().mockResolvedValue({
        success: true,
        qrData: new QRCodeData({
          qrString: 'new-qr-string',
          userId: 'test-user-123',
          verificationHash: 'new-hash',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          encryptedData: 'new-encrypted-data',
          generatedAt: new Date()
        })
      });
      qrGeneratorService.invalidateQRData = jest.fn().mockResolvedValue({ success: true });
    });

    it('should refresh QR code successfully', async () => {
      const currentQRData = { userId: 'test-user-123' };
      const result = await qrGeneratorService.refreshQRCode('test-user-123', currentQRData);

      expect(result.success).toBe(true);
      expect(result.refreshed).toBe(true);
      expect(result.qrData).toBeDefined();
      expect(qrGeneratorService.invalidateQRData).toHaveBeenCalledWith('test-user-123');
    });

    it('should fail if user data not found', async () => {
      qrGeneratorService.getUserDataForQR.mockResolvedValue(null);

      const result = await qrGeneratorService.refreshQRCode('test-user-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('User data not found');
    });

    it('should fail if new QR generation fails', async () => {
      qrGeneratorService.generateQRData.mockResolvedValue({
        success: false,
        error: 'Generation failed'
      });

      const result = await qrGeneratorService.refreshQRCode('test-user-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to generate new QR code');
    });
  });

  describe('needsRefresh', () => {
    it('should return true for null QR data', () => {
      const result = qrGeneratorService.needsRefresh(null);
      expect(result).toBe(true);
    });

    it('should return true for invalid QR data object', () => {
      const result = qrGeneratorService.needsRefresh({});
      expect(result).toBe(true);
    });

    it('should return result from QRCodeData.needsRefresh method', () => {
      const mockQRData = new QRCodeData({
        qrString: 'test',
        userId: 'test',
        verificationHash: 'hash',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
        encryptedData: 'data',
        generatedAt: new Date()
      });

      // Mock the needsRefresh method
      mockQRData.needsRefresh = jest.fn().mockReturnValue(false);

      const result = qrGeneratorService.needsRefresh(mockQRData);
      expect(result).toBe(false);
      expect(mockQRData.needsRefresh).toHaveBeenCalled();
    });
  });

  describe('generateOfflineQR', () => {
    beforeEach(() => {
      qrGeneratorService.generateQRData = jest.fn().mockResolvedValue({
        success: true,
        qrData: {
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        }
      });
    });

    it('should generate offline QR successfully', async () => {
      const result = await qrGeneratorService.generateOfflineQR(mockTouristData);

      expect(result.success).toBe(true);
      expect(result.downloadReady).toBe(true);
      expect(result.offlineMetadata).toBeDefined();
      expect(result.offlineMetadata.generatedFor).toBe('offline_use');
      expect(result.offlineMetadata.emergencyContact).toBe('1363');
    });

    it('should fail if QR generation fails', async () => {
      qrGeneratorService.generateQRData.mockResolvedValue({
        success: false,
        error: 'Generation failed'
      });

      const result = await qrGeneratorService.generateOfflineQR(mockTouristData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Generation failed');
    });
  });
});