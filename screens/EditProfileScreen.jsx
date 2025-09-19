import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useAuth } from '../context/AuthContext';
import { validateTouristRegistration } from '../utils/touristValidation';
import { SUPPORTED_LANGUAGES } from '../utils/constants';
import TouristProfile from '../components/identity/TouristProfile';
import LoadingIndicator from '../components/LoadingIndicator';
import ErrorText from '../components/ErrorText';

const EditProfileScreen = ({ navigation }) => {
  const { profile, updateProfile } = useAuth();
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        nationality: profile.nationality || '',
        passportNumber: profile.passportNumber || '',
        phoneNumber: profile.phoneNumber || '',
        emergencyContacts: profile.emergencyContacts || [],
        medicalInfo: profile.medicalInfo || {
          allergies: '',
          medications: '',
          conditions: '',
          bloodType: ''
        },
        preferences: profile.preferences || {
          language: 'en',
          accessibility: {
            highContrast: false,
            fontSize: 'medium',
            voiceOver: false
          }
        }
      });
    }
  }, [profile]);

  const updateFormData = (field, value) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      setHasChanges(true);
      return newData;
    });
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  const updateNestedFormData = (parentField, childField, value) => {
    setFormData(prev => {
      const newData = {
        ...prev,
        [parentField]: {
          ...prev[parentField],
          [childField]: value
        }
      };
      setHasChanges(true);
      return newData;
    });
  };

  const updateEmergencyContact = (index, field, value) => {
    const updatedContacts = [...formData.emergencyContacts];
    updatedContacts[index] = {
      ...updatedContacts[index],
      [field]: value
    };
    
    setFormData(prev => ({
      ...prev,
      emergencyContacts: updatedContacts
    }));
    setHasChanges(true);
  };

  const addEmergencyContact = () => {
    setFormData(prev => ({
      ...prev,
      emergencyContacts: [
        ...prev.emergencyContacts,
        {
          id: Date.now().toString(),
          name: '',
          phoneNumber: '',
          relationship: '',
          isPrimary: false,
          photoUrl: null
        }
      ]
    }));
    setHasChanges(true);
  };

  const removeEmergencyContact = (index) => {
    if (formData.emergencyContacts.length > 1) {
      const updatedContacts = formData.emergencyContacts.filter((_, i) => i !== index);
      setFormData(prev => ({
        ...prev,
        emergencyContacts: updatedContacts
      }));
      setHasChanges(true);
    } else {
      Alert.alert('Error', 'You must have at least one emergency contact.');
    }
  };

  const validateForm = () => {
    const validation = validateTouristRegistration({
      ...formData,
      email: profile.email // Include email for validation but don't allow editing
    });
    
    setErrors(validation.errors);
    return validation.isValid;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fix the errors and try again.');
      return;
    }

    setLoading(true);
    try {
      await updateProfile(formData);
      setHasChanges(false);
      Alert.alert(
        'Success',
        'Profile updated successfully!',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (hasChanges) {
      Alert.alert(
        'Unsaved Changes',
        'You have unsaved changes. Are you sure you want to go back?',
        [
          { text: 'Stay', style: 'cancel' },
          { text: 'Discard', onPress: () => navigation.goBack() }
        ]
      );
    } else {
      navigation.goBack();
    }
  };

  const renderEmergencyContacts = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Emergency Contacts</Text>
      
      {formData.emergencyContacts?.map((contact, index) => (
        <View key={index} style={styles.contactContainer}>
          <View style={styles.contactHeader}>
            <Text style={styles.contactTitle}>
              Contact {index + 1} {contact.isPrimary && '(Primary)'}
            </Text>
            {formData.emergencyContacts.length > 1 && (
              <TouchableOpacity
                onPress={() => removeEmergencyContact(index)}
                style={styles.removeButton}
              >
                <Text style={styles.removeButtonText}>Remove</Text>
              </TouchableOpacity>
            )}
          </View>
          
          <TextInput
            style={styles.input}
            placeholder="Contact Name"
            value={contact.name}
            onChangeText={(value) => updateEmergencyContact(index, 'name', value)}
            autoCapitalize="words"
          />
          
          <TextInput
            style={styles.input}
            placeholder="Phone Number"
            value={contact.phoneNumber}
            onChangeText={(value) => updateEmergencyContact(index, 'phoneNumber', value)}
            keyboardType="phone-pad"
          />
          
          <TextInput
            style={styles.input}
            placeholder="Relationship"
            value={contact.relationship}
            onChangeText={(value) => updateEmergencyContact(index, 'relationship', value)}
            autoCapitalize="words"
          />
        </View>
      ))}
      
      <TouchableOpacity
        style={styles.addContactButton}
        onPress={addEmergencyContact}
      >
        <Text style={styles.addContactText}>+ Add Emergency Contact</Text>
      </TouchableOpacity>
    </View>
  );

  const renderMedicalInfo = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Medical Information</Text>
      <Text style={styles.sectionSubtitle}>
        This information will be available to emergency responders
      </Text>
      
      <TextInput
        style={styles.input}
        placeholder="Blood Type (e.g., A+, O-, AB+)"
        value={formData.medicalInfo?.bloodType}
        onChangeText={(value) => updateNestedFormData('medicalInfo', 'bloodType', value.toUpperCase())}
        autoCapitalize="characters"
      />
      
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Allergies"
        value={formData.medicalInfo?.allergies}
        onChangeText={(value) => updateNestedFormData('medicalInfo', 'allergies', value)}
        multiline
        numberOfLines={3}
      />
      
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Current Medications"
        value={formData.medicalInfo?.medications}
        onChangeText={(value) => updateNestedFormData('medicalInfo', 'medications', value)}
        multiline
        numberOfLines={3}
      />
      
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Medical Conditions"
        value={formData.medicalInfo?.conditions}
        onChangeText={(value) => updateNestedFormData('medicalInfo', 'conditions', value)}
        multiline
        numberOfLines={3}
      />
    </View>
  );

  const renderPreferences = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Preferences</Text>
      
      <Text style={styles.fieldLabel}>Language</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={formData.preferences?.language}
          onValueChange={(value) => updateNestedFormData('preferences', 'language', value)}
          style={styles.picker}
        >
          {SUPPORTED_LANGUAGES.map((lang) => (
            <Picker.Item
              key={lang.code}
              label={`${lang.name} (${lang.nativeName})`}
              value={lang.code}
            />
          ))}
        </Picker>
      </View>
    </View>
  );

  if (!profile) {
    return <LoadingIndicator />;
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Edit Profile</Text>
          <TouristProfile 
            editable={true}
            showVerificationBadge={true}
          />
        </View>

        <View style={styles.form}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Information</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              value={formData.name}
              onChangeText={(value) => updateFormData('name', value)}
              autoCapitalize="words"
            />
            
            <TextInput
              style={styles.input}
              placeholder="Nationality"
              value={formData.nationality}
              onChangeText={(value) => updateFormData('nationality', value)}
              autoCapitalize="words"
            />
            <ErrorText error={errors.nationality} />
            
            <TextInput
              style={styles.input}
              placeholder="Passport Number"
              value={formData.passportNumber}
              onChangeText={(value) => updateFormData('passportNumber', value.toUpperCase())}
              autoCapitalize="characters"
            />
            <ErrorText error={errors.passportNumber} />
            
            <TextInput
              style={styles.input}
              placeholder="Phone Number"
              value={formData.phoneNumber}
              onChangeText={(value) => updateFormData('phoneNumber', value)}
              keyboardType="phone-pad"
            />
            <ErrorText error={errors.phoneNumber} />
          </View>

          {renderEmergencyContacts()}
          {renderMedicalInfo()}
          {renderPreferences()}
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={handleCancel}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, styles.saveButton]}
            onPress={handleSave}
            disabled={loading || !hasChanges}
          >
            <Text style={styles.saveButtonText}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {loading && <LoadingIndicator />}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  form: {
    padding: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 5,
    color: '#333',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 10,
    fontSize: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: 15,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 10,
  },
  picker: {
    height: 50,
  },
  contactContainer: {
    backgroundColor: '#f8f8f8',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  contactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  removeButton: {
    backgroundColor: '#ff3b30',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 12,
  },
  addContactButton: {
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  addContactText: {
    color: '#f4511e',
    fontWeight: 'bold',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 0,
  },
  button: {
    flex: 1,
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: '#f4511e',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default EditProfileScreen;