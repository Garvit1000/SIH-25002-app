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