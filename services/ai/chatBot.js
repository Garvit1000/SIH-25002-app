// Mock AI chatbot service - in production would integrate with actual AI service
export const chatBotService = {
  // Process user message and generate response
  processMessage: async (message, context = {}) => {
    try {
      // Simulate AI processing delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      const response = await this.generateResponse(message, context);
      
      return {
        success: true,
        response: {
          text: response.text,
          type: response.type,
          suggestions: response.suggestions || [],
          timestamp: new Date()
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Generate contextual response based on message
  generateResponse: async (message, context) => {
    const lowerMessage = message.toLowerCase();

    // Emergency keywords
    if (this.containsEmergencyKeywords(lowerMessage)) {
      return {
        text: "I detect this might be an emergency. Please use the panic button for immediate help, or call:\n• Police: 100\n• Medical: 108\n• Fire: 101\n• Tourist Helpline: 1363",
        type: 'emergency',
        suggestions: ['Call Emergency Services', 'Use Panic Button', 'Share Location']
      };
    }

    // Location and directions
    if (lowerMessage.includes('direction') || lowerMessage.includes('how to get') || lowerMessage.includes('where is')) {
      return {
        text: "I can help you with directions! For the safest routes, I recommend using the map feature in the app which shows safety zones. Would you like me to help you find a specific location?",
        type: 'directions',
        suggestions: ['Open Map', 'Find Safe Route', 'Nearby Places']
      };
    }

    // Safety information
    if (lowerMessage.includes('safe') || lowerMessage.includes('danger') || lowerMessage.includes('security')) {
      return {
        text: "Your safety is our priority! The app continuously monitors your location and will alert you about safety zones. Green zones are safe, yellow require caution, and red zones should be avoided. Always stay in well-lit, populated areas.",
        type: 'safety',
        suggestions: ['Check Current Safety Zone', 'View Safety Tips', 'Emergency Contacts']
      };
    }

    // Local information
    if (lowerMessage.includes('weather') || lowerMessage.includes('temperature')) {
      return {
        text: "Current weather conditions show it's partly cloudy with temperatures around 25°C. Perfect weather for sightseeing! Remember to stay hydrated and wear sunscreen.",
        type: 'weather',
        suggestions: ['Weather Forecast', 'What to Wear', 'Outdoor Activities']
      };
    }

    // Cultural information
    if (lowerMessage.includes('culture') || lowerMessage.includes('custom') || lowerMessage.includes('tradition')) {
      return {
        text: "India has rich cultural traditions! When visiting temples, dress modestly and remove shoes. It's customary to greet with 'Namaste'. Tipping is appreciated in restaurants (10-15%). Always ask before photographing people.",
        type: 'cultural',
        suggestions: ['Temple Etiquette', 'Local Customs', 'Photography Guidelines']
      };
    }

    // Transportation
    if (lowerMessage.includes('transport') || lowerMessage.includes('taxi') || lowerMessage.includes('bus')) {
      return {
        text: "For safe transportation, I recommend using official taxi services or ride-sharing apps like Uber/Ola. Always verify the driver and vehicle details. For public transport, keep valuables secure and stay alert.",
        type: 'transport',
        suggestions: ['Book Safe Ride', 'Public Transport Info', 'Transportation Safety']
      };
    }

    // Food and dining
    if (lowerMessage.includes('food') || lowerMessage.includes('restaurant') || lowerMessage.includes('eat')) {
      return {
        text: "India offers amazing cuisine! For food safety, choose busy restaurants with high turnover. Drink bottled water and avoid street food initially. Popular safe options include hotel restaurants and well-reviewed establishments.",
        type: 'dining',
        suggestions: ['Recommended Restaurants', 'Food Safety Tips', 'Local Specialties']
      };
    }

    // Language help
    if (lowerMessage.includes('language') || lowerMessage.includes('translate') || lowerMessage.includes('speak')) {
      return {
        text: "I can help with basic Hindi phrases:\n• Hello: Namaste\n• Thank you: Dhanyawad\n• Please: Kripaya\n• Excuse me: Maaf kijiye\n• How much?: Kitna paisa?\n• Where is?: Kahan hai?",
        type: 'language',
        suggestions: ['More Phrases', 'Voice Translation', 'Language Settings']
      };
    }

    // Default response
    return {
      text: "I'm here to help with your travel needs! I can assist with directions, safety information, local customs, weather updates, and emergency situations. What would you like to know?",
      type: 'general',
      suggestions: ['Safety Information', 'Local Attractions', 'Emergency Help', 'Cultural Tips']
    };
  },

  // Check for emergency keywords
  containsEmergencyKeywords: (message) => {
    const emergencyKeywords = [
      'help', 'emergency', 'danger', 'police', 'medical', 'fire', 'accident',
      'lost', 'stolen', 'robbery', 'attack', 'hurt', 'injured', 'sick'
    ];
    
    return emergencyKeywords.some(keyword => message.includes(keyword));
  },

  // Get conversation history
  getConversationHistory: async (userId) => {
    try {
      // In production, this would fetch from database
      return {
        success: true,
        history: []
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Save conversation
  saveConversation: async (userId, message, response) => {
    try {
      // In production, this would save to database
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};