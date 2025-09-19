import { performanceOptimizer } from '../../../services/performance/performanceOptimizer';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
  multiRemove: jest.fn(),
  getAllKeys: jest.fn()
}));

// Mock React Native modules
jest.mock('react-native', () => ({
  AppState: {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
  },
  DeviceEventEmitter: {
    emit: jest.fn(),
    addListener: jest.fn(),
    removeAllListeners: jest.fn()
  }
}));

// Mock expo-device
jest.mock('expo-device', () => ({
  brand: 'Apple',
  modelName: 'iPhone 12',
  osName: 'iOS',
  osVersion: '15.0'
}));

describe('performanceOptimizer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset performance state
    performanceOptimizer.performanceState = {
      isOptimizing: false,
      batteryLevel: 1.0,
      memoryUsage: 0,
      appState: 'active',
      isLowPowerMode: false,
      locationTrackingMode: 'active'
    };
  });

  describe('initialize', () => {
    it('should initialize performance optimizer successfully', async () => {
      AsyncStorage.getItem.mockResolvedValue(null);

      const result = await performanceOptimizer.initialize();

      expect(result.success).toBe(true);
    });
  });

  describe('getCurrentLocationInterval', () => {
    it('should return emergency interval in emergency mode', () => {
      performanceOptimizer.performanceState.locationTrackingMode = 'emergency';

      const interval = performanceOptimizer.getCurrentLocationInterval();

      expect(interval).toBe(performanceOptimizer.locationTrackingIntervals.emergency);
    });

    it('should return low battery interval in low power mode', () => {
      performanceOptimizer.performanceState.locationTrackingMode = 'lowBattery';

      const interval = performanceOptimizer.getCurrentLocationInterval();

      expect(interval).toBe(performanceOptimizer.locationTrackingIntervals.lowBattery);
    });

    it('should return active interval by default', () => {
      performanceOptimizer.performanceState.locationTrackingMode = 'active';

      const interval = performanceOptimizer.getCurrentLocationInterval();

      expect(interval).toBe(performanceOptimizer.locationTrackingIntervals.active);
    });
  });

  describe('enableLowPowerMode', () => {
    it('should enable low power mode and update state', () => {
      performanceOptimizer.enableLowPowerMode();

      expect(performanceOptimizer.performanceState.isLowPowerMode).toBe(true);
      expect(performanceOptimizer.performanceState.locationTrackingMode).toBe('lowBattery');
    });
  });

  describe('disableLowPowerMode', () => {
    it('should disable low power mode and restore normal state', () => {
      performanceOptimizer.performanceState.isLowPowerMode = true;
      performanceOptimizer.performanceState.locationTrackingMode = 'lowBattery';

      performanceOptimizer.disableLowPowerMode();

      expect(performanceOptimizer.performanceState.isLowPowerMode).toBe(false);
      expect(performanceOptimizer.performanceState.locationTrackingMode).toBe('active');
    });
  });

  describe('performMemoryCleanup', () => {
    it('should perform memory cleanup without errors', async () => {
      AsyncStorage.getAllKeys.mockResolvedValue(['key1', 'key2']);
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify({ cachedAt: new Date().toISOString() }));
      AsyncStorage.multiRemove.mockResolvedValue();

      await performanceOptimizer.performMemoryCleanup();

      expect(performanceOptimizer.performanceState.isOptimizing).toBe(false);
    });

    it('should handle cleanup errors gracefully', async () => {
      AsyncStorage.getAllKeys.mockRejectedValue(new Error('Storage error'));

      await performanceOptimizer.performMemoryCleanup();

      expect(performanceOptimizer.performanceState.isOptimizing).toBe(false);
    });
  });

  describe('optimizeForEmergency', () => {
    it('should optimize for emergency mode', () => {
      performanceOptimizer.optimizeForEmergency();

      expect(performanceOptimizer.performanceState.locationTrackingMode).toBe('emergency');
    });
  });

  describe('restoreNormalPerformance', () => {
    it('should restore normal performance from emergency mode', () => {
      performanceOptimizer.performanceState.locationTrackingMode = 'emergency';
      performanceOptimizer.performanceState.isLowPowerMode = false;

      performanceOptimizer.restoreNormalPerformance();

      expect(performanceOptimizer.performanceState.locationTrackingMode).toBe('active');
    });

    it('should restore low battery mode if battery is low', () => {
      performanceOptimizer.performanceState.locationTrackingMode = 'emergency';
      performanceOptimizer.performanceState.isLowPowerMode = true;

      performanceOptimizer.restoreNormalPerformance();

      expect(performanceOptimizer.performanceState.locationTrackingMode).toBe('lowBattery');
    });
  });

  describe('getPerformanceStats', () => {
    it('should return performance statistics', async () => {
      AsyncStorage.getItem.mockResolvedValue('1500');

      const result = await performanceOptimizer.getPerformanceStats();

      expect(result.success).toBe(true);
      expect(result.stats).toMatchObject({
        isOptimizing: false,
        batteryLevel: 1.0,
        memoryUsage: 0,
        appState: 'active',
        isLowPowerMode: false,
        locationTrackingMode: 'active'
      });
      expect(result.stats.lastLaunchTime).toBe(1500);
    });
  });
});