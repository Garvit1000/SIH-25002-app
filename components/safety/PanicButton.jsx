import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Vibration,
  Alert,
  Dimensions,
  Linking,
} from 'react-native';
import { useSafety } from '../../context/SafetyContext';
import { useLocation } from '../../context/LocationContext';
import { useAuth } from '../../context/AuthContext';
import { EMERGENCY_NUMBERS } from '../../utils/constants';

const { width } = Dimensions.get('window');

const PanicButton = ({ size = 'large', style = {} }) => {
  const { activatePanicMode, deactivatePanicMode, panicMode, isEmergencyActive } = useSafety();
  const { currentLocation } = useLocation();
  const { profile } = useAuth();
  const [isPressed, setIsPressed] = useState(false);
  const [countdown, setCountdown] = useState(0);
  
  // Animation values
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  
  // Countdown timer ref
  const countdownTimer = useRef(null);

  // Button sizes
  const buttonSizes = {
    small: 80,
    medium: 120,
    large: 160,
  };

  const buttonSize = buttonSizes[size] || buttonSizes.large;

  useEffect(() => {
    if (panicMode) {
      startPulseAnimation();
    } else {
      stopPulseAnimation();
    }
  }, [panicMode]);

  useEffect(() => {
    return () => {
      if (countdownTimer.current) {
        clearInterval(countdownTimer.current);
      }
    };
  }, []);

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const stopPulseAnimation = () => {
    pulseAnim.stopAnimation();
    Animated.timing(pulseAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const startCountdown = () => {
    setCountdown(3);
    setIsPressed(true);
    
    // Vibration pattern for countdown
    Vibration.vibrate([0, 200, 100, 200, 100, 200]);
    
    // Start rotation animation
    Animated.timing(rotateAnim, {
      toValue: 1,
      duration: 3000,
      useNativeDriver: true,
    }).start();

    countdownTimer.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownTimer.current);
          triggerEmergency();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const cancelCountdown = () => {
    if (countdownTimer.current) {
      clearInterval(countdownTimer.current);
    }
    setCountdown(0);
    setIsPressed(false);
    
    // Reset animations
    rotateAnim.setValue(0);
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const triggerEmergency = async () => {
    try {
      // Strong vibration for emergency activation
      Vibration.vibrate([0, 500, 200, 500]);
      
      if (!currentLocation) {
        Alert.alert(
          'Location Required',
          'Location access is required for emergency alerts. Please enable location services.',
          [{ text: 'OK' }]
        );
        cancelCountdown();
        return;
      }

      if (!profile?.emergencyContacts || profile.emergencyContacts.length === 0) {
        Alert.alert(
          'No Emergency Contacts',
          'Please add emergency contacts in your profile before using the panic button.',
          [{ text: 'OK' }]
        );
        cancelCountdown();
        return;
      }

      await activatePanicMode(currentLocation, profile, profile.emergencyContacts);
      setIsPressed(false);
      
      // Show emergency screen
      showEmergencyScreen();
      
    } catch (error) {
      console.error('Error triggering emergency:', error);
      Alert.alert('Error', 'Failed to send emergency alert. Please try again.');
      cancelCountdown();
    }
  };

  const showEmergencyScreen = () => {
    Alert.alert(
      '🚨 EMERGENCY ACTIVATED',
      'Emergency contacts have been notified with your location.\n\nLocal Emergency Numbers:\n' +
      `Police: ${EMERGENCY_NUMBERS.POLICE}\n` +
      `Medical: ${EMERGENCY_NUMBERS.MEDICAL}\n` +
      `Fire: ${EMERGENCY_NUMBERS.FIRE}\n` +
      `Tourist Helpline: ${EMERGENCY_NUMBERS.TOURIST_HELPLINE}`,
      [
        {
          text: 'Call Police',
          onPress: () => callEmergencyNumber(EMERGENCY_NUMBERS.POLICE),
        },
        {
          text: 'Call Medical',
          onPress: () => callEmergencyNumber(EMERGENCY_NUMBERS.MEDICAL),
        },
        {
          text: 'Deactivate',
          style: 'cancel',
          onPress: deactivatePanicMode,
        },
      ],
      { cancelable: false }
    );
  };

  const callEmergencyNumber = (number) => {
    const url = `tel:${number}`;
    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(url);
        } else {
          Alert.alert('Error', 'Phone calls are not supported on this device');
        }
      })
      .catch((err) => {
        console.error('Error making emergency call:', err);
        Alert.alert('Error', 'Failed to make emergency call');
      });
  };

  const handlePressIn = () => {
    if (panicMode) return;
    
    Animated.timing(scaleAnim, {
      toValue: 0.95,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    if (panicMode) return;
    
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = () => {
    if (panicMode) {
      // If already in panic mode, show options to deactivate or call emergency
      Alert.alert(
        'Emergency Active',
        'Emergency mode is currently active. What would you like to do?',
        [
          {
            text: 'Call Police',
            onPress: () => callEmergencyNumber(EMERGENCY_NUMBERS.POLICE),
          },
          {
            text: 'Deactivate',
            style: 'destructive',
            onPress: deactivatePanicMode,
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ]
      );
      return;
    }

    if (isPressed) {
      cancelCountdown();
      return;
    }

    // Show confirmation before starting countdown
    Alert.alert(
      'Emergency Alert',
      'This will send your location to emergency contacts and local authorities. Hold the button for 3 seconds to activate.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Start Emergency',
          style: 'destructive',
          onPress: startCountdown,
        },
      ]
    );
  };

  const getButtonColor = () => {
    if (panicMode) return '#FF3B30';
    if (isPressed) return '#FF6B6B';
    return '#FF3B30';
  };

  const getButtonText = () => {
    if (panicMode) return 'EMERGENCY\nACTIVE';
    if (isPressed && countdown > 0) return countdown.toString();
    return 'PANIC\nBUTTON';
  };

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={[styles.container, style]}>
      <Animated.View
        style={[
          styles.buttonContainer,
          {
            width: buttonSize,
            height: buttonSize,
            transform: [
              { scale: Animated.multiply(scaleAnim, pulseAnim) },
              { rotate: spin },
            ],
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.panicButton,
            {
              backgroundColor: getButtonColor(),
              width: buttonSize,
              height: buttonSize,
              borderRadius: buttonSize / 2,
            },
          ]}
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.8}
          disabled={false}
          testID="panic-button"
        >
          <Text style={[styles.buttonText, { fontSize: buttonSize * 0.12 }]}>
            {getButtonText()}
          </Text>
          
          {isPressed && countdown > 0 && (
            <View style={styles.countdownContainer}>
              <Text style={styles.countdownText}>Release to cancel</Text>
            </View>
          )}
          
          {panicMode && (
            <View style={styles.activeIndicator}>
              <Text style={styles.activeIndicatorText}>🚨</Text>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
      
      {isPressed && (
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={cancelCountdown}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  panicButton: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 15,
    borderWidth: 4,
    borderColor: '#fff',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  countdownContainer: {
    position: 'absolute',
    bottom: 10,
  },
  countdownText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  activeIndicator: {
    position: 'absolute',
    top: 10,
  },
  activeIndicatorText: {
    fontSize: 20,
  },
  cancelButton: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#666',
    borderRadius: 20,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default PanicButton;