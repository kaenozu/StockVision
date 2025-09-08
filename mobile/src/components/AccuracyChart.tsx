/**
 * AccuracyChart Component - Displays model accuracy chart
 * Shows comparative accuracy of different ML models
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Card, useTheme } from 'react-native-paper';
import { spacing, typography } from '../theme/theme';

interface ModelStats {
  modelName: string;
  accuracy: number;
  totalPredictions: number;
  successfulPredictions: number;
  averageConfidence: number;
  lastUpdate: string;
}

interface AccuracyChartProps {
  data: ModelStats[];
}

export const AccuracyChart: React.FC<AccuracyChartProps> = ({ data }) => {
  const theme = useTheme();

  return (
    <Card style={styles.card}>
      <Card.Content>
        <Text style={[typography.titleMedium, styles.title]}>
          Model Accuracy Comparison
        </Text>
        <Text style={[typography.bodySmall, styles.subtitle]}>
          Chart visualization coming soon...
        </Text>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    margin: spacing.md,
  },
  title: {
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    opacity: 0.7,
  },
});