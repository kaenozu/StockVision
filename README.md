# StockVision - 株価分析・可視化アプリケーション

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python](https://img.shields.io/badge/Python-3.10%2B-blue)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104.1-green)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18.2.0-blue)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.0.0-yellow)](https://vitejs.dev/)
[![Lighthouse](https://img.shields.io/badge/Lighthouse-90%2B-brightgreen)](https://developers.google.com/web/tools/lighthouse)

## 📖 概要

StockVisionは、株式市場のデータをリアルタイムで取得・分析・可視化するためのWebアプリケーションです。
日本株に対応しており、株価情報、価格推移、技術指標、ポートフォリオ管理機能を提供します。

## 🌟 主な機能

- **リアルタイム株価取得**: Yahoo Finance APIまたはモックデータから株価情報を取得
- **価格チャート可視化**: 日足・週足・月足のチャート表示（移動平均線対応）
- **価格予測**: 機械学習モデルによる株価予測機能
- **ウォッチリスト**: 注目銘柄の管理とアラート設定
- **技術指標**: RSI、MACD、ボリンジャーバンドなどの指標計算
- **レスポンシブデザイン**: PC・タブレット・スマートフォン対応

## 🛠️ 技術スタック

### バックエンド
- **Python 3.10+**
- **FastAPI**: 高速なAPI開発フレームワーク
- **SQLAlchemy**: ORMライブラリ
- **SQLite**: ローカルデータベース
- **yfinance**: Yahoo Finance APIクライアント
- **Pandas**: データ分析ライブラリ
- **Scikit-learn**: 機械学習ライブラリ

### フロントエンド
- **React 18.2.0**: コンポーネントベースのUIライブラリ
- **TypeScript**: 型安全なJavaScript
- **Vite 5.0.0**: 高速なビルドツール
- **Tailwind CSS**: ユーティリティファーストCSSフレームワーク
- **Chart.js**: チャート可視化ライブラリ
- **React Router**: ルーティングライブラリ

## 🚀 クイックスタート

### 前提条件

- Python 3.10以上
- Node.js 18以上
- npm 9以上

### インストール

#### バックエンド

```bash
# 仮想環境の作成と有効化
python -m venv venv
source venv/bin/activate  # Linux/Mac
# または
venv\Scripts\activate  # Windows

# 依存関係のインストール
pip install -r requirements.txt
```

#### フロントエンド

```bash
# フロントエンドディレクトリに移動
cd frontend

# 依存関係のインストール
npm install
```

### 環境変数の設定

#### バックエンド (.env)
```
USE_REAL_YAHOO_API=false
DATABASE_URL=sqlite:///data/stock_tracking.db
LOG_LEVEL=INFO
SERVER_URL=http://localhost:8000
CORS_ORIGINS=*
CORS_ALLOW_CREDENTIALS=true
CORS_ALLOW_METHODS=*
CORS_ALLOW_HEADERS=*
ENABLE_METRICS=false
```

#### フロントエンド (.env)
```
VITE_API_BASE_URL=http://localhost:8000
```

メトリクスを有効化する場合は `ENABLE_METRICS=true` を設定し、`/metrics` エンドポイントから Prometheus 形式で取得できます。

## 📊 パフォーマンス

- **Lighthouse Score**: 90+
- **初回ロード**: < 2秒
- **API レスポンス**: < 500ms
- **メモリ使用量**: < 50MB

## 🤝 貢献

1. フォークして機能ブランチを作成
2. 変更をコミット (`git commit -am 'Add feature'`)
3. ブランチにプッシュ (`git push origin feature`)
4. プルリクエストを作成

## 📝 ライセンス

このプロジェクトはMITライセンスの下で公開されています。
# 📈 オブザーバビリティ

- Prometheusスクレイプ例: `docs/observability/prometheus-scrape.md`
- Grafanaダッシュボード: `docs/observability/grafana-dashboard.json`
- Alertmanagerルール例: `docs/observability/alerts.yml`