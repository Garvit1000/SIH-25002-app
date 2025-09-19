import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';

const SimpleButton = ({
  title,
  onPress,
  disabled = false,
  loading = false,
  variant = 'primary',
  style,
  textStyle,
  ...props
}) => {
  const getButtonStyle = () => {
    switch (variant) {
      case 'primary':
        return disabled 
          ? [styles.button, styles.primaryButton, styles.disabled]
          : [styles.button, styles.primaryButton];
      case 'secondary':
        return disabled 
          ? [styles.button, styles.secondaryButton, styles.disabled]
          : [styles.button, styles.secondaryButton];
      case 'danger':
        return disabled 
          ? [styles.button, styles.dangerButton, styles.disabled]
          : [styles.button, styles.dangerButton];
      default:
        return [styles.button, styles.primaryButton];
    }
  };

  const getTextStyle = () => {
    if (disabled) return [styles.text, styles.disabledText];
    return variant === 'secondary' 
      ? [styles.text, styles.secondaryText] 
      : [styles.text, styles.primaryText];
  };

  return (
    <TouchableOpacity
      style={[...getButtonStyle(), style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      {...props}
    >
      {loading ? (
        <ActivityIndicator 
          color={variant === 'secondary' ? '#007AFF' : '#FFFFFF'} 
        />
      ) : (
        <Text style={[...getTextStyle(), textStyle]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
    marginVertical: 8,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  dangerButton: {
    backgroundColor: '#FF3B30',
  },
  disabled: {
    opacity: 0.6,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  primaryText: {
    color: '#FFFFFF',
  },
  secondaryText: {
    color: '#007AFF',
  },
  disabledText: {
    color: '#666666',
  },
});

export default SimpleButton;