# Phase 1: Data Model - UIの改善

**Feature**: UIの改善 | **Date**: 2025-09-04  
**Dependencies**: research.md完了

## UIstate entities from feature spec

### ThemeContext
**Purpose**: ダークモード/ライトモード切り替え管理  
**Fields**:
- `theme: 'light' | 'dark' | 'system'` - 現在のテーマ設定
- `toggleTheme: () => void` - テーマ切り替え関数
- `systemPreference: 'light' | 'dark'` - システムの推奨設定

**Validation Rules**:
- theme値は定義された3つのオプションのみ
- システム設定は`prefers-color-scheme`から取得

### ResponsiveContext  
**Purpose**: レスポンシブブレイクポイント管理
**Fields**:
- `breakpoint: 'xs' | 'sm' | 'md' | 'lg' | 'xl'` - 現在のブレイクポイント
- `isMobile: boolean` - モバイル表示判定
- `isTablet: boolean` - タブレット表示判定
- `isDesktop: boolean` - デスクトップ表示判定

**Validation Rules**:
- breakpoint boundaries: xs(<320px), sm(320-640px), md(640-768px), lg(768-1024px), xl(1024px+)
- boolean状態の一貫性保証

### AccessibilityContext
**Purpose**: アクセシビリティ設定管理  
**Fields**:
- `highContrast: boolean` - 高コントラストモード
- `reduceMotion: boolean` - アニメーション削減
- `keyboardNavigation: boolean` - キーボードナビゲーション状態
- `screenReaderActive: boolean` - スクリーンリーダー検出

**Validation Rules**:
- システム設定からの初期値取得
- ユーザー設定でのオーバーライド可能

### VisualIndicator
**Purpose**: 価格変動表示エンティティ
**Fields**:
- `value: number` - 価格値
- `previousValue: number` - 前回の価格
- `change: number` - 変動値
- `changePercent: number` - 変動率
- `trend: 'up' | 'down' | 'neutral'` - トレンド方向
- `visualStyle: VisualStyle` - 視覚スタイル

**Relationships**: 
- StockDataと1:1関係
- VisualStyleと1:1関係

**State Transitions**:
- value更新 → change計算 → trend決定 → visualStyle更新

### VisualStyle
**Purpose**: 視覚的表現設定
**Fields**:
- `color: string` - メインカラー
- `backgroundColor: string` - 背景色
- `icon: string` - アイコン名
- `arrowDirection: 'up' | 'down' | 'neutral'` - 矢印方向
- `contrast: 'normal' | 'high'` - コントラスト設定

**Validation Rules**:
- color値はWCAG AA準拠
- アクセシビリティ設定との整合性
- 色覚対応パレット使用

### ChartConfig
**Purpose**: チャート表示設定
**Fields**:
- `type: 'line' | 'candlestick'` - チャートタイプ
- `timeframe: '1d' | '1w' | '1m' | '3m' | '1y'` - 時間軸
- `indicators: string[]` - 表示インジケーター
- `theme: 'light' | 'dark'` - チャートテーマ

**Relationships**:
- ThemeContextから theme を継承
- PriceHistoryデータと連携

## Entity Relationships

```
ThemeContext ←→ VisualStyle
    ↓
ResponsiveContext ←→ ChartConfig
    ↓  
AccessibilityContext ←→ VisualIndicator
    ↓
VisualIndicator → VisualStyle
```

## Implementation Notes

- すべてのContextはReact.createContextで管理
- LocalStorageでユーザー設定を永続化  
- システム設定はmedia queriesで検出
- 色覚対応はColorBrewer推奨パレット使用
- パフォーマンスのためuseCallbackとuseMemoを適用