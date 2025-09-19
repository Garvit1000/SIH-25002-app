// Mock translation service - in production would integrate with Google Translate or similar
export const translationService = {
  // Translate text from one language to another
  translateText: async (text, fromLanguage, toLanguage) => {
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));

      // Mock translation - in production would use actual translation API
      const translatedText = this.mockTranslate(text, fromLanguage, toLanguage);
      
      return {
        success: true,
        originalText: text,
        translatedText,
        fromLanguage,
        toLanguage,
        confidence: 0.92
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Mock translation function
  mockTranslate: (text, fromLang, toLang) => {
    // Simple mock translations for common phrases
    const translations = {
      'en-hi': {
        'hello': 'नमस्ते',
        'thank you': 'धन्यवाद',
        'please': 'कृपया',
        'help': 'मदद',
        'emergency': 'आपातकाल',
        'where is': 'कहाँ है',
        'how much': 'कितना',
        'police': 'पुलिस',
        'hospital': 'अस्पताल',
        'safe': 'सुरक्षित'
      },
      'hi-en': {
        'नमस्ते': 'hello',
        'धन्यवाद': 'thank you',
        'कृपया': 'please',
        'मदद': 'help',
        'आपातकाल': 'emergency',
        'कहाँ है': 'where is',
        'कितना': 'how much',
        'पुलिस': 'police',
        'अस्पताल': 'hospital',
        'सुरक्षित': 'safe'
      },
      'en-es': {
        'hello': 'hola',
        'thank you': 'gracias',
        'please': 'por favor',
        'help': 'ayuda',
        'emergency': 'emergencia',
        'where is': 'donde esta',
        'how much': 'cuanto cuesta',
        'police': 'policía',
        'hospital': 'hospital',
        'safe': 'seguro'
      }
    };

    const translationKey = `${fromLang}-${toLang}`;
    const translationMap = translations[translationKey];
    
    if (translationMap) {
      const lowerText = text.toLowerCase();
      for (const [original, translated] of Object.entries(translationMap)) {
        if (lowerText.includes(original.toLowerCase())) {
          return text.replace(new RegExp(original, 'gi'), translated);
        }
      }
    }

    // If no specific translation found, return with language indicator
    return `[${toLang.toUpperCase()}] ${text}`;
  },

  // Translate emergency phrases
  translateEmergencyPhrases: async (toLanguage) => {
    try {
      const emergencyPhrases = [
        'I need help',
        'Call police',
        'Medical emergency',
        'I am lost',
        'Where is the hospital?',
        'I don\'t speak the local language',
        'Please call this number',
        'I am a tourist'
      ];

      const translations = {};
      
      for (const phrase of emergencyPhrases) {
        const result = await this.translateText(phrase, 'en', toLanguage);
        if (result.success) {
          translations[phrase] = result.translatedText;
        }
      }

      return {
        success: true,
        translations
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Get common tourist phrases in local language
  getTouristPhrases: async (toLanguage) => {
    try {
      const touristPhrases = [
        'Hello',
        'Thank you',
        'Please',
        'Excuse me',
        'How much does this cost?',
        'Where is the bathroom?',
        'I would like to order',
        'The bill, please',
        'Do you speak English?',
        'I don\'t understand'
      ];

      const translations = {};
      
      for (const phrase of touristPhrases) {
        const result = await this.translateText(phrase, 'en', toLanguage);
        if (result.success) {
          translations[phrase] = result.translatedText;
        }
      }

      return {
        success: true,
        phrases: translations
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Batch translate multiple texts
  batchTranslate: async (texts, fromLanguage, toLanguage) => {
    try {
      const translations = [];
      
      for (const text of texts) {
        const result = await this.translateText(text, fromLanguage, toLanguage);
        translations.push(result);
      }

      return {
        success: true,
        translations
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Check if translation is needed
  needsTranslation: (userLanguage, contentLanguage) => {
    return userLanguage !== contentLanguage;
  },

  // Get translation confidence level
  getTranslationQuality: (originalLength, translatedLength) => {
    const lengthRatio = translatedLength / originalLength;
    
    if (lengthRatio >= 0.7 && lengthRatio <= 1.5) {
      return 'high';
    } else if (lengthRatio >= 0.5 && lengthRatio <= 2.0) {
      return 'medium';
    } else {
      return 'low';
    }
  }
};