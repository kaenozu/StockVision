# Feature Specification: 株価予想・推奨・売買時期表示システム

**Feature Branch**: `001-stock-prediction-system`  
**Created**: 2025-09-04  
**Status**: Draft  
**Input**: User description: "株価予想、推奨、購入時期、売却時期表示システム"

## Execution Flow (main)
```
1. Parse user description from Input
   → If empty: ERROR "No feature description provided"
2. Extract key concepts from description
   → Identified: 株価予想, 推奨, 購入時期, 売却時期, 表示システム
3. For each unclear aspect:
   → Mark with [NEEDS CLARIFICATION: specific question]
4. Fill User Scenarios & Testing section
   → If no clear user flow: ERROR "Cannot determine user scenarios"
5. Generate Functional Requirements
   → Each requirement must be testable
   → Mark ambiguous requirements
6. Identify Key Entities (if data involved)
7. Run Review Checklist
   → If any [NEEDS CLARIFICATION]: WARN "Spec has uncertainties"
   → If implementation details found: ERROR "Remove tech details"
8. Return: SUCCESS (spec ready for planning)
```

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

---

## User Scenarios & Testing *(mandatory)*

### Primary User Story
個人投資家として、パッと見て「この銘柄をいつ買っていつ売ればいい」かが一目で分かる情報を確認し、迷わず投資判断を行いたい。

### Acceptance Scenarios
1. **Given** システムを起動した投資家、**When** 銘柄コードまたは会社名を入力、**Then** その銘柄の「○月○日に買い」「○月○日に売り」といった具体的なタイミングが表示される
2. **Given** 複数銘柄を確認したい投資家、**When** 銘柄リストを表示、**Then** 各銘柄の買い時・売り時が一覧で色分け表示される
3. **Given** 今日売買すべき銘柄を知りたい投資家、**When** 「今日のアクション」を確認、**Then** 本日買うべき銘柄・売るべき銘柄が明確に表示される
4. **Given** 予測精度を確認したい投資家、**When** 精度レポートを表示、**Then** 過去の予測的中率と誤差率が確認できる

### Edge Cases
- データが取得できない銘柄の場合は「データ取得不可」のエラーメッセージを表示し、ダミー値は表示しない
- インターネット接続がない場合は最後に取得した実データを表示し、「オフライン」表記を明示する
- テスト実行時はダミーデータ使用を許可するが、本番画面では一切使用しない

## Requirements *(mandatory)*

### Functional Requirements
- **FR-001**: システムは銘柄コードまたは会社名による銘柄検索機能を提供しなければならない
- **FR-002**: システムは現在株価と予想価格を表示しなければならない
- **FR-003**: システムは具体的な買い推奨日と売り推奨日を「○月○日」形式で明確に表示しなければならない
- **FR-004**: システムは買い時・売り時を色分け（緑：買い時、赤：売り時、黄：保有継続）で視覚的に表示しなければならない
- **FR-005**: システムは「今日のアクション」として当日売買すべき銘柄を専用画面で表示しなければならない
- **FR-006**: システムは気になる銘柄をウォッチリストに登録・管理できなければならない
- **FR-007**: システムは登録銘柄の一覧を売買タイミングと共に表示しなければならない
- **FR-008**: システムは手動でデータを更新する機能を提供しなければならない
- **FR-009**: システムは画面に表示するすべてのデータを実データ（実際の株価情報）とし、ダミーデータは一切表示してはならない
- **FR-010**: システムはダミーデータをテストクラス内でのみ使用可能とし、本番画面では使用を禁止しなければならない
- **FR-011**: システムは市場開始前（8:30）に自動でデータ更新を行わなければならない
- **FR-012**: システムは市場時間中（9:00-15:00）は30分間隔で自動更新を行わなければならない
- **FR-013**: システムは市場終了後（15:30）に終値確定の自動更新を行わなければならない
- **FR-014**: システムは休場日および夜間（17:00-8:30）は自動更新を停止しなければならない
- **FR-015**: システムは過去の予測的中率を追跡し、推奨の成功・失敗を記録しなければならない
- **FR-016**: システムは予想価格と実際価格を比較し、予測精度の誤差率を計算・表示しなければならない
- **FR-017**: システムは買い/売り推奨に従った場合の収益率を測定・表示しなければならない

### Non-Functional Requirements
- **NFR-001**: システムは個人端末（Windows PC）で動作し、複雑なセットアップを必要としない
- **NFR-002**: システムは銘柄データをローカルに保存し、データ消失を防ぐ
- **NFR-003**: システムは直感的で分かりやすいユーザーインターフェースを提供する

### Data Integrity Requirements
- **DIR-001**: システムは実データ取得に失敗した場合、エラーメッセージを表示し、ダミーデータで代替してはならない
- **DIR-002**: システムはテスト実行時においてのみ、テストクラス内でダミーデータの使用を許可する
- **DIR-003**: システムは本番環境とテスト環境を明確に分離し、誤ってダミーデータが本番画面に表示されることを防止する

### Key Entities *(include if feature involves data)*
- **銘柄（Stock）**: 株式コード、会社名、現在価格、予想価格、買い推奨日、売り推奨日、アクション色（緑/赤/黄）
- **今日のアクション（TodayAction）**: 本日買うべき銘柄リスト、本日売るべき銘柄リスト
- **ウォッチリスト（Watchlist）**: 登録銘柄のリスト、各銘柄の次回売買予定日、最終更新日時
- **予測履歴（PredictionHistory）**: 予測日、銘柄コード、予想価格、実際価格、的中フラグ
- **精度レポート（AccuracyReport）**: 的中率、平均誤差率、推奨成功率、期間別統計

---

## Review & Acceptance Checklist
*GATE: Automated checks run during main() execution*

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and personal needs
- [x] Written for simple understanding
- [x] All mandatory sections completed

### Requirement Completeness
- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are simple and testable
- [x] Success criteria are clear
- [x] Scope is minimal and focused
- [x] Core functionality identified

---

## Execution Status
*Updated by main() during processing*

- [x] User description parsed
- [x] Key concepts extracted  
- [x] Requirements simplified to core essentials
- [x] User scenarios streamlined
- [x] Complex features removed
- [x] Simple entities identified
- [x] Review checklist completed for simplified spec

---
