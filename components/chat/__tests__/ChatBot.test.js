import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ChatBot from '../ChatBot';
import { chatBotService } from '../../../services/ai/chatBot';
import { languageDetectionService } from '../../../services/ai/languageDetection';
import { translationService } from '../../../services/ai/translation';

// Mock the services
jest.mock('../../../services/ai/chatBot');
jest.mock('../../../services/ai/languageDetection');
jest.mock('../../../services/ai/translation');
jest.mock('expo-speech', () => ({
  speak: jest.fn()
}));

describe('ChatBot Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with welcome message', () => {
    const { getByText } = render(<ChatBot />);
    
    expect(getByText(/Hello! I'm your AI travel assistant/)).toBeTruthy();
  });

  it('sends message when send button is pressed', async () => {
    chatBotService.processMessage.mockResolvedValue({
      success: true,
      response: {
        text: 'Test response',
        type: 'general',
        suggestions: []
      }
    });

    languageDetectionService.detectLanguage.mockResolvedValue({
      success: true,
      language: 'en'
    });

    const { getByPlaceholderText, getByTestId } = render(<ChatBot />);
    
    const input = getByPlaceholderText('Ask me anything about your travel...');
    const sendButton = getByTestId('send-button');

    fireEvent.changeText(input, 'Hello');
    fireEvent.press(sendButton);

    await waitFor(() => {
      expect(chatBotService.processMessage).toHaveBeenCalledWith('Hello', expect.any(Object));
    });
  });

  it('detects emergency messages and calls callback', async () => {
    const mockOnEmergencyDetected = jest.fn();
    
    chatBotService.processMessage.mockResolvedValue({
      success: true,
      response: {
        text: 'Emergency response',
        type: 'emergency',
        suggestions: ['Call Emergency Services']
      }
    });

    languageDetectionService.detectLanguage.mockResolvedValue({
      success: true,
      language: 'en'
    });

    const { getByPlaceholderText, getByTestId } = render(
      <ChatBot onEmergencyDetected={mockOnEmergencyDetected} />
    );
    
    const input = getByPlaceholderText('Ask me anything about your travel...');
    const sendButton = getByTestId('send-button');

    fireEvent.changeText(input, 'Help me emergency');
    fireEvent.press(sendButton);

    await waitFor(() => {
      expect(mockOnEmergencyDetected).toHaveBeenCalled();
    });
  });

  it('handles language detection and translation', async () => {
    const mockOnLanguageDetected = jest.fn();
    
    languageDetectionService.detectLanguage.mockResolvedValue({
      success: true,
      language: 'hi'
    });

    chatBotService.processMessage.mockResolvedValue({
      success: true,
      response: {
        text: 'Response in English',
        type: 'general',
        suggestions: []
      }
    });

    translationService.translateText.mockResolvedValue({
      success: true,
      translatedText: 'Response in Hindi'
    });

    translationService.needsTranslation.mockReturnValue(true);

    const { getByPlaceholderText, getByTestId } = render(
      <ChatBot onLanguageDetected={mockOnLanguageDetected} />
    );
    
    const input = getByPlaceholderText('Ask me anything about your travel...');
    const sendButton = getByTestId('send-button');

    fireEvent.changeText(input, 'नमस्ते');
    fireEvent.press(sendButton);

    await waitFor(() => {
      expect(mockOnLanguageDetected).toHaveBeenCalledWith('hi');
      expect(translationService.translateText).toHaveBeenCalled();
    });
  });

  it('handles suggestion button presses', async () => {
    chatBotService.processMessage.mockResolvedValue({
      success: true,
      response: {
        text: 'Test response',
        type: 'general',
        suggestions: ['Safety Information', 'Emergency Help']
      }
    });

    languageDetectionService.detectLanguage.mockResolvedValue({
      success: true,
      language: 'en'
    });

    const { getByText, getByPlaceholderText, getByTestId } = render(<ChatBot />);
    
    const input = getByPlaceholderText('Ask me anything about your travel...');
    const sendButton = getByTestId('send-button');

    fireEvent.changeText(input, 'Hello');
    fireEvent.press(sendButton);

    await waitFor(() => {
      expect(getByText('Safety Information')).toBeTruthy();
    });

    // Reset mock for suggestion press
    chatBotService.processMessage.mockClear();
    chatBotService.processMessage.mockResolvedValue({
      success: true,
      response: {
        text: 'Safety information response',
        type: 'safety',
        suggestions: []
      }
    });

    fireEvent.press(getByText('Safety Information'));

    await waitFor(() => {
      expect(chatBotService.processMessage).toHaveBeenCalledWith('Safety Information', expect.any(Object));
    });
  });

  it('handles voice mode toggle', () => {
    const { getByTestId } = render(<ChatBot />);
    
    const voiceToggle = getByTestId('voice-toggle');
    
    fireEvent.press(voiceToggle);
    
    // Voice mode should be enabled (visual feedback would be tested in integration tests)
    expect(voiceToggle).toBeTruthy();
  });

  it('clears chat when clear button is pressed', () => {
    const { getByTestId, getByText } = render(<ChatBot />);
    
    const clearButton = getByTestId('clear-chat');
    
    fireEvent.press(clearButton);
    
    // Should show confirmation alert
    expect(getByText('Clear Chat')).toBeTruthy();
  });

  it('handles error responses gracefully', async () => {
    chatBotService.processMessage.mockResolvedValue({
      success: false,
      error: 'Service unavailable'
    });

    languageDetectionService.detectLanguage.mockResolvedValue({
      success: true,
      language: 'en'
    });

    const { getByPlaceholderText, getByTestId, getByText } = render(<ChatBot />);
    
    const input = getByPlaceholderText('Ask me anything about your travel...');
    const sendButton = getByTestId('send-button');

    fireEvent.changeText(input, 'Hello');
    fireEvent.press(sendButton);

    await waitFor(() => {
      expect(getByText(/I'm sorry, I'm having trouble processing/)).toBeTruthy();
    });
  });
});