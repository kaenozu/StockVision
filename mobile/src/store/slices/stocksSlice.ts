import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

export interface StockData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap?: number;
  pe?: number;
  timestamp: string;
}

export interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  timestamp: string;
}

interface StocksState {
  watchlist: string[];
  quotes: Record<string, StockQuote>;
  historicalData: Record<string, Array<{ date: string; price: number }>>;
  loading: boolean;
  error: string | null;
  refreshing: boolean;
}

const initialState: StocksState = {
  watchlist: ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA'],
  quotes: {},
  historicalData: {},
  loading: false,
  error: null,
  refreshing: false,
};

// Async thunks
export const fetchStockQuote = createAsyncThunk(
  'stocks/fetchQuote',
  async (symbol: string) => {
    const response = await fetch(`http://localhost:8080/api/stocks/${symbol}/quote`);
    if (!response.ok) {
      throw new Error('Failed to fetch stock quote');
    }
    const data = await response.json();
    return { symbol, quote: data };
  }
);

export const fetchMultipleQuotes = createAsyncThunk(
  'stocks/fetchMultipleQuotes',
  async (symbols: string[]) => {
    const promises = symbols.map(symbol =>
      fetch(`http://localhost:8080/api/stocks/${symbol}/quote`)
        .then(response => response.json())
        .then(data => ({ symbol, quote: data }))
        .catch(error => ({ symbol, error: error.message }))
    );
    
    const results = await Promise.all(promises);
    return results.filter(result => !('error' in result));
  }
);

export const fetchHistoricalData = createAsyncThunk(
  'stocks/fetchHistoricalData',
  async ({ symbol, period }: { symbol: string; period: string }) => {
    const response = await fetch(`http://localhost:8080/api/stocks/${symbol}/history?period=${period}`);
    if (!response.ok) {
      throw new Error('Failed to fetch historical data');
    }
    const data = await response.json();
    return { symbol, data };
  }
);

export const addToWatchlist = createAsyncThunk(
  'stocks/addToWatchlist',
  async (symbol: string) => {
    // In a real app, this would sync with backend
    return symbol.toUpperCase();
  }
);

const stocksSlice = createSlice({
  name: 'stocks',
  initialState,
  reducers: {
    removeFromWatchlist: (state, action: PayloadAction<string>) => {
      state.watchlist = state.watchlist.filter(symbol => symbol !== action.payload);
      delete state.quotes[action.payload];
      delete state.historicalData[action.payload];
    },
    updateRealTimeQuote: (state, action: PayloadAction<{ symbol: string; quote: StockQuote }>) => {
      const { symbol, quote } = action.payload;
      state.quotes[symbol] = quote;
    },
    clearError: (state) => {
      state.error = null;
    },
    setRefreshing: (state, action: PayloadAction<boolean>) => {
      state.refreshing = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Single quote fetch
      .addCase(fetchStockQuote.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchStockQuote.fulfilled, (state, action) => {
        state.loading = false;
        const { symbol, quote } = action.payload;
        state.quotes[symbol] = quote;
      })
      .addCase(fetchStockQuote.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch quote';
      })
      
      // Multiple quotes fetch
      .addCase(fetchMultipleQuotes.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMultipleQuotes.fulfilled, (state, action) => {
        state.loading = false;
        action.payload.forEach(({ symbol, quote }) => {
          state.quotes[symbol] = quote;
        });
      })
      .addCase(fetchMultipleQuotes.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch quotes';
      })
      
      // Historical data fetch
      .addCase(fetchHistoricalData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchHistoricalData.fulfilled, (state, action) => {
        state.loading = false;
        const { symbol, data } = action.payload;
        state.historicalData[symbol] = data;
      })
      .addCase(fetchHistoricalData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch historical data';
      })
      
      // Add to watchlist
      .addCase(addToWatchlist.fulfilled, (state, action) => {
        const symbol = action.payload;
        if (!state.watchlist.includes(symbol)) {
          state.watchlist.push(symbol);
        }
      });
  },
});

export const { 
  removeFromWatchlist, 
  updateRealTimeQuote, 
  clearError,
  setRefreshing 
} = stocksSlice.actions;

export default stocksSlice.reducer;