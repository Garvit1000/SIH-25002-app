import React, { createContext, useState, useContext, useEffect } from 'react';
import { Appearance } from 'react-native';

const ThemeContext = createContext({});

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Light theme colors
const lightColors = {
  primary: '#007AFF',
  secondary: '#5856D6',
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
  info: '#5AC8FA',
  background: '#F2F2F7',
  surface: '#FFFFFF',
  text: '#000000',
  textSecondary: '#6D6D80',
  border: '#C6C6C8',
  placeholder: '#C7C7CD'
};

// Dark theme colors
const darkColors = {
  primary: '#0A84FF',
  secondary: '#5E5CE6',
  success: '#30D158',
  warning: '#FF9F0A',
  error: '#FF453A',
  info: '#64D2FF',
  background: '#000000',
  surface: '#1C1C1E',
  text: '#FFFFFF',
  textSecondary: '#8E8E93',
  border: '#38383A',
  placeholder: '#48484A'
};

export const ThemeProvider = ({ children, initialTheme = null }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isHighContrast, setIsHighContrast] = useState(false);
  const [fontSize, setFontSize] = useState('md');
  const [fontScale, setFontScale] = useState(1.0);

  useEffect(() => {
    // Initialize theme based on system preference
    const initializeTheme = () => {
      try {
        const systemColorScheme = Appearance.getColorScheme();
        if (initialTheme) {
          setIsDarkMode(initialTheme === 'dark');
        } else {
          setIsDarkMode(systemColorScheme === 'dark');
        }
      } catch (error) {
        console.error('Error initializing theme:', error);
        setIsDarkMode(false); // Default to light mode
      }
    };

    initializeTheme();

    // Listen for system theme changes
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      if (!initialTheme) {
        setIsDarkMode(colorScheme === 'dark');
      }
    });

    return () => subscription?.remove();
  }, [initialTheme]);

  const colors = isDarkMode ? darkColors : lightColors;

  // Apply high contrast modifications
  const finalColors = isHighContrast ? {
    ...colors,
    text: isDarkMode ? '#FFFFFF' : '#000000',
    background: isDarkMode ? '#000000' : '#FFFFFF',
    surface: isDarkMode ? '#1A1A1A' : '#F8F8F8',
    border: isDarkMode ? '#FFFFFF' : '#000000'
  } : colors;

  const toggleDarkMode = async () => {
    try {
      setIsDarkMode(!isDarkMode);
      return { success: true };
    } catch (error) {
      console.error('Error toggling dark mode:', error);
      return { success: false, error: error.message };
    }
  };

  const toggleHighContrast = async () => {
    try {
      setIsHighContrast(!isHighContrast);
      return { success: true };
    } catch (error) {
      console.error('Error toggling high contrast:', error);
      return { success: false, error: error.message };
    }
  };

  const setFontSizeValue = async (size) => {
    try {
      const fontSizes = {
        xs: 0.8,
        sm: 0.9,
        md: 1.0,
        lg: 1.1,
        xl: 1.2,
        xxl: 1.5,
        xxxl: 2.0
      };
      
      setFontSize(size);
      setFontScale(fontSizes[size] || 1.0);
      return { success: true };
    } catch (error) {
      console.error('Error setting font size:', error);
      return { success: false, error: error.message };
    }
  };

  const getThemeStyles = () => {
    return {
      container: {
        backgroundColor: finalColors.background,
        flex: 1
      },
      surface: {
        backgroundColor: finalColors.surface
      },
      text: {
        color: finalColors.text,
        fontSize: 16 * fontScale
      },
      textSecondary: {
        color: finalColors.textSecondary,
        fontSize: 14 * fontScale
      },
      button: {
        backgroundColor: finalColors.primary
      },
      border: {
        borderColor: finalColors.border
      }
    };
  };

  const value = {
    isDarkMode,
    isHighContrast,
    fontSize,
    fontScale,
    colors: finalColors,
    theme: isDarkMode ? 'dark' : 'light',
    toggleDarkMode,
    toggleHighContrast,
    setFontSize: setFontSizeValue,
    getThemeStyles
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export { ThemeContext };