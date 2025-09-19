import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  Alert 
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { signOutUser } from '../utils/firebaseHelpers';
import TouristProfile from '../components/identity/TouristProfile';
import EmergencyContacts from '../components/safety/EmergencyContacts';

const ProfileScreen = ({ navigation }) => {
  const { user, profile, isVerifiedTourist, hasCompleteTouristProfile } = useAuth();

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOutUser();
            } catch (error) {
              console.error('Sign out error:', error);
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleEditProfile = () => {
    navigation.navigate('EditProfile');
  };

  const renderVerificationStatus = () => {
    if (!hasCompleteTouristProfile()) {
      return (
        <View style={styles.warningCard}>
          <Text style={styles.warningTitle}>Complete Your Profile</Text>
          <Text style={styles.warningText}>
            Please complete your tourist profile to access all safety features.
          </Text>
          <TouchableOpacity 
            style={styles.warningButton}
            onPress={handleEditProfile}
          >
            <Text style={styles.warningButtonText}>Complete Profile</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (!isVerifiedTourist()) {
      return (
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Verification Pending</Text>
          <Text style={styles.infoText}>
            Your tourist verification is being processed. You can still use basic safety features.
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.successCard}>
        <Text style={styles.successTitle}>Verified Tourist</Text>
        <Text style={styles.successText}>
          Your account is verified. You have access to all safety features.
        </Text>
      </View>
    );
  };

  const renderProfileActions = () => (
    <View style={styles.actionsSection}>
      <TouchableOpacity 
        style={styles.actionButton}
        onPress={handleEditProfile}
      >
        <Text style={styles.actionButtonText}>✏️ Edit Profile</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.actionButton}
        onPress={() => navigation.navigate('QRCode')}
      >
        <Text style={styles.actionButtonText}>📱 My QR Code</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.actionButton}
        onPress={() => navigation.navigate('Privacy')}
      >
        <Text style={styles.actionButtonText}>🔒 Privacy & Data Protection</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.actionButton}
        onPress={() => navigation.navigate('Accessibility')}
      >
        <Text style={styles.actionButtonText}>♿ Accessibility</Text>
      </TouchableOpacity>
    </View>
  );

  const renderProfileDetails = () => (
    <View style={styles.detailsSection}>
      <Text style={styles.sectionTitle}>Profile Details</Text>
      
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Email:</Text>
        <Text style={styles.detailValue}>{user?.email}</Text>
      </View>
      
      {profile?.nationality && (
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Nationality:</Text>
          <Text style={styles.detailValue}>{profile.nationality}</Text>
        </View>
      )}
      
      {profile?.passportNumber && (
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Passport:</Text>
          <Text style={styles.detailValue}>{profile.passportNumber}</Text>
        </View>
      )}
      
      {profile?.phoneNumber && (
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Phone:</Text>
          <Text style={styles.detailValue}>{profile.phoneNumber}</Text>
        </View>
      )}
    </View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>My Profile</Text>
      </View>

      <TouristProfile 
        editable={false}
        showVerificationBadge={true}
      />

      {renderVerificationStatus()}
      {renderProfileActions()}
      {renderProfileDetails()}

      {profile?.emergencyContacts && profile.emergencyContacts.length > 0 && (
        <View style={styles.emergencySection}>
          <Text style={styles.sectionTitle}>Emergency Contacts</Text>
          <EmergencyContacts 
            editable={false}
            showCallButtons={true}
          />
        </View>
      )}

      <View style={styles.buttonSection}>
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#333',
  },
  warningCard: {
    margin: 20,
    padding: 15,
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#ff9500',
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 5,
  },
  warningText: {
    fontSize: 14,
    color: '#856404',
    marginBottom: 10,
  },
  warningButton: {
    backgroundColor: '#ff9500',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  warningButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  infoCard: {
    margin: 20,
    padding: 15,
    backgroundColor: '#d1ecf1',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#17a2b8',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0c5460',
    marginBottom: 5,
  },
  infoText: {
    fontSize: 14,
    color: '#0c5460',
  },
  successCard: {
    margin: 20,
    padding: 15,
    backgroundColor: '#d4edda',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#34c759',
  },
  successTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#155724',
    marginBottom: 5,
  },
  successText: {
    fontSize: 14,
    color: '#155724',
  },
  actionsSection: {
    margin: 20,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
  },
  actionButton: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  actionButtonText: {
    fontSize: 16,
    color: '#333',
  },
  detailsSection: {
    margin: 20,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    textAlign: 'right',
  },
  emergencySection: {
    margin: 20,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
  },
  buttonSection: {
    padding: 20,
  },
  signOutButton: {
    backgroundColor: '#ff3b30',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  signOutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ProfileScreen;