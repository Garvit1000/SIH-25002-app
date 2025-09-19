import { db } from '../../firebaseConfig';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  serverTimestamp 
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

class PrivacyService {
  constructor() {
    this.defaultPermissions = {
      locationTracking: true, // Required for safety
      emergencyContacts: true, // Required for safety
      profileData: true,
      analyticsData: false,
      crashReports: true,
      marketingCommunications: false,
    };
  }

  /**
   * Get user's privacy settings
   * @param {string} userId - User ID
   * @returns {Object} Privacy settings object
   */
  async getPrivacySettings(userId) {
    try {
      const privacyDoc = await getDoc(doc(db, 'privacy_settings', userId));
      
      if (privacyDoc.exists()) {
        return { ...this.defaultPermissions, ...privacyDoc.data().permissions };
      } else {
        // Create default settings for new user
        await this.createDefaultPrivacySettings(userId);
        return this.defaultPermissions;
      }
    } catch (error) {
      console.error('Error fetching privacy settings:', error);
      // Return cached settings if available
      const cachedSettings = await this.getCachedPrivacySettings(userId);
      return cachedSettings || this.defaultPermissions;
    }
  }

  /**
   * Update user's privacy settings
   * @param {string} userId - User ID
   * @param {Object} permissions - Updated permissions object
   */
  async updatePrivacySettings(userId, permissions) {
    try {
      const privacyData = {
        permissions,
        updatedAt: serverTimestamp(),
        userId
      };

      await setDoc(doc(db, 'privacy_settings', userId), privacyData, { merge: true });
      
      // Cache settings locally
      await this.cachePrivacySettings(userId, permissions);
      
      // Log privacy change for audit trail
      await this.logPrivacyChange(userId, permissions);
      
      return permissions;
    } catch (error) {
      console.error('Error updating privacy settings:', error);
      throw new Error('Failed to update privacy settings');
    }
  }

  /**
   * Create default privacy settings for new user
   * @param {string} userId - User ID
   */
  async createDefaultPrivacySettings(userId) {
    try {
      const privacyData = {
        permissions: this.defaultPermissions,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        userId,
        consentVersion: '1.0'
      };

      await setDoc(doc(db, 'privacy_settings', userId), privacyData);
      await this.cachePrivacySettings(userId, this.defaultPermissions);
    } catch (error) {
      console.error('Error creating default privacy settings:', error);
    }
  }

  /**
   * Get data usage statistics for transparency
   * @param {string} userId - User ID
   * @returns {Object} Data usage statistics
   */
  async getDataUsageStats(userId) {
    try {
      const statsDoc = await getDoc(doc(db, 'data_usage_stats', userId));
      
      if (statsDoc.exists()) {
        const data = statsDoc.data();
        return {
          locationDataPoints: data.locationDataPoints || 0,
          emergencyAlerts: data.emergencyAlerts || 0,
          qrGenerations: data.qrGenerations || 0,
          lastSyncDate: data.lastSyncDate?.toDate() || null,
        };
      } else {
        return {
          locationDataPoints: 0,
          emergencyAlerts: 0,
          qrGenerations: 0,
          lastSyncDate: null,
        };
      }
    } catch (error) {
      console.error('Error fetching data usage stats:', error);
      return {
        locationDataPoints: 0,
        emergencyAlerts: 0,
        qrGenerations: 0,
        lastSyncDate: null,
      };
    }
  }

  /**
   * Update data usage statistics
   * @param {string} userId - User ID
   * @param {string} dataType - Type of data (location, emergency, qr)
   * @param {number} increment - Amount to increment by (default: 1)
   */
  async updateDataUsageStats(userId, dataType, increment = 1) {
    try {
      const statsRef = doc(db, 'data_usage_stats', userId);
      const statsDoc = await getDoc(statsRef);
      
      let currentStats = {
        locationDataPoints: 0,
        emergencyAlerts: 0,
        qrGenerations: 0,
      };
      
      if (statsDoc.exists()) {
        currentStats = { ...currentStats, ...statsDoc.data() };
      }
      
      const fieldMap = {
        location: 'locationDataPoints',
        emergency: 'emergencyAlerts',
        qr: 'qrGenerations',
      };
      
      const field = fieldMap[dataType];
      if (field) {
        currentStats[field] += increment;
        currentStats.lastSyncDate = serverTimestamp();
        
        await setDoc(statsRef, currentStats, { merge: true });
      }
    } catch (error) {
      console.error('Error updating data usage stats:', error);
    }
  }

  /**
   * Check if user has given consent for specific data type
   * @param {string} userId - User ID
   * @param {string} dataType - Type of data to check
   * @returns {boolean} Whether consent is given
   */
  async hasConsent(userId, dataType) {
    try {
      const settings = await this.getPrivacySettings(userId);
      return settings[dataType] || false;
    } catch (error) {
      console.error('Error checking consent:', error);
      return false;
    }
  }

  /**
   * Cache privacy settings locally for offline access
   * @param {string} userId - User ID
   * @param {Object} permissions - Permissions to cache
   */
  async cachePrivacySettings(userId, permissions) {
    try {
      const cacheKey = `privacy_settings_${userId}`;
      await AsyncStorage.setItem(cacheKey, JSON.stringify(permissions));
    } catch (error) {
      console.error('Error caching privacy settings:', error);
    }
  }

  /**
   * Get cached privacy settings
   * @param {string} userId - User ID
   * @returns {Object|null} Cached permissions or null
   */
  async getCachedPrivacySettings(userId) {
    try {
      const cacheKey = `privacy_settings_${userId}`;
      const cached = await AsyncStorage.getItem(cacheKey);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Error getting cached privacy settings:', error);
      return null;
    }
  }

  /**
   * Log privacy setting changes for audit trail
   * @param {string} userId - User ID
   * @param {Object} newPermissions - New permissions
   */
  async logPrivacyChange(userId, newPermissions) {
    try {
      const logData = {
        userId,
        permissions: newPermissions,
        timestamp: serverTimestamp(),
        action: 'privacy_settings_updated'
      };

      await setDoc(doc(collection(db, 'privacy_audit_log')), logData);
    } catch (error) {
      console.error('Error logging privacy change:', error);
    }
  }

  /**
   * Get consent history for user
   * @param {string} userId - User ID
   * @returns {Array} Array of consent history records
   */
  async getConsentHistory(userId) {
    try {
      const q = query(
        collection(db, 'privacy_audit_log'),
        where('userId', '==', userId)
      );
      
      const querySnapshot = await getDocs(q);
      const history = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        history.push({
          id: doc.id,
          ...data,
          timestamp: data.timestamp?.toDate() || null
        });
      });
      
      return history.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    } catch (error) {
      console.error('Error fetching consent history:', error);
      return [];
    }
  }

  /**
   * Validate that critical safety permissions are enabled
   * @param {Object} permissions - Permissions object
   * @returns {Object} Validation result with warnings
   */
  validateSafetyPermissions(permissions) {
    const warnings = [];
    const criticalPermissions = ['locationTracking', 'emergencyContacts'];
    
    criticalPermissions.forEach(permission => {
      if (!permissions[permission]) {
        warnings.push({
          permission,
          message: `${permission} is disabled, which may affect safety features`,
          severity: 'high'
        });
      }
    });
    
    return {
      isValid: warnings.length === 0,
      warnings
    };
  }

  /**
   * Submit data deletion request
   * @param {Object} deletionRequest - Deletion request data
   * @returns {string} Request ID
   */
  async submitDataDeletionRequest(deletionRequest) {
    try {
      const requestData = {
        ...deletionRequest,
        id: `del_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        submittedAt: serverTimestamp(),
        status: 'pending',
        estimatedCompletionDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      };

      await setDoc(doc(collection(db, 'data_deletion_requests')), requestData);
      
      // Log the deletion request for audit trail
      await this.logPrivacyAction(deletionRequest.userId, 'data_deletion_requested', {
        requestId: requestData.id,
        dataTypes: deletionRequest.dataTypes,
      });

      return requestData.id;
    } catch (error) {
      console.error('Error submitting data deletion request:', error);
      throw new Error('Failed to submit data deletion request');
    }
  }

  /**
   * Submit privacy grievance
   * @param {Object} grievanceData - Grievance data
   * @returns {string} Grievance ID
   */
  async submitGrievance(grievanceData) {
    try {
      const grievanceId = `grv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const grievanceRecord = {
        ...grievanceData,
        id: grievanceId,
        submittedAt: serverTimestamp(),
        status: 'submitted',
        assignedTo: null,
        resolution: null,
        resolvedAt: null,
        updates: [],
      };

      await setDoc(doc(collection(db, 'privacy_grievances')), grievanceRecord);
      
      // Log the grievance submission
      await this.logPrivacyAction(grievanceData.userId, 'grievance_submitted', {
        grievanceId,
        category: grievanceData.category,
        priority: grievanceData.priority,
      });

      return grievanceId;
    } catch (error) {
      console.error('Error submitting grievance:', error);
      throw new Error('Failed to submit grievance');
    }
  }

  /**
   * Get user's grievances
   * @param {string} userId - User ID
   * @returns {Array} Array of user's grievances
   */
  async getUserGrievances(userId) {
    try {
      const q = query(
        collection(db, 'privacy_grievances'),
        where('userId', '==', userId)
      );
      
      const querySnapshot = await getDocs(q);
      const grievances = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        grievances.push({
          id: data.id,
          category: data.category,
          subject: data.subject,
          status: data.status,
          priority: data.priority,
          submittedAt: data.submittedAt?.toDate()?.toISOString() || null,
          resolvedAt: data.resolvedAt?.toDate()?.toISOString() || null,
        });
      });
      
      return grievances.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
    } catch (error) {
      console.error('Error fetching user grievances:', error);
      return [];
    }
  }

  /**
   * Get user's data deletion requests
   * @param {string} userId - User ID
   * @returns {Array} Array of deletion requests
   */
  async getUserDeletionRequests(userId) {
    try {
      const q = query(
        collection(db, 'data_deletion_requests'),
        where('userId', '==', userId)
      );
      
      const querySnapshot = await getDocs(q);
      const requests = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        requests.push({
          id: data.id,
          dataTypes: data.dataTypes,
          reason: data.reason,
          status: data.status,
          submittedAt: data.submittedAt?.toDate()?.toISOString() || null,
          estimatedCompletionDate: data.estimatedCompletionDate?.toDate()?.toISOString() || null,
        });
      });
      
      return requests.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
    } catch (error) {
      console.error('Error fetching deletion requests:', error);
      return [];
    }
  }

  /**
   * Log privacy-related actions for audit trail
   * @param {string} userId - User ID
   * @param {string} action - Action type
   * @param {Object} metadata - Additional metadata
   */
  async logPrivacyAction(userId, action, metadata = {}) {
    try {
      const logData = {
        userId,
        action,
        metadata,
        timestamp: serverTimestamp(),
        userAgent: 'Tourist Safety App Mobile',
      };

      await setDoc(doc(collection(db, 'privacy_audit_log')), logData);
    } catch (error) {
      console.error('Error logging privacy action:', error);
    }
  }

  /**
   * Check if user has pending data deletion requests
   * @param {string} userId - User ID
   * @returns {boolean} Whether user has pending deletion requests
   */
  async hasPendingDeletionRequest(userId) {
    try {
      const q = query(
        collection(db, 'data_deletion_requests'),
        where('userId', '==', userId),
        where('status', '==', 'pending')
      );
      
      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (error) {
      console.error('Error checking pending deletion requests:', error);
      return false;
    }
  }

  /**
   * Update user preference
   * @param {string} userId - User ID
   * @param {string} preference - Preference key
   * @param {any} value - Preference value
   */
  async updateUserPreference(userId, preference, value) {
    try {
      const preferencesRef = doc(db, 'user_preferences', userId);
      const updateData = {
        [preference]: value,
        updatedAt: serverTimestamp()
      };
      
      await setDoc(preferencesRef, updateData, { merge: true });
      
      // Cache preference locally
      const cacheKey = `user_preferences_${userId}`;
      const cached = await AsyncStorage.getItem(cacheKey);
      const preferences = cached ? JSON.parse(cached) : {};
      preferences[preference] = value;
      await AsyncStorage.setItem(cacheKey, JSON.stringify(preferences));
      
    } catch (error) {
      console.error('Error updating user preference:', error);
      throw new Error('Failed to update user preference');
    }
  }

  /**
   * Get user preferences
   * @param {string} userId - User ID
   * @returns {Object} User preferences
   */
  async getUserPreferences(userId) {
    try {
      const preferencesDoc = await getDoc(doc(db, 'user_preferences', userId));
      
      if (preferencesDoc.exists()) {
        return preferencesDoc.data();
      } else {
        return {};
      }
    } catch (error) {
      console.error('Error fetching user preferences:', error);
      // Try to get cached preferences
      try {
        const cacheKey = `user_preferences_${userId}`;
        const cached = await AsyncStorage.getItem(cacheKey);
        return cached ? JSON.parse(cached) : {};
      } catch (cacheError) {
        console.error('Error getting cached preferences:', cacheError);
        return {};
      }
    }
  }

  /**
   * Process data deletion request (admin function)
   * @param {string} requestId - Deletion request ID
   * @param {string} status - New status (approved, rejected, completed)
   * @param {string} adminNotes - Admin notes
   */
  async processDataDeletionRequest(requestId, status, adminNotes = '') {
    try {
      const requestRef = doc(db, 'data_deletion_requests', requestId);
      const updateData = {
        status,
        adminNotes,
        processedAt: serverTimestamp(),
      };
      
      if (status === 'completed') {
        updateData.completedAt = serverTimestamp();
      }
      
      await updateDoc(requestRef, updateData);
      
      // If approved, start the actual deletion process
      if (status === 'approved') {
        // This would trigger a cloud function to handle the actual data deletion
        await this.triggerDataDeletion(requestId);
      }
      
    } catch (error) {
      console.error('Error processing data deletion request:', error);
      throw new Error('Failed to process data deletion request');
    }
  }

  /**
   * Trigger actual data deletion (would be handled by cloud functions in production)
   * @param {string} requestId - Deletion request ID
   */
  async triggerDataDeletion(requestId) {
    try {
      // In a real implementation, this would trigger a cloud function
      // that handles the actual data deletion across all systems
      const triggerData = {
        requestId,
        triggeredAt: serverTimestamp(),
        status: 'deletion_in_progress'
      };
      
      await setDoc(doc(collection(db, 'deletion_triggers')), triggerData);
    } catch (error) {
      console.error('Error triggering data deletion:', error);
    }
  }

  /**
   * Get privacy compliance report for user
   * @param {string} userId - User ID
   * @returns {Object} Compliance report
   */
  async getPrivacyComplianceReport(userId) {
    try {
      const [
        privacySettings,
        dataUsageStats,
        consentHistory,
        deletionRequests,
        grievances
      ] = await Promise.all([
        this.getPrivacySettings(userId),
        this.getDataUsageStats(userId),
        this.getConsentHistory(userId),
        this.getUserDeletionRequests(userId),
        this.getUserGrievances(userId)
      ]);
      
      return {
        userId,
        generatedAt: new Date().toISOString(),
        privacySettings,
        dataUsageStats,
        consentHistory: consentHistory.slice(0, 10), // Last 10 changes
        deletionRequests,
        grievances,
        complianceStatus: {
          hasValidConsent: Object.values(privacySettings).some(v => v === true),
          canRequestDeletion: !await this.hasPendingDeletionRequest(userId),
          hasActiveGrievances: grievances.some(g => g.status !== 'resolved' && g.status !== 'closed')
        }
      };
    } catch (error) {
      console.error('Error generating compliance report:', error);
      throw new Error('Failed to generate privacy compliance report');
    }
  }
}

export const privacyService = new PrivacyService();
export default privacyService;