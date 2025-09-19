import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useAccessibility } from '../../context/AccessibilityContext';

const ResponsiveNavigation = ({
  items = [],
  activeIndex = 0,
  onItemPress,
  variant = 'auto', // 'auto', 'tabs', 'sidebar', 'drawer', 'bottom'
  showLabels = true,
  style,
  ...props
}) => {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  
  const {
    theme,
    screenSize,
    orientation,
    oneHandedMode,
    getResponsiveSpacing,
    getOneHandedLayoutProps,
    isTablet,
    isLandscape,
    isSmallScreen
  } = useTheme();

  const {
    getAccessibilityProps,
    getTouchTargetStyle,
    getFocusStyle,
    getScaledFontSize,
    announceForAccessibility
  } = useAccessibility();

  const spacing = getResponsiveSpacing();
  const oneHandedProps = getOneHandedLayoutProps();
  const { width: screenWidth } = Dimensions.get('window');

  const getNavigationVariant = () => {
    if (variant !== 'auto') return variant;

    // Auto-select navigation variant based on screen size and orientation
    if (isTablet() && isLandscape()) {
      return 'sidebar';
    } else if (isTablet()) {
      return 'tabs';
    } else if (oneHandedMode) {
      return 'bottom';
    } else {
      return 'tabs';
    }
  };

  const navigationVariant = getNavigationVariant();

  const handleItemPress = (item, index) => {
    announceForAccessibility(`${item.label} selected`);
    if (onItemPress) {
      onItemPress(item, index);
    }
  };

  const renderTabNavigation = () => {
    const itemWidth = screenWidth / items.length;
    const minItemWidth = 80;
    const shouldScroll = itemWidth < minItemWidth;

    return (
      <View style={[styles.tabContainer, { backgroundColor: theme.colors.surface }]}>
        {items.map((item, index) => {
          const isActive = index === activeIndex;
          
          return (
            <TouchableOpacity
              key={item.key || index}
              style={[
                styles.tabItem,
                getTouchTargetStyle(),
                getFocusStyle(),
                {
                  flex: shouldScroll ? 0 : 1,
                  minWidth: shouldScroll ? minItemWidth : undefined,
                  backgroundColor: isActive ? theme.colors.primary : 'transparent'
                }
              ]}
              onPress={() => handleItemPress(item, index)}
              {...getAccessibilityProps({
                label: item.label,
                role: 'tab',
                state: { selected: isActive },
                hint: `Tab ${index + 1} of ${items.length}`
              })}
            >
              {item.icon && (
                <View style={styles.tabIcon}>
                  {React.cloneElement(item.icon, {
                    size: 24,
                    color: isActive ? theme.colors.background : theme.colors.text
                  })}
                </View>
              )}
              {showLabels && (
                <Text
                  style={[
                    styles.tabLabel,
                    {
                      color: isActive ? theme.colors.background : theme.colors.text,
                      fontSize: getScaledFontSize(12)
                    }
                  ]}
                  numberOfLines={1}
                >
                  {item.label}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const renderSidebarNavigation = () => {
    const sidebarWidth = sidebarExpanded ? 240 : 80;

    return (
      <View style={[
        styles.sidebarContainer,
        {
          width: sidebarWidth,
          backgroundColor: theme.colors.surface
        }
      ]}>
        {/* Sidebar toggle button */}
        <TouchableOpacity
          style={[
            styles.sidebarToggle,
            getTouchTargetStyle(),
            getFocusStyle()
          ]}
          onPress={() => setSidebarExpanded(!sidebarExpanded)}
          {...getAccessibilityProps({
            label: sidebarExpanded ? 'Collapse sidebar' : 'Expand sidebar',
            role: 'button',
            hint: 'Toggles sidebar navigation width'
          })}
        >
          <Text style={{ color: theme.colors.text }}>
            {sidebarExpanded ? '◀' : '▶'}
          </Text>
        </TouchableOpacity>

        {/* Sidebar items */}
        {items.map((item, index) => {
          const isActive = index === activeIndex;
          
          return (
            <TouchableOpacity
              key={item.key || index}
              style={[
                styles.sidebarItem,
                getTouchTargetStyle(),
                getFocusStyle(),
                {
                  backgroundColor: isActive ? theme.colors.primary : 'transparent',
                  paddingHorizontal: sidebarExpanded ? spacing.md : spacing.sm
                }
              ]}
              onPress={() => handleItemPress(item, index)}
              {...getAccessibilityProps({
                label: item.label,
                role: 'button',
                state: { selected: isActive },
                hint: `Navigation item ${index + 1} of ${items.length}`
              })}
            >
              {item.icon && (
                <View style={styles.sidebarIcon}>
                  {React.cloneElement(item.icon, {
                    size: 24,
                    color: isActive ? theme.colors.background : theme.colors.text
                  })}
                </View>
              )}
              {sidebarExpanded && showLabels && (
                <Text
                  style={[
                    styles.sidebarLabel,
                    {
                      color: isActive ? theme.colors.background : theme.colors.text,
                      fontSize: getScaledFontSize(14)
                    }
                  ]}
                  numberOfLines={1}
                >
                  {item.label}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const renderBottomNavigation = () => {
    const bottomHeight = oneHandedProps.actionAreaHeight || 80;
    
    return (
      <View style={[
        styles.bottomContainer,
        {
          height: bottomHeight,
          backgroundColor: theme.colors.surface,
          paddingBottom: oneHandedMode ? spacing.sm : spacing.xs
        }
      ]}>
        {items.map((item, index) => {
          const isActive = index === activeIndex;
          const itemWidth = screenWidth / items.length;
          
          return (
            <TouchableOpacity
              key={item.key || index}
              style={[
                styles.bottomItem,
                getTouchTargetStyle(),
                getFocusStyle(),
                {
                  width: itemWidth,
                  backgroundColor: isActive ? theme.colors.primary : 'transparent'
                }
              ]}
              onPress={() => handleItemPress(item, index)}
              {...getAccessibilityProps({
                label: item.label,
                role: 'tab',
                state: { selected: isActive },
                hint: `Bottom navigation item ${index + 1} of ${items.length}`
              })}
            >
              {item.icon && (
                <View style={styles.bottomIcon}>
                  {React.cloneElement(item.icon, {
                    size: oneHandedMode ? 28 : 24,
                    color: isActive ? theme.colors.background : theme.colors.text
                  })}
                </View>
              )}
              {showLabels && (
                <Text
                  style={[
                    styles.bottomLabel,
                    {
                      color: isActive ? theme.colors.background : theme.colors.text,
                      fontSize: getScaledFontSize(oneHandedMode ? 14 : 12)
                    }
                  ]}
                  numberOfLines={1}
                >
                  {item.label}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const renderNavigation = () => {
    switch (navigationVariant) {
      case 'sidebar':
        return renderSidebarNavigation();
      case 'bottom':
        return renderBottomNavigation();
      case 'tabs':
      default:
        return renderTabNavigation();
    }
  };

  return (
    <View
      style={[
        styles.container,
        navigationVariant === 'sidebar' && styles.sidebarLayout,
        style
      ]}
      {...getAccessibilityProps({
        role: 'tablist',
        isImportant: false
      })}
      {...props}
    >
      {renderNavigation()}
    </View>
  );
};

// Responsive Tab Bar Component for React Navigation
export const ResponsiveTabBar = ({ state, descriptors, navigation }) => {
  const {
    theme,
    screenSize,
    oneHandedMode,
    getResponsiveSpacing,
    isTablet,
    isLandscape
  } = useTheme();

  const {
    getAccessibilityProps,
    getTouchTargetStyle,
    getFocusStyle,
    getScaledFontSize
  } = useAccessibility();

  const spacing = getResponsiveSpacing();

  // Convert React Navigation state to ResponsiveNavigation format
  const navigationItems = state.routes.map((route, index) => {
    const { options } = descriptors[route.key];
    
    return {
      key: route.key,
      label: options.tabBarLabel || options.title || route.name,
      icon: options.tabBarIcon ? options.tabBarIcon({
        focused: state.index === index,
        color: theme.colors.text,
        size: 24
      }) : null
    };
  });

  const handleItemPress = (item, index) => {
    const event = navigation.emit({
      type: 'tabPress',
      target: state.routes[index].key,
      canPreventDefault: true,
    });

    if (!event.defaultPrevented) {
      navigation.navigate(state.routes[index].name);
    }
  };

  return (
    <ResponsiveNavigation
      items={navigationItems}
      activeIndex={state.index}
      onItemPress={handleItemPress}
      variant={isTablet() && isLandscape() ? 'sidebar' : oneHandedMode ? 'bottom' : 'tabs'}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    // Base container styles
  },
  sidebarLayout: {
    flexDirection: 'row'
  },
  
  // Tab Navigation Styles
  tabContainer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)'
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    minHeight: 60
  },
  tabIcon: {
    marginBottom: 4
  },
  tabLabel: {
    fontWeight: '500',
    textAlign: 'center'
  },
  
  // Sidebar Navigation Styles
  sidebarContainer: {
    borderRightWidth: 1,
    borderRightColor: 'rgba(0,0,0,0.1)',
    paddingVertical: 16
  },
  sidebarToggle: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)'
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    marginVertical: 2,
    borderRadius: 8,
    marginHorizontal: 8
  },
  sidebarIcon: {
    marginRight: 12,
    width: 24,
    alignItems: 'center'
  },
  sidebarLabel: {
    flex: 1,
    fontWeight: '500'
  },
  
  // Bottom Navigation Styles
  bottomContainer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    paddingTop: 8
  },
  bottomItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4
  },
  bottomIcon: {
    marginBottom: 4
  },
  bottomLabel: {
    fontWeight: '500',
    textAlign: 'center'
  }
});

export default ResponsiveNavigation;