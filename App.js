import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Import contexts with error boundaries
import { AuthProvider } from './context/AuthContext';
import { LocationProvider } from './context/LocationContext';
import { SafetyProvider } from './context/SafetyContext';
import { ThemeProvider } from './context/ThemeContext';
import { AccessibilityProvider } from './context/AccessibilityContext';

// Import navigation
import Navigation from './navigation';

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaProvider>
          <View style={{ 
            flex: 1, 
            justifyContent: 'center', 
            alignItems: 'center',
            backgroundColor: '#fff',
            padding: 20
          }}>
            <Text style={{ 
              fontSize: 18, 
              color: '#FF3B30',
              textAlign: 'center',
              marginBottom: 16,
              fontWeight: 'bold'
            }}>
              Something went wrong
            </Text>
            <Text style={{ 
              fontSize: 14, 
              color: '#666',
              textAlign: 'center',
              marginBottom: 20
            }}>
              The app encountered an unexpected error. Please restart the app.
            </Text>
            <Text style={{ 
              fontSize: 12, 
              color: '#999',
              textAlign: 'center'
            }}>
              Error: {this.state.error?.message || 'Unknown error'}
            </Text>
          </View>
        </SafeAreaProvider>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  const [isInitializing, setIsInitializing] = useState(true);
  const [initializationError, setInitializationError] = useState(null);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      console.log('Starting Pravasi App...');
      
      // Simple initialization without complex services that might fail
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('App initialized successfully');
      setIsInitializing(false);
    } catch (error) {
      console.error('App initialization error:', error);
      setInitializationError(error.message);
      setIsInitializing(false);
    }
  };

  // Show loading screen during initialization
  if (isInitializing) {
    return (
      <SafeAreaProvider>
        <View style={{ 
          flex: 1, 
          justifyContent: 'center', 
          alignItems: 'center',
          backgroundColor: '#fff'
        }}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={{ 
            marginTop: 16, 
            fontSize: 16, 
            color: '#666',
            textAlign: 'center'
          }}>
            Loading Pravasi...
          </Text>
        </View>
      </SafeAreaProvider>
    );
  }

  // Show error screen if initialization failed
  if (initializationError) {
    return (
      <SafeAreaProvider>
        <View style={{ 
          flex: 1, 
          justifyContent: 'center', 
          alignItems: 'center',
          backgroundColor: '#fff',
          padding: 20
        }}>
          <Text style={{ 
            fontSize: 18, 
            color: '#FF3B30',
            textAlign: 'center',
            marginBottom: 16,
            fontWeight: 'bold'
          }}>
            Initialization Error
          </Text>
          <Text style={{ 
            fontSize: 14, 
            color: '#666',
            textAlign: 'center'
          }}>
            {initializationError}
          </Text>
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <ThemeProvider>
          <AccessibilityProvider>
            <AuthProvider>
              <LocationProvider>
                <SafetyProvider>
                  <Navigation />
                  <StatusBar style="auto" />
                </SafetyProvider>
              </LocationProvider>
            </AuthProvider>
          </AccessibilityProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}