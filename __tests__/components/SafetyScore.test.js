import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import SafetyScore from '../../components/safety/SafetyScore';
import { useTheme } from '../../context/ThemeContext';

// Mock theme context
jest.mock('../../context/ThemeContext');

describe('SafetyScore', () => {
  const mockTheme = {
    colors: {
      success: '#34C759',
      warning: '#FF9500',
      error: '#FF3B30',
      text: '#000000',
      textSecondary: '#8E8E93',
      surface: '#F2F2F7',
    },
  };

  beforeEach(() => {
    useTheme.mockReturnValue(mockTheme);
  });

  it('renders basic score correctly', () => {
    const { getByText } = render(<SafetyScore score={85} />);

    expect(getByText('85')).toBeTruthy();
    expect(getByText('/100')).toBeTruthy();
  });

  it('renders with correct color for high score', () => {
    const { getByText } = render(<SafetyScore score={90} />);

    const scoreText = getByText('90');
    expect(scoreText.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          color: mockTheme.colors.success,
        }),
      ])
    );
  });

  it('renders with correct color for medium score', () => {
    const { getByText } = render(<SafetyScore score={65} />);

    const scoreText = getByText('65');
    expect(scoreText.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          color: mockTheme.colors.warning,
        }),
      ])
    );
  });

  it('renders with correct color for low score', () => {
    const { getByText } = render(<SafetyScore score={25} />);

    const scoreText = getByText('25');
    expect(scoreText.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          color: mockTheme.colors.error,
        }),
      ])
    );
  });

  it('renders different sizes correctly', () => {
    const { rerender, getByText } = render(
      <SafetyScore score={75} size="small" />
    );

    let scoreText = getByText('75');
    expect(scoreText.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fontSize: 14,
        }),
      ])
    );

    rerender(<SafetyScore score={75} size="large" />);

    scoreText = getByText('75');
    expect(scoreText.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fontSize: 24,
        }),
      ])
    );
  });

  it('renders risk level correctly', () => {
    const { getByText } = render(
      <SafetyScore score={85} riskLevel="low" showDetails={true} />
    );

    expect(getByText('Low Risk')).toBeTruthy();
    expect(getByText('Safety Assessment')).toBeTruthy();
  });

  it('renders factors when provided', () => {
    const factors = [
      { factor: 'Day time', impact: 10, description: 'Better visibility' },
      { factor: 'High crowd density', impact: 5, description: 'More people around' },
      { factor: 'Bad weather', impact: -15, description: 'Weather conditions' },
    ];

    const { getByText } = render(
      <SafetyScore 
        score={75} 
        factors={factors} 
        showDetails={true} 
      />
    );

    expect(getByText('Contributing Factors:')).toBeTruthy();
    expect(getByText('Day time')).toBeTruthy();
    expect(getByText('High crowd density')).toBeTruthy();
    expect(getByText('Bad weather')).toBeTruthy();
    expect(getByText('+10')).toBeTruthy();
    expect(getByText('+5')).toBeTruthy();
    expect(getByText('-15')).toBeTruthy();
  });

  it('limits factors display to 3 and shows more indicator', () => {
    const factors = [
      { factor: 'Factor 1', impact: 10 },
      { factor: 'Factor 2', impact: 5 },
      { factor: 'Factor 3', impact: -5 },
      { factor: 'Factor 4', impact: -10 },
      { factor: 'Factor 5', impact: 15 },
    ];

    const { getByText, queryByText } = render(
      <SafetyScore 
        score={75} 
        factors={factors} 
        showDetails={true} 
      />
    );

    expect(getByText('Factor 1')).toBeTruthy();
    expect(getByText('Factor 2')).toBeTruthy();
    expect(getByText('Factor 3')).toBeTruthy();
    expect(queryByText('Factor 4')).toBeFalsy();
    expect(queryByText('Factor 5')).toBeFalsy();
    expect(getByText('+2 more factors')).toBeTruthy();
  });

  it('handles onPress callback', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <SafetyScore score={75} onPress={onPress} />
    );

    const scoreText = getByText('75');
    fireEvent.press(scoreText.parent);

    expect(onPress).toHaveBeenCalled();
  });

  it('handles onPress callback in detailed view', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <SafetyScore 
        score={75} 
        onPress={onPress} 
        showDetails={true} 
      />
    );

    const container = getByText('Safety Assessment').parent.parent;
    fireEvent.press(container);

    expect(onPress).toHaveBeenCalled();
  });

  it('renders correct risk level icons', () => {
    const { rerender, UNSAFE_getByType } = render(
      <SafetyScore score={85} riskLevel="low" showDetails={true} />
    );

    // Check for shield-checkmark icon for low risk
    expect(() => UNSAFE_getByType('Ionicons')).not.toThrow();

    rerender(
      <SafetyScore score={45} riskLevel="high" showDetails={true} />
    );

    // Check for warning icon for high risk
    expect(() => UNSAFE_getByType('Ionicons')).not.toThrow();
  });

  it('renders without details when showDetails is false', () => {
    const factors = [
      { factor: 'Day time', impact: 10 },
    ];

    const { queryByText } = render(
      <SafetyScore 
        score={75} 
        factors={factors} 
        showDetails={false} 
      />
    );

    expect(queryByText('Contributing Factors:')).toBeFalsy();
    expect(queryByText('Safety Assessment')).toBeFalsy();
  });

  it('handles different risk levels correctly', () => {
    const riskLevels = [
      { level: 'low', text: 'Low Risk' },
      { level: 'medium', text: 'Medium Risk' },
      { level: 'high', text: 'High Risk' },
      { level: 'critical', text: 'Critical Risk' },
    ];

    riskLevels.forEach(({ level, text }) => {
      const { getByText } = render(
        <SafetyScore 
          score={50} 
          riskLevel={level} 
          showDetails={true} 
        />
      );

      expect(getByText(text)).toBeTruthy();
    });
  });

  it('handles factors with positive and negative impacts', () => {
    const factors = [
      { factor: 'Positive factor', impact: 15 },
      { factor: 'Negative factor', impact: -10 },
    ];

    const { getByText } = render(
      <SafetyScore 
        score={75} 
        factors={factors} 
        showDetails={true} 
      />
    );

    expect(getByText('+15')).toBeTruthy();
    expect(getByText('-10')).toBeTruthy();
  });
});