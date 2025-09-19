import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { useAccessibility } from '../../context/AccessibilityContext';
import { useTheme } from '../../context/ThemeContext';

const AccessibleText = ({
  children,
  variant = 'body',
  color,
  align = 'left',
  weight = 'normal',
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole = 'text',
  accessibilityContext,
  isImportant = true,
  numberOfLines,
  adjustsFontSizeToFit = false,
  minimumFontScale = 0.8,
  style,
  testID,
  ...props
}) => {
  const { theme } = useTheme();
  const {
    getAccessibilityProps,
    getScaledFontSize,
    isHighContrastEnabled
  } = useAccessibility();

  const getVariantStyle = () => {
    const variants = {
      // Headings
      h1: { fontSize: 32, fontWeight: 'bold', lineHeight: 40 },
      h2: { fontSize: 28, fontWeight: 'bold', lineHeight: 36 },
      h3: { fontSize: 24, fontWeight: '600', lineHeight: 32 },
      h4: { fontSize: 20, fontWeight: '600', lineHeight: 28 },
      h5: { fontSize: 18, fontWeight: '600', lineHeight: 24 },
      h6: { fontSize: 16, fontWeight: '600', lineHeight: 22 },
      
      // Body text
      body: { fontSize: 16, fontWeight: 'normal', lineHeight: 24 },
      bodyLarge: { fontSize: 18, fontWeight: 'normal', lineHeight: 26 },
      bodySmall: { fontSize: 14, fontWeight: 'normal', lineHeight: 20 },
      
      // Captions and labels
      caption: { fontSize: 12, fontWeight: 'normal', lineHeight: 16 },
      label: { fontSize: 14, fontWeight: '500', lineHeight: 18 },
      labelLarge: { fontSize: 16, fontWeight: '500', lineHeight: 22 },
      
      // Special variants
      button: { fontSize: 16, fontWeight: '600', lineHeight: 20 },
      link: { fontSize: 16, fontWeight: 'normal', lineHeight: 24 },
      error: { fontSize: 14, fontWeight: '500', lineHeight: 18 },
      success: { fontSize: 14, fontWeight: '500', lineHeight: 18 },
      warning: { fontSize: 14, fontWeight: '500', lineHeight: 18 }
    };

    return variants[variant] || variants.body;
  };

  const getTextColor = () => {
    if (color) return color;
    
    // Use high contrast colors if enabled
    if (isHighContrastEnabled) {
      switch (variant) {
        case 'error':
          return theme.colors.danger;
        case 'success':
          return theme.colors.success;
        case 'warning':
          return theme.colors.warning;
        case 'link':
          return theme.colors.primary;
        default:
          return theme.colors.text;
      }
    }
    
    // Default color mapping
    switch (variant) {
      case 'caption':
        return theme.colors.textSecondary;
      case 'error':
        return theme.colors.danger;
      case 'success':
        return theme.colors.success;
      case 'warning':
        return theme.colors.warning;
      case 'link':
        return theme.colors.primary;
      default:
        return theme.colors.text;
    }
  };

  const getAccessibilityRole = () => {
    // Map text variants to appropriate accessibility roles
    switch (variant) {
      case 'h1':
      case 'h2':
      case 'h3':
      case 'h4':
      case 'h5':
      case 'h6':
        return 'header';
      case 'link':
        return 'link';
      case 'button':
        return 'button';
      case 'error':
      case 'success':
      case 'warning':
        return 'alert';
      default:
        return accessibilityRole;
    }
  };

  const getAccessibilityLevel = () => {
    // Return heading level for screen readers
    const headingLevels = {
      h1: 1,
      h2: 2,
      h3: 3,
      h4: 4,
      h5: 5,
      h6: 6
    };
    
    return headingLevels[variant];
  };

  const variantStyle = getVariantStyle();
  const textColor = getTextColor();
  const accessibilityLevel = getAccessibilityLevel();

  const textStyle = [
    styles.text,
    {
      fontSize: getScaledFontSize(variantStyle.fontSize),
      lineHeight: getScaledFontSize(variantStyle.lineHeight),
      fontWeight: weight !== 'normal' ? weight : variantStyle.fontWeight,
      color: textColor,
      textAlign: align
    },
    // Add extra spacing for high contrast mode
    isHighContrastEnabled && styles.highContrastText,
    style
  ];

  // Generate accessibility props
  const accessibilityProps = getAccessibilityProps({
    label: accessibilityLabel || (typeof children === 'string' ? children : undefined),
    hint: accessibilityHint,
    role: getAccessibilityRole(),
    context: accessibilityContext,
    isImportant
  });

  // Add heading level for screen readers
  if (accessibilityLevel) {
    accessibilityProps.accessibilityLevel = accessibilityLevel;
  }

  return (
    <Text
      style={textStyle}
      numberOfLines={numberOfLines}
      adjustsFontSizeToFit={adjustsFontSizeToFit}
      minimumFontScale={minimumFontScale}
      testID={testID}
      {...accessibilityProps}
      {...props}
    >
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  text: {
    // Base text styles
  },
  highContrastText: {
    // Add extra letter spacing for better readability in high contrast mode
    letterSpacing: 0.5
  }
});

export default AccessibleText;