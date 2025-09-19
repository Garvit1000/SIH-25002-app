import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { registerTouristUser } from '../utils/firebaseHelpers';
import { validateTouristRegistration, getDefaultTouristData } from '../utils/touristValidation';
import { SUPPORTED_LANGUAGES } from '../utils/constants';
import LoadingIndicator from '../components/LoadingIndicator';
import ErrorText from '../components/ErrorText';

const TouristRegisterScreen = ({ navigation }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    ...getDefaultTouristData()
  });
  
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;

  const updateFormData = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
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
  };

  const addEmergencyContact = () => {
    setFormData(prev => ({
      ...prev,
      emergencyContacts: [
        ...prev.emergencyContacts,
        {
          name: '',
          phoneNumber: '',
          relationship: '',
          isPrimary: false,
          photoUrl: null
        }
      ]
    }));
  };

  const removeEmergencyContact = (index) => {
    if (formData.emergencyContacts.length > 1) {
      const updatedContacts = formData.emergencyContacts.filter((_, i) => i !== index);
      setFormData(prev => ({
        ...prev,
        emergencyContacts: updatedContacts
      }));
    }
  };

  const validateCurrentStep = () => {
    const validation = validateTouristRegistration(formData);
    setErrors(validation.errors);
    
    switch (currentStep) {
      case 1:
        // Basic info validation
        return !validation.errors.email && 
               !validation.errors.password && 
               !validation.errors.nationality && 
               !validation.errors.passportNumber &&
               !validation.errors.phoneNumber &&
               formData.password === formData.confirmPassword;
      case 2:
        // Emergency contacts validation
        return !validation.errors.emergencyContacts && 
               !Object.keys(validation.errors).some(key => key.startsWith('emergencyContact_'));
      case 3:
        // Final validation
        return validation.isValid;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      if (currentStep < totalSteps) {
        setCurrentStep(currentStep + 1);
      } else {
        handleRegister();
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleRegister = async () => {
    const validation = validateTouristRegistration(formData);
    
    if (!validation.isValid) {
      setErrors(validation.errors);
      Alert.alert('Validation Error', 'Please fix the errors and try again.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setErrors({ confirmPassword: 'Passwords do not match' });
      return;
    }

    setLoading(true);
    try {
      await registerTouristUser(formData);
      Alert.alert(
        'Registration Successful',
        'Your account has been created successfully. You can now use the app.',
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
      );
    } catch (err) {
      setErrors({ general: err.message });
      Alert.alert('Registration Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[1, 2, 3].map((step) => (
        <View
          key={step}
          style={[
            styles.stepDot,
            currentStep >= step && styles.stepDotActive
          ]}
        >
          <Text style={[
            styles.stepText,
            currentStep >= step && styles.stepTextActive
          ]}>
            {step}
          </Text>
        </View>
      ))}
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Basic Information</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Full Name"
        value={formData.name}
        onChangeText={(value) => updateFormData('name', value)}
        autoCapitalize="words"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={formData.email}
        onChangeText={(value) => updateFormData('email', value)}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />
      <ErrorText error={errors.email} />

      <TextInput
        style={styles.input}
        placeholder="Password"
        value={formData.password}
        onChangeText={(value) => updateFormData('password', value)}
        secureTextEntry
        autoCapitalize="none"
      />
      <ErrorText error={errors.password} />

      <TextInput
        style={styles.input}
        placeholder="Confirm Password"
        value={formData.confirmPassword}
        onChangeText={(value) => updateFormData('confirmPassword', value)}
        secureTextEntry
        autoCapitalize="none"
      />
      <ErrorText error={errors.confirmPassword} />

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
        placeholder="Phone Number (with country code)"
        value={formData.phoneNumber}
        onChangeText={(value) => updateFormData('phoneNumber', value)}
        keyboardType="phone-pad"
      />
      <ErrorText error={errors.phoneNumber} />
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Emergency Contacts</Text>
      <Text style={styles.stepSubtitle}>
        Add at least one emergency contact who can be reached in case of emergency
      </Text>
      
      {formData.emergencyContacts.map((contact, index) => (
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
            placeholder="Relationship (e.g., Parent, Spouse, Friend)"
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
        <Text style={styles.addContactText}>+ Add Another Contact</Text>
      </TouchableOpacity>
      
      <ErrorText error={errors.emergencyContacts} />
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Preferences & Medical Info</Text>
      
      <Text style={styles.sectionTitle}>Language Preference</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={formData.preferences.language}
          onValueChange={(value) => updateFormData('preferences', {
            ...formData.preferences,
            language: value
          })}
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
      
      <Text style={styles.sectionTitle}>Medical Information (Optional)</Text>
      <Text style={styles.sectionSubtitle}>
        This information will be available to emergency responders
      </Text>
      
      <TextInput
        style={styles.input}
        placeholder="Blood Type (e.g., A+, O-, AB+)"
        value={formData.medicalInfo.bloodType}
        onChangeText={(value) => updateFormData('medicalInfo', {
          ...formData.medicalInfo,
          bloodType: value.toUpperCase()
        })}
        autoCapitalize="characters"
      />
      
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Allergies"
        value={formData.medicalInfo.allergies}
        onChangeText={(value) => updateFormData('medicalInfo', {
          ...formData.medicalInfo,
          allergies: value
        })}
        multiline
        numberOfLines={3}
      />
      
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Current Medications"
        value={formData.medicalInfo.medications}
        onChangeText={(value) => updateFormData('medicalInfo', {
          ...formData.medicalInfo,
          medications: value
        })}
        multiline
        numberOfLines={3}
      />
      
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Medical Conditions"
        value={formData.medicalInfo.conditions}
        onChangeText={(value) => updateFormData('medicalInfo', {
          ...formData.medicalInfo,
          conditions: value
        })}
        multiline
        numberOfLines={3}
      />
    </View>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      default:
        return renderStep1();
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Tourist Registration</Text>
          {renderStepIndicator()}
        </View>
        
        {renderCurrentStep()}
        
        <ErrorText error={errors.general} />
        
        <View style={styles.buttonContainer}>
          {currentStep > 1 && (
            <TouchableOpacity
              style={[styles.button, styles.backButton]}
              onPress={handleBack}
            >
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={[styles.button, styles.nextButton]}
            onPress={handleNext}
            disabled={loading}
          >
            <Text style={styles.nextButtonText}>
              {currentStep === totalSteps ? 'Register' : 'Next'}
            </Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.loginContainer}>
          <Text style={styles.loginText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.loginLink}>Sign In</Text>
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
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  stepDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  stepDotActive: {
    backgroundColor: '#f4511e',
  },
  stepText: {
    color: '#666',
    fontWeight: 'bold',
  },
  stepTextActive: {
    color: '#fff',
  },
  stepContainer: {
    padding: 20,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  stepSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 10,
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
    marginBottom: 10,
  },
  addContactText: {
    color: '#f4511e',
    fontWeight: 'bold',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
  },
  button: {
    flex: 1,
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 5,
  },
  backButton: {
    backgroundColor: '#f0f0f0',
  },
  backButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: 'bold',
  },
  nextButton: {
    backgroundColor: '#f4511e',
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 20,
  },
  loginText: {
    color: '#333',
  },
  loginLink: {
    color: '#f4511e',
    fontWeight: 'bold',
  },
});

export default TouristRegisterScreen;