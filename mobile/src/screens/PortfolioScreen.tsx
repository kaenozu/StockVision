/**
 * Portfolio Screen - User's investment portfolio tracking
 * Shows holdings, performance, and portfolio analytics
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { EmptyState } from '../components/EmptyState';

export const PortfolioScreen: React.FC = () => {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <EmptyState
        icon="briefcase-outline"
        title="Portfolio Coming Soon"
        subtitle="Portfolio tracking and analytics will be available in a future update"
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