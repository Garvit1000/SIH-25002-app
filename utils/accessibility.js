import { AccessibilityInfo, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

class AccessibilityHelper {
  constructor() {
    this.isScreenReaderEnabled = false;
    this.isHighContrastEnabled = false;
    this.fontScale = 1;
    this.isReduceMotionEnabled = false;
    this.listeners = [];
    
    this.init();
  }

  async init() {
    try {
      // Check initial accessibility states
      this.isScreenReaderEnabled = await AccessibilityInfo.isScreenReaderEnabled();
      
      if (Platform.OS === 'ios') {
        this.isReduceMotionEnabled = await AccessibilityInfo.isReduceMotionEnabled();
      }

      // Load saved accessibility preferences
      await this.loadAccessibilityPreferences();

      // Set up listeners for accessibility changes
      this.setupAccessibilityListeners();
    } catch (error) {
      console.error('Error initializing accessibility helper:', error);
    }
  }

  setupAccessibilityListeners() {
    // Screen reader state changes
    const screenReaderListener = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      (isEnabled) => {
        this.isScreenReaderEnabled = isEnabled;
        this.notifyListeners('screenReaderChanged', isEnabled);
      }
    );

    // Reduce motion changes (iOS only)
    if (Platform.OS === 'ios') {
      const reduceMotionListener = AccessibilityInfo.addEventListener(
        'reduceMotionChanged',
        (isEnabled) => {
          this.isReduceMotionEnabled = isEnabled;
          this.notifyListeners('reduceMotionChanged', isEnabled);
        }
      );
      this.listeners.push(reduceMotionListener);
    }

    this.listeners.push(screenReaderListener);
  }

  async loadAccessibilityPreferences() {
    try {
      const preferences = await AsyncStorage.getItem('accessibility_preferences');
      if (preferences) {
        const parsed = JSON.parse(preferences);
        this.isHighContrastEnabled = parsed.highContrast || false;
        this.fontScale = parsed.fontScale || 1;
      }
    } catch (error) {
      console.error('Error loading accessibility preferences:', error);
    }
  }

  async saveAccessibilityPreferences() {
    try {
      const preferences = {
        highContrast: this.isHighContrastEnabled,
        fontScale: this.fontScale,
      };
      await AsyncStorage.setItem('accessibility_preferences', JSON.stringify(preferences));
    } catch (error) {
      console.error('Error saving accessibility preferences:', error);
    }
  }

  // High contrast mode
  async setHighContrastMode(enabled) {
    this.isHighContrastEnabled = enabled;
    await this.saveAccessibilityPreferences();
    this.notifyListeners('highContrastChanged', enabled);
  }

  getHighContrastMode() {
    return this.isHighContrastEnabled;
  }

  // Font scaling
  async setFontScale(scale) {
    // Limit font scale between 0.8 and 2.0
    this.fontScale = Math.max(0.8, Math.min(2.0, scale));
    await this.saveAccessibilityPreferences();
    this.notifyListeners('fontScaleChanged', this.fontScale);
  }

  getFontScale() {
    return this.fontScale;
  }

  // Screen reader
  getScreenReaderEnabled() {
    return this.isScreenReaderEnabled;
  }

  // Reduce motion
  getReduceMotionEnabled() {
    return this.isReduceMotionEnabled;
  }

  // Accessibility announcements
  announceForAccessibility(message) {
    if (this.isScreenReaderEnabled) {
      AccessibilityInfo.announceForAccessibility(message);
    }
  }

  // Focus management
  setAccessibilityFocus(reactTag) {
    if (this.isScreenReaderEnabled && reactTag) {
      AccessibilityInfo.setAccessibilityFocus(reactTag);
    }
  }

  // Generate accessibility props for components
  getAccessibilityProps(options = {}) {
    const {
      label,
      hint,
      role = 'button',
      state,
      value,
      adjustable = false,
      increment,
      decrement,
    } = options;

    const props = {
      accessible: true,
      accessibilityRole: role,
    };

    if (label) {
      props.accessibilityLabel = label;
    }

    if (hint) {
      props.accessibilityHint = hint;
    }

    if (state) {
      props.accessibilityState = state;
    }

    if (value) {
      props.accessibilityValue = value;
    }

    if (adjustable) {
      props.accessibilityActions = [
        { name: 'increment', label: increment || 'Increase' },
        { name: 'decrement', label: decrement || 'Decrease' },
      ];
    }

    return props;
  }

  // Generate high contrast colors
  getHighContrastColors(baseColors) {
    if (!this.isHighContrastEnabled) {
      return baseColors;
    }

    return {
      ...baseColors,
      background: '#000000',
      surface: '#1a1a1a',
      text: '#ffffff',
      textSecondary: '#cccccc',
      primary: '#00ff00',
      secondary: '#ffff00',
      success: '#00ff00',
      warning: '#ffff00',
      error: '#ff0000',
      border: '#ffffff',
    };
  }

  // Generate scaled font sizes
  getScaledFontSize(baseFontSize) {
    return Math.round(baseFontSize * this.fontScale);
  }

  // Generate animation config based on reduce motion preference
  getAnimationConfig(baseConfig) {
    if (this.isReduceMotionEnabled) {
      return {
        ...baseConfig,
        duration: 0,
        useNativeDriver: false,
      };
    }
    return baseConfig;
  }

  // One-handed operation helpers
  getOneHandedLayoutProps(screenWidth) {
    const isLargeScreen = screenWidth > 375;
    
    return {
      // Move important actions to bottom third of screen
      actionAreaHeight: isLargeScreen ? screenWidth * 0.4 : screenWidth * 0.3,
      // Optimize touch targets for thumb reach
      minTouchTarget: 44,
      // Adjust margins for easier reach
      sideMargin: isLargeScreen ? 20 : 16,
    };
  }

  // Voice-over navigation helpers
  getVoiceOverProps(element, context = '') {
    if (!this.isScreenReaderEnabled) {
      return {};
    }

    const props = {
      importantForAccessibility: 'yes',
    };

    // Add context information for better navigation
    if (context) {
      props.accessibilityLabel = `${element.label || element.text}, ${context}`;
    }

    return props;
  }

  // Listener management
  addListener(callback) {
    this.listeners.push(callback);
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  notifyListeners(event, data) {
    this.listeners.forEach(listener => {
      if (typeof listener === 'function') {
        listener(event, data);
      }
    });
  }

  // Cleanup
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
const accessibilityHelper = new AccessibilityHelper();

export default accessibilityHelper;

// Export utility functions
export const {
  setHighContrastMode,
  getHighContrastMode,
  setFontScale,
  getFontScale,
  getScreenReaderEnabled,
  getReduceMotionEnabled,
  announceForAccessibility,
  setAccessibilityFocus,
  getAccessibilityProps,
  getHighContrastColors,
  getScaledFontSize,
  getAnimationConfig,
  getOneHandedLayoutProps,
  getVoiceOverProps,
  addListener: addAccessibilityListener,
} = accessibilityHelper;