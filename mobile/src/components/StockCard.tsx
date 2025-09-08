/**
 * StockCard Component - Displays stock information in a card format
 * Used in watchlist and other stock listings
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Card, IconButton, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { spacing, typography } from '../theme/theme';

interface StockCardProps {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  onPress?: () => void;
  onRemove?: () => void;
  showRemoveButton?: boolean;
}

export const StockCard: React.FC<StockCardProps> = ({
  symbol,
  name,
  price,
  change,
  changePercent,
  volume,
  onPress,
  onRemove,
  showRemoveButton = false,
}) => {
  const theme = useTheme();
  
  const isPositive = changePercent >= 0;
  const changeColor = isPositive ? theme.colors.profit : theme.colors.loss;
  const changeIcon = isPositive ? 'trending-up' : 'trending-down';

  return (
    <Card style={styles.card}>
      <TouchableOpacity onPress={onPress} style={styles.cardContent}>
        <View style={styles.header}>
          <View style={styles.symbolContainer}>
            <Text style={[typography.titleMedium, { color: theme.colors.onSurface }]}>
              {symbol}
            </Text>
            <Text style={[typography.bodySmall, { color: theme.colors.onSurfaceVariant }]}>
              {name}
            </Text>
          </View>
          {showRemoveButton && (
            <IconButton
              icon="close"
              size={20}
              onPress={onRemove}
              style={styles.removeButton}
            />
          )}
        </View>
        
        <View style={styles.priceContainer}>
          <Text style={[typography.headlineSmall, { color: theme.colors.onSurface }]}>
            ${price.toFixed(2)}
          </Text>
          
          <View style={[styles.changeContainer, { backgroundColor: changeColor + '20' }]}>
            <MaterialCommunityIcons 
              name={changeIcon} 
              size={16} 
              color={changeColor} 
            />
            <Text style={[typography.labelMedium, { color: changeColor }]}>
              {change >= 0 ? '+' : ''}{change.toFixed(2)} ({changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}%)
            </Text>
          </View>
        </View>
        
        <View style={styles.footer}>
          <Text style={[typography.bodySmall, { color: theme.colors.onSurfaceVariant }]}>
            Volume: {volume.toLocaleString()}
          </Text>
        </View>
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
    marginBottom: spacing.sm,
  },
  symbolContainer: {
    flex: 1,
  },
  removeButton: {
    margin: 0,
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 16,
    gap: spacing.xs,
  },
  footer: {
    alignItems: 'flex-end',
  },
});