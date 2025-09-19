import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children, initialUser = null }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize Firebase Auth listener
    const initializeAuth = async () => {
      try {
        setLoading(true);
        
        // Import Firebase auth
        const { auth } = await import('../firebaseConfig');
        const { onAuthStateChanged } = await import('firebase/auth');
        
        // Listen for authentication state changes
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
          if (firebaseUser) {
            // User is signed in
            const userData = {
              userId: firebaseUser.uid,
              email: firebaseUser.email,
              name: firebaseUser.displayName || 'User',
              emailVerified: firebaseUser.emailVerified,
              photoURL: firebaseUser.photoURL,
              phoneNumber: firebaseUser.phoneNumber,
              verificationStatus: firebaseUser.emailVerified ? 'verified' : 'pending',
              emergencyContacts: []
            };
            
            setUser(userData);
            setProfile(userData);
            console.log('User authenticated:', userData.email);
          } else {
            // User is signed out
            setUser(null);
            setProfile(null);
            console.log('User signed out');
          }
          setLoading(false);
        });

        // Return cleanup function
        return unsubscribe;
      } catch (error) {
        console.error('Auth initialization error:', error);
        setLoading(false);
      }
    };

    const unsubscribe = initializeAuth();
    
    // Cleanup subscription on unmount
    return () => {
      if (unsubscribe && typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  const refreshProfile = async () => {
    try {
      // Mock refresh - in real app this would fetch from Firebase
      if (user) {
        return profile;
      }
      return null;
    } catch (error) {
      console.error('Error refreshing profile:', error);
      throw error;
    }
  };

  const updateProfile = async (updates) => {
    try {
      if (user && profile) {
        const updatedProfile = { ...profile, ...updates };
        setProfile(updatedProfile);
        return updatedProfile;
      }
      throw new Error('No user logged in');
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  };

  const isVerifiedTourist = () => {
    return profile?.verificationStatus === 'verified';
  };

  const hasCompleteTouristProfile = () => {
    if (!profile) return false;
    
    // Check if all required tourist profile fields are completed
    const requiredFields = [
      'name',
      'nationality', 
      'passportNumber',
      'phoneNumber'
    ];
    
    return requiredFields.every(field => profile[field] && profile[field].trim() !== '');
  };

  const signIn = async (email, password) => {
    try {
      setLoading(true);
      
      // Import Firebase auth functions
      const { auth } = await import('../firebaseConfig');
      const { signInWithEmailAndPassword } = await import('firebase/auth');
      
      // Sign in with Firebase
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      console.log('Firebase sign in successful:', firebaseUser.email);
      
      // User data will be set automatically by onAuthStateChanged listener
      setLoading(false);
      return { success: true, user: firebaseUser };
    } catch (error) {
      setLoading(false);
      console.error('Sign in error:', error);
      
      let errorMessage = 'An error occurred during sign in';
      
      // Handle specific Firebase auth errors
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'No account found with this email address';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Incorrect password';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address';
          break;
        case 'auth/user-disabled':
          errorMessage = 'This account has been disabled';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many failed attempts. Please try again later';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Network error. Please check your connection';
          break;
        default:
          errorMessage = error.message;
      }
      
      return { success: false, error: errorMessage };
    }
  };

  const signUp = async (email, password, userData = {}) => {
    try {
      setLoading(true);
      
      // Import Firebase auth functions
      const { auth } = await import('../firebaseConfig');
      const { createUserWithEmailAndPassword, updateProfile } = await import('firebase/auth');
      
      // Create user with Firebase
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      // Update user profile with display name
      if (userData.displayName) {
        await updateProfile(firebaseUser, {
          displayName: userData.displayName
        });
      }
      
      console.log('Firebase sign up successful:', firebaseUser.email);
      
      // User data will be set automatically by onAuthStateChanged listener
      setLoading(false);
      return { success: true, user: firebaseUser };
    } catch (error) {
      setLoading(false);
      console.error('Sign up error:', error);
      
      let errorMessage = 'An error occurred during registration';
      
      // Handle specific Firebase auth errors
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'An account with this email already exists';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address';
          break;
        case 'auth/weak-password':
          errorMessage = 'Password is too weak. Please choose a stronger password';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Network error. Please check your connection';
          break;
        default:
          errorMessage = error.message;
      }
      
      return { success: false, error: errorMessage };
    }
  };

  const resetPassword = async (email) => {
    try {
      setLoading(true);
      
      // Import Firebase auth functions
      const { auth } = await import('../firebaseConfig');
      const { sendPasswordResetEmail } = await import('firebase/auth');
      
      // Send password reset email
      await sendPasswordResetEmail(auth, email);
      
      console.log('Password reset email sent to:', email);
      
      setLoading(false);
      return { success: true, message: 'Password reset email sent successfully' };
    } catch (error) {
      setLoading(false);
      console.error('Reset password error:', error);
      
      let errorMessage = 'An error occurred while sending reset email';
      
      // Handle specific Firebase auth errors
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'No account found with this email address';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Network error. Please check your connection';
          break;
        default:
          errorMessage = error.message;
      }
      
      return { success: false, error: errorMessage };
    }
  };

  const signOut = async () => {
    try {
      // Import Firebase auth functions
      const { auth } = await import('../firebaseConfig');
      const { signOut: firebaseSignOut } = await import('firebase/auth');
      
      // Sign out from Firebase
      await firebaseSignOut(auth);
      
      console.log('User signed out successfully');
      
      // User data will be cleared automatically by onAuthStateChanged listener
      return { success: true };
    } catch (error) {
      console.error('Sign out error:', error);
      return { success: false, error: error.message };
    }
  };

  const value = {
    user,
    profile,
    loading,
    refreshProfile,
    updateProfile,
    isVerifiedTourist,
    hasCompleteTouristProfile,
    signIn,
    signUp,
    resetPassword,
    signOut
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export { AuthContext };