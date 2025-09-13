import React from 'react';
import { Text, StyleSheet } from 'react-native';

const ErrorText = ({ error, style }) => {
  if (!error) return null;
  
  return (
    <Text style={[styles.error, style]}>
      {error}
    </Text>
  );
};

const styles = StyleSheet.create({
  error: {
    color: '#ff0000',
    fontSize: 14,
    marginTop: 5,
    marginBottom: 10,
    textAlign: 'left',
    alignSelf: 'stretch',
  },
});

export default ErrorText;