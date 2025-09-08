/**
 * Watchlist Screen - User's personalized stock watchlist
 * Shows real-time updates and allows management of watched stocks
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { 
  Text, 
  Card, 
  IconButton, 
  FAB,
  Chip,
  Surface,
  useTheme,
  Snackbar
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';

import { RootState } from '../store/store';
import { 
  addToWatchlist, 
  removeFromWatchlist, 
  updateStockPrice 
} from '../store/slices/stocksSlice';
import { WebSocketService, StockUpdate } from '../services/WebSocketService';
import { NotificationService } from '../services/NotificationService';
import { StockCard } from '../components/StockCard';
import { EmptyState } from '../components/EmptyState';
import { SearchModal } from '../components/SearchModal';
import { spacing, typography } from '../theme/theme';

interface WatchlistItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  high: number;
  low: number;
  marketCap?: number;
  lastUpdated: string;
  alerts: number;
}

export const WatchlistScreen: React.FC = () => {
  const theme = useTheme();
  const dispatch = useDispatch();
  
  const watchlist = useSelector((state: RootState) => state.stocks.watchlist);
  const isLoading = useSelector((state: RootState) => state.stocks.loading);
  
  const [refreshing, setRefreshing] = useState(false);
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [sortBy, setSortBy] = useState<'symbol' | 'price' | 'change'>('symbol');
  const [filterBy, setFilterBy] = useState<'all' | 'gainers' | 'losers'>('all');

  // Subscribe to real-time updates when screen is focused
  useFocusEffect(
    useCallback(() => {
      const symbols = watchlist.map(item => item.symbol);
      
      if (symbols.length > 0) {
        // Subscribe to WebSocket updates
        WebSocketService.batchSubscribe(symbols);
        
        // Set up stock update listener
        const unsubscribe = WebSocketService.onStockUpdate(handleStockUpdate);
        
        return () => {
          WebSocketService.batchUnsubscribe(symbols);
          unsubscribe();
        };
      }
    }, [watchlist])
  );

  const handleStockUpdate = useCallback((update: StockUpdate) => {
    dispatch(updateStockPrice({
      symbol: update.symbol,
      price: update.price,
      change: update.change,
      changePercent: update.changePercent,
      volume: update.volume,
      high: update.high,
      low: update.low,
      lastUpdated: update.timestamp,
    }));

    // Check for price alerts
    NotificationService.checkAndTriggerAlerts(update.symbol, update.price);
  }, [dispatch]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    
    try {
      // Force refresh data for all watchlist items
      const symbols = watchlist.map(item => item.symbol);
      
      if (symbols.length > 0) {
        // Re-subscribe to get fresh data
        WebSocketService.batchUnsubscribe(symbols);
        WebSocketService.batchSubscribe(symbols);
      }
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error('Failed to refresh watchlist:', error);
      showSnackbar('Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  }, [watchlist]);

  const handleAddStock = useCallback((stock: { symbol: string; name: string; price: number }) => {
    const newItem: WatchlistItem = {
      symbol: stock.symbol,
      name: stock.name,
      price: stock.price,
      change: 0,
      changePercent: 0,
      volume: 0,
      high: stock.price,
      low: stock.price,
      lastUpdated: new Date().toISOString(),
      alerts: 0,
    };

    dispatch(addToWatchlist(newItem));
    WebSocketService.subscribe(stock.symbol);
    
    showSnackbar(`${stock.symbol} added to watchlist`);
    setSearchModalVisible(false);
  }, [dispatch]);

  const handleRemoveStock = useCallback((symbol: string) => {
    dispatch(removeFromWatchlist(symbol));
    WebSocketService.unsubscribe(symbol);
    
    showSnackbar(`${symbol} removed from watchlist`);
  }, [dispatch]);

  const showSnackbar = useCallback((message: string) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  }, []);

  const getSortedAndFilteredWatchlist = useCallback(() => {
    let filtered = [...watchlist];

    // Apply filter
    switch (filterBy) {
      case 'gainers':
        filtered = filtered.filter(item => item.changePercent > 0);
        break;
      case 'losers':
        filtered = filtered.filter(item => item.changePercent < 0);
        break;
      default:
        break;
    }

    // Apply sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'price':
          return b.price - a.price;
        case 'change':
          return b.changePercent - a.changePercent;
        default:
          return a.symbol.localeCompare(b.symbol);
      }
    });

    return filtered;
  }, [watchlist, sortBy, filterBy]);

  const renderStockItem = ({ item }: { item: WatchlistItem }) => (
    <StockCard
      symbol={item.symbol}
      name={item.name}
      price={item.price}
      change={item.change}
      changePercent={item.changePercent}
      volume={item.volume}
      onPress={() => {/* Navigate to stock detail */}}
      onRemove={() => handleRemoveStock(item.symbol)}
      showRemoveButton
    />
  );

  const renderFilterChips = () => (
    <View style={styles.filterContainer}>
      <Chip
        selected={filterBy === 'all'}
        onPress={() => setFilterBy('all')}
        style={styles.filterChip}
      >
        All ({watchlist.length})
      </Chip>
      <Chip
        selected={filterBy === 'gainers'}
        onPress={() => setFilterBy('gainers')}
        style={styles.filterChip}
        textStyle={{ color: theme.colors.profit }}
      >
        Gainers ({watchlist.filter(item => item.changePercent > 0).length})
      </Chip>
      <Chip
        selected={filterBy === 'losers'}
        onPress={() => setFilterBy('losers')}
        style={styles.filterChip}
        textStyle={{ color: theme.colors.loss }}
      >
        Losers ({watchlist.filter(item => item.changePercent < 0).length})
      </Chip>
    </View>
  );

  const renderSortOptions = () => (
    <Surface style={styles.sortContainer}>
      <Text style={[typography.labelMedium, { color: theme.colors.onSurfaceVariant }]}>
        Sort by:
      </Text>
      <IconButton
        icon={sortBy === 'symbol' ? 'sort-alphabetical-variant' : 'sort-alphabetical-variant-off'}
        selected={sortBy === 'symbol'}
        onPress={() => setSortBy('symbol')}
        size={20}
      />
      <IconButton
        icon={sortBy === 'price' ? 'sort-numeric-variant' : 'sort-numeric-variant-off'}
        selected={sortBy === 'price'}
        onPress={() => setSortBy('price')}
        size={20}
      />
      <IconButton
        icon={sortBy === 'change' ? 'sort-variant' : 'sort-variant-off'}
        selected={sortBy === 'change'}
        onPress={() => setSortBy('change')}
        size={20}
      />
    </Surface>
  );

  const filteredWatchlist = getSortedAndFilteredWatchlist();

  if (watchlist.length === 0) {
    return (
      <View style={styles.container}>
        <EmptyState
          icon="star-outline"
          title="No Stocks in Watchlist"
          subtitle="Add stocks to your watchlist to track their performance"
          actionLabel="Add Stock"
          onAction={() => setSearchModalVisible(true)}
        />
        
        <SearchModal
          visible={searchModalVisible}
          onDismiss={() => setSearchModalVisible(false)}
          onSelectStock={handleAddStock}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderFilterChips()}
      {renderSortOptions()}
      
      <FlatList
        data={filteredWatchlist}
        keyExtractor={(item) => item.symbol}
        renderItem={renderStockItem}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      />

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => setSearchModalVisible(true)}
        label="Add Stock"
      />

      <SearchModal
        visible={searchModalVisible}
        onDismiss={() => setSearchModalVisible(false)}
        onSelectStock={handleAddStock}
      />

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
      >
        {snackbarMessage}
      </Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  listContainer: {
    padding: spacing.md,
    paddingBottom: 80, // Space for FAB
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  filterChip: {
    marginRight: spacing.sm,
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: 8,
  },
  fab: {
    position: 'absolute',
    bottom: spacing.md,
    right: spacing.md,
  },
});