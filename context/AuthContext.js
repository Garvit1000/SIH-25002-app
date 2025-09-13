import React, { createContext, useState, useContext, useEffect } from 'react';
import { auth } from '../firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { fetchUserDoc } from '../utils/firebaseHelpers';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        const userDoc = await fetchUserDoc(user.uid);
        setProfile(userDoc);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    // Cleanup subscription
    return () => unsubscribe();
  }, []);

  const refreshProfile = async () => {
    if (user) {
      const userDoc = await fetchUserDoc(user.uid);
      setProfile(userDoc);
    }
  };

  const value = {
    user,
    profile,
    loading,
    refreshProfile,
  };

  if (loading) {
    return null; // Or a loading component
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;