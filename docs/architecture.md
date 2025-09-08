## セキュリティ

- **CORS**: クロスオリジンリクエストの制限
- **コンテンツセキュリティ**: セキュリティヘッダーの設定
- **入力バリデーション**: Pydanticによるリクエストバリデーション

## テスト

- **ユニットテスト**: pytestによるビジネスロジックのテスト
- **統合テスト**: APIエンドポイントの統合テスト
- **コントラクトテスト**: API仕様の検証
- **フロントエンドテスト**: Jest + React Testing Libraryによるコンポーネントテスト

## デプロイ

- **バックエンド**: Railway (Python)
- **フロントエンド**: Vercel (React)
- **環境変数**: `.env`ファイルによる設定管理
- **CI/CD**: GitHub Actionsによる自動テストとデプロイ

## カスタムフック

- **useStock.ts**: 株式データの取得と状態管理
- **useWatchlist.ts**: ウォッチリストの取得と操作
- **useLocalStorage.ts**: ローカルストレージとの連携
- **usePersistentState.ts**: 永続化された状態管理
- **useTheme.ts**: テーマ状態の管理
- **useTranslation.ts**: 多言語対応