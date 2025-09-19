// Mock language detection service - in production would use actual ML models
export const languageDetectionService = {
  // Detect language from text
  detectLanguage: async (text) => {
    try {
      // Simple keyword-based detection for demo
      const detectedLanguage = this.simpleLanguageDetection(text);
      
      return {
        success: true,
        language: detectedLanguage,
        confidence: 0.85 // Mock confidence score
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Simple language detection based on common words
  simpleLanguageDetection: (text) => {
    const lowerText = text.toLowerCase();

    // Hindi detection
    const hindiWords = ['namaste', 'dhanyawad', 'kripaya', 'kahan', 'kitna', 'paisa', 'hai'];
    if (hindiWords.some(word => lowerText.includes(word))) {
      return 'hi';
    }

    // Spanish detection
    const spanishWords = ['hola', 'gracias', 'por favor', 'donde', 'cuanto', 'ayuda'];
    if (spanishWords.some(word => lowerText.includes(word))) {
      return 'es';
    }

    // French detection
    const frenchWords = ['bonjour', 'merci', 'sil vous plait', 'ou', 'combien', 'aide'];
    if (frenchWords.some(word => lowerText.includes(word))) {
      return 'fr';
    }

    // German detection
    const germanWords = ['hallo', 'danke', 'bitte', 'wo', 'wieviel', 'hilfe'];
    if (germanWords.some(word => lowerText.includes(word))) {
      return 'de';
    }

    // Japanese detection (romanized)
    const japaneseWords = ['konnichiwa', 'arigato', 'sumimasen', 'doko', 'ikura'];
    if (japaneseWords.some(word => lowerText.includes(word))) {
      return 'ja';
    }

    // Default to English
    return 'en';
  },

  // Get supported languages
  getSupportedLanguages: () => {
    return {
      success: true,
      languages: [
        { code: 'en', name: 'English', nativeName: 'English' },
        { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
        { code: 'es', name: 'Spanish', nativeName: 'Español' },
        { code: 'fr', name: 'French', nativeName: 'Français' },
        { code: 'de', name: 'German', nativeName: 'Deutsch' },
        { code: 'ja', name: 'Japanese', nativeName: '日本語' },
        { code: 'zh', name: 'Chinese', nativeName: '中文' },
        { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
        { code: 'ru', name: 'Russian', nativeName: 'Русский' },
        { code: 'pt', name: 'Portuguese', nativeName: 'Português' }
      ]
    };
  },

  // Auto-detect and set user language preference
  autoDetectUserLanguage: async (userTexts) => {
    try {
      const languageCounts = {};
      
      for (const text of userTexts) {
        const detection = await this.detectLanguage(text);
        if (detection.success) {
          languageCounts[detection.language] = (languageCounts[detection.language] || 0) + 1;
        }
      }

      // Find most common language
      const mostCommonLanguage = Object.keys(languageCounts).reduce((a, b) => 
        languageCounts[a] > languageCounts[b] ? a : b
      );

      return {
        success: true,
        detectedLanguage: mostCommonLanguage,
        confidence: languageCounts[mostCommonLanguage] / userTexts.length
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Get language name from code
  getLanguageName: (languageCode) => {
    const languages = this.getSupportedLanguages().languages;
    const language = languages.find(lang => lang.code === languageCode);
    return language ? language.name : 'Unknown';
  },

  // Check if language is supported
  isLanguageSupported: (languageCode) => {
    const languages = this.getSupportedLanguages().languages;
    return languages.some(lang => lang.code === languageCode);
  }
};