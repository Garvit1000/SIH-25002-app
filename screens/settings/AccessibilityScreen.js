import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Switch,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Slider } from '@react-native-community/slider';
import { useTheme } from '../../context/ThemeContext';
import { useAccessibility } from '../../context/AccessibilityContext';

const AccessibilityScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const {
    isHighContrastEnabled,
    highContrastMode,
    fontScale,
    maxFontScale,
    minFontScale,
    isScreenReaderEnabled,
    reduceMotionEnabled,
    oneHandedModeEnabled,
    preferredTouchTargetSize,
    focusRingEnabled,
    screenSize,
    deviceCapabilities,
    toggleHighContrast,
    setHighContrastMode,
    setFontScale,
    toggleOneHandedMode,
    setTouchTargetSize,
    announceForAccessibility,
    getAccessibilityProps,
    getTouchTargetStyle,
    getFocusStyle,
    resetAccessibilitySettings
  } = useAccessibility();

  const [showAdvanced, setShowAdvanced] = useState(false);

  const styles = createStyles(theme, isHighContrastEnabled, fontScale);

  const handleFontScaleChange = (value) => {
    setFontScale(value);
    // Announce the change for screen readers
    const percentage = Math.round(value * 100);
    announceForAccessibility(`Font size set to ${percentage} percent`);
  };

  const handleTouchTargetSizeChange = (value) => {
    setTouchTargetSize(value);
    announceForAccessibility(`Touch target size set to ${Math.round(value)} pixels`);
  };

  const handleResetSettings = () => {
    Alert.alert(
      'Reset Accessibility Settings',
      'This will reset all accessibility settings to their default values. Are you sure?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            resetAccessibilitySettings();
            announceForAccessibility('Accessibility settings have been reset');
          }
        }
      ]
    );
  };

  const SettingRow = ({ 
    title, 
    description, 
    children, 
    testID,
    accessibilityHint 
  }) => (
    <View 
      style={[styles.settingRow, getFocusStyle()]}
      {...getAccessibilityProps({
        label: title,
        hint: accessibilityHint || description,
        role: 'none'
      })}
      testID={testID}
    >
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        {description && (
          <Text style={styles.settingDescription}>{description}</Text>
        )}
      </View>
      <View style={styles.settingControl}>
        {children}
      </View>
    </View>
  );

  const SectionHeader = ({ title, accessibilityLevel = 2 }) => (
    <Text 
      style={styles.sectionHeader}
      {...getAccessibilityProps({
        label: title,
        role: 'header',
        context: `Section ${accessibilityLevel}`
      })}
    >
      {title}
    </Text>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        {...getAccessibilityProps({
          label: 'Accessibility settings',
          role: 'scrollbar'
        })}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text 
            style={styles.title}
            {...getAccessibilityProps({
              label: 'Accessibility Settings',
              role: 'header',
              context: 'Main heading'
            })}
          >
            Accessibility Settings
          </Text>
          <Text style={styles.subtitle}>
            Customize the app to meet your accessibility needs
          </Text>
        </View>

        {/* Vision Section */}
        <SectionHeader title="Vision" />
        
        <SettingRow
          title="High Contrast Mode"
          description="Increases color contrast for better visibility"
          testID="high-contrast-toggle"
          accessibilityHint="Toggles high contrast colors throughout the app"
        >
          <Switch
            value={isHighContrastEnabled}
            onValueChange={toggleHighContrast}
            trackColor={{ 
              false: theme.colors.border, 
              true: theme.colors.primary 
            }}
            thumbColor={isHighContrastEnabled ? theme.colors.background : theme.colors.textSecondary}
            style={getTouchTargetStyle(31)}
            {...getAccessibilityProps({
              label: `High contrast mode ${isHighContrastEnabled ? 'enabled' : 'disabled'}`,
              role: 'switch',
              state: { checked: isHighContrastEnabled }
            })}
          />
        </SettingRow>

        {isHighContrastEnabled && (
          <SettingRow
            title="High Contrast Theme"
            description="Choose between light and dark high contrast themes"
            testID="high-contrast-theme"
          >
            <View style={styles.segmentedControl}>
              {['light', 'dark'].map((mode) => (
                <TouchableOpacity
                  key={mode}
                  style={[
                    styles.segmentButton,
                    getTouchTargetStyle(),
                    highContrastMode === mode && styles.segmentButtonActive,
                    getFocusStyle()
                  ]}
                  onPress={() => setHighContrastMode(mode)}
                  {...getAccessibilityProps({
                    label: `${mode} theme`,
                    role: 'button',
                    state: { selected: highContrastMode === mode },
                    hint: `Switch to ${mode} high contrast theme`
                  })}
                >
                  <Text style={[
                    styles.segmentButtonText,
                    highContrastMode === mode && styles.segmentButtonTextActive
                  ]}>
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </SettingRow>
        )}

        <SettingRow
          title="Font Size"
          description={`Current size: ${Math.round(fontScale * 100)}% (supports up to 200%)`}
          testID="font-size-slider"
          accessibilityHint="Adjusts text size throughout the app"
        >
          <View style={styles.sliderContainer}>
            <Slider
              style={styles.slider}
              minimumValue={minFontScale}
              maximumValue={maxFontScale}
              value={fontScale}
              onValueChange={handleFontScaleChange}
              step={0.1}
              minimumTrackTintColor={theme.colors.primary}
              maximumTrackTintColor={theme.colors.border}
              thumbStyle={getTouchTargetStyle(20)}
              {...getAccessibilityProps({
                label: `Font size slider, currently ${Math.round(fontScale * 100)} percent`,
                role: 'adjustable',
                value: { 
                  min: Math.round(minFontScale * 100),
                  max: Math.round(maxFontScale * 100),
                  now: Math.round(fontScale * 100)
                },
                adjustable: true,
                increment: 'Increase font size',
                decrement: 'Decrease font size'
              })}
            />
            <View style={styles.sliderLabels}>
              <Text style={styles.sliderLabel}>80%</Text>
              <Text style={styles.sliderLabel}>200%</Text>
            </View>
          </View>
        </SettingRow>

        {/* Motor Section */}
        <SectionHeader title="Motor" />

        <SettingRow
          title="One-Handed Mode"
          description={`Optimizes layout for ${screenSize} screens and thumb reach`}
          testID="one-handed-toggle"
          accessibilityHint="Moves important controls within thumb reach"
        >
          <Switch
            value={oneHandedModeEnabled}
            onValueChange={toggleOneHandedMode}
            trackColor={{ 
              false: theme.colors.border, 
              true: theme.colors.primary 
            }}
            thumbColor={oneHandedModeEnabled ? theme.colors.background : theme.colors.textSecondary}
            style={getTouchTargetStyle(31)}
            {...getAccessibilityProps({
              label: `One-handed mode ${oneHandedModeEnabled ? 'enabled' : 'disabled'}`,
              role: 'switch',
              state: { checked: oneHandedModeEnabled }
            })}
          />
        </SettingRow>

        <SettingRow
          title="Touch Target Size"
          description={`Current size: ${Math.round(preferredTouchTargetSize)}px (minimum 44px)`}
          testID="touch-target-slider"
          accessibilityHint="Makes buttons and controls larger for easier tapping"
        >
          <View style={styles.sliderContainer}>
            <Slider
              style={styles.slider}
              minimumValue={44}
              maximumValue={64}
              value={preferredTouchTargetSize}
              onValueChange={handleTouchTargetSizeChange}
              step={2}
              minimumTrackTintColor={theme.colors.primary}
              maximumTrackTintColor={theme.colors.border}
              thumbStyle={getTouchTargetStyle(20)}
              {...getAccessibilityProps({
                label: `Touch target size slider, currently ${Math.round(preferredTouchTargetSize)} pixels`,
                role: 'adjustable',
                value: { 
                  min: 44,
                  max: 64,
                  now: Math.round(preferredTouchTargetSize)
                },
                adjustable: true,
                increment: 'Increase touch target size',
                decrement: 'Decrease touch target size'
              })}
            />
            <View style={styles.sliderLabels}>
              <Text style={styles.sliderLabel}>44px</Text>
              <Text style={styles.sliderLabel}>64px</Text>
            </View>
          </View>
        </SettingRow>

        {/* System Information */}
        <SectionHeader title="System Status" />

        <SettingRow
          title="Screen Reader"
          description={isScreenReaderEnabled ? 
            `${Platform.OS === 'ios' ? 'VoiceOver' : 'TalkBack'} is enabled` : 
            `${Platform.OS === 'ios' ? 'VoiceOver' : 'TalkBack'} is disabled`
          }
          testID="screen-reader-status"
        >
          <View style={[
            styles.statusIndicator,
            { backgroundColor: isScreenReaderEnabled ? theme.colors.success : theme.colors.textSecondary }
          ]} />
        </SettingRow>

        {Platform.OS === 'ios' && (
          <SettingRow
            title="Reduce Motion"
            description={reduceMotionEnabled ? 
              'System reduce motion is enabled' : 
              'System reduce motion is disabled'
            }
            testID="reduce-motion-status"
          >
            <View style={[
              styles.statusIndicator,
              { backgroundColor: reduceMotionEnabled ? theme.colors.success : theme.colors.textSecondary }
            ]} />
          </SettingRow>
        )}

        {/* Advanced Settings */}
        <TouchableOpacity
          style={[styles.advancedToggle, getTouchTargetStyle(), getFocusStyle()]}
          onPress={() => setShowAdvanced(!showAdvanced)}
          {...getAccessibilityProps({
            label: 'Advanced settings',
            role: 'button',
            state: { expanded: showAdvanced },
            hint: showAdvanced ? 'Hide advanced settings' : 'Show advanced settings'
          })}
        >
          <Text style={styles.advancedToggleText}>
            {showAdvanced ? '▼' : '▶'} Advanced Settings
          </Text>
        </TouchableOpacity>

        {showAdvanced && (
          <View style={styles.advancedSection}>
            <SettingRow
              title="Device Capabilities"
              description="Supported accessibility features on this device"
              testID="device-capabilities"
            >
              <View style={styles.capabilitiesList}>
                <Text style={styles.capabilityItem}>
                  VoiceOver: {deviceCapabilities.supportsVoiceOver ? '✓' : '✗'}
                </Text>
                <Text style={styles.capabilityItem}>
                  TalkBack: {deviceCapabilities.supportsTalkBack ? '✓' : '✗'}
                </Text>
                <Text style={styles.capabilityItem}>
                  Reduce Motion: {deviceCapabilities.supportsReduceMotion ? '✓' : '✗'}
                </Text>
                <Text style={styles.capabilityItem}>
                  Haptics: {deviceCapabilities.supportsHaptics ? '✓' : '✗'}
                </Text>
              </View>
            </SettingRow>

            <TouchableOpacity
              style={[styles.resetButton, getTouchTargetStyle(), getFocusStyle()]}
              onPress={handleResetSettings}
              {...getAccessibilityProps({
                label: 'Reset all accessibility settings',
                role: 'button',
                hint: 'Resets all accessibility settings to default values'
              })}
            >
              <Text style={styles.resetButtonText}>Reset All Settings</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            These settings help make the Tourist Safety App more accessible. 
            Changes are saved automatically and apply throughout the app.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (theme, isHighContrast, fontScale) => {
  const getScaledSize = (size) => Math.round(size * fontScale);
  
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background
    },
    scrollView: {
      flex: 1
    },
    scrollContent: {
      paddingBottom: 32
    },
    header: {
      padding: 24,
      borderBottomWidth: isHighContrast ? 2 : 1,
      borderBottomColor: theme.colors.border
    },
    title: {
      fontSize: getScaledSize(28),
      fontWeight: 'bold',
      color: theme.colors.text,
      marginBottom: 8
    },
    subtitle: {
      fontSize: getScaledSize(16),
      color: theme.colors.textSecondary,
      lineHeight: getScaledSize(22)
    },
    sectionHeader: {
      fontSize: getScaledSize(20),
      fontWeight: '600',
      color: theme.colors.text,
      marginTop: 32,
      marginBottom: 16,
      marginHorizontal: 24
    },
    settingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingVertical: 16,
      borderBottomWidth: isHighContrast ? 1 : 0.5,
      borderBottomColor: theme.colors.border,
      minHeight: 60
    },
    settingContent: {
      flex: 1,
      marginRight: 16
    },
    settingTitle: {
      fontSize: getScaledSize(16),
      fontWeight: '500',
      color: theme.colors.text,
      marginBottom: 4
    },
    settingDescription: {
      fontSize: getScaledSize(14),
      color: theme.colors.textSecondary,
      lineHeight: getScaledSize(18)
    },
    settingControl: {
      alignItems: 'flex-end'
    },
    segmentedControl: {
      flexDirection: 'row',
      borderRadius: 8,
      borderWidth: isHighContrast ? 2 : 1,
      borderColor: theme.colors.border,
      overflow: 'hidden'
    },
    segmentButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: theme.colors.surface,
      minWidth: 60,
      alignItems: 'center'
    },
    segmentButtonActive: {
      backgroundColor: theme.colors.primary
    },
    segmentButtonText: {
      fontSize: getScaledSize(14),
      color: theme.colors.text,
      fontWeight: '500'
    },
    segmentButtonTextActive: {
      color: theme.colors.background
    },
    sliderContainer: {
      width: 200,
      alignItems: 'center'
    },
    slider: {
      width: '100%',
      height: 40
    },
    sliderLabels: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      width: '100%',
      marginTop: 4
    },
    sliderLabel: {
      fontSize: getScaledSize(12),
      color: theme.colors.textSecondary
    },
    statusIndicator: {
      width: 12,
      height: 12,
      borderRadius: 6,
      marginLeft: 8
    },
    advancedToggle: {
      paddingHorizontal: 24,
      paddingVertical: 16,
      borderBottomWidth: isHighContrast ? 1 : 0.5,
      borderBottomColor: theme.colors.border
    },
    advancedToggleText: {
      fontSize: getScaledSize(16),
      fontWeight: '500',
      color: theme.colors.primary
    },
    advancedSection: {
      backgroundColor: theme.colors.surface,
      marginHorizontal: 16,
      borderRadius: 12,
      marginTop: 8,
      marginBottom: 16
    },
    capabilitiesList: {
      alignItems: 'flex-end'
    },
    capabilityItem: {
      fontSize: getScaledSize(12),
      color: theme.colors.textSecondary,
      marginBottom: 2
    },
    resetButton: {
      margin: 16,
      padding: 16,
      backgroundColor: theme.colors.danger,
      borderRadius: 8,
      alignItems: 'center'
    },
    resetButtonText: {
      fontSize: getScaledSize(16),
      fontWeight: '600',
      color: theme.colors.background
    },
    footer: {
      padding: 24,
      marginTop: 16
    },
    footerText: {
      fontSize: getScaledSize(14),
      color: theme.colors.textSecondary,
      lineHeight: getScaledSize(20),
      textAlign: 'center'
    }
  });
};

export default AccessibilityScreen;