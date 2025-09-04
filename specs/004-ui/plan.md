# Implementation Plan: UIの改善

**Branch**: `004-ui` | **Date**: 2025-09-04 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `C:/gemini-desktop/spectest/specs/004-ui/spec.md`

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
株式追跡システムのUI改善：価格変動の視覚的表示、レスポンシブ対応(320px-1920px)、アクセシビリティ強化、パフォーマンス最適化を実装。既存のReact+TypeScript+Tailwind CSS環境でのユーザビリティ向上が主要目標。

## Technical Context
**Language/Version**: TypeScript 5.x, React 18, CSS3  
**Primary Dependencies**: React 18, TypeScript, Tailwind CSS, Vite, Chart.js, React Router  
**Storage**: N/A (フロントエンドUI改善のみ)  
**Testing**: Vitest, React Testing Library, Jest DOM  
**Target Platform**: Modern browsers (Chrome 90+, Firefox 88+, Safari 14+)
**Project Type**: web (既存のfrontend+backend構造)  
**Performance Goals**: 画面描画 <100ms, 大量データ(100件以上)でも60fps維持  
**Constraints**: 320px幅デバイス対応、色覚異常対応、キーボードナビゲーション必須  
**Scale/Scope**: 既存UIコンポーネント約15個、新規コンポーネント5-8個追加予定

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Simplicity**:
- Projects: 1 (frontend UI改善のみ - OK)
- Using framework directly? YES (React、Tailwind CSS直接使用)
- Single data model? YES (UIstate管理のみ、DTOなし)
- Avoiding patterns? YES (シンプルなComponent構造、不要な抽象化なし)

**Architecture**:
- EVERY feature as library? NO - UI改善は既存アプリ内で実装
- Libraries listed: N/A (既存UIコンポーネントの改善)
- CLI per library: N/A (フロントエンドUI機能)
- Library docs: N/A (コンポーネントドキュメント化予定)

**Testing (NON-NEGOTIABLE)**:
- RED-GREEN-Refactor cycle enforced? YES (テスト駆動で進める)
- Git commits show tests before implementation? YES (計画済み)
- Order: Contract→Integration→E2E→Unit strictly followed? MODIFIED (UI: Visual→Component→Unit)
- Real dependencies used? YES (実際のDOM、ブラウザAPI)
- Integration tests for: UI component interactions, responsive behavior
- FORBIDDEN: Implementation before test, skipping RED phase

**Observability**:
- Structured logging included? YES (フロントエンドエラーログ)
- Frontend logs → backend? OPTIONAL (UI改善なので必須ではない)
- Error context sufficient? YES (エラー状態の視覚化)

**Versioning**:
- Version number assigned? YES (4.0.0 - UI major improvement)
- BUILD increments on every change? YES
- Breaking changes handled? YES (既存UI互換性維持)

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

**Structure Decision**: Option 2 (Web application) - 既存のfrontend/backend構造を使用

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
- Each contract → contract test task [P]
- Each entity → model creation task [P] 
- Each user story → integration test task
- Implementation tasks to make tests pass

**Ordering Strategy**:
- TDD order: Tests before implementation 
- Dependency order: Models before services before UI
- Mark [P] for parallel execution (independent files)

**Estimated Output**: 25-30 numbered, ordered tasks in tasks.md

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
- [x] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [ ] Complexity deviations documented

**Generated Artifacts**:
- [x] research.md - 3つのNEEDS CLARIFICATION項目解決
- [x] data-model.md - 6つのUIエンティティ定義
- [x] contracts/ui-component-interfaces.ts - TypeScript型定義
- [x] quickstart.md - 8つのテストシナリオ定義
- [x] tasks.md - 36個の実行可能タスク生成

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*