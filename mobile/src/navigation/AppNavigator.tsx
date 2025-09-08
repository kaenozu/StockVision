/**
 * Main navigation component for StockVision Mobile App
 * Handles bottom tab navigation and stack navigation
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';

// Screens
import { HomeScreen } from '../screens/HomeScreen';
import { WatchlistScreen } from '../screens/WatchlistScreen';
import { StockDetailScreen } from '../screens/StockDetailScreen';
import { PredictionsScreen } from '../screens/PredictionsScreen';
import { PortfolioScreen } from '../screens/PortfolioScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { SearchScreen } from '../screens/SearchScreen';
import { NewsScreen } from '../screens/NewsScreen';

// Type definitions
export type RootTabParamList = {
  Home: undefined;
  Watchlist: undefined;
  Predictions: undefined;
  Portfolio: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  Main: undefined;
  StockDetail: {
    symbol: string;
    name: string;
  };
  Search: undefined;
  News: {
    symbol?: string;
  };
};

const Tab = createBottomTabNavigator<RootTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

const MainTabNavigator = () => {
  const theme = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;

          switch (route.name) {
            case 'Home':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Watchlist':
              iconName = focused ? 'star' : 'star-outline';
              break;
            case 'Predictions':
              iconName = focused ? 'chart-line' : 'chart-line-variant';
              break;
            case 'Portfolio':
              iconName = focused ? 'briefcase' : 'briefcase-outline';
              break;
            case 'Settings':
              iconName = focused ? 'cog' : 'cog-outline';
              break;
            default:
              iconName = 'circle';
              break;
          }

          return (
            <MaterialCommunityIcons
              name={iconName as any}
              size={size}
              color={color}
            />
          );
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.outline,
          borderTopWidth: 1,
        },
        headerStyle: {
          backgroundColor: theme.colors.surface,
        },
        headerTintColor: theme.colors.onSurface,
        headerTitleStyle: {
          fontWeight: '600',
        },
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{
          title: 'Market Overview',
          headerRight: () => (
            <MaterialCommunityIcons 
              name="magnify" 
              size={24} 
              color={theme.colors.onSurface}
              style={{ marginRight: 16 }}
            />
          ),
        }}
      />
      <Tab.Screen 
        name="Watchlist" 
        component={WatchlistScreen}
        options={{
          title: 'Watchlist',
          headerRight: () => (
            <MaterialCommunityIcons 
              name="plus" 
              size={24} 
              color={theme.colors.onSurface}
              style={{ marginRight: 16 }}
            />
          ),
        }}
      />
      <Tab.Screen 
        name="Predictions" 
        component={PredictionsScreen}
        options={{
          title: 'AI Predictions',
        }}
      />
      <Tab.Screen 
        name="Portfolio" 
        component={PortfolioScreen}
        options={{
          title: 'Portfolio',
        }}
      />
      <Tab.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{
          title: 'Settings',
        }}
      />
    </Tab.Navigator>
  );
};

export const AppNavigator = () => {
  const theme = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.surface,
        },
        headerTintColor: theme.colors.onSurface,
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    >
      <Stack.Screen 
        name="Main" 
        component={MainTabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="StockDetail"
        component={StockDetailScreen}
        options={({ route }) => ({
          title: route.params.symbol,
          headerBackTitle: 'Back',
        })}
      />
      <Stack.Screen
        name="Search"
        component={SearchScreen}
        options={{
          title: 'Search Stocks',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="News"
        component={NewsScreen}
        options={({ route }) => ({
          title: route.params?.symbol ? `${route.params.symbol} News` : 'Market News',
        })}
      />
    </Stack.Navigator>
  );
};