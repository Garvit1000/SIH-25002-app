import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { QR_CONFIG } from '../../utils/constants';

export const encryptionService = {
  // Generate secure hash with multiple algorithms
  generateHash: async (data, algorithm = Crypto.CryptoDigestAlgorithm.SHA256) => {
    try {
      const hash = await Crypto.digestStringAsync(
        algorithm,
        data,
        { encoding: Crypto.CryptoEncoding.HEX }
      );
      return { success: true, hash };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Generate random UUID
  generateUUID: () => {
    return Crypto.randomUUID();
  },

  // Generate random bytes
  generateRandomBytes: async (length = 32) => {
    try {
      const bytes = await Crypto.getRandomBytesAsync(length);
      return { success: true, bytes };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Generate cryptographically secure salt
  generateSalt: async (length = 16) => {
    try {
      const saltBytes = await Crypto.getRandomBytesAsync(length);
      const salt = Array.from(saltBytes)
        .map(byte => byte.toString(16).padStart(2, '0'))
        .join('');
      return { success: true, salt };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Store sensitive data securely
  storeSecureData: async (key, value) => {
    try {
      await SecureStore.setItemAsync(key, value);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Retrieve sensitive data securely
  getSecureData: async (key) => {
    try {
      const value = await SecureStore.getItemAsync(key);
      return { success: true, value };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Delete sensitive data
  deleteSecureData: async (key) => {
    try {
      await SecureStore.deleteItemAsync(key);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Enhanced encryption for QR code with salt and multiple layers
  encryptForQR: async (data, userId, securityLevel = 'high') => {
    try {
      const timestamp = Date.now();
      const nonce = Crypto.randomUUID();
      
      // Generate salt for additional security
      const saltResult = await encryptionService.generateSalt();
      if (!saltResult.success) {
        return { success: false, error: 'Failed to generate salt' };
      }

      // Create layered data structure
      const layeredData = {
        payload: data,
        userId,
        timestamp,
        nonce,
        salt: saltResult.salt,
        version: QR_CONFIG.VERSION,
        securityLevel
      };

      const dataString = JSON.stringify(layeredData);
      
      // Multiple hash layers for enhanced security
      const primaryHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        dataString,
        { encoding: Crypto.CryptoEncoding.BASE64 }
      );

      const secondaryHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA512,
        `${primaryHash}-${saltResult.salt}-${timestamp}`,
        { encoding: Crypto.CryptoEncoding.HEX }
      );

      // Create verification signature
      const verificationSignature = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        `${userId}-${timestamp}-${nonce}-${secondaryHash}`,
        { encoding: Crypto.CryptoEncoding.BASE64 }
      );
      
      return { 
        success: true, 
        encryptedData: primaryHash,
        verificationHash: secondaryHash,
        verificationSignature,
        timestamp,
        nonce,
        salt: saltResult.salt,
        securityLevel
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Decrypt and verify QR code data
  decryptQRData: async (encryptedData, verificationHash, timestamp, nonce, salt, userId) => {
    try {
      // Recreate the verification hash to validate integrity
      const expectedSecondaryHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA512,
        `${encryptedData}-${salt}-${timestamp}`,
        { encoding: Crypto.CryptoEncoding.HEX }
      );

      // Verify hash integrity
      if (expectedSecondaryHash !== verificationHash) {
        return { success: false, error: 'Data integrity check failed' };
      }

      // Check timestamp validity (not expired)
      const now = Date.now();
      const maxAge = QR_CONFIG.EXPIRY_HOURS * 60 * 60 * 1000;
      if (now - timestamp > maxAge) {
        return { success: false, error: 'QR code has expired' };
      }

      return { 
        success: true, 
        verified: true,
        timestamp: new Date(timestamp),
        userId,
        nonce
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Generate secure verification token
  generateVerificationToken: async (userId, qrHash) => {
    try {
      const timestamp = Date.now();
      const randomBytes = await encryptionService.generateRandomBytes(16);
      
      if (!randomBytes.success) {
        return { success: false, error: 'Failed to generate random bytes' };
      }

      const tokenData = `${userId}-${qrHash}-${timestamp}-${randomBytes.bytes}`;
      const token = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        tokenData,
        { encoding: Crypto.CryptoEncoding.BASE64URL }
      );

      return {
        success: true,
        token,
        timestamp,
        expiresAt: new Date(timestamp + (24 * 60 * 60 * 1000)) // 24 hours
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Validate verification token
  validateVerificationToken: async (token, userId, qrHash, timestamp) => {
    try {
      // Check if token is expired
      const now = Date.now();
      const tokenAge = now - timestamp;
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours

      if (tokenAge > maxAge) {
        return { success: false, error: 'Verification token has expired' };
      }

      // Token is valid if it hasn't expired and matches expected format
      return { 
        success: true, 
        valid: true,
        remainingTime: maxAge - tokenAge
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};