import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useTheme } from '../context/ThemeContext';
import accessibilityHelper from '../utils/accessibility';
import gestureNavigationHelper from '../utils/gestureNavigation';

const AccessibilityScreen = ({ navigation }) => {
  const { 
    colors, 
    isHighContrast, 
    fontSize, 
    fontScale,
    toggleHighContrast, 
    setFontSize 
  } = useTheme();

  const [screenReaderEnabled, setScreenReaderEnabled] = useState(false);
  const [reduceMotionEnabled, setReduceMotionEnabled] = useState(false);
  const [oneHandedMode, setOneHandedMode] = useState(false);
  const [dominantHand, setDominantHand] = useState('right');
  const [voiceOverEnabled, setVoiceOverEnabled] = useState(false);

  useEffect(() => {
    // Load current accessibility states
    loadAccessibilityStates();
    
    // Listen for accessibility changes
    const unsubscribe = accessibilityHelper.addListener((event, data) => {
      switch (event) {
        case 'screenReaderChanged':
          setScreenReaderEnabled(data);
          break;
        case 'reduceMotionChanged':
          setReduceMotionEnabled(data);
          break;
      }
    });

    return unsubscribe;
  }, []);

  const loadAccessibilityStates = () => {
    setScreenReaderEnabled(accessibilityHelper.getScreenReaderEnabled());
    setReduceMotionEnabled(accessibilityHelper.getReduceMotionEnabled());
  };

  const handleHighContrastToggle = async () => {
    await toggleHighContrast();
    accessibilityHelper.announceForAccessibility(
      `High contrast mode ${!isHighContrast ? 'enabled' : 'disabled'}`
    );
  };

  const handleFontScaleChange = async (scale) => {
    const fontSizes = ['xs', 'sm', 'md', 'lg', 'xl', 'xxl', 'xxxl'];
    const scaleToSize = {
      0.8: 'xs',
      0.9: 'sm', 
      1.0: 'md',
      1.1: 'lg',
      1.2: 'xl',
      1.5: 'xxl',
      2.0: 'xxxl'
    };
    
    const newSize = scaleToSize[scale] || 'md';
    await setFontSize(newSize);
    
    accessibilityHelper.announceForAccessibility(
      `Font size changed to ${newSize}`
    );
  };

  const handleOneHandedModeToggle = () => {
    const newMode = !oneHandedMode;
    setOneHandedMode(newMode);
    gestureNavigationHelper.setOneHandedMode(newMode, dominantHand);
    
    accessibilityHelper.announceForAccessibility(
      `One-handed mode ${newMode ? 'enabled' : 'disabled'}`
    );
  };

  const handleDominantHandChange = () => {
    const newHand = dominantHand === 'right' ? 'left' : 'right';
    setDominantHand(newHand);
    
    if (oneHandedMode) {
      gestureNavigationHelper.setOneHandedMode(true, newHand);
    }
    
    accessibilityHelper.announceForAccessibility(
      `Dominant hand set to ${newHand}`
    );
  };

  const showGestureHelp = () => {
    const hints = gestureNavigationHelper.getGestureHints();
    const hintText = Object.values(hints).join('\n');
    
    Alert.alert(
      'Gesture Navigation Help',
      hintText,
      [{ text: 'OK', style: 'default' }],
      { cancelable: true }
    );
  };

  const testAccessibilityAnnouncement = () => {
    accessibilityHelper.announceForAccessibility(
      'This is a test accessibility announcement. Screen reader is working correctly.'
    );
  };

  const SettingItem = ({ 
    title, 
    description, 
    value, 
    onValueChange, 
    type = 'switch',
    icon,
    ...props 
  }) => (
    <View style={[styles.settingItem, { backgroundColor: colors.surface }]}>
      <View style={styles.settingContent}>
        <View style={styles.settingText}>
          <View style={styles.settingHeader}>
            {icon && (
              <Ionicons 
                name={icon} 
                size={20} 
                color={colors.primary} 
                style={styles.settingIcon}
              />
            )}
            <Text style={[styles.settingTitle, { color: colors.text }]}>
              {title}
            </Text>
          </View>
          {description && (
            <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
              {description}
            </Text>
          )}
        </View>
        
        <View style={styles.settingControl}>
          {type === 'switch' && (
            <Switch
              value={value}
              onValueChange={onValueChange}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={value ? colors.surface : colors.textSecondary}
              {...accessibilityHelper.getAccessibilityProps({
                label: `${title} toggle`,
                hint: `Double tap to ${value ? 'disable' : 'enable'} ${title}`,
                role: 'switch',
                state: { checked: value }
              })}
              {...props}
            />
          )}
          
          {type === 'button' && (
            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.primary }]}
              onPress={onValueChange}
              {...accessibilityHelper.getAccessibilityProps({
                label: title,
                hint: description,
                role: 'button'
              })}
            >
              <Text style={[styles.buttonText, { color: colors.surface }]}>
                {value}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          {...accessibilityHelper.getAccessibilityProps({
            label: 'Go back',
            hint: 'Navigate back to previous screen',
            role: 'button'
          })}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Accessibility Settings
        </Text>
      </View>

      <ScrollView 
        style={styles.scrollView}
        {...gestureNavigationHelper.getOneHandedScrollProps()}
        showsVerticalScrollIndicator={false}
      >
        {/* Vision Settings */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Vision
          </Text>
          
          <SettingItem
            title="High Contrast Mode"
            description="Increase contrast for better visibility"
            value={isHighContrast}
            onValueChange={handleHighContrastToggle}
            icon="contrast"
          />
          
          <View style={[styles.settingItem, { backgroundColor: colors.surface }]}>
            <View style={styles.settingContent}>
              <View style={styles.settingText}>
                <View style={styles.settingHeader}>
                  <Ionicons 
                    name="text" 
                    size={20} 
                    color={colors.primary} 
                    style={styles.settingIcon}
                  />
                  <Text style={[styles.settingTitle, { color: colors.text }]}>
                    Font Size
                  </Text>
                </View>
                <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                  Adjust text size for better readability (Current: {fontSize})
                </Text>
              </View>
            </View>
            
            <View style={styles.sliderContainer}>
              <Text style={[styles.sliderLabel, { color: colors.textSecondary }]}>
                Small
              </Text>
              <Slider
                style={styles.slider}
                minimumValue={0.8}
                maximumValue={2.0}
                step={0.1}
                value={fontScale}
                onValueChange={handleFontScaleChange}
                minimumTrackTintColor={colors.primary}
                maximumTrackTintColor={colors.border}
                thumbStyle={{ backgroundColor: colors.primary }}
                {...accessibilityHelper.getAccessibilityProps({
                  label: 'Font size slider',
                  hint: 'Slide to adjust font size',
                  role: 'adjustable',
                  value: { min: 0.8, max: 2.0, now: fontScale },
                  adjustable: true,
                  increment: 'Increase font size',
                  decrement: 'Decrease font size'
                })}
              />
              <Text style={[styles.sliderLabel, { color: colors.textSecondary }]}>
                Large
              </Text>
            </View>
          </View>
        </View>

        {/* Motor Settings */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Motor & Navigation
          </Text>
          
          <SettingItem
            title="One-Handed Mode"
            description="Optimize interface for one-handed use"
            value={oneHandedMode}
            onValueChange={handleOneHandedModeToggle}
            icon="hand-left"
          />
          
          <SettingItem
            title="Dominant Hand"
            description="Set your dominant hand for better navigation"
            value={dominantHand === 'right' ? 'Right' : 'Left'}
            onValueChange={handleDominantHandChange}
            type="button"
            icon="hand-right"
          />
          
          <SettingItem
            title="Gesture Help"
            description="Learn navigation gestures"
            value="View Guide"
            onValueChange={showGestureHelp}
            type="button"
            icon="help-circle"
          />
        </View>

        {/* Screen Reader Settings */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Screen Reader
          </Text>
          
          <View style={[styles.infoItem, { backgroundColor: colors.surface }]}>
            <Ionicons 
              name={screenReaderEnabled ? "checkmark-circle" : "close-circle"} 
              size={20} 
              color={screenReaderEnabled ? colors.success : colors.textSecondary} 
            />
            <Text style={[styles.infoText, { color: colors.text }]}>
              Screen Reader: {screenReaderEnabled ? 'Enabled' : 'Disabled'}
            </Text>
          </View>
          
          <View style={[styles.infoItem, { backgroundColor: colors.surface }]}>
            <Ionicons 
              name={reduceMotionEnabled ? "checkmark-circle" : "close-circle"} 
              size={20} 
              color={reduceMotionEnabled ? colors.success : colors.textSecondary} 
            />
            <Text style={[styles.infoText, { color: colors.text }]}>
              Reduce Motion: {reduceMotionEnabled ? 'Enabled' : 'Disabled'}
            </Text>
          </View>
          
          <SettingItem
            title="Test Announcement"
            description="Test screen reader functionality"
            value="Test Now"
            onValueChange={testAccessibilityAnnouncement}
            type="button"
            icon="volume-high"
          />
        </View>

        {/* Safety Features */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Safety Features
          </Text>
          
          <View style={[styles.infoItem, { backgroundColor: colors.surface }]}>
            <Ionicons name="information-circle" size={20} color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.text }]}>
              Emergency features are always accessible regardless of accessibility settings
            </Text>
          </View>
          
          <View style={[styles.infoItem, { backgroundColor: colors.surface }]}>
            <Ionicons name="shield-checkmark" size={20} color={colors.success} />
            <Text style={[styles.infoText, { color: colors.text }]}>
              Panic button uses large touch targets and haptic feedback
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginHorizontal: 16,
    marginBottom: 12,
    marginTop: 8,
  },
  settingItem: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  settingContent: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingText: {
    flex: 1,
    marginRight: 16,
  },
  settingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  settingIcon: {
    marginRight: 8,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  settingDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  settingControl: {
    alignItems: 'center',
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  slider: {
    flex: 1,
    marginHorizontal: 16,
    height: 40,
  },
  sliderLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  infoText: {
    fontSize: 14,
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
});

export default AccessibilityScreen;