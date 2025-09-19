import React from 'react';
import { Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useSafety } from '../context/SafetyContext';

// Import screens
import DashboardScreen from '../screens/DashboardScreen';
import QRCodeScreen from '../screens/QRCodeScreen';
import MapScreen from '../screens/main/MapScreen';
import EmergencyScreen from '../screens/main/EmergencyScreen';
import ChatScreen from '../screens/ChatScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

const TabNavigator = () => {
  const { colors } = useTheme();
  const { panicMode, safetyScore } = useSafety();

  // Get tab bar icon
  const getTabBarIcon = (routeName, focused, color, size) => {
    let iconName;

    switch (routeName) {
      case 'Dashboard':
        iconName = focused ? 'home' : 'home-outline';
        break;
      case 'QRCode':
        iconName = focused ? 'qr-code' : 'qr-code-outline';
        break;
      case 'Emergency':
        iconName = focused ? 'medical' : 'medical-outline';
        break;
      case 'Chat':
        iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
        break;
      case 'Profile':
        iconName = focused ? 'person' : 'person-outline';
        break;
      default:
        iconName = 'help-outline';
    }

    return <Ionicons name={iconName} size={size} color={color} />;
  };

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) =>
          getTabBarIcon(route.name, focused, color, size),
        tabBarActiveTintColor: panicMode ? colors.error : colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginTop: 2,
        },
        headerShown: false,
        tabBarHideOnKeyboard: true,
      })}
      initialRouteName="Dashboard"
      backBehavior="initialRoute"
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarBadge: panicMode ? '!' : (safetyScore < 60 ? '⚠' : null),
        }}
      />
      
      <Tab.Screen
        name="QRCode"
        component={QRCodeScreen}
        options={{
          tabBarLabel: 'ID',
        }}
      />
      
      <Tab.Screen
        name="Map"
        component={MapScreen}
        options={{
          tabBarLabel: 'Map',
          tabBarBadge: safetyScore < 40 ? '⚠' : null,
          tabBarBadgeStyle: {
            backgroundColor: colors.warning,
            color: 'white',
            fontSize: 10,
          },
        }}
      />
      
      <Tab.Screen
        name="Emergency"
        component={EmergencyScreen}
        options={{
          tabBarLabel: 'SOS',
          tabBarBadge: panicMode ? 'ACTIVE' : null,
          tabBarActiveTintColor: colors.error,
        }}
      />
      
      <Tab.Screen
        name="Chat"
        component={ChatScreen}
        options={{
          tabBarLabel: 'Help',
        }}
      />
      
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
        }}
      />
    </Tab.Navigator>
  );
};

export default TabNavigator;