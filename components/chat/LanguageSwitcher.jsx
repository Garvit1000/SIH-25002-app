import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { languageDetectionService } from '../../services/ai/languageDetection';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LanguageSwitcher = ({ 
  currentLanguage, 
  onLanguageChange, 
  style,
  showLabel = true 
}) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [supportedLanguages, setSupportedLanguages] = useState([]);
  const [isRTL, setIsRTL] = useState(false);

  useEffect(() => {
    loadSupportedLanguages();
    checkRTLLanguage(currentLanguage);
  }, []);

  useEffect(() => {
    checkRTLLanguage(currentLanguage);
  }, [currentLanguage]);

  const loadSupportedLanguages = () => {
    const result = languageDetectionService.getSupportedLanguages();
    if (result.success) {
      setSupportedLanguages(result.languages);
    }
  };

  const checkRTLLanguage = (languageCode) => {
    const rtlLanguages = ['ar', 'he', 'fa', 'ur'];
    setIsRTL(rtlLanguages.includes(languageCode));
  };

  const handleLanguageSelect = async (languageCode) => {
    try {
      // Save language preference
      await AsyncStorage.setItem('userLanguage', languageCode);
      
      // Update parent component
      if (onLanguageChange) {
        onLanguageChange(languageCode);
      }
      
      setIsModalVisible(false);
      
      // Show confirmation
      const selectedLanguage = supportedLanguages.find(lang => lang.code === languageCode);
      Alert.alert(
        'Language Changed',
        `Language switched to ${selectedLanguage?.name || languageCode}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error saving language preference:', error);
      Alert.alert('Error', 'Failed to save language preference');
    }
  };

  const getCurrentLanguageName = () => {
    const language = supportedLanguages.find(lang => lang.code === currentLanguage);
    return language ? language.name : 'English';
  };

  const getCurrentLanguageNativeName = () => {
    const language = supportedLanguages.find(lang => lang.code === currentLanguage);
    return language ? language.nativeName : 'English';
  };

  const renderLanguageItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.languageItem,
        item.code === currentLanguage && styles.selectedLanguageItem,
        isRTL && styles.rtlLanguageItem
      ]}
      onPress={() => handleLanguageSelect(item.code)}
    >
      <View style={styles.languageInfo}>
        <Text style={[
          styles.languageName,
          item.code === currentLanguage && styles.selectedLanguageName,
          isRTL && styles.rtlText
        ]}>
          {item.name}
        </Text>
        <Text style={[
          styles.languageNativeName,
          item.code === currentLanguage && styles.selectedLanguageNativeName,
          isRTL && styles.rtlText
        ]}>
          {item.nativeName}
        </Text>
      </View>
      {item.code === currentLanguage && (
        <Ionicons name="checkmark" size={20} color="#007AFF" />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        style={[styles.languageButton, isRTL && styles.rtlButton]}
        onPress={() => setIsModalVisible(true)}
      >
        <Ionicons name="language" size={20} color="#007AFF" />
        {showLabel && (
          <View style={styles.languageTextContainer}>
            <Text style={[styles.languageButtonText, isRTL && styles.rtlText]}>
              {getCurrentLanguageName()}
            </Text>
            <Text style={[styles.languageButtonSubtext, isRTL && styles.rtlText]}>
              {getCurrentLanguageNativeName()}
            </Text>
          </View>
        )}
        <Ionicons name="chevron-down" size={16} color="#666" />
      </TouchableOpacity>

      <Modal
        visible={isModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setIsModalVisible(false)}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Language</Text>
            <View style={styles.placeholder} />
          </View>

          <FlatList
            data={supportedLanguages}
            renderItem={renderLanguageItem}
            keyExtractor={(item) => item.code}
            style={styles.languageList}
            showsVerticalScrollIndicator={false}
          />

          <View style={styles.modalFooter}>
            <Text style={styles.footerText}>
              Language changes will apply to AI responses and interface elements
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // Container styles
  },
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F0F8FF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#007AFF'
  },
  rtlButton: {
    flexDirection: 'row-reverse'
  },
  languageTextContainer: {
    marginHorizontal: 8,
    alignItems: 'center'
  },
  languageButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF'
  },
  languageButtonSubtext: {
    fontSize: 12,
    color: '#666'
  },
  rtlText: {
    textAlign: 'right',
    writingDirection: 'rtl'
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF'
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E1E5E9'
  },
  closeButton: {
    padding: 4
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A'
  },
  placeholder: {
    width: 32
  },
  languageList: {
    flex: 1
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0'
  },
  rtlLanguageItem: {
    flexDirection: 'row-reverse'
  },
  selectedLanguageItem: {
    backgroundColor: '#F0F8FF'
  },
  languageInfo: {
    flex: 1
  },
  languageName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1A1A1A',
    marginBottom: 2
  },
  selectedLanguageName: {
    color: '#007AFF'
  },
  languageNativeName: {
    fontSize: 14,
    color: '#666'
  },
  selectedLanguageNativeName: {
    color: '#007AFF'
  },
  modalFooter: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E1E5E9',
    backgroundColor: '#F8F9FA'
  },
  footerText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center'
  }
});

export default LanguageSwitcher;