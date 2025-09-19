import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const GlowingInput = ({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  autoCorrect = true,
  error,
  leftIcon,
  rightIcon,
  onRightIconPress,
  style,
  inputStyle,
  showPasswordToggle = false,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(!secureTextEntry);
  const focusAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const labelAnim = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    // Focus glow animation
    Animated.timing(focusAnim, {
      toValue: isFocused ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();

    // Label animation
    Animated.timing(labelAnim, {
      toValue: isFocused || value ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [isFocused, value]);

  useEffect(() => {
    if (isFocused) {
      // Subtle glow pulse when focused
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: false,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.5,
            duration: 1500,
            useNativeDriver: false,
          }),
        ])
      ).start();
    } else {
      glowAnim.setValue(0);
    }
  }, [isFocused]);

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const borderColor = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: error ? ['#FF3B30', '#FF3B30'] : ['#E5E5EA', '#007AFF'],
  });

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.4],
  });

  const labelTop = labelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [20, -8],
  });

  const labelFontSize = labelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [16, 12],
  });

  const labelColor = labelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: error ? ['#FF3B30', '#FF3B30'] : ['#8E8E93', '#007AFF'],
  });

  return (
    <View style={[styles.container, style]}>
      {/* Glow effect */}
      <Animated.View
        style={[
          styles.glowContainer,
          {
            opacity: glowOpacity,
            shadowColor: error ? '#FF3B30' : '#007AFF',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 1,
            shadowRadius: 8,
            elevation: 4,
          },
        ]}
      />
      
      {/* Input container */}
      <Animated.View
        style={[
          styles.inputContainer,
          {
            borderColor: borderColor,
            borderWidth: isFocused ? 2 : 1,
          },
        ]}
      >
        {/* Floating label */}
        {label && (
          <Animated.Text
            style={[
              styles.label,
              {
                top: labelTop,
                fontSize: labelFontSize,
                color: labelColor,
              },
            ]}
          >
            {label}
          </Animated.Text>
        )}

        <View style={styles.inputRow}>
          {/* Left icon */}
          {leftIcon && (
            <View style={styles.iconContainer}>
              <Ionicons
                name={leftIcon}
                size={20}
                color={isFocused ? '#007AFF' : '#8E8E93'}
              />
            </View>
          )}

          {/* Text input */}
          <TextInput
            style={[
              styles.input,
              leftIcon && styles.inputWithLeftIcon,
              (rightIcon || showPasswordToggle) && styles.inputWithRightIcon,
              inputStyle,
            ]}
            value={value}
            onChangeText={onChangeText}
            placeholder={!label ? placeholder : ''}
            placeholderTextColor="#C7C7CC"
            secureTextEntry={secureTextEntry && !showPassword}
            keyboardType={keyboardType}
            autoCapitalize={autoCapitalize}
            autoCorrect={autoCorrect}
            onFocus={handleFocus}
            onBlur={handleBlur}
            {...props}
          />

          {/* Right icon or password toggle */}
          {(rightIcon || showPasswordToggle) && (
            <TouchableOpacity
              style={styles.iconContainer}
              onPress={showPasswordToggle ? togglePasswordVisibility : onRightIconPress}
            >
              <Ionicons
                name={
                  showPasswordToggle
                    ? showPassword
                      ? 'eye-off-outline'
                      : 'eye-outline'
                    : rightIcon
                }
                size={20}
                color={isFocused ? '#007AFF' : '#8E8E93'}
              />
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>

      {/* Error message */}
      {error && (
        <Animated.View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={16} color="#FF3B30" />
          <Text style={styles.errorText}>{error}</Text>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  glowContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
  },
  inputContainer: {
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    minHeight: 56,
    justifyContent: 'center',
    position: 'relative',
  },
  label: {
    position: 'absolute',
    left: 16,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 4,
    fontWeight: '500',
    zIndex: 1,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#000000',
    paddingVertical: 16,
  },
  inputWithLeftIcon: {
    marginLeft: 12,
  },
  inputWithRightIcon: {
    marginRight: 12,
  },
  iconContainer: {
    padding: 4,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    marginLeft: 6,
    flex: 1,
  },
});

export default GlowingInput;