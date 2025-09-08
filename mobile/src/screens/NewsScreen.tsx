/**
 * News Screen - Stock market news and updates
 * Shows market news and stock-specific news
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';

type NewsScreenRouteProp = RouteProp<RootStackParamList, 'News'>;

interface Props {
  route: NewsScreenRouteProp;
}

export const NewsScreen: React.FC<Props> = ({ route }) => {
  const theme = useTheme();
  const { symbol } = route.params;

  return (
    <View style={styles.container}>
      <Text>News for {symbol ? symbol : 'Market'}</Text>
      <Text>News functionality coming soon...</Text>
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