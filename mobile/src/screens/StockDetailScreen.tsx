/**
 * Stock Detail Screen - Detailed view of individual stock
 * Shows charts, news, fundamentals, and predictions
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';

type StockDetailScreenRouteProp = RouteProp<RootStackParamList, 'StockDetail'>;

interface Props {
  route: StockDetailScreenRouteProp;
}

export const StockDetailScreen: React.FC<Props> = ({ route }) => {
  const theme = useTheme();
  const { symbol, name } = route.params;

  return (
    <View style={styles.container}>
      <Text>Stock Detail for {symbol} - {name}</Text>
      <Text>Coming soon...</Text>
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