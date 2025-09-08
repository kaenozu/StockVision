import React, { useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Button,
  Text,
  Surface,
  Chip,
  FAB,
} from 'react-native-paper';

import { useAppDispatch, useAppSelector } from '../store/store';
import {
  fetchMultipleQuotes,
  removeFromWatchlist,
  setRefreshing,
  StockQuote,
} from '../store/slices/stocksSlice';
import { StockCard } from '../components/StockCard';
import { MarketSummary } from '../components/MarketSummary';
import { PredictionCard } from '../components/PredictionCard';
import { SearchModal } from '../components/SearchModal';

interface HomeScreenProps {
  navigation: any;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const { watchlist, quotes, loading, refreshing, error } = useAppSelector(
    state => state.stocks
  );
  const [searchVisible, setSearchVisible] = React.useState(false);

  useEffect(() => {
    // Initial load
    if (watchlist.length > 0) {
      dispatch(fetchMultipleQuotes(watchlist));
    }
  }, [dispatch, watchlist]);

  const handleRefresh = useCallback(() => {
    dispatch(setRefreshing(true));
    dispatch(fetchMultipleQuotes(watchlist)).finally(() => {
      dispatch(setRefreshing(false));
    });
  }, [dispatch, watchlist]);

  const handleRemoveStock = (symbol: string) => {
    Alert.alert(
      'Remove Stock',
      `Remove ${symbol} from watchlist?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => dispatch(removeFromWatchlist(symbol)),
        },
      ]
    );
  };

  const handleStockPress = (symbol: string) => {
    navigation.navigate('StockDetail', { symbol });
  };

  const renderWatchlistStocks = () => {
    return watchlist.map((symbol) => {
      const quote = quotes[symbol];
      return (
        <StockCard
          key={symbol}
          symbol={symbol}
          quote={quote}
          onPress={() => handleStockPress(symbol)}
          onRemove={() => handleRemoveStock(symbol)}
        />
      );
    });
  };

  const getTotalChange = () => {
    const validQuotes = Object.values(quotes).filter(quote => quote?.change);
    if (validQuotes.length === 0) return { change: 0, isPositive: true };
    
    const totalChange = validQuotes.reduce((sum, quote) => sum + quote.change, 0);
    return {
      change: totalChange,
      isPositive: totalChange >= 0,
    };
  };

  const { change, isPositive } = getTotalChange();

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Portfolio Summary */}
        <Surface style={styles.summaryCard}>
          <Title>Portfolio Summary</Title>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Watchlist Change:</Text>
            <Text
              style={[
                styles.summaryValue,
                { color: isPositive ? '#4CAF50' : '#F44336' },
              ]}
            >
              {isPositive ? '+' : ''}${change.toFixed(2)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Stocks Tracked:</Text>
            <Text style={styles.summaryValue}>{watchlist.length}</Text>
          </View>
        </Surface>

        {/* Market Summary */}
        <MarketSummary />

        {/* AI Predictions */}
        <Card style={styles.card}>
          <Card.Content>
            <Title>AI Predictions</Title>
            <Paragraph>Machine learning insights for your watchlist</Paragraph>
            <PredictionCard symbols={watchlist.slice(0, 3)} />
          </Card.Content>
          <Card.Actions>
            <Button
              mode="outlined"
              onPress={() => navigation.navigate('Predictions')}
            >
              View All Predictions
            </Button>
          </Card.Actions>
        </Card>

        {/* Watchlist */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.watchlistHeader}>
              <Title>Your Watchlist</Title>
              <Chip icon="star">
                {watchlist.length} stocks
              </Chip>
            </View>
            {error && (
              <Text style={styles.errorText}>{error}</Text>
            )}
          </Card.Content>
        </Card>

        {/* Stock Cards */}
        <View style={styles.stocksList}>
          {renderWatchlistStocks()}
        </View>

        {watchlist.length === 0 && (
          <Card style={styles.card}>
            <Card.Content>
              <Title>No Stocks in Watchlist</Title>
              <Paragraph>
                Add stocks to your watchlist to track their performance.
              </Paragraph>
            </Card.Content>
            <Card.Actions>
              <Button
                mode="contained"
                onPress={() => setSearchVisible(true)}
              >
                Add Your First Stock
              </Button>
            </Card.Actions>
          </Card>
        )}

        {/* Quick Actions */}
        <Card style={styles.card}>
          <Card.Content>
            <Title>Quick Actions</Title>
            <View style={styles.quickActions}>
              <Button
                mode="outlined"
                onPress={() => navigation.navigate('News')}
                style={styles.actionButton}
              >
                Market News
              </Button>
              <Button
                mode="outlined"
                onPress={() => navigation.navigate('Analysis')}
                style={styles.actionButton}
              >
                Technical Analysis
              </Button>
              <Button
                mode="outlined"
                onPress={() => navigation.navigate('Alerts')}
                style={styles.actionButton}
              >
                Price Alerts
              </Button>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>

      {/* Floating Action Button */}
      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => setSearchVisible(true)}
        label="Add Stock"
      />

      {/* Search Modal */}
      <SearchModal
        visible={searchVisible}
        onDismiss={() => setSearchVisible(false)}
        onAddStock={(symbol) => {
          // This will trigger the addToWatchlist action
          console.log('Add stock:', symbol);
          setSearchVisible(false);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  summaryCard: {
    margin: 16,
    padding: 16,
    borderRadius: 8,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  card: {
    margin: 16,
    marginTop: 0,
  },
  watchlistHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  stocksList: {
    paddingHorizontal: 16,
  },
  errorText: {
    color: '#F44336',
    textAlign: 'center',
    marginVertical: 8,
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  actionButton: {
    marginRight: 8,
    marginBottom: 8,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});