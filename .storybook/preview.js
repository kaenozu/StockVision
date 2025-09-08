import React from 'react';
import { addons } from '@storybook/addons';
import { DARK_MODE_EVENT_NAME } from 'storybook-dark-mode';
import { themes } from '@storybook/theming';

// グローバルCSS
import '../frontend/src/index.css';

// React Native Paper のテーマプロバイダー（モバイルコンポーネント用）
import { Provider as PaperProvider, MD3LightTheme, MD3DarkTheme } from 'react-native-paper';

// Material-UI のテーマプロバイダー（Webコンポーネント用）
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

// Redux Provider
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

// Custom hooks and utilities
import { MemoryRouter } from 'react-router-dom';

// カスタムテーマ定義
const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#2196F3',
    },
    secondary: {
      main: '#FF9800',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          textTransform: 'none',
          fontWeight: 500,
        },
      },
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 300,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 300,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.5,
    },
  },
});

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#90CAF9',
    },
    secondary: {
      main: '#FFB74D',
    },
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          backgroundColor: '#1e1e1e',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          textTransform: 'none',
          fontWeight: 500,
        },
      },
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
});

// React Native Paper テーマ
const paperLightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#2196F3',
    secondary: '#FF9800',
  },
};

const paperDarkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#90CAF9',
    secondary: '#FFB74D',
  },
};

// デモストア（実際のストアの簡易版）
const demoStore = configureStore({
  reducer: {
    stocks: (state = { watchlist: ['AAPL', 'GOOGL'], quotes: {} }, action) => state,
    auth: (state = { user: { name: 'Demo User' }, isAuthenticated: true }, action) => state,
    settings: (state = { theme: 'light', language: 'ja' }, action) => state,
  },
});

// デコレータ関数
const withTheme = (Story, context) => {
  const [isDark, setIsDark] = React.useState(false);
  
  // ダークモード切り替えのリスナー
  React.useEffect(() => {
    const channel = addons.getChannel();
    const handler = (isDark) => setIsDark(isDark);
    channel.on(DARK_MODE_EVENT_NAME, handler);
    return () => channel.off(DARK_MODE_EVENT_NAME, handler);
  }, []);
  
  const muiTheme = isDark ? darkTheme : lightTheme;
  const paperTheme = isDark ? paperDarkTheme : paperLightTheme;
  
  return (
    <ThemeProvider theme={muiTheme}>
      <PaperProvider theme={paperTheme}>
        <CssBaseline />
        <div style={{ 
          backgroundColor: muiTheme.palette.background.default,
          minHeight: '100vh',
          padding: '20px'
        }}>
          <Story {...context} />
        </div>
      </PaperProvider>
    </ThemeProvider>
  );
};

const withRedux = (Story, context) => (
  <Provider store={demoStore}>
    <Story {...context} />
  </Provider>
);

const withRouter = (Story, context) => (
  <MemoryRouter>
    <Story {...context} />
  </MemoryRouter>
);

// Mock data provider
const withMockData = (Story, context) => {
  // グローバルなモックデータを設定
  if (typeof window !== 'undefined') {
    window.mockStockData = {
      'AAPL': {
        symbol: 'AAPL',
        price: 150.25,
        change: 2.34,
        changePercent: 1.58,
        volume: 45234567,
        high: 152.10,
        low: 148.90,
        open: 149.50,
        previousClose: 147.91,
      },
      'GOOGL': {
        symbol: 'GOOGL',
        price: 2745.50,
        change: -15.25,
        changePercent: -0.55,
        volume: 1234567,
        high: 2760.00,
        low: 2740.00,
        open: 2755.00,
        previousClose: 2760.75,
      },
    };
    
    window.mockChartData = [
      { date: '2024-01-01', open: 145, high: 150, low: 144, close: 149, volume: 1000000 },
      { date: '2024-01-02', open: 149, high: 152, low: 148, close: 151, volume: 1100000 },
      { date: '2024-01-03', open: 151, high: 153, low: 150, close: 152, volume: 950000 },
    ];
  }
  
  return <Story {...context} />;
};

// Storybook設定
export const parameters = {
  // アクション設定
  actions: { argTypesRegex: '^on[A-Z].*' },
  
  // コントロール設定
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/,
    },
    expanded: true,
    sort: 'requiredFirst',
  },
  
  // ビューポート設定
  viewport: {
    viewports: {
      mobile1: {
        name: 'Small Mobile',
        styles: { width: '320px', height: '568px' },
      },
      mobile2: {
        name: 'Large Mobile',
        styles: { width: '414px', height: '896px' },
      },
      tablet: {
        name: 'Tablet',
        styles: { width: '768px', height: '1024px' },
      },
      desktop: {
        name: 'Desktop',
        styles: { width: '1024px', height: '768px' },
      },
      wide: {
        name: 'Wide Desktop',
        styles: { width: '1440px', height: '900px' },
      },
    },
  },
  
  // 背景設定
  backgrounds: {
    default: 'light',
    values: [
      { name: 'light', value: '#f5f5f5' },
      { name: 'dark', value: '#121212' },
      { name: 'white', value: '#ffffff' },
      { name: 'grey', value: '#cccccc' },
    ],
  },
  
  // ドキュメント設定
  docs: {
    theme: themes.light,
    source: {
      state: 'open',
    },
    toc: {
      contentsSelector: '.sbdocs-content',
      headingSelector: 'h1, h2, h3',
      ignoreSelector: '#primary',
      title: 'Table of Contents',
      disable: false,
    },
  },
  
  // ツールバー設定
  toolbar: {
    title: { hidden: false },
    zoom: { hidden: false },
    eject: { hidden: false },
    copy: { hidden: false },
    fullscreen: { hidden: false },
  },
  
  // アクセシビリティ設定
  a11y: {
    config: {},
    options: {
      checks: { 'color-contrast': { options: { noScroll: true } } },
      restoreScroll: true,
    },
  },
  
  // 測定ツール設定
  measure: {
    results: {
      precision: 2,
      fontSize: 12,
    },
  },
  
  // レイアウト設定
  layout: 'centered',
  
  // オプション
  options: {
    storySort: {
      order: [
        'Introduction',
        'Design System',
        ['Colors', 'Typography', 'Spacing', 'Icons'],
        'Components',
        ['Basic', 'Forms', 'Data Display', 'Navigation', 'Feedback'],
        'Pages',
        ['Web', 'Mobile'],
        'Examples',
      ],
    },
  },
};

// デコレータの適用順序は重要
export const decorators = [
  withMockData,
  withRedux,
  withRouter,
  withTheme,
];

// グローバル引数タイプ
export const argTypes = {
  theme: {
    control: {
      type: 'select',
      options: ['light', 'dark'],
    },
    defaultValue: 'light',
  },
  platform: {
    control: {
      type: 'select',
      options: ['web', 'mobile'],
    },
    defaultValue: 'web',
  },
  locale: {
    control: {
      type: 'select',
      options: ['ja', 'en', 'zh'],
    },
    defaultValue: 'ja',
  },
};

// Storybookの起動時に実行される設定
export const loaders = [
  async () => ({
    // 必要に応じて非同期データ読み込み
  }),
];

// ストーリーのメタ情報設定
export const tags = ['autodocs'];