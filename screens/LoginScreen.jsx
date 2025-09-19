import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
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

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const { signIn } = useAuth();
  const { colors } = useTheme();

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
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
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
    return '';
  };

  const handleLogin = async () => {
    // Clear previous errors
    setError('');
    setEmailError('');
    setPasswordError('');

    // Validate inputs
    const emailValidation = validateEmail(email);
    const passwordValidation = validatePassword(password);

    if (emailValidation) {
      setEmailError(emailValidation);
    }
    if (passwordValidation) {
      setPasswordError(passwordValidation);
    }

    if (emailValidation || passwordValidation) {
      return;
    }

    try {
      setLoading(true);
      const result = await signIn(email, password);
      
      if (result.success) {
        console.log('Login successful');
        // Navigation will be handled automatically by the auth state change
      } else {
        setError(result.error || 'Invalid email or password. Please try again.');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setEmail('demo@touristsafety.com');
    setPassword('demo123');
    
    // Clear errors and trigger login after state update
    setError('');
    setEmailError('');
    setPasswordError('');
    
    setTimeout(() => {
      handleLogin();
    }, 100);
  };

  const handleForgotPassword = () => {
    navigation.navigate('ForgotPassword');
  };

  const handleRegister = () => {
    navigation.navigate('Register');
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
                  <Ionicons name="shield-checkmark" size={64} color="#007AFF" />
                </View>
              </Animated.View>
              
              <Text style={styles.title}>Pravasi</Text>
              <Text style={styles.subtitle}>Your digital safety companion</Text>
            </Animated.View>

            {/* Animated Login Form */}
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
                <Text style={styles.formTitle}>Welcome Back</Text>
                <Text style={styles.formSubtitle}>Sign in to continue your journey</Text>

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

                {/* General Error Display */}
                <GentleErrorDisplay error={error} />

                {/* Login Button */}
                <GlowingButton
                  title="Sign In"
                  onPress={handleLogin}
                  loading={loading}
                  disabled={loading}
                  variant="primary"
                  glowColor="#007AFF"
                  style={styles.loginButton}
                />

                {/* Demo Button */}
                <GlowingButton
                  title="Try Demo Account"
                  onPress={handleDemoLogin}
                  disabled={loading}
                  variant="secondary"
                  glowColor="#6C757D"
                  style={styles.demoButton}
                />

                {/* Forgot Password Link */}
                <View style={styles.linkContainer}>
                  <Text 
                    style={styles.linkText}
                    onPress={handleForgotPassword}
                  >
                    Forgot your password?
                  </Text>
                </View>
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
                Don't have an account?{' '}
                <Text style={styles.footerLink} onPress={handleRegister}>
                  Sign Up
                </Text>
              </Text>
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
            <Text style={styles.loadingText}>Signing you in...</Text>
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
  },
  loginButton: {
    marginTop: 8,
  },
  demoButton: {
    marginTop: 12,
  },
  linkContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  linkText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
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

export default LoginScreen;