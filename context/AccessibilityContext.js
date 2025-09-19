import React, { createContext, useState, useContext, useEffect } from 'react';
import { AccessibilityInfo } from 'react-native';

const AccessibilityContext = createContext({});

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
};

export const AccessibilityProvider = ({ children, initialSettings = {} }) => {
  const [screenReaderEnabled, setScreenReaderEnabled] = useState(false);
  const [reduceMotionEnabled, setReduceMotionEnabled] = useState(false);
  const [fontSize, setFontSize] = useState(initialSettings.fontSize || 1.0);
  const [highContrast, setHighContrast] = useState(initialSettings.highContrast || false);

  useEffect(() => {
    // Initialize accessibility settings
    const initializeAccessibility = async () => {
      try {
        // Check if screen reader is enabled
        const screenReader = await AccessibilityInfo.isScreenReaderEnabled();
        setScreenReaderEnabled(screenReader);

        // Check if reduce motion is enabled
        const reduceMotion = await AccessibilityInfo.isReduceMotionEnabled();
        setReduceMotionEnabled(reduceMotion);
      } catch (error) {
        console.error('Error initializing accessibility:', error);
        // Set safe defaults
        setScreenReaderEnabled(false);
        setReduceMotionEnabled(false);
      }
    };

    initializeAccessibility();

    // Listen for accessibility changes
    const screenReaderListener = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      setScreenReaderEnabled
    );

    const reduceMotionListener = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotionEnabled
    );

    return () => {
      screenReaderListener?.remove();
      reduceMotionListener?.remove();
    };
  }, []);

  const announceForAccessibility = (message) => {
    try {
      AccessibilityInfo.announceForAccessibility(message);
    } catch (error) {
      console.error('Error announcing for accessibility:', error);
    }
  };

  const setAccessibilityFocus = (reactTag) => {
    try {
      AccessibilityInfo.setAccessibilityFocus(reactTag);
    } catch (error) {
      console.error('Error setting accessibility focus:', error);
    }
  };

  const getAccessibilityProps = (options = {}) => {
    const {
      label,
      hint,
      role,
      state,
      value,
      adjustable = false,
      increment,
      decrement
    } = options;

    const props = {};

    if (label) props.accessibilityLabel = label;
    if (hint) props.accessibilityHint = hint;
    if (role) props.accessibilityRole = role;
    if (state) props.accessibilityState = state;
    if (value) props.accessibilityValue = value;

    if (adjustable) {
      props.accessible = true;
      props.accessibilityRole = 'adjustable';
      if (increment) props.accessibilityActions = [
        { name: 'increment', label: increment },
        { name: 'decrement', label: decrement }
      ];
    }

    return props;
  };

  const getScreenReaderEnabled = () => screenReaderEnabled;
  const getReduceMotionEnabled = () => reduceMotionEnabled;

  const addListener = (callback) => {
    // Simple listener implementation
    const listeners = [];
    listeners.push(callback);
    
    return () => {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  };

  const value = {
    screenReaderEnabled,
    reduceMotionEnabled,
    fontSize,
    highContrast,
    announceForAccessibility,
    setAccessibilityFocus,
    getAccessibilityProps,
    getScreenReaderEnabled,
    getReduceMotionEnabled,
    addListener
  };

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
    </AccessibilityContext.Provider>
  );
};

export { AccessibilityContext };