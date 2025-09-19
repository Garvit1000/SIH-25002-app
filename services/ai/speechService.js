import * as Speech from 'expo-speech';
import { languageDetectionService } from './languageDetection';
import { translationService } from './translation';

// Mock speech-to-text service - in production would integrate with actual STT service
export const speechService = {
  // Convert speech to text
  speechToText: async (audioData, language = 'en') => {
    try {
      // Simulate speech processing delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Mock transcription based on language
      const mockTranscriptions = this.getMockTranscriptions(language);
      const randomTranscription = mockTranscriptions[
        Math.floor(Math.random() * mockTranscriptions.length)
      ];

      return {
        success: true,
        transcript: randomTranscription,
        confidence: 0.85 + Math.random() * 0.1, // 85-95% confidence
        language: language,
        duration: 2.5 // Mock duration in seconds
      };
    } catch (error) {
      return { 
        success: false, 
        error: error.message,
        transcript: ''
      };
    }
  },

  // Get mock transcriptions for different languages
  getMockTranscriptions: (language) => {
    const transcriptions = {
      'en': [
        "Where is the nearest hospital?",
        "I need help with directions",
        "What are the local customs here?",
        "Is this area safe?",
        "How do I get to the airport?",
        "What's the weather like today?",
        "I'm looking for a good restaurant",
        "Help me translate this phrase",
        "Call emergency services",
        "I'm lost and need assistance"
      ],
      'hi': [
        "सबसे नजदीकी अस्पताल कहाँ है?",
        "मुझे दिशा में मदद चाहिए",
        "यहाँ के स्थानीय रीति-रिवाज क्या हैं?",
        "क्या यह क्षेत्र सुरक्षित है?",
        "हवाई अड्डे कैसे जाऊं?",
        "आज मौसम कैसा है?",
        "मैं एक अच्छा रेस्तरां ढूंढ रहा हूं",
        "इस वाक्य का अनुवाद करने में मदद करें"
      ],
      'es': [
        "¿Dónde está el hospital más cercano?",
        "Necesito ayuda con las direcciones",
        "¿Cuáles son las costumbres locales aquí?",
        "¿Es segura esta área?",
        "¿Cómo llego al aeropuerto?",
        "¿Cómo está el clima hoy?",
        "Estoy buscando un buen restaurante",
        "Ayúdame a traducir esta frase"
      ],
      'fr': [
        "Où est l'hôpital le plus proche?",
        "J'ai besoin d'aide pour les directions",
        "Quelles sont les coutumes locales ici?",
        "Cette zone est-elle sûre?",
        "Comment puis-je me rendre à l'aéroport?",
        "Quel temps fait-il aujourd'hui?",
        "Je cherche un bon restaurant",
        "Aidez-moi à traduire cette phrase"
      ]
    };

    return transcriptions[language] || transcriptions['en'];
  },

  // Convert text to speech
  textToSpeech: async (text, language = 'en', options = {}) => {
    try {
      const speechOptions = {
        language: this.getVoiceLanguage(language),
        pitch: options.pitch || 1.0,
        rate: options.rate || 0.8,
        voice: options.voice || null,
        ...options
      };

      await Speech.speak(text, speechOptions);

      return {
        success: true,
        text: text,
        language: language,
        options: speechOptions
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Get appropriate voice language code for expo-speech
  getVoiceLanguage: (languageCode) => {
    const voiceLanguages = {
      'en': 'en-US',
      'hi': 'hi-IN',
      'es': 'es-ES',
      'fr': 'fr-FR',
      'de': 'de-DE',
      'ja': 'ja-JP',
      'zh': 'zh-CN',
      'ar': 'ar-SA',
      'ru': 'ru-RU',
      'pt': 'pt-BR'
    };

    return voiceLanguages[languageCode] || 'en-US';
  },

  // Check if speech synthesis is available
  isSpeechAvailable: async () => {
    try {
      const voices = await Speech.getAvailableVoicesAsync();
      return {
        success: true,
        available: voices.length > 0,
        voices: voices
      };
    } catch (error) {
      return {
        success: false,
        available: false,
        error: error.message
      };
    }
  },

  // Stop current speech
  stopSpeech: async () => {
    try {
      await Speech.stop();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Process voice input with language detection
  processVoiceInput: async (audioData, expectedLanguage = null) => {
    try {
      // First, convert speech to text
      const sttResult = await this.speechToText(audioData, expectedLanguage || 'en');
      
      if (!sttResult.success) {
        throw new Error(sttResult.error);
      }

      // Detect language if not specified
      let detectedLanguage = expectedLanguage;
      if (!expectedLanguage) {
        const languageResult = await languageDetectionService.detectLanguage(sttResult.transcript);
        if (languageResult.success) {
          detectedLanguage = languageResult.language;
        }
      }

      // Translate to English if needed for processing
      let processedText = sttResult.transcript;
      if (detectedLanguage !== 'en') {
        const translationResult = await translationService.translateText(
          sttResult.transcript,
          detectedLanguage,
          'en'
        );
        if (translationResult.success) {
          processedText = translationResult.translatedText;
        }
      }

      return {
        success: true,
        originalTranscript: sttResult.transcript,
        processedText: processedText,
        detectedLanguage: detectedLanguage,
        confidence: sttResult.confidence,
        needsTranslation: detectedLanguage !== 'en'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Get speech settings for user preferences
  getSpeechSettings: async () => {
    try {
      // In production, would load from user preferences
      return {
        success: true,
        settings: {
          enabled: true,
          autoSpeak: false,
          rate: 0.8,
          pitch: 1.0,
          volume: 1.0,
          language: 'en'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Update speech settings
  updateSpeechSettings: async (settings) => {
    try {
      // In production, would save to user preferences
      return {
        success: true,
        settings: settings
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Get supported speech languages
  getSupportedSpeechLanguages: () => {
    return {
      success: true,
      languages: [
        { code: 'en', name: 'English', voice: 'en-US' },
        { code: 'hi', name: 'Hindi', voice: 'hi-IN' },
        { code: 'es', name: 'Spanish', voice: 'es-ES' },
        { code: 'fr', name: 'French', voice: 'fr-FR' },
        { code: 'de', name: 'German', voice: 'de-DE' },
        { code: 'ja', name: 'Japanese', voice: 'ja-JP' },
        { code: 'zh', name: 'Chinese', voice: 'zh-CN' },
        { code: 'ar', name: 'Arabic', voice: 'ar-SA' },
        { code: 'ru', name: 'Russian', voice: 'ru-RU' },
        { code: 'pt', name: 'Portuguese', voice: 'pt-BR' }
      ]
    };
  }
};