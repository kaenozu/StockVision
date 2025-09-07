# StockVision Mobile App

React Native mobile application for real-time stock market analysis and predictions.

## Features

- 📱 **Real-time Stock Data**: Live prices, charts, and market data
- 🤖 **AI Predictions**: Machine learning-powered price forecasting  
- 📊 **Interactive Charts**: Candlestick and line charts with technical indicators
- 🔔 **Push Notifications**: Price alerts and market news
- 📰 **Market News**: Latest financial news and analysis
- 💰 **Portfolio Tracking**: Watch your favorite stocks
- 🔍 **Stock Search**: Find and analyze any stock symbol
- 🌙 **Dark/Light Theme**: Customizable interface

## Tech Stack

- **React Native**: Cross-platform mobile development
- **Expo**: Development platform and tools
- **React Navigation**: Navigation and routing
- **Redux Toolkit**: State management
- **React Native Paper**: Material Design components
- **React Native Chart Kit**: Data visualization
- **WebSocket**: Real-time data streaming

## Setup

### Prerequisites

- Node.js (v16 or later)
- npm or yarn
- Expo CLI: `npm install -g @expo/cli`
- iOS Simulator (Mac) or Android Emulator

### Installation

1. **Navigate to mobile directory**:
   ```bash
   cd mobile
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm start
   ```

4. **Run on device/simulator**:
   ```bash
   # iOS
   npm run ios
   
   # Android  
   npm run android
   
   # Web
   npm run web
   ```

## Configuration

### API Endpoint

Update the API endpoint in your environment:

```typescript
// src/config/api.ts
export const API_BASE_URL = 'http://localhost:8080/api';
export const WS_BASE_URL = 'ws://localhost:8080/ws';
```

### Push Notifications

Configure push notifications in `app.json`:

```json
{
  "expo": {
    "plugins": ["expo-notifications"]
  }
}
```

## Project Structure

```
mobile/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── StockCard.tsx
│   │   ├── StockChart.tsx
│   │   └── ...
│   ├── screens/            # Screen components
│   │   ├── HomeScreen.tsx
│   │   ├── StockDetailScreen.tsx
│   │   └── ...
│   ├── store/              # Redux store and slices
│   │   ├── store.ts
│   │   └── slices/
│   ├── services/           # API and external services
│   │   ├── ApiService.ts
│   │   ├── WebSocketService.ts
│   │   └── ...
│   ├── navigation/         # Navigation configuration
│   ├── theme/              # Theme and styling
│   └── types/              # TypeScript type definitions
├── assets/                 # Images, fonts, etc.
├── app.json               # Expo configuration
└── package.json
```

## Key Components

### StockCard
Displays stock information in a card format:
- Current price and change
- Percentage change with color coding
- Quick actions (remove, details)

### StockChart
Interactive price charts:
- Line and candlestick charts
- Multiple time periods (1D, 1W, 1M, 3M, 1Y)
- Technical indicators
- Price statistics

### HomeScreen
Main dashboard:
- Portfolio summary
- Watchlist management
- AI predictions
- Market overview
- Quick actions

## Redux Store

### Slices

- **stocks**: Stock quotes, watchlist, historical data
- **portfolio**: User portfolio and holdings
- **auth**: Authentication state
- **settings**: App preferences and configuration
- **predictions**: ML predictions and analysis

### Usage

```typescript
import { useAppSelector, useAppDispatch } from '../store/store';
import { fetchStockQuote, addToWatchlist } from '../store/slices/stocksSlice';

// In component
const dispatch = useAppDispatch();
const { watchlist, quotes } = useAppSelector(state => state.stocks);

// Dispatch actions
dispatch(fetchStockQuote('AAPL'));
dispatch(addToWatchlist('TSLA'));
```

## API Integration

### REST API
```typescript
// Get stock quote
const quote = await ApiService.getStockQuote('AAPL');

// Get historical data
const history = await ApiService.getHistoricalData('AAPL', '1y');

// Get AI prediction
const prediction = await ApiService.getPrediction('AAPL');
```

### WebSocket
```typescript
// Real-time price updates
WebSocketService.subscribe(['price:AAPL', 'news:TSLA']);
WebSocketService.on('price:AAPL', (data) => {
  // Update UI with real-time data
});
```

## Building for Production

### Android
```bash
# Build APK
npm run build:android

# Submit to Google Play
npm run submit:android
```

### iOS
```bash
# Build IPA
npm run build:ios  

# Submit to App Store
npm run submit:ios
```

## Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Type checking
npm run type-check
```

## Development Tips

1. **Hot Reload**: Code changes automatically reload
2. **Debug Menu**: Shake device or Cmd+D (iOS) / Cmd+M (Android)
3. **React Native Debugger**: Install for advanced debugging
4. **Expo DevTools**: Web interface for logs and debugging

## Troubleshooting

### Common Issues

1. **Metro bundler cache**: `npx expo start -c`
2. **Node modules**: `rm -rf node_modules && npm install`
3. **iOS build issues**: `cd ios && pod install`
4. **Android build issues**: Clean and rebuild in Android Studio

### Performance

- Use `React.memo()` for expensive components
- Implement virtualization for long lists
- Optimize images and assets
- Use Flipper for performance profiling

## Contributing

1. Follow React Native and TypeScript best practices
2. Use React Native Paper components
3. Maintain Redux state structure
4. Add tests for new features
5. Update documentation

## License

MIT License - see LICENSE file for details