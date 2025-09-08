/**
 * SearchModal Component - Modal for searching and selecting stocks
 * Allows users to search for stocks and add them to watchlist
 */

import React, { useState } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { 
  Modal, 
  Portal, 
  Searchbar, 
  Text, 
  List, 
  useTheme,
  Button 
} from 'react-native-paper';
import { spacing } from '../theme/theme';

interface Stock {
  symbol: string;
  name: string;
  price: number;
}

interface SearchModalProps {
  visible: boolean;
  onDismiss: () => void;
  onSelectStock: (stock: Stock) => void;
}

const MOCK_STOCKS: Stock[] = [
  { symbol: 'AAPL', name: 'Apple Inc.', price: 175.25 },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 132.15 },
  { symbol: 'MSFT', name: 'Microsoft Corporation', price: 378.90 },
  { symbol: 'TSLA', name: 'Tesla Inc.', price: 242.80 },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', price: 145.75 },
];

export const SearchModal: React.FC<SearchModalProps> = ({
  visible,
  onDismiss,
  onSelectStock,
}) => {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<Stock[]>([]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    
    if (query.length > 0) {
      const filtered = MOCK_STOCKS.filter(stock =>
        stock.symbol.toLowerCase().includes(query.toLowerCase()) ||
        stock.name.toLowerCase().includes(query.toLowerCase())
      );
      setResults(filtered);
    } else {
      setResults([]);
    }
  };

  const handleSelectStock = (stock: Stock) => {
    onSelectStock(stock);
    setSearchQuery('');
    setResults([]);
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}
      >
        <View style={styles.header}>
          <Searchbar
            placeholder="Search stocks..."
            value={searchQuery}
            onChangeText={handleSearch}
            style={styles.searchbar}
          />
          <Button onPress={onDismiss}>Cancel</Button>
        </View>

        <FlatList
          data={results}
          keyExtractor={(item) => item.symbol}
          renderItem={({ item }) => (
            <List.Item
              title={item.symbol}
              description={item.name}
              right={() => <Text>${item.price.toFixed(2)}</Text>}
              onPress={() => handleSelectStock(item)}
            />
          )}
          style={styles.results}
        />
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modal: {
    margin: spacing.lg,
    borderRadius: 12,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  searchbar: {
    flex: 1,
  },
  results: {
    maxHeight: 400,
  },
});