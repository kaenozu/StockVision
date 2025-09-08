# Implementation Plan: 機械学習を使った株価予測システム

**Branch**: `005-machine-learning-prediction` | **Date**: 2025-09-08 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/005-/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
4. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
5. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file (e.g., `CLAUDE.md` for Claude Code, `.github/copilot-instructions.md` for GitHub Copilot, or `GEMINI.md` for Gemini CLI).
6. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
7. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
8. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary
機械学習アルゴリズムによる高精度株価予測システム。従来のテクニカル分析を超え、具体的な「○月○日に買い/売り」日付推奨と70%以上の予測精度を目標とする。複数MLモデルの並行運用、継続的学習、市場異常検知機能を含む包括的な予測プラットフォーム。

## Technical Context
**Language/Version**: Python 3.11 (backend), TypeScript 5.0 (frontend)  
**Primary Dependencies**: FastAPI, scikit-learn, pandas, numpy, React, SQLAlchemy  
**Storage**: SQLite (local), PostgreSQL (production), pickle/joblib (model storage)  
**Testing**: pytest (backend), Jest/Testing Library (frontend)  
**Target Platform**: Windows/Linux desktop, web browser
**Project Type**: web (frontend + backend)
**Performance Goals**: <5min prediction processing, <2sec UI response, 70%+ accuracy  
**Constraints**: Local model storage, offline prediction capability, 5分以内処理完了  
**Scale/Scope**: 100+ stocks, 1年+ historical data, multiple ML models parallel

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Simplicity**:
- Projects: 3 (backend API, frontend UI, shared models) ✓
- Using framework directly? Yes (FastAPI, React without custom wrappers) ✓
- Single data model? Yes (shared schemas between backend/frontend) ✓
- Avoiding patterns? Yes (direct SQLAlchemy, no Repository layer) ✓

**Architecture**:
- EVERY feature as library? Yes (ml-prediction-lib, market-data-lib, anomaly-detection-lib)
- Libraries listed: 
  - ml-prediction-lib: Model training, prediction execution
  - market-data-lib: Data fetching, preprocessing
  - anomaly-detection-lib: Market volatility detection
- CLI per library: Yes (--train, --predict, --evaluate commands)
- Library docs: llms.txt format planned? Yes

**Testing (NON-NEGOTIABLE)**:
- RED-GREEN-Refactor cycle enforced? Yes (tests fail first, then implement)
- Git commits show tests before implementation? Yes (contract tests first)
- Order: Contract→Integration→E2E→Unit strictly followed? Yes
- Real dependencies used? Yes (actual SQLite DB, real Yahoo Finance API)
- Integration tests for: ML model contracts, prediction API, data pipeline
- FORBIDDEN: Implementation before test, skipping RED phase ✓

**Observability**:
- Structured logging included? Yes (prediction accuracy, model performance)
- Frontend logs → backend? Yes (unified prediction event stream)
- Error context sufficient? Yes (model failures, data quality issues)

**Versioning**:
- Version number assigned? 1.0.0 (MAJOR.MINOR.BUILD)
- BUILD increments on every change? Yes
- Breaking changes handled? Yes (model compatibility tests, migration scripts)

## Project Structure

### Documentation (this feature)
```
specs/[###-feature]/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
# Option 1: Single project (DEFAULT)
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/

# Option 2: Web application (when "frontend" + "backend" detected)
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

# Option 3: Mobile + API (when "iOS/Android" detected)
api/
└── [same as backend above]

ios/ or android/
└── [platform-specific structure]
```

**Structure Decision**: Option 2 (Web application) - React frontend + FastAPI backend

## Phase 0: Outline & Research
1. **Extract unknowns from Technical Context** above:
   - For each NEEDS CLARIFICATION → research task
   - For each dependency → best practices task
   - For each integration → patterns task

2. **Generate and dispatch research agents**:
   ```
   For each unknown in Technical Context:
     Task: "Research {unknown} for {feature context}"
   For each technology choice:
     Task: "Find best practices for {tech} in {domain}"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: research.md with all NEEDS CLARIFICATION resolved

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - Entity name, fields, relationships
   - Validation rules from requirements
   - State transitions if applicable

2. **Generate API contracts** from functional requirements:
   - For each user action → endpoint
   - Use standard REST/GraphQL patterns
   - Output OpenAPI/GraphQL schema to `/contracts/`

3. **Generate contract tests** from contracts:
   - One test file per endpoint
   - Assert request/response schemas
   - Tests must fail (no implementation yet)

4. **Extract test scenarios** from user stories:
   - Each story → integration test scenario
   - Quickstart test = story validation steps

5. **Update agent file incrementally** (O(1) operation):
   - Run `/scripts/update-agent-context.sh [claude|gemini|copilot]` for your AI assistant
   - If exists: Add only NEW tech from current plan
   - Preserve manual additions between markers
   - Update recent changes (keep last 3)
   - Keep under 150 lines for token efficiency
   - Output to repository root

**Output**: data-model.md, /contracts/*, failing tests, quickstart.md, agent-specific file

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Load `/templates/tasks-template.md` as base
- Generate tasks from Phase 1 design docs (contracts, data model, quickstart)
- Each API endpoint → contract test task [P]
- Each entity model → SQLAlchemy model + tests [P] 
- Each ML component → library + CLI + tests
- Each user story → integration test task
- Implementation tasks to make tests pass (TDD order)

**ML-Specific Task Categories**:
1. **Data Pipeline Tasks**: Feature engineering, data validation, preprocessing
2. **Model Training Tasks**: Algorithm implementation, hyperparameter tuning, model serialization
3. **Prediction Service Tasks**: Real-time prediction API, model loading, ensemble logic
4. **Accuracy Tracking Tasks**: Prediction logging, performance measurement, reporting
5. **Anomaly Detection Tasks**: Market volatility detection, prediction gating logic
6. **Frontend Integration Tasks**: ML prediction UI components, model comparison views

**Ordering Strategy**:
- **Phase 2A - Foundation**: Data models → Database migration → Basic API endpoints
- **Phase 2B - ML Core**: Feature extraction → Training pipeline → Prediction service  
- **Phase 2C - Intelligence**: Anomaly detection → Accuracy tracking → Model management
- **Phase 2D - Integration**: Frontend components → E2E testing → Performance optimization
- Mark [P] for parallel execution (independent files)
- Mark [BLOCKS] for dependent tasks that must run sequentially

**Estimated Output**: 35-40 numbered, ordered tasks in tasks.md
- Backend tasks: 20-25 (models, services, APIs)
- Frontend tasks: 10-12 (components, integration)  
- Testing tasks: 5-8 (contract, integration, E2E)

**Performance Considerations**:
- Training tasks scheduled for low-usage periods
- Prediction tasks optimized for <5min processing requirement
- UI tasks designed for <2sec response time
- All tasks must support offline operation capability

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |


## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*