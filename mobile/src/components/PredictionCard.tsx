/**
 * PredictionCard Component - Displays ML prediction information
 * Shows prediction details, confidence, and accuracy
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Card, Chip, ProgressBar, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { spacing, typography } from '../theme/theme';

interface Prediction {
  id: string;
  symbol: string;
  name: string;
  currentPrice: number;
  predictedPrice: number;
  change: number;
  changePercent: number;
  confidence: number;
  direction: 'up' | 'down' | 'stable';
  horizon: string;
  modelUsed: string;
  featuresUsed: string[];
  timestamp: string;
  accuracy?: number;
}

interface PredictionCardProps {
  prediction: Prediction;
  onPress?: () => void;
}

export const PredictionCard: React.FC<PredictionCardProps> = ({
  prediction,
  onPress,
}) => {
  const theme = useTheme();
  
  const isPositive = prediction.changePercent >= 0;
  const changeColor = isPositive ? theme.colors.profit : theme.colors.loss;
  const changeIcon = isPositive ? 'trending-up' : 'trending-down';
  
  const confidenceColor = 
    prediction.confidence >= 0.8 ? theme.colors.profit :
    prediction.confidence >= 0.6 ? theme.colors.tertiary :
    theme.colors.loss;

  return (
    <Card style={styles.card}>
      <TouchableOpacity onPress={onPress} style={styles.cardContent}>
        <View style={styles.header}>
          <View style={styles.symbolContainer}>
            <Text style={[typography.titleMedium, { color: theme.colors.onSurface }]}>
              {prediction.symbol}
            </Text>
            <Text style={[typography.bodySmall, { color: theme.colors.onSurfaceVariant }]}>
              {prediction.name}
            </Text>
          </View>
          
          <View style={styles.confidenceContainer}>
            <Text style={[typography.labelSmall, { color: theme.colors.onSurfaceVariant }]}>
              Confidence
            </Text>
            <Text style={[typography.titleSmall, { color: confidenceColor }]}>
              {(prediction.confidence * 100).toFixed(0)}%
            </Text>
          </View>
        </View>

        <View style={styles.priceContainer}>
          <View style={styles.priceInfo}>
            <Text style={[typography.bodySmall, { color: theme.colors.onSurfaceVariant }]}>
              Current
            </Text>
            <Text style={[typography.headlineSmall, { color: theme.colors.onSurface }]}>
              ${prediction.currentPrice.toFixed(2)}
            </Text>
          </View>
          
          <MaterialCommunityIcons 
            name="arrow-right" 
            size={20} 
            color={theme.colors.onSurfaceVariant}
          />
          
          <View style={styles.priceInfo}>
            <Text style={[typography.bodySmall, { color: theme.colors.onSurfaceVariant }]}>
              Predicted
            </Text>
            <Text style={[typography.headlineSmall, { color: changeColor }]}>
              ${prediction.predictedPrice.toFixed(2)}
            </Text>
          </View>
        </View>

        <View style={[styles.changeContainer, { backgroundColor: changeColor + '20' }]}>
          <MaterialCommunityIcons 
            name={changeIcon} 
            size={16} 
            color={changeColor} 
          />
          <Text style={[typography.labelMedium, { color: changeColor }]}>
            {prediction.change >= 0 ? '+' : ''}{prediction.change.toFixed(2)} 
            ({prediction.changePercent >= 0 ? '+' : ''}{prediction.changePercent.toFixed(2)}%)
          </Text>
        </View>

        <View style={styles.footer}>
          <Chip style={styles.chip} compact>
            {prediction.horizon}
          </Chip>
          <Chip style={styles.chip} compact>
            {prediction.modelUsed}
          </Chip>
          {prediction.accuracy && (
            <Text style={[typography.bodySmall, { color: theme.colors.onSurfaceVariant }]}>
              {prediction.accuracy}% accuracy
            </Text>
          )}
        </View>

        <ProgressBar 
          progress={prediction.confidence} 
          color={confidenceColor}
          style={styles.confidenceBar}
        />
      </TouchableOpacity>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginVertical: spacing.xs,
  },
  cardContent: {
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  symbolContainer: {
    flex: 1,
  },
  confidenceContainer: {
    alignItems: 'flex-end',
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  priceInfo: {
    alignItems: 'center',
    flex: 1,
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 16,
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  chip: {
    marginRight: spacing.xs,
  },
  confidenceBar: {
    height: 4,
    borderRadius: 2,
  },
});