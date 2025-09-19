import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
// Try to import glowing components, fallback to simple ones
let GlowingInput, GlowingButton, AnimatedCard, GentleErrorDisplay, AnimatedLoadingIndicator;

try {
  GlowingInput = require('../components/common/GlowingInput').default;
  GlowingButton = require('../components/common/GlowingButton').default;
  AnimatedCard = require('../components/common/AnimatedCard').default;
  GentleErrorDisplay = require('../components/common/GentleErrorDisplay').default;
  AnimatedLoadingIndicator = require('../components/common/AnimatedLoadingIndicator').default;
} catch (error) {
  console.log('Using simple components as fallback');
  GlowingInput = require('../components/common/SimpleInput').default;
  GlowingButton = require('../components/common/SimpleButton').default;
  AnimatedCard = ({ children, style }) => <View style={[{ backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20 }, style]}>{children}</View>;
  GentleErrorDisplay = ({ error }) => error ? <Text style={{ color: '#FF3B30', fontSize: 14, marginVertical: 8 }}>{error}</Text> : null;
  AnimatedLoadingIndicator = ({ size = 40, color = '#007AFF' }) => <ActivityIndicator size={size} color={color} />;
}

const { width, height } = Dimensions.get('window');
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ForgotPasswordScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [success, setSuccess] = useState(false);

  const { resetPassword } = useAuth();

  // Animation refs
  const logoAnim = useRef(new Animated.Value(0)).current;
  const titleAnim = useRef(new Animated.Value(0)).current;
  const formAnim = useRef(new Animated.Value(0)).current;
  const backgroundAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Staggered entrance animations
    Animated.sequence([
      Animated.timing(backgroundAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: false,
      }),
      Animated.parallel([
        Animated.spring(logoAnim, {
          toValue: 1,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(titleAnim, {
          toValue: 1,
          duration: 600,
          delay: 200,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(formAnim, {
        toValue: 1,
        duration: 500,
        delay: 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const validateEmail = (email) => {
    if (!email) {
      return 'Email is required';
    }
    if (!emailRegex.test(email)) {
      return 'Please enter a valid email address';
    }
    return '';
  };

  const handleResetPassword = async () => {
    // Clear previous errors
    setError('');
    setEmailError('');

    // Validate email
    const emailValidation = validateEmail(email);
    if (emailValidation) {
      setEmailError(emailValidation);
      return;
    }

    try {
      setLoading(true);
      const result = await resetPassword(email);
      
      if (result.success) {
        setSuccess(true);
        Alert.alert(
          'Password Reset Email Sent',
          'Please check your email for instructions to reset your password.',
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('Login')
            }
          ]
        );
      } else {
        setError(result.error || 'Failed to send reset email. Please try again.');
      }
    } catch (error) {
      console.error('Reset password error:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    navigation.navigate('Login');
  };

  const backgroundOpacity = backgroundAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <View style={styles.container}>
      {/* Animated Background Gradient */}
      <Animated.View style={[styles.backgroundContainer, { opacity: backgroundOpacity }]}>
        <LinearGradient
          colors={['#F8F9FA', '#E9ECEF', '#DEE2E6']}
          style={styles.backgroundGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      </Animated.View>

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <View style={styles.content}>
            {/* Animated Header */}
            <Animated.View 
              style={[
                styles.header,
                {
                  opacity: titleAnim,
                  transform: [
                    {
                      translateY: titleAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [50, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Animated.View
                style={[
                  styles.logoContainer,
                  {
                    transform: [
                      { scale: logoAnim },
                      {
                        rotate: logoAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0deg', '360deg'],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <View style={styles.logoGlow}>
                  <Ionicons name="key" size={64} color="#007AFF" />
                </View>
              </Animated.View>
              
              <Text style={styles.title}>Pravasi</Text>
              <Text style={styles.subtitle}>Reset your password</Text>
            </Animated.View>

            {/* Animated Form */}
            <Animated.View
              style={[
                styles.formContainer,
                {
                  opacity: formAnim,
                  transform: [
                    {
                      translateY: formAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [30, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <AnimatedCard
                style={styles.formCard}
                glowColor="#007AFF"
                gradient={true}
                gradientColors={['#FFFFFF', '#FBFCFD']}
              >
                <Text style={styles.formTitle}>Forgot Password?</Text>
                <Text style={styles.formSubtitle}>
                  Enter your email address and we'll send you instructions to reset your password.
                </Text>

                {/* Email Input */}
                <GlowingInput
                  label="Email Address"
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (emailError) setEmailError('');
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  leftIcon="mail-outline"
                  error={emailError}
                />

                {/* General Error Display */}
                <GentleErrorDisplay error={error} />

                {/* Success Message */}
                {success && (
                  <View style={styles.successContainer}>
                    <Ionicons name="checkmark-circle" size={24} color="#28A745" />
                    <Text style={styles.successText}>
                      Reset email sent! Check your inbox.
                    </Text>
                  </View>
                )}

                {/* Reset Button */}
                <GlowingButton
                  title="Send Reset Link"
                  onPress={handleResetPassword}
                  loading={loading}
                  disabled={loading || success}
                  variant="primary"
                  glowColor="#007AFF"
                  style={styles.resetButton}
                />

                {/* Back to Login Button */}
                <GlowingButton
                  title="Back to Login"
                  onPress={handleBackToLogin}
                  disabled={loading}
                  variant="secondary"
                  glowColor="#6C757D"
                  style={styles.backButton}
                />
              </AnimatedCard>
            </Animated.View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Full Screen Loading Overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <AnimatedCard
            style={styles.loadingCard}
            glowColor="#007AFF"
          >
            <AnimatedLoadingIndicator
              size={50}
              color="#007AFF"
              glowColor="#007AFF"
            />
            <Text style={styles.loadingText}>Sending reset email...</Text>
          </AnimatedCard>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  backgroundContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  backgroundGradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    minHeight: height * 0.8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    marginBottom: 20,
  },
  logoGlow: {
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1D1D1F',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 18,
    color: '#6C757D',
    textAlign: 'center',
    fontWeight: '400',
  },
  formContainer: {
    marginBottom: 30,
  },
  formCard: {
    marginHorizontal: 0,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1D1D1F',
    textAlign: 'center',
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: 16,
    color: '#6C757D',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D4EDDA',
    borderLeftWidth: 4,
    borderLeftColor: '#28A745',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginVertical: 16,
  },
  successText: {
    flex: 1,
    fontSize: 14,
    color: '#155724',
    marginLeft: 12,
    fontWeight: '500',
  },
  resetButton: {
    marginTop: 8,
  },
  backButton: {
    marginTop: 12,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingCard: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 40,
    marginHorizontal: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#1D1D1F',
    marginTop: 16,
    fontWeight: '500',
  },
});

export default ForgotPasswordScreen;