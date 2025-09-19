import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useAccessibility } from '../../context/AccessibilityContext';

const ResponsiveLayout = ({
  children,
  variant = 'default', // 'default', 'centered', 'sidebar', 'grid'
  maxWidth,
  padding = true,
  oneHandedOptimized = false,
  style,
  ...props
}) => {
  const {
    theme,
    screenSize,
    orientation,
    deviceType,
    oneHandedMode,
    getResponsiveSpacing,
    getOneHandedLayoutProps,
    isSmallScreen,
    isLargeScreen,
    isTablet,
    isFoldable,
    isLandscape
  } = useTheme();

  const { getAccessibilityProps } = useAccessibility();

  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const spacing = getResponsiveSpacing();
  const oneHandedProps = getOneHandedLayoutProps();

  const getLayoutStyle = () => {
    const baseStyle = styles.container;
    let layoutStyle = {};

    // Base responsive padding
    if (padding) {
      const horizontalPadding = isTablet() ? spacing.xl : 
                               isLargeScreen() ? spacing.lg : 
                               spacing.md;
      const verticalPadding = isTablet() ? spacing.lg : spacing.md;
      
      layoutStyle.paddingHorizontal = horizontalPadding;
      layoutStyle.paddingVertical = verticalPadding;
    }

    // Max width constraints
    if (maxWidth) {
      layoutStyle.maxWidth = maxWidth;
      layoutStyle.alignSelf = 'center';
    } else if (isTablet() || isFoldable()) {
      // Auto max-width for tablets and foldables
      layoutStyle.maxWidth = isLandscape() ? screenWidth * 0.8 : screenWidth * 0.9;
      layoutStyle.alignSelf = 'center';
    }

    // Variant-specific layouts
    switch (variant) {
      case 'centered':
        layoutStyle = {
          ...layoutStyle,
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: screenHeight * 0.8
        };
        break;

      case 'sidebar':
        if (isTablet() && isLandscape()) {
          layoutStyle = {
            ...layoutStyle,
            flexDirection: 'row',
            maxWidth: '100%'
          };
        }
        break;

      case 'grid':
        if (isTablet()) {
          layoutStyle = {
            ...layoutStyle,
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'space-between'
          };
        }
        break;
    }

    // One-handed mode optimizations
    if (oneHandedOptimized && oneHandedMode) {
      layoutStyle = {
        ...layoutStyle,
        paddingHorizontal: oneHandedProps.sideMargin || layoutStyle.paddingHorizontal,
        maxHeight: oneHandedProps.contentMaxHeight
      };

      if (oneHandedProps.compactSpacing) {
        layoutStyle.paddingVertical = spacing.sm;
      }
    }

    // Foldable-specific adjustments
    if (isFoldable()) {
      layoutStyle = {
        ...layoutStyle,
        paddingHorizontal: spacing.xxl,
        maxWidth: screenWidth * 0.7
      };
    }

    return [baseStyle, layoutStyle, style];
  };

  const getContentStyle = () => {
    let contentStyle = {};

    // Grid layout for tablets
    if (variant === 'grid' && isTablet()) {
      const columns = isLandscape() ? 3 : 2;
      const itemWidth = (screenWidth - (spacing.xl * 2) - (spacing.md * (columns - 1))) / columns;
      
      contentStyle = {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between'
      };

      // Apply grid item styles to children
      return {
        ...contentStyle,
        children: React.Children.map(children, (child, index) => {
          if (React.isValidElement(child)) {
            return React.cloneElement(child, {
              style: [
                child.props.style,
                {
                  width: itemWidth,
                  marginBottom: spacing.md
                }
              ]
            });
          }
          return child;
        })
      };
    }

    // Sidebar layout for tablets in landscape
    if (variant === 'sidebar' && isTablet() && isLandscape()) {
      contentStyle = {
        flexDirection: 'row',
        children: React.Children.map(children, (child, index) => {
          if (React.isValidElement(child)) {
            const isSidebar = index === 0;
            return React.cloneElement(child, {
              style: [
                child.props.style,
                {
                  flex: isSidebar ? 0.3 : 0.7,
                  marginRight: isSidebar ? spacing.lg : 0
                }
              ]
            });
          }
          return child;
        })
      };
    }

    return contentStyle;
  };

  const contentStyle = getContentStyle();
  const accessibilityProps = getAccessibilityProps({
    role: 'none',
    isImportant: false
  });

  return (
    <View
      style={getLayoutStyle()}
      {...accessibilityProps}
      {...props}
    >
      {contentStyle.children || children}
    </View>
  );
};

// Responsive Grid Component
export const ResponsiveGrid = ({ 
  children, 
  columns, 
  spacing: gridSpacing,
  style,
  ...props 
}) => {
  const { 
    screenSize, 
    orientation, 
    getResponsiveSpacing,
    isTablet,
    isLandscape 
  } = useTheme();

  const spacing = getResponsiveSpacing();
  const { width: screenWidth } = Dimensions.get('window');

  // Auto-calculate columns based on screen size if not provided
  const getColumns = () => {
    if (columns) return columns;
    
    if (isTablet()) {
      return isLandscape() ? 4 : 3;
    }
    return screenSize === 'large' ? 2 : 1;
  };

  const numColumns = getColumns();
  const itemSpacing = gridSpacing || spacing.md;
  const containerPadding = spacing.md;
  
  const itemWidth = (screenWidth - (containerPadding * 2) - (itemSpacing * (numColumns - 1))) / numColumns;

  const renderGridItems = () => {
    return React.Children.map(children, (child, index) => {
      if (!React.isValidElement(child)) return child;

      const isLastInRow = (index + 1) % numColumns === 0;
      const isLastRow = index >= React.Children.count(children) - numColumns;

      return React.cloneElement(child, {
        style: [
          child.props.style,
          {
            width: itemWidth,
            marginRight: isLastInRow ? 0 : itemSpacing,
            marginBottom: isLastRow ? 0 : itemSpacing
          }
        ]
      });
    });
  };

  return (
    <View
      style={[
        styles.grid,
        {
          padding: containerPadding
        },
        style
      ]}
      {...props}
    >
      {renderGridItems()}
    </View>
  );
};

// Responsive Stack Component
export const ResponsiveStack = ({
  children,
  direction = 'vertical', // 'vertical', 'horizontal', 'auto'
  spacing: stackSpacing,
  align = 'stretch',
  justify = 'flex-start',
  wrap = false,
  style,
  ...props
}) => {
  const { 
    orientation, 
    screenSize,
    getResponsiveSpacing,
    isTablet,
    isLandscape 
  } = useTheme();

  const spacing = getResponsiveSpacing();
  const itemSpacing = stackSpacing || spacing.md;

  const getFlexDirection = () => {
    if (direction === 'auto') {
      // Auto-switch based on screen size and orientation
      return (isTablet() && isLandscape()) ? 'row' : 'column';
    }
    return direction === 'horizontal' ? 'row' : 'column';
  };

  const flexDirection = getFlexDirection();
  const isHorizontal = flexDirection === 'row';

  const renderStackItems = () => {
    return React.Children.map(children, (child, index) => {
      if (!React.isValidElement(child)) return child;

      const isLast = index === React.Children.count(children) - 1;
      const marginStyle = isHorizontal
        ? { marginRight: isLast ? 0 : itemSpacing }
        : { marginBottom: isLast ? 0 : itemSpacing };

      return React.cloneElement(child, {
        style: [child.props.style, marginStyle]
      });
    });
  };

  return (
    <View
      style={[
        styles.stack,
        {
          flexDirection,
          alignItems: align,
          justifyContent: justify,
          flexWrap: wrap ? 'wrap' : 'nowrap'
        },
        style
      ]}
      {...props}
    >
      {renderStackItems()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  stack: {
    // Base stack styles
  }
});

export default ResponsiveLayout;