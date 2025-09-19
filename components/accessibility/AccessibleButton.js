import React, { useRef } from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { useAccessibility } from '../../context/AccessibilityContext';
import { useTheme } from '../../context/ThemeContext';

const AccessibleButton = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  accessibilityLabel,
  accessibilityHint,
  accessibilityContext,
  testID,
  style,
  textStyle,
  children,
  ...props
}) => {
  const buttonRef = useRef(null);
  const { theme } = useTheme();
  const {
    getAccessibilityProps,
    getTouchTargetStyle,
    getFocusStyle,
    getScaledFontSize,
    announceForAccessibility,
    isScreenReaderEnabled
  } = useAccessibility();

  const handlePress = () => {
    if (disabled || loading) return;
    
    // Provide haptic feedback for better accessibility
    if (onPress) {
      onPress();
      
      // Announce action completion for screen readers
      if (isScreenReaderEnabled && accessibilityLabel) {
        announceForAccessibility(`${accessibilityLabel} activated`);
      }
    }
  };

  const getButtonStyle = () => {
    const baseStyle = styles.button;
    const sizeStyle = styles[`${size}Button`];
    const variantStyle = styles[`${variant}Button`];
    const touchTargetStyle = getTouchTargetStyle();
    const focusStyle = getFocusStyle();
    
    let stateStyle = {};
    if (disabled) {
      stateStyle = styles.disabledButton;
    } else if (loading) {
      stateStyle = styles.loadingButton;
    }

    return [
      baseStyle,
      sizeStyle,
      variantStyle,
      touchTargetStyle,
      focusStyle,
      stateStyle,
      { backgroundColor: getButtonColor() },
      style
    ];
  };

  const getButtonColor = () => {
    if (disabled) return theme.colors.border;
    if (loading) return theme.colors.textSecondary;
    
    switch (variant) {
      case 'primary':
        return theme.colors.primary;
      case 'secondary':
        return theme.colors.secondary;
      case 'success':
        return theme.colors.success;
      case 'warning':
        return theme.colors.warning;
      case 'danger':
        return theme.colors.danger;
      case 'outline':
        return 'transparent';
      case 'ghost':
        return 'transparent';
      default:
        return theme.colors.primary;
    }
  };

  const getTextColor = () => {
    if (disabled) return theme.colors.textSecondary;
    
    switch (variant) {
      case 'outline':
      case 'ghost':
        return theme.colors.primary;
      default:
        return theme.colors.background;
    }
  };

  const getTextStyle = () => {
    const baseStyle = styles.buttonText;
    const sizeStyle = styles[`${size}Text`];
    
    return [
      baseStyle,
      sizeStyle,
      { 
        color: getTextColor(),
        fontSize: getScaledFontSize(sizeStyle.fontSize || 16)
      },
      textStyle
    ];
  };

  const getBorderStyle = () => {
    if (variant === 'outline') {
      return {
        borderWidth: 2,
        borderColor: disabled ? theme.colors.border : theme.colors.primary
      };
    }
    return {};
  };

  // Generate comprehensive accessibility props
  const accessibilityProps = getAccessibilityProps({
    label: accessibilityLabel || title,
    hint: accessibilityHint,
    role: 'button',
    state: {
      disabled: disabled,
      busy: loading
    },
    context: accessibilityContext
  });

  const renderContent = () => {
    if (children) {
      return children;
    }

    const textElement = (
      <Text 
        style={getTextStyle()}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
      >
        {loading ? 'Loading...' : title}
      </Text>
    );

    if (!icon) {
      return textElement;
    }

    const iconElement = React.cloneElement(icon, {
      size: size === 'small' ? 16 : size === 'large' ? 24 : 20,
      color: getTextColor(),
      style: [
        icon.props.style,
        iconPosition === 'right' ? styles.iconRight : styles.iconLeft
      ]
    });

    return (
      <View style={styles.buttonContent}>
        {iconPosition === 'left' && iconElement}
        {textElement}
        {iconPosition === 'right' && iconElement}
      </View>
    );
  };

  return (
    <TouchableOpacity
      ref={buttonRef}
      style={[getButtonStyle(), getBorderStyle()]}
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={disabled || loading ? 1 : 0.7}
      testID={testID}
      {...accessibilityProps}
      {...props}
    >
      {renderContent()}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row'
  },
  
  // Size variants
  smallButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 32
  },
  mediumButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 44
  },
  largeButton: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    minHeight: 52
  },
  
  // Text size variants
  smallText: {
    fontSize: 14,
    fontWeight: '500'
  },
  mediumText: {
    fontSize: 16,
    fontWeight: '600'
  },
  largeText: {
    fontSize: 18,
    fontWeight: '600'
  },
  
  // State styles
  disabledButton: {
    opacity: 0.6
  },
  loadingButton: {
    opacity: 0.8
  },
  
  // Content layout
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  buttonText: {
    textAlign: 'center'
  },
  iconLeft: {
    marginRight: 8
  },
  iconRight: {
    marginLeft: 8
  }
});

export default AccessibleButton;