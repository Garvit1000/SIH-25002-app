import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const MessageBubble = ({ message, onSuggestionPress }) => {
  const isUser = message.type === 'user';
  const isEmergency = message.messageType === 'emergency';
  const isError = message.messageType === 'error';

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getMessageIcon = () => {
    switch (message.messageType) {
      case 'emergency':
        return 'warning';
      case 'safety':
        return 'shield-checkmark';
      case 'directions':
        return 'navigate';
      case 'weather':
        return 'partly-sunny';
      case 'cultural':
        return 'library';
      case 'transport':
        return 'car';
      case 'dining':
        return 'restaurant';
      case 'language':
        return 'language';
      case 'error':
        return 'alert-circle';
      default:
        return 'chatbubble';
    }
  };

  const getMessageColor = () => {
    if (isEmergency) return '#FF3B30';
    if (isError) return '#FF9500';
    return '#007AFF';
  };

  return (
    <View style={[styles.container, isUser && styles.userContainer]}>
      <View style={[
        styles.bubble,
        isUser ? styles.userBubble : styles.botBubble,
        isEmergency && styles.emergencyBubble,
        isError && styles.errorBubble
      ]}>
        {/* Bot message header with icon */}
        {!isUser && (
          <View style={styles.botHeader}>
            <Ionicons 
              name={getMessageIcon()} 
              size={16} 
              color={getMessageColor()} 
            />
            <Text style={[styles.botLabel, { color: getMessageColor() }]}>
              AI Assistant
            </Text>
          </View>
        )}

        {/* Message text */}
        <Text style={[
          styles.messageText,
          isUser ? styles.userText : styles.botText,
          isEmergency && styles.emergencyText
        ]}>
          {message.text}
        </Text>

        {/* Timestamp */}
        <Text style={[
          styles.timestamp,
          isUser ? styles.userTimestamp : styles.botTimestamp
        ]}>
          {formatTime(message.timestamp)}
        </Text>

        {/* Suggestions for bot messages */}
        {!isUser && message.suggestions && message.suggestions.length > 0 && (
          <View style={styles.suggestionsContainer}>
            <Text style={styles.suggestionsLabel}>Quick actions:</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.suggestionsScroll}
            >
              {message.suggestions.map((suggestion, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.suggestionButton,
                    isEmergency && styles.emergencySuggestion
                  ]}
                  onPress={() => onSuggestionPress(suggestion)}
                >
                  <Text style={[
                    styles.suggestionText,
                    isEmergency && styles.emergencySuggestionText
                  ]}>
                    {suggestion}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    paddingHorizontal: 4
  },
  userContainer: {
    alignItems: 'flex-end'
  },
  bubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2
  },
  userBubble: {
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 4
  },
  botBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E1E5E9'
  },
  emergencyBubble: {
    backgroundColor: '#FFF5F5',
    borderColor: '#FF3B30',
    borderWidth: 2
  },
  errorBubble: {
    backgroundColor: '#FFF9F0',
    borderColor: '#FF9500',
    borderWidth: 1
  },
  botHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4
  },
  botLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22
  },
  userText: {
    color: '#FFFFFF'
  },
  botText: {
    color: '#1A1A1A'
  },
  emergencyText: {
    color: '#FF3B30',
    fontWeight: '500'
  },
  timestamp: {
    fontSize: 11,
    marginTop: 4,
    opacity: 0.7
  },
  userTimestamp: {
    color: '#FFFFFF',
    textAlign: 'right'
  },
  botTimestamp: {
    color: '#666'
  },
  suggestionsContainer: {
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0'
  },
  suggestionsLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 6,
    fontWeight: '500'
  },
  suggestionsScroll: {
    flexDirection: 'row'
  },
  suggestionButton: {
    backgroundColor: '#F0F8FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#007AFF'
  },
  emergencySuggestion: {
    backgroundColor: '#FFF0F0',
    borderColor: '#FF3B30'
  },
  suggestionText: {
    fontSize: 13,
    color: '#007AFF',
    fontWeight: '500'
  },
  emergencySuggestionText: {
    color: '#FF3B30'
  }
});

export default MessageBubble;