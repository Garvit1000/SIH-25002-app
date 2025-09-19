// Mock react-native modules
// jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock Expo modules
jest.mock('expo-crypto', () => ({
  digestStringAsync: jest.fn(),
  randomUUID: jest.fn(),
  getRandomBytesAsync: jest.fn(),
  CryptoDigestAlgorithm: {
    SHA256: 'SHA256',
    SHA512: 'SHA512'
  },
  CryptoEncoding: {
    HEX: 'hex',
    BASE64: 'base64',
    BASE64URL: 'base64url'
  }
}));

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn()
}));

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  requestBackgroundPermissionsAsync: jest.fn(),
  getForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  watchPositionAsync: jest.fn(),
  reverseGeocodeAsync: jest.fn(),
  startLocationUpdatesAsync: jest.fn(),
  stopLocationUpdatesAsync: jest.fn(),
  Accuracy: {
    Lowest: 1,
    Low: 2,
    Balanced: 3,
    High: 4,
    Highest: 5,
    BestForNavigation: 6
  }
}));

// Mock expo-file-system only if needed
jest.mock('expo-file-system', () => ({
  documentDirectory: 'file://test/',
  writeAsStringAsync: jest.fn(),
  readAsStringAsync: jest.fn()
}), { virtual: true });

jest.mock('expo-media-library', () => ({
  requestPermissionsAsync: jest.fn(),
  saveToLibraryAsync: jest.fn()
}), { virtual: true });

// Mock React Navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    setParams: jest.fn()
  }),
  useRoute: () => ({
    params: {}
  })
}));

// Mock React Native components
jest.mock('react-native', () => {
  return {
    Platform: {
      OS: 'ios',
      select: jest.fn((obj) => obj.ios || obj.default),
    },
    StyleSheet: {
      create: jest.fn((styles) => styles),
      flatten: jest.fn((styles) => styles),
    },
    View: 'View',
    Text: 'Text',
    TouchableOpacity: 'TouchableOpacity',
    ScrollView: 'ScrollView',
    Modal: 'Modal',
    ActivityIndicator: 'ActivityIndicator',
    Alert: {
      alert: jest.fn()
    },
    Share: {
      share: jest.fn()
    },
    Dimensions: {
      get: jest.fn(() => ({ width: 375, height: 812 }))
    },
    AppState: {
      currentState: 'active',
      addEventListener: jest.fn()
    }
  };
});

// Mock Ionicons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons'
}), { virtual: true });

// Mock LinearGradient
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: 'LinearGradient'
}), { virtual: true });

// Global test timeout
jest.setTimeout(10000);