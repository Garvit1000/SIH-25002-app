import * as Location from 'expo-location';
import { Alert, Linking, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Comprehensive Location Permission Handler
 * Implements Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
 * 
 * Features:
 * - Clear user messaging for permission requests
 * - Graceful handling of permission denials
 * - Background location support for safety features
 * - Permission status tracking and recovery
 */
export class LocationPermissionHandler {
  constructor() {
    this.permissionStatus = {
      foreground: 'undetermined',
      background: 'undetermined',
      lastChecked: null,
      userExplanationShown: false
    };
    
    this.callbacks = {
      onPermissionGranted: null,
      onPermissionDenied: null,
      onPermissionChanged: null
    };
  }

  /**
   * Initialize permission handler with callbacks
   * @param {Object} callbacks - Event callbacks
   */
  initialize(callbacks = {}) {
    this.callbacks = { ...this.callbacks, ...callbacks };
    this.loadPermissionHistory();
  }

  /**
   * Request location permissions with comprehensive user guidance
   * Requirement 4.1: Clear permission dialog explaining why location is needed
   */
  async requestLocationPermissions(options = {}) {
    try {
      const { 
        showExplanation = true, 
        requireBackground = false,
        emergencyMode = false 
      } = options;

      // Check current permission status first
      const currentStatus = await this.checkCurrentPermissionStatus();
      
      // If already granted, return success
      if (currentStatus.foreground === 'granted' && 
          (!requireBackground || currentStatus.background === 'granted')) {
        return {
          success: true,
          permissions: currentStatus,
          message: 'Location permissions already granted'
        };
      }

      // Show explanation dialog if needed
      if (showExplanation && !this.permissionStatus.userExplanationShown) {
        const userAccepted = await this.showPermissionExplanation(emergencyMode);
        if (!userAccepted) {
          return {
            success: false,
            error: 'User declined permission explanation',
            canRetry: true
          };
        }
      }

      // Request foreground permission first
      const foregroundResult = await this.requestForegroundPermission();
      if (!foregroundResult.success) {
        return this.handlePermissionDenial('foreground', foregroundResult);
      }

      // Request background permission if needed
      let backgroundResult = { success: true, status: 'not_required' };
      if (requireBackground) {
        backgroundResult = await this.requestBackgroundPermission();
      }

      const finalStatus = await this.checkCurrentPermissionStatus();
      
      // Save permission history
      await this.savePermissionHistory(finalStatus);
      
      // Notify callbacks
      if (this.callbacks.onPermissionGranted) {
        this.callbacks.onPermissionGranted(finalStatus);
      }

      return {
        success: true,
        permissions: finalStatus,
        foregroundResult,
        backgroundResult,
        message: 'Location permissions granted successfully'
      };

    } catch (error) {
      console.error('Error requesting location permissions:', error);
      return {
        success: false,
        error: error.message,
        canRetry: true
      };
    }
  }

  /**
   * Show beautiful permission explanation dialog
   * Requirement 4.1: Clear user messaging explaining location needs
   */
  async showPermissionExplanation(emergencyMode = false) {
    return new Promise((resolve) => {
      const title = emergencyMode 
        ? "Emergency Location Access Required"
        : "Location Access for Your Safety";
        
      const message = emergencyMode
        ? `For emergency features to work properly, we need access to your location to:

🚨 Send your exact location to emergency contacts
📍 Guide emergency services to your location
🗺️ Show nearby emergency services and safe routes
🔄 Continue tracking in background for safety

Your location data is encrypted and only used for safety purposes.`
        : `To keep you safe while traveling, we need access to your location to:

🛡️ Monitor safety zones and alert you of risky areas
📍 Show your current location on safety maps
🚨 Enable emergency features and panic button
🗺️ Provide safe route recommendations
📱 Work even when the app is in background

Your privacy is protected - location data is encrypted and only used for safety features.`;

      Alert.alert(
        title,
        message,
        [
          {
            text: 'Not Now',
            style: 'cancel',
            onPress: () => {
              this.permissionStatus.userExplanationShown = true;
              resolve(false);
            }
          },
          {
            text: 'Enable Location',
            style: 'default',
            onPress: () => {
              this.permissionStatus.userExplanationShown = true;
              resolve(true);
            }
          }
        ],
        { cancelable: false }
      );
    });
  }

  /**
   * Request foreground location permission
   * Requirement 4.2: High-accuracy location permission handling
   */
  async requestForegroundPermission() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      this.permissionStatus.foreground = status;
      this.permissionStatus.lastChecked = new Date();

      if (status === 'granted') {
        return {
          success: true,
          status,
          message: 'Foreground location permission granted'
        };
      }

      return {
        success: false,
        status,
        error: `Foreground permission ${status}`,
        needsSettings: status === 'denied'
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        status: 'error'
      };
    }
  }

  /**
   * Request background location permission
   * Requirement 4.6: Background location handling for safety features
   */
  async requestBackgroundPermission() {
    try {
      // Check if foreground is granted first
      if (this.permissionStatus.foreground !== 'granted') {
        return {
          success: false,
          error: 'Foreground permission required first',
          status: 'foreground_required'
        };
      }

      // Show background permission explanation
      const userAccepted = await this.showBackgroundPermissionExplanation();
      if (!userAccepted) {
        return {
          success: false,
          error: 'User declined background permission',
          status: 'declined',
          canRetry: true
        };
      }

      const { status } = await Location.requestBackgroundPermissionsAsync();
      
      this.permissionStatus.background = status;
      this.permissionStatus.lastChecked = new Date();

      if (status === 'granted') {
        return {
          success: true,
          status,
          message: 'Background location permission granted'
        };
      }

      return {
        success: false,
        status,
        error: `Background permission ${status}`,
        needsSettings: status === 'denied'
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        status: 'error'
      };
    }
  }

  /**
   * Show background permission explanation
   */
  async showBackgroundPermissionExplanation() {
    return new Promise((resolve) => {
      Alert.alert(
        "Background Location for Safety",
        `To provide continuous safety monitoring, we need background location access:

🔄 Monitor safety zones even when app is closed
🚨 Enable emergency features to work anytime
📍 Track location during emergencies
🛡️ Provide continuous safety coverage

This ensures your safety features work 24/7. You can change this setting anytime in your device settings.`,
        [
          {
            text: 'Skip for Now',
            style: 'cancel',
            onPress: () => resolve(false)
          },
          {
            text: 'Enable Background',
            style: 'default',
            onPress: () => resolve(true)
          }
        ],
        { cancelable: false }
      );
    });
  }

  /**
   * Handle permission denial with user-friendly options
   * Requirement 4.5: Graceful handling of permission denial
   */
  async handlePermissionDenial(permissionType, result) {
    const isBackground = permissionType === 'background';
    const title = isBackground 
      ? "Background Location Not Available"
      : "Location Access Required";
      
    const message = isBackground
      ? `Background location is needed for continuous safety monitoring. Some safety features may be limited without it.

You can enable it later in Settings > Privacy > Location Services.`
      : `Location access is essential for safety features like:
• Emergency location sharing
• Safety zone monitoring  
• Route safety analysis

Please enable location access in your device settings to use these features.`;

    // Notify callback
    if (this.callbacks.onPermissionDenied) {
      this.callbacks.onPermissionDenied(permissionType, result);
    }

    // Show user-friendly options
    return new Promise((resolve) => {
      const buttons = [
        {
          text: 'Use Without Location',
          style: 'cancel',
          onPress: () => resolve({
            success: false,
            error: result.error,
            userChoice: 'continue_without',
            alternativeMode: true
          })
        }
      ];

      // Add settings option if permission was denied (not just not granted)
      if (result.needsSettings) {
        buttons.push({
          text: 'Open Settings',
          style: 'default',
          onPress: () => {
            Linking.openSettings();
            resolve({
              success: false,
              error: result.error,
              userChoice: 'open_settings',
              canRetry: true
            });
          }
        });
      } else {
        buttons.push({
          text: 'Try Again',
          style: 'default',
          onPress: () => resolve({
            success: false,
            error: result.error,
            userChoice: 'retry',
            canRetry: true
          })
        });
      }

      Alert.alert(title, message, buttons, { cancelable: false });
    });
  }

  /**
   * Check current permission status
   * Requirement 4.3: Accurate permission status tracking
   */
  async checkCurrentPermissionStatus() {
    try {
      const foregroundStatus = await Location.getForegroundPermissionsAsync();
      const backgroundStatus = await Location.getBackgroundPermissionsAsync();

      const currentStatus = {
        foreground: foregroundStatus.status,
        background: backgroundStatus.status,
        canAskAgain: {
          foreground: foregroundStatus.canAskAgain,
          background: backgroundStatus.canAskAgain
        },
        lastChecked: new Date()
      };

      // Update internal status
      this.permissionStatus = { ...this.permissionStatus, ...currentStatus };

      // Check for permission changes
      if (this.callbacks.onPermissionChanged) {
        this.callbacks.onPermissionChanged(currentStatus);
      }

      return currentStatus;

    } catch (error) {
      console.error('Error checking permission status:', error);
      return {
        foreground: 'undetermined',
        background: 'undetermined',
        error: error.message
      };
    }
  }

  /**
   * Get permission status with user-friendly descriptions
   */
  getPermissionStatusDescription() {
    const descriptions = {
      granted: 'Location access enabled',
      denied: 'Location access denied - some features unavailable',
      undetermined: 'Location permission not requested yet',
      restricted: 'Location access restricted by device settings'
    };

    return {
      foreground: {
        status: this.permissionStatus.foreground,
        description: descriptions[this.permissionStatus.foreground] || 'Unknown status',
        isGranted: this.permissionStatus.foreground === 'granted'
      },
      background: {
        status: this.permissionStatus.background,
        description: descriptions[this.permissionStatus.background] || 'Unknown status',
        isGranted: this.permissionStatus.background === 'granted'
      }
    };
  }

  /**
   * Check if location services are enabled on device
   */
  async checkLocationServicesEnabled() {
    try {
      const enabled = await Location.hasServicesEnabledAsync();
      
      if (!enabled) {
        return {
          enabled: false,
          message: 'Location services are disabled on this device',
          action: 'Please enable location services in your device settings'
        };
      }

      return { enabled: true };

    } catch (error) {
      return {
        enabled: false,
        error: error.message
      };
    }
  }

  /**
   * Show location services disabled dialog
   */
  async showLocationServicesDisabledDialog() {
    return new Promise((resolve) => {
      Alert.alert(
        "Location Services Disabled",
        `Location services are turned off on your device. To use safety features:

1. Open your device Settings
2. Go to Privacy & Security > Location Services  
3. Turn on Location Services
4. Return to the app and try again

Safety features require location services to work properly.`,
        [
          {
            text: 'Continue Without',
            style: 'cancel',
            onPress: () => resolve(false)
          },
          {
            text: 'Open Settings',
            style: 'default',
            onPress: () => {
              Linking.openSettings();
              resolve(true);
            }
          }
        ],
        { cancelable: false }
      );
    });
  }

  /**
   * Comprehensive permission check with user guidance
   * Requirement 4.1, 4.2, 4.3: Complete permission flow
   */
  async ensureLocationPermissions(options = {}) {
    try {
      // Check if location services are enabled
      const servicesCheck = await this.checkLocationServicesEnabled();
      if (!servicesCheck.enabled) {
        const userOpenedSettings = await this.showLocationServicesDisabledDialog();
        return {
          success: false,
          error: 'Location services disabled',
          userAction: userOpenedSettings ? 'opened_settings' : 'continued_without'
        };
      }

      // Check current permissions
      const currentStatus = await this.checkCurrentPermissionStatus();
      
      // If permissions are already sufficient, return success
      const needsBackground = options.requireBackground || false;
      if (currentStatus.foreground === 'granted' && 
          (!needsBackground || currentStatus.background === 'granted')) {
        return {
          success: true,
          permissions: currentStatus,
          message: 'Location permissions are ready'
        };
      }

      // Request permissions with user guidance
      return await this.requestLocationPermissions(options);

    } catch (error) {
      console.error('Error ensuring location permissions:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Save permission history for analytics and recovery
   */
  async savePermissionHistory(status) {
    try {
      const history = await this.getPermissionHistory();
      const newEntry = {
        ...status,
        timestamp: new Date().toISOString(),
        platform: Platform.OS
      };

      const updatedHistory = [newEntry, ...history.slice(0, 9)]; // Keep last 10 entries
      
      await AsyncStorage.setItem('location_permission_history', JSON.stringify(updatedHistory));
    } catch (error) {
      console.error('Error saving permission history:', error);
    }
  }

  /**
   * Load permission history
   */
  async loadPermissionHistory() {
    try {
      const history = await this.getPermissionHistory();
      if (history.length > 0) {
        const latest = history[0];
        this.permissionStatus.userExplanationShown = true; // Assume shown if we have history
      }
    } catch (error) {
      console.error('Error loading permission history:', error);
    }
  }

  /**
   * Get permission history
   */
  async getPermissionHistory() {
    try {
      const history = await AsyncStorage.getItem('location_permission_history');
      return history ? JSON.parse(history) : [];
    } catch (error) {
      console.error('Error getting permission history:', error);
      return [];
    }
  }

  /**
   * Reset permission handler state
   */
  reset() {
    this.permissionStatus = {
      foreground: 'undetermined',
      background: 'undetermined',
      lastChecked: null,
      userExplanationShown: false
    };
  }

  /**
   * Get permission recovery suggestions
   */
  getPermissionRecoverySuggestions(permissionType = 'foreground') {
    const suggestions = {
      foreground: [
        'Check if location services are enabled in device settings',
        'Try restarting the app and granting permission again',
        'Ensure the app has permission in Settings > Privacy > Location Services',
        'Some features will work in limited mode without location access'
      ],
      background: [
        'Background location enables continuous safety monitoring',
        'You can enable it later in Settings > Privacy > Location Services',
        'Emergency features will still work with foreground permission',
        'Consider enabling for full safety coverage'
      ]
    };

    return suggestions[permissionType] || suggestions.foreground;
  }
}

// Export singleton instance
export const locationPermissionHandler = new LocationPermissionHandler();

// Export permission status constants
export const PERMISSION_STATUS = {
  GRANTED: 'granted',
  DENIED: 'denied',
  UNDETERMINED: 'undetermined',
  RESTRICTED: 'restricted'
};

// Export permission types
export const PERMISSION_TYPES = {
  FOREGROUND: 'foreground',
  BACKGROUND: 'background'
};