import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { chatBotService } from '../../services/ai/chatBot';
import { languageDetectionService } from '../../services/ai/languageDetection';
import { translationService } from '../../services/ai/translation';
import LoadingIndicator from '../LoadingIndicator';
import MessageBubble from './MessageBubble';
import VoiceInput from './VoiceInput';

const ChatBot = ({ 
  userLanguage = 'en', 
  onLanguageDetected, 
  onEmergencyDetected,
  style 
}) => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [detectedLanguage, setDetectedLanguage] = useState(userLanguage);
  const scrollViewRef = useRef(null);

  useEffect(() => {
    // Add welcome message
    addWelcomeMessage();
  }, []);

  useEffect(() => {
    // Scroll to bottom when new messages are added
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const addWelcomeMessage = () => {
    const welcomeMessage = {
      id: Date.now(),
      text: "Hello! I'm your AI travel assistant. I can help you with directions, safety information, local customs, emergency situations, and more. How can I assist you today?",
      type: 'bot',
      messageType: 'general',
      timestamp: new Date(),
      suggestions: ['Safety Information', 'Local Attractions', 'Emergency Help', 'Cultural Tips']
    };
    setMessages([welcomeMessage]);
  };

  const handleSendMessage = async (messageText = inputText) => {
    if (!messageText.trim()) return;

    const userMessage = {
      id: Date.now(),
      text: messageText,
      type: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      // Detect language if different from current
      const languageResult = await languageDetectionService.detectLanguage(messageText);
      if (languageResult.success && languageResult.language !== detectedLanguage) {
        setDetectedLanguage(languageResult.language);
        if (onLanguageDetected) {
          onLanguageDetected(languageResult.language);
        }
      }

      // Process message with chatbot
      const context = {
        userLanguage: detectedLanguage,
        previousMessages: messages.slice(-5) // Last 5 messages for context
      };

      const response = await chatBotService.processMessage(messageText, context);

      if (response.success) {
        let botResponseText = response.response.text;

        // Translate response if needed
        if (detectedLanguage !== 'en' && translationService.needsTranslation('en', detectedLanguage)) {
          const translationResult = await translationService.translateText(
            botResponseText, 
            'en', 
            detectedLanguage
          );
          if (translationResult.success) {
            botResponseText = translationResult.translatedText;
          }
        }

        const botMessage = {
          id: Date.now() + 1,
          text: botResponseText,
          type: 'bot',
          messageType: response.response.type,
          timestamp: new Date(),
          suggestions: response.response.suggestions || []
        };

        setMessages(prev => [...prev, botMessage]);

        // Check for emergency and notify parent
        if (response.response.type === 'emergency' && onEmergencyDetected) {
          onEmergencyDetected(messageText, response.response);
        }

        // Speak response if voice mode is enabled
        if (isVoiceMode) {
          Speech.speak(botResponseText, {
            language: detectedLanguage === 'hi' ? 'hi-IN' : 'en-US'
          });
        }
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = {
        id: Date.now() + 1,
        text: "I'm sorry, I'm having trouble processing your request right now. Please try again or use the emergency button if this is urgent.",
        type: 'bot',
        messageType: 'error',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionPress = (suggestion) => {
    handleSendMessage(suggestion);
  };

  const handleVoiceInput = (transcript) => {
    if (transcript) {
      setInputText(transcript);
      handleSendMessage(transcript);
    }
  };

  const toggleVoiceMode = () => {
    setIsVoiceMode(!isVoiceMode);
  };

  const clearChat = () => {
    Alert.alert(
      'Clear Chat',
      'Are you sure you want to clear the conversation?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          style: 'destructive',
          onPress: () => {
            setMessages([]);
            addWelcomeMessage();
          }
        }
      ]
    );
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, style]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="chatbubble-ellipses" size={24} color="#007AFF" />
          <Text style={styles.headerTitle}>AI Assistant</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity 
            onPress={toggleVoiceMode}
            style={[styles.headerButton, isVoiceMode && styles.activeButton]}
            testID="voice-toggle"
          >
            <Ionicons 
              name={isVoiceMode ? "volume-high" : "volume-mute"} 
              size={20} 
              color={isVoiceMode ? "#007AFF" : "#666"} 
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={clearChat} style={styles.headerButton} testID="clear-chat">
            <Ionicons name="trash-outline" size={20} color="#666" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Language indicator */}
      {detectedLanguage !== 'en' && (
        <View style={styles.languageIndicator}>
          <Ionicons name="language" size={16} color="#007AFF" />
          <Text style={styles.languageText}>
            Detected: {languageDetectionService.getLanguageName(detectedLanguage)}
          </Text>
        </View>
      )}

      {/* Messages */}
      <ScrollView 
        ref={scrollViewRef}
        style={styles.messagesContainer}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            onSuggestionPress={handleSuggestionPress}
          />
        ))}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <LoadingIndicator size="small" />
            <Text style={styles.loadingText}>AI is thinking...</Text>
          </View>
        )}
      </ScrollView>

      {/* Input area */}
      <View style={styles.inputContainer}>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Ask me anything about your travel..."
            placeholderTextColor="#999"
            multiline
            maxLength={500}
            onSubmitEditing={() => handleSendMessage()}
            blurOnSubmit={false}
          />
          <VoiceInput
            onTranscript={handleVoiceInput}
            language={detectedLanguage}
            style={styles.voiceButton}
          />
          <TouchableOpacity 
            onPress={() => handleSendMessage()}
            style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
            disabled={!inputText.trim() || isLoading}
            testID="send-button"
          >
            <Ionicons 
              name="send" 
              size={20} 
              color={inputText.trim() ? "#007AFF" : "#CCC"} 
            />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E1E5E9'
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginLeft: 8
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  headerButton: {
    padding: 8,
    marginLeft: 8,
    borderRadius: 20
  },
  activeButton: {
    backgroundColor: '#E3F2FD'
  },
  languageIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#E3F2FD'
  },
  languageText: {
    fontSize: 14,
    color: '#007AFF',
    marginLeft: 4
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 16
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8
  },
  inputContainer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E1E5E9',
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end'
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E1E5E9',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    maxHeight: 100,
    backgroundColor: '#F8F9FA'
  },
  voiceButton: {
    marginLeft: 8
  },
  sendButton: {
    padding: 12,
    marginLeft: 8,
    borderRadius: 20,
    backgroundColor: '#F0F0F0'
  },
  sendButtonDisabled: {
    opacity: 0.5
  }
});

export default ChatBot;