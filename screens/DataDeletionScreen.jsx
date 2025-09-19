import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { privacyService } from '../services/privacy/privacyService';

const DataDeletionScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState('');
  const [confirmationText, setConfirmationText] = useState('');
  const [selectedDataTypes, setSelectedDataTypes] = useState({
    profileData: false,
    locationHistory: false,
    emergencyContacts: false,
    qrCodeHistory: false,
    chatHistory: false,
    analyticsData: false,
    allData: false,
  });

  const dataTypeDescriptions = {
    profileData: 'Personal information including name, nationality, and passport details',
    locationHistory: 'All stored location data and safety zone history',
    emergencyContacts: 'Emergency contact information and communication history',
    qrCodeHistory: 'QR code generation history and verification records',
    chatHistory: 'AI chatbot conversation history and preferences',
    analyticsData: 'Usage statistics and app interaction data',
    allData: 'Complete account deletion including all data types above',
  };

  const handleDataTypeToggle = (dataType) => {
    if (dataType === 'allData') {
      const newValue = !selectedDataTypes.allData;
      setSelectedDataTypes({
        profileData: newValue,
        locationHistory: newValue,
        emergencyContacts: newValue,
        qrCodeHistory: newValue,
        chatHistory: newValue,
        analyticsData: newValue,
        allData: newValue,
      });
    } else {
      const newSelectedTypes = {
        ...selectedDataTypes,
        [dataType]: !selectedDataTypes[dataType],
        allData: false, // Uncheck "all data" if individual items are selected
      };
      setSelectedDataTypes(newSelectedTypes);
    }
  };

  const validateDeletionRequest = () => {
    const hasSelectedData = Object.entries(selectedDataTypes).some(
      ([key, value]) => key !== 'allData' && value
    ) || selectedDataTypes.allData;

    if (!hasSelectedData) {
      Alert.alert('Selection Required', 'Please select at least one type of data to delete.');
      return false;
    }

    if (confirmationText.toLowerCase() !== 'delete my data') {
      Alert.alert(
        'Confirmation Required', 
        'Please type "DELETE MY DATA" in the confirmation field to proceed.'
      );
      return false;
    }

    // Warn about safety implications
    if (selectedDataTypes.emergencyContacts || selectedDataTypes.allData) {
      return new Promise((resolve) => {
        Alert.alert(
          'Safety Warning',
          'Deleting emergency contacts will disable emergency response features. This may affect your safety while traveling. Are you sure you want to continue?',
          [
            { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
            { 
              text: 'Continue', 
              style: 'destructive', 
              onPress: () => resolve(true) 
            }
          ]
        );
      });
    }

    return true;
  };

  const handleSubmitDeletion = async () => {
    const isValid = await validateDeletionRequest();
    if (!isValid) return;

    setLoading(true);
    try {
      const deletionRequest = {
        userId: user.uid,
        email: user.email,
        dataTypes: selectedDataTypes,
        reason: reason.trim(),
        requestDate: new Date().toISOString(),
        status: 'pending',
      };

      await privacyService.submitDataDeletionRequest(deletionRequest);

      Alert.alert(
        'Request Submitted',
        'Your data deletion request has been submitted successfully. You will receive a confirmation email within 24 hours. The deletion process will be completed within 30 days as per our privacy policy.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (error) {
      console.error('Error submitting deletion request:', error);
      Alert.alert(
        'Error',
        'Failed to submit deletion request. Please try again or contact support.'
      );
    } finally {
      setLoading(false);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContainer: {
      padding: 16,
    },
    section: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      elevation: 2,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 12,
    },
    warningSection: {
      backgroundColor: colors.warningBackground || '#FFF3CD',
      borderLeftWidth: 4,
      borderLeftColor: colors.warning,
      padding: 16,
      marginBottom: 16,
      borderRadius: 8,
    },
    warningText: {
      fontSize: 14,
      color: colors.warningText || '#856404',
      lineHeight: 20,
    },
    dataTypeItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    checkbox: {
      width: 20,
      height: 20,
      borderRadius: 4,
      borderWidth: 2,
      borderColor: colors.primary,
      marginRight: 12,
      marginTop: 2,
      justifyContent: 'center',
      alignItems: 'center',
    },
    checkboxChecked: {
      backgroundColor: colors.primary,
    },
    checkboxText: {
      color: colors.surface,
      fontSize: 12,
      fontWeight: 'bold',
    },
    dataTypeContent: {
      flex: 1,
    },
    dataTypeTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 4,
    },
    dataTypeDescription: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    allDataItem: {
      backgroundColor: colors.errorBackground || '#F8D7DA',
      borderRadius: 8,
      padding: 12,
      marginBottom: 8,
    },
    textInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: colors.text,
      backgroundColor: colors.inputBackground || colors.surface,
      textAlignVertical: 'top',
    },
    confirmationInput: {
      marginTop: 8,
    },
    inputLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 8,
    },
    submitButton: {
      backgroundColor: colors.error,
      borderRadius: 8,
      padding: 16,
      alignItems: 'center',
      marginTop: 16,
    },
    submitButtonDisabled: {
      backgroundColor: colors.disabled || colors.border,
    },
    submitButtonText: {
      color: colors.surface,
      fontSize: 16,
      fontWeight: '600',
    },
    explanatoryText: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
      marginBottom: 16,
    },
    loadingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    loadingText: {
      marginLeft: 8,
      fontSize: 16,
      color: colors.surface,
    },
  });

  const hasSelectedData = Object.entries(selectedDataTypes).some(
    ([key, value]) => key !== 'allData' && value
  ) || selectedDataTypes.allData;

  const isFormValid = hasSelectedData && 
    confirmationText.toLowerCase() === 'delete my data' && 
    reason.trim().length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Warning Section */}
        <View style={styles.warningSection}>
          <Text style={styles.warningText}>
            ⚠️ Data deletion is permanent and cannot be undone. Some data may be retained for legal compliance. 
            Deleting certain data types may affect the app's safety features.
          </Text>
        </View>

        {/* Data Selection Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Data to Delete</Text>
          <Text style={styles.explanatoryText}>
            Choose which types of data you want to delete from your account. 
            Consider the impact on safety features before proceeding.
          </Text>

          {/* All Data Option */}
          <TouchableOpacity
            style={[styles.dataTypeItem, styles.allDataItem, { borderBottomWidth: 0 }]}
            onPress={() => handleDataTypeToggle('allData')}
            accessibilityLabel="Delete all data"
            accessibilityHint="Select to delete all data and close account completely"
          >
            <View style={[styles.checkbox, selectedDataTypes.allData && styles.checkboxChecked]}>
              {selectedDataTypes.allData && <Text style={styles.checkboxText}>✓</Text>}
            </View>
            <View style={styles.dataTypeContent}>
              <Text style={[styles.dataTypeTitle, { color: colors.error }]}>
                Delete All Data (Close Account)
              </Text>
              <Text style={styles.dataTypeDescription}>
                {dataTypeDescriptions.allData}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Individual Data Types */}
          {Object.entries(dataTypeDescriptions).map(([key, description]) => {
            if (key === 'allData') return null;
            
            return (
              <TouchableOpacity
                key={key}
                style={[
                  styles.dataTypeItem,
                  key === 'analyticsData' && { borderBottomWidth: 0 }
                ]}
                onPress={() => handleDataTypeToggle(key)}
                accessibilityLabel={`Toggle ${key} deletion`}
                accessibilityHint={`Select to include ${key} in deletion request`}
              >
                <View style={[styles.checkbox, selectedDataTypes[key] && styles.checkboxChecked]}>
                  {selectedDataTypes[key] && <Text style={styles.checkboxText}>✓</Text>}
                </View>
                <View style={styles.dataTypeContent}>
                  <Text style={styles.dataTypeTitle}>
                    {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                  </Text>
                  <Text style={styles.dataTypeDescription}>{description}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Reason Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reason for Deletion</Text>
          <Text style={styles.inputLabel}>
            Please provide a reason for your data deletion request (required):
          </Text>
          <TextInput
            style={[styles.textInput, { height: 100 }]}
            value={reason}
            onChangeText={setReason}
            placeholder="e.g., No longer traveling, privacy concerns, switching to different service..."
            placeholderTextColor={colors.textSecondary}
            multiline
            maxLength={500}
            accessibilityLabel="Deletion reason"
            accessibilityHint="Enter your reason for requesting data deletion"
          />
          <Text style={[styles.explanatoryText, { marginTop: 8, marginBottom: 0 }]}>
            {reason.length}/500 characters
          </Text>
        </View>

        {/* Confirmation Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Confirmation</Text>
          <Text style={styles.inputLabel}>
            Type "DELETE MY DATA" to confirm your request:
          </Text>
          <TextInput
            style={[styles.textInput, styles.confirmationInput]}
            value={confirmationText}
            onChangeText={setConfirmationText}
            placeholder="DELETE MY DATA"
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="characters"
            accessibilityLabel="Confirmation text"
            accessibilityHint="Type DELETE MY DATA to confirm deletion request"
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            (!isFormValid || loading) && styles.submitButtonDisabled
          ]}
          onPress={handleSubmitDeletion}
          disabled={!isFormValid || loading}
          accessibilityLabel="Submit deletion request"
          accessibilityHint="Submit your data deletion request"
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.surface} />
              <Text style={styles.loadingText}>Submitting Request...</Text>
            </View>
          ) : (
            <Text style={styles.submitButtonText}>Submit Deletion Request</Text>
          )}
        </TouchableOpacity>

        <Text style={[styles.explanatoryText, { textAlign: 'center', marginTop: 16 }]}>
          You will receive a confirmation email within 24 hours. 
          Data deletion will be completed within 30 days.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

export default DataDeletionScreen;