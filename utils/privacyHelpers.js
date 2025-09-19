import { Alert } from 'react-native';
import { privacyService } from '../services/privacy/privacyService';

/**
 * Handle permission changes with safety feature protection
 * @param {string} userId - User ID
 * @param {string} permission - Permission being changed
 * @param {boolean} newValue - New permission value
 * @param {Object} currentPermissions - Current permissions object
 * @returns {Promise<boolean>} Whether the change was successful
 */
export const handleSafePermissionChange = async (userId, permission, newValue, currentPermissions) => {
  try {
    // Define critical safety permissions
    const criticalPermissions = {
      locationTracking: {
        name: 'Location Tracking',
        features: ['Emergency response', 'Safety zone monitoring', 'Route safety scoring'],
        fallbackMessage: 'Manual location entry will be required for emergency situations.'
      },
      emergencyContacts: {
        name: 'Emergency Contacts',
        features: ['Panic button alerts', 'Automatic emergency notifications', 'Crisis communication'],
        fallbackMessage: 'You will need to manually contact emergency services during crises.'
      }
    };

    // Check if this is a critical permission being disabled
    if (criticalPermissions[permission] && !newValue) {
      const permissionInfo = criticalPermissions[permission];
      
      return new Promise((resolve) => {
        Alert.alert(
          'Safety Feature Warning',
          `Disabling ${permissionInfo.name} will affect these safety features:\n\n` +
          `• ${permissionInfo.features.join('\n• ')}\n\n` +
          `${permissionInfo.fallbackMessage}\n\n` +
          'Are you sure you want to continue?',
          [
            { 
              text: 'Keep Enabled', 
              style: 'cancel', 
              onPress: () => resolve(false) 
            },
            { 
              text: 'Disable Anyway', 
              style: 'destructive', 
              onPress: async () => {
                const success = await updatePermissionSafely(userId, permission, newValue, currentPermissions);
                resolve(success);
              }
            }
          ]
        );
      });
    } else {
      // Non-critical permission, update directly
      return await updatePermissionSafely(userId, permission, newValue, currentPermissions);
    }
  } catch (error) {
    console.error('Error handling permission change:', error);
    Alert.alert('Error', 'Failed to update permission. Please try again.');
    return false;
  }
};

/**
 * Safely update permission with fallback mechanisms
 * @param {string} userId - User ID
 * @param {string} permission - Permission being changed
 * @param {boolean} newValue - New permission value
 * @param {Object} currentPermissions - Current permissions object
 * @returns {Promise<boolean>} Whether the update was successful
 */
const updatePermissionSafely = async (userId, permission, newValue, currentPermissions) => {
  try {
    const updatedPermissions = { ...currentPermissions, [permission]: newValue };
    
    // Validate the new permission set
    const validation = privacyService.validateSafetyPermissions(updatedPermissions);
    
    // Update the permissions
    await privacyService.updatePrivacySettings(userId, updatedPermissions);
    
    // If there are warnings, show them to the user
    if (validation.warnings.length > 0) {
      const warningMessages = validation.warnings.map(w => w.message).join('\n');
      Alert.alert(
        'Safety Notice',
        `Your settings have been updated. Please note:\n\n${warningMessages}`,
        [{ text: 'OK' }]
      );
    }
    
    // Set up fallback mechanisms for disabled critical features
    await setupFallbackMechanisms(userId, permission, newValue);
    
    return true;
  } catch (error) {
    console.error('Error updating permission safely:', error);
    throw error;
  }
};

/**
 * Set up fallback mechanisms when critical permissions are disabled
 * @param {string} userId - User ID
 * @param {string} permission - Permission that was changed
 * @param {boolean} newValue - New permission value
 */
const setupFallbackMechanisms = async (userId, permission, newValue) => {
  if (!newValue) { // Permission was disabled
    switch (permission) {
      case 'locationTracking':
        // Enable manual location entry mode
        await privacyService.updateUserPreference(userId, 'manualLocationMode', true);
        break;
        
      case 'emergencyContacts':
        // Enable manual emergency contact mode
        await privacyService.updateUserPreference(userId, 'manualEmergencyMode', true);
        break;
        
      default:
        // No specific fallback needed
        break;
    }
  } else { // Permission was enabled
    switch (permission) {
      case 'locationTracking':
        // Disable manual location entry mode
        await privacyService.updateUserPreference(userId, 'manualLocationMode', false);
        break;
        
      case 'emergencyContacts':
        // Disable manual emergency contact mode
        await privacyService.updateUserPreference(userId, 'manualEmergencyMode', false);
        break;
        
      default:
        // No specific action needed
        break;
    }
  }
};

/**
 * Check if user can safely disable a permission
 * @param {string} permission - Permission to check
 * @param {Object} userProfile - User profile data
 * @returns {Object} Safety check result
 */
export const checkPermissionSafety = (permission, userProfile) => {
  const safetyChecks = {
    locationTracking: () => {
      const hasEmergencyContacts = userProfile?.emergencyContacts?.length > 0;
      const isVerified = userProfile?.verificationStatus === 'verified';
      
      return {
        canDisable: hasEmergencyContacts && isVerified,
        reason: hasEmergencyContacts ? 
          'You have emergency contacts configured as backup' :
          'Please add emergency contacts before disabling location tracking',
        riskLevel: hasEmergencyContacts ? 'medium' : 'high'
      };
    },
    
    emergencyContacts: () => {
      const hasLocationEnabled = userProfile?.permissions?.locationTracking !== false;
      
      return {
        canDisable: hasLocationEnabled,
        reason: hasLocationEnabled ?
          'Location tracking is enabled as backup for emergencies' :
          'Cannot disable both location tracking and emergency contacts',
        riskLevel: hasLocationEnabled ? 'high' : 'critical'
      };
    },
    
    profileData: () => ({
      canDisable: true,
      reason: 'Profile data is not critical for safety features',
      riskLevel: 'low'
    }),
    
    analyticsData: () => ({
      canDisable: true,
      reason: 'Analytics data does not affect safety features',
      riskLevel: 'none'
    }),
    
    crashReports: () => ({
      canDisable: true,
      reason: 'Crash reports help improve app stability but are not critical',
      riskLevel: 'low'
    }),
    
    marketingCommunications: () => ({
      canDisable: true,
      reason: 'Marketing communications do not affect safety features',
      riskLevel: 'none'
    })
  };
  
  const checker = safetyChecks[permission];
  return checker ? checker() : { canDisable: true, reason: 'Unknown permission', riskLevel: 'low' };
};

/**
 * Get user-friendly permission descriptions
 * @param {string} permission - Permission key
 * @returns {Object} Permission description and impact
 */
export const getPermissionInfo = (permission) => {
  const permissionInfo = {
    locationTracking: {
      title: 'Location Tracking',
      description: 'Allows the app to track your location for safety monitoring and emergency response',
      impact: 'Required for geo-fencing, safety zone alerts, and automatic emergency location sharing',
      dataCollected: 'GPS coordinates, movement patterns, visited locations',
      retention: 'Location data is retained for 90 days for safety analysis'
    },
    
    emergencyContacts: {
      title: 'Emergency Contacts',
      description: 'Stores your emergency contact information for crisis situations',
      impact: 'Required for panic button functionality and automatic emergency notifications',
      dataCollected: 'Contact names, phone numbers, relationships, communication history',
      retention: 'Contact data is retained until you remove it or delete your account'
    },
    
    profileData: {
      title: 'Profile Data',
      description: 'Stores your tourist profile information including nationality and passport details',
      impact: 'Used for identity verification and QR code generation',
      dataCollected: 'Name, nationality, passport number, verification status, preferences',
      retention: 'Profile data is retained for the duration of your account'
    },
    
    analyticsData: {
      title: 'Analytics Data',
      description: 'Collects anonymous usage statistics to improve the app',
      impact: 'Helps us understand how features are used and identify areas for improvement',
      dataCollected: 'App usage patterns, feature interactions, performance metrics (anonymized)',
      retention: 'Analytics data is retained for 2 years in anonymized form'
    },
    
    crashReports: {
      title: 'Crash Reports',
      description: 'Automatically sends crash reports when the app encounters errors',
      impact: 'Helps us fix bugs and improve app stability',
      dataCollected: 'Error logs, device information, app state at time of crash',
      retention: 'Crash reports are retained for 1 year for debugging purposes'
    },
    
    marketingCommunications: {
      title: 'Marketing Communications',
      description: 'Allows us to send you updates about new features and safety tips',
      impact: 'You will receive notifications about app updates and safety information',
      dataCollected: 'Notification preferences, engagement with communications',
      retention: 'Communication preferences are retained until you opt out'
    }
  };
  
  return permissionInfo[permission] || {
    title: 'Unknown Permission',
    description: 'No description available',
    impact: 'Impact unknown',
    dataCollected: 'Unknown data collection',
    retention: 'Unknown retention period'
  };
};

/**
 * Generate privacy impact assessment for permission changes
 * @param {Object} oldPermissions - Previous permissions
 * @param {Object} newPermissions - New permissions
 * @returns {Object} Impact assessment
 */
export const generatePrivacyImpactAssessment = (oldPermissions, newPermissions) => {
  const changes = [];
  const risks = [];
  const benefits = [];
  
  Object.keys(newPermissions).forEach(permission => {
    if (oldPermissions[permission] !== newPermissions[permission]) {
      const info = getPermissionInfo(permission);
      const safetyCheck = checkPermissionSafety(permission, {});
      
      changes.push({
        permission,
        oldValue: oldPermissions[permission],
        newValue: newPermissions[permission],
        title: info.title,
        impact: info.impact
      });
      
      if (!newPermissions[permission] && safetyCheck.riskLevel !== 'none') {
        risks.push({
          permission,
          riskLevel: safetyCheck.riskLevel,
          description: safetyCheck.reason
        });
      }
      
      if (!oldPermissions[permission] && newPermissions[permission]) {
        benefits.push({
          permission,
          description: `Enabling ${info.title} will improve safety features`
        });
      }
    }
  });
  
  return {
    changes,
    risks,
    benefits,
    overallRisk: risks.length > 0 ? Math.max(...risks.map(r => 
      r.riskLevel === 'critical' ? 4 : 
      r.riskLevel === 'high' ? 3 : 
      r.riskLevel === 'medium' ? 2 : 1
    )) : 0
  };
};