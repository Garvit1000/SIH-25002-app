import AsyncStorage from '@react-native-async-storage/async-storage';
import { offlineDataService } from '../offline/offlineDataService';
import { offlineMapService } from '../offline/offlineMapService';

// Enhanced mock safety zones data with more comprehensive information
export const mockSafetyZones = [
  {
    id: 'zone_001',
    name: 'Tourist District Central',
    safetyLevel: 'safe',
    description: 'Main tourist area with high security presence',
    coordinates: [
      { latitude: 28.6139, longitude: 77.2090 },
      { latitude: 28.6150, longitude: 77.2100 },
      { latitude: 28.6140, longitude: 77.2110 },
      { latitude: 28.6130, longitude: 77.2100 }
    ],
    emergencyServices: [
      { type: 'police', number: '100', distance: '0.2km', location: { latitude: 28.6145, longitude: 77.2095 } },
      { type: 'medical', number: '108', distance: '0.5km', location: { latitude: 28.6142, longitude: 77.2098 } },
      { type: 'tourist_helpline', number: '1363', distance: '0.1km', location: { latitude: 28.6141, longitude: 77.2092 } }
    ],
    safetyFeatures: ['CCTV Coverage', '24/7 Security Patrol', 'Tourist Police', 'Emergency Phones'],
    crowdLevel: 'high',
    lightingQuality: 'excellent',
    transportAccess: ['Metro', 'Bus', 'Taxi', 'Auto-rickshaw'],
    nearbyLandmarks: ['India Gate', 'Red Fort', 'Connaught Place'],
    lastUpdated: new Date('2024-01-15'),
    riskFactors: [],
    safetyTips: [
      'Stay in groups when possible',
      'Keep valuables secure',
      'Use official tourist guides'
    ]
  },
  {
    id: 'zone_002',
    name: 'Market Area',
    safetyLevel: 'caution',
    description: 'Busy market area - watch for pickpockets',
    coordinates: [
      { latitude: 28.6120, longitude: 77.2080 },
      { latitude: 28.6130, longitude: 77.2090 },
      { latitude: 28.6125, longitude: 77.2095 },
      { latitude: 28.6115, longitude: 77.2085 }
    ],
    emergencyServices: [
      { type: 'police', number: '100', distance: '0.8km', location: { latitude: 28.6118, longitude: 77.2088 } },
      { type: 'medical', number: '108', distance: '1.2km', location: { latitude: 28.6115, longitude: 77.2092 } },
      { type: 'tourist_helpline', number: '1363', distance: '0.6km', location: { latitude: 28.6122, longitude: 77.2087 } }
    ],
    safetyFeatures: ['Some CCTV', 'Market Security', 'Crowd Presence'],
    crowdLevel: 'very_high',
    lightingQuality: 'good',
    transportAccess: ['Bus', 'Auto-rickshaw', 'Cycle-rickshaw'],
    nearbyLandmarks: ['Chandni Chowk', 'Spice Market', 'Jama Masjid'],
    lastUpdated: new Date('2024-01-15'),
    riskFactors: ['Pickpocketing', 'Overcrowding', 'Traffic congestion'],
    safetyTips: [
      'Keep bags in front and zipped',
      'Avoid displaying expensive items',
      'Stay aware of surroundings',
      'Use registered shops only'
    ]
  },
  {
    id: 'zone_003',
    name: 'Industrial Area',
    safetyLevel: 'restricted',
    description: 'Industrial zone - not recommended for tourists',
    coordinates: [
      { latitude: 28.6100, longitude: 77.2050 },
      { latitude: 28.6110, longitude: 77.2060 },
      { latitude: 28.6105, longitude: 77.2065 },
      { latitude: 28.6095, longitude: 77.2055 }
    ],
    emergencyServices: [
      { type: 'police', number: '100', distance: '2.5km', location: { latitude: 28.6080, longitude: 77.2030 } },
      { type: 'medical', number: '108', distance: '3.0km', location: { latitude: 28.6075, longitude: 77.2025 } },
      { type: 'fire', number: '101', distance: '1.8km', location: { latitude: 28.6085, longitude: 77.2035 } }
    ],
    safetyFeatures: ['Limited CCTV', 'Industrial Security'],
    crowdLevel: 'low',
    lightingQuality: 'poor',
    transportAccess: ['Limited Bus Service'],
    nearbyLandmarks: ['Industrial Complex', 'Factory Area'],
    lastUpdated: new Date('2024-01-15'),
    riskFactors: ['Isolated area', 'Poor lighting', 'Limited help available', 'Industrial hazards'],
    safetyTips: [
      'Avoid this area entirely',
      'If lost, contact emergency services immediately',
      'Do not enter industrial premises',
      'Leave the area as quickly as possible'
    ]
  },
  {
    id: 'zone_004',
    name: 'Heritage Monument Zone',
    safetyLevel: 'safe',
    description: 'Protected heritage area with good security',
    coordinates: [
      { latitude: 28.6160, longitude: 77.2120 },
      { latitude: 28.6170, longitude: 77.2130 },
      { latitude: 28.6165, longitude: 77.2135 },
      { latitude: 28.6155, longitude: 77.2125 }
    ],
    emergencyServices: [
      { type: 'police', number: '100', distance: '0.3km', location: { latitude: 28.6162, longitude: 77.2127 } },
      { type: 'medical', number: '108', distance: '0.7km', location: { latitude: 28.6158, longitude: 77.2132 } },
      { type: 'tourist_helpline', number: '1363', distance: '0.2km', location: { latitude: 28.6163, longitude: 77.2128 } }
    ],
    safetyFeatures: ['Heritage Security', 'Tourist Guides', 'CCTV Monitoring', 'Regular Patrols'],
    crowdLevel: 'medium',
    lightingQuality: 'good',
    transportAccess: ['Metro', 'Bus', 'Taxi'],
    nearbyLandmarks: ['Historical Monument', 'Museum', 'Garden'],
    lastUpdated: new Date('2024-01-15'),
    riskFactors: ['Occasional overcrowding during peak hours'],
    safetyTips: [
      'Follow monument guidelines',
      'Stay with official tour groups',
      'Respect cultural norms',
      'Keep tickets and ID ready'
    ]
  }
];

export const safetyZonesService = {
  // Get all safety zones
  getAllSafetyZones: async () => {
    try {
      // In production, this would fetch from backend
      return {
        success: true,
        zones: mockSafetyZones
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Get safety zones by location
  getSafetyZonesByLocation: async (latitude, longitude, radius = 5) => {
    try {
      // Filter zones within radius (simplified calculation)
      const nearbyZones = mockSafetyZones.filter(zone => {
        const centerLat = zone.coordinates.reduce((sum, coord) => sum + coord.latitude, 0) / zone.coordinates.length;
        const centerLon = zone.coordinates.reduce((sum, coord) => sum + coord.longitude, 0) / zone.coordinates.length;
        
        const distance = Math.sqrt(
          Math.pow(latitude - centerLat, 2) + Math.pow(longitude - centerLon, 2)
        ) * 111; // Rough conversion to km
        
        return distance <= radius;
      });

      return {
        success: true,
        zones: nearbyZones
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Get safety zone by ID
  getSafetyZoneById: async (zoneId) => {
    try {
      const zone = mockSafetyZones.find(z => z.id === zoneId);
      
      if (!zone) {
        return { success: false, error: 'Safety zone not found' };
      }

      return { success: true, zone };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Update safety zone data (mock implementation)
  updateSafetyZone: async (zoneId, updates) => {
    try {
      const zoneIndex = mockSafetyZones.findIndex(z => z.id === zoneId);
      
      if (zoneIndex === -1) {
        return { success: false, error: 'Safety zone not found' };
      }

      mockSafetyZones[zoneIndex] = {
        ...mockSafetyZones[zoneIndex],
        ...updates,
        lastUpdated: new Date()
      };

      return { success: true, zone: mockSafetyZones[zoneIndex] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Get emergency services for location
  getEmergencyServices: async (latitude, longitude) => {
    try {
      const nearbyZones = await this.getSafetyZonesByLocation(latitude, longitude, 2);
      
      if (!nearbyZones.success || nearbyZones.zones.length === 0) {
        // Default emergency services
        return {
          success: true,
          services: [
            { type: 'police', number: '100', distance: 'Unknown' },
            { type: 'medical', number: '108', distance: 'Unknown' },
            { type: 'fire', number: '101', distance: 'Unknown' },
            { type: 'tourist_helpline', number: '1363', distance: 'Unknown' }
          ]
        };
      }

      // Get services from nearest zone
      const nearestZone = nearbyZones.zones[0];
      return {
        success: true,
        services: nearestZone.emergencyServices
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Cache safety zones for offline access (Requirement 7.2)
  cacheSafetyZones: async (zones) => {
    try {
      await AsyncStorage.setItem('cached_safety_zones', JSON.stringify({
        zones,
        cachedAt: new Date().toISOString()
      }));
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Get cached safety zones for offline use
  getCachedSafetyZones: async () => {
    try {
      const cached = await AsyncStorage.getItem('cached_safety_zones');
      if (!cached) {
        return { success: false, error: 'No cached zones found' };
      }

      const { zones, cachedAt } = JSON.parse(cached);
      const cacheAge = Date.now() - new Date(cachedAt).getTime();
      const maxCacheAge = 24 * 60 * 60 * 1000; // 24 hours

      return {
        success: true,
        zones,
        isStale: cacheAge > maxCacheAge,
        cachedAt
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Get safety zones with enhanced offline fallback (Requirement 7.2)
  getSafetyZonesWithFallback: async (latitude, longitude, radius = 5) => {
    try {
      // Try to get fresh data first
      const freshData = await this.getSafetyZonesByLocation(latitude, longitude, radius);
      
      if (freshData.success) {
        // Cache the fresh data using enhanced offline service
        await offlineDataService.cacheSafetyZones(freshData.zones, { latitude, longitude });
        await offlineMapService.cacheSafetyZonesWithIndex(freshData.zones, { latitude, longitude }, radius * 1000);
        return freshData;
      }

      // Fallback to enhanced cached data with spatial indexing
      const location = { latitude, longitude };
      const cachedData = await offlineMapService.getSafetyZonesForLocation(location, radius * 1000);
      
      if (cachedData.success) {
        return {
          success: true,
          zones: cachedData.zones,
          isOffline: true,
          isStale: false,
          cachedAt: cachedData.cachedAt
        };
      }

      // Fallback to basic cached data
      const basicCachedData = await offlineDataService.getCachedSafetyZones(location);
      if (basicCachedData.success) {
        // Filter cached zones by location
        const nearbyZones = basicCachedData.zones.filter(zone => {
          const centerLat = zone.coordinates.reduce((sum, coord) => sum + coord.latitude, 0) / zone.coordinates.length;
          const centerLon = zone.coordinates.reduce((sum, coord) => sum + coord.longitude, 0) / zone.coordinates.length;
          
          const distance = Math.sqrt(
            Math.pow(latitude - centerLat, 2) + Math.pow(longitude - centerLon, 2)
          ) * 111; // Rough conversion to km
          
          return distance <= radius;
        });

        return {
          success: true,
          zones: nearbyZones,
          isOffline: true,
          isStale: basicCachedData.isStale,
          cachedAt: basicCachedData.cachedAt
        };
      }

      return { success: false, error: 'No data available offline' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Get detailed zone information including safety tips (Requirement 3.1)
  getZoneDetails: async (zoneId) => {
    try {
      const zone = mockSafetyZones.find(z => z.id === zoneId);
      
      if (!zone) {
        return { success: false, error: 'Safety zone not found' };
      }

      // Add real-time information (simulated)
      const realTimeInfo = {
        currentCrowdLevel: safetyZonesService.getCurrentCrowdLevel(zone.crowdLevel),
        weatherImpact: safetyZonesService.getWeatherImpact(),
        recentIncidents: safetyZonesService.getRecentIncidents(zoneId),
        currentAlerts: safetyZonesService.getCurrentAlerts(zoneId)
      };

      return { 
        success: true, 
        zone: {
          ...zone,
          realTimeInfo
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Simulate current crowd level
  getCurrentCrowdLevel: (baseCrowdLevel) => {
    const hour = new Date().getHours();
    const multipliers = {
      'low': { min: 0.5, max: 1.2 },
      'medium': { min: 0.7, max: 1.5 },
      'high': { min: 0.8, max: 1.8 },
      'very_high': { min: 0.9, max: 2.0 }
    };

    const multiplier = multipliers[baseCrowdLevel] || multipliers['medium'];
    let factor = 1;

    // Peak hours adjustment
    if (hour >= 9 && hour <= 11) factor = multiplier.max; // Morning peak
    else if (hour >= 17 && hour <= 19) factor = multiplier.max; // Evening peak
    else if (hour >= 22 || hour <= 6) factor = multiplier.min; // Night time
    else factor = (multiplier.min + multiplier.max) / 2; // Regular hours

    return {
      level: baseCrowdLevel,
      currentFactor: factor,
      description: safetyZonesService.getCrowdDescription(baseCrowdLevel, factor)
    };
  },

  // Get crowd description
  getCrowdDescription: (level, factor) => {
    if (factor < 0.7) return 'Very quiet';
    if (factor < 1.0) return 'Quiet';
    if (factor < 1.3) return 'Moderate crowd';
    if (factor < 1.6) return 'Busy';
    return 'Very crowded';
  },

  // Simulate weather impact
  getWeatherImpact: () => {
    const conditions = ['clear', 'cloudy', 'light_rain', 'heavy_rain', 'fog'];
    const condition = conditions[Math.floor(Math.random() * conditions.length)];
    
    return {
      condition,
      safetyImpact: safetyZonesService.getWeatherSafetyImpact(condition),
      recommendation: safetyZonesService.getWeatherRecommendation(condition)
    };
  },

  // Get weather safety impact
  getWeatherSafetyImpact: (condition) => {
    const impacts = {
      'clear': 0,
      'cloudy': -5,
      'light_rain': -10,
      'heavy_rain': -20,
      'fog': -15
    };
    return impacts[condition] || 0;
  },

  // Get weather recommendation
  getWeatherRecommendation: (condition) => {
    const recommendations = {
      'clear': 'Good weather for outdoor activities',
      'cloudy': 'Overcast but safe for travel',
      'light_rain': 'Carry umbrella, watch for slippery surfaces',
      'heavy_rain': 'Seek shelter, avoid outdoor activities',
      'fog': 'Reduced visibility, exercise extra caution'
    };
    return recommendations[condition] || 'Monitor weather conditions';
  },

  // Simulate recent incidents (mock data)
  getRecentIncidents: (zoneId) => {
    const incidents = [
      { type: 'theft', severity: 'low', time: '2 hours ago', description: 'Minor pickpocketing reported' },
      { type: 'accident', severity: 'medium', time: '1 day ago', description: 'Traffic accident at intersection' },
      { type: 'disturbance', severity: 'low', time: '3 hours ago', description: 'Crowd disturbance resolved' }
    ];
    
    // Return random subset based on zone safety level
    const zone = mockSafetyZones.find(z => z.id === zoneId);
    if (!zone) return [];
    
    if (zone.safetyLevel === 'safe') return incidents.slice(0, Math.floor(Math.random() * 2));
    if (zone.safetyLevel === 'caution') return incidents.slice(0, Math.floor(Math.random() * 3) + 1);
    return incidents; // restricted areas show all incidents
  },

  // Get current alerts for zone
  getCurrentAlerts: (zoneId) => {
    const zone = mockSafetyZones.find(z => z.id === zoneId);
    if (!zone) return [];

    const alerts = [];
    
    // Add alerts based on zone characteristics
    if (zone.safetyLevel === 'restricted') {
      alerts.push({
        type: 'warning',
        message: 'This area is not recommended for tourists',
        priority: 'high'
      });
    }
    
    if (zone.riskFactors && zone.riskFactors.length > 0) {
      alerts.push({
        type: 'info',
        message: `Be aware of: ${zone.riskFactors.join(', ')}`,
        priority: 'medium'
      });
    }
    
    return alerts;
  },

  // Enhanced offline route safety analysis (Requirement 7.2)
  analyzeRouteSafetyOffline: async (routePoints) => {
    try {
      return await offlineMapService.analyzeRouteSafetyOffline(routePoints);
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Preload safety zones for offline use
  preloadSafetyZonesForArea: async (centerLocation, radiusKm = 10) => {
    try {
      const zones = await this.getSafetyZonesByLocation(
        centerLocation.latitude, 
        centerLocation.longitude, 
        radiusKm
      );

      if (zones.success) {
        // Cache using both services for redundancy
        await offlineDataService.cacheSafetyZones(zones.zones, centerLocation);
        await offlineMapService.cacheSafetyZonesWithIndex(zones.zones, centerLocation, radiusKm * 1000);
        
        return { 
          success: true, 
          cachedZones: zones.zones.length,
          area: `${radiusKm}km radius around ${centerLocation.latitude.toFixed(4)}, ${centerLocation.longitude.toFixed(4)}`
        };
      }

      return zones;
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Get offline cache statistics
  getOfflineCacheStats: async () => {
    try {
      const mapStats = await offlineMapService.getMapCacheStats();
      const dataStats = await offlineDataService.getCacheStatistics();

      return {
        success: true,
        mapCache: mapStats.success ? mapStats.stats : null,
        dataCache: dataStats.success ? dataStats.stats : null
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Clear all offline cache
  clearOfflineCache: async () => {
    try {
      await offlineMapService.clearMapCache();
      await AsyncStorage.removeItem('cached_safety_zones');
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};