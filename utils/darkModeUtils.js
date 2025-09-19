import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Dark Mode Utilities
 * Provides enhanced dark mode functionality with ambient light detection
 */

class DarkModeManager {
  constructor() {
    this.listeners = [];
    this.ambientLightSensor = null;
    this.isAmbientLightEnabled = true;
    this.currentLightLevel = 'normal';
    this.autoThemeEnabled = true;
    this.scheduleEnabled = false;
    this.schedule = {
      darkStart: '22:00',
      darkEnd: '06:00'
    };
  }

  /**
   * Initialize dark mode manager
   */
  async initialize() {
    try {
      // Load saved preferences
      await this.loadPreferences();
      
      // Set up system appearance listener
      this.setupSystemListener();
      
      // Initialize ambient light detection if enabled
      if (this.isAmbientLightEnabled) {
        this.initializeAmbientLightDetection();
      }
      
      // Initialize schedule-based theme switching if enabled
      if (this.scheduleEnabled) {
        this.initializeScheduleBasedSwitching();
      }
      
    } catch (error) {
      console.error('Error initializing dark mode manager:', error);
    }
  }

  /**
   * Load saved preferences from storage
   */
  async loadPreferences() {
    try {
      const preferences = await AsyncStorage.getItem('darkModePreferences');
      if (preferences) {
        const parsed = JSON.parse(preferences);
        this.isAmbientLightEnabled = parsed.ambientLightEnabled !== false;
        this.autoThemeEnabled = parsed.autoThemeEnabled !== false;
        this.scheduleEnabled = parsed.scheduleEnabled || false;
        this.schedule = parsed.schedule || this.schedule;
      }
    } catch (error) {
      console.error('Error loading dark mode preferences:', error);
    }
  }

  /**
   * Save preferences to storage
   */
  async savePreferences() {
    try {
      const preferences = {
        ambientLightEnabled: this.isAmbientLightEnabled,
        autoThemeEnabled: this.autoThemeEnabled,
        scheduleEnabled: this.scheduleEnabled,
        schedule: this.schedule
      };
      await AsyncStorage.setItem('darkModePreferences', JSON.stringify(preferences));
    } catch (error) {
      console.error('Error saving dark mode preferences:', error);
    }
  }

  /**
   * Set up system appearance change listener
   */
  setupSystemListener() {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      if (this.autoThemeEnabled) {
        this.notifyListeners('systemThemeChanged', colorScheme === 'dark');
      }
    });

    this.listeners.push(subscription);
  }

  /**
   * Initialize ambient light detection
   * Note: This is a simulation - real implementation would use device sensors
   */
  initializeAmbientLightDetection() {
    // Simulate ambient light detection using time-based heuristics
    this.startTimeBasedLightDetection();
    
    // In a real implementation, you would use:
    // - Device light sensor APIs
    // - Camera-based light detection
    // - Location-based sunrise/sunset calculations
  }

  /**
   * Start time-based light level detection
   */
  startTimeBasedLightDetection() {
    const updateLightLevel = () => {
      const now = new Date();
      const hour = now.getHours();
      const minute = now.getMinutes();
      const timeInMinutes = hour * 60 + minute;
      
      // Define light level thresholds
      const dawn = 6 * 60; // 6:00 AM
      const morning = 8 * 60; // 8:00 AM
      const noon = 12 * 60; // 12:00 PM
      const afternoon = 16 * 60; // 4:00 PM
      const evening = 18 * 60; // 6:00 PM
      const night = 22 * 60; // 10:00 PM
      
      let lightLevel = 'normal';
      let shouldBeDark = false;
      
      if (timeInMinutes < dawn || timeInMinutes >= night) {
        lightLevel = 'dark';
        shouldBeDark = true;
      } else if (timeInMinutes >= dawn && timeInMinutes < morning) {
        lightLevel = 'dim';
        shouldBeDark = false;
      } else if (timeInMinutes >= morning && timeInMinutes < afternoon) {
        lightLevel = 'bright';
        shouldBeDark = false;
      } else if (timeInMinutes >= afternoon && timeInMinutes < evening) {
        lightLevel = 'normal';
        shouldBeDark = false;
      } else {
        lightLevel = 'dim';
        shouldBeDark = false;
      }
      
      // Update current light level
      if (this.currentLightLevel !== lightLevel) {
        this.currentLightLevel = lightLevel;
        this.notifyListeners('lightLevelChanged', lightLevel);
      }
      
      // Auto-switch theme based on ambient light
      if (this.isAmbientLightEnabled && this.autoThemeEnabled) {
        this.notifyListeners('ambientThemeChanged', shouldBeDark);
      }
    };

    // Update immediately and then every 15 minutes
    updateLightLevel();
    const interval = setInterval(updateLightLevel, 15 * 60 * 1000);
    
    return () => clearInterval(interval);
  }

  /**
   * Initialize schedule-based theme switching
   */
  initializeScheduleBasedSwitching() {
    const checkSchedule = () => {
      if (!this.scheduleEnabled) return;
      
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      const shouldBeDark = this.isTimeInDarkPeriod(currentTime);
      this.notifyListeners('scheduleThemeChanged', shouldBeDark);
    };

    // Check immediately and then every minute
    checkSchedule();
    const interval = setInterval(checkSchedule, 60 * 1000);
    
    return () => clearInterval(interval);
  }

  /**
   * Check if current time is in dark period
   */
  isTimeInDarkPeriod(currentTime) {
    const timeToMinutes = (timeStr) => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes;
    };

    const current = timeToMinutes(currentTime);
    const darkStart = timeToMinutes(this.schedule.darkStart);
    const darkEnd = timeToMinutes(this.schedule.darkEnd);

    // Handle overnight periods (e.g., 22:00 to 06:00)
    if (darkStart > darkEnd) {
      return current >= darkStart || current < darkEnd;
    } else {
      return current >= darkStart && current < darkEnd;
    }
  }

  /**
   * Get enhanced dark theme colors
   */
  getEnhancedDarkTheme(baseTheme) {
    return {
      ...baseTheme,
      colors: {
        ...baseTheme.colors,
        // True black for OLED displays
        background: '#000000',
        surface: '#111111',
        card: '#1a1a1a',
        
        // Enhanced contrast for better readability
        text: '#ffffff',
        textSecondary: '#cccccc',
        
        // Adjusted accent colors for dark mode
        primary: '#0a84ff',
        secondary: '#5e5ce6',
        success: '#30d158',
        warning: '#ff9f0a',
        danger: '#ff453a',
        
        // Dark mode specific colors
        border: '#333333',
        shadow: '#ffffff',
        
        // Safety colors optimized for dark mode
        safeZone: '#30d158',
        cautionZone: '#ff9f0a',
        restrictedZone: '#ff453a',
        
        // Emergency colors for dark mode
        emergency: '#ff453a',
        emergencyBackground: '#2c1b1b',
        panic: '#ff1744'
      }
    };
  }

  /**
   * Get adaptive theme based on current conditions
   */
  getAdaptiveTheme(lightTheme, darkTheme) {
    const systemScheme = Appearance.getColorScheme();
    let shouldUseDark = systemScheme === 'dark';

    // Override with ambient light detection
    if (this.isAmbientLightEnabled && this.autoThemeEnabled) {
      shouldUseDark = this.currentLightLevel === 'dark';
    }

    // Override with schedule if enabled
    if (this.scheduleEnabled) {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      shouldUseDark = this.isTimeInDarkPeriod(currentTime);
    }

    return shouldUseDark ? this.getEnhancedDarkTheme(darkTheme) : lightTheme;
  }

  /**
   * Enable/disable ambient light detection
   */
  async setAmbientLightEnabled(enabled) {
    this.isAmbientLightEnabled = enabled;
    await this.savePreferences();
    
    if (enabled) {
      this.initializeAmbientLightDetection();
    }
    
    this.notifyListeners('ambientLightEnabledChanged', enabled);
  }

  /**
   * Enable/disable auto theme switching
   */
  async setAutoThemeEnabled(enabled) {
    this.autoThemeEnabled = enabled;
    await this.savePreferences();
    this.notifyListeners('autoThemeEnabledChanged', enabled);
  }

  /**
   * Enable/disable schedule-based switching
   */
  async setScheduleEnabled(enabled) {
    this.scheduleEnabled = enabled;
    await this.savePreferences();
    
    if (enabled) {
      this.initializeScheduleBasedSwitching();
    }
    
    this.notifyListeners('scheduleEnabledChanged', enabled);
  }

  /**
   * Update dark mode schedule
   */
  async setSchedule(darkStart, darkEnd) {
    this.schedule = { darkStart, darkEnd };
    await this.savePreferences();
    this.notifyListeners('scheduleChanged', this.schedule);
  }

  /**
   * Get current light level
   */
  getCurrentLightLevel() {
    return this.currentLightLevel;
  }

  /**
   * Get current settings
   */
  getSettings() {
    return {
      ambientLightEnabled: this.isAmbientLightEnabled,
      autoThemeEnabled: this.autoThemeEnabled,
      scheduleEnabled: this.scheduleEnabled,
      schedule: this.schedule,
      currentLightLevel: this.currentLightLevel
    };
  }

  /**
   * Add listener for dark mode changes
   */
  addListener(callback) {
    this.listeners.push(callback);
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify all listeners of changes
   */
  notifyListeners(event, data) {
    this.listeners.forEach(listener => {
      if (typeof listener === 'function') {
        listener(event, data);
      }
    });
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    this.listeners.forEach(listener => {
      if (listener && typeof listener.remove === 'function') {
        listener.remove();
      }
    });
    this.listeners = [];
  }
}

// Create singleton instance
const darkModeManager = new DarkModeManager();

export default darkModeManager;

// Export utility functions
export const {
  initialize,
  setAmbientLightEnabled,
  setAutoThemeEnabled,
  setScheduleEnabled,
  setSchedule,
  getCurrentLightLevel,
  getSettings,
  getAdaptiveTheme,
  addListener
} = darkModeManager;