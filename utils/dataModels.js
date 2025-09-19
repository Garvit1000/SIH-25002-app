// Data Models for Tourist Safety App

import { VERIFICATION_STATUS, QR_CONFIG } from './constants';

/**
 * QR Code Data Model
 * Represents the structure of QR code data with security features
 */
export class QRCodeData {
  constructor({
    qrString,
    userId,
    verificationHash,
    expiresAt,
    blockchainTxId = null,
    encryptedData,
    generatedAt = new Date(),
    version = QR_CONFIG.VERSION,
    securityLevel = 'high'
  }) {
    this.qrString = qrString;
    this.userId = userId;
    this.verificationHash = verificationHash;
    this.expiresAt = new Date(expiresAt);
    this.blockchainTxId = blockchainTxId;
    this.encryptedData = encryptedData;
    this.generatedAt = new Date(generatedAt);
    this.version = version;
    this.securityLevel = securityLevel;
  }

  // Check if QR code is expired
  isExpired() {
    return new Date() > this.expiresAt;
  }

  // Check if QR code needs refresh (2 hours before expiry)
  needsRefresh() {
    const now = new Date();
    const timeUntilExpiry = this.expiresAt.getTime() - now.getTime();
    const refreshThreshold = QR_CONFIG.REFRESH_THRESHOLD_HOURS * 60 * 60 * 1000;
    return timeUntilExpiry < refreshThreshold;
  }

  // Get time remaining until expiry
  getTimeUntilExpiry() {
    const now = new Date();
    const timeRemaining = this.expiresAt.getTime() - now.getTime();
    return Math.max(0, timeRemaining);
  }

  // Convert to JSON for storage
  toJSON() {
    return {
      qrString: this.qrString,
      userId: this.userId,
      verificationHash: this.verificationHash,
      expiresAt: this.expiresAt.toISOString(),
      blockchainTxId: this.blockchainTxId,
      encryptedData: this.encryptedData,
      generatedAt: this.generatedAt.toISOString(),
      version: this.version,
      securityLevel: this.securityLevel
    };
  }

  // Create from JSON
  static fromJSON(json) {
    return new QRCodeData({
      ...json,
      expiresAt: new Date(json.expiresAt),
      generatedAt: new Date(json.generatedAt)
    });
  }
}

/**
 * Tourist User Data Model
 * Represents the complete tourist user profile
 */
export class TouristUser {
  constructor({
    id,
    email,
    name,
    nationality,
    passportNumber,
    phoneNumber,
    emergencyContacts = [],
    medicalInfo = {},
    verificationStatus = VERIFICATION_STATUS.PENDING,
    preferences = {},
    profilePhotoUrl = null,
    createdAt = new Date(),
    updatedAt = new Date()
  }) {
    this.id = id;
    this.email = email;
    this.name = name;
    this.nationality = nationality;
    this.passportNumber = passportNumber;
    this.phoneNumber = phoneNumber;
    this.emergencyContacts = emergencyContacts;
    this.medicalInfo = medicalInfo;
    this.verificationStatus = verificationStatus;
    this.preferences = preferences;
    this.profilePhotoUrl = profilePhotoUrl;
    this.createdAt = new Date(createdAt);
    this.updatedAt = new Date(updatedAt);
  }

  // Check if user is verified
  isVerified() {
    return this.verificationStatus === VERIFICATION_STATUS.VERIFIED;
  }

  // Get sanitized data for QR code (excluding sensitive info)
  getQRData() {
    return {
      userId: this.id,
      name: this.name,
      nationality: this.nationality,
      passportNumber: this.passportNumber.slice(-4), // Only last 4 digits
      verificationStatus: this.verificationStatus,
      profilePhotoUrl: this.profilePhotoUrl
    };
  }

  // Convert to JSON for storage
  toJSON() {
    return {
      id: this.id,
      email: this.email,
      name: this.name,
      nationality: this.nationality,
      passportNumber: this.passportNumber,
      phoneNumber: this.phoneNumber,
      emergencyContacts: this.emergencyContacts,
      medicalInfo: this.medicalInfo,
      verificationStatus: this.verificationStatus,
      preferences: this.preferences,
      profilePhotoUrl: this.profilePhotoUrl,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString()
    };
  }

  // Create from JSON
  static fromJSON(json) {
    return new TouristUser({
      ...json,
      createdAt: new Date(json.createdAt),
      updatedAt: new Date(json.updatedAt)
    });
  }
}

/**
 * Emergency Contact Data Model
 */
export class EmergencyContact {
  constructor({
    id,
    name,
    phoneNumber,
    relationship,
    isPrimary = false,
    photoUrl = null,
    email = null
  }) {
    this.id = id;
    this.name = name;
    this.phoneNumber = phoneNumber;
    this.relationship = relationship;
    this.isPrimary = isPrimary;
    this.photoUrl = photoUrl;
    this.email = email;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      phoneNumber: this.phoneNumber,
      relationship: this.relationship,
      isPrimary: this.isPrimary,
      photoUrl: this.photoUrl,
      email: this.email
    };
  }

  static fromJSON(json) {
    return new EmergencyContact(json);
  }
}

/**
 * Location Data Model
 */
export class LocationData {
  constructor({
    latitude,
    longitude,
    accuracy,
    timestamp = new Date(),
    address = null,
    safetyZone = 'safe',
    nearbyServices = []
  }) {
    this.latitude = latitude;
    this.longitude = longitude;
    this.accuracy = accuracy;
    this.timestamp = new Date(timestamp);
    this.address = address;
    this.safetyZone = safetyZone;
    this.nearbyServices = nearbyServices;
  }

  toJSON() {
    return {
      latitude: this.latitude,
      longitude: this.longitude,
      accuracy: this.accuracy,
      timestamp: this.timestamp.toISOString(),
      address: this.address,
      safetyZone: this.safetyZone,
      nearbyServices: this.nearbyServices
    };
  }

  static fromJSON(json) {
    return new LocationData({
      ...json,
      timestamp: new Date(json.timestamp)
    });
  }
}

/**
 * Blockchain Transaction Data Model
 */
export class BlockchainTransaction {
  constructor({
    txId,
    userId,
    qrHash,
    timestamp = new Date(),
    blockNumber = null,
    status = 'pending',
    confirmations = 0
  }) {
    this.txId = txId;
    this.userId = userId;
    this.qrHash = qrHash;
    this.timestamp = new Date(timestamp);
    this.blockNumber = blockNumber;
    this.status = status;
    this.confirmations = confirmations;
  }

  isConfirmed() {
    return this.status === 'confirmed' && this.confirmations >= 6;
  }

  toJSON() {
    return {
      txId: this.txId,
      userId: this.userId,
      qrHash: this.qrHash,
      timestamp: this.timestamp.toISOString(),
      blockNumber: this.blockNumber,
      status: this.status,
      confirmations: this.confirmations
    };
  }

  static fromJSON(json) {
    return new BlockchainTransaction({
      ...json,
      timestamp: new Date(json.timestamp)
    });
  }
}

/**
 * QR Verification Result Model
 */
export class QRVerificationResult {
  constructor({
    isValid,
    isExpired = false,
    userData = null,
    verificationHash = null,
    blockchainVerified = false,
    timestamp = new Date(),
    errorMessage = null
  }) {
    this.isValid = isValid;
    this.isExpired = isExpired;
    this.userData = userData;
    this.verificationHash = verificationHash;
    this.blockchainVerified = blockchainVerified;
    this.timestamp = new Date(timestamp);
    this.errorMessage = errorMessage;
  }

  toJSON() {
    return {
      isValid: this.isValid,
      isExpired: this.isExpired,
      userData: this.userData,
      verificationHash: this.verificationHash,
      blockchainVerified: this.blockchainVerified,
      timestamp: this.timestamp.toISOString(),
      errorMessage: this.errorMessage
    };
  }

  static fromJSON(json) {
    return new QRVerificationResult({
      ...json,
      timestamp: new Date(json.timestamp)
    });
  }
}