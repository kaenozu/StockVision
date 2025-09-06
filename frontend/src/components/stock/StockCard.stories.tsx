import type { Meta, StoryObj } from '@storybook/react';
import { StockCard } from './StockCard';

const meta = {
  title: 'Stock/StockCard',
  component: StockCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    compact: {
      control: 'boolean',
    },
    loading: {
      control: 'boolean',
    },
    showWatchlistControls: {
      control: 'boolean',
    },
  },
} satisfies Meta<typeof StockCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockStockData = {
  stock_code: '7203',
  company_name: 'トヨタ自動車株式会社',
  current_price: 2500.5,
  previous_close: 2450.0,
  price_change: 50.5,
  price_change_pct: 2.06,
  volume: 1000000,
  market_cap: 3000000000000,
  day_high: 2550.0,
  day_low: 2480.0,
  year_high: 2800.0,
  year_low: 2200.0,
  avg_volume: 900000,
  pe_ratio: 15.5,
  dividend_yield: 2.5,
};

const mockCurrentPrice = {
  stock_code: '7203',
  current_price: 2500.5,
  previous_close: 2450.0,
  price_change: 50.5,
  price_change_pct: 2.06,
  timestamp: '2023-10-27T10:00:00Z',
  market_status: 'open' as const,
};

export const Default: Story = {
  args: {
    stockData: mockStockData,
    currentPrice: mockCurrentPrice,
  },
};

export const Loading: Story = {
  args: {
    loading: true,
  },
};

export const Error: Story = {
  args: {
    error: 'Failed to fetch stock data',
  },
};

export const Compact: Story = {
  args: {
    stockData: mockStockData,
    currentPrice: mockCurrentPrice,
    compact: true,
  },
};

export const WithoutWatchlistControls: Story = {
  args: {
    stockData: mockStockData,
    currentPrice: mockCurrentPrice,
    showWatchlistControls: false,
  },
};