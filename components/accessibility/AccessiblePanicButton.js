import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  Animated,
  StyleSheet,
  Vibration,
  Alert
} from 'react-native';
import { useAccessibility } from '../../context/AccessibilityContext';
import { useTheme } from '../../context/ThemeContext';

const AccessiblePanicButton = ({
  onPress,
  onLongPress,
  disabled = false,
  size = 'large',
  style,
  testID = 'panic-button',
  requireLongPress = true,
  longPressDuration = 2000,
  ...props
}) => {
  const [isPressed, setIsPressed] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [progress, setProgress] = useState(0);
  
  const animatedValue = useRef(new Animated.Value(0)).current;
  const progressValue = useRef(new Animated.Value(0)).current;
  const longPressTimer = useRef(null);
  const buttonRef = useRef(null);
  
  const { theme } = useTheme();
  const {
    getAccessibilityProps,
    getTouchTargetStyle,
    getFocusStyle,
    getScaledFontSize,
    announceForAccessibility,
    isScreenReaderEnabled,
    getAnimationConfig,
    isHighContrastEnabled
  } = useAccessibility();

  useEffect(() => {
    return () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
    };
  }, []);

  const handlePressIn = () => {
    if (disabled) return;
    
    setIsPressed(true);
    
    // Start press animation
    Animated.spring(animatedValue, getAnimationConfig({
      toValue: 1,
      useNativeDriver: true,
      tension: 100,
      friction: 3
    })).start();

    // Provide immediate haptic feedback
    Vibration.vibrate(50);
    
    if (requireLongPress) {
      setIsActivating(true);
      
      // Start progress animation
      Animated.timing(progressValue, getAnimationConfig({
        toValue: 1,
        duration: longPressDuration,
        useNativeDriver: false
      })).start();
      
      // Announce long press requirement for screen readers
      if (isScreenReaderEnabled) {
        announceForAccessibility(
          `Emergency button pressed. Hold for ${longPressDuration / 1000} seconds to activate.`
        );
      }
      
      // Set timer for long press completion
      longPressTimer.current = setTimeout(() => {
        handleLongPressComplete();
      }, longPressDuration);
      
      // Update progress for accessibility
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev + (100 / (longPressDuration / 100));
          if (newProgress >= 100) {
            clearInterval(progressInterval);
            return 100;
          }
          return newProgress;
        });
      }, 100);
      
    } else {
      // Immediate activation
      handlePress();
    }
  };

  const handlePressOut = () => {
    setIsPressed(false);
    setIsActivating(false);
    setProgress(0);
    
    // Reset animations
    Animated.spring(animatedValue, getAnimationConfig({
      toValue: 0,
      useNativeDriver: true,
      tension: 100,
      friction: 3
    })).start();
    
    Animated.timing(progressValue, getAnimationConfig({
      toValue: 0,
      duration: 200,
      useNativeDriver: false
    })).start();
    
    // Clear long press timer
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    
    // Announce cancellation for screen readers
    if (isActivating && isScreenReaderEnabled) {
      announceForAccessibility('Emergency activation cancelled');
    }
  };

  const handlePress = () => {
    if (disabled) return;
    
    // Strong haptic feedback for activation
    Vibration.vibrate([0, 100, 50, 100]);
    
    // Announce activation
    announceForAccessibility('Emergency alert activated');
    
    if (onPress) {
      onPress();
    }
  };

  const handleLongPressComplete = () => {
    setIsActivating(false);
    setProgress(100);
    
    // Strong haptic feedback pattern for emergency activation
    Vibration.vibrate([0, 200, 100, 200, 100, 200]);
    
    // Announce completion
    announceForAccessibility('Emergency alert activated. Help is being contacted.');
    
    if (onLongPress) {
      onLongPress();
    } else if (onPress) {
      onPress();
    }
  };

  const handleAccessibilityAction = (event) => {
    if (event.nativeEvent.actionName === 'activate') {
      // For screen readers, provide alternative activation method
      Alert.alert(
        'Emergency Alert',
        'Are you sure you want to activate the emergency alert? This will contact your emergency contacts and local authorities.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => announceForAccessibility('Emergency alert cancelled')
          },
          {
            text: 'Activate Emergency',
            style: 'destructive',
            onPress: handlePress
          }
        ]
      );
    }
  };

  const getButtonSize = () => {
    const sizes = {
      small: 80,
      medium: 120,
      large: 160,
      xlarge: 200
    };
    return sizes[size] || sizes.large;
  };

  const getButtonStyle = () => {
    const buttonSize = getButtonSize();
    const touchTargetStyle = getTouchTargetStyle(buttonSize);
    const focusStyle = getFocusStyle();
    
    return [
      styles.button,
      {
        width: buttonSize,
        height: buttonSize,
        borderRadius: buttonSize / 2,
        backgroundColor: theme.colors.emergency,
        borderColor: isHighContrastEnabled ? theme.colors.text : 'transparent',
        borderWidth: isHighContrastEnabled ? 3 : 0
      },
      touchTargetStyle,
      focusStyle,
      disabled && styles.disabledButton,
      style
    ];
  };

  const getTextStyle = () => {
    const fontSize = size === 'small' ? 12 : size === 'medium' ? 14 : 16;
    
    return [
      styles.buttonText,
      {
        color: theme.colors.background,
        fontSize: getScaledFontSize(fontSize)
      }
    ];
  };

  const getProgressStyle = () => {
    return {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.colors.emergencyBackground,
      borderRadius: getButtonSize() / 2,
      opacity: progressValue.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 0.3]
      })
    };
  };

  // Generate comprehensive accessibility props
  const accessibilityProps = getAccessibilityProps({
    label: 'Emergency panic button',
    hint: requireLongPress 
      ? `Hold for ${longPressDuration / 1000} seconds to activate emergency alert`
      : 'Tap to activate emergency alert',
    role: 'button',
    state: {
      disabled: disabled,
      busy: isActivating
    },
    context: 'Emergency response'
  });

  // Add custom accessibility actions for screen readers
  accessibilityProps.accessibilityActions = [
    { name: 'activate', label: 'Activate Emergency Alert' }
  ];
  accessibilityProps.onAccessibilityAction = handleAccessibilityAction;

  // Add progress information for screen readers
  if (isActivating) {
    accessibilityProps.accessibilityValue = {
      min: 0,
      max: 100,
      now: Math.round(progress)
    };
  }

  const animatedStyle = {
    transform: [
      {
        scale: animatedValue.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 0.95]
        })
      }
    ]
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[animatedStyle]}>
        <TouchableOpacity
          ref={buttonRef}
          style={getButtonStyle()}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={disabled}
          activeOpacity={1}
          testID={testID}
          {...accessibilityProps}
          {...props}
        >
          {/* Progress indicator for long press */}
          {requireLongPress && isActivating && (
            <Animated.View style={getProgressStyle()} />
          )}
          
          {/* Button content */}
          <View style={styles.buttonContent}>
            <Text style={[getTextStyle(), styles.emergencyIcon]}>🚨</Text>
            <Text style={getTextStyle()}>EMERGENCY</Text>
            {requireLongPress && (
              <Text style={[getTextStyle(), styles.instructionText]}>
                {isActivating ? `${Math.round(progress)}%` : 'HOLD'}
              </Text>
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>
      
      {/* Additional context for screen readers */}
      <Text
        style={styles.hiddenText}
        {...getAccessibilityProps({
          label: 'This button will immediately contact your emergency contacts and local authorities when activated',
          role: 'none',
          isImportant: false
        })}
      >
        Emergency button context
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4
    },
    shadowOpacity: 0.3,
    shadowRadius: 8
  },
  disabledButton: {
    opacity: 0.5,
    elevation: 2,
    shadowOpacity: 0.1
  },
  buttonContent: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  buttonText: {
    fontWeight: 'bold',
    textAlign: 'center'
  },
  emergencyIcon: {
    fontSize: 24,
    marginBottom: 4
  },
  instructionText: {
    fontSize: 10,
    marginTop: 4,
    opacity: 0.9
  },
  hiddenText: {
    position: 'absolute',
    left: -10000,
    top: 'auto',
    width: 1,
    height: 1,
    overflow: 'hidden'
  }
});

export default AccessiblePanicButton;