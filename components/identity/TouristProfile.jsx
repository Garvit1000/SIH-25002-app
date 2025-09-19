import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';
import { uploadProfileImage } from '../../services/firebase/storage';
import VerificationBadge from './VerificationBadge';
import { VERIFICATION_STATUS } from '../../utils/constants';

const TouristProfile = ({ 
  editable = false, 
  showVerificationBadge = true,
  onProfileUpdate = null 
}) => {
  const { profile, updateProfile } = useAuth();
  const [uploading, setUploading] = useState(false);

  const handleImagePicker = async () => {
    if (!editable) return;

    try {
      // Request permission
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert(
          'Permission Required',
          'Permission to access camera roll is required to upload profile photo.'
        );
        return;
      }

      // Show action sheet for image source
      Alert.alert(
        'Select Photo',
        'Choose how you want to select your profile photo',
        [
          {
            text: 'Camera',
            onPress: () => openCamera(),
          },
          {
            text: 'Photo Library',
            onPress: () => openImageLibrary(),
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

  const openCamera = async () => {
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
        await uploadImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error opening camera:', error);
      Alert.alert('Error', 'Failed to open camera');
    }
  };

  const openImageLibrary = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error opening image library:', error);
      Alert.alert('Error', 'Failed to open image library');
    }
  };

  const uploadImage = async (imageUri) => {
    setUploading(true);
    try {
      const imageUrl = await uploadProfileImage(imageUri, profile.id);
      
      await updateProfile({
        profileImageUrl: imageUrl
      });

      if (onProfileUpdate) {
        onProfileUpdate({ profileImageUrl: imageUrl });
      }

      Alert.alert('Success', 'Profile photo updated successfully');
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', 'Failed to upload profile photo');
    } finally {
      setUploading(false);
    }
  };

  const getProfileImage = () => {
    if (profile?.profileImageUrl) {
      return { uri: profile.profileImageUrl };
    }
    return null; // Use initials instead of default image
  };

  const getInitials = () => {
    if (profile?.name) {
      return profile.name
        .split(' ')
        .map(name => name.charAt(0))
        .join('')
        .toUpperCase()
        .substring(0, 2);
    }
    return profile?.email?.charAt(0).toUpperCase() || '?';
  };

  const renderProfileImage = () => {
    if (profile?.profileImageUrl) {
      return (
        <Image
          source={{ uri: profile.profileImageUrl }}
          style={styles.profileImage}
          resizeMode="cover"
        />
      );
    }

    return (
      <View style={styles.initialsContainer}>
        <Text style={styles.initialsText}>{getInitials()}</Text>
      </View>
    );
  };

  const renderEditOverlay = () => {
    if (!editable) return null;

    return (
      <View style={styles.editOverlay}>
        {uploading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.editText}>Edit</Text>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.imageContainer}
        onPress={handleImagePicker}
        disabled={!editable || uploading}
        activeOpacity={editable ? 0.7 : 1}
      >
        {renderProfileImage()}
        {renderEditOverlay()}
        
        {showVerificationBadge && (
          <View style={styles.badgeContainer}>
            <VerificationBadge 
              status={profile?.verificationStatus || VERIFICATION_STATUS.PENDING}
              size="small"
            />
          </View>
        )}
      </TouchableOpacity>

      <View style={styles.profileInfo}>
        <Text style={styles.profileName}>
          {profile?.name || 'Tourist User'}
        </Text>
        
        <Text style={styles.profileDetails}>
          {profile?.nationality || 'Nationality not set'}
        </Text>
        
        {profile?.passportNumber && (
          <Text style={styles.profileDetails}>
            Passport: {profile.passportNumber}
          </Text>
        )}
        
        <View style={styles.verificationContainer}>
          <Text style={[
            styles.verificationText,
            styles[`verification${profile?.verificationStatus || 'pending'}`]
          ]}>
            {getVerificationStatusText(profile?.verificationStatus)}
          </Text>
        </View>
      </View>
    </View>
  );
};

const getVerificationStatusText = (status) => {
  switch (status) {
    case VERIFICATION_STATUS.VERIFIED:
      return 'Verified Tourist';
    case VERIFICATION_STATUS.REJECTED:
      return 'Verification Failed';
    case VERIFICATION_STATUS.PENDING:
    default:
      return 'Verification Pending';
  }
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 20,
  },
  imageContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#f4511e',
  },
  initialsContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f4511e',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#f4511e',
  },
  initialsText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
  },
  editOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  badgeContainer: {
    position: 'absolute',
    top: -5,
    right: -5,
  },
  profileInfo: {
    alignItems: 'center',
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  profileDetails: {
    fontSize: 16,
    color: '#666',
    marginBottom: 3,
  },
  verificationContainer: {
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    backgroundColor: '#f0f0f0',
  },
  verificationText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  verificationpending: {
    color: '#ff9500',
  },
  verificationverified: {
    color: '#34c759',
  },
  verificationrejected: {
    color: '#ff3b30',
  },
});

export default TouristProfile;