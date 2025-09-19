import { privacyService } from '../../services/privacy/privacyService';
import { handleSafePermissionChange, checkPermissionSafety, getPermissionInfo } from '../../utils/privacyHelpers';

// Mock Firebase
jest.mock('../../firebaseConfig', () => ({
  db: {},
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(() => Promise.resolve({ exists: () => false })),
  setDoc: jest.fn(() => Promise.resolve()),
  updateDoc: jest.fn(() => Promise.resolve()),
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(() => Promise.resolve({ empty: true, forEach: jest.fn() })),
  serverTimestamp: jest.fn(() => new Date()),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
}));

describe('Privacy Service', () => {
  const mockUserId = 'test-user-123';
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Privacy Settings', () => {
    test('should return default permissions for new user', async () => {
      const permissions = await privacyService.getPrivacySettings(mockUserId);
      
      expect(permissions).toEqual({
        locationTracking: true,
        emergencyContacts: true,
        profileData: true,
        analyticsData: false,
        crashReports: true,
        marketingCommunications: false,
      });
    });

    test('should validate safety permissions correctly', () => {
      const permissions = {
        locationTracking: false,
        emergencyContacts: false,
        profileData: true,
        analyticsData: true,
        crashReports: true,
        marketingCommunications: false,
      };

      const validation = privacyService.validateSafetyPermissions(permissions);
      
      expect(validation.isValid).toBe(false);
      expect(validation.warnings).toHaveLength(2);
      expect(validation.warnings[0].permission).toBe('locationTracking');
      expect(validation.warnings[1].permission).toBe('emergencyContacts');
    });
  });

  describe('Data Usage Statistics', () => {
    test('should return zero stats for new user', async () => {
      const stats = await privacyService.getDataUsageStats(mockUserId);
      
      expect(stats).toEqual({
        locationDataPoints: 0,
        emergencyAlerts: 0,
        qrGenerations: 0,
        lastSyncDate: null,
      });
    });
  });

  describe('Permission Safety Checks', () => {
    test('should identify critical permissions correctly', () => {
      const userProfile = {
        emergencyContacts: [{ name: 'Test Contact', phone: '123456789' }],
        verificationStatus: 'verified',
        permissions: { locationTracking: true }
      };

      const locationCheck = checkPermissionSafety('locationTracking', userProfile);
      expect(locationCheck.canDisable).toBe(true);
      expect(locationCheck.riskLevel).toBe('medium');

      const emergencyCheck = checkPermissionSafety('emergencyContacts', userProfile);
      expect(emergencyCheck.canDisable).toBe(true);
      expect(emergencyCheck.riskLevel).toBe('high');
    });

    test('should prevent disabling both critical permissions', () => {
      const userProfile = {
        emergencyContacts: [],
        verificationStatus: 'verified',
        permissions: { locationTracking: false }
      };

      const emergencyCheck = checkPermissionSafety('emergencyContacts', userProfile);
      expect(emergencyCheck.riskLevel).toBe('critical');
    });
  });

  describe('Permission Information', () => {
    test('should provide detailed permission information', () => {
      const locationInfo = getPermissionInfo('locationTracking');
      
      expect(locationInfo.title).toBe('Location Tracking');
      expect(locationInfo.description).toContain('safety monitoring');
      expect(locationInfo.impact).toContain('geo-fencing');
      expect(locationInfo.dataCollected).toContain('GPS coordinates');
      expect(locationInfo.retention).toContain('90 days');
    });

    test('should handle unknown permissions gracefully', () => {
      const unknownInfo = getPermissionInfo('unknownPermission');
      
      expect(unknownInfo.title).toBe('Unknown Permission');
      expect(unknownInfo.description).toBe('No description available');
    });
  });
});

describe('Privacy Helpers', () => {
  describe('Safe Permission Change', () => {
    test('should handle non-critical permission changes directly', async () => {
      const mockUpdateSpy = jest.spyOn(privacyService, 'updatePrivacySettings').mockResolvedValue({});
      const mockValidateSpy = jest.spyOn(privacyService, 'validateSafetyPermissions').mockReturnValue({
        isValid: true,
        warnings: []
      });

      const currentPermissions = { analyticsData: false };
      const result = await handleSafePermissionChange('user123', 'analyticsData', true, currentPermissions);

      expect(result).toBe(true);
      expect(mockUpdateSpy).toHaveBeenCalledWith('user123', { analyticsData: true });
      
      mockUpdateSpy.mockRestore();
      mockValidateSpy.mockRestore();
    });
  });
});

describe('Data Deletion and Grievances', () => {
  const testUserId = 'test-user-456';
  
  test('should generate unique IDs for deletion requests', async () => {
    const mockSetDoc = require('firebase/firestore').setDoc;
    mockSetDoc.mockResolvedValue();

    const deletionRequest = {
      userId: testUserId,
      email: 'test@example.com',
      dataTypes: { allData: true },
      reason: 'Test deletion',
    };

    const requestId = await privacyService.submitDataDeletionRequest(deletionRequest);
    
    expect(requestId).toMatch(/^del_\d+_[a-z0-9]+$/);
    expect(mockSetDoc).toHaveBeenCalled();
  });

  test('should generate unique IDs for grievances', async () => {
    const mockSetDoc = require('firebase/firestore').setDoc;
    mockSetDoc.mockResolvedValue();

    const grievanceData = {
      userId: testUserId,
      email: 'test@example.com',
      category: 'privacy_violation',
      subject: 'Test grievance',
      description: 'This is a test grievance description that is long enough to meet requirements.',
      priority: 'medium',
      contactMethod: 'email',
    };

    const grievanceId = await privacyService.submitGrievance(grievanceData);
    
    expect(grievanceId).toMatch(/^grv_\d+_[a-z0-9]+$/);
    expect(mockSetDoc).toHaveBeenCalled();
  });
});