import { encryptionService } from '../../../services/security/encryption';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { QR_CONFIG } from '../../../utils/constants';

// Mock Expo modules
jest.mock('expo-crypto');
jest.mock('expo-secure-store');
jest.mock('../../../utils/constants', () => ({
  QR_CONFIG: {
    VERSION: '1.0',
    EXPIRY_HOURS: 24
  }
}));

describe('Encryption Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateHash', () => {
    it('should generate hash successfully', async () => {
      const mockHash = 'generated-hash-value';
      Crypto.digestStringAsync.mockResolvedValue(mockHash);

      const result = await encryptionService.generateHash('test-data');

      expect(result.success).toBe(true);
      expect(result.hash).toBe(mockHash);
      expect(Crypto.digestStringAsync).toHaveBeenCalledWith(
        Crypto.CryptoDigestAlgorithm.SHA256,
        'test-data',
        { encoding: Crypto.CryptoEncoding.HEX }
      );
    });

    it('should handle hash generation errors', async () => {
      const error = new Error('Hash generation failed');
      Crypto.digestStringAsync.mockRejectedValue(error);

      const result = await encryptionService.generateHash('test-data');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Hash generation failed');
    });

    it('should use custom algorithm when provided', async () => {
      const mockHash = 'sha512-hash';
      Crypto.digestStringAsync.mockResolvedValue(mockHash);

      await encryptionService.generateHash('test-data', Crypto.CryptoDigestAlgorithm.SHA512);

      expect(Crypto.digestStringAsync).toHaveBeenCalledWith(
        Crypto.CryptoDigestAlgorithm.SHA512,
        'test-data',
        { encoding: Crypto.CryptoEncoding.HEX }
      );
    });
  });

  describe('generateUUID', () => {
    it('should generate UUID', () => {
      const mockUUID = 'test-uuid-123';
      Crypto.randomUUID.mockReturnValue(mockUUID);

      const result = encryptionService.generateUUID();

      expect(result).toBe(mockUUID);
      expect(Crypto.randomUUID).toHaveBeenCalled();
    });
  });

  describe('generateRandomBytes', () => {
    it('should generate random bytes successfully', async () => {
      const mockBytes = new Uint8Array([1, 2, 3, 4]);
      Crypto.getRandomBytesAsync.mockResolvedValue(mockBytes);

      const result = await encryptionService.generateRandomBytes(32);

      expect(result.success).toBe(true);
      expect(result.bytes).toBe(mockBytes);
      expect(Crypto.getRandomBytesAsync).toHaveBeenCalledWith(32);
    });

    it('should use default length when not provided', async () => {
      const mockBytes = new Uint8Array([1, 2, 3, 4]);
      Crypto.getRandomBytesAsync.mockResolvedValue(mockBytes);

      await encryptionService.generateRandomBytes();

      expect(Crypto.getRandomBytesAsync).toHaveBeenCalledWith(32);
    });

    it('should handle random bytes generation errors', async () => {
      const error = new Error('Random bytes generation failed');
      Crypto.getRandomBytesAsync.mockRejectedValue(error);

      const result = await encryptionService.generateRandomBytes();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Random bytes generation failed');
    });
  });

  describe('generateSalt', () => {
    it('should generate salt successfully', async () => {
      const mockBytes = new Uint8Array([255, 128, 64, 32]);
      Crypto.getRandomBytesAsync.mockResolvedValue(mockBytes);

      const result = await encryptionService.generateSalt(4);

      expect(result.success).toBe(true);
      expect(result.salt).toBe('ff804020');
      expect(Crypto.getRandomBytesAsync).toHaveBeenCalledWith(4);
    });

    it('should use default length when not provided', async () => {
      const mockBytes = new Uint8Array(16);
      Crypto.getRandomBytesAsync.mockResolvedValue(mockBytes);

      await encryptionService.generateSalt();

      expect(Crypto.getRandomBytesAsync).toHaveBeenCalledWith(16);
    });

    it('should handle salt generation errors', async () => {
      const error = new Error('Salt generation failed');
      Crypto.getRandomBytesAsync.mockRejectedValue(error);

      const result = await encryptionService.generateSalt();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Salt generation failed');
    });
  });

  describe('storeSecureData', () => {
    it('should store data securely', async () => {
      SecureStore.setItemAsync.mockResolvedValue();

      const result = await encryptionService.storeSecureData('test-key', 'test-value');

      expect(result.success).toBe(true);
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('test-key', 'test-value');
    });

    it('should handle storage errors', async () => {
      const error = new Error('Storage failed');
      SecureStore.setItemAsync.mockRejectedValue(error);

      const result = await encryptionService.storeSecureData('test-key', 'test-value');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Storage failed');
    });
  });

  describe('getSecureData', () => {
    it('should retrieve data securely', async () => {
      const mockValue = 'retrieved-value';
      SecureStore.getItemAsync.mockResolvedValue(mockValue);

      const result = await encryptionService.getSecureData('test-key');

      expect(result.success).toBe(true);
      expect(result.value).toBe(mockValue);
      expect(SecureStore.getItemAsync).toHaveBeenCalledWith('test-key');
    });

    it('should handle retrieval errors', async () => {
      const error = new Error('Retrieval failed');
      SecureStore.getItemAsync.mockRejectedValue(error);

      const result = await encryptionService.getSecureData('test-key');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Retrieval failed');
    });
  });

  describe('deleteSecureData', () => {
    it('should delete data securely', async () => {
      SecureStore.deleteItemAsync.mockResolvedValue();

      const result = await encryptionService.deleteSecureData('test-key');

      expect(result.success).toBe(true);
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('test-key');
    });

    it('should handle deletion errors', async () => {
      const error = new Error('Deletion failed');
      SecureStore.deleteItemAsync.mockRejectedValue(error);

      const result = await encryptionService.deleteSecureData('test-key');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Deletion failed');
    });
  });

  describe('encryptForQR', () => {
    const mockData = { userId: 'test-user', name: 'Test User' };
    const mockSalt = 'test-salt-123';
    const mockUUID = 'test-nonce-uuid';
    const mockPrimaryHash = 'primary-hash-base64';
    const mockSecondaryHash = 'secondary-hash-hex';
    const mockSignature = 'verification-signature';

    beforeEach(() => {
      Crypto.randomUUID.mockReturnValue(mockUUID);
      Crypto.getRandomBytesAsync.mockResolvedValue(new Uint8Array([1, 2, 3]));
      Crypto.digestStringAsync
        .mockResolvedValueOnce(mockPrimaryHash) // First call for primary hash
        .mockResolvedValueOnce(mockSecondaryHash) // Second call for secondary hash
        .mockResolvedValueOnce(mockSignature); // Third call for signature
    });

    it('should encrypt QR data successfully', async () => {
      const result = await encryptionService.encryptForQR(mockData, 'test-user', 'high');

      expect(result.success).toBe(true);
      expect(result.encryptedData).toBe(mockPrimaryHash);
      expect(result.verificationHash).toBe(mockSecondaryHash);
      expect(result.verificationSignature).toBe(mockSignature);
      expect(result.nonce).toBe(mockUUID);
      expect(result.securityLevel).toBe('high');
      expect(result.timestamp).toBeGreaterThan(0);
    });

    it('should handle salt generation failure', async () => {
      Crypto.getRandomBytesAsync.mockRejectedValue(new Error('Salt generation failed'));

      const result = await encryptionService.encryptForQR(mockData, 'test-user');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to generate salt');
    });

    it('should use default security level', async () => {
      const result = await encryptionService.encryptForQR(mockData, 'test-user');

      expect(result.success).toBe(true);
      expect(result.securityLevel).toBe('high');
    });

    it('should handle encryption errors', async () => {
      Crypto.digestStringAsync.mockRejectedValue(new Error('Encryption failed'));

      const result = await encryptionService.encryptForQR(mockData, 'test-user');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Encryption failed');
    });
  });

  describe('decryptQRData', () => {
    const mockEncryptedData = 'encrypted-data';
    const mockVerificationHash = 'verification-hash';
    const mockTimestamp = Date.now();
    const mockNonce = 'test-nonce';
    const mockSalt = 'test-salt';
    const mockUserId = 'test-user';

    beforeEach(() => {
      Crypto.digestStringAsync.mockResolvedValue(mockVerificationHash);
    });

    it('should decrypt and verify QR data successfully', async () => {
      const result = await encryptionService.decryptQRData(
        mockEncryptedData,
        mockVerificationHash,
        mockTimestamp,
        mockNonce,
        mockSalt,
        mockUserId
      );

      expect(result.success).toBe(true);
      expect(result.verified).toBe(true);
      expect(result.userId).toBe(mockUserId);
      expect(result.nonce).toBe(mockNonce);
    });

    it('should fail for invalid verification hash', async () => {
      Crypto.digestStringAsync.mockResolvedValue('different-hash');

      const result = await encryptionService.decryptQRData(
        mockEncryptedData,
        mockVerificationHash,
        mockTimestamp,
        mockNonce,
        mockSalt,
        mockUserId
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Data integrity check failed');
    });

    it('should fail for expired QR code', async () => {
      const expiredTimestamp = Date.now() - (25 * 60 * 60 * 1000); // 25 hours ago

      const result = await encryptionService.decryptQRData(
        mockEncryptedData,
        mockVerificationHash,
        expiredTimestamp,
        mockNonce,
        mockSalt,
        mockUserId
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('QR code has expired');
    });

    it('should handle decryption errors', async () => {
      Crypto.digestStringAsync.mockRejectedValue(new Error('Decryption failed'));

      const result = await encryptionService.decryptQRData(
        mockEncryptedData,
        mockVerificationHash,
        mockTimestamp,
        mockNonce,
        mockSalt,
        mockUserId
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Decryption failed');
    });
  });

  describe('generateVerificationToken', () => {
    const mockUserId = 'test-user';
    const mockQRHash = 'qr-hash';
    const mockToken = 'generated-token';

    beforeEach(() => {
      Crypto.getRandomBytesAsync.mockResolvedValue(new Uint8Array([1, 2, 3]));
      Crypto.digestStringAsync.mockResolvedValue(mockToken);
    });

    it('should generate verification token successfully', async () => {
      const result = await encryptionService.generateVerificationToken(mockUserId, mockQRHash);

      expect(result.success).toBe(true);
      expect(result.token).toBe(mockToken);
      expect(result.timestamp).toBeGreaterThan(0);
      expect(result.expiresAt).toBeInstanceOf(Date);
    });

    it('should handle random bytes generation failure', async () => {
      Crypto.getRandomBytesAsync.mockRejectedValue(new Error('Random bytes failed'));

      const result = await encryptionService.generateVerificationToken(mockUserId, mockQRHash);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to generate random bytes');
    });

    it('should handle token generation errors', async () => {
      Crypto.digestStringAsync.mockRejectedValue(new Error('Token generation failed'));

      const result = await encryptionService.generateVerificationToken(mockUserId, mockQRHash);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Token generation failed');
    });
  });

  describe('validateVerificationToken', () => {
    const mockToken = 'test-token';
    const mockUserId = 'test-user';
    const mockQRHash = 'qr-hash';

    it('should validate non-expired token successfully', async () => {
      const recentTimestamp = Date.now() - (1 * 60 * 60 * 1000); // 1 hour ago

      const result = await encryptionService.validateVerificationToken(
        mockToken,
        mockUserId,
        mockQRHash,
        recentTimestamp
      );

      expect(result.success).toBe(true);
      expect(result.valid).toBe(true);
      expect(result.remainingTime).toBeGreaterThan(0);
    });

    it('should fail for expired token', async () => {
      const expiredTimestamp = Date.now() - (25 * 60 * 60 * 1000); // 25 hours ago

      const result = await encryptionService.validateVerificationToken(
        mockToken,
        mockUserId,
        mockQRHash,
        expiredTimestamp
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Verification token has expired');
    });

    it('should handle validation errors', async () => {
      // Force an error by passing invalid timestamp
      const result = await encryptionService.validateVerificationToken(
        mockToken,
        mockUserId,
        mockQRHash,
        'invalid-timestamp'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});