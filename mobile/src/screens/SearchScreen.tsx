/**
 * Search Screen - Stock search and discovery
 * Allows users to search and add stocks to watchlist
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

export const SearchScreen: React.FC = () => {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <Text>Search functionality coming soon...</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: 'transparent',
  },
});