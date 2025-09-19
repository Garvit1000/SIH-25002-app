import React, { useState, useRef } from 'react';
import { 
  View, 
  TextInput, 
  Text, 
  TouchableOpacity, 
  StyleSheet 
} from 'react-native';
import { useAccessibility } from '../../context/AccessibilityContext';
import { useTheme } from '../../context/ThemeContext';

const AccessibleInput = ({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  helperText,
  required = false,
  disabled = false,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  autoCorrect = true,
  maxLength,
  multiline = false,
  numberOfLines = 1,
  accessibilityLabel,
  accessibilityHint,
  accessibilityContext,
  testID,
  style,
  inputStyle,
  labelStyle,
  errorStyle,
  helperStyle,
  showPasswordToggle = false,
  onFocus,
  onBlur,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const inputRef = useRef(null);
  
  const { theme } = useTheme();
  const {
    getAccessibilityProps,
    getTouchTargetStyle,
    getFocusStyle,
    getScaledFontSize,
    announceForAccessibility,
    isScreenReaderEnabled,
    isHighContrastEnabled
  } = useAccessibility();

  const handleFocus = (e) => {
    setIsFocused(true);
    if (onFocus) onFocus(e);
    
    // Announce field information for screen readers
    if (isScreenReaderEnabled) {
      let announcement = label || accessibilityLabel || placeholder;
      if (required) announcement += ', required';
      if (error) announcement += `, error: ${error}`;
      if (helperText && !error) announcement += `, ${helperText}`;
      
      announceForAccessibility(announcement);
    }
  };

  const handleBlur = (e) => {
    setIsFocused(false);
    if (onBlur) onBlur(e);
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
    announceForAccessibility(
      showPassword ? 'Password hidden' : 'Password visible'
    );
  };

  const getInputStyle = () => {
    const baseStyle = styles.input;
    const focusStyle = isFocused ? getFocusStyle() : {};
    const errorStyleObj = error ? styles.inputError : {};
    const disabledStyle = disabled ? styles.inputDisabled : {};
    
    return [
      baseStyle,
      {
        backgroundColor: theme.colors.surface,
        borderColor: error 
          ? theme.colors.danger 
          : isFocused 
            ? theme.colors.primary 
            : theme.colors.border,
        color: theme.colors.text,
        fontSize: getScaledFontSize(16)
      },
      focusStyle,
      errorStyleObj,
      disabledStyle,
      isHighContrastEnabled && styles.highContrastInput,
      inputStyle
    ];
  };

  const getLabelStyle = () => {
    return [
      styles.label,
      {
        color: error 
          ? theme.colors.danger 
          : isFocused 
            ? theme.colors.primary 
            : theme.colors.text,
        fontSize: getScaledFontSize(14)
      },
      labelStyle
    ];
  };

  const getErrorStyle = () => {
    return [
      styles.errorText,
      {
        color: theme.colors.danger,
        fontSize: getScaledFontSize(12)
      },
      errorStyle
    ];
  };

  const getHelperStyle = () => {
    return [
      styles.helperText,
      {
        color: theme.colors.textSecondary,
        fontSize: getScaledFontSize(12)
      },
      helperStyle
    ];
  };

  // Generate unique IDs for accessibility relationships
  const inputId = testID || `input-${Math.random().toString(36).substr(2, 9)}`;
  const labelId = `${inputId}-label`;
  const errorId = `${inputId}-error`;
  const helperId = `${inputId}-helper`;

  // Build accessibility relationships
  const accessibilityLabelledBy = [labelId];
  const accessibilityDescribedBy = [];
  
  if (error) accessibilityDescribedBy.push(errorId);
  if (helperText && !error) accessibilityDescribedBy.push(helperId);

  // Generate input accessibility props
  const inputAccessibilityProps = getAccessibilityProps({
    label: accessibilityLabel || label,
    hint: accessibilityHint || helperText,
    role: 'none', // Let TextInput handle its own role
    state: {
      disabled: disabled,
      invalid: !!error,
      required: required
    },
    context: accessibilityContext
  });

  // Add specific TextInput accessibility props
  inputAccessibilityProps.accessibilityLabelledBy = accessibilityLabelledBy.join(' ');
  if (accessibilityDescribedBy.length > 0) {
    inputAccessibilityProps.accessibilityDescribedBy = accessibilityDescribedBy.join(' ');
  }

  return (
    <View style={[styles.container, style]}>
      {/* Label */}
      {label && (
        <Text
          style={getLabelStyle()}
          nativeID={labelId}
          {...getAccessibilityProps({
            label: `${label}${required ? ', required field' : ''}`,
            role: 'none', // Label is associated via labelledBy
            isImportant: false
          })}
        >
          {label}
          {required && <Text style={styles.requiredIndicator}> *</Text>}
        </Text>
      )}

      {/* Input Container */}
      <View style={styles.inputContainer}>
        <TextInput
          ref={inputRef}
          style={getInputStyle()}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textSecondary}
          editable={!disabled}
          secureTextEntry={secureTextEntry && !showPassword}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          maxLength={maxLength}
          multiline={multiline}
          numberOfLines={numberOfLines}
          onFocus={handleFocus}
          onBlur={handleBlur}
          testID={inputId}
          {...inputAccessibilityProps}
          {...props}
        />

        {/* Password Toggle Button */}
        {showPasswordToggle && secureTextEntry && (
          <TouchableOpacity
            style={[styles.passwordToggle, getTouchTargetStyle(32)]}
            onPress={togglePasswordVisibility}
            {...getAccessibilityProps({
              label: showPassword ? 'Hide password' : 'Show password',
              role: 'button',
              hint: 'Toggles password visibility'
            })}
          >
            <Text style={styles.passwordToggleText}>
              {showPassword ? '🙈' : '👁️'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Error Message */}
      {error && (
        <Text
          style={getErrorStyle()}
          nativeID={errorId}
          {...getAccessibilityProps({
            label: `Error: ${error}`,
            role: 'alert',
            isImportant: true
          })}
        >
          {error}
        </Text>
      )}

      {/* Helper Text */}
      {helperText && !error && (
        <Text
          style={getHelperStyle()}
          nativeID={helperId}
          {...getAccessibilityProps({
            label: helperText,
            role: 'none',
            isImportant: false
          })}
        >
          {helperText}
        </Text>
      )}

      {/* Character Count */}
      {maxLength && (
        <Text
          style={[getHelperStyle(), styles.characterCount]}
          {...getAccessibilityProps({
            label: `${value?.length || 0} of ${maxLength} characters`,
            role: 'none',
            isImportant: false
          })}
        >
          {value?.length || 0}/{maxLength}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16
  },
  label: {
    fontWeight: '500',
    marginBottom: 8,
    lineHeight: 18
  },
  requiredIndicator: {
    color: '#FF3B30'
  },
  inputContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center'
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 44,
    textAlignVertical: 'top'
  },
  inputError: {
    borderWidth: 2
  },
  inputDisabled: {
    opacity: 0.6
  },
  highContrastInput: {
    borderWidth: 2
  },
  passwordToggle: {
    position: 'absolute',
    right: 12,
    padding: 4
  },
  passwordToggleText: {
    fontSize: 16
  },
  errorText: {
    marginTop: 4,
    fontWeight: '500',
    lineHeight: 16
  },
  helperText: {
    marginTop: 4,
    lineHeight: 16
  },
  characterCount: {
    textAlign: 'right',
    marginTop: 4
  }
});

export default AccessibleInput;