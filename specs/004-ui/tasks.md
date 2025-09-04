# Tasks: UIの改善

**Input**: Design documents from `/specs/004-ui/`
**Prerequisites**: plan.md (complete), research.md, data-model.md, contracts/, quickstart.md

## Execution Flow Summary
1. ✅ Loaded plan.md: React 18 + TypeScript 5.x + Tailwind CSS
2. ✅ Extracted entities: 6 UI contexts and components
3. ✅ Generated tasks from contracts, data model, and quickstart scenarios
4. ✅ Applied TDD ordering: Tests → Implementation → Integration → Polish
5. ✅ Marked parallel tasks [P] for independent files

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Paths assume Web app structure: `frontend/src/`, `frontend/tests/`

## Phase 3.1: Setup
- [ ] T001 Create UI component directory structure in frontend/src/components/enhanced/
- [ ] T002 [P] Install accessibility testing dependencies (jest-axe, @testing-library/jest-dom)
- [ ] T003 [P] Configure Vitest for component testing with jsdom environment
- [ ] T004 [P] Setup Tailwind CSS custom theme configuration for UI enhancements

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Context Tests
- [ ] T005 [P] ThemeContext test in frontend/tests/contexts/ThemeContext.test.tsx
- [ ] T006 [P] ResponsiveContext test in frontend/tests/contexts/ResponsiveContext.test.tsx
- [ ] T007 [P] AccessibilityContext test in frontend/tests/contexts/AccessibilityContext.test.tsx

### Component Tests
- [ ] T008 [P] VisualIndicator component test in frontend/tests/components/VisualIndicator.test.tsx
- [ ] T009 [P] PriceDisplay component test in frontend/tests/components/PriceDisplay.test.tsx
- [ ] T010 [P] StockCard enhanced test in frontend/tests/components/StockCard.enhanced.test.tsx
- [ ] T011 [P] LoadingState component test in frontend/tests/components/LoadingState.test.tsx

### Integration Tests
- [ ] T012 [P] Theme switching integration test in frontend/tests/integration/theme-switching.test.tsx
- [ ] T013 [P] Responsive breakpoint integration test in frontend/tests/integration/responsive-behavior.test.tsx
- [ ] T014 [P] Keyboard navigation integration test in frontend/tests/integration/keyboard-navigation.test.tsx

## Phase 3.3: Core Implementation (ONLY after tests are failing)

### Context Providers
- [ ] T015 [P] ThemeContext provider in frontend/src/contexts/ThemeContext.tsx
- [ ] T016 [P] ResponsiveContext provider in frontend/src/contexts/ResponsiveContext.tsx
- [ ] T017 [P] AccessibilityContext provider in frontend/src/contexts/AccessibilityContext.tsx

### UI Components
- [ ] T018 [P] VisualIndicator component in frontend/src/components/enhanced/VisualIndicator.tsx
- [ ] T019 [P] PriceDisplay component in frontend/src/components/enhanced/PriceDisplay.tsx
- [ ] T020 [P] LoadingState component in frontend/src/components/enhanced/LoadingState.tsx
- [ ] T021 Enhanced StockCard component in frontend/src/components/StockCard.tsx

### Styling and Theme
- [ ] T022 [P] Dark mode CSS variables in frontend/src/styles/themes.css
- [ ] T023 [P] Responsive utility classes in frontend/src/styles/responsive.css
- [ ] T024 [P] Accessibility utility classes in frontend/src/styles/accessibility.css

## Phase 3.4: Integration
- [ ] T025 Connect context providers to App.tsx root
- [ ] T026 Update existing components to use enhanced contexts
- [ ] T027 Implement localStorage persistence for theme settings
- [ ] T028 Add system preference detection for automatic theme switching
- [ ] T029 Implement keyboard event handlers for navigation

## Phase 3.5: Polish and Validation
- [ ] T030 [P] Unit tests for utility functions in frontend/tests/utils/
- [ ] T031 [P] Performance tests: verify <100ms render time
- [ ] T032 [P] Accessibility audit: WCAG 2.1 AA compliance check
- [ ] T033 Execute quickstart.md manual test scenarios
- [ ] T034 [P] Visual regression tests with 320px-1920px viewports
- [ ] T035 [P] Color contrast validation for all theme combinations
- [ ] T036 Code cleanup: remove duplicate styles and optimize bundle size

## Dependencies
```
Setup (T001-T004) → Tests (T005-T014) → Implementation (T015-T024) → Integration (T025-T029) → Polish (T030-T036)

Within Tests phase:
- All test tasks [P] (can run in parallel)

Within Implementation phase:
- T015-T017 contexts [P] (independent)
- T018-T020 components [P] (independent)
- T022-T024 styles [P] (independent)
- T021 depends on T015-T020 (enhanced contexts and components)

Within Integration phase:
- T025 blocks T026, T027, T028
- T029 depends on T025, T026

Within Polish phase:
- T030, T031, T032, T034, T035, T036 [P] (independent validation)
- T033 depends on all previous phases
```

## Parallel Execution Examples

### Setup Phase
```bash
# Launch T002-T004 together:
npm install --save-dev jest-axe @testing-library/jest-dom &
npx vitest config --reporter=verbose &
npx tailwindcss init -p &
wait
```

### Test Phase (Critical: Must fail before implementation)
```bash
# Launch all context tests T005-T007:
Task: "ThemeContext test in frontend/tests/contexts/ThemeContext.test.tsx"
Task: "ResponsiveContext test in frontend/tests/contexts/ResponsiveContext.test.tsx"
Task: "AccessibilityContext test in frontend/tests/contexts/AccessibilityContext.test.tsx"

# Launch all component tests T008-T011:
Task: "VisualIndicator test in frontend/tests/components/VisualIndicator.test.tsx"
Task: "PriceDisplay test in frontend/tests/components/PriceDisplay.test.tsx"
Task: "StockCard enhanced test in frontend/tests/components/StockCard.enhanced.test.tsx"
Task: "LoadingState test in frontend/tests/components/LoadingState.test.tsx"
```

### Implementation Phase
```bash
# Launch context providers T015-T017:
Task: "ThemeContext provider in frontend/src/contexts/ThemeContext.tsx"
Task: "ResponsiveContext provider in frontend/src/contexts/ResponsiveContext.tsx"
Task: "AccessibilityContext provider in frontend/src/contexts/AccessibilityContext.tsx"

# Launch UI components T018-T020:
Task: "VisualIndicator component in frontend/src/components/enhanced/VisualIndicator.tsx"
Task: "PriceDisplay component in frontend/src/components/enhanced/PriceDisplay.tsx"
Task: "LoadingState component in frontend/src/components/enhanced/LoadingState.tsx"
```

## Task Generation Source Mapping

### From contracts/ui-component-interfaces.ts:
- T005: ThemeContextValue interface → ThemeContext test
- T006: ResponsiveContextValue interface → ResponsiveContext test
- T007: AccessibilityContextValue interface → AccessibilityContext test
- T008: VisualIndicatorProps interface → VisualIndicator test
- T009: PriceDisplayProps interface → PriceDisplay test
- T011: LoadingStateProps interface → LoadingState test

### From data-model.md entities:
- T015: ThemeContext entity → ThemeContext implementation
- T016: ResponsiveContext entity → ResponsiveContext implementation
- T017: AccessibilityContext entity → AccessibilityContext implementation
- T018: VisualIndicator entity → VisualIndicator implementation
- T019: PriceDisplay (inferred) → PriceDisplay implementation
- T020: LoadingState (inferred) → LoadingState implementation

### From quickstart.md test scenarios:
- T012: Scenario 6 → Theme switching integration test
- T013: Scenario 2 → Responsive behavior integration test
- T014: Scenario 5 → Keyboard navigation integration test
- T033: All 8 scenarios → Manual validation

## Validation Checklist ✅

- [x] All contracts have corresponding tests (T005-T011)
- [x] All entities have model tasks (T015-T021)
- [x] All tests come before implementation (Phase 3.2 → 3.3)
- [x] Parallel tasks truly independent (verified file paths)
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task
- [x] TDD RED-GREEN-Refactor cycle enforced
- [x] 36 tasks generated covering complete implementation
- [x] Dependencies clearly mapped
- [x] Quickstart scenarios covered in validation

## Success Criteria
All tasks completed when:
1. ✅ All tests pass (GREEN phase)
2. ✅ Quickstart.md scenarios execute successfully
3. ✅ Performance goals met (<100ms render, 60fps)
4. ✅ Accessibility compliance (WCAG 2.1 AA)
5. ✅ Responsive design verified (320px-1920px)

---
*Generated from plan.md, data-model.md, contracts/, and quickstart.md*
*Following TDD methodology and constitutional principles*