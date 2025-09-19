import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../../firebaseConfig';

// Upload profile image
export const uploadProfileImage = async (imageUri, userId) => {
  try {
    // Create a reference to the file location
    const imageRef = ref(storage, `profile-images/${userId}/${Date.now()}.jpg`);
    
    // Convert image URI to blob
    const response = await fetch(imageUri);
    const blob = await response.blob();
    
    // Upload the file
    const snapshot = await uploadBytes(imageRef, blob);
    
    // Get the download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return downloadURL;
  } catch (error) {
    console.error('Error uploading profile image:', error);
    throw new Error('Failed to upload profile image');
  }
};

// Upload emergency contact photo
export const uploadEmergencyContactPhoto = async (imageUri, userId, contactId) => {
  try {
    const imageRef = ref(storage, `emergency-contacts/${userId}/${contactId}/${Date.now()}.jpg`);
    
    const response = await fetch(imageUri);
    const blob = await response.blob();
    
    const snapshot = await uploadBytes(imageRef, blob);
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return downloadURL;
  } catch (error) {
    console.error('Error uploading emergency contact photo:', error);
    throw new Error('Failed to upload contact photo');
  }
};

// Upload verification documents
export const uploadVerificationDocument = async (imageUri, userId, documentType) => {
  try {
    const imageRef = ref(storage, `verification-documents/${userId}/${documentType}/${Date.now()}.jpg`);
    
    const response = await fetch(imageUri);
    const blob = await response.blob();
    
    const snapshot = await uploadBytes(imageRef, blob);
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return downloadURL;
  } catch (error) {
    console.error('Error uploading verification document:', error);
    throw new Error('Failed to upload verification document');
  }
};

// Delete image from storage
export const deleteImage = async (imageUrl) => {
  try {
    const imageRef = ref(storage, imageUrl);
    await deleteObject(imageRef);
  } catch (error) {
    console.error('Error deleting image:', error);
    throw new Error('Failed to delete image');
  }
};

// Get image download URL
export const getImageDownloadURL = async (imagePath) => {
  try {
    const imageRef = ref(storage, imagePath);
    const downloadURL = await getDownloadURL(imageRef);
    return downloadURL;
  } catch (error) {
    console.error('Error getting image download URL:', error);
    throw new Error('Failed to get image URL');
  }
};