import type { Meta, StoryObj } from '@storybook/react';
import { StockChart } from '@mobile/components/StockChart';

// モックデータ
const mockChartData = [
  { date: '2024-01-01T09:30:00Z', open: 145.30, high: 147.80, low: 144.20, close: 146.50, volume: 2543210 },
  { date: '2024-01-01T10:00:00Z', open: 146.50, high: 148.90, low: 146.10, close: 148.20, volume: 1876540 },
  { date: '2024-01-01T10:30:00Z', open: 148.20, high: 149.75, low: 147.30, close: 148.90, volume: 2134567 },
  { date: '2024-01-01T11:00:00Z', open: 148.90, high: 150.20, low: 148.50, close: 149.80, volume: 1987432 },
  { date: '2024-01-01T11:30:00Z', open: 149.80, high: 151.45, low: 149.20, close: 151.10, volume: 2456789 },
  { date: '2024-01-01T12:00:00Z', open: 151.10, high: 152.30, low: 150.60, close: 151.85, volume: 1765432 },
  { date: '2024-01-01T12:30:00Z', open: 151.85, high: 153.20, low: 151.40, close: 152.95, volume: 2098765 },
  { date: '2024-01-01T13:00:00Z', open: 152.95, high: 154.10, low: 152.30, close: 153.60, volume: 1654321 },
  { date: '2024-01-01T13:30:00Z', open: 153.60, high: 155.25, low: 153.10, close: 154.80, volume: 2345678 },
  { date: '2024-01-01T14:00:00Z', open: 154.80, high: 156.40, low: 154.20, close: 155.90, volume: 1876543 },
  { date: '2024-01-01T14:30:00Z', open: 155.90, high: 157.15, low: 155.30, close: 156.75, volume: 2123456 },
  { date: '2024-01-01T15:00:00Z', open: 156.75, high: 158.50, low: 156.40, close: 157.85, volume: 1987654 },
  { date: '2024-01-01T15:30:00Z', open: 157.85, high: 159.20, low: 157.40, close: 158.60, volume: 1765432 },
  { date: '2024-01-01T16:00:00Z', open: 158.60, high: 160.30, low: 158.20, close: 159.95, volume: 2456789 },
];

const mockWeeklyData = [
  { date: '2024-01-01', open: 145.30, high: 159.95, low: 143.20, close: 159.95, volume: 45234567 },
  { date: '2024-01-08', open: 159.95, high: 165.40, low: 157.30, close: 163.25, volume: 52876543 },
  { date: '2024-01-15', open: 163.25, high: 168.90, low: 161.80, close: 167.50, volume: 48765432 },
  { date: '2024-01-22', open: 167.50, high: 172.30, low: 165.20, close: 170.85, volume: 51234567 },
  { date: '2024-01-29', open: 170.85, high: 175.60, low: 169.40, close: 174.20, volume: 49876543 },
  { date: '2024-02-05', open: 174.20, high: 178.90, low: 172.80, close: 177.45, volume: 53456789 },
  { date: '2024-02-12', open: 177.45, high: 182.10, low: 175.60, close: 180.30, volume: 47123456 },
];

const mockMonthlyData = [
  { date: '2023-07-01', open: 120.50, high: 135.80, low: 118.20, close: 132.45, volume: 156234567 },
  { date: '2023-08-01', open: 132.45, high: 145.90, low: 128.30, close: 142.85, volume: 164567890 },
  { date: '2023-09-01', open: 142.85, high: 148.20, low: 138.90, close: 145.60, volume: 148765432 },
  { date: '2023-10-01', open: 145.60, high: 152.30, low: 141.80, close: 149.95, volume: 171234567 },
  { date: '2023-11-01', open: 149.95, high: 158.70, low: 146.40, close: 156.30, volume: 158976543 },
  { date: '2023-12-01', open: 156.30, high: 163.85, low: 153.60, close: 161.75, volume: 175432109 },
  { date: '2024-01-01', open: 161.75, high: 180.30, low: 159.20, close: 177.95, volume: 182567890 },
];

const meta: Meta<typeof StockChart> = {
  title: 'Mobile/Components/StockChart',
  component: StockChart,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
StockChartコンポーネントは、株価データをインタラクティブなチャートで表示するモバイル向けコンポーネントです。

## 主な機能
- 📈 **ラインチャート**: シンプルな価格推移表示
- 🕯️ **ローソク足チャート**: OHLC（四本値）表示（実装予定）
- 📅 **期間選択**: 1D, 1W, 1M, 3M, 1Y
- 🎛️ **インタラクティブ**: タッチジェスチャー対応
- 📊 **統計情報**: 高値・安値・出来高表示
- 🎨 **テーマ対応**: ライト・ダークテーマ

## 使用例
\`\`\`tsx
import { StockChart } from '@mobile/components/StockChart';

<StockChart
  data={chartData}
  symbol="AAPL"
  chartType="line"
  period="1M"
/>
\`\`\`

## プラットフォーム対応
- ✅ React Native (iOS/Android)
- ✅ Expo Web
- ⚠️ Web版は一部機能制限あり
        `,
      },
    },
    backgrounds: {
      default: 'light',
    },
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
  tags: ['autodocs'],
  argTypes: {
    data: {
      description: 'チャートデータ配列',
      control: { type: 'object' },
    },
    symbol: {
      description: '株式シンボル',
      control: { type: 'text' },
    },
    chartType: {
      description: 'チャートタイプ',
      control: { type: 'select' },
      options: ['line', 'candlestick'],
    },
    period: {
      description: '表示期間',
      control: { type: 'select' },
      options: ['1D', '1W', '1M', '3M', '1Y'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof StockChart>;

// 基本的なラインチャート
export const LineChart: Story = {
  args: {
    data: mockChartData,
    symbol: 'AAPL',
    chartType: 'line',
    period: '1D',
  },
  parameters: {
    docs: {
      description: {
        story: '基本的なラインチャート表示。1日の株価推移を30分間隔で表示。',
      },
    },
  },
};

// ローソク足チャート（実装予定）
export const CandlestickChart: Story = {
  args: {
    data: mockWeeklyData,
    symbol: 'TSLA',
    chartType: 'candlestick',
    period: '1W',
  },
  parameters: {
    docs: {
      description: {
        story: 'ローソク足チャート（実装予定）。OHLC（四本値）データを視覚的に表示。',
      },
    },
  },
};

// 週間データ
export const WeeklyData: Story = {
  args: {
    data: mockWeeklyData,
    symbol: 'GOOGL',
    chartType: 'line',
    period: '1W',
  },
  parameters: {
    docs: {
      description: {
        story: '週間データ表示。1週間の株価推移を日次で表示。',
      },
    },
  },
};

// 月間データ
export const MonthlyData: Story = {
  args: {
    data: mockMonthlyData,
    symbol: 'MSFT',
    chartType: 'line',
    period: '1M',
  },
  parameters: {
    docs: {
      description: {
        story: '月間データ表示。数か月の株価推移を月次で表示。',
      },
    },
  },
};

// 上昇トレンド
export const UpwardTrend: Story = {
  args: {
    data: mockMonthlyData,
    symbol: 'AMZN',
    chartType: 'line',
    period: '1M',
  },
  parameters: {
    docs: {
      description: {
        story: '上昇トレンドのデータ表示。価格が継続的に上昇している銘柄。',
      },
    },
    backgrounds: {
      default: 'light',
    },
  },
};

// 下降トレンド
export const DownwardTrend: Story = {
  args: {
    data: mockMonthlyData.map(item => ({
      ...item,
      open: 200 - item.open,
      high: 200 - item.high,
      low: 200 - item.low,
      close: 200 - item.close,
    })).reverse(),
    symbol: 'NFLX',
    chartType: 'line',
    period: '1M',
  },
  parameters: {
    docs: {
      description: {
        story: '下降トレンドのデータ表示。価格が継続的に下落している銘柄。',
      },
    },
  },
};

// データなし状態
export const NoData: Story = {
  args: {
    data: [],
    symbol: 'UNKNOWN',
    chartType: 'line',
    period: '1D',
  },
  parameters: {
    docs: {
      description: {
        story: 'データが利用できない場合の表示。エラー状態のハンドリング。',
      },
    },
  },
};

// 単一データポイント
export const SingleDataPoint: Story = {
  args: {
    data: [mockChartData[0]],
    symbol: 'BTC',
    chartType: 'line',
    period: '1D',
  },
  parameters: {
    docs: {
      description: {
        story: '単一のデータポイントしかない場合の表示。最小限のデータでの表示例。',
      },
    },
  },
};

// 高ボラティリティ
export const HighVolatility: Story = {
  args: {
    data: mockChartData.map((item, index) => ({
      ...item,
      high: item.high + Math.sin(index) * 10,
      low: item.low - Math.cos(index) * 8,
      close: item.close + Math.sin(index * 0.5) * 15,
    })),
    symbol: 'GME',
    chartType: 'line',
    period: '1D',
  },
  parameters: {
    docs: {
      description: {
        story: '高ボラティリティ銘柄の表示例。大きな価格変動を持つデータ。',
      },
    },
  },
};

// ダークテーマ
export const DarkTheme: Story = {
  args: {
    data: mockWeeklyData,
    symbol: 'AAPL',
    chartType: 'line',
    period: '1W',
  },
  parameters: {
    backgrounds: {
      default: 'dark',
    },
    docs: {
      description: {
        story: 'ダークテーマでの表示例。夜間モードや省電力表示に適している。',
      },
    },
  },
};

// 大量データ
export const LargeDataset: Story = {
  args: {
    data: Array.from({ length: 100 }, (_, index) => {
      const basePrice = 150;
      const trend = index * 0.1;
      const noise = Math.sin(index * 0.3) * 5 + Math.random() * 2;
      const price = basePrice + trend + noise;
      
      return {
        date: new Date(Date.now() - (100 - index) * 24 * 60 * 60 * 1000).toISOString(),
        open: price - Math.random() * 2,
        high: price + Math.random() * 3,
        low: price - Math.random() * 3,
        close: price,
        volume: Math.floor(1000000 + Math.random() * 2000000),
      };
    }),
    symbol: 'SPY',
    chartType: 'line',
    period: '3M',
  },
  parameters: {
    docs: {
      description: {
        story: '大量データ（100ポイント）での表示例。パフォーマンステスト用。',
      },
    },
  },
};

// インタラクション例
export const Interactive: Story = {
  args: {
    data: mockWeeklyData,
    symbol: 'INTERACTIVE',
    chartType: 'line',
    period: '1W',
  },
  parameters: {
    docs: {
      description: {
        story: `
インタラクティブなチャート例。以下の操作が可能：

- **期間切り替え**: 上部のボタンで表示期間を変更
- **チャートタイプ**: Line/Candlestick切り替え
- **タッチ操作**: モバイルでのピンチ・パン（実装予定）
- **データポイント**: タップで詳細表示（実装予定）

## 今後の実装予定
- ✅ 基本チャート表示
- 🔄 ローソク足チャート
- 🔄 タッチジェスチャー
- 🔄 ズーム・パン
- 🔄 詳細情報表示
- 🔄 テクニカル指標
        `,
      },
    },
  },
  play: async ({ canvasElement }) => {
    // インタラクションテストのロジック（今後実装）
  },
};