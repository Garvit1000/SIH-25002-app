import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { privacyService } from '../services/privacy/privacyService';
import { handleSafePermissionChange, getPermissionInfo } from '../utils/privacyHelpers';

const PrivacyScreen = ({ navigation }) => {
  const { colors, isDarkMode } = useTheme();
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [permissions, setPermissions] = useState({
    locationTracking: false,
    emergencyContacts: false,
    profileData: false,
    analyticsData: false,
    crashReports: false,
    marketingCommunications: false,
  });
  const [dataUsage, setDataUsage] = useState({
    locationDataPoints: 0,
    emergencyAlerts: 0,
    qrGenerations: 0,
    lastSyncDate: null,
  });

  useEffect(() => {
    loadPrivacySettings();
    loadDataUsageStats();
  }, []);

  const loadPrivacySettings = async () => {
    try {
      if (user) {
        const settings = await privacyService.getPrivacySettings(user.uid);
        setPermissions(settings);
      }
    } catch (error) {
      console.error('Error loading privacy settings:', error);
      Alert.alert('Error', 'Failed to load privacy settings');
    } finally {
      setLoading(false);
    }
  };

  const loadDataUsageStats = async () => {
    try {
      if (user) {
        const stats = await privacyService.getDataUsageStats(user.uid);
        setDataUsage(stats);
      }
    } catch (error) {
      console.error('Error loading data usage stats:', error);
    }
  };

  const handlePermissionChange = async (permission, value) => {
    setSaving(true);
    try {
      const success = await handleSafePermissionChange(user.uid, permission, value, permissions);
      if (success) {
        const updatedPermissions = { ...permissions, [permission]: value };
        setPermissions(updatedPermissions);
      }
    } catch (error) {
      console.error('Error updating permission:', error);
      Alert.alert('Error', 'Failed to update permission setting');
    } finally {
      setSaving(false);
    }
  };

  const handleDataDeletion = () => {
    navigation.navigate('DataDeletion');
  };

  const handleGrievanceForm = () => {
    navigation.navigate('GrievanceForm');
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
    permissionItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    permissionContent: {
      flex: 1,
      marginRight: 16,
    },
    permissionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 4,
    },
    permissionDescription: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    safetyWarning: {
      fontSize: 12,
      color: colors.warning,
      fontStyle: 'italic',
      marginTop: 4,
    },
    dataUsageItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8,
    },
    dataUsageLabel: {
      fontSize: 14,
      color: colors.text,
    },
    dataUsageValue: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.primary,
    },
    actionButton: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      padding: 16,
      alignItems: 'center',
      marginTop: 8,
    },
    actionButtonSecondary: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    actionButtonText: {
      color: colors.surface,
      fontSize: 16,
      fontWeight: '600',
    },
    actionButtonTextSecondary: {
      color: colors.primary,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
    },
    explanatoryText: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
      marginBottom: 16,
    },
  });

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.explanatoryText, { marginTop: 16 }]}>
          Loading privacy settings...
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Privacy Consent Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy Consent</Text>
          <Text style={styles.explanatoryText}>
            Control how your data is collected and used. You can change these settings at any time. 
            Note that disabling certain permissions may affect safety features.
          </Text>
          
          <View style={styles.permissionItem}>
            <View style={styles.permissionContent}>
              <Text style={styles.permissionTitle}>Location Tracking</Text>
              <Text style={styles.permissionDescription}>
                Allow the app to track your location for safety monitoring and emergency response.
              </Text>
              <Text style={styles.safetyWarning}>
                ⚠️ Required for core safety features
              </Text>
            </View>
            <Switch
              value={permissions.locationTracking}
              onValueChange={(value) => handlePermissionChange('locationTracking', value)}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.surface}
              disabled={saving}
            />
          </View>

          <View style={styles.permissionItem}>
            <View style={styles.permissionContent}>
              <Text style={styles.permissionTitle}>Emergency Contacts</Text>
              <Text style={styles.permissionDescription}>
                Store and access your emergency contacts for crisis situations.
              </Text>
              <Text style={styles.safetyWarning}>
                ⚠️ Required for emergency response
              </Text>
            </View>
            <Switch
              value={permissions.emergencyContacts}
              onValueChange={(value) => handlePermissionChange('emergencyContacts', value)}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.surface}
              disabled={saving}
            />
          </View>

          <View style={styles.permissionItem}>
            <View style={styles.permissionContent}>
              <Text style={styles.permissionTitle}>Profile Data</Text>
              <Text style={styles.permissionDescription}>
                Store your tourist profile information including nationality and passport details.
              </Text>
            </View>
            <Switch
              value={permissions.profileData}
              onValueChange={(value) => handlePermissionChange('profileData', value)}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.surface}
              disabled={saving}
            />
          </View>

          <View style={styles.permissionItem}>
            <View style={styles.permissionContent}>
              <Text style={styles.permissionTitle}>Analytics Data</Text>
              <Text style={styles.permissionDescription}>
                Help improve the app by sharing anonymous usage statistics.
              </Text>
            </View>
            <Switch
              value={permissions.analyticsData}
              onValueChange={(value) => handlePermissionChange('analyticsData', value)}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.surface}
              disabled={saving}
            />
          </View>

          <View style={styles.permissionItem}>
            <View style={styles.permissionContent}>
              <Text style={styles.permissionTitle}>Crash Reports</Text>
              <Text style={styles.permissionDescription}>
                Automatically send crash reports to help fix bugs and improve stability.
              </Text>
            </View>
            <Switch
              value={permissions.crashReports}
              onValueChange={(value) => handlePermissionChange('crashReports', value)}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.surface}
              disabled={saving}
            />
          </View>

          <View style={[styles.permissionItem, { borderBottomWidth: 0 }]}>
            <View style={styles.permissionContent}>
              <Text style={styles.permissionTitle}>Marketing Communications</Text>
              <Text style={styles.permissionDescription}>
                Receive updates about new features and safety tips via notifications.
              </Text>
            </View>
            <Switch
              value={permissions.marketingCommunications}
              onValueChange={(value) => handlePermissionChange('marketingCommunications', value)}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.surface}
              disabled={saving}
            />
          </View>
        </View>

        {/* Data Usage Transparency */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Usage Transparency</Text>
          <Text style={styles.explanatoryText}>
            See how your data is being collected and used by the app.
          </Text>
          
          <View style={styles.dataUsageItem}>
            <Text style={styles.dataUsageLabel}>Location Data Points Collected</Text>
            <Text style={styles.dataUsageValue}>{dataUsage.locationDataPoints}</Text>
          </View>
          
          <View style={styles.dataUsageItem}>
            <Text style={styles.dataUsageLabel}>Emergency Alerts Sent</Text>
            <Text style={styles.dataUsageValue}>{dataUsage.emergencyAlerts}</Text>
          </View>
          
          <View style={styles.dataUsageItem}>
            <Text style={styles.dataUsageLabel}>QR Codes Generated</Text>
            <Text style={styles.dataUsageValue}>{dataUsage.qrGenerations}</Text>
          </View>
          
          <View style={styles.dataUsageItem}>
            <Text style={styles.dataUsageLabel}>Last Data Sync</Text>
            <Text style={styles.dataUsageValue}>
              {dataUsage.lastSyncDate ? 
                new Date(dataUsage.lastSyncDate).toLocaleDateString() : 
                'Never'
              }
            </Text>
          </View>
        </View>

        {/* Data Management Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Management</Text>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.actionButtonSecondary]}
            onPress={handleDataDeletion}
            accessibilityLabel="Request data deletion"
            accessibilityHint="Opens form to request deletion of your personal data"
          >
            <Text style={[styles.actionButtonText, styles.actionButtonTextSecondary]}>
              Request Data Deletion
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.actionButtonSecondary]}
            onPress={handleGrievanceForm}
            accessibilityLabel="File privacy grievance"
            accessibilityHint="Opens form to file a privacy-related complaint"
          >
            <Text style={[styles.actionButtonText, styles.actionButtonTextSecondary]}>
              File Privacy Grievance
            </Text>
          </TouchableOpacity>
        </View>

        {saving && (
          <View style={styles.section}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.explanatoryText, { textAlign: 'center', marginTop: 8 }]}>
              Saving changes...
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default PrivacyScreen;