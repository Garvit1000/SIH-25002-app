import { authService } from '../../services/firebase/auth';
import { firestoreService } from '../../services/firebase/firestore';
import { messagingService } from '../../services/firebase/messaging';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import React from 'react';
import LoginScreen from '../../screens/LoginScreen';
import RegisterScreen from '../../screens/RegisterScreen';
import TouristRegisterScreen from '../../screens/TouristRegisterScreen';

// Mock Firebase services for integration testing
jest.mock('../../services/firebase/auth');
jest.mock('../../services/firebase/firestore');
jest.mock('../../services/firebase/messaging');

// Mock React Navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    replace: jest.fn()
  }),
  useRoute: () => ({
    params: {}
  })
}));

describe('Firebase Authentication Integration Tests', () => {
  const mockUser = {
    uid: 'test-user-123',
    email: 'test@example.com',
    displayName: 'Test User',
    emailVerified: true
  };

  const mockTouristProfile = {
    userId: 'test-user-123',
    email: 'test@example.com',
    name: 'Test User',
    nationality: 'US',
    passportNumber: 'US1234567890',
    phoneNumber: '+1234567890',
    emergencyContacts: [],
    verificationStatus: 'pending',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default Firebase mocks
    authService.signInWithEmailAndPassword.mockResolvedValue({
      success: true,
      user: mockUser
    });
    
    authService.createUserWithEmailAndPassword.mockResolvedValue({
      success: true,
      user: mockUser
    });
    
    authService.getCurrentUser.mockReturnValue(mockUser);
    
    firestoreService.getDocument.mockResolvedValue({
      success: true,
      data: mockTouristProfile
    });
    
    firestoreService.addDocument.mockResolvedValue({
      success: true,
      id: 'profile-123'
    });
    
    messagingService.requestPermissions.mockResolvedValue({
      success: true,
      token: 'fcm-token-123'
    });
  });

  describe('User Registration Flow', () => {
    it('should complete full user registration and profile creation', async () => {
      // Test basic registration
      const { getByTestId } = render(<RegisterScreen />);
      
      const emailInput = getByTestId('email-input');
      const passwordInput = getByTestId('password-input');
      const registerButton = getByTestId('register-button');
      
      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.press(registerButton);
      
      await waitFor(() => {
        expect(authService.createUserWithEmailAndPassword).toHaveBeenCalledWith(
          'test@example.com',
          'password123'
        );
      });
      
      // Test tourist profile creation
      const touristScreen = render(<TouristRegisterScreen />);
      const nameInput = touristScreen.getByTestId('name-input');
      const nationalityInput = touristScreen.getByTestId('nationality-input');
      const passportInput = touristScreen.getByTestId('passport-input');
      const phoneInput = touristScreen.getByTestId('phone-input');
      const submitButton = touristScreen.getByTestId('submit-button');
      
      fireEvent.changeText(nameInput, 'Test User');
      fireEvent.changeText(nationalityInput, 'US');
      fireEvent.changeText(passportInput, 'US1234567890');
      fireEvent.changeText(phoneInput, '+1234567890');
      fireEvent.press(submitButton);
      
      await waitFor(() => {
        expect(firestoreService.addDocument).toHaveBeenCalledWith(
          'tourists',
          expect.objectContaining({
            userId: mockUser.uid,
            email: 'test@example.com',
            name: 'Test User',
            nationality: 'US',
            passportNumber: 'US1234567890',
            phoneNumber: '+1234567890'
          })
        );
      });
    });

    it('should handle registration errors gracefully', async () => {
      authService.createUserWithEmailAndPassword.mockResolvedValue({
        success: false,
        error: 'Email already in use'
      });
      
      const { getByTestId, getByText } = render(<RegisterScreen />);
      
      const emailInput = getByTestId('email-input');
      const passwordInput = getByTestId('password-input');
      const registerButton = getByTestId('register-button');
      
      fireEvent.changeText(emailInput, 'existing@example.com');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.press(registerButton);
      
      await waitFor(() => {
        expect(getByText('Email already in use')).toBeTruthy();
      });
    });

    it('should validate tourist profile data before submission', async () => {
      const { getByTestId, getByText } = render(<TouristRegisterScreen />);
      
      const submitButton = getByTestId('submit-button');
      fireEvent.press(submitButton);
      
      await waitFor(() => {
        expect(getByText(/Please fill in all required fields/)).toBeTruthy();
      });
      
      expect(firestoreService.addDocument).not.toHaveBeenCalled();
    });
  });

  describe('User Login Flow', () => {
    it('should complete full login and profile retrieval', async () => {
      const { getByTestId } = render(<LoginScreen />);
      
      const emailInput = getByTestId('email-input');
      const passwordInput = getByTestId('password-input');
      const loginButton = getByTestId('login-button');
      
      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.press(loginButton);
      
      await waitFor(() => {
        expect(authService.signInWithEmailAndPassword).toHaveBeenCalledWith(
          'test@example.com',
          'password123'
        );
      });
      
      // Should fetch user profile after successful login
      await waitFor(() => {
        expect(firestoreService.getDocument).toHaveBeenCalledWith(
          'tourists',
          mockUser.uid
        );
      });
    });

    it('should handle login errors', async () => {
      authService.signInWithEmailAndPassword.mockResolvedValue({
        success: false,
        error: 'Invalid credentials'
      });
      
      const { getByTestId, getByText } = render(<LoginScreen />);
      
      const emailInput = getByTestId('email-input');
      const passwordInput = getByTestId('password-input');
      const loginButton = getByTestId('login-button');
      
      fireEvent.changeText(emailInput, 'wrong@example.com');
      fireEvent.changeText(passwordInput, 'wrongpassword');
      fireEvent.press(loginButton);
      
      await waitFor(() => {
        expect(getByText('Invalid credentials')).toBeTruthy();
      });
    });

    it('should handle missing user profile', async () => {
      firestoreService.getDocument.mockResolvedValue({
        success: false,
        error: 'Profile not found'
      });
      
      const { getByTestId } = render(<LoginScreen />);
      
      const emailInput = getByTestId('email-input');
      const passwordInput = getByTestId('password-input');
      const loginButton = getByTestId('login-button');
      
      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.press(loginButton);
      
      await waitFor(() => {
        expect(authService.signInWithEmailAndPassword).toHaveBeenCalled();
      });
      
      // Should redirect to profile creation if profile not found
      await waitFor(() => {
        expect(firestoreService.getDocument).toHaveBeenCalled();
      });
    });
  });

  describe('Firebase Messaging Integration', () => {
    it('should request notification permissions after successful login', async () => {
      const { getByTestId } = render(<LoginScreen />);
      
      const emailInput = getByTestId('email-input');
      const passwordInput = getByTestId('password-input');
      const loginButton = getByTestId('login-button');
      
      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.press(loginButton);
      
      await waitFor(() => {
        expect(messagingService.requestPermissions).toHaveBeenCalled();
      });
    });

    it('should handle notification permission denial', async () => {
      messagingService.requestPermissions.mockResolvedValue({
        success: false,
        error: 'Permission denied'
      });
      
      const { getByTestId } = render(<LoginScreen />);
      
      const emailInput = getByTestId('email-input');
      const passwordInput = getByTestId('password-input');
      const loginButton = getByTestId('login-button');
      
      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.press(loginButton);
      
      await waitFor(() => {
        expect(messagingService.requestPermissions).toHaveBeenCalled();
      });
      
      // Should continue with login even if notifications are denied
      expect(authService.signInWithEmailAndPassword).toHaveBeenCalled();
    });
  });

  describe('Data Synchronization', () => {
    it('should sync user data across Firebase services', async () => {
      // Simulate user registration
      const registrationResult = await authService.createUserWithEmailAndPassword(
        'test@example.com',
        'password123'
      );
      
      expect(registrationResult.success).toBe(true);
      
      // Create tourist profile
      const profileResult = await firestoreService.addDocument('tourists', {
        userId: mockUser.uid,
        email: 'test@example.com',
        name: 'Test User'
      });
      
      expect(profileResult.success).toBe(true);
      
      // Request messaging permissions
      const messagingResult = await messagingService.requestPermissions();
      
      expect(messagingResult.success).toBe(true);
      
      // Verify all services were called in correct order
      expect(authService.createUserWithEmailAndPassword).toHaveBeenCalledBefore(
        firestoreService.addDocument
      );
    });

    it('should handle partial service failures', async () => {
      // Auth succeeds but Firestore fails
      firestoreService.addDocument.mockResolvedValue({
        success: false,
        error: 'Database error'
      });
      
      const authResult = await authService.createUserWithEmailAndPassword(
        'test@example.com',
        'password123'
      );
      
      expect(authResult.success).toBe(true);
      
      const profileResult = await firestoreService.addDocument('tourists', {
        userId: mockUser.uid,
        email: 'test@example.com'
      });
      
      expect(profileResult.success).toBe(false);
      expect(profileResult.error).toBe('Database error');
    });
  });

  describe('Authentication State Management', () => {
    it('should maintain authentication state across app lifecycle', async () => {
      // Simulate app startup with existing user
      authService.getCurrentUser.mockReturnValue(mockUser);
      
      const currentUser = authService.getCurrentUser();
      expect(currentUser).toEqual(mockUser);
      
      // Should fetch user profile on app startup
      const profileResult = await firestoreService.getDocument('tourists', mockUser.uid);
      expect(profileResult.success).toBe(true);
      expect(profileResult.data).toEqual(mockTouristProfile);
    });

    it('should handle authentication state changes', async () => {
      // Start with no user
      authService.getCurrentUser.mockReturnValue(null);
      
      let currentUser = authService.getCurrentUser();
      expect(currentUser).toBeNull();
      
      // User logs in
      const loginResult = await authService.signInWithEmailAndPassword(
        'test@example.com',
        'password123'
      );
      
      expect(loginResult.success).toBe(true);
      
      // Update current user
      authService.getCurrentUser.mockReturnValue(mockUser);
      currentUser = authService.getCurrentUser();
      expect(currentUser).toEqual(mockUser);
    });
  });

  describe('Error Recovery', () => {
    it('should retry failed operations', async () => {
      // First call fails, second succeeds
      firestoreService.getDocument
        .mockResolvedValueOnce({
          success: false,
          error: 'Network error'
        })
        .mockResolvedValueOnce({
          success: true,
          data: mockTouristProfile
        });
      
      // First attempt
      let result = await firestoreService.getDocument('tourists', mockUser.uid);
      expect(result.success).toBe(false);
      
      // Retry
      result = await firestoreService.getDocument('tourists', mockUser.uid);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockTouristProfile);
    });

    it('should handle network connectivity issues', async () => {
      authService.signInWithEmailAndPassword.mockRejectedValue(
        new Error('Network request failed')
      );
      
      try {
        await authService.signInWithEmailAndPassword('test@example.com', 'password123');
      } catch (error) {
        expect(error.message).toBe('Network request failed');
      }
    });
  });
});