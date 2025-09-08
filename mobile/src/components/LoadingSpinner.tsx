/**
 * LoadingSpinner Component - Shows loading state
 * Used for indicating loading operations
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ActivityIndicator, Text, useTheme } from 'react-native-paper';
import { spacing, typography } from '../theme/theme';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'small' | 'large';
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message,
  size = 'large',
}) => {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <ActivityIndicator 
        animating 
        size={size} 
        color={theme.colors.primary}
        style={styles.spinner}
      />
      {message && (
        <Text style={[typography.bodyMedium, { color: theme.colors.onSurfaceVariant }]}>
          {message}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  spinner: {
    marginBottom: spacing.md,
  },
});