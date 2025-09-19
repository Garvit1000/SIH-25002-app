import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { locationPermissionHandler } from '../services/location/permissionHandler';
import { realTimeLocationService } from '../services/location/realTimeLocationService';
import { geoFencingService } from '../services/location/geoFencing';
import { safetyZonesService } from '../services/location/safetyZones';

const LocationContext = createContext({});

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};

export const LocationProvider = ({ children }) => {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [currentSafetyStatus, setCurrentSafetyStatus] = useState(null);
  const [safetyZones, setSafetyZones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState({
    foreground: 'undetermined',
    background: 'undetermined'
  });
  const [locationAccuracy, setLocationAccuracy] = useState(null);
  const [trackingStats, setTrackingStats] = useState(null);
  const [locationError, setLocationError] = useState(null);

  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      initializeLocationServices();
      initialized.current = true;
    }

    return () => {
      if (initialized.current) {
        realTimeLocationService.cleanup();
      }
    };
  }, []);

  /**
   * Initialize location services with proper permission handling
   * Requirement 4.1: Clear permission dialog and user messaging
   */
  const initializeLocationServices = async () => {
    try {
      setLoading(true);
      setLocationError(null);

      // Initialize permission handler
      locationPermissionHandler.initialize({
        onPermissionGranted: (permissions) => {
          setPermissionStatus(permissions);
          console.log('Location permissions granted:', permissions);
        },
        onPermissionDenied: (type, result) => {
          console.log('Location permission denied:', type, result);
          setLocationError(`Location permission ${type} was denied`);
        },
        onPermissionChanged: (status) => {
          setPermissionStatus(status);
        }
      });

      // Initialize real-time location service
      realTimeLocationService.initialize({
        onLocationUpdate: handleLocationUpdate,
        onLocationError: handleLocationError,
        onTrackingStarted: (data) => {
          setIsTracking(true);
          setTrackingStats(data);
          console.log('Location tracking started');
        },
        onTrackingStopped: (data) => {
          setIsTracking(false);
          setTrackingStats(data);
          console.log('Location tracking stopped');
        },
        onAccuracyChanged: (accuracyData) => {
          setLocationAccuracy(accuracyData);
        }
      });

      // Load safety zones
      await loadSafetyZones();

      // Check current permission status
      const currentPermissions = await locationPermissionHandler.checkCurrentPermissionStatus();
      setPermissionStatus(currentPermissions);

      // Try to get initial location if permissions are granted
      if (currentPermissions.foreground === 'granted') {
        await getCurrentLocationWithFallback();
      }

      setLoading(false);
    } catch (error) {
      console.error('Location initialization error:', error);
      setLocationError(error.message);
      setLoading(false);
    }
  };

  /**
   * Handle location updates from real-time service
   * Requirement 4.3: Real-time position updates
   */
  const handleLocationUpdate = async (updateData) => {
    try {
      const { location } = updateData;
      setCurrentLocation(location);
      setTrackingStats(updateData.trackingStats);

      // Update safety status based on new location
      if (safetyZones.length > 0) {
        const safetyCheck = await geoFencingService.checkSafetyZone(location, safetyZones);
        if (safetyCheck.success) {
          setCurrentSafetyStatus(safetyCheck);
        }
      }
    } catch (error) {
      console.error('Error handling location update:', error);
    }
  };

  /**
   * Handle location errors
   */
  const handleLocationError = (errorData) => {
    console.error('Location error:', errorData);
    setLocationError(errorData.error);
  };

  /**
   * Load safety zones for the area
   */
  const loadSafetyZones = async () => {
    try {
      const zonesResult = await safetyZonesService.getAllSafetyZones();
      if (zonesResult.success) {
        setSafetyZones(zonesResult.zones);
      }
    } catch (error) {
      console.error('Error loading safety zones:', error);
    }
  };

  /**
   * Get current location with comprehensive error handling
   * Requirement 4.2: High-accuracy location retrieval
   */
  const getCurrentLocation = async (options = {}) => {
    try {
      setLoading(true);
      setLocationError(null);

      const locationResult = await realTimeLocationService.getCurrentLocation({
        highAccuracy: true,
        ...options
      });

      if (locationResult.success) {
        setCurrentLocation(locationResult.location);
        
        // Update safety status
        if (safetyZones.length > 0) {
          const safetyCheck = await geoFencingService.checkSafetyZone(locationResult.location, safetyZones);
          if (safetyCheck.success) {
            setCurrentSafetyStatus(safetyCheck);
          }
        }

        setLoading(false);
        return locationResult.location;
      } else {
        throw new Error(locationResult.error);
      }
    } catch (error) {
      setLoading(false);
      setLocationError(error.message);
      console.error('Error getting current location:', error);
      throw error;
    }
  };

  /**
   * Get current location with fallback to cached data
   */
  const getCurrentLocationWithFallback = async () => {
    try {
      return await getCurrentLocation();
    } catch (error) {
      // Try to get cached location as fallback
      const cachedResult = await realTimeLocationService.getLastCachedLocation();
      if (cachedResult.success) {
        setCurrentLocation(cachedResult.location);
        return cachedResult.location;
      }
      throw error;
    }
  };

  /**
   * Request location permissions with user-friendly flow
   * Requirement 4.1: Clear permission dialog and messaging
   */
  const requestLocationPermission = async (options = {}) => {
    try {
      setLoading(true);
      setLocationError(null);

      const permissionResult = await locationPermissionHandler.requestLocationPermissions({
        showExplanation: true,
        requireBackground: options.requireBackground || false,
        emergencyMode: options.emergencyMode || false
      });

      setPermissionStatus(permissionResult.permissions || {});
      setLoading(false);

      return {
        success: permissionResult.success,
        granted: permissionResult.success,
        permissions: permissionResult.permissions,
        error: permissionResult.error
      };
    } catch (error) {
      setLoading(false);
      setLocationError(error.message);
      console.error('Error requesting location permission:', error);
      return { success: false, error: error.message };
    }
  };

  /**
   * Start real-time location tracking
   * Requirement 4.2, 4.3: High-accuracy real-time tracking
   */
  const startLocationTracking = async (options = {}) => {
    try {
      setLocationError(null);

      const trackingResult = await realTimeLocationService.startRealTimeTracking({
        enableBackground: options.enableBackground || false,
        emergencyMode: options.emergencyMode || false,
        batteryOptimized: options.batteryOptimized || false,
        ...options
      });

      if (trackingResult.success) {
        setIsTracking(true);
        return trackingResult;
      } else {
        setLocationError(trackingResult.error);
        return trackingResult;
      }
    } catch (error) {
      setLocationError(error.message);
      console.error('Error starting location tracking:', error);
      return { success: false, error: error.message };
    }
  };

  /**
   * Stop real-time location tracking
   */
  const stopLocationTracking = async () => {
    try {
      const result = await realTimeLocationService.stopRealTimeTracking();
      if (result.success) {
        setIsTracking(false);
      }
      return result;
    } catch (error) {
      console.error('Error stopping location tracking:', error);
      return { success: false, error: error.message };
    }
  };

  /**
   * Get location accuracy information
   */
  const getLocationAccuracy = () => {
    if (locationAccuracy) {
      return locationAccuracy;
    }

    if (currentLocation?.accuracy) {
      return realTimeLocationService.getAccuracyQuality(currentLocation.accuracy);
    }

    return {
      level: 'unknown',
      accuracy: null,
      description: 'Location accuracy not available'
    };
  };

  /**
   * Calculate route safety with enhanced analysis
   */
  const calculateRouteSafety = async (routePoints) => {
    try {
      if (!routePoints || routePoints.length === 0) {
        return { success: false, error: 'No route points provided' };
      }

      const safetyResult = await geoFencingService.calculateRouteSafetyScore(routePoints, safetyZones);
      
      if (safetyResult.success) {
        return {
          success: true,
          score: safetyResult.score,
          breakdown: safetyResult.breakdown,
          recommendation: safetyResult.recommendation
        };
      }

      return safetyResult;
    } catch (error) {
      console.error('Error calculating route safety:', error);
      return { success: false, error: error.message };
    }
  };

  /**
   * Get permission status with descriptions
   */
  const getPermissionStatusDescription = () => {
    return locationPermissionHandler.getPermissionStatusDescription();
  };

  /**
   * Check if location services are enabled
   */
  const checkLocationServicesEnabled = async () => {
    return await locationPermissionHandler.checkLocationServicesEnabled();
  };

  /**
   * Get tracking statistics
   */
  const getTrackingStatistics = () => {
    return realTimeLocationService.getTrackingStats();
  };

  const value = {
    // State
    currentLocation,
    currentSafetyStatus,
    safetyZones,
    loading,
    isTracking,
    permissionStatus,
    locationAccuracy,
    trackingStats,
    locationError,

    // Location functions
    getCurrentLocation,
    getCurrentLocationWithFallback,
    
    // Permission functions
    requestLocationPermission,
    getPermissionStatusDescription,
    checkLocationServicesEnabled,
    
    // Tracking functions
    startLocationTracking,
    stopLocationTracking,
    getTrackingStatistics,
    
    // Utility functions
    getLocationAccuracy,
    calculateRouteSafety,
    
    // Safety functions
    loadSafetyZones
  };

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
};

export { LocationContext };