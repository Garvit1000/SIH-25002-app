import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';

// Auth helper functions
export const registerUser = async (email, password) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await createUserDocIfNotExists(userCredential.user.uid, email);
    return userCredential.user;
  } catch (error) {
    throw mapAuthErrorToMessage(error);
  }
};

// Enhanced tourist registration
export const registerTouristUser = async (touristData) => {
  try {
    const { email, password, ...profileData } = touristData;
    
    // Create Firebase auth user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Create tourist profile document
    const userData = await createTouristUserDoc(userCredential.user.uid, {
      email,
      ...profileData
    });
    
    return {
      user: userCredential.user,
      profile: userData
    };
  } catch (error) {
    throw mapAuthErrorToMessage(error);
  }
};

export const loginUser = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    throw mapAuthErrorToMessage(error);
  }
};

export const signOutUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    throw mapAuthErrorToMessage(error);
  }
};

export const resetPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    throw mapAuthErrorToMessage(error);
  }
};

// Firestore helper functions
export const createUserDocIfNotExists = async (uid, email) => {
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    await setDoc(userRef, {
      email,
      displayName: null,
      createdAt: serverTimestamp(),
      profileImageUrl: null
    });
  }
};

// Enhanced tourist user creation
export const createTouristUserDoc = async (uid, touristData) => {
  const userRef = doc(db, 'users', uid);
  
  const userData = {
    email: touristData.email,
    name: touristData.name || null,
    nationality: touristData.nationality,
    passportNumber: touristData.passportNumber,
    phoneNumber: touristData.phoneNumber,
    emergencyContacts: touristData.emergencyContacts || [],
    medicalInfo: touristData.medicalInfo || {
      allergies: '',
      medications: '',
      conditions: '',
      bloodType: ''
    },
    preferences: touristData.preferences || {
      language: 'en',
      accessibility: {
        highContrast: false,
        fontSize: 'medium',
        voiceOver: false
      }
    },
    verificationStatus: 'pending',
    profileImageUrl: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
  
  await setDoc(userRef, userData);
  return userData;
};

// Update user profile with tourist-specific fields
export const updateTouristProfile = async (uid, updates) => {
  const userRef = doc(db, 'users', uid);
  
  const updateData = {
    ...updates,
    updatedAt: serverTimestamp()
  };
  
  await setDoc(userRef, updateData, { merge: true });
  return updateData;
};

export const fetchUserDoc = async (uid) => {
  try {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      return { id: userSnap.id, ...userSnap.data() };
    }
    return null;
  } catch (error) {
    console.error('Error fetching user document:', error);
    throw error;
  }
};

// Error mapping helper
export const mapAuthErrorToMessage = (error) => {
  const errorMap = {
    'auth/email-already-in-use': 'This email is already registered',
    'auth/invalid-email': 'Please enter a valid email address',
    'auth/operation-not-allowed': 'Email/password accounts are not enabled',
    'auth/weak-password': 'Password should be at least 6 characters',
    'auth/user-disabled': 'This account has been disabled',
    'auth/user-not-found': 'No account found with this email',
    'auth/wrong-password': 'Incorrect password',
    'auth/too-many-requests': 'Too many attempts. Please try again later',
  };

  const errorMessage = errorMap[error.code] || 'An error occurred. Please try again';
  return new Error(errorMessage);
};