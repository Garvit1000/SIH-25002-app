import { AccessibilityInfo, Platform } from 'react-native';

/**
 * Accessibility Testing Utilities
 * Helps verify WCAG AAA compliance and accessibility best practices
 */

// WCAG AAA Color Contrast Ratios
const WCAG_RATIOS = {
  AAA_NORMAL: 7.0,
  AAA_LARGE: 4.5,
  AA_NORMAL: 4.5,
  AA_LARGE: 3.0,
  GRAPHICAL: 3.0
};

// Minimum touch target sizes (in dp/pt)
const TOUCH_TARGET_SIZES = {
  WCAG_MINIMUM: 44,
  RECOMMENDED: 48,
  LARGE: 56
};

class AccessibilityTester {
  constructor() {
    this.testResults = [];
    this.warnings = [];
    this.errors = [];
  }

  /**
   * Calculate color contrast ratio between two colors
   * @param {string} foreground - Foreground color (hex)
   * @param {string} background - Background color (hex)
   * @returns {number} Contrast ratio
   */
  calculateContrastRatio(foreground, background) {
    const getLuminance = (color) => {
      // Convert hex to RGB
      const hex = color.replace('#', '');
      const r = parseInt(hex.substr(0, 2), 16) / 255;
      const g = parseInt(hex.substr(2, 2), 16) / 255;
      const b = parseInt(hex.substr(4, 2), 16) / 255;

      // Calculate relative luminance
      const sRGB = [r, g, b].map(c => {
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      });

      return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
    };

    const l1 = getLuminance(foreground);
    const l2 = getLuminance(background);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);

    return (lighter + 0.05) / (darker + 0.05);
  }

  /**
   * Test color contrast compliance
   * @param {string} foreground - Foreground color
   * @param {string} background - Background color
   * @param {number} fontSize - Font size in pixels
   * @param {string} fontWeight - Font weight
   * @returns {object} Test result
   */
  testColorContrast(foreground, background, fontSize = 16, fontWeight = 'normal') {
    const ratio = this.calculateContrastRatio(foreground, background);
    const isLargeText = fontSize >= 18 || (fontSize >= 14 && fontWeight === 'bold');
    
    const requiredRatio = isLargeText ? WCAG_RATIOS.AAA_LARGE : WCAG_RATIOS.AAA_NORMAL;
    const aaRatio = isLargeText ? WCAG_RATIOS.AA_LARGE : WCAG_RATIOS.AA_NORMAL;
    
    const result = {
      ratio: ratio.toFixed(2),
      required: requiredRatio,
      passesAAA: ratio >= requiredRatio,
      passesAA: ratio >= aaRatio,
      isLargeText,
      foreground,
      background,
      fontSize,
      fontWeight
    };

    if (!result.passesAAA) {
      this.warnings.push({
        type: 'color-contrast',
        message: `Color contrast ratio ${result.ratio} does not meet WCAG AAA standards (required: ${requiredRatio})`,
        details: result
      });
    }

    return result;
  }

  /**
   * Test touch target size compliance
   * @param {number} width - Target width
   * @param {number} height - Target height
   * @returns {object} Test result
   */
  testTouchTargetSize(width, height) {
    const minDimension = Math.min(width, height);
    const passesWCAG = minDimension >= TOUCH_TARGET_SIZES.WCAG_MINIMUM;
    const passesRecommended = minDimension >= TOUCH_TARGET_SIZES.RECOMMENDED;

    const result = {
      width,
      height,
      minDimension,
      passesWCAG,
      passesRecommended,
      required: TOUCH_TARGET_SIZES.WCAG_MINIMUM,
      recommended: TOUCH_TARGET_SIZES.RECOMMENDED
    };

    if (!passesWCAG) {
      this.errors.push({
        type: 'touch-target-size',
        message: `Touch target size ${minDimension}px is below WCAG minimum of ${TOUCH_TARGET_SIZES.WCAG_MINIMUM}px`,
        details: result
      });
    } else if (!passesRecommended) {
      this.warnings.push({
        type: 'touch-target-size',
        message: `Touch target size ${minDimension}px is below recommended size of ${TOUCH_TARGET_SIZES.RECOMMENDED}px`,
        details: result
      });
    }

    return result;
  }

  /**
   * Test accessibility label completeness
   * @param {object} component - Component with accessibility props
   * @returns {object} Test result
   */
  testAccessibilityLabel(component) {
    const {
      accessibilityLabel,
      accessibilityHint,
      accessibilityRole,
      accessible = true
    } = component;

    const result = {
      hasLabel: !!accessibilityLabel,
      hasHint: !!accessibilityHint,
      hasRole: !!accessibilityRole,
      isAccessible: accessible,
      label: accessibilityLabel,
      hint: accessibilityHint,
      role: accessibilityRole
    };

    if (accessible && !accessibilityLabel) {
      this.warnings.push({
        type: 'accessibility-label',
        message: 'Accessible component missing accessibilityLabel',
        details: result
      });
    }

    if (accessible && !accessibilityRole) {
      this.warnings.push({
        type: 'accessibility-role',
        message: 'Accessible component missing accessibilityRole',
        details: result
      });
    }

    return result;
  }

  /**
   * Test font scaling support
   * @param {number} baseFontSize - Base font size
   * @param {number} scaleFactor - Current scale factor
   * @returns {object} Test result
   */
  testFontScaling(baseFontSize, scaleFactor) {
    const scaledSize = baseFontSize * scaleFactor;
    const maxScale = 2.0; // 200% as per requirement
    const supportsMaxScale = scaleFactor <= maxScale;

    const result = {
      baseFontSize,
      scaleFactor,
      scaledSize,
      maxScale,
      supportsMaxScale,
      isReadable: scaledSize >= 12 // Minimum readable size
    };

    if (!supportsMaxScale) {
      this.warnings.push({
        type: 'font-scaling',
        message: `Font scaling factor ${scaleFactor} exceeds maximum supported scale of ${maxScale}`,
        details: result
      });
    }

    if (!result.isReadable) {
      this.errors.push({
        type: 'font-scaling',
        message: `Scaled font size ${scaledSize}px is below minimum readable size`,
        details: result
      });
    }

    return result;
  }

  /**
   * Test screen reader compatibility
   * @param {object} component - Component to test
   * @returns {Promise<object>} Test result
   */
  async testScreenReaderCompatibility(component) {
    const isScreenReaderEnabled = await AccessibilityInfo.isScreenReaderEnabled();
    
    const result = {
      screenReaderEnabled: isScreenReaderEnabled,
      platform: Platform.OS,
      hasAccessibilityLabel: !!component.accessibilityLabel,
      hasAccessibilityHint: !!component.accessibilityHint,
      hasAccessibilityRole: !!component.accessibilityRole,
      isAccessible: component.accessible !== false
    };

    // Check for common screen reader issues
    if (result.isAccessible && !result.hasAccessibilityLabel) {
      this.warnings.push({
        type: 'screen-reader',
        message: 'Component may not be properly announced by screen readers (missing accessibilityLabel)',
        details: result
      });
    }

    return result;
  }

  /**
   * Test focus management
   * @param {object} component - Component to test
   * @returns {object} Test result
   */
  testFocusManagement(component) {
    const {
      focusable = true,
      accessibilityElementsHidden = false,
      importantForAccessibility = 'auto'
    } = component;

    const result = {
      focusable,
      accessibilityElementsHidden,
      importantForAccessibility,
      canReceiveFocus: focusable && !accessibilityElementsHidden
    };

    if (!result.canReceiveFocus && component.onPress) {
      this.warnings.push({
        type: 'focus-management',
        message: 'Interactive component cannot receive focus',
        details: result
      });
    }

    return result;
  }

  /**
   * Run comprehensive accessibility audit
   * @param {object} componentTree - Component tree to audit
   * @returns {Promise<object>} Audit results
   */
  async runAccessibilityAudit(componentTree) {
    this.testResults = [];
    this.warnings = [];
    this.errors = [];

    const auditComponent = async (component, path = '') => {
      const componentPath = `${path}/${component.type || 'Component'}`;
      
      // Test accessibility labels
      const labelResult = this.testAccessibilityLabel(component.props || {});
      this.testResults.push({ type: 'accessibility-label', path: componentPath, result: labelResult });

      // Test screen reader compatibility
      const screenReaderResult = await this.testScreenReaderCompatibility(component.props || {});
      this.testResults.push({ type: 'screen-reader', path: componentPath, result: screenReaderResult });

      // Test focus management
      const focusResult = this.testFocusManagement(component.props || {});
      this.testResults.push({ type: 'focus-management', path: componentPath, result: focusResult });

      // Test touch targets if component has onPress
      if (component.props?.onPress && component.props?.style) {
        const style = Array.isArray(component.props.style) 
          ? Object.assign({}, ...component.props.style)
          : component.props.style;
        
        if (style.width && style.height) {
          const touchResult = this.testTouchTargetSize(style.width, style.height);
          this.testResults.push({ type: 'touch-target', path: componentPath, result: touchResult });
        }
      }

      // Recursively audit children
      if (component.children) {
        const children = Array.isArray(component.children) ? component.children : [component.children];
        for (const child of children) {
          if (child && typeof child === 'object') {
            await auditComponent(child, componentPath);
          }
        }
      }
    };

    await auditComponent(componentTree);

    return {
      summary: {
        totalTests: this.testResults.length,
        warnings: this.warnings.length,
        errors: this.errors.length,
        passed: this.testResults.length - this.warnings.length - this.errors.length
      },
      results: this.testResults,
      warnings: this.warnings,
      errors: this.errors
    };
  }

  /**
   * Generate accessibility report
   * @param {object} auditResults - Results from accessibility audit
   * @returns {string} Formatted report
   */
  generateReport(auditResults) {
    const { summary, warnings, errors } = auditResults;
    
    let report = '=== ACCESSIBILITY AUDIT REPORT ===\n\n';
    report += `Total Tests: ${summary.totalTests}\n`;
    report += `Passed: ${summary.passed}\n`;
    report += `Warnings: ${summary.warnings}\n`;
    report += `Errors: ${summary.errors}\n\n`;

    if (errors.length > 0) {
      report += '=== ERRORS (Must Fix) ===\n';
      errors.forEach((error, index) => {
        report += `${index + 1}. [${error.type}] ${error.message}\n`;
        if (error.details) {
          report += `   Details: ${JSON.stringify(error.details, null, 2)}\n`;
        }
        report += '\n';
      });
    }

    if (warnings.length > 0) {
      report += '=== WARNINGS (Should Fix) ===\n';
      warnings.forEach((warning, index) => {
        report += `${index + 1}. [${warning.type}] ${warning.message}\n`;
        if (warning.details) {
          report += `   Details: ${JSON.stringify(warning.details, null, 2)}\n`;
        }
        report += '\n';
      });
    }

    if (errors.length === 0 && warnings.length === 0) {
      report += '✅ All accessibility tests passed!\n';
    }

    return report;
  }

  /**
   * Test high contrast color combinations
   * @param {object} colors - Color palette to test
   * @returns {object} Test results
   */
  testHighContrastColors(colors) {
    const results = [];
    const combinations = [
      { fg: colors.text, bg: colors.background, name: 'text on background' },
      { fg: colors.textSecondary, bg: colors.background, name: 'secondary text on background' },
      { fg: colors.background, bg: colors.primary, name: 'background on primary' },
      { fg: colors.background, bg: colors.danger, name: 'background on danger' },
      { fg: colors.text, bg: colors.surface, name: 'text on surface' }
    ];

    combinations.forEach(combo => {
      const result = this.testColorContrast(combo.fg, combo.bg);
      result.name = combo.name;
      results.push(result);
    });

    return results;
  }
}

// Export singleton instance
const accessibilityTester = new AccessibilityTester();

export default accessibilityTester;

// Export utility functions
export const {
  calculateContrastRatio,
  testColorContrast,
  testTouchTargetSize,
  testAccessibilityLabel,
  testFontScaling,
  testScreenReaderCompatibility,
  testFocusManagement,
  runAccessibilityAudit,
  generateReport,
  testHighContrastColors
} = accessibilityTester;

// Export constants
export { WCAG_RATIOS, TOUCH_TARGET_SIZES };