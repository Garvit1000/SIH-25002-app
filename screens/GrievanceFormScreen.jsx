import React, { useState, useEffect } from 'react';
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
import { Picker } from '@react-native-picker/picker';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { privacyService } from '../services/privacy/privacyService';

const GrievanceFormScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [grievanceData, setGrievanceData] = useState({
    category: '',
    subject: '',
    description: '',
    priority: 'medium',
    contactMethod: 'email',
  });
  const [existingGrievances, setExistingGrievances] = useState([]);

  const grievanceCategories = [
    { label: 'Select a category...', value: '' },
    { label: 'Data Privacy Violation', value: 'privacy_violation' },
    { label: 'Unauthorized Data Collection', value: 'unauthorized_collection' },
    { label: 'Data Sharing Concerns', value: 'data_sharing' },
    { label: 'Consent Management Issues', value: 'consent_issues' },
    { label: 'Data Deletion Request Issues', value: 'deletion_issues' },
    { label: 'Security Breach Report', value: 'security_breach' },
    { label: 'Accessibility Concerns', value: 'accessibility' },
    { label: 'Other Privacy Concerns', value: 'other' },
  ];

  const priorityLevels = [
    { label: 'Low', value: 'low' },
    { label: 'Medium', value: 'medium' },
    { label: 'High', value: 'high' },
    { label: 'Critical', value: 'critical' },
  ];

  const contactMethods = [
    { label: 'Email', value: 'email' },
    { label: 'Phone Call', value: 'phone' },
    { label: 'In-App Notification', value: 'notification' },
  ];

  useEffect(() => {
    loadExistingGrievances();
  }, []);

  const loadExistingGrievances = async () => {
    setLoading(true);
    try {
      if (user) {
        const grievances = await privacyService.getUserGrievances(user.uid);
        setExistingGrievances(grievances);
      }
    } catch (error) {
      console.error('Error loading grievances:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setGrievanceData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = () => {
    if (!grievanceData.category) {
      Alert.alert('Validation Error', 'Please select a grievance category.');
      return false;
    }
    if (!grievanceData.subject.trim()) {
      Alert.alert('Validation Error', 'Please enter a subject for your grievance.');
      return false;
    }
    if (!grievanceData.description.trim()) {
      Alert.alert('Validation Error', 'Please provide a detailed description of your grievance.');
      return false;
    }
    if (grievanceData.description.trim().length < 20) {
      Alert.alert('Validation Error', 'Please provide a more detailed description (at least 20 characters).');
      return false;
    }
    return true;
  };

  const handleSubmitGrievance = async () => {
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const grievanceRequest = {
        userId: user.uid,
        email: user.email,
        userName: profile?.name || 'Unknown User',
        category: grievanceData.category,
        subject: grievanceData.subject.trim(),
        description: grievanceData.description.trim(),
        priority: grievanceData.priority,
        contactMethod: grievanceData.contactMethod,
        status: 'submitted',
        submittedAt: new Date().toISOString(),
      };

      const grievanceId = await privacyService.submitGrievance(grievanceRequest);

      Alert.alert(
        'Grievance Submitted',
        `Your grievance has been submitted successfully with ID: ${grievanceId}. You will receive updates via your preferred contact method. We aim to respond within 48 hours.`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Reset form
              setGrievanceData({
                category: '',
                subject: '',
                description: '',
                priority: 'medium',
                contactMethod: 'email',
              });
              // Reload grievances to show the new one
              loadExistingGrievances();
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error submitting grievance:', error);
      Alert.alert(
        'Submission Error',
        'Failed to submit your grievance. Please try again or contact support directly.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'submitted': return colors.warning;
      case 'in_progress': return colors.primary;
      case 'resolved': return colors.success;
      case 'closed': return colors.textSecondary;
      default: return colors.text;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'submitted': return 'Submitted';
      case 'in_progress': return 'In Progress';
      case 'resolved': return 'Resolved';
      case 'closed': return 'Closed';
      default: return 'Unknown';
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
    inputLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
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
    },
    textArea: {
      height: 120,
      textAlignVertical: 'top',
    },
    pickerContainer: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      backgroundColor: colors.inputBackground || colors.surface,
    },
    picker: {
      color: colors.text,
    },
    submitButton: {
      backgroundColor: colors.primary,
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
    characterCount: {
      fontSize: 12,
      color: colors.textSecondary,
      textAlign: 'right',
      marginTop: 4,
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
    grievanceItem: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 12,
      marginBottom: 12,
    },
    grievanceHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    grievanceId: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    grievanceStatus: {
      fontSize: 12,
      fontWeight: '600',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
      backgroundColor: colors.surface,
    },
    grievanceSubject: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 4,
    },
    grievanceDate: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    emptyState: {
      textAlign: 'center',
      fontSize: 14,
      color: colors.textSecondary,
      fontStyle: 'italic',
      padding: 20,
    },
    priorityHigh: {
      borderLeftWidth: 4,
      borderLeftColor: colors.error,
    },
    priorityCritical: {
      borderLeftWidth: 4,
      borderLeftColor: colors.error,
      backgroundColor: colors.errorBackground || '#FFF5F5',
    },
  });

  const isFormValid = grievanceData.category && 
    grievanceData.subject.trim() && 
    grievanceData.description.trim().length >= 20;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Existing Grievances Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Previous Grievances</Text>
          {loading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : existingGrievances.length > 0 ? (
            existingGrievances.map((grievance) => (
              <View 
                key={grievance.id} 
                style={[
                  styles.grievanceItem,
                  grievance.priority === 'high' && styles.priorityHigh,
                  grievance.priority === 'critical' && styles.priorityCritical,
                ]}
              >
                <View style={styles.grievanceHeader}>
                  <Text style={styles.grievanceId}>ID: {grievance.id}</Text>
                  <Text 
                    style={[
                      styles.grievanceStatus, 
                      { color: getStatusColor(grievance.status) }
                    ]}
                  >
                    {getStatusText(grievance.status)}
                  </Text>
                </View>
                <Text style={styles.grievanceSubject}>{grievance.subject}</Text>
                <Text style={styles.grievanceDate}>
                  Submitted: {new Date(grievance.submittedAt).toLocaleDateString()}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyState}>No previous grievances found.</Text>
          )}
        </View>

        {/* New Grievance Form */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Submit New Grievance</Text>
          <Text style={styles.explanatoryText}>
            Use this form to report privacy concerns, data protection issues, or other grievances. 
            We take all reports seriously and will respond within 48 hours.
          </Text>

          {/* Category Selection */}
          <Text style={styles.inputLabel}>Grievance Category *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={grievanceData.category}
              onValueChange={(value) => handleInputChange('category', value)}
              style={styles.picker}
              accessibilityLabel="Select grievance category"
            >
              {grievanceCategories.map((category) => (
                <Picker.Item 
                  key={category.value} 
                  label={category.label} 
                  value={category.value} 
                />
              ))}
            </Picker>
          </View>

          {/* Subject */}
          <Text style={[styles.inputLabel, { marginTop: 16 }]}>Subject *</Text>
          <TextInput
            style={styles.textInput}
            value={grievanceData.subject}
            onChangeText={(value) => handleInputChange('subject', value)}
            placeholder="Brief summary of your grievance"
            placeholderTextColor={colors.textSecondary}
            maxLength={100}
            accessibilityLabel="Grievance subject"
            accessibilityHint="Enter a brief summary of your grievance"
          />
          <Text style={styles.characterCount}>{grievanceData.subject.length}/100</Text>

          {/* Description */}
          <Text style={[styles.inputLabel, { marginTop: 16 }]}>Detailed Description *</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            value={grievanceData.description}
            onChangeText={(value) => handleInputChange('description', value)}
            placeholder="Please provide detailed information about your grievance, including dates, specific incidents, and any relevant context..."
            placeholderTextColor={colors.textSecondary}
            multiline
            maxLength={1000}
            accessibilityLabel="Grievance description"
            accessibilityHint="Provide detailed information about your grievance"
          />
          <Text style={styles.characterCount}>{grievanceData.description.length}/1000</Text>

          {/* Priority Level */}
          <Text style={[styles.inputLabel, { marginTop: 16 }]}>Priority Level</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={grievanceData.priority}
              onValueChange={(value) => handleInputChange('priority', value)}
              style={styles.picker}
              accessibilityLabel="Select priority level"
            >
              {priorityLevels.map((priority) => (
                <Picker.Item 
                  key={priority.value} 
                  label={priority.label} 
                  value={priority.value} 
                />
              ))}
            </Picker>
          </View>

          {/* Preferred Contact Method */}
          <Text style={[styles.inputLabel, { marginTop: 16 }]}>Preferred Contact Method</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={grievanceData.contactMethod}
              onValueChange={(value) => handleInputChange('contactMethod', value)}
              style={styles.picker}
              accessibilityLabel="Select preferred contact method"
            >
              {contactMethods.map((method) => (
                <Picker.Item 
                  key={method.value} 
                  label={method.label} 
                  value={method.value} 
                />
              ))}
            </Picker>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              (!isFormValid || submitting) && styles.submitButtonDisabled
            ]}
            onPress={handleSubmitGrievance}
            disabled={!isFormValid || submitting}
            accessibilityLabel="Submit grievance"
            accessibilityHint="Submit your privacy grievance form"
          >
            {submitting ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.surface} />
                <Text style={styles.loadingText}>Submitting...</Text>
              </View>
            ) : (
              <Text style={styles.submitButtonText}>Submit Grievance</Text>
            )}
          </TouchableOpacity>

          <Text style={[styles.explanatoryText, { textAlign: 'center', marginTop: 16, marginBottom: 0 }]}>
            * Required fields. We will respond within 48 hours via your preferred contact method.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default GrievanceFormScreen;