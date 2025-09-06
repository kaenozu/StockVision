import type { Meta, StoryObj } from '@storybook/react';
import { WatchListWidget } from './WatchListWidget';

const meta = {
  title: 'Watchlist/WatchListWidget',
  component: WatchListWidget,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof WatchListWidget>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

export const Loading: Story = {
  args: {},
  parameters: {
    mockData: [
      {
        url: 'http://localhost:8000/api/watchlist',
        method: 'GET',
        status: 200,
        response: new Promise((resolve) => setTimeout(() => resolve([]), 2000)),
      },
    ],
  },
};

export const WithItems: Story = {
  args: {},
  parameters: {
    mockData: [
      {
        url: 'http://localhost:8000/api/watchlist',
        method: 'GET',
        status: 200,
        response: [
          {
            id: 1,
            stock_code: '7203',
            notes: 'トヨタ自動車',
            created_at: '2023-10-27T10:00:00Z',
          },
          {
            id: 2,
            stock_code: '9984',
            notes: 'ソフトバンクグループ',
            created_at: '2023-10-27T10:00:00Z',
          },
        ],
      },
      {
        url: 'http://localhost:8000/api/stocks/7203/current',
        method: 'GET',
        status: 200,
        response: {
          stock_code: '7203',
          current_price: 2500.5,
          previous_close: 2450.0,
          price_change: 50.5,
          price_change_pct: 2.06,
          timestamp: '2023-10-27T10:00:00Z',
          market_status: 'open',
        },
      },
      {
        url: 'http://localhost:8000/api/stocks/9984/current',
        method: 'GET',
        status: 200,
        response: {
          stock_code: '9984',
          current_price: 1200.0,
          previous_close: 1250.0,
          price_change: -50.0,
          price_change_pct: -4.0,
          timestamp: '2023-10-27T10:00:00Z',
          market_status: 'open',
        },
      },
    ],
  },
};

export const Empty: Story = {
  args: {},
  parameters: {
    mockData: [
      {
        url: 'http://localhost:8000/api/watchlist',
        method: 'GET',
        status: 200,
        response: [],
      },
    ],
  },
};