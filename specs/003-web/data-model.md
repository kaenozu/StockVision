# Data Model: 株価表示Web画面

**Phase 1 Data Model Design - 2025-09-04**

## Core Entities

### 1. StockData (from API)
```typescript
interface StockData {
  stock_code: string;        // 4-digit code (e.g., "7203")
  company_name: string;      // Company name (e.g., "トヨタ自動車")  
  current_price: number;     // Current stock price
  previous_close: number;    // Previous day closing price
  price_change: number;      // Absolute price change
  price_change_pct: number;  // Percentage change
  last_updated: string;      // ISO timestamp
}
```
**Validation Rules**:
- stock_code: Must be 4-digit string matching /^[0-9]{4}$/
- current_price: Must be positive number
- price_change_pct: Range -100 to +∞

### 2. CurrentPriceResponse (from API)
```typescript
interface CurrentPriceResponse {
  stock_code: string;
  current_price: number;
  previous_close: number;
  price_change: number;
  price_change_pct: number;
  timestamp: string;        // ISO timestamp
  market_status: "open" | "closed" | "pre_market" | "after_hours";
}
```

### 3. PriceHistoryItem (from API)
```typescript
interface PriceHistoryItem {
  date: string;            // YYYY-MM-DD format
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  stock_code: string;
}
```

### 4. WatchlistItem (Client-side)
```typescript
interface WatchlistItem {
  stock_code: string;
  company_name: string;
  added_date: string;        // ISO timestamp
  alert_price?: number;      // Optional price alert
  notes?: string;           // Optional user notes
}
```
**Storage**: localStorage key `watchlist_items`
**Validation Rules**:
- Must have valid stock_code
- alert_price must be positive if provided

### 5. ChartConfig (Client-side)
```typescript
interface ChartConfig {
  timeframe: "7d" | "30d" | "90d" | "1y";
  chart_type: "line" | "candlestick";
  show_volume: boolean;
  theme: "light" | "dark";
}
```
**Default Values**: 
- timeframe: "30d"
- chart_type: "line"
- show_volume: true
- theme: "light"

### 6. UIState (Client-side Application State)
```typescript
interface AppState {
  current_stock: StockData | null;
  search_query: string;
  is_loading: boolean;
  error_message: string | null;
  watchlist: WatchlistItem[];
  chart_config: ChartConfig;
  selected_timeframe: string;
}
```

### 7. APIResponse<T> (Generic Response Wrapper)
```typescript
interface APIResponse<T> {
  data: T;
  status: "success" | "error";
  message?: string;
  timestamp: string;
}

interface APIError {
  error: string;
  detail: string;
  status_code: number;
}
```

## State Transitions

### Stock Search Flow
```
Initial State → Loading → Success/Error
- search_query: "" → "7203" → "7203"
- is_loading: false → true → false  
- current_stock: null → null → StockData|null
- error_message: null → null → string|null
```

### Watchlist Management
```
Add to Watchlist:
watchlist: [...items] → [...items, new_item]

Remove from Watchlist:  
watchlist: [...items] → items.filter(item => item.stock_code !== removed_code)

Update Alert Price:
watchlist: [...items] → items.map(item => 
  item.stock_code === target_code ? {...item, alert_price: new_price} : item
)
```

### Chart Configuration Changes
```
Timeframe Change: chart_config.timeframe: "30d" → "7d"
Chart Type Toggle: chart_config.chart_type: "line" → "candlestick"
Volume Toggle: chart_config.show_volume: true → false
```

## Data Validation Rules

### Input Validation
```typescript
const validateStockCode = (code: string): boolean => {
  return /^[0-9]{4}$/.test(code);
};

const validatePrice = (price: number): boolean => {
  return price > 0 && isFinite(price);
};

const validateTimeframe = (timeframe: string): boolean => {
  return ["7d", "30d", "90d", "1y"].includes(timeframe);
};
```

### API Response Validation
```typescript
const validateStockData = (data: any): data is StockData => {
  return (
    typeof data.stock_code === 'string' &&
    validateStockCode(data.stock_code) &&
    typeof data.company_name === 'string' &&
    typeof data.current_price === 'number' &&
    validatePrice(data.current_price) &&
    typeof data.previous_close === 'number' &&
    typeof data.price_change === 'number' &&
    typeof data.price_change_pct === 'number'
  );
};
```

## Data Transformation Patterns

### API Response to Display Format
```typescript
const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    minimumFractionDigits: 0
  }).format(price);
};

const formatPercentage = (pct: number): string => {
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(2)}%`;
};

const formatDate = (dateStr: string): string => {
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'short', 
    day: 'numeric'
  }).format(new Date(dateStr));
};
```

### Chart Data Transformation  
```typescript
const transformToChartData = (history: PriceHistoryItem[]): ChartData => {
  return {
    labels: history.map(item => formatDate(item.date)),
    datasets: [{
      label: '終値',
      data: history.map(item => item.close),
      borderColor: 'rgb(59, 130, 246)',
      backgroundColor: 'rgba(59, 130, 246, 0.1)'
    }]
  };
};
```

## Caching Strategy

### Client-Side Cache Keys
```typescript
const CACHE_KEYS = {
  STOCK_INFO: (code: string) => `stock_info_${code}`,
  PRICE_HISTORY: (code: string, days: number) => `price_history_${code}_${days}d`,
  CURRENT_PRICE: (code: string) => `current_price_${code}`,
  WATCHLIST: 'watchlist_items',
  CHART_CONFIG: 'chart_config'
} as const;
```

### Cache TTL (Time-To-Live)
```typescript
const CACHE_TTL = {
  STOCK_INFO: 5 * 60 * 1000,      // 5 minutes
  CURRENT_PRICE: 60 * 1000,       // 1 minute  
  PRICE_HISTORY: 10 * 60 * 1000,  // 10 minutes
  WATCHLIST: Infinity,            // Persistent
  CHART_CONFIG: Infinity          // Persistent
} as const;
```

## Error Handling Data Models

### Error States
```typescript
interface ComponentErrorState {
  has_error: boolean;
  error_type: "network" | "validation" | "api" | "unknown";
  error_message: string;
  retry_available: boolean;
  last_error_time: string;
}
```

### Network Error Classification
```typescript
const classifyError = (error: any): ComponentErrorState => {
  if (error.code === 'NETWORK_ERROR') {
    return {
      has_error: true,
      error_type: "network",
      error_message: "ネットワーク接続を確認してください",
      retry_available: true,
      last_error_time: new Date().toISOString()
    };
  }
  // ... other error types
};
```

## Relationship Mapping

```
StockData (1) ←→ (0..1) WatchlistItem
Current selection of a stock

PriceHistoryItem (*) ← (1) StockData  
Historical price data for a stock

ChartConfig (1) ←→ (1) AppState
Chart display preferences

APIResponse<T> ← (1) All API calls
Wrapper for all backend responses
```

**Ready for Phase 1**: Contract generation and test creation.