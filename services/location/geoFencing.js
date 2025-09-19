import { geoLocationService } from './geoLocation';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const geoFencingService = {
  // Check if point is inside polygon (safety zone)
  isPointInPolygon: (point, polygon) => {
    const { latitude: x, longitude: y } = point;
    let inside = false;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].latitude;
      const yi = polygon[i].longitude;
      const xj = polygon[j].latitude;
      const yj = polygon[j].longitude;

      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }

    return inside;
  },

  // Check safety zone for current location
  checkSafetyZone: async (location, safetyZones) => {
    try {
      const { latitude, longitude } = location;
      
      for (const zone of safetyZones) {
        const isInside = geoFencingService.isPointInPolygon(
          { latitude, longitude },
          zone.coordinates
        );

        if (isInside) {
          return {
            success: true,
            zone: zone,
            safetyLevel: zone.safetyLevel,
            isInSafeZone: zone.safetyLevel === 'safe',
            message: geoFencingService.getSafetyMessage(zone.safetyLevel)
          };
        }
      }

      // If not in any defined zone, consider as unknown/caution
      return {
        success: true,
        zone: null,
        safetyLevel: 'caution',
        isInSafeZone: false,
        message: 'You are in an unmonitored area. Please exercise caution.'
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Get safety message based on level
  getSafetyMessage: (safetyLevel) => {
    switch (safetyLevel) {
      case 'safe':
        return 'You are in a safe zone. Enjoy your visit!';
      case 'caution':
        return 'Exercise caution in this area. Stay alert and avoid isolated areas.';
      case 'restricted':
        return 'This is a restricted area. Please leave immediately and contact authorities if needed.';
      default:
        return 'Safety status unknown. Please exercise caution.';
    }
  },

  // Calculate safety score for a route
  calculateRouteSafetyScore: async (routePoints, safetyZones) => {
    try {
      let totalScore = 0;
      let safePoints = 0;
      let cautionPoints = 0;
      let restrictedPoints = 0;

      for (const point of routePoints) {
        const zoneCheck = await geoFencingService.checkSafetyZone(point, safetyZones);
        
        if (zoneCheck.success) {
          switch (zoneCheck.safetyLevel) {
            case 'safe':
              totalScore += 100;
              safePoints++;
              break;
            case 'caution':
              totalScore += 50;
              cautionPoints++;
              break;
            case 'restricted':
              totalScore += 0;
              restrictedPoints++;
              break;
          }
        }
      }

      const averageScore = routePoints.length > 0 ? totalScore / routePoints.length : 0;

      return {
        success: true,
        score: Math.round(averageScore),
        breakdown: {
          safe: safePoints,
          caution: cautionPoints,
          restricted: restrictedPoints,
          total: routePoints.length
        },
        recommendation: this.getRouteRecommendation(averageScore)
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Get route recommendation based on safety score
  getRouteRecommendation: (score) => {
    if (score >= 80) {
      return 'This route is generally safe for tourists.';
    } else if (score >= 50) {
      return 'This route requires caution. Consider alternative paths.';
    } else {
      return 'This route is not recommended. Please choose a safer alternative.';
    }
  },

  // Enhanced safety score calculation with multiple factors (Requirement 3.5)
  calculateAdvancedSafetyScore: async (location, safetyZones, options = {}) => {
    try {
      const baseScore = await geoFencingService.calculateRouteSafetyScore([location], safetyZones);
      if (!baseScore.success) return baseScore;

      let adjustedScore = baseScore.score;
      const factors = [];

      // Time of day factor (Requirement 3.1)
      const hour = new Date().getHours();
      if (hour >= 22 || hour <= 5) {
        adjustedScore *= 0.8; // Reduce score during night hours
        factors.push({ factor: 'Night time', impact: -20, description: 'Reduced visibility and activity' });
      } else if (hour >= 6 && hour <= 18) {
        adjustedScore *= 1.1; // Boost score during day hours
        factors.push({ factor: 'Day time', impact: +10, description: 'Better visibility and activity' });
      }

      // Crowd density factor (simulated)
      const crowdDensity = options.crowdDensity || Math.random();
      if (crowdDensity > 0.7) {
        adjustedScore *= 1.05; // Slight boost for crowded areas
        factors.push({ factor: 'High crowd density', impact: +5, description: 'More people around for help' });
      } else if (crowdDensity < 0.3) {
        adjustedScore *= 0.9; // Reduce score for isolated areas
        factors.push({ factor: 'Low crowd density', impact: -10, description: 'Fewer people around' });
      }

      // Weather factor (simulated)
      const weatherCondition = options.weather || 'clear';
      if (weatherCondition === 'rain' || weatherCondition === 'storm') {
        adjustedScore *= 0.85;
        factors.push({ factor: 'Bad weather', impact: -15, description: 'Weather conditions affect safety' });
      }

      // Emergency services proximity
      const nearestEmergencyDistance = geoFencingService.calculateNearestEmergencyService(location, safetyZones);
      if (nearestEmergencyDistance < 1) {
        adjustedScore *= 1.1;
        factors.push({ factor: 'Emergency services nearby', impact: +10, description: 'Quick response available' });
      } else if (nearestEmergencyDistance > 5) {
        adjustedScore *= 0.9;
        factors.push({ factor: 'Emergency services distant', impact: -10, description: 'Slower response time' });
      }

      return {
        success: true,
        score: Math.max(0, Math.min(100, Math.round(adjustedScore))),
        baseScore: baseScore.score,
        factors,
        recommendation: geoFencingService.getDetailedRecommendation(adjustedScore, factors),
        riskLevel: geoFencingService.getRiskLevel(adjustedScore)
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Calculate distance to nearest emergency service
  calculateNearestEmergencyService: (location, safetyZones) => {
    let minDistance = Infinity;
    
    safetyZones.forEach(zone => {
      if (zone.emergencyServices && zone.emergencyServices.length > 0) {
        const centerLat = zone.coordinates.reduce((sum, coord) => sum + coord.latitude, 0) / zone.coordinates.length;
        const centerLon = zone.coordinates.reduce((sum, coord) => sum + coord.longitude, 0) / zone.coordinates.length;
        
        const distance = geoLocationService.calculateDistance(
          location.latitude, location.longitude, centerLat, centerLon
        );
        
        minDistance = Math.min(minDistance, distance);
      }
    });
    
    return minDistance === Infinity ? 10 : minDistance; // Default to 10km if no services found
  },

  // Get detailed recommendation based on score and factors
  getDetailedRecommendation: (score, factors) => {
    const negativeFactors = factors.filter(f => f.impact < 0);
    const positiveFactors = factors.filter(f => f.impact > 0);
    
    let recommendation = geoFencingService.getRouteRecommendation(score);
    
    if (negativeFactors.length > 0) {
      recommendation += ` Consider: ${negativeFactors.map(f => f.description).join(', ')}.`;
    }
    
    if (positiveFactors.length > 0) {
      recommendation += ` Advantages: ${positiveFactors.map(f => f.description).join(', ')}.`;
    }
    
    return recommendation;
  },

  // Get risk level classification
  getRiskLevel: (score) => {
    if (score >= 80) return 'low';
    if (score >= 60) return 'medium';
    if (score >= 40) return 'high';
    return 'critical';
  },

  // Enhanced geo-fence monitoring with zone transition detection (Requirement 3.3)
  startAdvancedGeoFenceMonitoring: async (safetyZones, callback, options = {}) => {
    try {
      let previousZone = null;
      let zoneEntryTime = null;
      
      const trackingResult = await geoLocationService.startSmartLocationTracking(
        async (location) => {
          const zoneCheck = await geoFencingService.checkSafetyZone(location, safetyZones);
          const safetyScore = await geoFencingService.calculateAdvancedSafetyScore(location, safetyZones, options);
          
          // Detect zone transitions
          const currentZone = zoneCheck.zone?.id || null;
          let zoneTransition = null;
          
          if (currentZone !== previousZone) {
            zoneTransition = {
              from: previousZone,
              to: currentZone,
              timestamp: new Date(),
              timeInPreviousZone: previousZone && zoneEntryTime ? 
                (Date.now() - zoneEntryTime.getTime()) / 1000 : null
            };
            
            previousZone = currentZone;
            zoneEntryTime = new Date();
            
            // Cache zone transition for analytics
            geoFencingService.cacheZoneTransition(zoneTransition);
          }
          
          callback({
            location,
            safetyStatus: zoneCheck,
            safetyScore: safetyScore.success ? safetyScore : null,
            zoneTransition,
            timestamp: new Date()
          });
        },
        { 
          timeInterval: options.isEmergency ? 3000 : 8000, 
          distanceInterval: options.isEmergency ? 3 : 10,
          isEmergency: options.isEmergency || false
        }
      );

      return trackingResult;
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Cache zone transitions for analytics
  cacheZoneTransition: async (transition) => {
    try {
      const transitions = await geoFencingService.getZoneTransitionHistory();
      const updatedTransitions = [transition, ...transitions.slice(0, 49)]; // Keep last 50 transitions
      
      await AsyncStorage.setItem('zone_transitions', JSON.stringify(updatedTransitions));
    } catch (error) {
      console.error('Error caching zone transition:', error);
    }
  },

  // Get zone transition history
  getZoneTransitionHistory: async () => {
    try {
      const transitions = await AsyncStorage.getItem('zone_transitions');
      return transitions ? JSON.parse(transitions) : [];
    } catch (error) {
      console.error('Error getting zone transition history:', error);
      return [];
    }
  },

  // Monitor geo-fence boundaries (enhanced version)
  startGeoFenceMonitoring: async (safetyZones, callback) => {
    return geoFencingService.startAdvancedGeoFenceMonitoring(safetyZones, callback);
  },

  // Generate safety alerts based on zone and conditions (Requirement 3.2)
  generateSafetyAlert: (location, safetyStatus, safetyScore) => {
    const alerts = [];
    
    // Zone-based alerts
    if (safetyStatus.safetyLevel === 'restricted') {
      alerts.push({
        type: 'danger',
        title: 'Restricted Area Warning',
        message: 'You have entered a restricted area. Please leave immediately.',
        priority: 'high',
        actions: ['Call Emergency', 'Get Directions Out', 'Share Location']
      });
    } else if (safetyStatus.safetyLevel === 'caution') {
      alerts.push({
        type: 'warning',
        title: 'Caution Area',
        message: 'Exercise extra caution in this area. Stay alert and avoid isolated spots.',
        priority: 'medium',
        actions: ['View Safety Tips', 'Share Location', 'Find Safe Route']
      });
    }
    
    // Score-based alerts
    if (safetyScore && safetyScore.score < 40) {
      alerts.push({
        type: 'warning',
        title: 'Low Safety Score',
        message: `Current safety score: ${safetyScore.score}/100. Consider moving to a safer area.`,
        priority: 'medium',
        actions: ['Find Safe Route', 'Call Contact', 'View Recommendations']
      });
    }
    
    // Time-based alerts
    const hour = new Date().getHours();
    if ((hour >= 22 || hour <= 5) && safetyStatus.safetyLevel !== 'safe') {
      alerts.push({
        type: 'info',
        title: 'Night Safety Reminder',
        message: 'It\'s late. Consider staying in well-lit, populated areas.',
        priority: 'low',
        actions: ['Find Accommodation', 'Call Taxi', 'Share Location']
      });
    }
    
    return alerts;
  }
};