import React, { useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { LineChart, CandlestickChart } from 'react-native-chart-kit';
import { Surface, Text, SegmentedButtons } from 'react-native-paper';

interface ChartData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface StockChartProps {
  data: ChartData[];
  symbol: string;
  chartType?: 'line' | 'candlestick';
  period?: '1D' | '1W' | '1M' | '3M' | '1Y';
}

const screenWidth = Dimensions.get('window').width;

export const StockChart: React.FC<StockChartProps> = ({
  data,
  symbol,
  chartType = 'line',
  period = '1M',
}) => {
  const [selectedChartType, setSelectedChartType] = React.useState(chartType);
  const [selectedPeriod, setSelectedPeriod] = React.useState(period);

  const chartConfig = {
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
    decimalPlaces: 2,
    propsForLabels: {
      fontSize: 10,
    },
    propsForVerticalLabels: {
      fontSize: 8,
    },
  };

  const lineChartData = useMemo(() => {
    if (!data || data.length === 0) {
      return {
        labels: [''],
        datasets: [{
          data: [0],
        }],
      };
    }

    // Sample data points based on period
    const sampleSize = period === '1D' ? data.length : Math.min(data.length, 50);
    const step = Math.max(1, Math.floor(data.length / sampleSize));
    const sampledData = data.filter((_, index) => index % step === 0);

    const labels = sampledData.map((item, index) => {
      const date = new Date(item.date);
      if (period === '1D') {
        return date.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
      } else if (period === '1W') {
        return date.toLocaleDateString('en-US', { 
          weekday: 'short' 
        });
      } else {
        return date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        });
      }
    });

    return {
      labels,
      datasets: [
        {
          data: sampledData.map(item => item.close),
          color: (opacity = 1) => {
            const firstPrice = sampledData[0]?.close || 0;
            const lastPrice = sampledData[sampledData.length - 1]?.close || 0;
            const isPositive = lastPrice >= firstPrice;
            return isPositive 
              ? `rgba(76, 175, 80, ${opacity})` 
              : `rgba(244, 67, 54, ${opacity})`;
          },
          strokeWidth: 2,
        },
      ],
    };
  }, [data, period]);

  const candlestickData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    return data.map(item => ({
      shadowH: item.high,
      shadowL: item.low,
      open: item.open,
      close: item.close,
    }));
  }, [data]);

  const getPriceChange = () => {
    if (!data || data.length < 2) return { change: 0, percentage: 0 };
    
    const firstPrice = data[0].close;
    const lastPrice = data[data.length - 1].close;
    const change = lastPrice - firstPrice;
    const percentage = (change / firstPrice) * 100;
    
    return { change, percentage };
  };

  const { change, percentage } = getPriceChange();
  const isPositive = change >= 0;

  const periodOptions = [
    { value: '1D', label: '1D' },
    { value: '1W', label: '1W' },
    { value: '1M', label: '1M' },
    { value: '3M', label: '3M' },
    { value: '1Y', label: '1Y' },
  ];

  const chartTypeOptions = [
    { value: 'line', label: 'Line' },
    { value: 'candlestick', label: 'Candle' },
  ];

  return (
    <Surface style={styles.container}>
      {/* Chart Header */}
      <View style={styles.header}>
        <View style={styles.priceInfo}>
          <Text variant="titleLarge" style={styles.symbol}>
            {symbol}
          </Text>
          <View style={styles.changeContainer}>
            <Text
              variant="bodyMedium"
              style={[
                styles.change,
                { color: isPositive ? '#4CAF50' : '#F44336' }
              ]}
            >
              {isPositive ? '+' : ''}${change.toFixed(2)} ({isPositive ? '+' : ''}{percentage.toFixed(2)}%)
            </Text>
          </View>
        </View>
      </View>

      {/* Period Selector */}
      <View style={styles.controls}>
        <SegmentedButtons
          value={selectedPeriod}
          onValueChange={setSelectedPeriod}
          buttons={periodOptions}
          style={styles.periodSelector}
        />
      </View>

      {/* Chart Type Selector */}
      <View style={styles.controls}>
        <SegmentedButtons
          value={selectedChartType}
          onValueChange={setSelectedChartType}
          buttons={chartTypeOptions}
          style={styles.chartTypeSelector}
        />
      </View>

      {/* Chart */}
      <View style={styles.chartContainer}>
        {data && data.length > 0 ? (
          selectedChartType === 'line' ? (
            <LineChart
              data={lineChartData}
              width={screenWidth - 32}
              height={220}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
              withDots={false}
              withShadow={false}
              withInnerLines={false}
              withOuterLines={false}
              withVerticalLines={false}
              withHorizontalLines={true}
            />
          ) : (
            <View style={styles.candlestickContainer}>
              <Text style={styles.comingSoon}>
                Candlestick chart coming soon
              </Text>
            </View>
          )
        ) : (
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataText}>No chart data available</Text>
          </View>
        )}
      </View>

      {/* Chart Stats */}
      {data && data.length > 0 && (
        <View style={styles.stats}>
          <View style={styles.statItem}>
            <Text variant="labelSmall" style={styles.statLabel}>High</Text>
            <Text variant="bodySmall" style={styles.statValue}>
              ${Math.max(...data.map(d => d.high)).toFixed(2)}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text variant="labelSmall" style={styles.statLabel}>Low</Text>
            <Text variant="bodySmall" style={styles.statValue}>
              ${Math.min(...data.map(d => d.low)).toFixed(2)}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text variant="labelSmall" style={styles.statLabel}>Volume</Text>
            <Text variant="bodySmall" style={styles.statValue}>
              {(data[data.length - 1]?.volume || 0).toLocaleString()}
            </Text>
          </View>
        </View>
      )}
    </Surface>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 16,
    padding: 16,
    borderRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  priceInfo: {
    flex: 1,
  },
  symbol: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  change: {
    fontWeight: '600',
  },
  controls: {
    marginBottom: 16,
  },
  periodSelector: {
    marginBottom: 8,
  },
  chartTypeSelector: {
    marginBottom: 8,
  },
  chartContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  chart: {
    borderRadius: 8,
  },
  candlestickContainer: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    width: screenWidth - 64,
  },
  comingSoon: {
    color: '#666',
    fontStyle: 'italic',
  },
  noDataContainer: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    width: screenWidth - 64,
  },
  noDataText: {
    color: '#666',
    textAlign: 'center',
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    color: '#666',
    marginBottom: 4,
  },
  statValue: {
    fontWeight: '600',
  },
});