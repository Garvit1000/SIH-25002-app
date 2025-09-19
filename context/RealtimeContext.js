import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { realtimeSyncService } from '../services/realtime/realtimeSyncService';
import { locationSharingService } from '../services/realtime/locationSharingService';
import { useAuth } from './AuthContext';

// Initial state
const initialState = {
  // Sync status
  isOnline: true,
  lastSync: null,
  pendingOperations: 0,
  
  // Emergency status
  activeEmergency: null,
  emergencyLocationSharing: null,
  
  // Location sharing
  activeLocationSharing: null,
  sharedLocations: new Map(),
  
  // Safety zones
  safetyZones: [],
  lastSafetyZoneUpdate: null,
  
  // Real-time listeners
  activeListeners: new Set(),
  
  // Notifications
  realtimeNotifications: [],
  
  // Error state
  error: null,
  isInitialized: false
};

// Action types
const ActionTypes = {
  SET_ONLINE_STATUS: 'SET_ONLINE_STATUS',
  SET_SYNC_STATUS: 'SET_SYNC_STATUS',
  SET_ACTIVE_EMERGENCY: 'SET_ACTIVE_EMERGENCY',
  SET_EMERGENCY_LOCATION_SHARING: 'SET_EMERGENCY_LOCATION_SHARING',
  SET_ACTIVE_LOCATION_SHARING: 'SET_ACTIVE_LOCATION_SHARING',
  UPDATE_SHARED_LOCATION: 'UPDATE_SHARED_LOCATION',
  SET_SAFETY_ZONES: 'SET_SAFETY_ZONES',
  ADD_REALTIME_NOTIFICATION: 'ADD_REALTIME_NOTIFICATION',
  REMOVE_REALTIME_NOTIFICATION: 'REMOVE_REALTIME_NOTIFICATION',
  SET_ERROR: 'SET_ERROR',
  SET_INITIALIZED: 'SET_INITIALIZED',
  RESET_STATE: 'RESET_STATE'
};

// Reducer
const realtimeReducer = (state, action) => {
  switch (action.type) {
    case ActionTypes.SET_ONLINE_STATUS:
      return {
        ...state,
        isOnline: action.payload
      };
      
    case ActionTypes.SET_SYNC_STATUS:
      return {
        ...state,
        lastSync: action.payload.lastSync,
        pendingOperations: action.payload.pendingOperations
      };
      
    case ActionTypes.SET_ACTIVE_EMERGENCY:
      return {
        ...state,
        activeEmergency: action.payload
      };
      
    case ActionTypes.SET_EMERGENCY_LOCATION_SHARING:
      return {
        ...state,
        emergencyLocationSharing: action.payload
      };
      
    case ActionTypes.SET_ACTIVE_LOCATION_SHARING:
      return {
        ...state,
        activeLocationSharing: action.payload
      };
      
    case ActionTypes.UPDATE_SHARED_LOCATION:
      const newSharedLocations = new Map(state.sharedLocations);
      newSharedLocations.set(action.payload.sessionId, action.payload.data);
      return {
        ...state,
        sharedLocations: newSharedLocations
      };
      
    case ActionTypes.SET_SAFETY_ZONES:
      return {
        ...state,
        safetyZones: action.payload.zones,
        lastSafetyZoneUpdate: action.payload.timestamp
      };
      
    case ActionTypes.ADD_REALTIME_NOTIFICATION:
      return {
        ...state,
        realtimeNotifications: [action.payload, ...state.realtimeNotifications.slice(0, 9)]
      };
      
    case ActionTypes.REMOVE_REALTIME_NOTIFICATION:
      return {
        ...state,
        realtimeNotifications: state.realtimeNotifications.filter(
          notification => notification.id !== action.payload
        )
      };
      
    case ActionTypes.SET_ERROR:
      return {
        ...state,
        error: action.payload
      };
      
    case ActionTypes.SET_INITIALIZED:
      return {
        ...state,
        isInitialized: action.payload
      };
      
    case ActionTypes.RESET_STATE:
      return initialState;
      
    default:
      return state;
  }
};

// Context
const RealtimeContext = createContext();

// Provider component
export const RealtimeProvider = ({ children }) => {
  const [state, dispatch] = useReducer(realtimeReducer, initialState);
  const { user } = useAuth();

  // Initialize real-time services
  useEffect(() => {
    if (user?.uid && !state.isInitialized) {
      initializeRealtimeServices();
    }
    
    return () => {
      if (state.isInitialized) {
        cleanup();
      }
    };
  }, [user?.uid]);

  const initializeRealtimeServices = async () => {
    try {
      // Initialize real-time sync service
      const syncResult = await realtimeSyncService.initialize(user.uid);
      
      if (syncResult.success) {
        dispatch({ type: ActionTypes.SET_INITIALIZED, payload: true });
        
        // Set up periodic sync status updates
        const syncInterval = setInterval(updateSyncStatus, 30000); // Every 30 seconds
        
        // Set up network status monitoring
        setupNetworkMonitoring();
        
        // Load cached data
        await loadCachedData();
        
        return () => {
          clearInterval(syncInterval);
        };
      } else {
        dispatch({ type: ActionTypes.SET_ERROR, payload: syncResult.error });
      }
    } catch (error) {
      dispatch({ type: ActionTypes.SET_ERROR, payload: error.message });
    }
  };

  const setupNetworkMonitoring = () => {
    // Monitor network connectivity changes
    const { NetInfo } = require('@react-native-community/netinfo');
    
    const unsubscribe = NetInfo.addEventListener(state => {
      dispatch({ type: ActionTypes.SET_ONLINE_STATUS, payload: state.isConnected });
      
      if (state.isConnected && !realtimeSyncService.syncStatus.isOnline) {
        // Came back online, process pending operations
        realtimeSyncService.processPendingOperations();
      }
    });
    
    return unsubscribe;
  };

  const loadCachedData = async () => {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      
      // Load cached emergency status
      const cachedEmergency = await AsyncStorage.getItem('active_emergency');
      if (cachedEmergency) {
        const emergency = JSON.parse(cachedEmergency);
        dispatch({ type: ActionTypes.SET_ACTIVE_EMERGENCY, payload: emergency });
      }
      
      // Load cached location sharing
      const cachedLocationSharing = await AsyncStorage.getItem('active_location_sharing');
      if (cachedLocationSharing) {
        const locationSharing = JSON.parse(cachedLocationSharing);
        dispatch({ type: ActionTypes.SET_ACTIVE_LOCATION_SHARING, payload: locationSharing });
      }
      
      // Load cached safety zones
      const cachedSafetyZones = await AsyncStorage.getItem('safety_zones');
      if (cachedSafetyZones) {
        const safetyZones = JSON.parse(cachedSafetyZones);
        dispatch({ 
          type: ActionTypes.SET_SAFETY_ZONES, 
          payload: { zones: safetyZones, timestamp: new Date() }
        });
      }
      
    } catch (error) {
      console.error('Error loading cached data:', error);
    }
  };

  const updateSyncStatus = async () => {
    try {
      const stats = await realtimeSyncService.getSyncStats();
      if (stats.success) {
        dispatch({
          type: ActionTypes.SET_SYNC_STATUS,
          payload: {
            lastSync: stats.stats.lastSync,
            pendingOperations: stats.stats.pendingOperations
          }
        });
        
        dispatch({ type: ActionTypes.SET_ONLINE_STATUS, payload: stats.stats.isOnline });
      }
    } catch (error) {
      console.error('Error updating sync status:', error);
    }
  };

  const cleanup = () => {
    realtimeSyncService.cleanup();
  };

  // Actions
  const actions = {
    // Emergency actions
    startEmergencyLocationSharing: async (emergencyContacts) => {
      try {
        const result = await locationSharingService.createEmergencyLocationSharing(
          user.uid, 
          emergencyContacts
        );
        
        if (result.success) {
          dispatch({ 
            type: ActionTypes.SET_EMERGENCY_LOCATION_SHARING, 
            payload: { sessionId: result.sessionId, startTime: new Date() }
          });
        }
        
        return result;
      } catch (error) {
        dispatch({ type: ActionTypes.SET_ERROR, payload: error.message });
        return { success: false, error: error.message };
      }
    },

    stopEmergencyLocationSharing: async () => {
      try {
        if (state.emergencyLocationSharing) {
          const result = await locationSharingService.stopLocationSharing(
            state.emergencyLocationSharing.sessionId
          );
          
          if (result.success) {
            dispatch({ type: ActionTypes.SET_EMERGENCY_LOCATION_SHARING, payload: null });
          }
          
          return result;
        }
        
        return { success: true };
      } catch (error) {
        dispatch({ type: ActionTypes.SET_ERROR, payload: error.message });
        return { success: false, error: error.message };
      }
    },

    // Location sharing actions
    startLocationSharing: async (options) => {
      try {
        const result = await locationSharingService.startLocationSharing({
          ...options,
          userId: user.uid
        });
        
        if (result.success) {
          dispatch({ 
            type: ActionTypes.SET_ACTIVE_LOCATION_SHARING, 
            payload: { sessionId: result.sessionId, ...options }
          });
        }
        
        return result;
      } catch (error) {
        dispatch({ type: ActionTypes.SET_ERROR, payload: error.message });
        return { success: false, error: error.message };
      }
    },

    stopLocationSharing: async () => {
      try {
        if (state.activeLocationSharing) {
          const result = await locationSharingService.stopLocationSharing(
            state.activeLocationSharing.sessionId
          );
          
          if (result.success) {
            dispatch({ type: ActionTypes.SET_ACTIVE_LOCATION_SHARING, payload: null });
          }
          
          return result;
        }
        
        return { success: true };
      } catch (error) {
        dispatch({ type: ActionTypes.SET_ERROR, payload: error.message });
        return { success: false, error: error.message };
      }
    },

    // Listen to shared location
    listenToSharedLocation: (sessionId, callback) => {
      return locationSharingService.listenToSharedLocation(sessionId, (result) => {
        if (result.success) {
          dispatch({
            type: ActionTypes.UPDATE_SHARED_LOCATION,
            payload: { sessionId, data: result }
          });
        }
        
        if (callback) callback(result);
      });
    },

    // Notification actions
    addRealtimeNotification: (notification) => {
      const notificationWithId = {
        ...notification,
        id: Date.now().toString(),
        timestamp: new Date()
      };
      
      dispatch({ 
        type: ActionTypes.ADD_REALTIME_NOTIFICATION, 
        payload: notificationWithId 
      });
      
      return notificationWithId.id;
    },

    removeRealtimeNotification: (notificationId) => {
      dispatch({ 
        type: ActionTypes.REMOVE_REALTIME_NOTIFICATION, 
        payload: notificationId 
      });
    },

    // Sync actions
    forceSyncPendingOperations: async () => {
      try {
        const result = await realtimeSyncService.processPendingOperations();
        
        if (result.success) {
          dispatch({
            type: ActionTypes.SET_SYNC_STATUS,
            payload: {
              lastSync: new Date(),
              pendingOperations: result.remaining
            }
          });
        }
        
        return result;
      } catch (error) {
        dispatch({ type: ActionTypes.SET_ERROR, payload: error.message });
        return { success: false, error: error.message };
      }
    },

    // Clear error
    clearError: () => {
      dispatch({ type: ActionTypes.SET_ERROR, payload: null });
    }
  };

  const value = {
    ...state,
    ...actions
  };

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
};

// Hook to use realtime context
export const useRealtime = () => {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
};

export default RealtimeContext;