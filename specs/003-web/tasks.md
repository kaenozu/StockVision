# Tasks: 株価表示Web画面

**Input**: Design documents from `/specs/003-web/`
**Prerequisites**: plan.md, research.md, data-model.md, contracts/frontend-api-contract.yaml

## Execution Flow (main)
```
1. Load plan.md from feature directory ✅
   → Tech stack: React 18 + TypeScript 5 + Vite + Tailwind CSS + Chart.js
   → Structure: Web application (frontend directory)
2. Load optional design documents ✅
   → data-model.md: StockData, PriceHistoryItem, WatchlistItem, ChartConfig entities
   → contracts/: frontend-api-contract.yaml with 6 endpoints
   → research.md: Technology decisions and integration patterns
3. Generate tasks by category ✅
   → Setup: Vite project, dependencies, Tailwind configuration
   → Tests: API contract tests, component integration tests
   → Core: API service, components, pages, routing
   → Integration: Chart.js integration, localStorage caching
   → Polish: responsive design, error handling, accessibility
4. Apply task rules ✅
   → Different files = [P] for parallel execution
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001-T030) ✅
6. SUCCESS: Tasks ready for execution
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- File paths use frontend/ structure per plan.md

## Phase 3.1: Project Setup & Infrastructure

- [ ] **T001** Create frontend directory structure
  ```
  frontend/
  ├── src/
  │   ├── components/{UI,StockInfo,Charts,Watchlist,Layout}/
  │   ├── pages/
  │   ├── services/
  │   ├── types/
  │   ├── hooks/
  │   └── utils/
  ├── tests/
  │   ├── contract/
  │   ├── integration/
  │   └── unit/
  └── public/
  ```

- [ ] **T002** Initialize Vite + React + TypeScript project in frontend/
  ```bash
  npm create vite@latest frontend -- --template react-ts
  cd frontend && npm install
  ```

- [ ] **T003** [P] Install core dependencies in frontend/package.json
  ```bash
  npm install axios chart.js react-chartjs-2 react-router-dom
  npm install @types/react-router-dom
  ```

- [ ] **T004** [P] Install and configure Tailwind CSS in frontend/
  ```bash
  npm install -D tailwindcss postcss autoprefixer
  npx tailwindcss init -p
  # Configure tailwind.config.js and src/index.css
  ```

- [ ] **T005** [P] Configure Vite development server in frontend/vite.config.ts
  ```typescript
  // API proxy to localhost:8000, port 3000, Japanese font support
  ```

## Phase 3.2: Contract Tests (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

- [ ] **T006** [P] Contract test GET /stocks/{code} in frontend/tests/contract/test_stock_info_api.test.ts
  ```typescript
  // Test StockData response schema, 4-digit validation, error responses
  ```

- [ ] **T007** [P] Contract test GET /stocks/{code}/current in frontend/tests/contract/test_current_price_api.test.ts
  ```typescript
  // Test CurrentPriceResponse schema, real-time data structure
  ```

- [ ] **T008** [P] Contract test GET /stocks/{code}/history in frontend/tests/contract/test_price_history_api.test.ts
  ```typescript
  // Test PriceHistoryItem[] schema, days parameter validation
  ```

- [ ] **T009** [P] Contract test GET/POST/DELETE /watchlist in frontend/tests/contract/test_watchlist_api.test.ts
  ```typescript
  // Test WatchlistItemAPI schema, CRUD operations
  ```

- [ ] **T010** [P] Integration test stock search flow in frontend/tests/integration/test_stock_search.test.tsx
  ```typescript
  // Test: input "7203" → API call → display Toyota stock info
  ```

- [ ] **T011** [P] Integration test watchlist management in frontend/tests/integration/test_watchlist_flow.test.tsx
  ```typescript
  // Test: add stock → save to API → display in watchlist → remove
  ```

- [ ] **T012** [P] Integration test price chart display in frontend/tests/integration/test_chart_display.test.tsx
  ```typescript
  // Test: load history → render Chart.js → change timeframe → update chart
  ```

## Phase 3.3: Core Implementation (ONLY after tests are failing)

### API Service Layer

- [ ] **T013** [P] Create TypeScript interfaces in frontend/src/types/stock.ts
  ```typescript
  // StockData, CurrentPriceResponse, PriceHistoryItem, WatchlistItem interfaces
  ```

- [ ] **T014** [P] Create API client service in frontend/src/services/stockApi.ts
  ```typescript
  // Axios client with typed responses, error handling, timeout configuration
  ```

- [ ] **T015** [P] Create API error handling utilities in frontend/src/utils/apiErrors.ts
  ```typescript
  // Error classification, user-friendly messages, retry logic
  ```

### Core UI Components

- [ ] **T016** [P] Create base UI components in frontend/src/components/UI/
  ```typescript
  // Button.tsx, LoadingSpinner.tsx, ErrorMessage.tsx, Input.tsx
  ```

- [ ] **T017** [P] Create stock search component in frontend/src/components/StockInfo/StockSearch.tsx
  ```typescript
  // 4-digit input validation, API integration, loading states
  ```

- [ ] **T018** [P] Create stock display card in frontend/src/components/StockInfo/StockCard.tsx
  ```typescript
  // Price display, change indicators (red/green), company name
  ```

- [ ] **T019** [P] Create price chart component in frontend/src/components/Charts/PriceChart.tsx
  ```typescript
  // Chart.js integration, timeframe selector, responsive design
  ```

### Watchlist Components

- [ ] **T020** [P] Create watchlist item component in frontend/src/components/Watchlist/WatchlistItem.tsx
  ```typescript
  // Individual stock in watchlist, remove button, price updates
  ```

- [ ] **T021** [P] Create watchlist grid in frontend/src/components/Watchlist/WatchlistGrid.tsx
  ```typescript
  // Grid layout for multiple stocks, empty state, loading states
  ```

### Pages and Routing

- [ ] **T022** Create main app routing in frontend/src/App.tsx
  ```typescript
  // React Router setup: /, /stock/:code, /watchlist routes
  ```

- [ ] **T023** [P] Create home page in frontend/src/pages/HomePage.tsx
  ```typescript
  // Market overview, popular stocks, search integration
  ```

- [ ] **T024** [P] Create stock detail page in frontend/src/pages/StockDetailPage.tsx
  ```typescript
  // URL parameter handling, stock info + chart, watchlist integration
  ```

- [ ] **T025** [P] Create watchlist page in frontend/src/pages/WatchlistPage.tsx
  ```typescript
  // User's saved stocks, real-time updates, management UI
  ```

## Phase 3.4: Advanced Features & Integration

- [ ] **T026** Create React Context for state management in frontend/src/contexts/
  ```typescript
  // StockContext.tsx, WatchlistContext.tsx with useReducer
  ```

- [ ] **T027** [P] Implement localStorage caching in frontend/src/utils/cache.ts
  ```typescript
  // TTL-based caching, cache invalidation, storage limits
  ```

- [ ] **T028** [P] Create Japanese number formatting in frontend/src/utils/formatters.ts
  ```typescript
  // Currency formatting, percentage formatting, date formatting
  ```

## Phase 3.5: Polish & Accessibility

- [ ] **T029** [P] Implement responsive design breakpoints
  ```typescript
  // Mobile-first Tailwind classes, touch-friendly interactions
  ```

- [ ] **T030** [P] Add error boundaries in frontend/src/components/ErrorBoundary.tsx
  ```typescript
  // React error boundaries, error reporting, graceful degradation
  ```

- [ ] **T031** [P] Unit tests for utility functions in frontend/tests/unit/
  ```typescript
  // Test formatters, cache utilities, validation functions
  ```

- [ ] **T032** Performance optimization and bundle analysis
  ```typescript
  // Lazy loading, code splitting, bundle size optimization
  ```

- [ ] **T033** [P] Add accessibility features (ARIA labels, keyboard navigation)
  ```typescript
  // Screen reader support, focus management, high contrast support
  ```

- [ ] **T034** Create production build configuration
  ```bash
  # Optimize for production, static asset handling
  npm run build
  ```

- [ ] **T035** Integration with FastAPI static file serving
  ```python
  # Update src/main.py to serve frontend/dist at /static
  ```

## Dependencies

**Critical Path**:
1. Setup (T001-T005) → Contract Tests (T006-T012) → Core Implementation (T013-T025)
2. Tests must fail before implementation begins
3. API service (T014) blocks component implementation (T017-T021)
4. Components block pages (T022-T025)
5. Context (T026) can run parallel with components
6. Polish (T029-T035) requires core implementation complete

**Parallel Execution Opportunities**:
- T003, T004, T005 (dependency installation)
- T006-T012 (all contract tests)
- T013, T014, T015 (API layer)
- T016-T021 (UI components - different files)
- T023, T024, T025 (page components)

## Parallel Example
```bash
# Launch contract tests together (after T001-T005):
Task: "Contract test GET /stocks/{code} in frontend/tests/contract/test_stock_info_api.test.ts"
Task: "Contract test GET /stocks/{code}/current in frontend/tests/contract/test_current_price_api.test.ts" 
Task: "Contract test GET /stocks/{code}/history in frontend/tests/contract/test_price_history_api.test.ts"
Task: "Contract test watchlist CRUD in frontend/tests/contract/test_watchlist_api.test.ts"
```

## Success Criteria

### Functional Verification
- [x] All contract tests → implementation tasks
- [x] All data entities → TypeScript interfaces  
- [x] All user stories → integration tests
- [x] TDD order enforced (tests before implementation)

### Performance Targets
- **Load Time**: < 2 seconds (T032, T034)
- **Chart Rendering**: < 500ms (T019)
- **API Response**: Visual feedback < 100ms (T014)

### Quality Gates
- **Test Coverage**: Contract + Integration + Unit tests
- **Type Safety**: Full TypeScript interfaces (T013)
- **Accessibility**: WCAG 2.1 AA compliance (T033)
- **Responsive**: Mobile/tablet/desktop support (T029)

## Validation Checklist
*GATE: All items must be checked before tasks complete*

- [x] All contracts have corresponding tests (T006-T009)
- [x] All entities have TypeScript interfaces (T013)
- [x] All tests come before implementation (T006-T012 → T013-T025)
- [x] Parallel tasks truly independent (different files)
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task

**Ready for Phase 4**: Execute tasks T001-T035 following TDD principles.