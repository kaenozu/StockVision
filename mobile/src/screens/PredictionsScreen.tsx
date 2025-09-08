/**
 * Predictions Screen - AI-powered stock predictions
 * Shows ML predictions, confidence scores, and historical accuracy
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, ScrollView } from 'react-native';
import { 
  Text, 
  Card, 
  Button,
  Chip,
  Surface,
  useTheme,
  ProgressBar,
  Divider,
  IconButton
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { LinearGradient } from 'expo-linear-gradient';

import { RootState } from '../store/store';
import { PredictionCard } from '../components/PredictionCard';
import { AccuracyChart } from '../components/AccuracyChart';
import { EmptyState } from '../components/EmptyState';
import { LoadingSpinner } from '../components/LoadingSpinner';
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
  horizon: '1h' | '1d' | '1w' | '1m';
  modelUsed: string;
  featuresUsed: string[];
  timestamp: string;
  accuracy?: number;
  isHistorical?: boolean;
}

interface ModelStats {
  modelName: string;
  accuracy: number;
  totalPredictions: number;
  successfulPredictions: number;
  averageConfidence: number;
  lastUpdate: string;
}

const MOCK_PREDICTIONS: Prediction[] = [
  {
    id: '1',
    symbol: 'AAPL',
    name: 'Apple Inc.',
    currentPrice: 175.25,
    predictedPrice: 182.40,
    change: 7.15,
    changePercent: 4.08,
    confidence: 0.78,
    direction: 'up',
    horizon: '1d',
    modelUsed: 'Random Forest',
    featuresUsed: ['RSI', 'MACD', 'Volume', 'SMA_20', 'BB_Position'],
    timestamp: new Date().toISOString(),
    accuracy: 72,
  },
  {
    id: '2',
    symbol: 'GOOGL',
    name: 'Alphabet Inc.',
    currentPrice: 132.15,
    predictedPrice: 128.90,
    change: -3.25,
    changePercent: -2.46,
    confidence: 0.65,
    direction: 'down',
    horizon: '1d',
    modelUsed: 'Gradient Boosting',
    featuresUsed: ['Momentum', 'ATR', 'Volume_Ratio', 'EMA_12', 'Stoch_K'],
    timestamp: new Date().toISOString(),
    accuracy: 68,
  },
  {
    id: '3',
    symbol: 'TSLA',
    name: 'Tesla Inc.',
    currentPrice: 242.80,
    predictedPrice: 255.30,
    change: 12.50,
    changePercent: 5.15,
    confidence: 0.82,
    direction: 'up',
    horizon: '1w',
    modelUsed: 'Ensemble',
    featuresUsed: ['Price_Momentum', 'News_Sentiment', 'Options_Flow'],
    timestamp: new Date().toISOString(),
    accuracy: 75,
  },
];

const MOCK_MODEL_STATS: ModelStats[] = [
  {
    modelName: 'Random Forest',
    accuracy: 72.4,
    totalPredictions: 1247,
    successfulPredictions: 903,
    averageConfidence: 0.71,
    lastUpdate: new Date().toISOString(),
  },
  {
    modelName: 'Gradient Boosting',
    accuracy: 68.9,
    totalPredictions: 1156,
    successfulPredictions: 796,
    averageConfidence: 0.67,
    lastUpdate: new Date().toISOString(),
  },
  {
    modelName: 'Ensemble',
    accuracy: 75.8,
    totalPredictions: 892,
    successfulPredictions: 676,
    averageConfidence: 0.79,
    lastUpdate: new Date().toISOString(),
  },
];

export const PredictionsScreen: React.FC = () => {
  const theme = useTheme();
  
  const watchlist = useSelector((state: RootState) => state.stocks.watchlist);
  
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [modelStats, setModelStats] = useState<ModelStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedHorizon, setSelectedHorizon] = useState<'1h' | '1d' | '1w' | '1m'>('1d');
  const [selectedModel, setSelectedModel] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'predictions' | 'accuracy'>('predictions');

  useEffect(() => {
    loadPredictions();
    loadModelStats();
  }, [selectedHorizon, selectedModel]);

  const loadPredictions = useCallback(async () => {
    setLoading(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Filter predictions based on selected criteria
      let filteredPredictions = MOCK_PREDICTIONS.filter(p => p.horizon === selectedHorizon);
      
      if (selectedModel !== 'all') {
        filteredPredictions = filteredPredictions.filter(p => 
          p.modelUsed.toLowerCase().includes(selectedModel.toLowerCase())
        );
      }
      
      setPredictions(filteredPredictions);
    } catch (error) {
      console.error('Failed to load predictions:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedHorizon, selectedModel]);

  const loadModelStats = useCallback(async () => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      setModelStats(MOCK_MODEL_STATS);
    } catch (error) {
      console.error('Failed to load model stats:', error);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadPredictions(), loadModelStats()]);
    setRefreshing(false);
  }, [loadPredictions, loadModelStats]);

  const generatePredictions = useCallback(async () => {
    setLoading(true);
    
    try {
      // Generate predictions for watchlist stocks
      const symbols = watchlist.map(item => item.symbol);
      
      // Simulate API call to ML backend
      console.log('Generating predictions for:', symbols);
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Refresh predictions
      await loadPredictions();
    } catch (error) {
      console.error('Failed to generate predictions:', error);
    } finally {
      setLoading(false);
    }
  }, [watchlist, loadPredictions]);

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return theme.colors.profit;
    if (confidence >= 0.6) return theme.colors.tertiary;
    return theme.colors.loss;
  };

  const renderHorizonChips = () => (
    <View style={styles.chipContainer}>
      {(['1h', '1d', '1w', '1m'] as const).map((horizon) => (
        <Chip
          key={horizon}
          selected={selectedHorizon === horizon}
          onPress={() => setSelectedHorizon(horizon)}
          style={styles.chip}
        >
          {horizon === '1h' ? '1 Hour' : 
           horizon === '1d' ? '1 Day' :
           horizon === '1w' ? '1 Week' : '1 Month'}
        </Chip>
      ))}
    </View>
  );

  const renderModelFilter = () => (
    <View style={styles.chipContainer}>
      <Chip
        selected={selectedModel === 'all'}
        onPress={() => setSelectedModel('all')}
        style={styles.chip}
      >
        All Models
      </Chip>
      <Chip
        selected={selectedModel === 'random_forest'}
        onPress={() => setSelectedModel('random_forest')}
        style={styles.chip}
      >
        Random Forest
      </Chip>
      <Chip
        selected={selectedModel === 'gradient'}
        onPress={() => setSelectedModel('gradient')}
        style={styles.chip}
      >
        Gradient Boosting
      </Chip>
      <Chip
        selected={selectedModel === 'ensemble'}
        onPress={() => setSelectedModel('ensemble')}
        style={styles.chip}
      >
        Ensemble
      </Chip>
    </View>
  );

  const renderOverallStats = () => {
    const avgAccuracy = modelStats.reduce((sum, model) => sum + model.accuracy, 0) / modelStats.length;
    const totalPredictions = modelStats.reduce((sum, model) => sum + model.totalPredictions, 0);
    const avgConfidence = modelStats.reduce((sum, model) => sum + model.averageConfidence, 0) / modelStats.length;

    return (
      <Card style={styles.statsCard}>
        <Card.Content>
          <Text style={[typography.titleMedium, styles.statsTitle]}>
            Overall Performance
          </Text>
          
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[typography.headlineSmall, { color: getConfidenceColor(avgAccuracy / 100) }]}>
                {avgAccuracy.toFixed(1)}%
              </Text>
              <Text style={[typography.bodySmall, styles.statLabel]}>
                Average Accuracy
              </Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={[typography.headlineSmall, { color: theme.colors.primary }]}>
                {totalPredictions.toLocaleString()}
              </Text>
              <Text style={[typography.bodySmall, styles.statLabel]}>
                Total Predictions
              </Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={[typography.headlineSmall, { color: getConfidenceColor(avgConfidence) }]}>
                {(avgConfidence * 100).toFixed(0)}%
              </Text>
              <Text style={[typography.bodySmall, styles.statLabel]}>
                Avg Confidence
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>
    );
  };

  const renderModelStats = () => (
    <View>
      {modelStats.map((model) => (
        <Card key={model.modelName} style={styles.modelCard}>
          <Card.Content>
            <View style={styles.modelHeader}>
              <Text style={typography.titleMedium}>{model.modelName}</Text>
              <View style={styles.accuracyBadge}>
                <Text style={[typography.labelSmall, { color: theme.colors.onPrimary }]}>
                  {model.accuracy.toFixed(1)}%
                </Text>
              </View>
            </View>
            
            <ProgressBar 
              progress={model.accuracy / 100} 
              color={getConfidenceColor(model.accuracy / 100)}
              style={styles.progressBar}
            />
            
            <View style={styles.modelDetails}>
              <Text style={[typography.bodySmall, styles.detailText]}>
                {model.successfulPredictions}/{model.totalPredictions} successful predictions
              </Text>
              <Text style={[typography.bodySmall, styles.detailText]}>
                Avg confidence: {(model.averageConfidence * 100).toFixed(0)}%
              </Text>
            </View>
          </Card.Content>
        </Card>
      ))}
    </View>
  );

  const renderPredictions = () => {
    if (loading) {
      return <LoadingSpinner message="Generating predictions..." />;
    }

    if (predictions.length === 0) {
      return (
        <EmptyState
          icon="crystal-ball"
          title="No Predictions Available"
          subtitle={`No ${selectedHorizon} predictions found for selected criteria`}
          actionLabel="Generate Predictions"
          onAction={generatePredictions}
        />
      );
    }

    return (
      <FlatList
        data={predictions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PredictionCard
            prediction={item}
            onPress={() => {/* Navigate to detail */}}
          />
        )}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  const renderContent = () => {
    if (viewMode === 'accuracy') {
      return (
        <ScrollView 
          style={styles.container}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[theme.colors.primary]}
            />
          }
        >
          {renderOverallStats()}
          {renderModelStats()}
          <AccuracyChart data={modelStats} />
        </ScrollView>
      );
    }

    return (
      <View style={styles.container}>
        {renderHorizonChips()}
        {renderModelFilter()}
        {renderPredictions()}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Surface style={styles.header}>
        <View style={styles.viewToggle}>
          <Button
            mode={viewMode === 'predictions' ? 'contained' : 'outlined'}
            onPress={() => setViewMode('predictions')}
            style={styles.toggleButton}
            compact
          >
            Predictions
          </Button>
          <Button
            mode={viewMode === 'accuracy' ? 'contained' : 'outlined'}
            onPress={() => setViewMode('accuracy')}
            style={styles.toggleButton}
            compact
          >
            Accuracy
          </Button>
        </View>
        
        <IconButton
          icon="refresh"
          onPress={handleRefresh}
          disabled={loading}
        />
      </Surface>

      {renderContent()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  viewToggle: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  toggleButton: {
    minWidth: 100,
  },
  chipContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  chip: {
    marginRight: spacing.sm,
  },
  listContainer: {
    padding: spacing.md,
  },
  statsCard: {
    margin: spacing.md,
    marginBottom: spacing.sm,
  },
  statsTitle: {
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    marginTop: spacing.xs,
    textAlign: 'center',
    opacity: 0.7,
  },
  modelCard: {
    margin: spacing.md,
    marginBottom: spacing.sm,
  },
  modelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  accuracyBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  progressBar: {
    marginBottom: spacing.sm,
  },
  modelDetails: {
    gap: spacing.xs,
  },
  detailText: {
    opacity: 0.7,
  },
});