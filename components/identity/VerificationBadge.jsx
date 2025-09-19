import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const VerificationBadge = ({ 
  verified = false, 
  txId = null, 
  size = 'medium' 
}) => {
  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return { width: 20, height: 20, iconSize: 12, fontSize: 8 };
      case 'large':
        return { width: 32, height: 32, iconSize: 20, fontSize: 10 };
      default:
        return { width: 24, height: 24, iconSize: 16, fontSize: 9 };
    }
  };

  const sizeStyles = getSizeStyles();

  if (!verified) {
    return (
      <View style={[
        styles.badge,
        styles.unverifiedBadge,
        { width: sizeStyles.width, height: sizeStyles.height }
      ]}>
        <Ionicons 
          name="time-outline" 
          size={sizeStyles.iconSize} 
          color="#FF9500" 
        />
      </View>
    );
  }

  return (
    <View style={[
      styles.badge,
      styles.verifiedBadge,
      { width: sizeStyles.width, height: sizeStyles.height }
    ]}>
      <Ionicons 
        name="checkmark-circle" 
        size={sizeStyles.iconSize} 
        color="#FFFFFF" 
      />
      {txId && size !== 'small' && (
        <Text style={[styles.txText, { fontSize: sizeStyles.fontSize }]}>
          TX: {txId.slice(-6)}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  verifiedBadge: {
    backgroundColor: '#00C851',
  },
  unverifiedBadge: {
    backgroundColor: '#FFF3CD',
    borderWidth: 1,
    borderColor: '#FF9500',
  },
  txText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginTop: 2,
  },
});

export default VerificationBadge;