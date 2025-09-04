# Quickstart: 株価表示Web画面

**Phase 1 Quickstart Guide - 2025-09-04**

## Prerequisites

### Backend API Running
```bash
# Navigate to project root
cd /path/to/spectest

# Install Python dependencies (if not done)
pip install -r requirements.txt

# Start backend API server
python -m uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload

# Verify API is running
curl http://localhost:8000/health
```

### Node.js Environment
```bash
# Verify Node.js version (18+ required)
node --version  # Should be v18.0.0 or higher
npm --version   # Should be 8.0.0 or higher

# If Node.js not installed, install via:
# https://nodejs.org/en/download/
```

## Frontend Setup & Development

### 1. Project Initialization
```bash
# Create frontend directory
mkdir frontend
cd frontend

# Initialize Vite + React + TypeScript project
npm create vite@latest . -- --template react-ts

# Install core dependencies
npm install

# Install additional dependencies for stock app
npm install axios chart.js react-chartjs-2 react-router-dom
npm install @types/react-router-dom

# Install Tailwind CSS
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### 2. Configure Development Environment
```bash
# Update vite.config.ts to proxy API calls
cat > vite.config.ts << 'EOF'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
})
EOF

# Configure Tailwind CSS
cat > tailwind.config.js << 'EOF'
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'sans': ['Noto Sans CJK JP', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
EOF

# Add Tailwind to CSS
cat > src/index.css << 'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;

@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;600;700&display=swap');
EOF
```

### 3. Create Basic Project Structure
```bash
# Create directory structure
mkdir -p src/{components,pages,services,types,hooks,utils}
mkdir -p src/components/{UI,StockInfo,Charts,Watchlist,Layout}

# Create TypeScript type definitions
cat > src/types/stock.ts << 'EOF'
export interface StockData {
  stock_code: string;
  company_name: string;
  current_price: number;
  previous_close: number;
  price_change: number;
  price_change_pct: number;
  last_updated?: string;
}

export interface PriceHistoryItem {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  stock_code: string;
}

export interface WatchlistItem {
  stock_code: string;
  company_name: string;
  added_date: string;
  alert_price?: number;
  notes?: string;
}
EOF

# Create API service
cat > src/services/stockApi.ts << 'EOF'
import axios from 'axios';
import type { StockData, PriceHistoryItem, WatchlistItem } from '../types/stock';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

export const stockApi = {
  async getStockInfo(stockCode: string, useRealData?: boolean): Promise<StockData> {
    const response = await api.get(`/stocks/${stockCode}`, {
      params: { use_real_data: useRealData }
    });
    return response.data;
  },

  async getPriceHistory(stockCode: string, days = 30): Promise<PriceHistoryItem[]> {
    const response = await api.get(`/stocks/${stockCode}/history`, {
      params: { days }
    });
    return response.data;
  },

  async getWatchlist(): Promise<WatchlistItem[]> {
    const response = await api.get('/watchlist');
    return response.data;
  }
};
EOF
```

## Development Workflow

### 4. Start Development Servers
```bash
# Terminal 1: Backend API (if not running)
cd /path/to/spectest
python -m uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2: Frontend Development Server
cd frontend
npm run dev

# Open browser to http://localhost:3000
```

### 5. Basic Component Creation
```bash
# Create a simple stock search component
cat > src/components/StockInfo/StockSearch.tsx << 'EOF'
import React, { useState } from 'react';
import { stockApi } from '../../services/stockApi';
import type { StockData } from '../../types/stock';

export const StockSearch: React.FC = () => {
  const [stockCode, setStockCode] = useState('');
  const [stockData, setStockData] = useState<StockData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[0-9]{4}$/.test(stockCode)) {
      setError('4桁の銘柄コードを入力してください');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await stockApi.getStockInfo(stockCode);
      setStockData(data);
    } catch (err) {
      setError('銘柄情報の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6">
      <form onSubmit={handleSearch} className="mb-6">
        <div className="mb-4">
          <label htmlFor="stockCode" className="block text-sm font-medium text-gray-700 mb-2">
            銘柄コード
          </label>
          <input
            id="stockCode"
            type="text"
            value={stockCode}
            onChange={(e) => setStockCode(e.target.value)}
            placeholder="例: 7203"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            maxLength={4}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? '検索中...' : '検索'}
        </button>
      </form>

      {error && (
        <div className="mb-4 p-4 text-red-700 bg-red-100 rounded-md">
          {error}
        </div>
      )}

      {stockData && (
        <div className="p-4 border rounded-md bg-white shadow">
          <h3 className="text-lg font-semibold mb-2">{stockData.company_name}</h3>
          <div className="space-y-2">
            <p>現在価格: ¥{stockData.current_price.toLocaleString()}</p>
            <p className={`${stockData.price_change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              変動: {stockData.price_change >= 0 ? '+' : ''}{stockData.price_change} 
              ({stockData.price_change >= 0 ? '+' : ''}{stockData.price_change_pct.toFixed(2)}%)
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
EOF

# Update App.tsx to use the component
cat > src/App.tsx << 'EOF'
import React from 'react';
import { StockSearch } from './components/StockInfo/StockSearch';
import './index.css';

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">株価情報ダッシュボード</h1>
        </div>
      </header>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <StockSearch />
      </main>
    </div>
  );
}

export default App;
EOF
```

## Testing the Setup

### 6. Verify Integration
```bash
# Frontend should be running on http://localhost:3000
# Backend should be running on http://localhost:8000

# Test the stock search with a valid code (e.g., 7203)
# Should display Toyota stock information

# Check browser console for any errors
# Check network tab to verify API calls to /api/stocks/7203
```

### 7. Health Check Commands
```bash
# Check if backend is responding
curl http://localhost:8000/health

# Check if frontend proxy is working
curl http://localhost:3000/api/health

# Test stock API endpoint
curl "http://localhost:8000/stocks/7203?use_real_data=false"
```

## Next Steps After Setup

### 1. Add More Components
- Price history charts with Chart.js
- Watchlist management interface  
- Navigation between pages with React Router

### 2. Enhance Features
- Real-time price updates
- Error boundaries for better error handling
- Loading states and skeleton screens

### 3. Testing Setup
```bash
# Install testing dependencies
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom

# Create test configuration
cat > vite.config.ts << 'EOF'
/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
})
EOF
```

## Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure backend CORS allows `http://localhost:3000`
2. **API Connection Failed**: Verify backend is running on port 8000
3. **Node.js Version**: Ensure Node.js 18+ is installed
4. **Port Conflicts**: Change frontend port in vite.config.ts if 3000 is busy

### Verification Steps
- Backend API accessible: ✅ `curl http://localhost:8000/health`
- Frontend loads: ✅ Open `http://localhost:3000`
- Stock search works: ✅ Search for "7203" shows Toyota data
- No console errors: ✅ Check browser developer console

This quickstart gets you from zero to a working stock search interface in approximately 15-20 minutes.