/**
 * Settings Screen - App preferences and configuration
 * Handles notifications, theme, and account settings
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { EmptyState } from '../components/EmptyState';

export const SettingsScreen: React.FC = () => {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <EmptyState
        icon="cog-outline"
        title="Settings Coming Soon"
        subtitle="App settings and preferences will be available in a future update"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});