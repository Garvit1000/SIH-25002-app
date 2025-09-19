import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

const SafetyScore = ({ 
  score, 
  factors = [], 
  riskLevel = 'medium',
  onPress,
  showDetails = false,
  size = 'medium' 
}) => {
  const { colors } = useTheme();

  const getScoreColor = (score) => {
    if (score >= 80) return colors.success;
    if (score >= 60) return colors.warning;
    if (score >= 40) return '#FF5722';
    return colors.error;
  };

  const getRiskLevelIcon = (level) => {
    switch (level) {
      case 'low': return 'shield-checkmark';
      case 'medium': return 'shield';
      case 'high': return 'warning';
      case 'critical': return 'alert-circle';
      default: return 'shield';
    }
  };

  const getRiskLevelText = (level) => {
    switch (level) {
      case 'low': return 'Low Risk';
      case 'medium': return 'Medium Risk';
      case 'high': return 'High Risk';
      case 'critical': return 'Critical Risk';
      default: return 'Unknown Risk';
    }
  };

  const scoreColor = getScoreColor(score);
  const riskIcon = getRiskLevelIcon(riskLevel);
  const riskText = getRiskLevelText(riskLevel);

  const containerSize = size === 'large' ? 120 : size === 'small' ? 60 : 80;
  const fontSize = size === 'large' ? 24 : size === 'small' ? 14 : 18;
  const iconSize = size === 'large' ? 32 : size === 'small' ? 16 : 24;

  const ScoreCircle = () => (
    <View style={[
      styles.scoreCircle,
      {
        width: containerSize,
        height: containerSize,
        borderColor: scoreColor,
        backgroundColor: `${scoreColor}15`
      }
    ]}>
      <Text style={[
        styles.scoreText,
        { 
          fontSize,
          color: scoreColor 
        }
      ]}>
        {score}
      </Text>
      <Text style={[
        styles.scoreLabel,
        { 
          fontSize: fontSize * 0.4,
          color: colors.textSecondary 
        }
      ]}>
        /100
      </Text>
    </View>
  );

  if (!showDetails) {
    return onPress ? (
      <TouchableOpacity onPress={onPress} style={styles.container}>
        <ScoreCircle />
      </TouchableOpacity>
    ) : (
      <View style={styles.container}>
        <ScoreCircle />
      </View>
    );
  }

  return (
    <TouchableOpacity 
      style={[styles.detailedContainer, { backgroundColor: colors.surface }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.header}>
        <ScoreCircle />
        <View style={styles.riskInfo}>
          <View style={styles.riskLevel}>
            <Ionicons name={riskIcon} size={iconSize} color={scoreColor} />
            <Text style={[styles.riskText, { color: colors.text }]}>
              {riskText}
            </Text>
          </View>
          <Text style={[styles.scoreDescription, { color: colors.textSecondary }]}>
            Safety Assessment
          </Text>
        </View>
      </View>

      {factors && factors.length > 0 && (
        <View style={styles.factorsContainer}>
          <Text style={[styles.factorsTitle, { color: colors.text }]}>
            Contributing Factors:
          </Text>
          {factors.slice(0, 3).map((factor, index) => (
            <View key={index} style={styles.factorItem}>
              <Ionicons 
                name={factor.impact > 0 ? "add-circle" : "remove-circle"} 
                size={16} 
                color={factor.impact > 0 ? colors.success : colors.error} 
              />
              <Text style={[styles.factorText, { color: colors.text }]}>
                {factor.factor}
              </Text>
              <Text style={[
                styles.factorImpact,
                { color: factor.impact > 0 ? colors.success : colors.error }
              ]}>
                {factor.impact > 0 ? '+' : ''}{factor.impact}
              </Text>
            </View>
          ))}
          {factors.length > 3 && (
            <Text style={[styles.moreFactors, { color: colors.textSecondary }]}>
              +{factors.length - 3} more factors
            </Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  detailedContainer: {
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  scoreCircle: {
    borderRadius: 100,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreText: {
    fontWeight: 'bold',
  },
  scoreLabel: {
    fontWeight: '500',
    marginTop: -4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  riskInfo: {
    flex: 1,
    marginLeft: 16,
  },
  riskLevel: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  riskText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  scoreDescription: {
    fontSize: 14,
  },
  factorsContainer: {
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: 16,
  },
  factorsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  factorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  factorText: {
    flex: 1,
    fontSize: 13,
    marginLeft: 8,
  },
  factorImpact: {
    fontSize: 13,
    fontWeight: '600',
    minWidth: 30,
    textAlign: 'right',
  },
  moreFactors: {
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 4,
  },
});

export default SafetyScore;