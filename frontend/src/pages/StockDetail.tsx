import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'

// 固定の株価データ（詳細版）
const stockDetailData = {
  '7203': {
    code: '7203',
    name: 'トヨタ自動車',
    price: 2340,
    change: 57,
    changePercent: 2.5,
    volume: 12543000,
    high: 2365,
    low: 2310,
    open: 2325,
    marketCap: '35.2兆円',
    per: 8.2,
    pbr: 0.85,
    description: '世界最大級の自動車メーカー。ハイブリッド技術のリーディングカンパニー。'
  },
  '9984': {
    code: '9984',
    name: 'ソフトバンクグループ',
    price: 5680,
    change: -104,
    changePercent: -1.8,
    volume: 8921000,
    high: 5750,
    low: 5650,
    open: 5720,
    marketCap: '10.8兆円',
    per: 15.3,
    pbr: 1.2,
    description: 'テクノロジー投資を行う投資会社。AI、IoT分野への投資を積極展開。'
  },
  '6758': {
    code: '6758',
    name: 'ソニーグループ',
    price: 12800,
    change: 320,
    changePercent: 2.6,
    volume: 3245000,
    high: 12850,
    low: 12520,
    open: 12600,
    marketCap: '16.5兆円',
    per: 12.8,
    pbr: 1.8,
    description: 'エンターテインメント・テクノロジー企業。ゲーム、音楽、映像事業を展開。'
  },
  '7974': {
    code: '7974',
    name: '任天堂',
    price: 6890,
    change: 213,
    changePercent: 3.2,
    volume: 2156000,
    high: 6920,
    low: 6740,
    open: 6780,
    marketCap: '9.1兆円',
    per: 16.2,
    pbr: 3.6,
    description: 'ゲーム機・ゲームソフトの開発・販売。Nintendo Switchが大ヒット。'
  },
  '6861': {
    code: '6861',
    name: 'キーエンス',
    price: 48500,
    change: -725,
    changePercent: -1.5,
    volume: 456000,
    high: 49200,
    low: 48100,
    open: 48800,
    marketCap: '14.3兆円',
    per: 28.5,
    pbr: 8.2,
    description: 'センサー・測定器の開発・製造・販売。高収益企業として有名。'
  },
  '9983': {
    code: '9983',
    name: 'ファーストリテイリング',
    price: 8950,
    change: 178,
    changePercent: 2.0,
    volume: 1789000,
    high: 8980,
    low: 8820,
    open: 8860,
    marketCap: '10.2兆円',
    per: 18.7,
    pbr: 2.1,
    description: 'ユニクロを展開するアパレル企業。グローバル展開を積極推進。'
  }
}

const StockDetail = () => {
  const { stockCode } = useParams<{ stockCode: string }>()
  const navigate = useNavigate()
  
  const stock = stockCode ? stockDetailData[stockCode as keyof typeof stockDetailData] : null

  if (!stock) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1e293b 0%, #334155 50%, #475569 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '2rem',
          textAlign: 'center'
        }}>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>銘柄が見つかりません</h1>
          <button
            onClick={() => navigate('/')}
            style={{
              background: '#6366f1',
              color: 'white',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            ダッシュボードに戻る
          </button>
        </div>
      </div>
    )
  }

  const isPositive = stock.change >= 0

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1e293b 0%, #334155 50%, #475569 100%)',
      padding: '2rem 1rem'
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto'
      }}>
        {/* 戻るボタン */}
        <button
          onClick={() => navigate('/')}
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            color: 'white',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '8px',
            padding: '0.5rem 1rem',
            cursor: 'pointer',
            marginBottom: '2rem',
            fontSize: '0.9rem'
          }}
        >
          ← ダッシュボードに戻る
        </button>

        {/* メインカード */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '2rem',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.25)',
          marginBottom: '2rem'
        }}>
          {/* ヘッダー部分 */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '2rem',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div>
              <h1 style={{
                fontSize: '2rem',
                fontWeight: 'bold',
                color: '#1e293b',
                margin: '0 0 0.5rem 0'
              }}>
                {stock.name}
              </h1>
              <p style={{
                background: '#e2e8f0',
                color: '#64748b',
                padding: '0.25rem 0.75rem',
                borderRadius: '12px',
                fontSize: '0.9rem',
                fontWeight: '600',
                display: 'inline-block',
                margin: 0
              }}>
                {stock.code}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{
                fontSize: '2.5rem',
                fontWeight: 'bold',
                color: '#1e293b',
                margin: '0 0 0.5rem 0'
              }}>
                ¥{stock.price.toLocaleString()}
              </div>
              <div style={{
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: 'bold',
                background: isPositive ? '#dcfce7' : '#fecaca',
                color: isPositive ? '#166534' : '#dc2626'
              }}>
                {isPositive ? '+' : ''}¥{stock.change.toLocaleString()} ({isPositive ? '+' : ''}{stock.changePercent}%)
              </div>
            </div>
          </div>

          {/* 価格情報 */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '1rem',
            marginBottom: '2rem'
          }}>
            <div style={{ textAlign: 'center', padding: '1rem', background: '#f8fafc', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.5rem' }}>始値</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#1e293b' }}>¥{stock.open.toLocaleString()}</div>
            </div>
            <div style={{ textAlign: 'center', padding: '1rem', background: '#f8fafc', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.5rem' }}>高値</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#dc2626' }}>¥{stock.high.toLocaleString()}</div>
            </div>
            <div style={{ textAlign: 'center', padding: '1rem', background: '#f8fafc', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.5rem' }}>安値</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#2563eb' }}>¥{stock.low.toLocaleString()}</div>
            </div>
            <div style={{ textAlign: 'center', padding: '1rem', background: '#f8fafc', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.5rem' }}>出来高</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#1e293b' }}>{stock.volume.toLocaleString()}</div>
            </div>
          </div>

          {/* 財務指標 */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            marginBottom: '2rem'
          }}>
            <div style={{ padding: '1rem', background: '#f1f5f9', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '0.5rem' }}>時価総額</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#1e293b' }}>{stock.marketCap}</div>
            </div>
            <div style={{ padding: '1rem', background: '#f1f5f9', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '0.5rem' }}>PER</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#1e293b' }}>{stock.per}倍</div>
            </div>
            <div style={{ padding: '1rem', background: '#f1f5f9', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '0.5rem' }}>PBR</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#1e293b' }}>{stock.pbr}倍</div>
            </div>
          </div>

          {/* 会社説明 */}
          <div style={{
            padding: '1.5rem',
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            borderRadius: '12px',
            color: 'white'
          }}>
            <h3 style={{
              fontSize: '1.2rem',
              fontWeight: 'bold',
              marginBottom: '1rem',
              margin: '0 0 1rem 0'
            }}>
              会社概要
            </h3>
            <p style={{
              fontSize: '1rem',
              lineHeight: '1.6',
              margin: 0
            }}>
              {stock.description}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default StockDetail