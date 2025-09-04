# Tasks: 株価テスト機能

**Input**: Design documents from `/specs/002-test-feature-for/`
**Prerequisites**: plan.md (✓), research.md (✓), data-model.md (✓), contracts/ (✓)

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → Tech stack: Python 3.11+, FastAPI, SQLite, pytest
   → Libraries: stock_api, stock_storage, stock_display, stock_cli
2. Load optional design documents:
   → data-model.md: Stock, Watchlist, PriceHistory entities
   → contracts/stock-api.yaml: 6 API endpoints
   → quickstart.md: 3 integration scenarios
3. Generate tasks by category:
   → Setup: Python project init, dependencies
   → Tests: 6 contract tests, 3 integration tests
   → Core: 3 models, 4 services, CLI commands
   → Integration: DB init, logging
   → Polish: unit tests, performance, docs
4. Apply TDD rules:
   → All tests must be written first and fail
   → Tests before implementation
5. Number tasks sequentially (T001-T032)
6. Return: SUCCESS (32 tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
- **Single project**: `src/`, `tests/` at repository root
- Database: `data/stocks.db`
- Logs: `logs/`

## Phase 3.1: Setup
- [ ] T001 Create project structure per implementation plan (src/, tests/, data/, logs/)
- [ ] T002 Initialize Python project with requirements.txt (FastAPI, SQLAlchemy, yfinance, pytest)
- [ ] T003 [P] Configure pytest.ini and .flake8 for linting
- [ ] T004 [P] Create .gitignore for Python project
- [ ] T005 Create data/directory and logs/ directory structure

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Contract Tests
- [ ] T006 [P] Contract test GET /stocks/{stock_code} in tests/contract/test_stocks_get.py
- [ ] T007 [P] Contract test GET /stocks/{stock_code}/current in tests/contract/test_stocks_current.py
- [ ] T008 [P] Contract test GET /stocks/{stock_code}/history in tests/contract/test_stocks_history.py
- [ ] T009 [P] Contract test GET /watchlist in tests/contract/test_watchlist_get.py
- [ ] T010 [P] Contract test POST /watchlist in tests/contract/test_watchlist_post.py
- [ ] T011 [P] Contract test DELETE /watchlist/{id} in tests/contract/test_watchlist_delete.py

### Integration Tests
- [ ] T012 [P] Integration test 新規銘柄の追加と監視 in tests/integration/test_new_stock_monitoring.py
- [ ] T013 [P] Integration test データ更新と履歴確認 in tests/integration/test_update_history.py
- [ ] T014 [P] Integration test 一括操作 in tests/integration/test_batch_operations.py

## Phase 3.3: Core Implementation (ONLY after tests are failing)

### Data Models
- [ ] T015 [P] Stock model in src/models/stock.py (SQLAlchemy model with validation)
- [ ] T016 [P] Watchlist model in src/models/watchlist.py (SQLAlchemy model)
- [ ] T017 [P] PriceHistory model in src/models/price_history.py (SQLAlchemy model)

### Storage Layer
- [ ] T018 Database setup in src/stock_storage/database.py (SQLAlchemy engine, session)
- [ ] T019 Stock storage service in src/stock_storage/storage_service.py (CRUD operations)

### External API Integration
- [ ] T020 [P] Yahoo Finance client in src/stock_api/yahoo_client.py (yfinance wrapper)
- [ ] T021 [P] Data models for API in src/stock_api/data_models.py (Pydantic models)

### API Endpoints
- [ ] T022 FastAPI app setup in src/main.py (app instance, middleware, CORS)
- [ ] T023 GET /stocks/{stock_code} endpoint in src/api/stocks.py
- [ ] T024 GET /stocks/{stock_code}/current endpoint in src/api/stocks.py
- [ ] T025 GET /stocks/{stock_code}/history endpoint in src/api/stocks.py
- [ ] T026 GET /watchlist endpoint in src/api/watchlist.py
- [ ] T027 POST /watchlist endpoint in src/api/watchlist.py
- [ ] T028 DELETE /watchlist/{id} endpoint in src/api/watchlist.py

### CLI Commands
- [ ] T029 CLI search command in src/stock_cli/commands.py (--search)
- [ ] T030 CLI watchlist command in src/stock_cli/commands.py (--list, add, remove)
- [ ] T031 CLI update command in src/stock_cli/commands.py (--update, --all)
- [ ] T032 CLI history command in src/stock_cli/commands.py (--history, --days)

## Phase 3.4: Integration
- [ ] T033 Connect all services to SQLite database
- [ ] T034 Structured logging setup in src/utils/logging.py (JSON format)
- [ ] T035 Error handling middleware in src/middleware/error_handler.py
- [ ] T036 Request/response logging middleware

## Phase 3.5: Polish
- [ ] T037 [P] Unit tests for validation in tests/unit/test_validation.py
- [ ] T038 [P] Unit tests for Yahoo client in tests/unit/test_yahoo_client.py
- [ ] T039 Performance tests (< 100ms response time)
- [ ] T040 [P] Update API documentation (OpenAPI/Swagger)
- [ ] T041 Run quickstart.md scenarios for validation
- [ ] T042 Create deployment instructions

## Dependencies
- Setup (T001-T005) → Everything
- Tests (T006-T014) before implementation (T015-T032)
- Models (T015-T017) before Storage (T018-T019)
- Storage before API endpoints (T023-T028)
- FastAPI setup (T022) before endpoints
- All implementation before Integration (T033-T036)
- Everything before Polish (T037-T042)

## Parallel Execution Examples

### Contract Tests (can run all together):
```bash
# Launch T006-T011 in parallel:
Task: "Contract test GET /stocks/{stock_code} in tests/contract/test_stocks_get.py"
Task: "Contract test GET /stocks/{stock_code}/current in tests/contract/test_stocks_current.py"
Task: "Contract test GET /stocks/{stock_code}/history in tests/contract/test_stocks_history.py"
Task: "Contract test GET /watchlist in tests/contract/test_watchlist_get.py"
Task: "Contract test POST /watchlist in tests/contract/test_watchlist_post.py"
Task: "Contract test DELETE /watchlist/{id} in tests/contract/test_watchlist_delete.py"
```

### Integration Tests (can run all together):
```bash
# Launch T012-T014 in parallel:
Task: "Integration test 新規銘柄の追加と監視 in tests/integration/test_new_stock_monitoring.py"
Task: "Integration test データ更新と履歴確認 in tests/integration/test_update_history.py"
Task: "Integration test 一括操作 in tests/integration/test_batch_operations.py"
```

### Models (can run all together):
```bash
# Launch T015-T017 in parallel:
Task: "Stock model in src/models/stock.py"
Task: "Watchlist model in src/models/watchlist.py"
Task: "PriceHistory model in src/models/price_history.py"
```

## Notes
- [P] tasks = different files, no dependencies
- MUST verify all tests fail before implementing
- Commit after each task with descriptive message
- Use real SQLite DB for tests, not mocks
- Follow RED-GREEN-Refactor strictly

## Validation Checklist
*GATE: Checked before execution*

- [x] All 6 API endpoints have contract tests
- [x] All 3 entities have model tasks
- [x] All tests (T006-T014) come before implementation (T015-T032)
- [x] Parallel tasks are truly independent
- [x] Each task specifies exact file path
- [x] No [P] task modifies same file as another [P] task
- [x] TDD order enforced (tests must fail first)

## Estimated Completion
- Setup: 30 minutes
- Tests: 2 hours (must see all fail)
- Implementation: 4 hours
- Integration: 1 hour
- Polish: 1 hour
- **Total**: ~8.5 hours with TDD discipline