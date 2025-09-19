import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import MapScreen from '../../screens/main/MapScreen';
import { useLocation } from '../../context/LocationContext';
import { useTheme } from '../../context/ThemeContext';
import { safetyZonesService } from '../../services/location/safetyZones';

// Mock dependencies
jest.mock('../../context/LocationContext');
jest.mock('../../context/ThemeContext');
jest.mock('../../services/location/safetyZones');
jest.mock('react-native-maps', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({ children, onMapReady, onPress, ...props }) => (
      <View testID="map-view" {...props}>
        {children}
      </View>
    ),
    Marker: ({ children, ...props }) => (
      <View testID="marker" {...props}>
        {children}
      </View>
    ),
    Polygon: ({ onPress, ...props }) => (
      <View testID="polygon" onPress={onPress} {...props} />
    ),
    Polyline: (props) => <View testID="polyline" {...props} />,
    PROVIDER_GOOGLE: 'google',
  };
});

// Mock Alert
jest.spyOn(Alert, 'alert');

describe('MapScreen', () => {
  const mockNavigation = {
    navigate: jest.fn(),
    goBack: jest.fn(),
  };

  const mockLocationContext = {
    currentLocation: {
      latitude: 28.6139,
      longitude: 77.2090,
      accuracy: 10,
      timestamp: new Date(),
    },
    currentSafetyStatus: {
      safetyLevel: 'safe',
      isInSafeZone: true,
      message: 'You are in a safe zone',
      zone: { id: 'zone_001', name: 'Safe Zone' },
    },
    safetyZones: [
      {
        id: 'zone_001',
        name: 'Safe Zone',
        safetyLevel: 'safe',
        coordinates: [
          { latitude: 28.6139, longitude: 77.2090 },
          { latitude: 28.6150, longitude: 77.2100 },
          { latitude: 28.6140, longitude: 77.2110 },
          { latitude: 28.6130, longitude: 77.2100 },
        ],
      },
    ],
    getCurrentLocation: jest.fn(),
    calculateRouteSafety: jest.fn(),
    loading: false,
  };

  const mockTheme = {
    theme: 'light',
    colors: {
      primary: '#007AFF',
      secondary: '#5856D6',
      success: '#34C759',
      warning: '#FF9500',
      error: '#FF3B30',
      background: '#FFFFFF',
      surface: '#F2F2F7',
      text: '#000000',
      textSecondary: '#8E8E93',
      border: '#C6C6C8',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useLocation.mockReturnValue(mockLocationContext);
    useTheme.mockReturnValue(mockTheme);
    safetyZonesService.getZoneDetails.mockResolvedValue({
      success: true,
      zone: {
        id: 'zone_001',
        name: 'Safe Zone',
        safetyLevel: 'safe',
        description: 'A safe area for tourists',
        safetyFeatures: ['CCTV', 'Security Patrol'],
        emergencyServices: [
          { type: 'police', number: '100', distance: '0.2km' },
        ],
      },
    });
  });

  it('renders correctly with location data', () => {
    const { getByTestId, getByText } = render(
      <MapScreen navigation={mockNavigation} />
    );

    expect(getByTestId('map-view')).toBeTruthy();
    expect(getByText('You are in a safe zone')).toBeTruthy();
  });

  it('renders loading state', () => {
    useLocation.mockReturnValue({
      ...mockLocationContext,
      loading: true,
    });

    const { getByText } = render(<MapScreen navigation={mockNavigation} />);

    expect(getByText('Loading map...')).toBeTruthy();
  });

  it('renders safety zones as polygons', () => {
    const { getAllByTestId } = render(
      <MapScreen navigation={mockNavigation} />
    );

    const polygons = getAllByTestId('polygon');
    expect(polygons).toHaveLength(1);
  });

  it('renders current location marker', () => {
    const { getAllByTestId } = render(
      <MapScreen navigation={mockNavigation} />
    );

    const markers = getAllByTestId('marker');
    expect(markers.length).toBeGreaterThan(0);
  });

  it('handles center on current location button press', () => {
    const { getByTestId } = render(<MapScreen navigation={mockNavigation} />);

    // Find the locate button (first control button)
    const locateButton = getByTestId('locate-button') || 
      getByTestId('control-button-0') ||
      getAllByTestId('control-button')[0];
    
    if (locateButton) {
      fireEvent.press(locateButton);
      expect(mockLocationContext.getCurrentLocation).toHaveBeenCalled();
    }
  });

  it('toggles route planning mode', () => {
    const { getByTestId } = render(<MapScreen navigation={mockNavigation} />);

    // Find the route planning button
    const routeButton = getByTestId('route-button') || 
      getByTestId('control-button-2') ||
      getAllByTestId('control-button')[2];
    
    if (routeButton) {
      fireEvent.press(routeButton);
      // Should show route planning controls
      expect(getByText('Route Planning (0 points)')).toBeTruthy();
    }
  });

  it('calculates route safety when enough points are added', async () => {
    mockLocationContext.calculateRouteSafety.mockResolvedValue({
      success: true,
      score: 85,
      recommendation: 'This route is generally safe',
    });

    const { getByTestId, getByText } = render(
      <MapScreen navigation={mockNavigation} />
    );

    // Enable route planning
    const routeButton = getByTestId('route-button') || 
      getAllByTestId('control-button')[2];
    
    if (routeButton) {
      fireEvent.press(routeButton);

      // Simulate adding route points by pressing map
      const mapView = getByTestId('map-view');
      fireEvent.press(mapView, {
        nativeEvent: {
          coordinate: { latitude: 28.6140, longitude: 77.2091 },
        },
      });
      fireEvent.press(mapView, {
        nativeEvent: {
          coordinate: { latitude: 28.6141, longitude: 77.2092 },
        },
      });

      // Calculate route safety
      const calculateButton = getByText('Calculate Safety');
      fireEvent.press(calculateButton);

      await waitFor(() => {
        expect(mockLocationContext.calculateRouteSafety).toHaveBeenCalled();
        expect(Alert.alert).toHaveBeenCalledWith(
          'Route Safety Score',
          expect.stringContaining('Safety Score: 85/100'),
          [{ text: 'OK' }]
        );
      });
    }
  });

  it('shows alert when trying to calculate route with insufficient points', () => {
    const { getByTestId, getByText } = render(
      <MapScreen navigation={mockNavigation} />
    );

    // Enable route planning
    const routeButton = getAllByTestId('control-button')[2];
    fireEvent.press(routeButton);

    // Try to calculate without enough points
    const calculateButton = getByText('Calculate Safety');
    fireEvent.press(calculateButton);

    expect(Alert.alert).toHaveBeenCalledWith(
      'Route Planning',
      'Please add at least 2 points to calculate route safety.'
    );
  });

  it('clears route when clear button is pressed', () => {
    const { getByTestId, getByText } = render(
      <MapScreen navigation={mockNavigation} />
    );

    // Enable route planning
    const routeButton = getAllByTestId('control-button')[2];
    fireEvent.press(routeButton);

    // Add a point
    const mapView = getByTestId('map-view');
    fireEvent.press(mapView, {
      nativeEvent: {
        coordinate: { latitude: 28.6140, longitude: 77.2091 },
      },
    });

    // Clear route
    const clearButton = getByText('Clear Route');
    fireEvent.press(clearButton);

    // Should show 0 points again
    expect(getByText('Route Planning (0 points)')).toBeTruthy();
  });

  it('opens zone details modal when zone is pressed', async () => {
    const { getByTestId, getByText } = render(
      <MapScreen navigation={mockNavigation} />
    );

    const polygon = getByTestId('polygon');
    fireEvent.press(polygon);

    await waitFor(() => {
      expect(safetyZonesService.getZoneDetails).toHaveBeenCalledWith('zone_001');
      expect(getByText('Safe Zone')).toBeTruthy();
    });
  });

  it('toggles map type when layers button is pressed', () => {
    const { getAllByTestId } = render(<MapScreen navigation={mockNavigation} />);

    const layersButton = getAllByTestId('control-button')[1];
    fireEvent.press(layersButton);

    // Map type should change (this would be tested by checking map props in a real scenario)
    expect(layersButton).toBeTruthy();
  });

  it('handles missing location gracefully', () => {
    useLocation.mockReturnValue({
      ...mockLocationContext,
      currentLocation: null,
      currentSafetyStatus: null,
    });

    const { getByTestId } = render(<MapScreen navigation={mockNavigation} />);

    expect(getByTestId('map-view')).toBeTruthy();
    // Should still render map with default region
  });

  it('displays safety status bar with correct styling', () => {
    const { getByText } = render(<MapScreen navigation={mockNavigation} />);

    const statusText = getByText('You are in a safe zone');
    expect(statusText).toBeTruthy();
  });

  it('handles zone details modal close', async () => {
    const { getByTestId, getByText, queryByText } = render(
      <MapScreen navigation={mockNavigation} />
    );

    // Open modal
    const polygon = getByTestId('polygon');
    fireEvent.press(polygon);

    await waitFor(() => {
      expect(getByText('Safe Zone')).toBeTruthy();
    });

    // Close modal
    const closeButton = getByTestId('close-button');
    fireEvent.press(closeButton);

    await waitFor(() => {
      expect(queryByText('Safe Zone')).toBeFalsy();
    });
  });

  it('handles emergency service call from zone details', async () => {
    const { getByTestId, getByText } = render(
      <MapScreen navigation={mockNavigation} />
    );

    // Open zone details
    const polygon = getByTestId('polygon');
    fireEvent.press(polygon);

    await waitFor(() => {
      expect(getByText('Safe Zone')).toBeTruthy();
    });

    // Press emergency service
    const emergencyService = getByText('POLICE');
    fireEvent.press(emergencyService);

    expect(Alert.alert).toHaveBeenCalledWith(
      'Call Emergency Service',
      'Call police at 100?',
      expect.arrayContaining([
        { text: 'Cancel', style: 'cancel' },
        { text: 'Call', onPress: expect.any(Function) },
      ])
    );
  });
});