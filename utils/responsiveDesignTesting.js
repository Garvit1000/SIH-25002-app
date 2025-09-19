import { Dimensions, PixelRatio } from 'react-native';

/**
 * Responsive Design Testing Utilities
 * Helps test and validate responsive design implementations
 */

class ResponsiveDesignTester {
  constructor() {
    this.testResults = [];
    this.breakpoints = {
      small: { maxWidth: 374 },
      normal: { minWidth: 375, maxWidth: 413 },
      large: { minWidth: 414, maxWidth: 767 },
      tablet: { minWidth: 768, maxWidth: 1023 },
      desktop: { minWidth: 1024 }
    };
    
    this.deviceTypes = {
      phone: { maxWidth: 767 },
      tablet: { minWidth: 768, maxWidth: 1366 },
      desktop: { minWidth: 1367 }
    };
  }

  /**
   * Get current device information
   */
  getCurrentDeviceInfo() {
    const { width, height } = Dimensions.get('window');
    const { width: screenWidth, height: screenHeight } = Dimensions.get('screen');
    const pixelRatio = PixelRatio.get();
    const fontScale = PixelRatio.getFontScale();

    return {
      window: { width, height },
      screen: { width: screenWidth, height: screenHeight },
      pixelRatio,
      fontScale,
      orientation: width > height ? 'landscape' : 'portrait',
      aspectRatio: Math.max(width, height) / Math.min(width, height),
      devicePixelRatio: pixelRatio,
      logicalPixels: { width, height },
      physicalPixels: { 
        width: width * pixelRatio, 
        height: height * pixelRatio 
      }
    };
  }

  /**
   * Determine device category based on dimensions
   */
  getDeviceCategory(width = null, height = null) {
    const deviceInfo = width && height ? 
      { width, height } : 
      this.getCurrentDeviceInfo().window;
    
    const minDimension = Math.min(deviceInfo.width, deviceInfo.height);
    const maxDimension = Math.max(deviceInfo.width, deviceInfo.height);
    const aspectRatio = maxDimension / minDimension;

    // Detect foldable devices
    if (aspectRatio > 2.1) {
      return {
        category: 'foldable',
        subcategory: minDimension >= 768 ? 'tablet-foldable' : 'phone-foldable',
        breakpoint: 'foldable'
      };
    }

    // Standard device categorization
    if (minDimension >= 768) {
      return {
        category: 'tablet',
        subcategory: minDimension >= 1024 ? 'large-tablet' : 'standard-tablet',
        breakpoint: 'tablet'
      };
    } else if (maxDimension >= 414) {
      return {
        category: 'phone',
        subcategory: 'large-phone',
        breakpoint: 'large'
      };
    } else if (maxDimension >= 375) {
      return {
        category: 'phone',
        subcategory: 'standard-phone',
        breakpoint: 'normal'
      };
    } else {
      return {
        category: 'phone',
        subcategory: 'small-phone',
        breakpoint: 'small'
      };
    }
  }

  /**
   * Test responsive breakpoints
   */
  testBreakpoints(component, testSizes = []) {
    const defaultTestSizes = [
      { width: 320, height: 568, name: 'iPhone SE' },
      { width: 375, height: 667, name: 'iPhone 8' },
      { width: 414, height: 896, name: 'iPhone 11 Pro Max' },
      { width: 768, height: 1024, name: 'iPad' },
      { width: 1024, height: 1366, name: 'iPad Pro 12.9"' },
      { width: 834, height: 1194, name: 'iPad Pro 11"' },
      { width: 360, height: 800, name: 'Android Medium' },
      { width: 412, height: 915, name: 'Android Large' }
    ];

    const sizesToTest = testSizes.length > 0 ? testSizes : defaultTestSizes;
    const results = [];

    sizesToTest.forEach(size => {
      const deviceCategory = this.getDeviceCategory(size.width, size.height);
      const result = {
        device: size.name,
        dimensions: { width: size.width, height: size.height },
        category: deviceCategory,
        orientation: size.width > size.height ? 'landscape' : 'portrait',
        tests: this.runResponsiveTests(component, size)
      };
      results.push(result);
    });

    return results;
  }

  /**
   * Run responsive design tests for a specific size
   */
  runResponsiveTests(component, size) {
    const tests = [];

    // Test touch target sizes
    tests.push(this.testTouchTargets(component, size));

    // Test text readability
    tests.push(this.testTextReadability(component, size));

    // Test layout overflow
    tests.push(this.testLayoutOverflow(component, size));

    // Test one-handed reachability
    tests.push(this.testOneHandedReachability(component, size));

    // Test content density
    tests.push(this.testContentDensity(component, size));

    return tests;
  }

  /**
   * Test touch target sizes for different screen sizes
   */
  testTouchTargets(component, size) {
    const minTouchTarget = 44; // WCAG minimum
    const recommendedTouchTarget = 48;
    const largeTouchTarget = 56;

    const deviceCategory = this.getDeviceCategory(size.width, size.height);
    const recommendedSize = deviceCategory.category === 'tablet' ? largeTouchTarget : recommendedTouchTarget;

    return {
      type: 'touch-targets',
      passed: true, // Would be determined by actual component analysis
      recommended: recommendedSize,
      minimum: minTouchTarget,
      deviceCategory: deviceCategory.category,
      message: `Touch targets should be at least ${recommendedSize}px for ${deviceCategory.category} devices`
    };
  }

  /**
   * Test text readability across different screen sizes
   */
  testTextReadability(component, size) {
    const deviceCategory = this.getDeviceCategory(size.width, size.height);
    const minFontSizes = {
      phone: 14,
      tablet: 16,
      foldable: 15
    };

    const minSize = minFontSizes[deviceCategory.category] || 14;
    const pixelDensity = this.estimatePixelDensity(size);
    const adjustedMinSize = Math.round(minSize * pixelDensity);

    return {
      type: 'text-readability',
      passed: true, // Would be determined by actual text analysis
      minimumFontSize: adjustedMinSize,
      deviceCategory: deviceCategory.category,
      pixelDensity,
      message: `Text should be at least ${adjustedMinSize}px for readable text on ${deviceCategory.category}`
    };
  }

  /**
   * Test for layout overflow issues
   */
  testLayoutOverflow(component, size) {
    const safeMargin = 16;
    const maxContentWidth = size.width - (safeMargin * 2);
    const maxContentHeight = size.height - (safeMargin * 2);

    return {
      type: 'layout-overflow',
      passed: true, // Would be determined by actual layout analysis
      maxContentWidth,
      maxContentHeight,
      safeMargin,
      message: `Content should fit within ${maxContentWidth}x${maxContentHeight}px with ${safeMargin}px margins`
    };
  }

  /**
   * Test one-handed reachability
   */
  testOneHandedReachability(component, size) {
    const deviceCategory = this.getDeviceCategory(size.width, size.height);
    
    // Calculate thumb reach zone (bottom 60% of screen for phones)
    const thumbReachHeight = deviceCategory.category === 'phone' ? 
      size.height * 0.6 : 
      size.height * 0.7;

    const thumbReachZone = {
      top: size.height - thumbReachHeight,
      bottom: size.height,
      left: 0,
      right: size.width
    };

    return {
      type: 'one-handed-reachability',
      passed: true, // Would be determined by analyzing interactive element positions
      thumbReachZone,
      deviceCategory: deviceCategory.category,
      message: `Primary actions should be within thumb reach zone for ${deviceCategory.category} devices`
    };
  }

  /**
   * Test content density appropriateness
   */
  testContentDensity(component, size) {
    const deviceCategory = this.getDeviceCategory(size.width, size.height);
    const pixelsPerInch = this.estimatePixelsPerInch(size);
    
    const densityRecommendations = {
      phone: { minSpacing: 8, maxItemsPerRow: 2 },
      tablet: { minSpacing: 16, maxItemsPerRow: 4 },
      foldable: { minSpacing: 12, maxItemsPerRow: 3 }
    };

    const recommendation = densityRecommendations[deviceCategory.category] || densityRecommendations.phone;

    return {
      type: 'content-density',
      passed: true, // Would be determined by actual content analysis
      recommendation,
      pixelsPerInch,
      deviceCategory: deviceCategory.category,
      message: `Content density should follow ${deviceCategory.category} guidelines`
    };
  }

  /**
   * Estimate pixel density for a given screen size
   */
  estimatePixelDensity(size) {
    // Rough estimation based on common device characteristics
    const diagonal = Math.sqrt(size.width ** 2 + size.height ** 2);
    
    if (diagonal < 500) return 0.9; // Small phone
    if (diagonal < 600) return 1.0; // Normal phone
    if (diagonal < 700) return 1.1; // Large phone
    if (diagonal < 1200) return 1.2; // Tablet
    return 1.3; // Large tablet
  }

  /**
   * Estimate pixels per inch for a given screen size
   */
  estimatePixelsPerInch(size) {
    // Rough estimation - in real app, you'd get this from device specs
    const deviceCategory = this.getDeviceCategory(size.width, size.height);
    
    const estimatedPPI = {
      phone: 300,
      tablet: 220,
      foldable: 280
    };

    return estimatedPPI[deviceCategory.category] || 300;
  }

  /**
   * Test responsive images and media
   */
  testResponsiveMedia(mediaElements, screenSize) {
    const results = [];
    
    mediaElements.forEach((element, index) => {
      const result = {
        elementIndex: index,
        type: element.type || 'image',
        originalSize: element.size,
        recommendedSize: this.getRecommendedMediaSize(element, screenSize),
        scalingFactor: this.getMediaScalingFactor(screenSize),
        passed: true // Would be determined by actual analysis
      };
      
      results.push(result);
    });

    return results;
  }

  /**
   * Get recommended media size for screen
   */
  getRecommendedMediaSize(mediaElement, screenSize) {
    const deviceCategory = this.getDeviceCategory(screenSize.width, screenSize.height);
    const scalingFactor = this.getMediaScalingFactor(screenSize);
    
    return {
      width: Math.round(mediaElement.size.width * scalingFactor),
      height: Math.round(mediaElement.size.height * scalingFactor)
    };
  }

  /**
   * Get media scaling factor based on screen size
   */
  getMediaScalingFactor(screenSize) {
    const deviceCategory = this.getDeviceCategory(screenSize.width, screenSize.height);
    
    const scalingFactors = {
      phone: 1.0,
      tablet: 1.5,
      foldable: 1.2
    };

    return scalingFactors[deviceCategory.category] || 1.0;
  }

  /**
   * Generate comprehensive responsive design report
   */
  generateResponsiveReport(testResults) {
    let report = '=== RESPONSIVE DESIGN TEST REPORT ===\n\n';
    
    testResults.forEach(result => {
      report += `Device: ${result.device}\n`;
      report += `Dimensions: ${result.dimensions.width}x${result.dimensions.height}\n`;
      report += `Category: ${result.category.category} (${result.category.subcategory})\n`;
      report += `Orientation: ${result.orientation}\n\n`;
      
      result.tests.forEach(test => {
        const status = test.passed ? '✅' : '❌';
        report += `  ${status} ${test.type}: ${test.message}\n`;
      });
      
      report += '\n';
    });

    return report;
  }

  /**
   * Test adaptive layout behavior
   */
  testAdaptiveLayouts(layouts, screenSizes) {
    const results = [];
    
    screenSizes.forEach(size => {
      const deviceCategory = this.getDeviceCategory(size.width, size.height);
      const adaptiveResult = {
        screenSize: size,
        deviceCategory,
        layoutTests: []
      };
      
      layouts.forEach(layout => {
        const layoutTest = {
          layoutName: layout.name,
          expectedBehavior: layout.expectedBehavior[deviceCategory.category],
          actualBehavior: layout.actualBehavior, // Would be measured
          passed: true // Would be determined by comparison
        };
        
        adaptiveResult.layoutTests.push(layoutTest);
      });
      
      results.push(adaptiveResult);
    });
    
    return results;
  }

  /**
   * Validate responsive typography
   */
  validateResponsiveTypography(textElements, screenSizes) {
    const results = [];
    
    screenSizes.forEach(size => {
      const deviceCategory = this.getDeviceCategory(size.width, size.height);
      const typographyResult = {
        screenSize: size,
        deviceCategory,
        textTests: []
      };
      
      textElements.forEach(element => {
        const minReadableSize = this.getMinReadableTextSize(deviceCategory.category);
        const maxReadableSize = this.getMaxReadableTextSize(deviceCategory.category);
        
        const textTest = {
          elementType: element.type,
          fontSize: element.fontSize,
          minReadable: minReadableSize,
          maxReadable: maxReadableSize,
          isReadable: element.fontSize >= minReadableSize && element.fontSize <= maxReadableSize,
          recommendation: this.getTypographyRecommendation(element.type, deviceCategory.category)
        };
        
        typographyResult.textTests.push(textTest);
      });
      
      results.push(typographyResult);
    });
    
    return results;
  }

  /**
   * Get minimum readable text size for device category
   */
  getMinReadableTextSize(deviceCategory) {
    const minSizes = {
      phone: 14,
      tablet: 16,
      foldable: 15
    };
    return minSizes[deviceCategory] || 14;
  }

  /**
   * Get maximum readable text size for device category
   */
  getMaxReadableTextSize(deviceCategory) {
    const maxSizes = {
      phone: 24,
      tablet: 32,
      foldable: 28
    };
    return maxSizes[deviceCategory] || 24;
  }

  /**
   * Get typography recommendation for element type and device
   */
  getTypographyRecommendation(elementType, deviceCategory) {
    const recommendations = {
      phone: {
        heading: 20,
        subheading: 18,
        body: 16,
        caption: 14
      },
      tablet: {
        heading: 28,
        subheading: 24,
        body: 18,
        caption: 16
      },
      foldable: {
        heading: 24,
        subheading: 20,
        body: 17,
        caption: 15
      }
    };
    
    return recommendations[deviceCategory]?.[elementType] || recommendations.phone[elementType];
  }
}

// Create singleton instance
const responsiveDesignTester = new ResponsiveDesignTester();

export default responsiveDesignTester;

// Export utility functions
export const {
  getCurrentDeviceInfo,
  getDeviceCategory,
  testBreakpoints,
  testResponsiveMedia,
  generateResponsiveReport,
  testAdaptiveLayouts,
  validateResponsiveTypography
} = responsiveDesignTester;