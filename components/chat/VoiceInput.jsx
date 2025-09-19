import React, { useState, useEffect } from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  Alert,
  Animated,
  View
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { speechService } from '../../services/ai/speechService';
import { multilingualUIService } from '../../services/ai/multilingualUI';

const VoiceInput = ({ onTranscript, language = 'en', style }) => {
  const [isListening, setIsListening] = useState(false);
  const [animatedValue] = useState(new Animated.Value(1));

  useEffect(() => {
    if (isListening) {
      startPulseAnimation();
    } else {
      stopPulseAnimation();
    }
  }, [isListening]);

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1.3,
          duration: 600,
          useNativeDriver: true
        }),
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true
        })
      ])
    ).start();
  };

  const stopPulseAnimation = () => {
    animatedValue.stopAnimation();
    Animated.timing(animatedValue, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true
    }).start();
  };

  const startListening = async () => {
    try {
      setIsListening(true);
      
      // Process voice input using speech service
      const result = await speechService.processVoiceInput(null, language);
      
      setIsListening(false);
      
      if (result.success) {
        if (onTranscript) {
          onTranscript(result.originalTranscript);
        }
      } else {
        throw new Error(result.error);
      }

    } catch (error) {
      console.error('Voice input error:', error);
      setIsListening(false);
      Alert.alert(
        'Voice Input Error',
        'Unable to process voice input. Please check permissions and try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const stopListening = () => {
    setIsListening(false);
  };

  const handlePress = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const requestMicrophonePermission = async () => {
    // In production, you would request actual microphone permissions
    // For now, we'll simulate permission granted
    return true;
  };

  const handleLongPress = () => {
    Alert.alert(
      'Voice Input Help',
      'Tap to start voice input. The app will listen for your speech and convert it to text. Make sure you\'re in a quiet environment for best results.',
      [{ text: 'Got it' }]
    );
  };

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={handlePress}
      onLongPress={handleLongPress}
      activeOpacity={0.7}
    >
      <Animated.View 
        style={[
          styles.button,
          isListening && styles.listeningButton,
          { transform: [{ scale: animatedValue }] }
        ]}
      >
        <Ionicons
          name={isListening ? "stop" : "mic"}
          size={20}
          color={isListening ? "#FFFFFF" : "#007AFF"}
        />
      </Animated.View>
      
      {isListening && (
        <View style={styles.listeningIndicator}>
          <View style={styles.soundWave} />
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative'
  },
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F0F8FF',
    borderWidth: 2,
    borderColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center'
  },
  listeningButton: {
    backgroundColor: '#FF3B30',
    borderColor: '#FF3B30'
  },
  listeningIndicator: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#FF3B30',
    opacity: 0.3
  },
  soundWave: {
    flex: 1,
    borderRadius: 22,
    backgroundColor: 'transparent'
  }
});

export default VoiceInput;