# Research: 株価表示Web画面

**Phase 0 Research Results - 2025-09-04**

## Technology Stack Analysis

### React + TypeScript + Vite Stack
**Decision**: React 18 + TypeScript 5 + Vite  
**Rationale**: 
- Fast development with hot module replacement (Vite)
- Type safety with TypeScript prevents runtime API contract errors
- React 18 concurrent features for smooth UI updates
- Established ecosystem for financial data visualization

**Alternatives considered**: Vue.js, Angular, plain TypeScript
- Vue.js: Smaller learning curve but less established for financial apps
- Angular: More heavyweight, overkill for single-page dashboard
- Plain TypeScript: Would require building UI framework from scratch

### Chart Library for Stock Data
**Decision**: Chart.js with react-chartjs-2  
**Rationale**:
- Optimized for time-series financial data (candlestick, line charts)
- Responsive design built-in
- Good performance with large datasets (365-day history)
- Extensive customization options for Japanese localization

**Alternatives considered**: D3.js, Recharts, TradingView Lightweight Charts
- D3.js: Too complex for basic charting needs
- Recharts: React-native, but less performant with large datasets
- TradingView: Excellent but may be overkill and license restrictions

### API Integration Strategy
**Decision**: Axios with typed response interfaces  
**Rationale**:
- Request/response interceptors for consistent error handling
- TypeScript integration with API response types
- Built-in request deduplication and caching
- Automatic JSON parsing matches FastAPI response format

**Alternatives considered**: Fetch API, SWR, React Query
- Fetch API: Would require building error handling and caching
- SWR/React Query: Great for caching but adds complexity for simple use case
- Axios: Balanced approach with necessary features built-in

### Styling and UI Framework
**Decision**: Tailwind CSS  
**Rationale**:
- Rapid development with utility-first classes
- Built-in responsive design system
- Japanese font support configuration
- Small bundle size with purging unused styles
- Consistent design tokens for financial data colors (red/green price changes)

**Alternatives considered**: CSS Modules, Styled-components, Material-UI
- CSS Modules: More verbose, slower development
- Styled-components: Runtime cost, less design consistency
- Material-UI: Heavy bundle, may not match financial app aesthetic

### State Management
**Decision**: React Context + useReducer  
**Rationale**:
- Lightweight for single-page app with limited shared state
- No additional dependencies or learning curve
- Easy to migrate to Redux later if needed
- Perfect for watchlist and current stock selection state

**Alternatives considered**: Redux Toolkit, Zustand, Jotai
- Redux: Overkill for simple dashboard state
- Zustand: Good option but adds dependency for minimal benefit
- Jotai: Atomic approach not needed for this use case

## Integration Patterns

### API Contract Matching
**Pattern**: TypeScript interfaces mirror FastAPI Pydantic models
```typescript
interface StockData {
  stock_code: string;
  company_name: string;
  current_price: number;
  previous_close: number;
  price_change: number;
  price_change_pct: number;
}
```
**Rationale**: Direct mapping prevents transformation overhead and ensures type safety

### Error Handling Strategy
**Pattern**: Centralized error boundary + local error states
- React Error Boundary catches component crashes
- Axios interceptors handle network errors consistently
- Local loading/error states for individual components
**Rationale**: Graceful degradation, user-friendly error messages

### Performance Optimization
**Pattern**: Lazy loading + request debouncing + local caching
- Components lazy-loaded with React.lazy()
- Search input debounced to prevent excessive API calls
- localStorage for client-side caching of frequently accessed data
**Rationale**: Meets <2s initial load and <500ms chart rendering goals

## Development and Build Process

### Development Server Configuration
**Decision**: Vite dev server with API proxy  
**Configuration**:
```typescript
// vite.config.ts
server: {
  proxy: {
    '/api': 'http://localhost:8000'
  }
}
```
**Rationale**: Avoids CORS issues during development, matches production API paths

### Testing Strategy
**Decision**: Vitest + React Testing Library + MSW (Mock Service Worker)  
**Approach**:
1. Mock API responses for consistent testing
2. Component integration tests with user interactions
3. E2E tests with real API for contract validation
**Rationale**: Comprehensive testing while maintaining fast test execution

### Build and Deployment
**Decision**: Static build served by FastAPI StaticFiles  
**Approach**:
- Vite builds to `frontend/dist/`
- FastAPI serves static files at `/static/`
- Single deployment artifact with API + frontend
**Rationale**: Simplified deployment, no separate web server needed

## Japanese Localization Considerations

### Font and Typography
**Configuration**: Noto Sans CJK JP for consistent Japanese text rendering
**Rationale**: Google Fonts CDN, optimized for Japanese financial terms

### Number Formatting
**Pattern**: Japanese comma formatting (10,000 not 10.000)  
**Implementation**: Intl.NumberFormat('ja-JP') for all price displays
**Rationale**: Matches user expectations for financial data in Japan

### Date/Time Display
**Pattern**: Japanese date format (2025年9月4日)  
**Implementation**: Intl.DateTimeFormat('ja-JP') for chart axes and timestamps
**Rationale**: Cultural appropriateness for Japanese stock market data

## Risk Mitigation Strategies

### API Dependency Risk
**Mitigation**: Graceful degradation to cached data, clear error messages
**Fallback**: localStorage cache remains available if API is down

### Browser Compatibility Risk  
**Mitigation**: Polyfills for older browsers, progressive enhancement
**Target**: Support last 2 versions of major browsers (95% coverage)

### Performance Risk with Large Datasets
**Mitigation**: Chart data pagination, virtual scrolling for large lists
**Monitoring**: Performance marks for load time and chart rendering

## Research Conclusions

All technical dependencies are well-established with active communities. The chosen stack provides a clear path to meeting all functional requirements while maintaining development velocity and code quality. No blocking technical issues identified.

**Ready for Phase 1**: Design and contracts generation.