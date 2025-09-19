import AsyncStorage from '@react-native-async-storage/async-storage';
import { offlineDataService } from './offlineDataService';

// Map tile and safety zone caching service
export const offlineMapService = {
  // Cache map tiles for offline use (Requirement 7.2)
  cacheMapTiles: async (region, zoomLevels = [10, 12, 14, 16]) => {
    try {
      const { latitude, longitude, latitudeDelta, longitudeDelta } = region;
      
      // Calculate tile bounds for the region
      const tileBounds = calculateTileBounds(
        latitude - latitudeDelta/2,
        longitude - longitudeDelta/2,
        latitude + latitudeDelta/2,
        longitude + longitudeDelta/2,
        zoomLevels
      );

      const cachedTiles = [];
      const failedTiles = [];

      for (const zoom of zoomLevels) {
        const bounds = tileBounds[zoom];
        
        for (let x = bounds.minX; x <= bounds.maxX; x++) {
          for (let y = bounds.minY; y <= bounds.maxY; y++) {
            try {
              const tileUrl = `https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`;
              const tileKey = `map_tile_${zoom}_${x}_${y}`;
              
              // In a real implementation, you would fetch and cache the tile image
              // For now, we'll just store the tile metadata
              const tileData = {
                url: tileUrl,
                zoom,
                x,
                y,
                cachedAt: new Date().toISOString(),
                region: {
                  latitude: tile2lat(y, zoom),
                  longitude: tile2lon(x, zoom)
                }
              };
              
              await AsyncStorage.setItem(tileKey, JSON.stringify(tileData));
              cachedTiles.push(tileKey);
            } catch (error) {
              failedTiles.push({ zoom, x, y, error: error.message });
            }
          }
        }
      }

      // Store tile index for quick lookup
      const tileIndex = {
        region,
        zoomLevels,
        cachedTiles,
        cachedAt: new Date().toISOString(),
        totalTiles: cachedTiles.length
      };

      await AsyncStorage.setItem('map_tile_index', JSON.stringify(tileIndex));

      return { 
        success: true, 
        cachedCount: cachedTiles.length,
        failedCount: failedTiles.length,
        failedTiles
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Get cached map tiles for a region
  getCachedMapTiles: async (region) => {
    try {
      const indexData = await AsyncStorage.getItem('map_tile_index');
      
      if (!indexData) {
        return { success: false, error: 'No cached map tiles found' };
      }

      const index = JSON.parse(indexData);
      
      // Check if requested region overlaps with cached region
      const overlap = calculateRegionOverlap(region, index.region);
      
      if (overlap < 0.5) { // Less than 50% overlap
        return { 
          success: false, 
          error: 'Requested region not sufficiently cached',
          cachedRegion: index.region,
          overlap
        };
      }

      return {
        success: true,
        tiles: index.cachedTiles,
        cachedAt: index.cachedAt,
        totalTiles: index.totalTiles,
        isOffline: true
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Cache safety zones with geographic indexing (Requirement 7.2)
  cacheSafetyZonesWithIndex: async (zones, centerLocation, radius = 10000) => {
    try {
      // Create geographic index for fast spatial queries
      const geoIndex = createGeoIndex(zones, centerLocation, radius);
      
      const safetyData = {
        zones,
        geoIndex,
        centerLocation,
        radius,
        cachedAt: new Date().toISOString(),
        version: 1,
        totalZones: zones.length
      };
      
      await AsyncStorage.setItem('safety_zones_indexed', JSON.stringify(safetyData));
      
      // Also cache individual zones for quick lookup
      for (const zone of zones) {
        const zoneKey = `safety_zone_${zone.id}`;
        await AsyncStorage.setItem(zoneKey, JSON.stringify({
          ...zone,
          cachedAt: new Date().toISOString()
        }));
      }
      
      return { success: true, cachedZones: zones.length };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Get safety zones for a specific location using spatial index
  getSafetyZonesForLocation: async (location, searchRadius = 1000) => {
    try {
      const indexData = await AsyncStorage.getItem('safety_zones_indexed');
      
      if (!indexData) {
        return { success: false, error: 'No cached safety zones found' };
      }

      const safetyData = JSON.parse(indexData);
      
      // Check if location is within cached area
      const distance = calculateDistance(
        location.latitude,
        location.longitude,
        safetyData.centerLocation.latitude,
        safetyData.centerLocation.longitude
      );

      if (distance > safetyData.radius) {
        return { 
          success: false, 
          error: 'Location outside cached area',
          distance,
          cachedRadius: safetyData.radius
        };
      }

      // Use geo index to find nearby zones
      const nearbyZones = findNearbyZones(
        location,
        safetyData.geoIndex,
        searchRadius
      );

      // Get full zone data for nearby zones
      const zones = [];
      for (const zoneId of nearbyZones) {
        try {
          const zoneData = await AsyncStorage.getItem(`safety_zone_${zoneId}`);
          if (zoneData) {
            zones.push(JSON.parse(zoneData));
          }
        } catch (error) {
          console.warn('Error loading cached zone:', zoneId, error);
        }
      }

      return {
        success: true,
        zones,
        cachedAt: safetyData.cachedAt,
        isOffline: true,
        searchRadius,
        foundZones: zones.length
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Get offline route safety analysis
  analyzeRouteSafetyOffline: async (routePoints) => {
    try {
      const routeAnalysis = {
        totalDistance: 0,
        safetyScore: 0,
        riskSegments: [],
        safeSegments: [],
        warnings: [],
        recommendations: []
      };

      let totalSafetyScore = 0;
      let segmentCount = 0;

      // Analyze each segment of the route
      for (let i = 0; i < routePoints.length - 1; i++) {
        const startPoint = routePoints[i];
        const endPoint = routePoints[i + 1];
        
        // Calculate segment distance
        const segmentDistance = calculateDistance(
          startPoint.latitude,
          startPoint.longitude,
          endPoint.latitude,
          endPoint.longitude
        );

        routeAnalysis.totalDistance += segmentDistance;

        // Get safety zones for this segment
        const midPoint = {
          latitude: (startPoint.latitude + endPoint.latitude) / 2,
          longitude: (startPoint.longitude + endPoint.longitude) / 2
        };

        const zonesResult = await offlineMapService.getSafetyZonesForLocation(
          midPoint,
          Math.max(segmentDistance, 500) // At least 500m search radius
        );

        let segmentSafety = 5; // Default neutral safety score

        if (zonesResult.success && zonesResult.zones.length > 0) {
          // Calculate safety score based on zones
          const zoneScores = zonesResult.zones.map(zone => {
            switch (zone.safetyLevel) {
              case 'safe': return 8;
              case 'caution': return 5;
              case 'restricted': return 2;
              default: return 5;
            }
          });

          segmentSafety = zoneScores.reduce((sum, score) => sum + score, 0) / zoneScores.length;
        }

        totalSafetyScore += segmentSafety;
        segmentCount++;

        // Categorize segment
        const segment = {
          start: startPoint,
          end: endPoint,
          distance: segmentDistance,
          safetyScore: segmentSafety,
          zones: zonesResult.success ? zonesResult.zones : []
        };

        if (segmentSafety >= 7) {
          routeAnalysis.safeSegments.push(segment);
        } else if (segmentSafety <= 3) {
          routeAnalysis.riskSegments.push(segment);
          routeAnalysis.warnings.push({
            type: 'high_risk_area',
            message: `High risk area detected at ${midPoint.latitude.toFixed(4)}, ${midPoint.longitude.toFixed(4)}`,
            location: midPoint,
            severity: 'high'
          });
        }
      }

      // Calculate overall safety score
      routeAnalysis.safetyScore = segmentCount > 0 ? totalSafetyScore / segmentCount : 5;

      // Add recommendations based on analysis
      if (routeAnalysis.safetyScore < 4) {
        routeAnalysis.recommendations.push({
          type: 'route_alternative',
          message: 'Consider finding an alternative route with better safety ratings',
          priority: 'high'
        });
      }

      if (routeAnalysis.riskSegments.length > 0) {
        routeAnalysis.recommendations.push({
          type: 'extra_caution',
          message: `Exercise extra caution in ${routeAnalysis.riskSegments.length} high-risk areas`,
          priority: 'medium'
        });
      }

      return { success: true, analysis: routeAnalysis };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Clear cached map data
  clearMapCache: async () => {
    try {
      // Get tile index to find all cached tiles
      const indexData = await AsyncStorage.getItem('map_tile_index');
      
      if (indexData) {
        const index = JSON.parse(indexData);
        
        // Remove all cached tiles
        if (index.cachedTiles) {
          await AsyncStorage.multiRemove(index.cachedTiles);
        }
        
        // Remove tile index
        await AsyncStorage.removeItem('map_tile_index');
      }

      // Remove safety zones index
      await AsyncStorage.removeItem('safety_zones_indexed');

      // Remove individual safety zone caches
      const allKeys = await AsyncStorage.getAllKeys();
      const zoneKeys = allKeys.filter(key => key.startsWith('safety_zone_'));
      
      if (zoneKeys.length > 0) {
        await AsyncStorage.multiRemove(zoneKeys);
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Get cache statistics
  getMapCacheStats: async () => {
    try {
      const stats = {
        mapTiles: 0,
        safetyZones: 0,
        totalSize: 0,
        lastCached: null
      };

      // Check map tiles
      const indexData = await AsyncStorage.getItem('map_tile_index');
      if (indexData) {
        const index = JSON.parse(indexData);
        stats.mapTiles = index.totalTiles || 0;
        stats.lastCached = index.cachedAt;
      }

      // Check safety zones
      const safetyData = await AsyncStorage.getItem('safety_zones_indexed');
      if (safetyData) {
        const safety = JSON.parse(safetyData);
        stats.safetyZones = safety.totalZones || 0;
        if (!stats.lastCached || new Date(safety.cachedAt) > new Date(stats.lastCached)) {
          stats.lastCached = safety.cachedAt;
        }
      }

      return { success: true, stats };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};

// Helper functions for map tile calculations
const calculateTileBounds = (minLat, minLon, maxLat, maxLon, zoomLevels) => {
  const bounds = {};
  
  for (const zoom of zoomLevels) {
    bounds[zoom] = {
      minX: lon2tile(minLon, zoom),
      maxX: lon2tile(maxLon, zoom),
      minY: lat2tile(maxLat, zoom),
      maxY: lat2tile(minLat, zoom)
    };
  }
  
  return bounds;
};

const lon2tile = (lon, zoom) => {
  return Math.floor((lon + 180) / 360 * Math.pow(2, zoom));
};

const lat2tile = (lat, zoom) => {
  return Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom));
};

const tile2lon = (x, zoom) => {
  return x / Math.pow(2, zoom) * 360 - 180;
};

const tile2lat = (y, zoom) => {
  const n = Math.PI - 2 * Math.PI * y / Math.pow(2, zoom);
  return 180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
};

// Helper function to calculate region overlap
const calculateRegionOverlap = (region1, region2) => {
  const lat1Min = region1.latitude - region1.latitudeDelta / 2;
  const lat1Max = region1.latitude + region1.latitudeDelta / 2;
  const lon1Min = region1.longitude - region1.longitudeDelta / 2;
  const lon1Max = region1.longitude + region1.longitudeDelta / 2;

  const lat2Min = region2.latitude - region2.latitudeDelta / 2;
  const lat2Max = region2.latitude + region2.latitudeDelta / 2;
  const lon2Min = region2.longitude - region2.longitudeDelta / 2;
  const lon2Max = region2.longitude + region2.longitudeDelta / 2;

  const overlapLat = Math.max(0, Math.min(lat1Max, lat2Max) - Math.max(lat1Min, lat2Min));
  const overlapLon = Math.max(0, Math.min(lon1Max, lon2Max) - Math.max(lon1Min, lon2Min));

  const overlapArea = overlapLat * overlapLon;
  const region1Area = region1.latitudeDelta * region1.longitudeDelta;

  return overlapArea / region1Area;
};

// Helper function to create geographic index
const createGeoIndex = (zones, centerLocation, radius) => {
  const gridSize = 0.01; // Approximately 1km grid cells
  const index = {};

  for (const zone of zones) {
    // Get zone bounds
    const bounds = getZoneBounds(zone);
    
    // Add zone to all grid cells it intersects
    const minGridX = Math.floor((bounds.minLon - centerLocation.longitude) / gridSize);
    const maxGridX = Math.ceil((bounds.maxLon - centerLocation.longitude) / gridSize);
    const minGridY = Math.floor((bounds.minLat - centerLocation.latitude) / gridSize);
    const maxGridY = Math.ceil((bounds.maxLat - centerLocation.latitude) / gridSize);

    for (let x = minGridX; x <= maxGridX; x++) {
      for (let y = minGridY; y <= maxGridY; y++) {
        const cellKey = `${x},${y}`;
        if (!index[cellKey]) {
          index[cellKey] = [];
        }
        index[cellKey].push(zone.id);
      }
    }
  }

  return index;
};

// Helper function to get zone bounds
const getZoneBounds = (zone) => {
  if (zone.coordinates && zone.coordinates.length > 0) {
    const lats = zone.coordinates.map(coord => coord.latitude);
    const lons = zone.coordinates.map(coord => coord.longitude);
    
    return {
      minLat: Math.min(...lats),
      maxLat: Math.max(...lats),
      minLon: Math.min(...lons),
      maxLon: Math.max(...lons)
    };
  }
  
  // Fallback for point-based zones
  const buffer = 0.001; // Small buffer around point
  return {
    minLat: zone.latitude - buffer,
    maxLat: zone.latitude + buffer,
    minLon: zone.longitude - buffer,
    maxLon: zone.longitude + buffer
  };
};

// Helper function to find nearby zones using index
const findNearbyZones = (location, geoIndex, searchRadius) => {
  const gridSize = 0.01;
  const radiusInGrid = Math.ceil(searchRadius / 111000 / gridSize); // Convert meters to grid cells
  
  const nearbyZones = new Set();
  
  for (let x = -radiusInGrid; x <= radiusInGrid; x++) {
    for (let y = -radiusInGrid; y <= radiusInGrid; y++) {
      const cellKey = `${x},${y}`;
      if (geoIndex[cellKey]) {
        geoIndex[cellKey].forEach(zoneId => nearbyZones.add(zoneId));
      }
    }
  }
  
  return Array.from(nearbyZones);
};

// Helper function to calculate distance
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};