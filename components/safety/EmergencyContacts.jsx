import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  Linking,
  Image,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';
import { useLocation } from '../../context/LocationContext';
import { useSafety } from '../../context/SafetyContext';
import { uploadEmergencyContactPhoto } from '../../services/firebase/storage';
import { validateEmergencyContact } from '../../utils/touristValidation';
import { emergencyAlertService } from '../../services/emergency/alertService';

const EmergencyContacts = ({ 
  editable = false, 
  onContactPress = null,
  showCallButtons = true,
  showLocationShare = false,
  showMessageTemplates = false 
}) => {
  const { profile, updateProfile } = useAuth();
  const { currentLocation } = useLocation();
  const { isEmergencyActive } = useSafety();
  const [uploading, setUploading] = useState({});
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState('custom');
  const [customMessage, setCustomMessage] = useState('');

  const handleCall = (phoneNumber, contactName) => {
    Alert.alert(
      'Call Emergency Contact',
      `Do you want to call ${contactName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call',
          onPress: () => {
            const url = `tel:${phoneNumber}`;
            Linking.canOpenURL(url)
              .then((supported) => {
                if (supported) {
                  return Linking.openURL(url);
                } else {
                  Alert.alert('Error', 'Phone calls are not supported on this device');
                }
              })
              .catch((err) => {
                console.error('Error making phone call:', err);
                Alert.alert('Error', 'Failed to make phone call');
              });
          }
        }
      ]
    );
  };

  const handleShareLocation = async (contact) => {
    if (!currentLocation) {
      Alert.alert(
        'Location Required',
        'Location access is required to share your location. Please enable location services.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Share Location',
      `Share your current location with ${contact.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Share',
          onPress: () => sendLocationToContact(contact)
        }
      ]
    );
  };

  const sendLocationToContact = async (contact) => {
    try {
      const locationMessage = `📍 My current location: ${currentLocation.latitude}, ${currentLocation.longitude}\n\nView on map: https://maps.google.com/?q=${currentLocation.latitude},${currentLocation.longitude}\n\nSent from Tourist Safety App at ${new Date().toLocaleString()}`;
      
      const result = await emergencyAlertService.sendEmergencyAlert(
        currentLocation,
        profile,
        [contact],
        locationMessage
      );

      if (result.success) {
        Alert.alert('Success', `Location shared with ${contact.name}`);
      } else {
        Alert.alert('Error', result.error || 'Failed to share location');
      }
    } catch (error) {
      console.error('Error sharing location:', error);
      Alert.alert('Error', 'Failed to share location');
    }
  };

  const handleSendMessage = (contact) => {
    setSelectedContact(contact);
    setShowMessageModal(true);
  };

  const sendMessageToContact = async () => {
    if (!selectedContact) return;

    const messageTemplates = emergencyAlertService.getMessageTemplates();
    let messageToSend = customMessage;

    if (selectedTemplate !== 'custom') {
      messageToSend = messageTemplates[selectedTemplate];
    }

    if (!messageToSend.trim()) {
      Alert.alert('Error', 'Please enter a message or select a template');
      return;
    }

    try {
      const result = await emergencyAlertService.sendEmergencyAlert(
        currentLocation,
        profile,
        [selectedContact],
        messageToSend
      );

      if (result.success) {
        Alert.alert('Success', `Message sent to ${selectedContact.name}`);
        setShowMessageModal(false);
        setCustomMessage('');
        setSelectedTemplate('custom');
      } else {
        Alert.alert('Error', result.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
    }
  };

  const handleImagePicker = async (contactIndex) => {
    if (!editable) return;

    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert(
          'Permission Required',
          'Permission to access camera roll is required to upload contact photo.'
        );
        return;
      }

      Alert.alert(
        'Select Photo',
        'Choose how you want to select the contact photo',
        [
          {
            text: 'Camera',
            onPress: () => openCamera(contactIndex),
          },
          {
            text: 'Photo Library',
            onPress: () => openImageLibrary(contactIndex),
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ]
      );
    } catch (error) {
      console.error('Error requesting permission:', error);
      Alert.alert('Error', 'Failed to request permission');
    }
  };

  const openCamera = async (contactIndex) => {
    try {
      const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
      
      if (cameraPermission.granted === false) {
        Alert.alert(
          'Permission Required',
          'Permission to access camera is required to take photos.'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadContactImage(result.assets[0].uri, contactIndex);
      }
    } catch (error) {
      console.error('Error opening camera:', error);
      Alert.alert('Error', 'Failed to open camera');
    }
  };

  const openImageLibrary = async (contactIndex) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadContactImage(result.assets[0].uri, contactIndex);
      }
    } catch (error) {
      console.error('Error opening image library:', error);
      Alert.alert('Error', 'Failed to open image library');
    }
  };

  const uploadContactImage = async (imageUri, contactIndex) => {
    setUploading(prev => ({ ...prev, [contactIndex]: true }));
    
    try {
      const contactId = profile.emergencyContacts[contactIndex].id || `contact_${contactIndex}`;
      const imageUrl = await uploadEmergencyContactPhoto(imageUri, profile.id, contactId);
      
      const updatedContacts = [...profile.emergencyContacts];
      updatedContacts[contactIndex] = {
        ...updatedContacts[contactIndex],
        photoUrl: imageUrl
      };
      
      await updateProfile({
        emergencyContacts: updatedContacts
      });

      Alert.alert('Success', 'Contact photo updated successfully');
    } catch (error) {
      console.error('Error uploading contact image:', error);
      Alert.alert('Error', 'Failed to upload contact photo');
    } finally {
      setUploading(prev => ({ ...prev, [contactIndex]: false }));
    }
  };

  const deleteContact = (contactIndex) => {
    if (profile.emergencyContacts.length <= 1) {
      Alert.alert('Error', 'You must have at least one emergency contact.');
      return;
    }

    Alert.alert(
      'Delete Contact',
      'Are you sure you want to delete this emergency contact?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const updatedContacts = profile.emergencyContacts.filter((_, index) => index !== contactIndex);
              await updateProfile({
                emergencyContacts: updatedContacts
              });
              Alert.alert('Success', 'Emergency contact deleted successfully');
            } catch (error) {
              console.error('Error deleting contact:', error);
              Alert.alert('Error', 'Failed to delete emergency contact');
            }
          }
        }
      ]
    );
  };

  const getContactInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(n => n.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const renderContactImage = (contact, index) => {
    if (contact.photoUrl) {
      return (
        <Image
          source={{ uri: contact.photoUrl }}
          style={styles.contactImage}
          resizeMode="cover"
        />
      );
    }

    return (
      <View style={styles.contactImagePlaceholder}>
        <Text style={styles.contactInitials}>
          {getContactInitials(contact.name)}
        </Text>
      </View>
    );
  };

  const renderContact = ({ item: contact, index }) => (
    <View style={styles.contactCard}>
      <TouchableOpacity
        style={styles.contactImageContainer}
        onPress={() => editable && handleImagePicker(index)}
        disabled={uploading[index]}
      >
        {renderContactImage(contact, index)}
        {editable && (
          <View style={styles.editImageOverlay}>
            <Text style={styles.editImageText}>
              {uploading[index] ? '...' : 'Edit'}
            </Text>
          </View>
        )}
        {contact.isPrimary && (
          <View style={styles.primaryBadge}>
            <Text style={styles.primaryBadgeText}>1</Text>
          </View>
        )}
      </TouchableOpacity>

      <View style={styles.contactInfo}>
        <Text style={styles.contactName}>{contact.name || 'Unnamed Contact'}</Text>
        <Text style={styles.contactRelationship}>{contact.relationship}</Text>
        <Text style={styles.contactPhone}>{contact.phoneNumber}</Text>
      </View>

      <View style={styles.contactActions}>
        {showCallButtons && (
          <TouchableOpacity
            style={styles.callButton}
            onPress={() => handleCall(contact.phoneNumber, contact.name)}
          >
            <Text style={styles.callButtonText}>📞</Text>
          </TouchableOpacity>
        )}
        
        {showLocationShare && (
          <TouchableOpacity
            style={styles.locationButton}
            onPress={() => handleShareLocation(contact)}
          >
            <Text style={styles.locationButtonText}>📍</Text>
          </TouchableOpacity>
        )}
        
        {showMessageTemplates && (
          <TouchableOpacity
            style={styles.messageButton}
            onPress={() => handleSendMessage(contact)}
          >
            <Text style={styles.messageButtonText}>💬</Text>
          </TouchableOpacity>
        )}
        
        {editable && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => deleteContact(index)}
          >
            <Text style={styles.deleteButtonText}>🗑️</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateText}>No emergency contacts added yet</Text>
      {editable && (
        <Text style={styles.emptyStateSubtext}>
          Add emergency contacts to ensure help can reach you quickly
        </Text>
      )}
    </View>
  );

  if (!profile?.emergencyContacts || profile.emergencyContacts.length === 0) {
    return renderEmptyState();
  }

  const renderMessageModal = () => {
    const messageTemplates = emergencyAlertService.getMessageTemplates();
    
    return (
      <Modal
        visible={showMessageModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowMessageModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              Send Message to {selectedContact?.name}
            </Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowMessageModal(false)}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <Text style={styles.sectionTitle}>Message Templates</Text>
            
            {Object.entries(messageTemplates).map(([key, message]) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.templateOption,
                  selectedTemplate === key && styles.selectedTemplateOption
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
                <Text style={styles.templateText}>{message}</Text>
              </TouchableOpacity>
            ))}
            
            <Text style={styles.sectionTitle}>Custom Message</Text>
            <TextInput
              style={styles.customMessageInput}
              placeholder="Enter your custom message..."
              multiline
              numberOfLines={4}
              value={customMessage}
              onChangeText={setCustomMessage}
              textAlignVertical="top"
            />
          </ScrollView>
          
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.sendButton}
              onPress={sendMessageToContact}
            >
              <Text style={styles.sendButtonText}>Send Message</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={profile.emergencyContacts}
        renderItem={renderContact}
        keyExtractor={(item, index) => item.id || index.toString()}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
      {renderMessageModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  contactImageContainer: {
    position: 'relative',
    marginRight: 15,
  },
  contactImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  contactImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f4511e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactInitials: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  editImageOverlay: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editImageText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: 'bold',
  },
  primaryBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#34C759',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  primaryBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  contactRelationship: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  contactPhone: {
    fontSize: 14,
    color: '#f4511e',
    fontWeight: '500',
  },
  contactActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  callButton: {
    backgroundColor: '#34C759',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  callButtonText: {
    fontSize: 18,
  },
  locationButton: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  locationButtonText: {
    fontSize: 16,
  },
  messageButton: {
    backgroundColor: '#FF9500',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  messageButtonText: {
    fontSize: 16,
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 16,
  },
  separator: {
    height: 10,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    textAlign: 'center',
    marginBottom: 10,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#666',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    marginTop: 10,
  },
  templateOption: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedTemplateOption: {
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
  templateText: {
    fontSize: 12,
    color: '#666',
  },
  customMessageInput: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#333',
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  sendButton: {
    backgroundColor: '#f4511e',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default EmergencyContacts;