import { I18nManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const multilingualUIService = {
  // RTL (Right-to-Left) language codes
  rtlLanguages: ['ar', 'he', 'fa', 'ur', 'ku', 'ps'],

  // Check if language is RTL
  isRTLLanguage(languageCode) {
    return this.rtlLanguages.includes(languageCode);
  },

  // Configure RTL layout for the app
  async configureRTL(languageCode) {
    try {
      const isRTL = this.isRTLLanguage(languageCode);
      
      // Force RTL layout if needed
      if (isRTL !== I18nManager.isRTL) {
        I18nManager.forceRTL(isRTL);
        
        // Save RTL preference
        await AsyncStorage.setItem('isRTL', JSON.stringify(isRTL));
        
        return {
          success: true,
          isRTL: isRTL,
          requiresRestart: true
        };
      }

      return {
        success: true,
        isRTL: isRTL,
        requiresRestart: false
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Get text direction styles
  getTextDirectionStyles(languageCode) {
    const isRTL = this.isRTLLanguage(languageCode);
    
    return {
      textAlign: isRTL ? 'right' : 'left',
      writingDirection: isRTL ? 'rtl' : 'ltr',
      flexDirection: isRTL ? 'row-reverse' : 'row'
    };
  },

  // Get layout direction styles
  getLayoutDirectionStyles(languageCode) {
    const isRTL = this.isRTLLanguage(languageCode);
    
    return {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignSelf: isRTL ? 'flex-end' : 'flex-start'
    };
  },

  // Format text for proper rendering
  formatTextForLanguage(text, languageCode) {
    const isRTL = this.isRTLLanguage(languageCode);
    
    // Add RTL/LTR marks for proper text rendering
    if (isRTL) {
      return `\u202B${text}\u202C`; // RTL embedding
    } else {
      return `\u202A${text}\u202C`; // LTR embedding
    }
  },

  // Get font family for language
  getFontFamily(languageCode) {
    const fontFamilies = {
      'ar': 'System', // Arabic fonts
      'hi': 'System', // Devanagari fonts
      'zh': 'System', // Chinese fonts
      'ja': 'System', // Japanese fonts
      'ko': 'System', // Korean fonts
      'th': 'System', // Thai fonts
      'default': 'System'
    };

    return fontFamilies[languageCode] || fontFamilies['default'];
  },

  // Get appropriate font size adjustments for language
  getFontSizeAdjustment(languageCode) {
    const adjustments = {
      'ar': 1.1, // Arabic text often needs slightly larger size
      'hi': 1.05, // Devanagari script adjustment
      'zh': 1.0, // Chinese characters
      'ja': 1.0, // Japanese characters
      'th': 1.05, // Thai script
      'default': 1.0
    };

    return adjustments[languageCode] || adjustments['default'];
  },

  // Get line height adjustments for proper text rendering
  getLineHeightAdjustment(languageCode) {
    const adjustments = {
      'ar': 1.3, // Arabic needs more line height
      'hi': 1.25, // Devanagari script
      'th': 1.3, // Thai script
      'default': 1.2
    };

    return adjustments[languageCode] || adjustments['default'];
  },

  // Create comprehensive text styles for language
  createTextStyles(languageCode, baseSize = 16) {
    const isRTL = this.isRTLLanguage(languageCode);
    const fontSizeAdjustment = this.getFontSizeAdjustment(languageCode);
    const lineHeightAdjustment = this.getLineHeightAdjustment(languageCode);
    
    return {
      fontSize: baseSize * fontSizeAdjustment,
      lineHeight: baseSize * lineHeightAdjustment,
      fontFamily: this.getFontFamily(languageCode),
      textAlign: isRTL ? 'right' : 'left',
      writingDirection: isRTL ? 'rtl' : 'ltr'
    };
  },

  // Handle keyboard input for different languages
  getKeyboardType(languageCode) {
    const keyboardTypes = {
      'ar': 'default', // Arabic keyboard
      'hi': 'default', // Hindi keyboard
      'zh': 'default', // Chinese keyboard
      'ja': 'default', // Japanese keyboard
      'default': 'default'
    };

    return keyboardTypes[languageCode] || keyboardTypes['default'];
  },

  // Get input method configuration
  getInputMethodConfig(languageCode) {
    return {
      keyboardType: this.getKeyboardType(languageCode),
      autoCorrect: true,
      autoCapitalize: languageCode === 'ar' ? 'none' : 'sentences',
      spellCheck: true
    };
  },

  // Format numbers for locale
  formatNumber(number, languageCode) {
    try {
      const locale = this.getLocaleFromLanguageCode(languageCode);
      return new Intl.NumberFormat(locale).format(number);
    } catch (error) {
      return number.toString();
    }
  },

  // Format dates for locale
  formatDate(date, languageCode, options = {}) {
    try {
      const locale = this.getLocaleFromLanguageCode(languageCode);
      return new Intl.DateTimeFormat(locale, options).format(date);
    } catch (error) {
      return date.toLocaleDateString();
    }
  },

  // Get locale from language code
  getLocaleFromLanguageCode(languageCode) {
    const locales = {
      'en': 'en-US',
      'hi': 'hi-IN',
      'ar': 'ar-SA',
      'es': 'es-ES',
      'fr': 'fr-FR',
      'de': 'de-DE',
      'ja': 'ja-JP',
      'zh': 'zh-CN',
      'ru': 'ru-RU',
      'pt': 'pt-BR'
    };

    return locales[languageCode] || 'en-US';
  },

  // Get currency formatting for locale
  formatCurrency(amount, languageCode, currency = 'USD') {
    try {
      const locale = this.getLocaleFromLanguageCode(languageCode);
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency
      }).format(amount);
    } catch (error) {
      return `${currency} ${amount}`;
    }
  },

  // Handle text input validation for different scripts
  validateTextInput(text, languageCode) {
    // Basic validation for different scripts
    const validationRules = {
      'ar': /^[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\s\d\p{P}]*$/u,
      'hi': /^[\u0900-\u097F\s\d\p{P}]*$/u,
      'zh': /^[\u4e00-\u9fff\s\d\p{P}]*$/u,
      'ja': /^[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9fff\s\d\p{P}]*$/u,
      'default': /^.*$/
    };

    const rule = validationRules[languageCode] || validationRules['default'];
    return rule.test(text);
  },

  // Get accessibility labels for language
  getAccessibilityLabel(key, languageCode) {
    const labels = {
      'en': {
        'send_message': 'Send message',
        'voice_input': 'Voice input',
        'language_switch': 'Switch language',
        'emergency_button': 'Emergency button'
      },
      'hi': {
        'send_message': 'संदेश भेजें',
        'voice_input': 'आवाज इनपुट',
        'language_switch': 'भाषा बदलें',
        'emergency_button': 'आपातकालीन बटन'
      },
      'ar': {
        'send_message': 'إرسال رسالة',
        'voice_input': 'إدخال صوتي',
        'language_switch': 'تغيير اللغة',
        'emergency_button': 'زر الطوارئ'
      }
    };

    const languageLabels = labels[languageCode] || labels['en'];
    return languageLabels[key] || key;
  },

  // Save language preference
  async saveLanguagePreference(languageCode) {
    try {
      await AsyncStorage.setItem('userLanguage', languageCode);
      await AsyncStorage.setItem('isRTL', JSON.stringify(this.isRTLLanguage(languageCode)));
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Load language preference
  async loadLanguagePreference() {
    try {
      const languageCode = await AsyncStorage.getItem('userLanguage');
      const isRTL = await AsyncStorage.getItem('isRTL');
      
      return {
        success: true,
        languageCode: languageCode || 'en',
        isRTL: isRTL ? JSON.parse(isRTL) : false
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        languageCode: 'en',
        isRTL: false
      };
    }
  }
};