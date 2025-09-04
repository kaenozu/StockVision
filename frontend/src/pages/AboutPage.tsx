import React from 'react'

const AboutPage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center">株式追跡システムについて</h1>
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4 text-gray-800">システム概要</h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            この株式追跡システムは、リアルタイムで日本株の価格情報を監視し、
            ポートフォリオ管理を支援するWebアプリケーションです。
          </p>
          <p className="text-gray-600 leading-relaxed">
            ユーザーは気になる株式をウォッチリストに追加し、
            価格変動やチャート分析を通じて投資判断をサポートします。
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4 text-gray-800">主な機能</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-600">
            <li>リアルタイム株価取得と表示</li>
            <li>価格履歴チャートの表示</li>
            <li>ウォッチリスト機能</li>
            <li>価格アラート設定</li>
            <li>株式検索機能</li>
            <li>レスポンシブデザイン対応</li>
          </ul>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4 text-gray-800">技術仕様</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium mb-2 text-gray-700">フロントエンド</h3>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                <li>React 18 + TypeScript</li>
                <li>Vite (ビルドツール)</li>
                <li>Tailwind CSS (スタイリング)</li>
                <li>React Router (ルーティング)</li>
                <li>Chart.js (グラフ表示)</li>
                <li>Axios (HTTP通信)</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-medium mb-2 text-gray-700">バックエンド</h3>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                <li>FastAPI (Python)</li>
                <li>Pydantic (データ検証)</li>
                <li>Uvicorn (ASGI サーバー)</li>
                <li>モックデータ生成</li>
                <li>CORS対応</li>
                <li>RESTful API設計</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-semibold mb-4 text-gray-800">免責事項</h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            本システムは教育・デモンストレーション目的で作成されています。
            実際の投資判断にはご利用いただけません。
            投資は自己責任で行ってください。
          </p>
        </div>
      </div>
    </div>
  )
}

export default AboutPage