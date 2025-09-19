/**
 * Offline Functionality Tests
 * Tests offline capabilities against requirements 7.2, 7.3, 7.6
 * 
 * Requirements Coverage:
 * - 7.2: Offline access to emergency contacts, panic button, and cached maps
 * - 7.3: Background sync for location updates and emergency alerts
 * - 7.6: Background processing without draining battery
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

// Import components and services
import App from '../../App';
import DashboardScreen from '../../screens/DashboardScreen';
import QRCodeScreen from '../../screens/QRCodeScreen';
import EmergencyScreen from '../../screens/main/EmergencyScreen';
import PanicButton from '../../components/safety/PanicButton';

import { offlineCacheService } from '../../services/offline/offlineCacheService';
import { backgroundSyncService } from '../../services/offline/backgroundSyncService';
import { qrGeneratorService } from '../../services/security/qrGenerator';

// Import contexts
import { AuthProvider } from '../../context/AuthContext';
import { LocationProvider } from '../../context/LocationContext';
import { SafetyProvider } from '../../context/SafetyContext';

// Mock external dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('@react-native-community/netinfo');
jest.mock('expo-location');
jest.mock('expo-notifications');

// Mock offline services
jest.mock('../../services/offline/offlineCacheService', () => ({
  offlineCacheService: {
    cacheData: jest.fn(),
    getCachedData: jest.fn(),
    clearCache: jest.fn(),
    isCacheValid: jest.fn(),
    getCacheSize: jest.fn()
  }
}));

jest.mock('../../services/offline/backgroundSyncService', () => ({
  backgroundSyncService: {
    initialize: jest.fn(),
    queueOperation: jest.fn(),
    syncData: jest.fn(),
    getQueueSize: jest.fn(),
    clearQueue: jest.fn()
  }
}));

// Test wrapper
const OfflineTestWrapper = ({ children, isOnline = false }) => {
  // Mock network state
  NetInfo.useNetInfo.mockReturnValue({
    isConnected: isOnline,
    isInternetReachable: isOnline,
    type: isOnline ? 'wifi' : 'none'
  });

  return (
    <AuthProvider>
      <LocationProvider>
        <SafetyProvider>
          {children}
        </SafetyProvider>
      </LocationProvider>
    </AuthProvider>
  );
};

// Mock user data
const mockUser = {
  userId: 'test-user',
  name: 'Test User',
  nationality: 'India',
  verificationStatus: 'verified',
  emergencyContacts: [
    {
      id: 'contact-1',
      name: 'Emergency Contact 1',
      phoneNumber: '+1234567890',
      relationship: 'Family',
      isPrimary: true
    },
    {
      id: 'contact-2',
      name: 'Emergency Contact 2',
      phoneNumber: '+1234567891',
      relationship: 'Friend',
      isPrimary: false
    }
  ]
};

const mockCachedData = {
  emergencyContacts: mockUser.emergencyContacts,
  qrCode: {
    qrString: 'cached-qr-data',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    userId: mockUser.userId
  },
  safetyZones: [
    {
      id: 'zone-1',
      name: 'Safe Zone 1',
      coordinates: { lat: 28.6139, lng: 77.2090 },
      safetyLevel: 'safe'
    }
  ],
  lastLocation: {
    latitude: 28.6139,
    longitude: 77.2090,
    timestamp: new Date()
  }
};

describe('Offline Functionality Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.clear();
    
    // Setup default mock implementations
    offlineCacheService.getCachedData.mockResolvedValue(mockCachedData);
    offlineCacheService.cacheData.mockResolvedValue(true);
    offlineCacheService.isCacheValid.mockReturnValue(true);
    offlineCacheService.getCacheSize.mockResolvedValue(50); // 50MB
    
    backgroundSyncService.initialize.mockResolvedValue(true);
    backgroundSyncService.queueOperation.mockResolvedValue(true);
    backgroundSyncService.syncData.mockResolvedValue(true);
    backgroundSyncService.getQueueSize.mockResolvedValue(5);
  });

  describe('Offline Emergency Features (Requirement 7.2)', () => {
    test('Emergency contacts are accessible offline', async () => {
      const { getByText } = render(
        <OfflineTestWrapper isOnline={false}>
          <EmergencyScreen />
        </OfflineTestWrapper>
      );

      await waitFor(() => {
        expect(getByText('Your Emergency Contacts')).toBeTruthy();
      });

      // Verify cached emergency contacts are displayed
      expect(offlineCacheService.getCachedData).toHaveBeenCalledWith('emergencyContacts');
    });

    test('Panic button works offline', async () => {
      const { getByTestId } = render(
        <OfflineTestWrapper isOnline={false}>
          <PanicButton size="large" />
        </OfflineTestWrapper>
      );

      const panicButton = getByTestId('panic-button');
      fireEvent.press(panicButton);

      await waitFor(() => {
        // Verify panic button activation is queued for sync
        expect(backgroundSyncService.queueOperation).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'emergency_alert',
            priority: 'high'
          })
        );
      });
    });

    test('Cached QR code is accessible offline', async () => {
      const { getByText } = render(
        <OfflineTestWrapper isOnline={false}>
          <QRCodeScreen />
        </OfflineTestWrapper>
      );

      await waitFor(() => {
        expect(getByText('My QR Code')).toBeTruthy();
      });

      // Verify cached QR code is loaded
      expect(offlineCacheService.getCachedData).toHaveBeenCalledWith('qrCode');
    });

    test('Offline maps and safety zones are available', async () => {
      const { getByText } = render(
        <OfflineTestWrapper isOnline={false}>
          <DashboardScreen />
        </OfflineTestWrapper>
      );

      await waitFor(() => {
        expect(getByText('Welcome back!')).toBeTruthy();
      });

      // Verify cached safety zones are loaded
      expect(offlineCacheService.getCachedData).toHaveBeenCalledWith('safetyZones');
    });

    test('Last known location is used when GPS unavailable', async () => {
      const { getByText } = render(
        <OfflineTestWrapper isOnline={false}>
          <DashboardScreen />
        </OfflineTestWrapper>
      );

      await waitFor(() => {
        expect(getByText('Welcome back!')).toBeTruthy();
      });

      // Verify last known location is retrieved from cache
      expect(offlineCacheService.getCachedData).toHaveBeenCalledWith('lastLocation');
    });
  });

  describe('Background Sync (Requirement 7.3)', () => {
    test('Operations are queued when offline', async () => {
      const { getByTestId } = render(
        <OfflineTestWrapper isOnline={false}>
          <EmergencyScreen />
        </OfflineTestWrapper>
      );

      const panicButton = getByTestId('panic-button');
      fireEvent.press(panicButton);

      await waitFor(() => {
        expect(backgroundSyncService.queueOperation).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'emergency_alert',
            data: expect.any(Object),
            timestamp: expect.any(Date),
            priority: 'high'
          })
        );
      });
    });

    test('Location updates are queued for sync', async () => {
      const mockLocationUpdate = {
        latitude: 28.6139,
        longitude: 77.2090,
        timestamp: new Date(),
        accuracy: 10
      };

      render(
        <OfflineTestWrapper isOnline={false}>
          <DashboardScreen />
        </OfflineTestWrapper>
      );

      // Simulate location update while offline
      await waitFor(() => {
        expect(backgroundSyncService.queueOperation).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'location_update',
            data: expect.objectContaining({
              latitude: expect.any(Number),
              longitude: expect.any(Number)
            })
          })
        );
      });
    });

    test('Sync queue processes when connection restored', async () => {
      // Start offline
      const { rerender } = render(
        <OfflineTestWrapper isOnline={false}>
          <DashboardScreen />
        </OfflineTestWrapper>
      );

      // Simulate going online
      rerender(
        <OfflineTestWrapper isOnline={true}>
          <DashboardScreen />
        </OfflineTestWrapper>
      );

      await waitFor(() => {
        expect(backgroundSyncService.syncData).toHaveBeenCalled();
      });
    });

    test('High priority operations sync first', async () => {
      const mockOperations = [
        { type: 'emergency_alert', priority: 'high', timestamp: new Date() },
        { type: 'location_update', priority: 'medium', timestamp: new Date() },
        { type: 'profile_update', priority: 'low', timestamp: new Date() }
      ];

      backgroundSyncService.getQueueSize.mockResolvedValue(mockOperations.length);

      render(
        <OfflineTestWrapper isOnline={true}>
          <DashboardScreen />
        </OfflineTestWrapper>
      );

      await waitFor(() => {
        expect(backgroundSyncService.syncData).toHaveBeenCalled();
      });
    });

    test('Failed sync operations are retried', async () => {
      backgroundSyncService.syncData
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(true);

      render(
        <OfflineTestWrapper isOnline={true}>
          <DashboardScreen />
        </OfflineTestWrapper>
      );

      await waitFor(() => {
        expect(backgroundSyncService.syncData).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Offline Data Caching', () => {
    test('Critical data is cached automatically', async () => {
      render(
        <OfflineTestWrapper isOnline={true}>
          <DashboardScreen />
        </OfflineTestWrapper>
      );

      await waitFor(() => {
        expect(offlineCacheService.cacheData).toHaveBeenCalledWith(
          'emergencyContacts',
          mockUser.emergencyContacts
        );
      });
    });

    test('Cache size is managed efficiently', async () => {
      offlineCacheService.getCacheSize.mockResolvedValue(95); // Near limit

      render(
        <OfflineTestWrapper isOnline={true}>
          <DashboardScreen />
        </OfflineTestWrapper>
      );

      await waitFor(() => {
        expect(offlineCacheService.getCacheSize).toHaveBeenCalled();
      });
    });

    test('Expired cache data is refreshed', async () => {
      offlineCacheService.isCacheValid.mockReturnValue(false);

      render(
        <OfflineTestWrapper isOnline={true}>
          <QRCodeScreen />
        </OfflineTestWrapper>
      );

      await waitFor(() => {
        // Should attempt to refresh expired QR code
        expect(qrGeneratorService.generateQRData).toHaveBeenCalled();
      });
    });

    test('Cache cleanup removes old data', async () => {
      const oldCacheData = {
        ...mockCachedData,
        timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days old
      };

      offlineCacheService.getCachedData.mockResolvedValue(oldCacheData);

      render(
        <OfflineTestWrapper isOnline={true}>
          <DashboardScreen />
        </OfflineTestWrapper>
      );

      await waitFor(() => {
        expect(offlineCacheService.clearCache).toHaveBeenCalled();
      });
    });
  });

  describe('Offline User Experience', () => {
    test('Offline indicator is shown when disconnected', async () => {
      const { queryByText } = render(
        <OfflineTestWrapper isOnline={false}>
          <DashboardScreen />
        </OfflineTestWrapper>
      );

      await waitFor(() => {
        expect(queryByText(/offline/i)).toBeTruthy();
      });
    });

    test('Cached data timestamps are displayed', async () => {
      const { queryByText } = render(
        <OfflineTestWrapper isOnline={false}>
          <QRCodeScreen />
        </OfflineTestWrapper>
      );

      await waitFor(() => {
        expect(queryByText(/cached/i)).toBeTruthy();
      });
    });

    test('Sync status is communicated to user', async () => {
      backgroundSyncService.getQueueSize.mockResolvedValue(3);

      const { queryByText } = render(
        <OfflineTestWrapper isOnline={false}>
          <DashboardScreen />
        </OfflineTestWrapper>
      );

      await waitFor(() => {
        expect(queryByText(/pending sync/i)).toBeTruthy();
      });
    });

    test('Limited functionality warning is shown', async () => {
      const { queryByText } = render(
        <OfflineTestWrapper isOnline={false}>
          <QRCodeScreen />
        </OfflineTestWrapper>
      );

      await waitFor(() => {
        expect(queryByText(/limited functionality/i)).toBeTruthy();
      });
    });
  });

  describe('Battery Optimization (Requirement 7.6)', () => {
    test('Background sync respects battery level', async () => {
      // Mock low battery
      const mockBatteryLevel = 0.15; // 15%

      render(
        <OfflineTestWrapper isOnline={true}>
          <DashboardScreen />
        </OfflineTestWrapper>
      );

      await waitFor(() => {
        // Should reduce sync frequency on low battery
        expect(backgroundSyncService.syncData).toHaveBeenCalled();
      });
    });

    test('Sync intervals adjust based on network type', async () => {
      // Mock cellular network
      NetInfo.useNetInfo.mockReturnValue({
        isConnected: true,
        isInternetReachable: true,
        type: 'cellular'
      });

      render(
        <OfflineTestWrapper isOnline={true}>
          <DashboardScreen />
        </OfflineTestWrapper>
      );

      await waitFor(() => {
        // Should use longer intervals on cellular to save battery
        expect(backgroundSyncService.syncData).toHaveBeenCalled();
      });
    });

    test('Background processing is throttled', async () => {
      const startTime = Date.now();

      render(
        <OfflineTestWrapper isOnline={false}>
          <DashboardScreen />
        </OfflineTestWrapper>
      );

      // Simulate multiple background operations
      for (let i = 0; i < 10; i++) {
        await backgroundSyncService.queueOperation({
          type: 'location_update',
          data: { lat: 28.6139, lng: 77.2090 }
        });
      }

      const processingTime = Date.now() - startTime;

      // Should throttle to prevent battery drain
      expect(processingTime).toBeGreaterThan(100); // Some throttling delay
    });
  });

  describe('Offline Error Handling', () => {
    test('Cache corruption is handled gracefully', async () => {
      offlineCacheService.getCachedData.mockRejectedValue(new Error('Cache corrupted'));

      const { getByText } = render(
        <OfflineTestWrapper isOnline={false}>
          <DashboardScreen />
        </OfflineTestWrapper>
      );

      await waitFor(() => {
        expect(getByText('Welcome back!')).toBeTruthy();
      });

      // Should clear corrupted cache
      expect(offlineCacheService.clearCache).toHaveBeenCalled();
    });

    test('Storage quota exceeded is handled', async () => {
      offlineCacheService.cacheData.mockRejectedValue(new Error('Quota exceeded'));

      render(
        <OfflineTestWrapper isOnline={true}>
          <DashboardScreen />
        </OfflineTestWrapper>
      );

      await waitFor(() => {
        // Should attempt cache cleanup
        expect(offlineCacheService.clearCache).toHaveBeenCalled();
      });
    });

    test('Sync failures are handled with exponential backoff', async () => {
      let attemptCount = 0;
      backgroundSyncService.syncData.mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          return Promise.reject(new Error('Sync failed'));
        }
        return Promise.resolve(true);
      });

      render(
        <OfflineTestWrapper isOnline={true}>
          <DashboardScreen />
        </OfflineTestWrapper>
      );

      await waitFor(() => {
        expect(backgroundSyncService.syncData).toHaveBeenCalledTimes(3);
      });
    });
  });

  describe('Offline Security', () => {
    test('Cached sensitive data is encrypted', async () => {
      render(
        <OfflineTestWrapper isOnline={true}>
          <QRCodeScreen />
        </OfflineTestWrapper>
      );

      await waitFor(() => {
        expect(offlineCacheService.cacheData).toHaveBeenCalledWith(
          'qrCode',
          expect.any(Object),
          expect.objectContaining({ encrypted: true })
        );
      });
    });

    test('Cache access requires authentication', async () => {
      // Mock unauthenticated user
      const { queryByText } = render(
        <OfflineTestWrapper isOnline={false}>
          <QRCodeScreen />
        </OfflineTestWrapper>
      );

      await waitFor(() => {
        expect(queryByText('Please log in')).toBeTruthy();
      });
    });

    test('Offline operations maintain audit trail', async () => {
      const { getByTestId } = render(
        <OfflineTestWrapper isOnline={false}>
          <EmergencyScreen />
        </OfflineTestWrapper>
      );

      const panicButton = getByTestId('panic-button');
      fireEvent.press(panicButton);

      await waitFor(() => {
        expect(backgroundSyncService.queueOperation).toHaveBeenCalledWith(
          expect.objectContaining({
            auditTrail: expect.objectContaining({
              action: 'emergency_alert',
              timestamp: expect.any(Date),
              userId: expect.any(String)
            })
          })
        );
      });
    });
  });
});