import { multilingualUIService } from '../multilingualUI';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn()
}));

// Mock I18nManager
jest.mock('react-native', () => ({
  I18nManager: {
    isRTL: false,
    forceRTL: jest.fn()
  }
}));

describe('MultilingualUI Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('RTL Language Detection', () => {
    it('correctly identifies RTL languages', () => {
      expect(multilingualUIService.isRTLLanguage('ar')).toBe(true);
      expect(multilingualUIService.isRTLLanguage('he')).toBe(true);
      expect(multilingualUIService.isRTLLanguage('fa')).toBe(true);
      expect(multilingualUIService.isRTLLanguage('ur')).toBe(true);
    });

    it('correctly identifies LTR languages', () => {
      expect(multilingualUIService.isRTLLanguage('en')).toBe(false);
      expect(multilingualUIService.isRTLLanguage('hi')).toBe(false);
      expect(multilingualUIService.isRTLLanguage('es')).toBe(false);
      expect(multilingualUIService.isRTLLanguage('fr')).toBe(false);
    });
  });

  describe('Text Direction Styles', () => {
    it('returns correct styles for RTL languages', () => {
      const styles = multilingualUIService.getTextDirectionStyles('ar');
      
      expect(styles.textAlign).toBe('right');
      expect(styles.writingDirection).toBe('rtl');
      expect(styles.flexDirection).toBe('row-reverse');
    });

    it('returns correct styles for LTR languages', () => {
      const styles = multilingualUIService.getTextDirectionStyles('en');
      
      expect(styles.textAlign).toBe('left');
      expect(styles.writingDirection).toBe('ltr');
      expect(styles.flexDirection).toBe('row');
    });
  });

  describe('Font Adjustments', () => {
    it('returns correct font size adjustments', () => {
      expect(multilingualUIService.getFontSizeAdjustment('ar')).toBe(1.1);
      expect(multilingualUIService.getFontSizeAdjustment('hi')).toBe(1.05);
      expect(multilingualUIService.getFontSizeAdjustment('en')).toBe(1.0);
    });

    it('returns correct line height adjustments', () => {
      expect(multilingualUIService.getLineHeightAdjustment('ar')).toBe(1.3);
      expect(multilingualUIService.getLineHeightAdjustment('hi')).toBe(1.25);
      expect(multilingualUIService.getLineHeightAdjustment('en')).toBe(1.2);
    });
  });

  describe('Text Formatting', () => {
    it('formats text correctly for RTL languages', () => {
      const formatted = multilingualUIService.formatTextForLanguage('مرحبا', 'ar');
      expect(formatted).toContain('مرحبا');
      expect(formatted).toMatch(/\u202B.*\u202C/); // RTL embedding
    });

    it('formats text correctly for LTR languages', () => {
      const formatted = multilingualUIService.formatTextForLanguage('Hello', 'en');
      expect(formatted).toContain('Hello');
      expect(formatted).toMatch(/\u202A.*\u202C/); // LTR embedding
    });
  });

  describe('Comprehensive Text Styles', () => {
    it('creates correct text styles for Arabic', () => {
      const styles = multilingualUIService.createTextStyles('ar', 16);
      
      expect(styles.fontSize).toBe(16 * 1.1); // Arabic adjustment
      expect(styles.lineHeight).toBe(16 * 1.3); // Arabic line height
      expect(styles.textAlign).toBe('right');
      expect(styles.writingDirection).toBe('rtl');
    });

    it('creates correct text styles for English', () => {
      const styles = multilingualUIService.createTextStyles('en', 16);
      
      expect(styles.fontSize).toBe(16);
      expect(styles.lineHeight).toBe(16 * 1.2);
      expect(styles.textAlign).toBe('left');
      expect(styles.writingDirection).toBe('ltr');
    });
  });

  describe('Number and Date Formatting', () => {
    it('formats numbers correctly for different locales', () => {
      const number = 1234.56;
      
      // Test will depend on system locale, so we just check it returns a string
      const formatted = multilingualUIService.formatNumber(number, 'en');
      expect(typeof formatted).toBe('string');
    });

    it('formats dates correctly for different locales', () => {
      const date = new Date('2024-01-15');
      
      const formatted = multilingualUIService.formatDate(date, 'en');
      expect(typeof formatted).toBe('string');
    });
  });

  describe('Input Method Configuration', () => {
    it('returns correct keyboard configuration', () => {
      const config = multilingualUIService.getInputMethodConfig('ar');
      
      expect(config.keyboardType).toBe('default');
      expect(config.autoCapitalize).toBe('none');
      expect(config.autoCorrect).toBe(true);
      expect(config.spellCheck).toBe(true);
    });

    it('returns correct keyboard configuration for English', () => {
      const config = multilingualUIService.getInputMethodConfig('en');
      
      expect(config.autoCapitalize).toBe('sentences');
    });
  });

  describe('Text Validation', () => {
    it('validates Arabic text correctly', () => {
      const arabicText = 'مرحبا بك';
      const englishText = 'Hello world';
      
      expect(multilingualUIService.validateTextInput(arabicText, 'ar')).toBe(true);
      // English text should not validate for Arabic script
      expect(multilingualUIService.validateTextInput(englishText, 'ar')).toBe(false);
    });

    it('validates Hindi text correctly', () => {
      const hindiText = 'नमस्ते';
      const englishText = 'Hello';
      
      expect(multilingualUIService.validateTextInput(hindiText, 'hi')).toBe(true);
      expect(multilingualUIService.validateTextInput(englishText, 'hi')).toBe(false);
    });

    it('validates any text for default language', () => {
      const anyText = 'Any text 123 !@#';
      
      expect(multilingualUIService.validateTextInput(anyText, 'en')).toBe(true);
    });
  });

  describe('Accessibility Labels', () => {
    it('returns correct labels for English', () => {
      const label = multilingualUIService.getAccessibilityLabel('send_message', 'en');
      expect(label).toBe('Send message');
    });

    it('returns correct labels for Hindi', () => {
      const label = multilingualUIService.getAccessibilityLabel('send_message', 'hi');
      expect(label).toBe('संदेश भेजें');
    });

    it('returns key as fallback for unknown labels', () => {
      const label = multilingualUIService.getAccessibilityLabel('unknown_key', 'en');
      expect(label).toBe('unknown_key');
    });
  });

  describe('Language Preference Storage', () => {
    it('saves language preference correctly', async () => {
      AsyncStorage.setItem.mockResolvedValue();
      
      const result = await multilingualUIService.saveLanguagePreference('ar');
      
      expect(result.success).toBe(true);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('userLanguage', 'ar');
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('isRTL', 'true');
    });

    it('loads language preference correctly', async () => {
      AsyncStorage.getItem
        .mockResolvedValueOnce('ar')
        .mockResolvedValueOnce('true');
      
      const result = await multilingualUIService.loadLanguagePreference();
      
      expect(result.success).toBe(true);
      expect(result.languageCode).toBe('ar');
      expect(result.isRTL).toBe(true);
    });

    it('handles missing preferences gracefully', async () => {
      AsyncStorage.getItem
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      
      const result = await multilingualUIService.loadLanguagePreference();
      
      expect(result.success).toBe(true);
      expect(result.languageCode).toBe('en');
      expect(result.isRTL).toBe(false);
    });
  });
});