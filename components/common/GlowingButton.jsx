import React, { useEffect, useRef } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const GlowingButton = ({
  title,
  onPress,
  disabled = false,
  loading = false,
  variant = 'primary',
  style,
  textStyle,
  glowColor = '#007AFF',
  ...props
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (loading) {
      // Pulsing animation for loading state
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [loading]);

  useEffect(() => {
    // Subtle glow animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: false,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, []);

  const getButtonColors = () => {
    switch (variant) {
      case 'primary':
        return disabled 
          ? ['#B0B0B0', '#909090']
          : ['#007AFF', '#0056CC'];
      case 'secondary':
        return disabled 
          ? ['#F0F0F0', '#E0E0E0']
          : ['#F8F9FA', '#E9ECEF'];
      case 'danger':
        return disabled 
          ? ['#FFB0B0', '#FF9090']
          : ['#FF3B30', '#D70015'];
      default:
        return ['#007AFF', '#0056CC'];
    }
  };

  const getTextColor = () => {
    if (disabled) return '#666666';
    return variant === 'secondary' ? '#007AFF' : '#FFFFFF';
  };

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8],
  });

  const shadowColor = disabled ? '#000000' : glowColor;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ scale: pulseAnim }],
        },
        style,
      ]}
    >
      {/* Glow effect */}
      <Animated.View
        style={[
          styles.glowContainer,
          {
            opacity: disabled ? 0 : glowOpacity,
            shadowColor: shadowColor,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.6,
            shadowRadius: 12,
            elevation: 8,
          },
        ]}
      >
        <LinearGradient
          colors={getButtonColors()}
          style={[styles.gradient, disabled && styles.disabled]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <TouchableOpacity
            style={styles.button}
            onPress={onPress}
            disabled={disabled || loading}
            activeOpacity={0.8}
            {...props}
          >
            <Text
              style={[
                styles.text,
                { color: getTextColor() },
                textStyle,
              ]}
            >
              {loading ? 'Loading...' : title}
            </Text>
          </TouchableOpacity>
        </LinearGradient>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  glowContainer: {
    borderRadius: 16,
  },
  gradient: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  disabled: {
    opacity: 0.6,
  },
});

export default GlowingButton;