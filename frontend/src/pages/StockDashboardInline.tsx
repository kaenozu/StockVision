import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

// 固定の株価データ
const fixedStockData = [
  { code: '7203', name: 'トヨタ自動車', price: 2340, change: 57, changePercent: 2.5 },
  { code: '9984', name: 'ソフトバンクグループ', price: 5680, change: -104, changePercent: -1.8 },
  { code: '6758', name: 'ソニーグループ', price: 12800, change: 320, changePercent: 2.6 },
  { code: '7974', name: '任天堂', price: 6890, change: 213, changePercent: 3.2 },
  { code: '6861', name: 'キーエンス', price: 48500, change: -725, changePercent: -1.5 },
  { code: '9983', name: 'ファーストリテイリング', price: 8950, change: 178, changePercent: 2.0 }
]

interface Stock {
  code: string
  name: string
  price: number
  change: number
  changePercent: number
}

const StockDashboardInline = () => {
  const [stocks, setStocks] = useState<Stock[]>(fixedStockData)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const refreshData = () => {
    // 簡単な擬似更新（実際のAPIがあれば、ここで呼び出す）
    setLoading(true)
    setTimeout(() => {
      setStocks([...fixedStockData])
      setLoading(false)
    }, 500)
  }

  const upStocks = stocks.filter(s => s.change > 0).length
  const downStocks = stocks.filter(s => s.change < 0).length

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #581c87 0%, #1e3a8a 50%, #312e81 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          color: 'white',
          fontSize: '1.5rem',
          fontWeight: 'bold',
          animation: 'pulse 2s infinite'
        }}>
          📊 株価データを読み込み中...
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1e293b 0%, #334155 50%, #475569 100%)',
      padding: '2rem 1rem'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        {/* ヘッダー */}
        <div style={{
          textAlign: 'center',
          marginBottom: '3rem',
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          borderRadius: '12px',
          padding: '1.5rem',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.25)',
          border: '1px solid #a5b4fc'
        }}>
          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: 'bold',
            color: 'white',
            margin: '0 0 0.5rem 0',
            textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
          }}>
            📊 StockVision ダッシュボード
          </h1>
          <p style={{
            fontSize: '1.25rem',
            color: 'white',
            fontWeight: '600',
            margin: 0
          }}>
            リアルタイム株価情報システム
          </p>
        </div>

        {/* 統計カード */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '2rem',
          marginBottom: '3rem'
        }}>
          <div style={{
            cursor: 'pointer',
            transform: 'scale(1)',
            transition: 'transform 0.2s',
            background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
            borderRadius: '12px',
            padding: '1.5rem',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            border: '1px solid #cbd5e1'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <p style={{
                  fontSize: '0.875rem',
                  fontWeight: 'bold',
                  color: '#475569',
                  margin: 0
                }}>上昇銘柄</p>
                <p style={{
                  fontSize: '2rem',
                  fontWeight: 'bold',
                  color: '#1e293b',
                  margin: '0.25rem 0 0 0'
                }}>{upStocks}</p>
              </div>
              <div style={{
                width: '4rem',
                height: '4rem',
                borderRadius: '50%',
                background: '#22c55e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2rem',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.25)',
                border: '2px solid white'
              }}>
                📈
              </div>
            </div>
            <div style={{
              marginTop: '0.75rem',
              textAlign: 'center'
            }}>
              <span style={{
                background: '#6366f1',
                color: 'white',
                fontSize: '0.75rem',
                padding: '0.25rem 0.75rem',
                borderRadius: '9999px',
                fontWeight: 'bold'
              }}>
                統計情報
              </span>
            </div>
          </div>

          <div style={{
            cursor: 'pointer',
            transform: 'scale(1)',
            transition: 'transform 0.2s',
            background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
            borderRadius: '12px',
            padding: '1.5rem',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            border: '1px solid #cbd5e1'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <p style={{
                  fontSize: '0.875rem',
                  fontWeight: 'bold',
                  color: '#475569',
                  margin: 0
                }}>下落銘柄</p>
                <p style={{
                  fontSize: '2rem',
                  fontWeight: 'bold',
                  color: '#1e293b',
                  margin: '0.25rem 0 0 0'
                }}>{downStocks}</p>
              </div>
              <div style={{
                width: '4rem',
                height: '4rem',
                borderRadius: '50%',
                background: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2rem',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.25)',
                border: '2px solid white'
              }}>
                📉
              </div>
            </div>
            <div style={{
              marginTop: '0.75rem',
              textAlign: 'center'
            }}>
              <span style={{
                background: '#6366f1',
                color: 'white',
                fontSize: '0.75rem',
                padding: '0.25rem 0.75rem',
                borderRadius: '9999px',
                fontWeight: 'bold'
              }}>
                統計情報
              </span>
            </div>
          </div>

          <div style={{
            cursor: 'pointer',
            transform: 'scale(1)',
            transition: 'transform 0.2s',
            background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
            borderRadius: '12px',
            padding: '1.5rem',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            border: '1px solid #cbd5e1'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <p style={{
                  fontSize: '0.875rem',
                  fontWeight: 'bold',
                  color: '#475569',
                  margin: 0
                }}>監視銘柄</p>
                <p style={{
                  fontSize: '2rem',
                  fontWeight: 'bold',
                  color: '#1e293b',
                  margin: '0.25rem 0 0 0'
                }}>{stocks.length}</p>
              </div>
              <div style={{
                width: '4rem',
                height: '4rem',
                borderRadius: '50%',
                background: '#eab308',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2rem',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.25)',
                border: '2px solid white'
              }}>
                👀
              </div>
            </div>
            <div style={{
              marginTop: '0.75rem',
              textAlign: 'center'
            }}>
              <span style={{
                background: '#6366f1',
                color: 'white',
                fontSize: '0.75rem',
                padding: '0.25rem 0.75rem',
                borderRadius: '9999px',
                fontWeight: 'bold'
              }}>
                統計情報
              </span>
            </div>
          </div>
        </div>

        {/* 株価カード一覧セクション */}
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: 'bold',
            color: 'white',
            textAlign: 'center',
            marginBottom: '1.5rem',
            background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
            borderRadius: '8px',
            padding: '1rem',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}>
            🏢 主要銘柄一覧 🏢
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '2rem'
          }}>
            {stocks.map((stock) => {
              const isPositive = stock.change >= 0
              return (
                <div key={stock.code} style={{
                  cursor: 'pointer',
                  transform: 'scale(1)',
                  transition: 'transform 0.2s',
                  background: isPositive 
                    ? 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)' 
                    : 'linear-gradient(135deg, #fecaca 0%, #fca5a5 100%)',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.25)',
                  border: isPositive ? '2px solid #86efac' : '2px solid #fca5a5'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                onClick={() => navigate(`/stock/${stock.code}`)}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    marginBottom: '1rem'
                  }}>
                    <div>
                      <h3 style={{
                        fontSize: '1.125rem',
                        fontWeight: 'bold',
                        color: '#1f2937',
                        margin: '0 0 0.5rem 0'
                      }}>{stock.name}</h3>
                      <p style={{
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: '#4b5563',
                        background: '#e5e7eb',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        margin: 0,
                        display: 'inline-block'
                      }}>{stock.code}</p>
                    </div>
                    <div style={{
                      padding: '0.75rem 1rem',
                      borderRadius: '9999px',
                      fontSize: '0.875rem',
                      fontWeight: 'bold',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      background: isPositive ? '#22c55e' : '#ef4444',
                      color: 'white'
                    }}>
                      {isPositive ? '+' : ''}{stock.changePercent}%
                    </div>
                  </div>
                  
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'space-between'
                  }}>
                    <div>
                      <p style={{
                        fontSize: '2rem',
                        fontWeight: 'bold',
                        color: '#1f2937',
                        margin: '0 0 0.5rem 0'
                      }}>
                        ¥{stock.price.toLocaleString()}
                      </p>
                      <p style={{
                        fontSize: '1.125rem',
                        fontWeight: 'bold',
                        color: isPositive ? '#15803d' : '#dc2626',
                        margin: 0
                      }}>
                        {isPositive ? '+' : ''}¥{Math.abs(stock.change).toLocaleString()}
                      </p>
                    </div>
                    <div style={{
                      fontSize: '2.5rem'
                    }}>
                      {isPositive ? '📈' : '📉'}
                    </div>
                  </div>
                  
                  <div style={{
                    marginTop: '1rem',
                    textAlign: 'center'
                  }}>
                    <span style={{
                      background: '#3b82f6',
                      color: 'white',
                      fontSize: '0.75rem',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '9999px',
                      fontWeight: '600'
                    }}>
                      クリックで詳細
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* フッター */}
        <div style={{
          textAlign: 'center',
          marginTop: '3rem',
          paddingTop: '2rem',
          background: 'linear-gradient(135deg, #475569 0%, #64748b 100%)',
          borderRadius: '12px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          border: '1px solid #64748b',
          padding: '2rem'
        }}>
          <button
            onClick={refreshData}
            style={{
              transform: 'scale(1)',
              transition: 'transform 0.2s',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              color: 'white',
              padding: '1rem 2rem',
              borderRadius: '9999px',
              fontWeight: 'bold',
              fontSize: '1.125rem',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.25)',
              border: '2px solid #fde047',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            🔄 最新データに更新する
          </button>
          <p style={{
            fontSize: '1.125rem',
            color: 'white',
            fontWeight: '600',
            marginTop: '1rem',
            margin: '1rem 0 0 0'
          }}>
            最終更新時刻: {new Date().toLocaleTimeString('ja-JP')}
          </p>
        </div>
      </div>
    </div>
  )
}

export default StockDashboardInline