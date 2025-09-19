import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions,
  ScrollView,
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

const RegisterScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [nameError, setNameError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  const { signUp } = useAuth();

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

  const validateName = (name) => {
    if (!name.trim()) {
      return 'Full name is required';
    }
    if (name.trim().length < 2) {
      return 'Name must be at least 2 characters';
    }
    return '';
  };

  const validateEmail = (email) => {
    if (!email) {
      return 'Email is required';
    }
    if (!emailRegex.test(email)) {
      return 'Please enter a valid email address';
    }
    return '';
  };

  const validatePassword = (password) => {
    if (!password) {
      return 'Password is required';
    }
    if (password.length < 6) {
      return 'Password must be at least 6 characters';
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return 'Password must contain uppercase, lowercase, and number';
    }
    return '';
  };

  const validateConfirmPassword = (confirmPassword, password) => {
    if (!confirmPassword) {
      return 'Please confirm your password';
    }
    if (confirmPassword !== password) {
      return 'Passwords do not match';
    }
    return '';
  };

  const handleRegister = async () => {
    // Clear previous errors
    setError('');
    setEmailError('');
    setPasswordError('');
    setNameError('');
    setConfirmPasswordError('');

    // Validate inputs
    const nameValidation = validateName(name);
    const emailValidation = validateEmail(email);
    const passwordValidation = validatePassword(password);
    const confirmPasswordValidation = validateConfirmPassword(confirmPassword, password);

    if (nameValidation) {
      setNameError(nameValidation);
    }
    if (emailValidation) {
      setEmailError(emailValidation);
    }
    if (passwordValidation) {
      setPasswordError(passwordValidation);
    }
    if (confirmPasswordValidation) {
      setConfirmPasswordError(confirmPasswordValidation);
    }

    if (nameValidation || emailValidation || passwordValidation || confirmPasswordValidation) {
      return;
    }

    try {
      setLoading(true);
      const result = await signUp(email, password, { displayName: name.trim() });
      
      if (result.success) {
        console.log('Registration successful');
        // Navigation will be handled automatically by the auth state change
      } else {
        setError(result.error || 'Registration failed. Please try again.');
      }
    } catch (error) {
      console.error('Registration error:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = () => {
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
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
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
                  <Ionicons name="person-add" size={64} color="#007AFF" />
                </View>
              </Animated.View>
              
              <Text style={styles.title}>Join Pravasi</Text>
              <Text style={styles.subtitle}>Create your safety companion account</Text>
            </Animated.View>

            {/* Animated Registration Form */}
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
                <Text style={styles.formTitle}>Create Account</Text>
                <Text style={styles.formSubtitle}>Start your safe journey today</Text>

                {/* Name Input */}
                <GlowingInput
                  label="Full Name"
                  value={name}
                  onChangeText={(text) => {
                    setName(text);
                    if (nameError) setNameError('');
                  }}
                  autoCapitalize="words"
                  autoCorrect={false}
                  leftIcon="person-outline"
                  error={nameError}
                />

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

                {/* Password Input */}
                <GlowingInput
                  label="Password"
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (passwordError) setPasswordError('');
                  }}
                  secureTextEntry={true}
                  autoCapitalize="none"
                  autoCorrect={false}
                  leftIcon="lock-closed-outline"
                  showPasswordToggle={true}
                  error={passwordError}
                />

                {/* Confirm Password Input */}
                <GlowingInput
                  label="Confirm Password"
                  value={confirmPassword}
                  onChangeText={(text) => {
                    setConfirmPassword(text);
                    if (confirmPasswordError) setConfirmPasswordError('');
                  }}
                  secureTextEntry={true}
                  autoCapitalize="none"
                  autoCorrect={false}
                  leftIcon="lock-closed-outline"
                  showPasswordToggle={true}
                  error={confirmPasswordError}
                />

                {/* General Error Display */}
                <GentleErrorDisplay error={error} />

                {/* Register Button */}
                <GlowingButton
                  title="Create Account"
                  onPress={handleRegister}
                  loading={loading}
                  disabled={loading}
                  variant="primary"
                  glowColor="#007AFF"
                  style={styles.registerButton}
                />
              </AnimatedCard>
            </Animated.View>

            {/* Footer */}
            <Animated.View
              style={[
                styles.footer,
                {
                  opacity: formAnim,
                },
              ]}
            >
              <Text style={styles.footerText}>
                Already have an account?{' '}
                <Text style={styles.footerLink} onPress={handleLogin}>
                  Sign In
                </Text>
              </Text>
            </Animated.View>
          </ScrollView>
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
            <Text style={styles.loadingText}>Creating your account...</Text>
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
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 20,
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
  },
  registerButton: {
    marginTop: 8,
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  footerText: {
    fontSize: 16,
    color: '#6C757D',
    textAlign: 'center',
  },
  footerLink: {
    color: '#007AFF',
    fontWeight: '600',
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

export default RegisterScreen;