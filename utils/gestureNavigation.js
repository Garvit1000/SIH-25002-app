import { Dimensions, Platform } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

class GestureNavigationHelper {
  constructor() {
    this.isOneHandedMode = false;
    this.dominantHand = 'right'; // 'left' or 'right'
    this.gestureThreshold = 50;
    this.velocityThreshold = 500;
    this.listeners = [];
  }

  // Enable one-handed operation mode
  setOneHandedMode(enabled, dominantHand = 'right') {
    this.isOneHandedMode = enabled;
    this.dominantHand = dominantHand;
    this.notifyListeners('oneHandedModeChanged', { enabled, dominantHand });
  }

  // Get thumb-reach optimized layout props
  getThumbReachLayout() {
    const isLargeScreen = screenWidth > 375;
    const thumbReachHeight = isLargeScreen ? screenHeight * 0.6 : screenHeight * 0.7;
    
    return {
      // Safe area for thumb reach (bottom portion of screen)
      thumbReachArea: {
        height: thumbReachHeight,
        bottom: 0,
      },
      // Optimal touch target size
      minTouchTarget: 44,
      // Spacing optimized for thumb navigation
      thumbSpacing: {
        horizontal: this.dominantHand === 'right' ? 16 : 20,
        vertical: 12,
      },
      // Button positioning for one-handed use
      buttonPosition: {
        alignSelf: this.dominantHand === 'right' ? 'flex-end' : 'flex-start',
        marginHorizontal: 16,
      },
    };
  }

  // Create swipe gesture for navigation
  createSwipeGesture(onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown) {
    return Gesture.Pan()
      .onEnd((event) => {
        const { translationX, translationY, velocityX, velocityY } = event;
        
        // Determine swipe direction based on translation and velocity
        const absX = Math.abs(translationX);
        const absY = Math.abs(translationY);
        
        // Horizontal swipes
        if (absX > absY && absX > this.gestureThreshold) {
          if (translationX > 0 && velocityX > this.velocityThreshold) {
            // Swipe right
            runOnJS(onSwipeRight)();
          } else if (translationX < 0 && velocityX < -this.velocityThreshold) {
            // Swipe left
            runOnJS(onSwipeLeft)();
          }
        }
        // Vertical swipes
        else if (absY > this.gestureThreshold) {
          if (translationY > 0 && velocityY > this.velocityThreshold) {
            // Swipe down
            runOnJS(onSwipeDown)();
          } else if (translationY < 0 && velocityY < -this.velocityThreshold) {
            // Swipe up
            runOnJS(onSwipeUp)();
          }
        }
      });
  }

  // Create edge swipe gesture for back navigation
  createEdgeSwipeGesture(onBackSwipe) {
    const edgeWidth = 20; // Width of edge detection area
    
    return Gesture.Pan()
      .onStart((event) => {
        // Only trigger on edge swipes
        const isLeftEdge = event.x < edgeWidth;
        const isRightEdge = event.x > screenWidth - edgeWidth;
        
        if (!isLeftEdge && !isRightEdge) {
          return;
        }
      })
      .onEnd((event) => {
        const { translationX, velocityX, x } = event;
        const isLeftEdge = x < edgeWidth;
        const isRightEdge = x > screenWidth - edgeWidth;
        
        // Left edge swipe right (back navigation)
        if (isLeftEdge && translationX > this.gestureThreshold && velocityX > this.velocityThreshold) {
          runOnJS(onBackSwipe)();
        }
        // Right edge swipe left (back navigation for left-handed users)
        else if (isRightEdge && translationX < -this.gestureThreshold && velocityX < -this.velocityThreshold) {
          runOnJS(onBackSwipe)();
        }
      });
  }

  // Create double tap gesture for quick actions
  createDoubleTapGesture(onDoubleTap) {
    return Gesture.Tap()
      .numberOfTaps(2)
      .onEnd(() => {
        runOnJS(onDoubleTap)();
      });
  }

  // Create long press gesture for context menus
  createLongPressGesture(onLongPress, minDuration = 500) {
    return Gesture.LongPress()
      .minDuration(minDuration)
      .onEnd(() => {
        runOnJS(onLongPress)();
      });
  }

  // Get optimized button layout for one-handed use
  getOneHandedButtonLayout(buttonCount) {
    if (!this.isOneHandedMode) {
      return this.getStandardButtonLayout(buttonCount);
    }

    const thumbReach = this.getThumbReachLayout();
    const buttonHeight = 48;
    const spacing = 12;
    
    // Arrange buttons in thumb-reach area
    return {
      container: {
        position: 'absolute',
        bottom: 100, // Above tab bar
        [this.dominantHand]: 16,
        width: screenWidth * 0.6,
      },
      button: {
        height: buttonHeight,
        marginBottom: spacing,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
      },
      // Stagger buttons for easier thumb access
      staggered: true,
      staggerOffset: this.dominantHand === 'right' ? -8 : 8,
    };
  }

  getStandardButtonLayout(buttonCount) {
    return {
      container: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingHorizontal: 16,
      },
      button: {
        flex: 1,
        height: 48,
        marginHorizontal: 8,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
      },
      staggered: false,
    };
  }

  // Create floating action button for emergency access
  getEmergencyFABLayout() {
    const size = 56;
    const margin = 16;
    
    return {
      position: 'absolute',
      width: size,
      height: size,
      borderRadius: size / 2,
      bottom: 80 + margin, // Above tab bar
      [this.dominantHand]: margin,
      elevation: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
    };
  }

  // Get reachability zone for UI elements
  getReachabilityZone() {
    const thumbLength = 72; // Average thumb length in points
    const palmWidth = 80; // Average palm width in points
    
    // Calculate reachable area based on dominant hand
    const baseX = this.dominantHand === 'right' ? screenWidth - palmWidth : palmWidth;
    const baseY = screenHeight - 120; // Account for tab bar and safe area
    
    return {
      center: { x: baseX, y: baseY },
      radius: thumbLength,
      // Easy reach zone (comfortable)
      easyReach: {
        x: baseX,
        y: baseY - thumbLength * 0.7,
        radius: thumbLength * 0.7,
      },
      // Extended reach zone (requires stretching)
      extendedReach: {
        x: baseX,
        y: baseY - thumbLength,
        radius: thumbLength,
      },
    };
  }

  // Check if a point is within thumb reach
  isWithinThumbReach(x, y, zone = 'easy') {
    const reachability = this.getReachabilityZone();
    const targetZone = zone === 'easy' ? reachability.easyReach : reachability.extendedReach;
    
    const distance = Math.sqrt(
      Math.pow(x - targetZone.x, 2) + Math.pow(y - targetZone.y, 2)
    );
    
    return distance <= targetZone.radius;
  }

  // Get navigation gesture hints for users
  getGestureHints() {
    return {
      swipeLeft: 'Swipe left to go to next tab',
      swipeRight: 'Swipe right to go to previous tab',
      swipeUp: 'Swipe up for quick actions',
      swipeDown: 'Swipe down to refresh',
      edgeSwipe: 'Swipe from edge to go back',
      doubleTap: 'Double tap for quick access',
      longPress: 'Long press for more options',
    };
  }

  // Adaptive touch target sizing
  getAdaptiveTouchTarget(baseSize = 44) {
    if (!this.isOneHandedMode) {
      return { width: baseSize, height: baseSize };
    }

    // Increase touch targets for one-handed mode
    const adaptiveSize = Math.max(baseSize, 48);
    
    return {
      width: adaptiveSize,
      height: adaptiveSize,
      // Add extra padding for easier targeting
      padding: 4,
    };
  }

  // Get scroll behavior optimized for one-handed use
  getOneHandedScrollProps() {
    if (!this.isOneHandedMode) {
      return {};
    }

    return {
      // Reduce scroll sensitivity for better control
      decelerationRate: 'normal',
      // Enable momentum scrolling
      scrollEventThrottle: 16,
      // Optimize for thumb scrolling
      showsVerticalScrollIndicator: true,
      indicatorStyle: 'default',
      // Add bounce for better feedback
      bounces: true,
      bouncesZoom: false,
    };
  }

  // Listener management
  addListener(callback) {
    this.listeners.push(callback);
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  notifyListeners(event, data) {
    this.listeners.forEach(listener => {
      if (typeof listener === 'function') {
        listener(event, data);
      }
    });
  }
}

// Create singleton instance
const gestureNavigationHelper = new GestureNavigationHelper();

export default gestureNavigationHelper;

// Export utility functions
export const {
  setOneHandedMode,
  getThumbReachLayout,
  createSwipeGesture,
  createEdgeSwipeGesture,
  createDoubleTapGesture,
  createLongPressGesture,
  getOneHandedButtonLayout,
  getEmergencyFABLayout,
  getReachabilityZone,
  isWithinThumbReach,
  getGestureHints,
  getAdaptiveTouchTarget,
  getOneHandedScrollProps,
} = gestureNavigationHelper;