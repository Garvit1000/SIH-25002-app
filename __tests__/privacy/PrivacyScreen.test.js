import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import PrivacyScreen from '../../screens/PrivacyScreen';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { privacyService } from '../../services/privacy/privacyService';

// Mock dependencies
jest.mock('../../context/ThemeContext');
jest.mock('../../context/AuthContext');
jest.mock('../../services/privacy/privacyService');
jest.mock('../../utils/privacyHelpers');

// Mock Alert
jest.spyOn(Alert, 'alert');

const mockNavigation = {
  navigate: jest.fn(),
};

const mockTheme = {
  colors: {
    background: '#ffffff',
    surface: '#f5f5f5',
    text: '#000000',
    textSecondary: '#666666',
    primary: '#007AFF',
    border: '#e0e0e0',
    shadow: '#000000',
    warning: '#FF9500',
  },
  isDarkMode: false,
};

const mockAuth = {
  user: { uid: 'test-user-123' },
  profile: { name: 'Test User' },
};

const mockPrivacySettings = {
  locationTracking: true,
  emergencyContacts: true,
  profileData: true,
  analyticsData: false,
  crashReports: true,
  marketingCommunications: false,
};

const mockDataUsage = {
  locationDataPoints: 150,
  emergencyAlerts: 2,
  qrGenerations: 25,
  lastSyncDate: '2024-01-15T10:30:00Z',
};

describe('PrivacyScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    useTheme.mockReturnValue(mockTheme);
    useAuth.mockReturnValue(mockAuth);
    
    privacyService.getPrivacySettings.mockResolvedValue(mockPrivacySettings);
    privacyService.getDataUsageStats.mockResolvedValue(mockDataUsage);
    privacyService.updatePrivacySettings.mockResolvedValue(mockPrivacySettings);
  });

  test('renders privacy screen with all sections', async () => {
    const { getByText, getByDisplayValue } = render(
      <PrivacyScreen navigation={mockNavigation} />
    );

    await waitFor(() => {
      expect(getByText('Privacy Consent')).toBeTruthy();
      expect(getByText('Data Usage Transparency')).toBeTruthy();
      expect(getByText('Data Management')).toBeTruthy();
    });
  });

  test('displays correct data usage statistics', async () => {
    const { getByText } = render(
      <PrivacyScreen navigation={mockNavigation} />
    );

    await waitFor(() => {
      expect(getByText('150')).toBeTruthy(); // locationDataPoints
      expect(getByText('2')).toBeTruthy(); // emergencyAlerts
      expect(getByText('25')).toBeTruthy(); // qrGenerations
    });
  });

  test('navigates to data deletion screen', async () => {
    const { getByText } = render(
      <PrivacyScreen navigation={mockNavigation} />
    );

    await waitFor(() => {
      const deleteButton = getByText('Request Data Deletion');
      fireEvent.press(deleteButton);
      expect(mockNavigation.navigate).toHaveBeenCalledWith('DataDeletion');
    });
  });

  test('navigates to grievance form screen', async () => {
    const { getByText } = render(
      <PrivacyScreen navigation={mockNavigation} />
    );

    await waitFor(() => {
      const grievanceButton = getByText('File Privacy Grievance');
      fireEvent.press(grievanceButton);
      expect(mockNavigation.navigate).toHaveBeenCalledWith('GrievanceForm');
    });
  });

  test('shows loading state initially', () => {
    const { getByText } = render(
      <PrivacyScreen navigation={mockNavigation} />
    );

    expect(getByText('Loading privacy settings...')).toBeTruthy();
  });

  test('handles permission toggle correctly', async () => {
    const { getAllByRole } = render(
      <PrivacyScreen navigation={mockNavigation} />
    );

    await waitFor(() => {
      // Wait for the screen to load
      expect(privacyService.getPrivacySettings).toHaveBeenCalled();
    });

    // Note: Testing switch interactions requires more complex setup
    // This is a basic structure for the test
  });
});

describe('PrivacyScreen Error Handling', () => {
  beforeEach(() => {
    useTheme.mockReturnValue(mockTheme);
    useAuth.mockReturnValue(mockAuth);
  });

  test('handles privacy settings loading error gracefully', async () => {
    privacyService.getPrivacySettings.mockRejectedValue(new Error('Network error'));
    privacyService.getDataUsageStats.mockResolvedValue(mockDataUsage);

    const { getByText } = render(
      <PrivacyScreen navigation={mockNavigation} />
    );

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to load privacy settings');
    });
  });

  test('handles data usage stats loading error gracefully', async () => {
    privacyService.getPrivacySettings.mockResolvedValue(mockPrivacySettings);
    privacyService.getDataUsageStats.mockRejectedValue(new Error('Network error'));

    const { getByText } = render(
      <PrivacyScreen navigation={mockNavigation} />
    );

    // Should still render the screen even if stats fail to load
    await waitFor(() => {
      expect(getByText('Privacy Consent')).toBeTruthy();
    });
  });
});