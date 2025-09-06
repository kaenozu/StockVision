# StockVision フロントエンドアーキテクチャドキュメント

## 概要

StockVisionのフロントエンドは、ReactとTypeScriptを使用して構築されたシングルページアプリケーション(SPA)です。モダンなUI/UX、レスポンシブデザイン、アクセシビリティを提供します。

## 技術スタック

- **フレームワーク**: React 18 (関数コンポーネント + Hooks)
- **言語**: TypeScript
- **ルーティング**: React Router v6
- **状態管理**: React Hooks (useState, useEffect, useContext, useReducer), カスタムフック
- **UIライブラリ**: Tailwind CSS
- **チャート**: Chart.js
- **HTTPクライアント**: Axios
- **ビルドツール**: Vite
- **テスト**: Jest, React Testing Library
- **リンター/フォーマッター**: ESLint, Prettier

## ディレクトリ構造

```
frontend/src/
├── assets/              # 静的アセット (画像, フォントなど)
├── components/          # UIコンポーネント
│   ├── layout/          # レイアウトコンポーネント (Header, Footer, Layout)
│   ├── stock/           # 株式関連コンポーネント (StockCard, PriceChart)
│   ├── watchlist/       # ウォッチリストコンポーネント
│   ├── UI/              # 汎用UIコンポーネント (Button, LoadingSpinner)
│   ├── enhanced/        # 拡張コンポーネント (アクセシビリティ対応)
│   └── ...              # その他のコンポーネント
├── pages/               # ページコンポーネント (ルートに対応)
├── services/            # APIクライアント (stockApi)
├── hooks/               # カスタムフック (useStock, useWatchlist)
├── contexts/            # Reactコンテキスト (Theme, Responsive, Accessibility)
├── types/               # TypeScript型定義
├── utils/               # ユーティリティ (フォーマッター, バリデーター)
├── config/              # 設定 (UIテーマ)
├── App.tsx             # ルートアプリケーションコンポーネント
├── main.tsx            # エントリーポイント
└── index.css           # グローバルCSS
```

## コンポーネント設計

### レイアウトコンポーネント

- **App.tsx**: ルートコンポーネント。ルーティング、エラーバウンダリ、グローバルコンテキストプロバイダーを設定。
- **Layout.tsx**: メインレイアウト。ヘッダー、フッター、モバイルナビゲーションを含む。
- **Header.tsx**: ブランド、ナビゲーションリンク、グローバル検索バー。
- **Footer.tsx**: フッター情報、リンク、免責事項。
- **MobileNav.tsx**: モバイルデバイス用の底部ナビゲーション。

### 株式情報コンポーネント

- **StockCard.tsx**: 株式情報をカード形式で表示。価格、変動率、ウォッチリストボタンを含む。
- **PriceChart.tsx**: 価格チャート (ライン/ローソク足)。テクニカル指標 (SMA, EMA) の表示。
- **StockSearch.tsx**: 株式検索フォーム。銘柄コードの入力とバリデーション。

### ウォッチリストコンポーネント

- **WatchlistPage.tsx**: ウォッチリストページ。アイテムの追加、削除、一覧表示。
- **WatchListWidget.tsx**: ダッシュボード用のウォッチリストウィジェット。
- **RecentlyViewed.tsx**: 最近見た銘柄の履歴。

### 汎用UIコンポーネント

- **Button.tsx**: ボタンコンポーネント。プライマリ、セカンダリ、アウトライン、アイコンボタンなどをサポート。
- **LoadingSpinner.tsx**: ローディングスピナーとスケルトンUI。
- **ErrorMessage.tsx**: エラーメッセージ表示。

## 状態管理

### React Context

#### ThemeContext

アプリケーション全体のテーマ (ライト/ダーク/システム) を管理します。

- `theme`: 現在のテーマ設定 (`light` | `dark` | `system`)
- `actualTheme`: 実際に適用されるテーマ (`light` | `dark`)
- `setTheme`: テーマを変更する関数
- `toggleTheme`: テーマを切り替える関数
- `resetTheme`: テーマをリセットする関数

#### ResponsiveContext

画面サイズとデバイスタイプの情報を提供します。

- `windowWidth`: ウィンドウ幅
- `windowHeight`: ウィンドウ高さ
- `isMobile`: モバイルデバイスかどうか
- `isTablet`: タブレットデバイスかどうか
- `isDesktop`: デスクトップデバイスかどうか
- `isWide`: 広い画面デバイスかどうか
- `breakpoint`: 現在のブレークポイント (`mobile` | `tablet` | `desktop` | `wide`)
- `orientation`: 画面の向き (`portrait` | `landscape`)
- `isTouch`: タッチデバイスかどうか

#### AccessibilityContext

アクセシビリティ関連の設定を管理します。

- `focusMode`: フォーカスモードが有効かどうか
- `focusVisible`: フォーカスが可視かどうか
- `keyboardNavigation`: キーボードナビゲーションが使用されているかどうか
- `reducedMotion`: モーション軽減が有効かどうか
- `highContrast`: ハイコントラストモードが有効かどうか
- `largeText`: 大きな文字が有効かどうか
- `fontSize`: フォントサイズ設定
- `screenReader`: スクリーンリーダーが検出されたかどうか
- `announcements`: スクリーンリーダーへのアナウンスメッセージ

### カスタムフック

#### データ取得フック

- **useStock.ts**: 株式データの取得と状態管理。
  - `useStockData`: 基本的な株式情報を取得。
  - `useCurrentPrice`: 現在価格を取得。
  - `usePriceHistory`: 価格履歴を取得。
  - `useStockInfo`: 株式情報、現在価格、価格履歴をまとめて取得。
- **useWatchlist.ts**: ウォッチリストの取得と操作。
  - `useWatchlist`: ウォッチリスト全体を管理。
  - `useWatchlistItem`: 特定のウォッチリストアイテムを管理。

#### 永続化フック

- **useLocalStorage.ts**: ローカルストレージとの連携。
- **usePersistentState.ts**: 永続化された状態管理 (ウォッチリスト、設定、閲覧履歴)。

#### ユーティリティフック

- **useDebounce.ts**: デバウンス処理。
- **useMediaQuery.ts**: メディアクエリの使用。
- **useFocusManagement.ts**: フォーカス管理。

## APIクライアント

### stockApi.ts

バックエンドAPIとの通信を行うAxiosベースのクライアント。

**主な機能:**

- 型安全なHTTPリクエスト/レスポンス
- キャッシュとの連携
- エラーハンドリングと型ガード (`isApiError`)
- リトライ処理
- モックデータとリアルデータの切り替え

**提供される関数:**

- `getStockData`: 銘柄情報を取得。
- `getCurrentPrice`: 現在価格を取得。
- `getPriceHistory`: 価格履歴を取得。
- `getWatchlist`: ウォッチリストを取得。
- `addToWatchlist`: ウォッチリストに追加。
- `removeFromWatchlist`: ウォッチリストから削除。
- `healthCheck`: ヘルスチェック。

## ユーティリティ

### フォーマッター (formatters.ts)

- `formatPrice`: 価格を日本円でフォーマット。
- `formatPriceChange`: 価格変動をフォーマット。
- `formatPercentageChange`: 価格変動率をフォーマット。
- `formatVolume`: 出来高をフォーマット。
- `formatDateJapanese`: 日付を日本語でフォーマット。
- `formatTimestamp`: タイムスタンプをフォーマット。
- `formatMarketStatus`: 市場ステータスをフォーマット。

### バリデーター (validation.ts)

- `validateStockCode`: 銘柄コードのバリデーション。
- `validatePrice`: 価格のバリデーション。
- `validateDays`: 日数のバリデーション。
- `validateStockSearchForm`: 株式検索フォームのバリデーション。
- `validateWatchlistForm`: ウォッチリストフォームのバリデーション。

### キャッシュユーティリティ (cache.ts)

- `generateCacheKey`: キャッシュキーを生成。オブジェクトのキーを再帰的にソートして一貫性を確保。

## パフォーマンス最適化

### コード分割

- `React.lazy` と `Suspense` を使用して、ページ単位でコードを分割。
- 初期ロード時間を短縮。

### メモ化

- `useMemo` と `useCallback` を使用して、計算結果やコールバック関数をメモ化。
- 不要な再レンダリングを抑制。

### デバウンス

- 検索入力など、頻繁に発生するイベントにデバウンスを適用。
- API呼び出しの回数を削減。

### 仮想リスト

- 大量のデータを表示する場合に、仮想リストを使用。
- DOMノードの数を削減し、パフォーマンスを向上。

### パフォーマンスモニタリング

- バックエンドの `PerformanceMetricsMiddleware` を使用して、APIリクエストのパフォーマンスを監視。
- スローリクエストのログ出力と警告。
- メトリクスAPIを使用して、フロントエンドからパフォーマンスデータを取得し、ダッシュボードで可視化。

## アクセシビリティ

### キーボードナビゲーション

- キーボードのみで操作可能なUIを提供。
- フォーカスリングの表示。

### ARIA属性

- スクリーンリーダーに対応したARIA属性を適用。
- ライブリージョンによるダイナミックコンテンツの通知。

### ハイコントラストモード

- ハイコントラストテーマを提供。
- 色のコントラスト比を確保。

### モーション軽減

- `prefers-reduced-motion` メディアクエリに対応。
- ユーザーがモーション軽減を希望する場合、アニメーションを無効化。

## レスポンシブデザイン

### ブレークポイント

- `mobile`: 768px未満
- `tablet`: 768px以上、1024px未満
- `desktop`: 1024px以上、1280px未満
- `wide`: 1280px以上

### レイアウト

- FlexboxとGridを使用したレスポンシブレイアウト。
- モバイルファーストのアプローチ。

### コンポーネント

- デバイスタイプに応じたコンポーネントの表示/非表示。
- モバイル用の特別なコンポーネント (例: MobileNav)。

### テスト

#### 単体テスト

- JestとReact Testing Libraryを使用。
- コンポーネント、フック、ユーティリティ関数のテスト。

#### E2Eテスト

- Playwrightを使用して、実際のブラウザ上でアプリケーション全体のフローをテストします。

#### コンポーネントテストとカタログ化

- Storybookを使用して、UIコンポーネントを独立した環境で開発、テスト、ドキュメント化します。
- 各コンポーネントのストーリーを作成し、さまざまな状態やプロパティの組み合わせを可視化します。
- コンポーネントのプロパティや使用方法を自動生成されたドキュメントで確認できます。

## デプロイ

### ビルド

- `npm run build` で本番用ビルドを生成。
- Viteによるバンドルと最適化。

### 環境変数

- `.env` ファイルで環境変数を管理。
- `VITE_API_BASE_URL` でAPIのベースURLを指定。

### ホスティング

- Vercelなど、静的サイトホスティングサービスでデプロイ。

## 追加情報

### useWatchlistItem カスタムフック

`useWatchlistItem` は、特定の銘柄コードに対するウォッチリストアイテムの状態を管理するカスタムフックです。

**主な機能:**

- 特定の銘柄がウォッチリストに含まれているかどうかを確認 (`isInWatchlist`)。
- ウォッチリストアイテムのデータを取得 (`item`)。
- アイテムをウォッチリストに追加、削除、またはトグルする関数 (`addToWatchlist`, `removeFromWatchlist`, `toggleWatchlist`)。
- アラート価格を設定する機能。

**使用例:**

```typescript
import { useWatchlistItem } from '../hooks/useWatchlist';

function MyComponent({ stockCode }: { stockCode: string }) {
  const { item, isInWatchlist, addToWatchlist, removeFromWatchlist } = useWatchlistItem(stockCode);

  return (
    <div>
      {isInWatchlist ? (
        <button onClick={() => removeFromWatchlist(stockCode)}>ウォッチリストから削除</button>
      ) : (
        <button onClick={() => addToWatchlist({ stock_code: stockCode })}>ウォッチリストに追加</button>
      )}
      {item && item.alert_price_high && <p>高値アラート: {item.alert_price_high}</p>}
      {item && item.alert_price_low && <p>安値アラート: {item.alert_price_low}</p>}
    </div>
  );
}
```

### ウォッチリスト関連コンポーネント

ウォッチリスト関連のコンポーネントは `frontend/src/components/watchlist/` に配置されています。

- **EditWatchlistItemModal.tsx**: ウォッチリストアイテムのアラート価格やメモを編集するためのモーダルコンポーネント。