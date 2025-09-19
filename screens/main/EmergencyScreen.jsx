import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Linking,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useSafety } from '../../context/SafetyContext';
import { useLocation } from '../../context/LocationContext';
import { useAuth } from '../../context/AuthContext';
import PanicButton from '../../components/safety/PanicButton';
import EmergencyContacts from '../../components/safety/EmergencyContacts';
import { emergencyAlertService } from '../../services/emergency/alertService';
import { EMERGENCY_NUMBERS } from '../../utils/constants';

const EmergencyScreen = ({ navigation }) => {
  const { profile } = useAuth();
  const { panicMode, isEmergencyActive, deactivatePanicMode } = useSafety();
  const { currentLocation } = useLocation();
  const [selectedTemplate, setSelectedTemplate] = useState('custom');

  const emergencyServices = [
    {
      id: 'police',
      name: 'Police',
      number: EMERGENCY_NUMBERS.POLICE,
      icon: '🚔',
      color: '#007AFF',
      description: 'For crimes, accidents, and immediate danger'
    },
    {
      id: 'medical',
      name: 'Medical Emergency',
      number: EMERGENCY_NUMBERS.MEDICAL,
      icon: '🚑',
      color: '#FF3B30',
      description: 'For medical emergencies and ambulance'
    },
    {
      id: 'fire',
      name: 'Fire Department',
      number: EMERGENCY_NUMBERS.FIRE,
      icon: '🚒',
      color: '#FF9500',
      description: 'For fires and rescue operations'
    },
    {
      id: 'tourist',
      name: 'Tourist Helpline',
      number: EMERGENCY_NUMBERS.TOURIST_HELPLINE,
      icon: '🏛️',
      color: '#34C759',
      description: 'For tourist-related assistance and information'
    },
    {
      id: 'women',
      name: 'Women Helpline',
      number: EMERGENCY_NUMBERS.WOMEN_HELPLINE,
      icon: '👩',
      color: '#AF52DE',
      description: 'For women in distress and safety issues'
    },
    {
      id: 'child',
      name: 'Child Helpline',
      number: EMERGENCY_NUMBERS.CHILD_HELPLINE,
      icon: '👶',
      color: '#FF2D92',
      description: 'For child safety and protection'
    }
  ];

  const messageTemplates = emergencyAlertService.getMessageTemplates();

  useEffect(() => {
    // Set status bar to red when in emergency mode
    if (panicMode) {
      StatusBar.setBackgroundColor('#FF3B30', true);
    } else {
      StatusBar.setBackgroundColor('#f4511e', true);
    }
  }, [panicMode]);

  const handleEmergencyCall = (service) => {
    Alert.alert(
      `Call ${service.name}`,
      `Do you want to call ${service.name} (${service.number})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call Now',
          style: 'destructive',
          onPress: () => makeEmergencyCall(service.number, service.name)
        }
      ]
    );
  };

  const makeEmergencyCall = async (number, serviceName) => {
    try {
      const result = await emergencyAlertService.makeEmergencyCall(number);
      
      if (!result.success) {
        Alert.alert('Error', result.error || 'Failed to make emergency call');
      }
    } catch (error) {
      console.error('Error making emergency call:', error);
      Alert.alert('Error', 'Failed to make emergency call');
    }
  };

  const handleSendCustomAlert = () => {
    if (!profile?.emergencyContacts || profile.emergencyContacts.length === 0) {
      Alert.alert(
        'No Emergency Contacts',
        'Please add emergency contacts in your profile before sending alerts.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Add Contacts', onPress: () => navigation.navigate('Profile') }
        ]
      );
      return;
    }

    if (!currentLocation) {
      Alert.alert(
        'Location Required',
        'Location access is required to send emergency alerts. Please enable location services.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Send Emergency Alert',
      `Send "${messageTemplates[selectedTemplate]}" to your emergency contacts?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Alert',
          style: 'destructive',
          onPress: sendCustomEmergencyAlert
        }
      ]
    );
  };

  const sendCustomEmergencyAlert = async () => {
    try {
      const customMessage = messageTemplates[selectedTemplate];
      
      const result = await emergencyAlertService.sendEmergencyAlert(
        currentLocation,
        profile,
        profile.emergencyContacts,
        customMessage
      );

      if (result.success) {
        Alert.alert(
          'Alert Sent',
          'Emergency alert has been sent to your contacts with your current location.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to send emergency alert');
      }
    } catch (error) {
      console.error('Error sending custom alert:', error);
      Alert.alert('Error', 'Failed to send emergency alert');
    }
  };

  const handleDeactivateEmergency = () => {
    Alert.alert(
      'Deactivate Emergency',
      'Are you sure you want to deactivate emergency mode?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: deactivatePanicMode
        }
      ]
    );
  };

  const renderEmergencyService = (service) => (
    <TouchableOpacity
      key={service.id}
      style={[styles.serviceCard, { borderLeftColor: service.color }]}
      onPress={() => handleEmergencyCall(service)}
    >
      <View style={styles.serviceHeader}>
        <Text style={styles.serviceIcon}>{service.icon}</Text>
        <View style={styles.serviceInfo}>
          <Text style={styles.serviceName}>{service.name}</Text>
          <Text style={styles.serviceNumber}>{service.number}</Text>
        </View>
        <TouchableOpacity
          style={[styles.callButton, { backgroundColor: service.color }]}
          onPress={() => handleEmergencyCall(service)}
        >
          <Text style={styles.callButtonText}>📞</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.serviceDescription}>{service.description}</Text>
    </TouchableOpacity>
  );

  const renderMessageTemplate = (key, message) => (
    <TouchableOpacity
      key={key}
      style={[
        styles.templateCard,
        selectedTemplate === key && styles.selectedTemplate
      ]}
      onPress={() => setSelectedTemplate(key)}
    >
      <View style={styles.templateHeader}>
        <Text style={styles.templateTitle}>
          {key.charAt(0).toUpperCase() + key.slice(1)} Emergency
        </Text>
        {selectedTemplate === key && (
          <Text style={styles.selectedIndicator}>✓</Text>
        )}
      </View>
      <Text style={styles.templateMessage} numberOfLines={2}>
        {message}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, panicMode && styles.emergencyContainer]}>
      <StatusBar 
        backgroundColor={panicMode ? '#FF3B30' : '#f4511e'} 
        barStyle="light-content" 
      />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Emergency Status Header */}
        {panicMode && (
          <View style={styles.emergencyHeader}>
            <Text style={styles.emergencyTitle}>🚨 EMERGENCY ACTIVE</Text>
            <Text style={styles.emergencySubtitle}>
              Your emergency contacts have been notified
            </Text>
            <TouchableOpacity
              style={styles.deactivateButton}
              onPress={handleDeactivateEmergency}
            >
              <Text style={styles.deactivateButtonText}>Deactivate Emergency</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Panic Button Section */}
        <View style={styles.panicSection}>
          <Text style={styles.sectionTitle}>Emergency Panic Button</Text>
          <Text style={styles.sectionDescription}>
            Press and hold for 3 seconds to send emergency alert to your contacts
          </Text>
          <PanicButton size="large" style={styles.panicButton} />
        </View>

        {/* Emergency Services Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Emergency Services</Text>
          <Text style={styles.sectionDescription}>
            Quick access to local emergency numbers
          </Text>
          {emergencyServices.map(renderEmergencyService)}
        </View>

        {/* Custom Alert Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Send Custom Alert</Text>
          <Text style={styles.sectionDescription}>
            Send a specific emergency message to your contacts
          </Text>
          
          <View style={styles.templatesContainer}>
            {Object.entries(messageTemplates).map(([key, message]) =>
              renderMessageTemplate(key, message)
            )}
          </View>
          
          <TouchableOpacity
            style={styles.sendAlertButton}
            onPress={handleSendCustomAlert}
          >
            <Text style={styles.sendAlertButtonText}>Send Selected Alert</Text>
          </TouchableOpacity>
        </View>

        {/* Emergency Contacts Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Emergency Contacts</Text>
          <Text style={styles.sectionDescription}>
            Quick dial your emergency contacts
          </Text>
          <EmergencyContacts 
            editable={false}
            showCallButtons={true}
            showLocationShare={true}
            showMessageTemplates={true}
          />
        </View>

        {/* Location Information */}
        {currentLocation && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Current Location</Text>
            <View style={styles.locationCard}>
              <Text style={styles.locationText}>
                📍 {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
              </Text>
              {currentLocation.address && (
                <Text style={styles.addressText}>{currentLocation.address}</Text>
              )}
              <TouchableOpacity
                style={styles.mapButton}
                onPress={() => {
                  const url = `https://maps.google.com/?q=${currentLocation.latitude},${currentLocation.longitude}`;
                  Linking.openURL(url);
                }}
              >
                <Text style={styles.mapButtonText}>View on Map</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  emergencyContainer: {
    backgroundColor: '#ffebee',
  },
  scrollView: {
    flex: 1,
  },
  emergencyHeader: {
    backgroundColor: '#FF3B30',
    padding: 20,
    alignItems: 'center',
  },
  emergencyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  emergencySubtitle: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 15,
  },
  deactivateButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#fff',
  },
  deactivateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  panicSection: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  section: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  panicButton: {
    marginTop: 10,
  },
  serviceCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    borderLeftWidth: 4,
  },
  serviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  serviceIcon: {
    fontSize: 24,
    marginRight: 15,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  serviceNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f4511e',
  },
  callButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  callButtonText: {
    fontSize: 18,
  },
  serviceDescription: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  templatesContainer: {
    marginBottom: 15,
  },
  templateCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedTemplate: {
    borderColor: '#f4511e',
    backgroundColor: '#fff5f5',
  },
  templateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  templateTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  selectedIndicator: {
    color: '#f4511e',
    fontSize: 16,
    fontWeight: 'bold',
  },
  templateMessage: {
    fontSize: 12,
    color: '#666',
  },
  sendAlertButton: {
    backgroundColor: '#FF9500',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
  },
  sendAlertButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  locationCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 15,
  },
  locationText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  addressText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 10,
  },
  mapButton: {
    backgroundColor: '#007AFF',
    borderRadius: 6,
    padding: 8,
    alignItems: 'center',
  },
  mapButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default EmergencyScreen;